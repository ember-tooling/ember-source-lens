import path from 'node:path';
import assert from 'node:assert';
import fsSync from 'node:fs';
import process from 'node:process';
import { leadingSlashPath, barePath } from './const.ts';

const UNSUPPORTED_DIRECTORIES = new Set(['tests']);
const IRRELEVANT_PATHS = [barePath.pnpmDir, '__vite-'];
const SEEN = new Set();
const CWD = process.cwd();

function getSeen(sourcePath: string): string | undefined {
  if (SEEN.has(sourcePath)) return sourcePath;

  const parts = sourcePath.split(path.sep);

  for (let i = parts.length - 1; i > 1; i--) {
    const toCheck = parts.slice(0, i).join(path.sep);

    const seen = SEEN.has(toCheck);

    if (seen) {
      return toCheck;
    }
  }
}

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
export function isRelevantFile(
  fileName: string,
  { additionalRoots, cwd }: { additionalRoots?: string[]; cwd: string },
): boolean {
  // Fake file handled by testem server when it runs
  if (fileName.startsWith(leadingSlashPath.testem)) return false;
  // Private Virtual Modules
  if (fileName.startsWith('\0')) return false;

  // These are not valid userland names (or are from libraries)
  if (path.isAbsolute(fileName) === false) {
    if (fileName.match(/^[a-zA-Z]/)) return false;
  }

  // External to us
  if (fileName.startsWith(leadingSlashPath.atEmbroider)) return false;
  if (IRRELEVANT_PATHS.some((i) => fileName.includes(i))) return false;

  const workspace = findWorkspacePath(fileName);

  assert(cwd, `cwd was not passed to isRelevantFile`);

  const ourWorkspace = findWorkspacePath(cwd);

  if (workspace !== ourWorkspace) {
    return false;
  }

  const local = fileName.replace(workspace, '');
  const [, ...parts] = local.split(path.sep).filter(Boolean);

  if (parts[0] && UNSUPPORTED_DIRECTORIES.has(parts[0])) {
    return false;
  }

  /**
   * Mostly pods support.
   * folks need to opt in to pods (routes), because every pods app can be configured differently
   */
  const roots = [
    leadingSlashPath.componentsDir,
    leadingSlashPath.templatesDir,
    ...(additionalRoots || []),
  ];

  if (!roots.some((root) => fileName.includes(root))) {
    return false;
  }

  return true;
}

declare global {
  interface RegExpConstructor {
    escape(str: string): string;
  }
}

export function findWorkspacePath(
  sourcePath: string,
  options: { cwd?: string } = {},
): string {
  const cwd = options?.cwd ?? CWD;

  if (sourcePath.endsWith(path.sep)) {
    sourcePath = sourcePath.replace(
      new RegExp(`${RegExp.escape(path.sep)}$`),
      '',
    );
  }

  const seen = getSeen(sourcePath);

  if (seen) {
    return seen;
  }

  const candidatePath = path.join(sourcePath, 'package.json');

  const isWorkspace = fsSync.existsSync(candidatePath);

  if (isWorkspace) {
    return sourcePath;
  }

  const packageJsonPath = findPackageJsonUp(sourcePath, { cwd });

  if (!packageJsonPath) {
    throw new Error(`Could not determine project for ${sourcePath}`);
  }

  const workspacePath = path.dirname(packageJsonPath);

  SEEN.add(workspacePath);

  return workspacePath;
}

function findPackageJsonUp(
  startPath: string,
  options: { cwd?: string } = {},
): string | null {
  const cwd = options?.cwd ?? CWD;
  const parts = startPath.split(path.sep);

  for (let i = parts.length - 1; i > 1; i--) {
    const toCheck = parts.slice(0, i).join(path.sep);

    const packageJson = path.join(toCheck, 'package.json');
    const exists = fsSync.existsSync(packageJson);

    if (exists) {
      return packageJson;
    }

    // Don't traverse all the way to the root of the file system.
    if (toCheck === cwd) {
      break;
    }
  }

  return null;
}

export function fixFilename(filename: string): string {
  const fileName = filename;
  const workspace = findWorkspacePath(fileName);

  return fileName.replace(workspace, '');
}

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
export function combineRegexPatterns(
  patterns: RegExp[],
): (input: string) => boolean {
  if (patterns.length === 0) {
    return () => false;
  }

  if (patterns.length === 1) {
    return (input: string) => patterns[0]!.test(input);
  }

  // Extract source patterns and combine with OR
  const combinedPattern = patterns.map((regex) => regex.source).join('|');

  const combinedRegex = new RegExp(combinedPattern);

  return (input: string) => combinedRegex.test(input);
}
