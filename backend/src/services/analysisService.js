const { evaluateIntervalRules, evaluateMultiIntervalRules } = require("../utils/rules");

function buildRulesResponse({ indicators, interval }) {
  return {
    interval,
    rules: evaluateIntervalRules(indicators)
  };
}

function buildMultiIntervalRulesResponse(indicatorsByInterval) {
  return evaluateMultiIntervalRules(indicatorsByInterval);
}

module.exports = {
  buildRulesResponse,
  buildMultiIntervalRulesResponse
};
