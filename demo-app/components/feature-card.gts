import type { TOC } from '@ember/component/template-only';

interface FeatureCardSignature {
  Args: {
    title: string;
    description: string;
    icon: string;
  };
}

export const FeatureCard: TOC<FeatureCardSignature> = <template>
  <div class="feature-card">
    <div class="feature-icon">{{@icon}}</div>
    <h3>{{@title}}</h3>
    <p>{{@description}}</p>
  </div>
</template>;
