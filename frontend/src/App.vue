<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">AITradingAnalysis</div>
      <div class="controls">
        <label class="select-group">
          <span>品种</span>
          <select v-model="marketKey">
            <option value="nasdaq">纳指100 ETF（QQQ）</option>
            <option value="gold">黄金 (XAUUSD)</option>
            <!-- <option value="shanghai">上证指数 (000001)</option> -->
          </select>
        </label>
        <label class="select-group">
          <span>周期</span>
          <select v-model="interval">
            <option v-if="showIntraday" value="1h">1小时</option>
            <option v-if="showIntraday" value="4h">4小时</option>
            <option value="1day">1天</option>
          </select>
        </label>
        <button v-if="!loading" class="primary" @click="refresh">生成AI分析</button>
        <button v-else class="primary loading-btn" disabled>
          AI分析中
          <span class="spinner" aria-label="loading"></span>
        </button>
      </div>
    </header>

    <main class="main">
      <section class="main-grid">
        <section class="chart-wrap">
          <div class="chart-area">
            <KlineChart
              v-if="(kline?.candles || []).length > 0"
              :candles="kline?.candles || []"
              :ma7="indicators?.ma7 || []"
              :ma25="indicators?.ma25 || []"
              :ma60="indicators?.ma60 || []"
              :interval="interval"
            />
            <div v-else class="empty">暂无数据，请检查行情 API Key 或选择可用市场。</div>
          </div>
          <div class="footnote">数据仅用于结构分析，不构成投资建议。</div>
        </section>

        <aside class="summary">
          <div class="summary-title">结构结论摘要</div>
          <div class="summary-item">趋势：{{ summary.trend }}</div>
          <div class="summary-item">均线结构：{{ summary.structure }}</div>
          <div class="summary-item">关键区间：{{ summary.zone }}</div>
          <div class="summary-item">策略：{{ strategyText }}</div>
          <div class="summary-item">风险：{{ riskText }}</div>
          <div class="summary-item">关键价位：{{ keyLevelText }}</div>
        </aside>
      </section>

      <section class="interpretation">
        <div class="section-title">AI 市场解读</div>
        <p class="interpretation-text">{{ aiParagraph }}</p>
      </section>
    </main>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import KlineChart from "./components/KlineChart.vue";
import { fetchKline, fetchIndicators } from "./api/market";
import { fetchAi } from "./api/analysis";

const marketKey = ref("nasdaq");
const interval = ref("1h");

const kline = ref(null);
const indicators = ref(null);
const aiAnalysis = ref(null);
const loading = ref(false);
const toast = ref("");

const marketMap = {
  nasdaq: { symbol: "QQQ", asset: "stock", label: "纳指100 ETF（QQQ）", supportsIntraday: true },
  gold: { symbol: "XAUUSD", asset: "gold", label: "黄金", supportsIntraday: true }
  // shanghai: { symbol: "000001", asset: "stock", label: "上证指数 (000001)", supportsIntraday: false }
};

const currentMarket = computed(() => marketMap[marketKey.value]);
const showIntraday = computed(() => currentMarket.value.supportsIntraday);

watch(marketKey, () => {
  if (!showIntraday.value && interval.value !== "1day") {
    interval.value = "1day";
  }
});

async function refresh() {
  const { symbol, asset } = currentMarket.value;
  try {
    loading.value = true;
    const [klineRes, indicatorRes, aiRes] = await Promise.all([
      fetchKline({ symbol, asset, interval: interval.value }),
      fetchIndicators({ symbol, asset, interval: interval.value }),
      fetchAi({ symbol, asset, interval: interval.value })
    ]);
    // Update UI only after AI returns to keep chart + analysis in sync
    kline.value = klineRes;
    indicators.value = indicatorRes.indicators;
    aiAnalysis.value = aiRes;
    toast.value = "分析已生成";
    setTimeout(() => {
      toast.value = "";
    }, 2000);
  } finally {
    loading.value = false;
  }
}

const summary = computed(() => {
  const latest = indicators.value?.latest;
  if (!latest) return { trend: "--", structure: "--", zone: "--" };
  const trend = latest.trendDirection === "up" ? "偏多" : latest.trendDirection === "down" ? "偏空" : "震荡";
  const structure = latest.maAlignment === "bullish" ? "多头排列" : latest.maAlignment === "bearish" ? "空头排列" : "混合";
  const close = latest.close;
  const ma60 = indicators.value?.ma60?.slice(-1)?.[0];
  const zone = close && ma60 ? (close > ma60 ? "MA60 支撑区" : "MA60 压力区") : "--";
  return { trend, structure, zone };
});

const aiParagraph = computed(() => {
  const a = aiAnalysis.value?.analysis;
  if (!a) return "尚未生成 AI 解读。";
  const parts = [];
  if (a.overall) parts.push(`当前结构为${a.overall === "trend" ? "趋势" : a.overall === "range" ? "震荡" : "结构破坏"}。`);
  if (a.forces) parts.push(typeof a.forces === "string" ? a.forces : "多空力量存在分歧。" );
  // if (a.risk) parts.push(`主要风险在于：${a.risk}。`);
  if (a.rationale) parts.push(a.rationale);
  return parts.join(" ");
});

const strategyText = computed(() => {
  const hint = aiAnalysis.value?.analysis?.action_hint;
  if (!aiAnalysis.value) return "--";
  if (hint === "wait") return "等待确认，避免在结构未明确时介入。";
  if (hint === "watch") return "保持观察，等待量价关系进一步确认。";
  if (hint === "cautious") return "谨慎参与，控制节奏与仓位。";
  return "以观察为主，等待更明确结构信号。";
});

const riskText = computed(() => {
  const r = aiAnalysis.value?.analysis?.risk;
  if (!aiAnalysis.value) return "--";
  if (!r) return "--";
  if (["low", "medium", "high"].includes(r)) return `风险等级：${r === "low" ? "低" : r === "medium" ? "中" : "高"}。`;
  return r;
});

const keyLevelText = computed(() => {
  if (!indicators.value) return "--";
  const ma25 = indicators.value?.ma25?.slice(-1)?.[0];
  const ma60 = indicators.value?.ma60?.slice(-1)?.[0];
  if (!ma25 || !ma60) return "--";
  return `关注 MA25/MA60 区域（${Number(ma25).toFixed(2)} / ${Number(ma60).toFixed(2)}）。`;
});
</script>
