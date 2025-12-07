import { type AST } from 'ember-template-recast';
import { Preprocessor } from 'content-tag';
export declare const p: Preprocessor;
export declare function templatePlugin(env: {
    filename: string;
}): {
    Program: {
        enter(node: AST.Program): void;
    };
    ElementNode?: undefined;
} | {
    Program(node: AST.Program): void;
    ElementNode(node: AST.ElementNode): void;
};
//# sourceMappingURL=rewriteHbs.d.ts.map