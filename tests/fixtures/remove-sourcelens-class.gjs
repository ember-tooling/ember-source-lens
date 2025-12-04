import Component from '@glimmer/component';
import { SourceLens } from 'ember-source-lens';

export default class MyComponent extends Component {
  get thing() {
    return 'value';
  }

  <template>
    <h1>Hello, Source Lens!</h1>
    <SourceLens
      @editor="vscode"
      @projectRoot="/Users/liam/Work/GitHub/ember-tooling/ember-source-lens/"
    />
  </template>
}
