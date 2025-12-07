import recast, { type AST } from 'ember-template-recast';
import fs from 'node:fs';
import { fixFilename, combineRegexPatterns } from './utils.ts';
import { Preprocessor, type Parsed } from 'content-tag';
import {
  getFileCoordinates,
  type InnerCoordinates,
} from './get-file-coordinates.ts';

const fileCache = new Map<string, string>();
const fileModifiedTimes = new Map<string, number>();

const invalidTagPatterns = [
  /^:/, // Don't process named blocks (:block-name)
];
const isInvalidTag = combineRegexPatterns(invalidTagPatterns);

const CLEARED_CONTENT =
  '___________ember-source-lens-cleared-content___________';

export const p = new Preprocessor();
const parsedFiles = new Map<string, Parsed[]>();

function isFileCacheValid(filename: string): boolean {
  if (!fileCache.has(filename) || !fileModifiedTimes.has(filename)) {
    return false;
  }

  const stats = fs.statSync(filename);
  const cachedMtime = fileModifiedTimes.get(filename)!;
  return stats.mtimeMs === cachedMtime;
}

function parseFile(filename: string, content: string): Parsed[] {
  if (parsedFiles.has(filename) && isFileCacheValid(filename)) {
    const previouslyParsed = parsedFiles.get(filename);

    if (!previouslyParsed?.every((p) => p.contents === CLEARED_CONTENT)) {
      return previouslyParsed!;
    }
  }
  const parsed = p.parse(content);
  parsedFiles.set(filename, parsed);
  return parsed;
}

function getFullFileContent(filename: string): string {
  if (isFileCacheValid(filename)) {
    return fileCache.get(filename)!;
  }

  const content = fs.readFileSync(filename, 'utf-8');
  const stats = fs.statSync(filename);

  fileCache.set(filename, content);
  fileModifiedTimes.set(filename, stats.mtimeMs);

  return content;
}

function getAllElementNodes(program: AST.Program): AST.ElementNode[] {
  const elementNodes: AST.ElementNode[] = [];

  recast.traverse(program, {
    ElementNode(node: AST.ElementNode) {
      if (isInvalidTag(node.tag)) {
        return;
      }
      elementNodes.push(node);
    },
  });

  return elementNodes;
}

export function templatePlugin(env: { filename: string }) {
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';

  if (isProduction) {
    return {
      Program: {
        enter(node: AST.Program) {
          const srcLensNode = node.body.findIndex(
            (n) => n.type === 'ElementNode' && n.tag === 'SourceLens',
          );

          if (srcLensNode !== -1) {
            node.body.splice(srcLensNode, 1);
          }
        },
      },
    };
  }

  const file = getFullFileContent(env.filename);
  const parsedFile = parseFile(env.filename, file);
  const expectedProgramCount = parsedFile.length;
  const relativePath = fixFilename(env.filename);

  let elementNodes: AST.ElementNode[] = [];

  return {
    Program(node: AST.Program) {
      elementNodes = getAllElementNodes(node);
    },
    ElementNode(node: AST.ElementNode) {
      if (expectedProgramCount === 0) {
        return;
      }

      if (isInvalidTag(node.tag)) {
        return;
      }

      const innerCoordinates: InnerCoordinates = {
        line: node.loc.startPosition.line,
        column: node.loc.startPosition.column,
        endColumn: node.loc.endPosition.column,
        endLine: node.loc.endPosition.line,
      };

      const parsed = parsedFile.find((program: Parsed) => {
        // @ts-expect-error data is accessible but marked private, node.loc.module returns 'an unknown module'
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return program.contents === node.loc.data.source.source;
      });

      if (!parsed) {
        return;
      }

      const coords = getFileCoordinates(file, parsed, innerCoordinates);

      node.attributes.push(
        recast.builders.attr(
          'data-source-file',
          recast.builders.text(relativePath),
        ),
        recast.builders.attr(
          'data-source-line',
          recast.builders.text(coords.line.toString()),
        ),
        recast.builders.attr(
          'data-source-column',
          recast.builders.text((coords.column + 1).toString()),
        ),
      );

      // mark element as processed by removing it from the list
      const index = elementNodes.indexOf(node);
      if (index > -1) {
        elementNodes.splice(index, 1);
      }

      // If all element nodes have been processed, clear the program contents
      // so files with multiple matching templates find the correct index
      if (elementNodes.length === 0 && parsedFile.length > 1) {
        parsed.contents = CLEARED_CONTENT;
      }
    },
  };
}
