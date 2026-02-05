const express = require("express");
const router = express.Router();
const { getCandles } = require("../services/marketService");
const { buildRulesResponse } = require("../services/analysisService");
const { analyzeMarket } = require("../services/aiAnalysisService");

function parseQuery(req) {
  const { symbol, asset = "stock", interval = "1h" } = req.query;
  return { symbol, asset, interval };
}

router.get("/rules", async (req, res) => {
  const { symbol, asset, interval } = parseQuery(req);
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  try {
    const data = await getCandles({ symbol, assetClass: asset, interval });
    res.json({
      symbol: data.symbol,
      assetClass: data.assetClass,
      interval: data.interval,
      ...buildRulesResponse({ indicators: data.indicators, interval: data.interval })
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/ai", async (req, res) => {
  const { symbol, asset, interval } = parseQuery(req);
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  try {
    const data = await getCandles({ symbol, assetClass: asset, interval });
    const rules = data.rules || buildRulesResponse({ indicators: data.indicators, interval }).rules;

    const ai = await analyzeMarket({
      symbol: data.symbol,
      assetClass: data.assetClass,
      interval: data.interval,
      indicators: data.indicators,
      rules
    });

    res.json({
      symbol: data.symbol,
      assetClass: data.assetClass,
      interval: data.interval,
      ...ai
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
