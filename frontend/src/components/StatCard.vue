<template>
  <div class="panel">
    <h3>{{ title }}</h3>
    <div class="stack">
      <div v-for="item in items" :key="item.label" class="kv">
        <span>{{ item.label }}</span>
        <span :class="item.badgeClass ? ['badge', item.badgeClass] : ''">{{ item.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  items: { type: Array, default: () => [] }
});
</script>
