<template>
  <div class="app">
    <header class="toolbar">
      <div class="title">TradingAnalysis</div>
      <div class="controls">
        <label class="select-group">
          <span>品种</span>
          <select v-model="marketKey">
            <option value="nasdaq">标普 500 (SPY)</option>
            <option value="gold">黄金 (XAUUSD)</option>
            <option value="shanghai">上证 (ASHR ETF)</option>
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
        <button class="primary" @click="refresh">生成分析</button>
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

const marketMap = {
  nasdaq: { symbol: "NASDAQ_COMPOSITE", asset: "stock", label: "纳斯达克综合指数", supportsIntraday: true },
  gold: { symbol: "XAUUSD", asset: "gold", label: "黄金", supportsIntraday: true },
  shanghai: { symbol: "ASHR", asset: "stock", label: "上证 (ASHR ETF)", supportsIntraday: true }
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
  kline.value = await fetchKline({ symbol, asset, interval: interval.value });
  const indicatorRes = await fetchIndicators({ symbol, asset, interval: interval.value });
  indicators.value = indicatorRes.indicators;
  aiAnalysis.value = await fetchAi({ symbol, asset, interval: interval.value });
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
