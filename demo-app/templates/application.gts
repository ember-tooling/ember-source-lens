import Something from '../components/something.gts';
import Something2 from '../components/something2.gts';
import { SourceLens } from '#src/components/SourceLens.gts';

const Thing = <template>
  <div>Or open it in your wow</div>
</template>;

<template>
  <Something2 />

  <h1>Welcome to my from here!</h1>

  <p>Lorem ipsum dolar sit amet</p>

  <Thing />
  <Something2 />

  <Something2 />

  <Something />

  <SourceLens
    @editor="vscode"
    @projectRoot="/Users/liam/Work/GitHub/ember-tooling/ember-source-lens/"
  />
</template>
