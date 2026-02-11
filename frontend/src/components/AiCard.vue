<template>
  <div class="panel">
    <h3>{{ title }}</h3>
    <div class="ai-section ai-grid">
      <div class="ai-block">
        <div class="label">当前结构</div>
        <div>{{ overallText }}</div>
      </div>
      <div class="ai-block">
        <div class="label">多空力量</div>
        <div v-if="forcesText">{{ forcesText }}</div>
        <div v-else class="muted">-</div>
      </div>
      <div class="ai-block">
        <div class="label">周期状态</div>
      <div>1小时：{{ tfText("1h") }}</div>
      <div>1天：{{ tfText("1day") }}</div>
      </div>
      <div class="ai-block">
        <div class="label">最大风险</div>
        <div>{{ riskText }}</div>
      </div>
      <div class="ai-block">
        <div class="label">观察建议</div>
        <div>{{ analysis?.rationale || "-" }}</div>
      </div>
      <div class="ai-block">
        <div class="label">行动提示</div>
        <div class="badge risk">{{ actionHintText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  title: { type: String, default: "AI分析" },
  analysis: { type: Object, default: null }
});

const overallText = computed(() => {
  const v = props.analysis?.overall;
  if (v === "trend") return "趋势";
  if (v === "range") return "震荡";
  if (v === "breakdown") return "结构破坏";
  return v || "-";
});

const actionHintText = computed(() => {
  const v = props.analysis?.action_hint;
  if (v === "wait") return "等待";
  if (v === "watch") return "观察";
  if (v === "cautious") return "谨慎";
  return v || "-";
});

const riskText = computed(() => {
  const v = props.analysis?.risk;
  if (v === "low") return "低";
  if (v === "medium") return "中";
  if (v === "high") return "高";
  return v || "-";
});

const forcesText = computed(() => {
  const f = props.analysis?.forces;
  if (!f) return "";
  if (typeof f === "string") return f;
  if (typeof f === "object") {
    const bullish = (f.bullish || []).join("；");
    const bearish = (f.bearish || []).join("；");
    const neutral = (f.neutral || []).join("；");
    const parts = [];
    if (bullish) parts.push(`多头：${bullish}`);
    if (bearish) parts.push(`空头：${bearish}`);
    if (neutral) parts.push(`中性：${neutral}`);
    return parts.join(" / ");
  }
  return "";
});

function tfText(key) {
  const tf = props.analysis?.timeframes?.[key];
  if (!tf || (!tf.state && !tf.focus)) return "暂无";
  const state = tf.state || "-";
  const focus = tf.focus || "-";
  return `${state} · ${focus}`;
}
</script>

<style scoped>
.muted {
  color: #6b7280;
}
</style>
