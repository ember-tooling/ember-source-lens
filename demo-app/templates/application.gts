import { pageTitle } from 'ember-page-title';
import Something from '../components/something.gjs';
import Something2 from '../components/something2.gjs';
import { SourceLens } from '../../src/components/SourceLens.gts';

const greeting = 'hello';

const Thing = <template>
  <div>This is a template</div>
</template>;

<template>
  {{pageTitle "Demo App"}}
  <SourceLens
    @projectRoot="/Users/liam/Work/GitHub/ember-tooling/ember-source-lens/"
  />

  <Something2 />

  <h1>Welcome to ember!</h1>

  <Thing />

  <Something />

  {{greeting}}, world!
</template>
