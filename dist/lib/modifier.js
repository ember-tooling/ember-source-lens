import { modifier } from 'ember-modifier';

function isElementWithSource(element) {
  return 'sourceFile' in element && 'sourceLine' in element;
}
function findSourceElement(x, y, excludeSelector) {
  const el = document.elementFromPoint(x, y);
  if (!el || el.closest(excludeSelector) || !isElementWithSource(el)) {
    return null;
  }
  return el;
}
function clearSourceLensDataAttributes() {
  const elsWithLens = document.querySelectorAll('[data-source-file]');
  elsWithLens.forEach(el => {
    el.sourceFile = el.getAttribute('data-source-file') || '';
    el.sourceLine = el.getAttribute('data-source-line') || '';
    el.sourceColumn = el.getAttribute('data-source-column') || '';
    el.removeAttribute('data-source-line');
    el.removeAttribute('data-source-file');
    el.removeAttribute('data-source-column');
  });
}
const sourceLensModifier = modifier((_element, _positional, named) => {
  const {
    sourceLensState,
    fileSystemBridge,
    sourceLensClass
  } = named;
  if (!sourceLensState) {
    return;
  }
  const abortController = new AbortController();
  const {
    signal
  } = abortController;
  clearSourceLensDataAttributes();
  const observer = new MutationObserver(() => {
    clearSourceLensDataAttributes();
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true
  });
  const moveHandler = e => {
    if (!sourceLensState.isEnabled) return;
    if (!sourceLensState.overlayEnabled) return;
    const el = findSourceElement(e.clientX, e.clientY, `.${sourceLensClass}`);
    if (!el) {
      sourceLensState.element = null;
      sourceLensState.filePath = null;
      sourceLensState.lineNumber = null;
      sourceLensState.columnNumber = null;
      sourceLensState.boundingClientRect = null;
      return;
    }
    if (el === sourceLensState.element) return;
    sourceLensState.element = el;
    sourceLensState.filePath = el.sourceFile;
    sourceLensState.lineNumber = Number(el.sourceLine);
    sourceLensState.columnNumber = Number(el.sourceColumn) || 1;
    sourceLensState.scrollDistance = 0;
    sourceLensState.boundingClientRect = el.getBoundingClientRect();
  };
  const clickElementHandler = e => {
    absorbClicks(e);
    if (!sourceLensState.isEnabled) return;
    if (!sourceLensState.overlayEnabled) return;
    if (!sourceLensState.element) return;
    sourceLensState.selectElement();
    if (fileSystemBridge.isConnected) {
      fileSystemBridge.openFile(sourceLensState.absolutePath);
    } else {
      console.warn('[ember-source-lens] Cannot open file, file system bridge is not connected');
    }
  };
  let lastKnownScrollPosition = 0;
  const scrollHandler = () => {
    const scrollElement = document.documentElement;
    const scrollDistance = scrollElement.scrollTop - lastKnownScrollPosition;
    lastKnownScrollPosition = scrollElement.scrollTop;

    // apply transform to overlay
    if (sourceLensState.boundingClientRect) {
      sourceLensState.scrollDistance -= scrollDistance;
    }
  };
  const absorbClicks = e => {
    if (!sourceLensState.element) return;
    if (!sourceLensState.isEnabled) return;
    if (!sourceLensState.overlayEnabled) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
  };
  const keyHandler = e => {
    // Check for Cmd+Shift+L (Mac) or Ctrl+Shift+L (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      sourceLensState.toggleEnabled();
      sourceLensState.resetState();
    }
  };
  document.addEventListener('keydown', keyHandler, {
    signal
  });
  document.addEventListener('scroll', scrollHandler, {
    signal
  });
  document.addEventListener('mousemove', moveHandler, {
    signal
  });
  document.addEventListener('click', clickElementHandler, {
    capture: true,
    signal
  });
  document.addEventListener('mousedown', absorbClicks, {
    capture: true,
    signal
  });
  return () => {
    abortController.abort();
    observer.disconnect();
  };
});

export { clearSourceLensDataAttributes, findSourceElement, isElementWithSource, sourceLensModifier };
//# sourceMappingURL=modifier.js.map
