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
export declare function getFileCoordinates(source: string | Buffer, parsedResult: Parsed, innerCoordinates: InnerCoordinates): {
    line: number;
    endLine: number;
    column: number;
    endColumn: number;
};
//# sourceMappingURL=get-file-coordinates.d.ts.map