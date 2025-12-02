import Something from '../components/something.gts';
import Something2 from '../components/something2.gts';
import { SourceLens } from '../../src/components/SourceLens.gts';

const greeting = 'hello';

const Thing = <template>
  <div>This is a template that you can edit</div>
</template>;

<template>
  <Something2 />

  <h1>Welcome to Your App!</h1>

  <Thing />

  <Something />

  {{greeting}}, world!

  <SourceLens
    @projectRoot="/Users/liam/Work/GitHub/ember-tooling/ember-source-lens/"
  />
</template>
