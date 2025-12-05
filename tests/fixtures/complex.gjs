import Component from '@glimmer/component';

const AnotherComponent = <template>
  <div ...attributes>
    {{yield}}
  </div>
</template>;

export default class MyComponent extends Component {
  get greeting() {
    return 'Hello, Ember!';
  }

  <template>
    <div>
      <h1>{{this.greeting}}</h1>
      <p>Welcome to Ember Source Lens!</p>
      <div>
        {{yield to="customBlock"}}
      </div>
      <footer>
        <div>
          <div>
            <div>
              <p>Footer content here.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
    <AnotherComponent>
      <:customBlock>
        <span>This is a custom block content.</span>
      </:customBlock>
    </AnotherComponent>
  </template>
}
