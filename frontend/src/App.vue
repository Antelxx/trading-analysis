<template>
  <div class="app">
    <header class="toolbar">
      <div class="title">行情结构分析</div>
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
        <button class="primary" :disabled="loading" @click="refresh">
          生成分析
          <span v-if="loading" class="spinner" aria-label="loading"></span>
        </button>
      </div>
    </header>

    <section class="layout">
      <section class="panel chart-panel">
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
        <div class="footer">数据仅用于结构分析，不构成投资建议。</div>
      </section>

      <aside class="stack right-panel">
        <StatCard title="结构分析" :items="maItems" />
        <StatCard title="关键指标" :items="volumeItems" />
      </aside>
    </section>

    <section class="panel ai-panel">
      <AiCard title="AI分析" :analysis="aiAnalysis?.analysis" />
    </section>
    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import KlineChart from "./components/KlineChart.vue";
import StatCard from "./components/StatCard.vue";
import AiCard from "./components/AiCard.vue";
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
    kline.value = await fetchKline({ symbol, asset, interval: interval.value });
    const indicatorRes = await fetchIndicators({ symbol, asset, interval: interval.value });
    indicators.value = indicatorRes.indicators;
    aiAnalysis.value = await fetchAi({ symbol, asset, interval: interval.value });
    toast.value = "分析已生成";
    setTimeout(() => {
      toast.value = "";
    }, 2000);
  } finally {
    loading.value = false;
  }
}

const maItems = computed(() => {
  const latest = indicators.value?.latest;
  const trendLabel = latest?.trendDirection === "up" ? "上行" : latest?.trendDirection === "down" ? "下行" : "震荡";
  const structureLabel = latest?.maAlignment === "bullish" ? "多头" : latest?.maAlignment === "bearish" ? "空头" : "混合";
  return [
    { label: "趋势方向", value: trendLabel || "-", badgeClass: latest?.trendDirection === "up" ? "up" : "down" },
    { label: "均线排列", value: structureLabel || "-", badgeClass: "badge" },
    { label: "MA7 偏离", value: latest?.priceDistancePct?.ma7 ?? "-" },
    { label: "MA25 偏离", value: latest?.priceDistancePct?.ma25 ?? "-" },
    { label: "MA60 偏离", value: latest?.priceDistancePct?.ma60 ?? "-" }
  ];
});

const volumeItems = computed(() => {
  const latest = indicators.value?.latest;
  const volumes = indicators.value?.volume || [];
  const hasVolume = volumes.some((v) => v > 0);
  if (!hasVolume) {
    return [
      { label: "成交量趋势", value: "--" },
      { label: "量能配合", value: "--" }
    ];
  }
  const volumeLabel =
    latest?.volumeTrend === "increasing"
      ? "放量"
      : latest?.volumeTrend === "decreasing"
      ? "缩量"
      : "平稳";
  return [
    { label: "成交量趋势", value: volumeLabel || "-" },
    { label: "量能配合", value: latest?.volumeTrend === "increasing" ? "是" : "否" }
  ];
});

onMounted(refresh);
</script>
