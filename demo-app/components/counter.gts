import { on } from '@ember/modifier';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export class Counter extends Component {
  @tracked count = 0;

  increment = () => {
    this.count++;
  };

  decrement = () => {
    this.count--;
  };

  reset = () => {
    this.count = 0;
  };

  <template>
    <div class="counter-widget">
      <h3>Interactive Counter</h3>
      <div class="counter-display">
        <button type="button" class="counter-btn" {{on "click" this.decrement}}>
          -
        </button>
        <span class="counter-value">{{this.count}}</span>
        <button type="button" class="counter-btn" {{on "click" this.increment}}>
          +
        </button>
      </div>
      <button type="button" class="counter-reset" {{on "click" this.reset}}>
        Reset
      </button>
    </div>
  </template>
}
