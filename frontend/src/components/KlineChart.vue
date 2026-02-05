<template>
  <div class="kline-root">
    <div ref="priceEl" class="kline-price"></div>
    <div ref="volumeEl" class="kline-volume"></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch, ref } from "vue";
import { createChart } from "lightweight-charts";

const props = defineProps({
  candles: { type: Array, default: () => [] },
  ma7: { type: Array, default: () => [] },
  ma25: { type: Array, default: () => [] },
  ma60: { type: Array, default: () => [] }
});

const priceEl = ref(null);
const volumeEl = ref(null);
let priceChart;
let volumeChart;
let candleSeries;
let ma7Series;
let ma25Series;
let ma60Series;
let volumeSeries;
let syncing = false;

function toSeriesData(candles) {
  return candles.map((c) => ({
    time: Math.floor(new Date(c.t).getTime() / 1000),
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c
  }));
}

function toVolumeData(candles) {
  return candles.map((c) => ({
    time: Math.floor(new Date(c.t).getTime() / 1000),
    value: c.v || 0,
    color: c.c >= c.o ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)"
  }));
}

function toLineData(candles, maValues) {
  return candles.map((c, idx) => ({
    time: Math.floor(new Date(c.t).getTime() / 1000),
    value: maValues[idx]
  })).filter((p) => p.value !== null);
}

function render() {
  if (!priceEl.value || !volumeEl.value) return;
  priceChart = createChart(priceEl.value, {
    layout: {
      background: { color: "#ffffff" },
      textColor: "#111827"
    },
    grid: {
      vertLines: { color: "#eef2f7" },
      horzLines: { color: "#eef2f7" }
    },
    timeScale: { borderColor: "#e5e7eb" },
    rightPriceScale: { borderColor: "#e5e7eb" }
  });

  candleSeries = priceChart.addCandlestickSeries({
    upColor: "#22c55e",
    downColor: "#ef4444",
    borderUpColor: "#16a34a",
    borderDownColor: "#dc2626",
    wickUpColor: "#16a34a",
    wickDownColor: "#dc2626"
  });

  ma7Series = priceChart.addLineSeries({ color: "#2563eb", lineWidth: 2 });
  ma25Series = priceChart.addLineSeries({ color: "#7c3aed", lineWidth: 2 });
  ma60Series = priceChart.addLineSeries({ color: "#0ea5e9", lineWidth: 2 });

  volumeChart = createChart(volumeEl.value, {
    layout: {
      background: { color: "#ffffff" },
      textColor: "#111827"
    },
    grid: {
      vertLines: { color: "#eef2f7" },
      horzLines: { color: "#eef2f7" }
    },
    timeScale: { borderColor: "#e5e7eb" },
    rightPriceScale: { borderColor: "#e5e7eb" }
  });

  volumeSeries = volumeChart.addHistogramSeries({
    priceFormat: { type: "volume" },
    color: "rgba(34, 197, 94, 0.5)"
  });

  // Sync time range between charts (TradingView-like behavior)
  priceChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (syncing || !range) return;
    syncing = true;
    volumeChart.timeScale().setVisibleLogicalRange(range);
    syncing = false;
  });
  volumeChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (syncing || !range) return;
    syncing = true;
    priceChart.timeScale().setVisibleLogicalRange(range);
    syncing = false;
  });
}

function updateSeries() {
  if (!priceChart || !volumeChart) return;
  candleSeries.setData(toSeriesData(props.candles));
  volumeSeries.setData(toVolumeData(props.candles));
  ma7Series.setData(toLineData(props.candles, props.ma7));
  ma25Series.setData(toLineData(props.candles, props.ma25));
  ma60Series.setData(toLineData(props.candles, props.ma60));
  priceChart.timeScale().fitContent();
  volumeChart.timeScale().fitContent();
}

onMounted(() => {
  render();
  updateSeries();
});

onBeforeUnmount(() => {
  if (priceChart) priceChart.remove();
  if (volumeChart) volumeChart.remove();
});

watch(() => props.candles, updateSeries);
watch(() => props.ma7, updateSeries);
watch(() => props.ma25, updateSeries);
watch(() => props.ma60, updateSeries);
</script>

<style scoped>
.kline-root {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: 3fr 1fr;
  gap: 8px;
}

.kline-price,
.kline-volume {
  width: 100%;
  height: 100%;
}
</style>
