import recast from 'ember-template-recast';
import fs from 'node:fs';
import { fixFilename } from './path/utils.js';
import { Transformer } from 'content-tag-utils';

let fileCache = new Map();

function getFullFileContent(filename) {
  if (fileCache.has(filename)) {
    return fileCache.get(filename);
  }
  const content = fs.readFileSync(filename, 'utf-8');
  fileCache.set(filename, content);
  return content;
}

function getAllElementNodes(program) {
  const elementNodes = [];
  recast.traverse(program, {
    ElementNode(node) {
      elementNodes.push(node);
    },
  });
  return elementNodes;
}

let programNodesForFile = new Map();
let processedElementsForFile = new Map(); // Track processed elements per file

export function templatePlugin(env) {
  const file = getFullFileContent(env.filename);
  const t = new Transformer(file);
  const expectedProgramCount = t.parseResults.length;

  const relativePath = fixFilename(env.filename);

  return {
    Program(node) {
      programNodesForFile.set(env.filename, [
        ...(programNodesForFile.get(env.filename) || []),
        node,
      ]);

      // Initialize element counter for this file if needed
      if (!processedElementsForFile.has(env.filename)) {
        processedElementsForFile.set(env.filename, 0);
      }
    },
    ElementNode(node) {
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
            t
              .reverseInnerCoordinatesOf(
                t.parseResults[programNodeIndex],
                innerCoordinates,
              )
              .line.toString(),
          ),
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
        console.log(
          `[${env.filename}] Processed all ${totalElements} elements in ${expectedProgramCount} programs, clearing cache`,
        );
        programNodesForFile = new Map();
        processedElementsForFile = new Map();
        fileCache = new Map();
      }
    },
  };
}
