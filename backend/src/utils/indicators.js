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

function calcATR(candles, period = 14) {
  if (candles.length < period) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].h;
    const low = candles[i].l;
    const prevClose = candles[i - 1].c;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }
  // Initial ATR: Simple Average of first period TRs
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const atrs = new Array(period).fill(null); // padding to match candle index roughly (not exact match, just sequence)
  atrs.push(atr);

  // Subsequent ATR: (PrevATR * (period-1) + CurrentTR) / period
  // We need to return an array matching the candles length? 
  // Actually, usually we just need the latest ATR for analysis. 
  // For simplicity, let's just return the array of ATR values corresponding to the *end* of the calculation window.

  // Standard RMA (Wilder's Smoothing)
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    atrs.push(atr);
  }

  // Alignment: atrs[i] corresponds to candles[i+1] (because TR needs i and i-1)
  // Let's pad undefined to match candles length
  // candles: 0, 1, ..., N
  // trs: -, 0, ..., N-1 (length N-1)
  // atrs calculated from trs.
  // We will return the *last* calculated ATR.
  return atrs;
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return [];
  const gains = [];
  const losses = [];

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }

  // First Average Gain/Loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const rsis = new Array(period).fill(null);

  const getRsi = (g, l) => {
    if (l === 0) return 100;
    const rs = g / l;
    return 100 - (100 / (1 + rs));
  };

  rsis.push(getRsi(avgGain, avgLoss));

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rsis.push(getRsi(avgGain, avgLoss));
  }

  return rsis;
}

function findKeyLevels(candles) {
  // Assuming daily candles are passed for PDH/PDL
  if (!candles || candles.length < 2) return { pdh: null, pdl: null };
  const prevDay = candles[candles.length - 2]; // The completed previous day
  return {
    pdh: prevDay.h,
    pdl: prevDay.l
  };
}

function detectDivergence(candles, rsiValues, period = 14) {
  // Simple Regular Bearish Divergence: Price Higher High, RSI Lower High
  // Check peaks in the last 20 candles
  if (candles.length < 20 || rsiValues.length < 20) return null;

  const lookback = 20;
  const prices = candles.slice(-lookback).map(c => c.h);
  const rsis = rsiValues.slice(-lookback);

  // Logic: Find local maxima
  // This is a complex logic, for MVP let's implement a simplified check:
  // Compare current High vs High 10 bars ago. 
  // If CurrHigh > OldHigh but CurrRSI < OldRSI => Bearish Divergence

  const currentIdx = prices.length - 1;
  const currentHigh = prices[currentIdx];
  const currentRsi = rsis[currentIdx];

  // Find the highest point in the previous 5-15 bars
  let pivotIdx = -1;
  let pivotHigh = -Infinity;

  for (let i = currentIdx - 5; i >= currentIdx - 15; i--) {
    if (prices[i] > pivotHigh) {
      pivotHigh = prices[i];
      pivotIdx = i;
    }
  }

  if (pivotIdx !== -1) {
    const pivotRsi = rsis[pivotIdx];
    // Bearish Divergence: Price Made Higher High, RSI Made Lower High
    if (currentHigh > pivotHigh && currentRsi < pivotRsi && currentRsi > 50) {
      return "bearish";
    }
  }

  // Bullish Divergence checks Lows... logic similar but inverted... omitted for concise MVP
  return null;
}

function pctDistance(price, ma) {
  if (ma === null || ma === 0) return null;
  return Number((((price - ma) / ma) * 100).toFixed(4));
}


function calcIndicators(candles, dailyCandles = []) {
  const closes = candles.map((c) => c.c);
  const volumes = candles.map((c) => c.v || 0);

  const ma7 = sma(closes, 7);
  const ma25 = sma(closes, 25);
  const ma60 = sma(closes, 60);

  const atrSeries = calcATR(candles, 14);
  const currentATR = atrSeries && atrSeries.length > 0 ? atrSeries[atrSeries.length - 1] : null;

  const rsiSeries = calcRSI(closes, 14);
  const currentRSI = rsiSeries && rsiSeries.length > 0 ? rsiSeries[rsiSeries.length - 1] : null;

  const volMA24 = sma(volumes, 24);

  const { pdh, pdl } = findKeyLevels(dailyCandles);
  const divergence = detectDivergence(candles, rsiSeries);

  // Gold Specific: Candle Strength
  const candleStrength = (() => {
    // Current body size vs Avg body size
    if (candles.length < 25) return 0;
    const bodySizes = candles.map(c => Math.abs(c.c - c.o));
    const currentBody = bodySizes[bodySizes.length - 1];
    const avgBody = bodySizes.slice(-25, -1).reduce((a, b) => a + b, 0) / 24;
    return avgBody === 0 ? 0 : Number((currentBody / avgBody).toFixed(2));
  })();

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
    ma60,
    rsi: rsiSeries,
    atr: atrSeries,
    volume: volumes,
    volMA24,
    pdh,
    pdl,
    divergence,
    candleStrength,
    latest: {
      close: lastClose,
      trendDirection,
      maAlignment: alignment,
      priceDistancePct: distance,
      priceDistancePct: distance,
      volumeTrend,
      rsi: currentRSI,
      atr: currentATR,
      volMA: volMA24[lastIndex],
      divergence,
      candleStrength
    }
  };
}

module.exports = { calcIndicators };
