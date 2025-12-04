import { FeatureCard } from '../components/feature-card.gts';
import { Counter } from '../components/counter.gts';
import { Card, Button, Badge } from '../components/ui-primitives.gts';
import { SourceLens } from '#src/components/SourceLens.gts';

<template>
  <div class="demo-app">
    <header class="hero">
      <div class="container">
        <h1>🔍 Ember Source Lens</h1>
        <p class="tagline">
          Click-to-source developer tool for Ember.js applications
        </p>
        <div class="hero-actions">
          <Badge>Press Cmd+Shift+L to activate</Badge>
        </div>
      </div>
    </header>

    <main class="container">
      <section class="intro">
        <Card>
          <h2>👋 Welcome to the Demo</h2>
          <p>
            Source Lens helps you navigate your Ember codebase by allowing you
            to click on any rendered component to jump directly to its source
            file in your editor.
          </p>
          <ol class="instructions">
            <li>Press
              <kbd>Cmd+Shift+L</kbd>
              (or
              <kbd>Ctrl+Shift+L</kbd>
              on Windows/Linux) to activate Source Lens</li>
            <li>Click the
              <strong>🔍 inspect</strong>
              button in the Source Lens panel</li>
            <li>Hover over any component below to see its source location</li>
            <li>Click on a component to select it and open in your IDE</li>
          </ol>
        </Card>
      </section>

      <section class="features">
        <h2>✨ Features</h2>
        <div class="feature-grid">
          <FeatureCard
            @icon="🎯"
            @title="Precise Navigation"
            @description="Click on any component to jump directly to its source file, line, and column."
          />
          <FeatureCard
            @icon="🎨"
            @title="Visual Overlay"
            @description="Hover over elements to see a highlighted overlay showing component boundaries."
          />
          <FeatureCard
            @icon="⚡"
            @title="IDE Integration"
            @description="Supports VS Code, Cursor, WebStorm, Sublime, and more editors."
          />
        </div>
      </section>

      <section class="demo-components">
        <h2>🧩 Try It Out</h2>
        <p>
          Activate Source Lens and hover over these components to see where
          they're defined:
        </p>

        <div class="component-showcase">
          <Card>
            <h3>Button Primitive</h3>
            <Button>Click Me</Button>
            <Button>Another Button</Button>
          </Card>

          <Card>
            <h3>Interactive Counter</h3>
            <Counter />
          </Card>

          <Card>
            <h3>Badge Primitive</h3>
            <Badge>New</Badge>
            <Badge>Featured</Badge>
            <Badge>Popular</Badge>
          </Card>
        </div>
      </section>

      <section class="keyboard-shortcuts">
        <Card>
          <h2>📋 Instructions</h2>
          <div class="shortcut-list">
            <div class="shortcut-item">
              <kbd>Cmd</kbd>
              +
              <kbd>Shift</kbd>
              +
              <kbd>L</kbd>
              <span>Toggle Source Lens</span>
            </div>
            <div class="shortcut-item">
              <span class="shortcut-icon">🔍</span>
              <span>Click inspect button to enable hover overlay</span>
            </div>
            <div class="shortcut-item">
              <span class="shortcut-icon">👆</span>
              <span>Click component to select and open in IDE</span>
            </div>
          </div>
        </Card>
      </section>

      <footer class="demo-footer">
        <p>
          Built with ❤️ by the Ember community •
          <a
            href="https://github.com/ember-tooling/ember-source-lens"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
        </p>
      </footer>
    </main>
  </div>

  <SourceLens
    @editor="vscode"
    @projectRoot="/Users/liam/Work/GitHub/ember-tooling/ember-source-lens/"
  />
</template>
