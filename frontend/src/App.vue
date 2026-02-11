<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">行情结构分析终端</div>
      <div class="controls">
        <label class="select-group">
          <select v-model="marketKey">
            <option value="nasdaq">纳指100 ETF（QQQ）</option>
            <option value="gold">黄金 (XAUUSD)</option>
            <!-- <option value="shanghai">上证指数 (000001)</option> -->
          </select>
        </label>
        <button v-if="!loading" class="primary" @click="refresh">生成分析</button>
        <button v-else class="primary loading-btn" disabled>
          分析中
          <span class="spinner" aria-label="loading"></span>
        </button>
      </div>
    </header>

    <main class="main">
      <section class="main-grid">
        <section class="chart-wrap">
          <div class="chart-area">
            <div v-if="aiAnalysis" class="chart-cycle">当前周期：1小时</div>
            <KlineChart
              v-if="(kline?.candles || []).length > 0"
              :candles="kline?.candles || []"
              :ma7="indicators?.ma7 || []"
              :ma25="indicators?.ma25 || []"
              :ma60="indicators?.ma60 || []"
              :interval="interval"
            />
            <div v-else class="empty">暂无数据，请检查行情接口密钥或选择可用市场。</div>
          </div>
          <div class="footnote">数据仅用于结构分析，不构成投资建议。</div>
        </section>

        <aside class="summary">
          <div :class="['sidebar-card', loadingClass]">
            <div class="summary-title">长短期趋势</div>
            <div class="deep-dive">
              <div class="deep-item">
                <span class="status-dot inline" :class="shortTermStatusClass"></span>
                <span :class="['deep-text', placeholderClass(shortTermBiasText)]">短期偏向：{{ shortTermBiasText }}</span>
              </div>
              <div class="deep-item">
                <span class="status-dot inline" :class="longTermStatusClass"></span>
                <span :class="['deep-text', placeholderClass(longTermTrendText)]">长期趋势：{{ longTermTrendText }}</span>
              </div>
              <div class="deep-item">
                <span :class="['deep-text', placeholderClass(executionLogicText)]">执行逻辑：{{ executionLogicText }}</span>
              </div>
            </div>
          </div>

          <div :class="['sidebar-card', loadingClass]">
            <div class="summary-title">结构结论摘要</div>
            <div class="summary-item">
              <span class="summary-label">趋势：</span>
              <span :class="['summary-value', trendClass, placeholderClass(summary.trend)]">{{ summary.trend }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">均线结构：</span>
              <span :class="['summary-value', structureClass, placeholderClass(summary.structure)]">{{ summary.structure }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">关键区间：</span>
              <span :class="['summary-value', placeholderClass(summary.zone)]">{{ summary.zone }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">策略：</span>
              <span :class="['summary-value', placeholderClass(strategyText)]">{{ strategyText }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">风险：</span>
              <span :class="['summary-value', placeholderClass(riskText)]">{{ riskText }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">关键价位：</span>
              <span :class="['summary-value', placeholderClass(keyLevelText)]">{{ keyLevelText }}</span>
            </div>
          </div>

          <div :class="['sidebar-card', 'analysis-panel', loadingClass]">
            <div class="section-title">市场解读</div>
            <p :class="['interpretation-text', placeholderClass(overallViewText)]">{{ overallViewText }}</p>
          </div>
        </aside>
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
  if (!showIntraday.value && interval.value !== "1h") {
    interval.value = "1h";
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
  if (a.overall) {
    if (typeof a.overall === "string" && !["trend", "range", "break"].includes(a.overall)) {
      parts.push(a.overall);
    } else {
      parts.push(`当前结构为${a.overall === "trend" ? "趋势" : a.overall === "range" ? "震荡" : "结构破坏"}。`);
    }
  }
  if (a.forces) {
    if (typeof a.forces === "string") {
      parts.push(a.forces);
    } else if (typeof a.forces === "object") {
      const values = Object.values(a.forces).filter(Boolean);
      if (values.length > 0) parts.push(values.join(" "));
    } else {
      parts.push("多空力量存在分歧。");
    }
  }
  if (a.rationale) parts.push(a.rationale);
  return sanitizeText(parts.join(" "));
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
  const level = aiAnalysis.value?.analysis?.risk_level;
  if (!aiAnalysis.value) return "--";
  if (!r && !level) return "--";
  if (["low", "medium", "high"].includes(level)) {
    return `风险等级：${level === "low" ? "低" : level === "medium" ? "中" : "高"}。`;
  }
  if (["低", "中", "高"].includes(level)) {
    return `风险等级：${level}。`;
  }
  if (["low", "medium", "high"].includes(r)) return `风险等级：${r === "low" ? "低" : r === "medium" ? "中" : "高"}。`;
  return sanitizeText(r);
});

const keyLevelText = computed(() => {
  if (!indicators.value) return "--";
  const ma25 = indicators.value?.ma25?.slice(-1)?.[0];
  const ma60 = indicators.value?.ma60?.slice(-1)?.[0];
  if (!ma25 || !ma60) return "--";
  return `关注 MA25/MA60 区域（${Number(ma25).toFixed(2)} / ${Number(ma60).toFixed(2)}）。`;
});

const shortTermBiasText = computed(() => {
  const v = aiAnalysis.value?.analysis?.short_term_bias;
  if (!aiAnalysis.value) return "--";
  if (!v) return summary.value.trend || "--";
  return sanitizeText(v || "--");
});

const longTermTrendText = computed(() => {
  const v = aiAnalysis.value?.analysis?.long_term_trend;
  if (!aiAnalysis.value) return "--";
  if (!v) return "待确认";
  return sanitizeText(v || "--");
});

const executionLogicText = computed(() => {
  const v = aiAnalysis.value?.analysis?.execution_logic;
  if (!aiAnalysis.value) return "--";
  if (!v) return strategyText.value || "--";
  return sanitizeText(v || "--");
});

const overallViewText = computed(() => {
  const a = aiAnalysis.value?.analysis;
  if (!aiAnalysis.value) return "--";
  const v = a?.overall_view || a?.overall_analysis || a?.rationale || a?.overall;
  return sanitizeText(v || aiParagraph.value || "--");
});

function statusFromText(text) {
  if (!text || text === "--") return { text: "--", className: "neutral" };
  if (text.includes("多") || text.includes("偏多") || text.includes("上行") || text.includes("上升")) {
    return { text, className: "bull" };
  }
  if (text.includes("空") || text.includes("偏空") || text.includes("下行") || text.includes("下降")) {
    return { text, className: "bear" };
  }
  if (text.includes("震荡") || text.includes("中性") || text.includes("观望")) {
    return { text, className: "neutral" };
  }
  return { text, className: "neutral" };
}

function sanitizeText(text) {
  if (!text) return text;
  return String(text)
    .replace(/mixed/gi, "混合")
    .replace(/mixed alignment/gi, "混合结构")
    .replace(/bullish/gi, "多头排列")
    .replace(/bearish/gi, "空头排列")
    .replace(/4h/gi, "日线")
    .replace(/up/gi, "上行")
    .replace(/down/gi, "下行")
    .replace(/flat/gi, "震荡")
    .replace(/volume_confirm/gi, "量能确认")
    .replace(/\(.*?volume_confirm.*?\)/gi, "")
    .replace(/\(.*?mixed.*?\)/gi, "");
}

const shortTermStatus = computed(() => statusFromText(shortTermBiasText.value));
const longTermStatus = computed(() => statusFromText(longTermTrendText.value));

const shortTermStatusText = computed(() => shortTermStatus.value.text);
const longTermStatusText = computed(() => longTermStatus.value.text);
const shortTermStatusClass = computed(() => shortTermStatus.value.className);
const longTermStatusClass = computed(() => longTermStatus.value.className);

const trendClass = computed(() => statusFromText(summary.value.trend).className);
const structureClass = computed(() => statusFromText(summary.value.structure).className);

const loadingClass = computed(() => (loading.value ? "loading" : ""));

function placeholderClass(text) {
  if (!text || text === "--") return "placeholder";
  return "";
}
</script>
