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
  const volumeConfirm = latest.volumeTrend === "increasing";

  const riskLevel = (() => {
    if (trend === "unknown" || maStructure === "unknown") return "high";
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
