const Thing = <template>
  Hi
  {{yield to="block1"}}
</template>;

<template>
  <Thing>
    <:block1>
    </:block1>
  </Thing>
</template>
