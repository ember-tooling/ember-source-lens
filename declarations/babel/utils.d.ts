/**
 * Examples for fileName
 * - absolute on-disk path
 * - in webpack
 *   - URL-absolute path, starting with /
 *
 * @param {string} fileName
 * @param {{ additionalRoots?: string[]; cwd: string }} options
 * @returns
 */
export declare function isRelevantFile(fileName: string, { additionalRoots, cwd }: {
    additionalRoots?: string[];
    cwd: string;
}): boolean;
declare global {
    interface RegExpConstructor {
        escape(str: string): string;
    }
}
export declare function findWorkspacePath(sourcePath: string, options?: {
    cwd?: string;
}): string;
export declare function fixFilename(filename: string): string;
/**
 * Combines multiple regex patterns into a single regex that tests if ANY of them match.
 * Uses the OR operator (|) to join patterns.
 *
 * @param patterns - Array of RegExp objects to combine
 * @returns A function that tests if the input string matches any of the patterns
 *
 * @example
 * const isValid = combineRegexPatterns([
 *   /^[a-zA-Z]/, // starts with letter
 *   /^@/,        // starts with @
 * ]);
 * isValid('Hello') // true
 * isValid('@component') // true
 * isValid('123') // false
 */
export declare function combineRegexPatterns(patterns: RegExp[]): (input: string) => boolean;
//# sourceMappingURL=utils.d.ts.map