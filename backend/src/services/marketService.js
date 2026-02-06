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

async function getCandles({ symbol, assetClass, interval }) {
  let candles;
  const tdKey = process.env.TWELVEDATA_API_KEY;
  if (!tdKey) throw new Error("TWELVEDATA_API_KEY missing");
  if (assetClass === "stock") {
    const resolved = await resolveTwelveSymbol({ symbol, apiKey: tdKey });
    candles = await fetchTimeSeries({ symbol: resolved, interval, apiKey: tdKey });
  } else if (assetClass === "gold") {
    candles = await fetchTimeSeries({ symbol: "XAU/USD", interval, apiKey: tdKey });
  } else {
    throw new Error("unsupported assetClass");
  }

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

module.exports = { getCandles };
