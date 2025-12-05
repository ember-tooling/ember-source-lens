import recast, { type AST } from 'ember-template-recast';
import fs from 'node:fs';
import { fixFilename, combineRegexPatterns } from './utils.ts';
import { Preprocessor, type Parsed } from 'content-tag';
import { Transformer } from 'content-tag-utils';

const fileCache = new Map<string, string>();

const invalidTagPatterns = [
  /^:/, // Don't process named blocks (:block-name)
];
const isInvalidTag = combineRegexPatterns(invalidTagPatterns);

const p = new Preprocessor();
const parsedFiles = new Map<string, Parsed[]>();

function parseFile(filename: string, content: string): Parsed[] {
  if (parsedFiles.has(filename)) {
    return parsedFiles.get(filename)!;
  }
  const parsed = p.parse(content);
  parsedFiles.set(filename, parsed);
  return parsed;
}

function getFullFileContent(filename: string): string {
  if (fileCache.has(filename)) {
    return fileCache.get(filename)!;
  }

  const content = fs.readFileSync(filename, 'utf-8');
  fileCache.set(filename, content);
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const t = new Transformer(file);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const expectedProgramCount = t.parseResults.length as number;
  const parsedFile = parseFile(env.filename, file);
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

      const innerCoordinates = {
        line: node.loc.startPosition.line,
        column: node.loc.startPosition.column,
        endColumn: node.loc.endPosition.column,
        endLine: node.loc.endPosition.line,
      };

      const programIndex = parsedFile.findIndex((program: Parsed) => {
        // @ts-expect-error data is accessible
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return program.contents === node.loc.data.source.source;
      });

      if (programIndex === -1) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const coords = t.reverseInnerCoordinatesOf(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        t.parseResults[programIndex],
        innerCoordinates,
      );

      node.attributes.push(
        recast.builders.attr(
          'data-source-file',
          recast.builders.text(relativePath),
        ),
        recast.builders.attr(
          'data-source-line',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          recast.builders.text(coords.line.toString()),
        ),
        recast.builders.attr(
          'data-source-column',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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
      if (elementNodes.length === 0) {
        const index = programIndex;
        if (index > -1) {
          parsedFile[index]!.contents =
            '___________ember-source-lens-cleared-content___________';
        }
      }
    },
  };
}
