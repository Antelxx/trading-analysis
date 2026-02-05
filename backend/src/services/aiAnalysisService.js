const { createAiProvider } = require("../providers/aiProvider");

function buildAiInput({ symbol, assetClass, interval, indicators, rules }) {
  return {
    symbol,
    assetClass,
    interval,
    indicators: {
      latest: indicators.latest
    },
    rules
  };
}

async function analyzeMarket({ symbol, assetClass, interval, indicators, rules }) {
  const provider = createAiProvider();
  const input = buildAiInput({ symbol, assetClass, interval, indicators, rules });
  const analysis = await provider.analyze({ input, rules });
  return { provider: provider.name, analysis };
}

module.exports = { analyzeMarket };
