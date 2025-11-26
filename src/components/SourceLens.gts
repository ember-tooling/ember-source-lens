import Component from '@glimmer/component';
import { modifier } from 'ember-modifier';
import { tracked } from '@glimmer/tracking';
import { createStore } from 'ember-primitives/store';
import { htmlSafe } from '@ember/template';
import { sourceLens, sourceLensOverlay } from './styles.module.css';

interface SourceLensSignature {
  Element: HTMLDivElement;
  Args: {
    projectRoot?: string;
  };
}

class OverlayState {
  @tracked isEnabled: boolean = true;
  @tracked element: Element | null = null;
  @tracked boundingClientRect: DOMRect | null = null;
}

const sourceLensModifier = modifier(
  (
    element: HTMLElement,
    _positional: [],
    named: { projectRoot?: string; overlayState?: OverlayState },
  ) => {
    const { projectRoot, overlayState } = named;

    if (!projectRoot || !overlayState) {
      return;
    }

    const elsWithLens = document.querySelectorAll('[data-source-file]');

    elsWithLens.forEach((el) => {
      const element = el as HTMLElement;
      element.sourceFile = element.getAttribute('data-source-file') || '';
      element.sourceLine = element.getAttribute('data-source-line') || '';

      element.removeAttribute('data-source-file');
      element.removeAttribute('data-source-line');
    });

    const moveHandler = (e: MouseEvent) => {
      // if (!isEnabled) return; // Skip if disabled

      try {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el) return;
        if (el === overlayState.element) return;
        overlayState.element = el;
        overlayState.boundingClientRect = el
          ? el.getBoundingClientRect()
          : null;

        console.log(
          '[Ember Source Lens] Hovered element:',
          overlayState.boundingClientRect,
        );
      } catch (error) {
        console.warn('[Ember Source Lens] Error in move handler:', error);
      }
    };

    const clickElementHandler = (e: MouseEvent) => {
      if (overlayState.element) {
        console.log(
          `[Ember Source Lens] Clicked element source: ${overlayState.element.sourceFile}:${overlayState.element.sourceLine}`,
        );

        const absolutePath = `${projectRoot}/${overlayState.element.sourceFile}`;
        const lineNumber = overlayState.element.sourceLine;

        window.location.href = `vscode://file${absolutePath}:${lineNumber}`;
      }
    };

    try {
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', clickElementHandler);
      // document.addEventListener('keydown', keyHandler);
    } catch (error) {
      console.warn('[Ember Source Lens] Error adding event listeners:', error);
      return;
    }

    return () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', clickElementHandler);
      // document.removeEventListener('keydown', keyHandler);
    };
  },
);

export class SourceLens extends Component<SourceLensSignature> {
  get projectRoot(): string {
    return this.args.projectRoot ?? '';
  }

  get overlayState() {
    return createStore(this, OverlayState);
  }

  get overlayRectStyleString() {
    const rect = this.overlayState.boundingClientRect;
    if (!rect) {
      return '';
    }
    return htmlSafe(
      `top: ${rect.top}px; left: ${rect.left}px; width: ${rect.width}px; height: ${rect.height}px;`,
    );
  }

  <template>
    <div
      class={{sourceLens}}
      ...attributes
      {{sourceLensModifier
        projectRoot=this.projectRoot
        overlayState=this.overlayState
      }}
    >
      <p>{{this.overlayState.element.sourceFile}}</p>
      <p>{{this.overlayState.element.sourceLine}}</p>
    </div>

    {{#if this.overlayState.isEnabled}}
      <div
        class={{sourceLensOverlay}}
        style={{this.overlayRectStyleString}}
      ></div>
    {{/if}}
  </template>
}
