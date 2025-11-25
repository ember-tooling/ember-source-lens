import { findWorkspacePath } from './utils.ts';

/**
 * template plugins do not hand us the correct file path.
 * additionally, we may not be able to rely on this data in the future,
 * so this functions acts as a means of normalizing _whatever_ we're given
 * in the future.
 *
 * @param {string} filename
 * @returns {string} the absolute path to the file
 */
export function fixFilename(filename: string): string {
  const fileName = filename;
  const workspace = findWorkspacePath(fileName);

  return fileName.replace(workspace, '');
}
