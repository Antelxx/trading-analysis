const express = require("express");
const router = express.Router();
const { getCandles } = require("../services/marketService");

function parseQuery(req) {
  const { symbol, asset = "stock", interval = "1h" } = req.query;
  return { symbol, asset, interval };
}

router.get("/kline", async (req, res) => {
  const { symbol, asset, interval } = parseQuery(req);
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  try {
    const data = await getCandles({ symbol, assetClass: asset, interval });
    res.json({
      symbol: data.symbol,
      assetClass: data.assetClass,
      interval: data.interval,
      timezone: data.timezone,
      currency: data.currency,
      candles: data.candles
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/indicators", async (req, res) => {
  const { symbol, asset, interval } = parseQuery(req);
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  try {
    const data = await getCandles({ symbol, assetClass: asset, interval });
    res.json({
      symbol: data.symbol,
      assetClass: data.assetClass,
      interval: data.interval,
      indicators: data.indicators
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
