import recast, { type AST } from 'ember-template-recast';
import fs from 'node:fs';
import { fixFilename } from './path/template-transform-paths.ts';
import { Transformer } from 'content-tag-utils';

const fileCache = new Map<string, string>();

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

const programNodesForFile = new Map<string, AST.Program[]>();

export function templatePlugin(env: { filename: string }) {
  const file = getFullFileContent(env.filename);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const t = new Transformer(file);

  const relativePath = fixFilename(env.filename);

  return {
    Program(node: AST.Program) {
      programNodesForFile.set(env.filename, [
        ...(programNodesForFile.get(env.filename) || []),
        node,
      ]);
    },
    ElementNode(node: AST.ElementNode) {
      const innerCoordinates = {
        line: node.loc.startPosition.line,
        column: node.loc.startPosition.column,
        endColumn: node.loc.endPosition.column,
        endLine: node.loc.endPosition.line,
      };

      let programNodeIndex = 0;

      const programNodes = programNodesForFile.get(env.filename) || [];

      programNodes.some((programNode, index) => {
        const elementNodes = getAllElementNodes(programNode);

        if (elementNodes.includes(node)) {
          programNodeIndex = index;
          return true;
        }

        return false;
      });

      node.attributes.push(
        recast.builders.attr(
          'data-source-file',
          recast.builders.text(relativePath),
        ),
        recast.builders.attr(
          'data-source-line',
          recast.builders.text(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
            t
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              .reverseInnerCoordinatesOf(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                t.parseResults[programNodeIndex],
                innerCoordinates,
              )
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              .line.toString(),
          ),
        ),
      );
    },
  };
}
