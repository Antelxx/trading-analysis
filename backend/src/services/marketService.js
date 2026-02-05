const { fetchCandles: fetchMock } = require("../providers/mockProvider");
const { fetchStockCandles } = require("../providers/alphaVantageProvider");
const { fetchTimeSeries, searchSymbol } = require("../providers/twelveDataProvider");
const { aggregateCandles } = require("./aggregate");
const { calcIndicators } = require("../utils/indicators");
const { evaluateIntervalRules } = require("../utils/rules");

const symbolCache = new Map();

async function resolveTwelveSymbol({ symbol, apiKey }) {
  if (symbol !== "NASDAQ_COMPOSITE") return symbol;
  if (symbolCache.has(symbol)) return symbolCache.get(symbol);
  const results = await searchSymbol({ query: "NASDAQ Composite", apiKey });
  const match =
    results.find(
      (r) =>
        String(r.instrument_name || "").toLowerCase().includes("nasdaq composite") ||
        String(r.symbol || "").toUpperCase() === "IXIC"
    ) || results[0];
  if (!match || !match.symbol) throw new Error("NASDAQ Composite symbol not found");
  symbolCache.set(symbol, match.symbol);
  return match.symbol;
}

async function getCandles({ symbol, assetClass, interval }) {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;

  let candles;
  if (apiKey) {
    if (assetClass === "stock") {
      const tdKey = process.env.TWELVEDATA_API_KEY;
      if (tdKey) {
        const resolved = await resolveTwelveSymbol({ symbol, apiKey: tdKey });
        candles = await fetchTimeSeries({ symbol: resolved, interval, apiKey: tdKey });
      } else {
        const base = await fetchStockCandles({ symbol, interval, apiKey });
        candles = interval === "4h" ? aggregateCandles(base, "4h") : base;
      }
    } else if (assetClass === "gold") {
      const tdKey = process.env.TWELVEDATA_API_KEY;
      if (!tdKey) throw new Error("TWELVEDATA_API_KEY missing");
      candles = await fetchTimeSeries({ symbol: "XAU/USD", interval, apiKey: tdKey });
    } else {
      throw new Error("unsupported assetClass");
    }
  } else {
    const base = await fetchMock({ symbol, interval: "1h" });
    candles = aggregateCandles(base, interval);
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
