import recast, { type AST } from 'ember-template-recast';
import fs from 'node:fs';
import { fixFilename } from './utils.ts';
import { Transformer } from 'content-tag-utils';

let fileCache = new Map<string, string>();

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
      elementNodes.push(node);
    },
  });

  return elementNodes;
}

let programNodesForFile = new Map<string, AST.Program[]>();
let processedElementsForFile = new Map<string, number>(); // Track processed elements per file

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

  const relativePath = fixFilename(env.filename);

  return {
    Program(node: AST.Program) {
      programNodesForFile.set(env.filename, [
        ...(programNodesForFile.get(env.filename) || []),
        node,
      ]);

      // Initialize element counter for this file if needed
      if (!processedElementsForFile.has(env.filename)) {
        processedElementsForFile.set(env.filename, 0);
      }
    },
    ElementNode(node: AST.ElementNode) {
      if (expectedProgramCount === 0) {
        return;
      }

      const innerCoordinates = {
        line: node.loc.startPosition.line,
        column: node.loc.startPosition.column,
        endColumn: node.loc.endPosition.column,
        endLine: node.loc.endPosition.line,
      };

      let programNodeIndex = -1;

      const programNodes = programNodesForFile.get(env.filename) || [];

      programNodes.some((programNode, index) => {
        const elementNodes = getAllElementNodes(programNode);

        if (elementNodes.includes(node)) {
          programNodeIndex = index;
          return true;
        }

        return false;
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const coords = t.reverseInnerCoordinatesOf(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        t.parseResults[programNodeIndex],
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

      // Increment processed element count
      const processedCount =
        (processedElementsForFile.get(env.filename) || 0) + 1;
      processedElementsForFile.set(env.filename, processedCount);

      // Count total elements across all programs
      const totalElements = programNodes.reduce((sum, program) => {
        return sum + getAllElementNodes(program).length;
      }, 0);

      // Check if we've reached the expected program count AND processed all elements
      const currentProgramCount = programNodes.length;
      if (
        currentProgramCount === expectedProgramCount &&
        processedCount === totalElements
      ) {
        programNodesForFile = new Map<string, AST.Program[]>();
        processedElementsForFile = new Map<string, number>();
        fileCache = new Map<string, string>();
      }
    },
  };
}
