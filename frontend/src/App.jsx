import { useMemo, useState } from "react";
import KlineChart from "./components/KlineChart.jsx";
import { fetchKline, fetchIndicators } from "./api/market";
import { fetchAi } from "./api/analysis";

const marketMap = {
  nasdaq: { symbol: "QQQ", asset: "stock", label: "纳指100 ETF（QQQ）", supportsIntraday: true },
  gold: { symbol: "XAUUSD", asset: "gold", label: "黄金", supportsIntraday: true }
};

export default function App() {
  const [marketKey, setMarketKey] = useState("nasdaq");
  const [interval, setInterval] = useState("1h");
  const [kline, setKline] = useState(null);
  const [indicators, setIndicators] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const currentMarket = marketMap[marketKey];

  const showIntraday = currentMarket.supportsIntraday;

  const summary = useMemo(() => {
    const latest = indicators?.latest;
    if (!latest) return { trend: "--", structure: "--", zone: "--" };
    const trend = latest.trendDirection === "up" ? "偏多" : latest.trendDirection === "down" ? "偏空" : "震荡";
    const structure = latest.maAlignment === "bullish" ? "多头排列" : latest.maAlignment === "bearish" ? "空头排列" : "混合";
    const close = latest.close;
    const ma60 = indicators?.ma60?.slice(-1)?.[0];
    const zone = close && ma60 ? (close > ma60 ? "MA60 支撑区" : "MA60 压力区") : "--";
    return { trend, structure, zone };
  }, [indicators]);

  const aiParagraph = useMemo(() => {
    const a = aiAnalysis?.analysis;
    if (!a) return "尚未生成 AI 解读。";
    const parts = [];
    if (a.overall) parts.push(`当前结构为${a.overall === "trend" ? "趋势" : a.overall === "range" ? "震荡" : "结构破坏"}。`);
    if (a.forces) parts.push(typeof a.forces === "string" ? a.forces : "多空力量存在分歧。");
    if (a.risk) parts.push(`主要风险在于：${a.risk}。`);
    if (a.rationale) parts.push(a.rationale);
    return parts.join(" ");
  }, [aiAnalysis]);

  const strategyText = useMemo(() => {
    const hint = aiAnalysis?.analysis?.action_hint;
    if (!aiAnalysis) return "--";
    if (hint === "wait") return "等待确认，避免在结构未明确时介入。";
    if (hint === "watch") return "保持观察，等待量价关系进一步确认。";
    if (hint === "cautious") return "谨慎参与，控制节奏与仓位。";
    return "以观察为主，等待更明确结构信号。";
  }, [aiAnalysis]);

  const riskText = useMemo(() => {
    const r = aiAnalysis?.analysis?.risk;
    if (!aiAnalysis) return "--";
    if (!r) return "--";
    if (["low", "medium", "high"].includes(r)) return `风险等级：${r === "low" ? "低" : r === "medium" ? "中" : "高"}。`;
    return r;
  }, [aiAnalysis]);

  const keyLevelText = useMemo(() => {
    if (!indicators) return "--";
    const ma25 = indicators?.ma25?.slice(-1)?.[0];
    const ma60 = indicators?.ma60?.slice(-1)?.[0];
    if (!ma25 || !ma60) return "--";
    return `关注 MA25/MA60 区域（${Number(ma25).toFixed(2)} / ${Number(ma60).toFixed(2)}）。`;
  }, [indicators]);

  async function onGenerate() {
    const { symbol, asset } = currentMarket;
    try {
      setLoading(true);
      const [klineRes, indicatorRes, aiRes] = await Promise.all([
        fetchKline({ symbol, asset, interval }),
        fetchIndicators({ symbol, asset, interval }),
        fetchAi({ symbol, asset, interval })
      ]);
      setKline(klineRes);
      setIndicators(indicatorRes.indicators);
      setAiAnalysis(aiRes);
      setToast("分析已生成");
      setTimeout(() => setToast(""), 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">行情结构分析</div>
        <div className="controls">
          <label className="select-group">
            <span>品种</span>
            <select value={marketKey} onChange={(e) => setMarketKey(e.target.value)}>
              <option value="nasdaq">纳指100 ETF（QQQ）</option>
              <option value="gold">黄金 (XAUUSD)</option>
            </select>
          </label>
          <label className="select-group">
            <span>周期</span>
            <select value={interval} onChange={(e) => setInterval(e.target.value)}>
              {showIntraday && <option value="1h">1小时</option>}
              {showIntraday && <option value="4h">4小时</option>}
              <option value="1day">1天</option>
            </select>
          </label>
          {!loading && (
            <button className="primary" onClick={onGenerate}>生成AI分析</button>
          )}
          {loading && (
            <button className="primary loading-btn" disabled>
              AI分析中
              <span className="spinner" aria-label="loading"></span>
            </button>
          )}
        </div>
      </header>

      <main className="main">
        <section className="main-grid">
          <section className="chart-wrap">
            <div className="chart-area">
              {kline?.candles?.length ? (
                <KlineChart
                  candles={kline.candles}
                  ma7={indicators?.ma7 || []}
                  ma25={indicators?.ma25 || []}
                  ma60={indicators?.ma60 || []}
                />
              ) : (
                <div className="empty">暂无数据，请检查行情 API Key 或选择可用市场。</div>
              )}
            </div>
            <div className="footnote">数据仅用于结构分析，不构成投资建议。</div>
          </section>

          <aside className="summary">
            <div className="summary-title">结构结论摘要</div>
            <div className="summary-item">趋势：{summary.trend}</div>
            <div className="summary-item">均线结构：{summary.structure}</div>
            <div className="summary-item">关键区间：{summary.zone}</div>
            <div className="summary-item">策略：{strategyText}</div>
            <div className="summary-item">风险：{riskText}</div>
            <div className="summary-item">关键价位：{keyLevelText}</div>
          </aside>
        </section>

        <section className="interpretation">
          <div className="section-title">AI 市场解读</div>
          <p className="interpretation-text">{aiParagraph}</p>
        </section>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
