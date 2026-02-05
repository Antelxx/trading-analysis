<template>
  <div class="panel">
    <h3>{{ title }}</h3>
    <div class="ai-section">
      <div>
        <div class="label">当前结构</div>
        <div>{{ analysis?.overall || "-" }}</div>
      </div>
      <div>
        <div class="label">多空力量</div>
        <div>{{ analysis?.forces || "-" }}</div>
      </div>
      <div>
        <div class="label">周期状态</div>
        <div>1h：{{ analysis?.timeframes?.["1h"]?.state || "-" }} · {{ analysis?.timeframes?.["1h"]?.focus || "-" }}</div>
        <div>4h：{{ analysis?.timeframes?.["4h"]?.state || "-" }} · {{ analysis?.timeframes?.["4h"]?.focus || "-" }}</div>
        <div>1day：{{ analysis?.timeframes?.["1day"]?.state || "-" }} · {{ analysis?.timeframes?.["1day"]?.focus || "-" }}</div>
      </div>
      <div>
        <div class="label">最大风险</div>
        <div>{{ analysis?.risk || "-" }}</div>
      </div>
      <div>
        <div class="label">观察建议</div>
        <div>{{ analysis?.rationale || "-" }}</div>
      </div>
      <div>
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
