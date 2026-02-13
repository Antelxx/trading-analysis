function assessDistance(distancePct) {
  if (distancePct === null || distancePct === undefined) return "unknown";
  const abs = Math.abs(distancePct);
  if (abs <= 1) return "near";
  if (abs >= 3) return "far";
  return "normal";
}

function evaluateIntervalRules(indicators) {
  const latest = indicators.latest || {};

  const distance = {
    ma7: assessDistance(latest.priceDistancePct?.ma7),
    ma25: assessDistance(latest.priceDistancePct?.ma25),
    ma60: assessDistance(latest.priceDistancePct?.ma60)
  };

  const trend = latest.trendDirection || "unknown";
  const maStructure = latest.maAlignment || "unknown";

  // Asset Differentiated Volume/Strength Check
  const volumeConfirm = (() => {
    if (indicators.assetClass === 'gold') {
      // For Gold: Use Candle Strength & RSI Impulse
      const strongCandle = (latest.candleStrength || 0) > 1.5;
      const rsiImpulse = (latest.rsi || 50) > 60;
      return strongCandle || rsiImpulse;
    } else {
      // For Stocks: Use Volume
      return latest.volumeTrend === "increasing" || (latest.volMA && latest.volume && latest.volume[latest.volume.length - 1] > 1.5 * latest.volMA);
    }
  })();

  // Volatility Check (ATR)
  const volatilityState = (() => {
    const atr = latest.atr;
    const close = latest.close;
    // We don't have MA60 value directly here in 'latest', usually it's in detailed indicators
    // But we have 'distance.ma60' which is pct distance. 
    // Heuristic: If distance > 3% on 1H chart, it's very high deviation.
    // Better: compare ATR to Price. 
    // ATR ratio = ATR / Price.
    if (!atr || !close) return "normal";
    // This is simple heuristic. Real '2*ATR' logic needs dynamic calculation relative to MA.
    // Let's use the USER's specific rule: "Price deviation from MA60 > 2 * ATR"
    // We need MA60 value. We can back-calculate from distance.ma60 or pass it in.
    // Let's rely on passed in indicators.ma60 array.

    if (indicators.ma60 && indicators.ma60.length > 0) {
      const ma = indicators.ma60[indicators.ma60.length - 1];
      const dev = Math.abs(close - ma);
      if (dev > 2 * atr) return "high_volatility";
    }
    return "normal";
  })();

  const riskLevel = (() => {
    if (trend === "unknown" || maStructure === "unknown") return "high";
    if (volatilityState === "high_volatility") return "high"; // New Rule
    if (latest.divergence === "bearish" && trend === "up") return "high"; // Divergence Risk

    // Key Level Rejection Risk (if close < pdh but high > pdh)
    if (latest.close < indicators.pdh && indicators.latest.high > indicators.pdh) return "medium";

    if (maStructure === "mixed") return "medium";
    if (distance.ma7 === "far" || distance.ma25 === "far") return "medium";
    return "low";
  })();

  const actionHint = (() => {
    if (riskLevel === "high") return "wait";
    if (riskLevel === "medium") return "cautious";
    return "watch";
  })();

  return {
    trend,
    ma_structure: maStructure,
    price_distance: distance,
    volume_confirm: volumeConfirm,
    volatility: volatilityState,
    divergence: latest.divergence,
    key_levels: { pdh: indicators.pdh, pdl: indicators.pdl },
    risk_level: riskLevel,
    action_hint: actionHint
  };
}

function evaluateTimeframeSync(resultsByInterval) {
  const intervals = Object.keys(resultsByInterval || {});
  if (intervals.length === 0) return "unknown";

  const trends = intervals.map((i) => resultsByInterval[i].trend);
  const validTrends = trends.filter((t) => t !== "unknown" && t !== "flat");
  if (validTrends.length === 0) return "unknown";

  const allSame = validTrends.every((t) => t === validTrends[0]);
  if (allSame && validTrends.length === intervals.length) return "full";
  if (allSame) return "partial";
  return "none";
}

function evaluateMultiIntervalRules(indicatorsByInterval) {
  const results = {};
  for (const [interval, indicators] of Object.entries(indicatorsByInterval || {})) {
    // We might need to pass down assetClass to evaluateIntervalRules if it was available
    // Assuming indicators object has it or we attach it
    results[interval] = evaluateIntervalRules(indicators);
  }

  return {
    by_interval: results,
    timeframe_sync: evaluateTimeframeSync(results)
  };
}

module.exports = {
  evaluateIntervalRules,
  evaluateMultiIntervalRules
};
