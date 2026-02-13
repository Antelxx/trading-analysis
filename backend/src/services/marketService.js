const { fetchCandles: fetchMock } = require("../providers/mockProvider");
const { fetchTimeSeries, searchSymbol } = require("../providers/twelveDataProvider");
const { aggregateCandles } = require("./aggregate");
const { calcIndicators } = require("../utils/indicators");
const { evaluateIntervalRules } = require("../utils/rules");

const symbolCache = new Map();

async function resolveTwelveSymbol({ symbol, apiKey }) {
  if (symbol === "000001") return "000001.SS";
  if (symbol !== "NASDAQ_COMPOSITE" && symbol !== "IXIC") return symbol;
  if (symbolCache.has(symbol)) return symbolCache.get(symbol);
  const results = await searchSymbol({ query: "NASDAQ Composite", apiKey });
  const match =
    results.find((r) => {
      const name = String(r.instrument_name || "").toLowerCase();
      const sym = String(r.symbol || "").toUpperCase();
      return name.includes("nasdaq composite") || sym === "IXIC";
    }) || results[0];
  if (!match || !match.symbol) throw new Error("NASDAQ Composite symbol not found");
  symbolCache.set(symbol, match.symbol);
  return match.symbol;
}

async function fetchBaseCandles({ symbol, assetClass, interval }) {
  let candles;
  if (interval === "4h") {
    throw new Error("interval 4h not supported");
  }

  // Optimize: For 1day, fetch directly if possible.
  // TwelveData supports 1day. No need to aggregate from 1h unless data is missing.
  // Let's trust the API for 1day data to get longer history (e.g. 300 days).

  const tdKey = process.env.TWELVEDATA_API_KEY;
  if (!tdKey) throw new Error("TWELVEDATA_API_KEY missing");

  if (assetClass === "stock") {
    const resolved = await resolveTwelveSymbol({ symbol, apiKey: tdKey });
    candles = await fetchTimeSeries({
      symbol: resolved,
      interval: interval,
      apiKey: tdKey
    });
  } else if (assetClass === "gold") {
    candles = await fetchTimeSeries({
      symbol: "XAU/USD",
      interval: interval,
      apiKey: tdKey
    });
  } else {
    throw new Error("unsupported assetClass");
  }

  return candles;
}

function buildCandlesData({ symbol, assetClass, interval, candles, dailyCandles = [] }) {
  const indicators = calcIndicators(candles, dailyCandles);
  // Attach assetClass to indicators so rules can see it
  indicators.assetClass = assetClass;
  const rules = evaluateIntervalRules(indicators);
  return {
    symbol,
    assetClass,
    interval,
    timezone: "UTC",
    currency: assetClass === "gold" ? "USD" : "USD",
    candles,
    indicators,
    rules
  };
}

async function getCandles({ symbol, assetClass, interval, baseCandles }) {
  let candles;
  const useAggregate = interval === "1day";
  if (useAggregate && Array.isArray(baseCandles) && baseCandles.length > 0) {
    // If we ever invoke this with baseCandles pre-fetched, handle agg if needed.
    // But currently we fetch fresh.
    candles = aggregateCandles(baseCandles, interval);
  } else {
    candles = await fetchBaseCandles({ symbol, assetClass, interval });
  }

  let dailyCandles = [];
  // For intraday intervals, we need daily candles for PDH/PDL
  if (!useAggregate && interval === "1h") {
    // We can reuse fetchBaseCandles logic or aggregate if we had 1h data? 
    // Re-fetching 1day data is safest.
    try {
      dailyCandles = await fetchBaseCandles({ symbol, assetClass, interval: "1day" });
    } catch (e) {
      console.error("Failed to fetch daily candles for PDH/PDL:", e.message);
    }
  }

  return buildCandlesData({ symbol, assetClass, interval, candles, dailyCandles });
}

module.exports = { getCandles, fetchBaseCandles, buildCandlesData };
