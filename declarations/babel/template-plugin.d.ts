interface ASTPluginBuilder {
    (env: {
        filename: string;
    }): {
        name: string;
        visitor: Record<string, unknown>;
    };
}
export declare function createPlugin(config?: {
    additionalRoots?: string[];
}): ASTPluginBuilder;
export {};
//# sourceMappingURL=template-plugin.d.ts.map