import type { Parsed } from 'content-tag';

export type InnerCoordinates = {
  line: number;
  column: number;
  endColumn: number;
  endLine: number;
};

/**
 * Converts template-relative coordinates to file-absolute coordinates.
 *
 * Given a template embedded in a file and element coordinates within that template,
 * this function calculates the absolute position in the source file.
 *
 * @param source - The full source file content (string or Buffer)
 * @param parsedResult - The parsed template result containing byte ranges
 * @param innerCoordinates - Element coordinates within the template (template-relative)
 * @returns File-absolute coordinates with line, endLine, column, endColumn
 *
 * @example
 * // Given source file:
 * // 1 export class Component extends BaseComponent {
 * // 2     <template>
 * // 3         <div>Hello</div>
 * // 4     </template>
 * // 5 }
 * //
 * // Element at template line 2, column 4 becomes file line 3, column 4
 */
export function getFileCoordinates(
  source: string | Buffer,
  parsedResult: Parsed,
  innerCoordinates: InnerCoordinates,
) {
  // Convert source to Buffer
  let buffer;
  if (typeof source === 'string') {
    buffer = Buffer.from(source, 'utf8');
  } else if (source instanceof Buffer) {
    buffer = source;
  } else {
    throw new Error(
      `Expected first arg to getFileCoordinates to be either a string or buffer`,
    );
  }

  // Extract template location in file
  const { contentRange: byteRange } = parsedResult;
  const beforeContent = buffer.subarray(0, byteRange.startByte).toString();
  const contentBeforeTemplateStart = beforeContent.split('\n');
  const lineBeforeTemplateStart = contentBeforeTemplateStart.at(-1) ?? '';

  /**
   * Template coordinates in the file
   * Reminder:
   *   Rows are 1-indexed
   *   Columns are 0-indexed
   *
   * (for when someone inevitably needs to debug this and is comparing
   *  with their editor (editors typically use 1-indexed columns))
   */
  const templateLine = contentBeforeTemplateStart.length;
  const templateColumn = lineBeforeTemplateStart?.length;

  /**
   * Convert template-relative coordinates to file-absolute coordinates
   *
   * Given the sample source code:
   * 1 export class SomeComponent extends Component<Args> {
   * 2     <template>
   * 3         {{debugger}}
   * 4     </template>
   * 5 }
   *
   * The extracted template will be:
   * 1
   * 2    {{debugger}}
   *
   * The coordinates of the template in the source file are: { line: 3, column: 14 }.
   * The coordinates of the error in the template are: { line: 2, column: 4 }.
   *
   * Thus, we need to always subtract one before adding the template location.
   */
  const line = innerCoordinates.line + templateLine - 1;
  const endLine = innerCoordinates.endLine + templateLine - 1;

  /**
   * Given the sample source code:
   * 1 export class SomeComponent extends Component<Args> {
   * 2     <template>{{debugger}}
   * 3     </template>
   * 4 }
   *
   * The extracted template will be:
   * 1 {{debugger}}
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
      ? innerCoordinates.column + templateColumn
      : innerCoordinates.column;
  const endColumn =
    innerCoordinates.line === 1
      ? innerCoordinates.endColumn + templateColumn
      : innerCoordinates.endColumn;

  return {
    line,
    endLine,
    column,
    endColumn,
  };
}
