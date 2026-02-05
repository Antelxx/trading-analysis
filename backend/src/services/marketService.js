const { fetchCandles: fetchMock } = require("../providers/mockProvider");
const { fetchStockCandles } = require("../providers/alphaVantageProvider");
const { fetchGoldCandles } = require("../providers/twelveDataProvider");
const { aggregateCandles } = require("./aggregate");
const { calcIndicators } = require("../utils/indicators");
const { evaluateIntervalRules } = require("../utils/rules");

async function getCandles({ symbol, assetClass, interval }) {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;

  let candles;
  if (apiKey) {
    if (assetClass === "stock") {
      const base = await fetchStockCandles({ symbol, interval, apiKey });
      candles = interval === "4h" ? aggregateCandles(base, "4h") : base;
    } else if (assetClass === "gold") {
      const tdKey = process.env.TWELVEDATA_API_KEY;
      if (!tdKey) throw new Error("TWELVEDATA_API_KEY missing");
      const base = await fetchGoldCandles({ interval, apiKey: tdKey });
      candles = base;
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
