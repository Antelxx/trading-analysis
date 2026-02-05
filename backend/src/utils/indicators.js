function sma(values, period) {
  const out = [];
  for (let i = 0; i < values.length; i += 1) {
    if (i + 1 < period) {
      out.push(null);
      continue;
    }
    const window = values.slice(i + 1 - period, i + 1);
    const sum = window.reduce((a, b) => a + b, 0);
    out.push(Number((sum / period).toFixed(6)));
  }
  return out;
}

function pctDistance(price, ma) {
  if (ma === null || ma === 0) return null;
  return Number((((price - ma) / ma) * 100).toFixed(4));
}

function calcIndicators(candles) {
  const closes = candles.map((c) => c.c);
  const volumes = candles.map((c) => c.v || 0);

  const ma7 = sma(closes, 7);
  const ma25 = sma(closes, 25);
  const ma60 = sma(closes, 60);

  const lastIndex = candles.length - 1;
  const lastClose = closes[lastIndex];

  const distance = {
    ma7: pctDistance(lastClose, ma7[lastIndex]),
    ma25: pctDistance(lastClose, ma25[lastIndex]),
    ma60: pctDistance(lastClose, ma60[lastIndex])
  };

  const alignment = (() => {
    const a = ma7[lastIndex];
    const b = ma25[lastIndex];
    const c = ma60[lastIndex];
    if (a === null || b === null || c === null) return "unknown";
    if (a > b && b > c) return "bullish";
    if (a < b && b < c) return "bearish";
    return "mixed";
  })();

  const trendDirection = (() => {
    const a = ma7[lastIndex];
    const b = ma25[lastIndex];
    if (a === null || b === null) return "unknown";
    if (a > b) return "up";
    if (a < b) return "down";
    return "flat";
  })();

  const volumeTrend = (() => {
    if (volumes.length === 0) return "unknown";
    const allZero = volumes.every((v) => v === 0);
    if (allZero) return "unknown";
    const recent = volumes.slice(-7);
    const prev = volumes.slice(-14, -7);
    if (recent.length < 7 || prev.length < 7) return "unknown";
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const prevAvg = prev.reduce((a, b) => a + b, 0) / prev.length;
    if (recentAvg > prevAvg * 1.1) return "increasing";
    if (recentAvg < prevAvg * 0.9) return "decreasing";
    return "flat";
  })();

  return {
    ma7,
    ma25,
    ma60,
    volume: volumes,
    latest: {
      close: lastClose,
      trendDirection,
      maAlignment: alignment,
      priceDistancePct: distance,
      volumeTrend
    }
  };
}

module.exports = { calcIndicators };
