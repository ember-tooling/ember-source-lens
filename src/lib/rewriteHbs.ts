import recast, { type AST } from 'ember-template-recast';

export function templatePlugin({ filename }: { filename: string }) {
  return {
    ElementNode(node: AST.ElementNode) {
      node.attributes.push(
        recast.builders.attr(
          'data-source-file',
          recast.builders.text(filename),
        ),
        // recast.builders.attr(
        //   'data-source-line',
        //   recast.builders.text(
        //     (linesBeginAt + node.loc.startPosition.line).toString(),
        //   ),
        // ),
      );
    },
  };
}
