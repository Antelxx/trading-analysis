<template>
  <div class="kline-root">
    <div class="kline-legend">
      <span class="legend-item ma7">MA7({{ maText.ma7 }})</span>
      <span class="legend-item ma25">MA25({{ maText.ma25 }})</span>
      <span class="legend-item ma60">MA60({{ maText.ma60 }})</span>
    </div>
    <div class="kline-info">
      <span>时间：{{ info.time }}</span>
      <span>开：{{ info.open }}</span>
      <span>高：{{ info.high }}</span>
      <span>低：{{ info.low }}</span>
      <span>收：{{ info.close }}</span>
    </div>
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
const maText = ref({ ma7: "-", ma25: "-", ma60: "-" });
const info = ref({ time: "-", open: "-", high: "-", low: "-", close: "-" });

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
    color: c.c >= c.o ? "rgba(239, 68, 68, 0.5)" : "rgba(34, 197, 94, 0.5)"
  }));
}

function toLineData(candles, maValues) {
  return candles
    .map((c, idx) => ({
      time: Math.floor(new Date(c.t).getTime() / 1000),
      value: maValues[idx]
    }))
    .filter((p) => p.value !== null);
}

function render() {
  if (!priceEl.value || !volumeEl.value) return;
  priceChart = createChart(priceEl.value, {
    layout: {
      background: { color: "#131722" },
      textColor: "#e5e7eb"
    },
    grid: {
      vertLines: { color: "#1f2430" },
      horzLines: { color: "#1f2430" }
    },
    timeScale: { borderColor: "#2a2f3a" },
    rightPriceScale: { borderColor: "#2a2f3a" }
  });

  candleSeries = priceChart.addCandlestickSeries({
    upColor: "#ef4444",
    downColor: "#22c55e",
    borderUpColor: "#dc2626",
    borderDownColor: "#16a34a",
    wickUpColor: "#dc2626",
    wickDownColor: "#16a34a"
  });

  ma7Series = priceChart.addLineSeries({
    color: "#2563eb",
    lineWidth: 1,
    lastValueVisible: false,
    priceLineVisible: false
  });
  ma25Series = priceChart.addLineSeries({
    color: "#7c3aed",
    lineWidth: 1,
    lastValueVisible: false,
    priceLineVisible: false
  });
  ma60Series = priceChart.addLineSeries({
    color: "#0ea5e9",
    lineWidth: 1,
    lastValueVisible: false,
    priceLineVisible: false
  });

  volumeChart = createChart(volumeEl.value, {
    layout: {
      background: { color: "#131722" },
      textColor: "#e5e7eb"
    },
    grid: {
      vertLines: { color: "#1f2430" },
      horzLines: { color: "#1f2430" }
    },
    timeScale: { borderColor: "#2a2f3a" },
    rightPriceScale: { borderColor: "#2a2f3a" }
  });

  volumeSeries = volumeChart.addHistogramSeries({
    priceFormat: { type: "volume" },
    color: "rgba(34, 197, 94, 0.5)"
  });

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

  priceChart.subscribeCrosshairMove((param) => {
    const bar = param?.seriesData?.get(candleSeries);
    if (!bar || !param.time) return;
    const time = new Date(param.time * 1000);
    const yyyy = time.getFullYear();
    const mm = String(time.getMonth() + 1).padStart(2, "0");
    const dd = String(time.getDate()).padStart(2, "0");
    const hh = String(time.getHours()).padStart(2, "0");
    info.value = {
      time: `${yyyy}/${mm}/${dd}/${hh}`,
      open: bar.open?.toFixed(2) ?? "-",
      high: bar.high?.toFixed(2) ?? "-",
      low: bar.low?.toFixed(2) ?? "-",
      close: bar.close?.toFixed(2) ?? "-"
    };
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

  const last = (arr) => {
    for (let i = arr.length - 1; i >= 0; i -= 1) {
      if (arr[i] !== null && arr[i] !== undefined) return arr[i];
    }
    return null;
  };
  const ma7 = last(props.ma7);
  const ma25 = last(props.ma25);
  const ma60 = last(props.ma60);
  maText.value = {
    ma7: ma7 === null ? "-" : Number(ma7).toFixed(2),
    ma25: ma25 === null ? "-" : Number(ma25).toFixed(2),
    ma60: ma60 === null ? "-" : Number(ma60).toFixed(2)
  };

  const lastCandle = props.candles[props.candles.length - 1];
  if (lastCandle) {
    const time = new Date(lastCandle.t);
    const yyyy = time.getFullYear();
    const mm = String(time.getMonth() + 1).padStart(2, "0");
    const dd = String(time.getDate()).padStart(2, "0");
    const hh = String(time.getHours()).padStart(2, "0");
    info.value = {
      time: `${yyyy}/${mm}/${dd}/${hh}`,
      open: Number(lastCandle.o).toFixed(2),
      high: Number(lastCandle.h).toFixed(2),
      low: Number(lastCandle.l).toFixed(2),
      close: Number(lastCandle.c).toFixed(2)
    };
  }
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
  position: relative;
}

.kline-price,
.kline-volume {
  width: 100%;
  height: 100%;
}

.kline-legend {
  position: absolute;
  z-index: 2;
  top: 8px;
  left: 10px;
  display: flex;
  gap: 10px;
  font-size: 12px;
  background: rgba(19, 23, 34, 0.9);
  border: 1px solid #2a2f3a;
  border-radius: 8px;
  padding: 4px 8px;
}

.kline-info {
  position: absolute;
  z-index: 2;
  top: 40px;
  left: 10px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  background: rgba(19, 23, 34, 0.95);
  border: 1px solid #2a2f3a;
  border-radius: 8px;
  padding: 4px 8px;
  color: #e5e7eb;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #e5e7eb;
}

.legend-item::before {
  content: "";
  width: 10px;
  height: 2px;
  background: #94a3b8;
  display: inline-block;
}

.legend-item.ma7::before {
  background: #2563eb;
}
.legend-item.ma25::before {
  background: #7c3aed;
}
.legend-item.ma60::before {
  background: #0ea5e9;
}
</style>
