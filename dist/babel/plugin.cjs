'use strict';

var process$1 = require('node:process');
var path = require('node:path');
var assert = require('node:assert');
var fs = require('node:fs');
var recast = require('ember-template-recast');
var contentTag = require('content-tag');

const leadingSlashPath = {
    atEmbroider: path.join('/@embroider'),
    componentsDir: path.join('/components/'),
    templatesDir: path.join('/templates/'),
    routesDir: path.join('/routes/'),
    testem: path.join('/testem'),
    src: path.join('/src/'),
    app: path.join('/app/'),
};
const barePath = {
    pnpmDir: path.join('node_modules/.pnpm'),
};

const UNSUPPORTED_DIRECTORIES = new Set(['tests']);
const IRRELEVANT_PATHS = [barePath.pnpmDir, '__vite-'];
const SEEN = new Set();
const CWD = process$1.cwd();
function getSeen(sourcePath) {
    if (SEEN.has(sourcePath))
        return sourcePath;
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
function isRelevantFile(fileName, { additionalRoots, cwd }) {
    // Fake file handled by testem server when it runs
    if (fileName.startsWith(leadingSlashPath.testem))
        return false;
    // Private Virtual Modules
    if (fileName.startsWith('\0'))
        return false;
    // These are not valid userland names (or are from libraries)
    if (path.isAbsolute(fileName) === false) {
        if (fileName.match(/^[a-zA-Z]/))
            return false;
    }
    // External to us
    if (fileName.startsWith(leadingSlashPath.atEmbroider))
        return false;
    if (IRRELEVANT_PATHS.some((i) => fileName.includes(i)))
        return false;
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
        leadingSlashPath.routesDir,
        ...(additionalRoots || []),
    ];
    if (!roots.some((root) => fileName.includes(root))) {
        return false;
    }
    return true;
}
function findWorkspacePath(sourcePath, options = {}) {
    const cwd = options?.cwd ?? CWD;
    if (sourcePath.endsWith(path.sep)) {
        sourcePath = sourcePath.replace(new RegExp(`${RegExp.escape(path.sep)}$`), '');
    }
    const seen = getSeen(sourcePath);
    if (seen) {
        return seen;
    }
    const candidatePath = path.join(sourcePath, 'package.json');
    const isWorkspace = fs.existsSync(candidatePath);
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
function findPackageJsonUp(startPath, options = {}) {
    const cwd = options?.cwd ?? CWD;
    const parts = startPath.split(path.sep);
    for (let i = parts.length - 1; i > 1; i--) {
        const toCheck = parts.slice(0, i).join(path.sep);
        const packageJson = path.join(toCheck, 'package.json');
        const exists = fs.existsSync(packageJson);
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
function fixFilename(filename) {
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
function combineRegexPatterns(patterns) {
    if (patterns.length === 0) {
        return () => false;
    }
    if (patterns.length === 1) {
        return (input) => patterns[0].test(input);
    }
    // Extract source patterns and combine with OR
    const combinedPattern = patterns.map((regex) => regex.source).join('|');
    const combinedRegex = new RegExp(combinedPattern);
    return (input) => combinedRegex.test(input);
}

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
function getFileCoordinates(source, parsedResult, innerCoordinates) {
    // Convert source to Buffer
    let buffer;
    if (typeof source === 'string') {
        buffer = Buffer.from(source, 'utf8');
    }
    else if (source instanceof Buffer) {
        buffer = source;
    }
    else {
        throw new Error(`Expected first arg to getFileCoordinates to be either a string or buffer`);
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
    const column = innerCoordinates.line === 1
        ? innerCoordinates.column + templateColumn
        : innerCoordinates.column;
    const endColumn = innerCoordinates.line === 1
        ? innerCoordinates.endColumn + templateColumn
        : innerCoordinates.endColumn;
    return {
        line,
        endLine,
        column,
        endColumn,
    };
}

const fileCache = new Map();
const fileModifiedTimes = new Map();
const invalidTagPatterns = [
    /^:/, // Don't process named blocks (:block-name)
];
const isInvalidTag = combineRegexPatterns(invalidTagPatterns);
const CLEARED_CONTENT = '___________ember-source-lens-cleared-content___________';
const p = new contentTag.Preprocessor();
const parsedFiles = new Map();
function isFileCacheValid(filename) {
    if (!fileCache.has(filename) || !fileModifiedTimes.has(filename)) {
        return false;
    }
    const stats = fs.statSync(filename);
    const cachedMtime = fileModifiedTimes.get(filename);
    return stats.mtimeMs === cachedMtime;
}
function parseFile(filename, content) {
    if (parsedFiles.has(filename) && isFileCacheValid(filename)) {
        const previouslyParsed = parsedFiles.get(filename);
        if (!previouslyParsed?.every((p) => p.contents === CLEARED_CONTENT)) {
            return previouslyParsed;
        }
    }
    const parsed = p.parse(content);
    parsedFiles.set(filename, parsed);
    return parsed;
}
function getFullFileContent(filename) {
    if (isFileCacheValid(filename)) {
        return fileCache.get(filename);
    }
    const content = fs.readFileSync(filename, 'utf-8');
    const stats = fs.statSync(filename);
    fileCache.set(filename, content);
    fileModifiedTimes.set(filename, stats.mtimeMs);
    return content;
}
function getAllElementNodes(program) {
    const elementNodes = [];
    recast.traverse(program, {
        ElementNode(node) {
            if (isInvalidTag(node.tag)) {
                return;
            }
            elementNodes.push(node);
        },
    });
    return elementNodes;
}
function templatePlugin(env) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';
    if (isProduction) {
        return {
            Program: {
                enter(node) {
                    const srcLensNode = node.body.findIndex((n) => n.type === 'ElementNode' && n.tag === 'SourceLens');
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
    let elementNodes = [];
    return {
        Program(node) {
            elementNodes = getAllElementNodes(node);
        },
        ElementNode(node) {
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
            const parsed = parsedFile.find((program) => {
                // @ts-expect-error data is accessible but marked private, node.loc.module returns 'an unknown module'
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                return program.contents === node.loc.data.source.source;
            });
            if (!parsed) {
                return;
            }
            const coords = getFileCoordinates(file, parsed, innerCoordinates);
            node.attributes.push(recast.builders.attr('data-source-file', recast.builders.text(relativePath)), recast.builders.attr('data-source-line', recast.builders.text(coords.line.toString())), recast.builders.attr('data-source-column', recast.builders.text((coords.column + 1).toString())));
            // mark element as processed by removing it from the list
            const index = elementNodes.indexOf(node);
            if (index > -1) {
                elementNodes.splice(index, 1);
            }
            // If all element nodes have been processed, clear the program contents
            // so files with multiple matching templates find the correct index
            if (elementNodes.length === 0 && parsedFile.length > 1) {
                parsed.contents = CLEARED_CONTENT;
            }
        },
    };
}

const noopPlugin = {
    name: 'ember-source-lens:noop',
    visitor: {},
};
function createPlugin(config = {}) {
    return function sourceLens(env) {
        const cwd = process$1.cwd();
        const isRelevant = isRelevantFile(env.filename, {
            additionalRoots: config.additionalRoots,
            cwd,
        });
        if (!isRelevant) {
            return noopPlugin;
        }
        const visitors = templatePlugin(env);
        return {
            name: 'ember-source-lens:template-plugin',
            visitor: {
                ...visitors,
            },
        };
    };
}

function sourceLens() {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';
    if (!isProduction) {
        return {
            name: 'remove-source-lens-import-noop',
            visitor: {},
        };
    }
    return {
        name: 'remove-source-lens-import',
        visitor: {
            ImportDeclaration(path) {
                const source = path.node.source.value;
                if (source === 'ember-source-lens' ||
                    source.endsWith('/SourceLens.gts')) {
                    path.remove();
                }
            },
        },
    };
}
sourceLens.template = createPlugin;

exports.sourceLens = sourceLens;
