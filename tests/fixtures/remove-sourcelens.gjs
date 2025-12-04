import { SourceLens } from 'ember-source-lens';

<template>
  <h1>Hello, Source Lens!</h1>
  <SourceLens
    @editor="vscode"
    @projectRoot="/Users/liam/Work/GitHub/ember-tooling/ember-source-lens/"
  />
</template>
