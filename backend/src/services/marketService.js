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
  const useAggregate = interval === "1day";
  const fetchInterval = useAggregate ? "1h" : interval;
  const tdKey = process.env.TWELVEDATA_API_KEY;
  if (!tdKey) throw new Error("TWELVEDATA_API_KEY missing");
  if (assetClass === "stock") {
    const resolved = await resolveTwelveSymbol({ symbol, apiKey: tdKey });
    candles = await fetchTimeSeries({
      symbol: resolved,
      interval: fetchInterval,
      apiKey: tdKey
    });
  } else if (assetClass === "gold") {
    candles = await fetchTimeSeries({
      symbol: "XAU/USD",
      interval: fetchInterval,
      apiKey: tdKey
    });
  } else {
    throw new Error("unsupported assetClass");
  }

  if (useAggregate) {
    candles = aggregateCandles(candles, interval);
  }

  return candles;
}

function buildCandlesData({ symbol, assetClass, interval, candles }) {
  const indicators = calcIndicators(candles);
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
    candles = aggregateCandles(baseCandles, interval);
  } else {
    candles = await fetchBaseCandles({ symbol, assetClass, interval });
  }

  return buildCandlesData({ symbol, assetClass, interval, candles });
}

module.exports = { getCandles, fetchBaseCandles, buildCandlesData };
