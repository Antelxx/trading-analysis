import { useEffect, useRef, useMemo } from "react";
import { createChart } from "lightweight-charts";

export default function KlineChart({ candles, ma7, ma25, ma60 }) {
  const priceEl = useRef(null);
  const volumeEl = useRef(null);
  const chartRef = useRef(null);
  const volumeRef = useRef(null);
  const seriesRef = useRef({});

  const maText = useMemo(() => {
    const last = (arr) => {
      for (let i = arr.length - 1; i >= 0; i -= 1) {
        if (arr[i] !== null && arr[i] !== undefined) return arr[i];
      }
      return null;
    };
    const v7 = last(ma7);
    const v25 = last(ma25);
    const v60 = last(ma60);
    return {
      ma7: v7 == null ? "-" : Number(v7).toFixed(2),
      ma25: v25 == null ? "-" : Number(v25).toFixed(2),
      ma60: v60 == null ? "-" : Number(v60).toFixed(2)
    };
  }, [ma7, ma25, ma60]);

  useEffect(() => {
    if (!priceEl.current || !volumeEl.current) return;

    const priceChart = createChart(priceEl.current, {
      layout: { background: { color: "#ffffff" }, textColor: "#111827" },
      grid: { vertLines: { color: "#eef2f7" }, horzLines: { color: "#eef2f7" } },
      timeScale: { borderColor: "#e5e7eb" },
      rightPriceScale: { borderColor: "#e5e7eb" }
    });

    const volumeChart = createChart(volumeEl.current, {
      layout: { background: { color: "#ffffff" }, textColor: "#111827" },
      grid: { vertLines: { color: "#eef2f7" }, horzLines: { color: "#eef2f7" } },
      timeScale: { borderColor: "#e5e7eb" },
      rightPriceScale: { borderColor: "#e5e7eb" }
    });

    const candleSeries = priceChart.addCandlestickSeries({
      upColor: "#ef4444",
      downColor: "#22c55e",
      borderUpColor: "#dc2626",
      borderDownColor: "#16a34a",
      wickUpColor: "#dc2626",
      wickDownColor: "#16a34a"
    });

    const ma7Series = priceChart.addLineSeries({ color: "#2563eb", lineWidth: 1 });
    const ma25Series = priceChart.addLineSeries({ color: "#60a5fa", lineWidth: 1 });
    const ma60Series = priceChart.addLineSeries({ color: "#94a3b8", lineWidth: 1 });

    const volumeSeries = volumeChart.addHistogramSeries({
      priceFormat: { type: "volume" },
      color: "rgba(34, 197, 94, 0.5)"
    });

    priceChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range) return;
      volumeChart.timeScale().setVisibleLogicalRange(range);
    });
    volumeChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range) return;
      priceChart.timeScale().setVisibleLogicalRange(range);
    });

    chartRef.current = priceChart;
    volumeRef.current = volumeChart;
    seriesRef.current = { candleSeries, ma7Series, ma25Series, ma60Series, volumeSeries };

    return () => {
      priceChart.remove();
      volumeChart.remove();
    };
  }, []);

  useEffect(() => {
    const { candleSeries, ma7Series, ma25Series, ma60Series, volumeSeries } = seriesRef.current;
    if (!candleSeries) return;
    const toSeries = (arr) =>
      arr.map((c) => ({
        time: Math.floor(new Date(c.t).getTime() / 1000),
        open: c.o,
        high: c.h,
        low: c.l,
        close: c.c
      }));
    const toVolume = (arr) =>
      arr.map((c) => ({
        time: Math.floor(new Date(c.t).getTime() / 1000),
        value: c.v || 0,
        color: c.c >= c.o ? "rgba(239, 68, 68, 0.5)" : "rgba(34, 197, 94, 0.5)"
      }));
    const toLine = (arr, ma) =>
      arr
        .map((c, i) => ({ time: Math.floor(new Date(c.t).getTime() / 1000), value: ma[i] }))
        .filter((p) => p.value != null);

    candleSeries.setData(toSeries(candles));
    volumeSeries.setData(toVolume(candles));
    ma7Series.setData(toLine(candles, ma7));
    ma25Series.setData(toLine(candles, ma25));
    ma60Series.setData(toLine(candles, ma60));

    chartRef.current?.timeScale().fitContent();
    volumeRef.current?.timeScale().fitContent();
  }, [candles, ma7, ma25, ma60]);

  return (
    <div className="kline-root">
      <div className="kline-legend">
        <span className="legend-item ma7">MA7({maText.ma7})</span>
        <span className="legend-item ma25">MA25({maText.ma25})</span>
        <span className="legend-item ma60">MA60({maText.ma60})</span>
      </div>
      <div ref={priceEl} className="kline-price" />
      <div ref={volumeEl} className="kline-volume" />
    </div>
  );
}
