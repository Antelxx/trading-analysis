<template>
  <div class="panel">
    <h3>{{ title }}</h3>
    <div class="ai-section ai-grid">
      <div class="ai-block">
        <div class="label">当前结构</div>
        <div>{{ analysis?.overall || "-" }}</div>
      </div>
      <div class="ai-block">
        <div class="label">多空力量</div>
        <div>{{ analysis?.forces || "-" }}</div>
      </div>
      <div class="ai-block">
        <div class="label">周期状态</div>
        <div>1小时：{{ analysis?.timeframes?.["1h"]?.state || "-" }} · {{ analysis?.timeframes?.["1h"]?.focus || "-" }}</div>
        <div>4小时：{{ analysis?.timeframes?.["4h"]?.state || "-" }} · {{ analysis?.timeframes?.["4h"]?.focus || "-" }}</div>
        <div>1天：{{ analysis?.timeframes?.["1day"]?.state || "-" }} · {{ analysis?.timeframes?.["1day"]?.focus || "-" }}</div>
      </div>
      <div class="ai-block">
        <div class="label">最大风险</div>
        <div>{{ analysis?.risk || "-" }}</div>
      </div>
      <div class="ai-block">
        <div class="label">观察建议</div>
        <div>{{ analysis?.rationale || "-" }}</div>
      </div>
      <div class="ai-block">
        <div class="label">行动提示</div>
        <div class="badge risk">{{ analysis?.action_hint || "-" }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: "AI分析" },
  analysis: { type: Object, default: null }
});
</script>
