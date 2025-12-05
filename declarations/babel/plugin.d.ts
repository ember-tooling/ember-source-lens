import type { PluginObj } from '@babel/core';
import * as templatePlugin from './template-plugin.ts';
export declare function sourceLens(): PluginObj;
export declare namespace sourceLens {
    var template: typeof templatePlugin.createPlugin;
}
//# sourceMappingURL=plugin.d.ts.map