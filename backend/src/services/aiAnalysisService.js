const { createAiProvider } = require("../providers/aiProvider");
const { fetchBaseCandles, buildCandlesData } = require("./marketService");
const { aggregateCandles } = require("./aggregate");

const SHORT_TERM_INTERVAL = "1h";
const LONG_TERM_INTERVAL = "1day";
const SHORT_TERM_SAMPLES = 24;
const LONG_TERM_SAMPLES = 15;

function sampleCandles(candles, count) {
  const items = Array.isArray(candles) ? candles.slice(-count) : [];
  return items.map((c) => ({
    datetime: c.t,
    close: c.c,
    volume: c.v || 0
  }));
}

function buildAiInput({
  symbol,
  assetClass,
  interval,
  shortTerm,
  longTerm
}) {
  return {
    symbol,
    assetClass,
    interval,
    indicators: {
      latest: shortTerm.indicators.latest,
      long_term_latest: longTerm.indicators.latest
    },
    rules: {
      short_term: {
        trend: shortTerm.rules?.trend,
        ma_structure: shortTerm.rules?.ma_structure,
        price_distance: shortTerm.rules?.price_distance,
        risk_level: shortTerm.rules?.risk_level,
        action_hint: shortTerm.rules?.action_hint,
        volatility: shortTerm.rules?.volatility,
        volume_confirm: shortTerm.rules?.volume_confirm,
        divergence: shortTerm.rules?.divergence,
        key_levels: shortTerm.rules?.key_levels
      },
      long_term: {
        trend: longTerm.rules?.trend,
        ma_structure: longTerm.rules?.ma_structure,
        price_distance: longTerm.rules?.price_distance,
        risk_level: longTerm.rules?.risk_level,
        action_hint: longTerm.rules?.action_hint,
        volatility: longTerm.rules?.volatility
      }
    },
    samples: {
      short_term: sampleCandles(shortTerm.candles, SHORT_TERM_SAMPLES),
      long_term: sampleCandles(longTerm.candles, LONG_TERM_SAMPLES)
    }
  };
}

async function analyzeMarket({ symbol, assetClass, interval }) {
  const provider = createAiProvider();
  const baseCandles = await fetchBaseCandles({
    symbol,
    assetClass,
    interval: SHORT_TERM_INTERVAL
  });

  const longCandles = aggregateCandles(baseCandles, LONG_TERM_INTERVAL);
  const [shortTerm, longTerm] = await Promise.all([
    Promise.resolve(
      buildCandlesData({
        symbol,
        assetClass,
        interval: SHORT_TERM_INTERVAL,
        candles: baseCandles,
        dailyCandles: longCandles
      })
    ),
    Promise.resolve(
      buildCandlesData({
        symbol,
        assetClass,
        interval: LONG_TERM_INTERVAL,
        candles: longCandles
      })
    )
  ]);

  const input = buildAiInput({
    symbol,
    assetClass,
    interval,
    shortTerm,
    longTerm
  });
  const rawAnalysis = await provider.analyze({ input, rules: input.rules.short_term });
  const analysis = normalizeAnalysis({ analysis: rawAnalysis, input });
  return { provider: provider.name, analysis };
}

module.exports = { analyzeMarket };

function normalizeAnalysis({ analysis, input }) {
  const normalized = { ...(analysis || {}) };
  const shortTrend = input?.rules?.short_term?.trend;
  const longTrend = input?.rules?.long_term?.trend;
  const timeframes = normalized.timeframes || {};
  const sanitizeFrameText = (text) => {
    if (!text) return text;
    return String(text)
      .replace(/1day/gi, "日线")
      .replace(/1d/gi, "日线")
      .replace(/1h/gi, "1小时");
  };

  if (!normalized.overall_view) {
    normalized.overall_view = normalized.rationale || "短期与长期信号需结合观察，等待结构确认。";
  }

  normalized.overall_view = sanitizeFrameText(normalized.overall_view);
  if (typeof normalized.rationale === "string") {
    normalized.rationale = sanitizeFrameText(normalized.rationale);
  }
  if (typeof normalized.overall === "string") {
    normalized.overall = sanitizeFrameText(normalized.overall);
  }

  return normalized;
}
