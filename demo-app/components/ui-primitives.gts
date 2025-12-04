import type { TOC } from '@ember/component/template-only';

interface CardSignature {
  Element: HTMLDivElement;
  Blocks: {
    default: [];
  };
}

interface ButtonSignature {
  Element: HTMLButtonElement;
  Blocks: {
    default: [];
  };
}

interface BadgeSignature {
  Element: HTMLSpanElement;
  Blocks: {
    default: [];
  };
}

export const Card: TOC<CardSignature> = <template>
  <div class="card">
    {{yield}}
  </div>
</template>;

export const Button: TOC<ButtonSignature> = <template>
  <button class="demo-button" type="button" ...attributes>
    {{yield}}
  </button>
</template>;

export const Badge: TOC<BadgeSignature> = <template>
  <span class="badge">{{yield}}</span>
</template>;
