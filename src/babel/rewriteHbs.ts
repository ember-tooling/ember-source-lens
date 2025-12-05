import recast, { type AST } from 'ember-template-recast';
import fs from 'node:fs';
import { fixFilename, combineRegexPatterns } from './utils.ts';
import { Preprocessor, type Parsed } from 'content-tag';

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

type InnerCoordinates = {
  line: number;
  column: number;
  endColumn: number;
  endLine: number;
};

export function coordinatesOf(source: string | Buffer, parsedResult: Parsed) {
  /**
   * range is the full range, including the leading and trailing <tempalte>,</template>
   * contentRange is the range between / excluding the leading and trailing <template>,</template>
   */
  let buffer;
  if (typeof source === 'string') {
    buffer = Buffer.from(source, 'utf8');
  } else if (source instanceof Buffer) {
    buffer = source;
  } else {
    throw new Error(
      `Expected first arg to coordinatesOf to be either a string or buffer`,
    );
  }

  const { contentRange: byteRange } = parsedResult;
  const inclusiveContent = buffer
    .subarray(byteRange.startByte, byteRange.endByte)
    .toString();
  const beforeContent = buffer.subarray(0, byteRange.startByte).toString();
  const before = beforeContent.length;

  const startCharIndex = before;
  const endCharIndex = before + inclusiveContent.length;

  const contentBeforeTemplateStart = beforeContent.split('\n');
  const lineBeforeTemplateStart = contentBeforeTemplateStart.at(-1) ?? '';

  /**
   * Reminder:
   *   Rows are 1-indexed
   *   Columns are 0-indexed
   *
   * (for when someone inevitably needs to debug this and is comparing
   *  with their editor (editors typically use 1-indexed columns))
   */
  return {
    line: contentBeforeTemplateStart.length,
    column: lineBeforeTemplateStart?.length,
    // any indentation of the <template> parts (class indentation etc)
    columnOffset:
      lineBeforeTemplateStart.length -
      lineBeforeTemplateStart.trimStart().length,
    // character index, not byte index
    start: startCharIndex,
    // character index, not byte index
    end: endCharIndex,
  };
}

export function reverseInnerCoordinates(
  templateCoordinates: { line: number; column: number },
  innerCoordinates: InnerCoordinates,
) {
  /**
   * Given the sample source code:
   * 1 export class SomeComponent extends Component<Args> {\n
   * 2     <template>\n
   * 3         {{debugger}}\n
   * 4     </template>\n
   * 5 }
   *
   * The extracted template will be:
   * 1 \n
   * 2    {{debugger}}\n
   *
   * The coordinates of the template in the source file are: { line: 3, column: 14 }.
   * The coordinates of the error in the template are: { line: 2, column: 4 }.
   *
   * Thus, we need to always subtract one before adding the template location.
   */
  const line = innerCoordinates.line + templateCoordinates.line - 1;
  const endLine = innerCoordinates.endLine + templateCoordinates.line - 1;

  /**
   * Given the sample source code:
   * 1 export class SomeComponent extends Component<Args> {\n
   * 2     <template>{{debugger}}\n
   * 3     </template>\n
   * 4 }
   *
   * The extracted template will be:
   * 1 {{debugger}}\n
   *
   * The coordinates of the template in the source file are: { line: 3, column: 14 }.
   * The coordinates of the error in the template are: { line: 1, column: 0 }.
   *
   * Thus, if the error is found on the first line of a template,
   * then we need to add the column location to the result column location.
   *
   * Any result > line 1 will not require any column correction.
   */
  const column =
    innerCoordinates.line === 1
      ? innerCoordinates.column + templateCoordinates.column
      : innerCoordinates.column;
  const endColumn =
    innerCoordinates.line === 1
      ? innerCoordinates.endColumn + templateCoordinates.column
      : innerCoordinates.endColumn;

  return {
    line,
    endLine,
    column,
    endColumn,
  };
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
        // @ts-expect-error data is accessible
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return program.contents === node.loc.data.source.source;
      });

      if (!parsed) {
        return;
      }

      const parsedCoords = coordinatesOf(file, parsed);
      const coords = reverseInnerCoordinates(parsedCoords, innerCoordinates);

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
      if (elementNodes.length === 0) {
        parsed.contents =
          '___________ember-source-lens-cleared-content___________';
      }
    },
  };
}
