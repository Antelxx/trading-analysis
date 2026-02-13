const { calcIndicators } = require('../backend/src/utils/indicators');

// Mock data: 100 random candles
const mockCandles = Array.from({ length: 100 }, (_, i) => ({
    t: 1000 + i,
    o: 100 + i,
    h: 105 + i,
    l: 95 + i,
    c: 102 + i,
    v: 1000 + (i % 2 === 0 ? 500 : -500)
}));

// Add some divergence pattern (Price Higher High, RSI Lower High)
// Last 10 candles:
// Price: 100, 102, 105, 103, 110 (Peak 1), 108, 112 (Peak 2), 110, 105, 120 (Peak 3)
// RSI needs to show divergence
// This functional test just verifies the functions run without error and return structure
// verification of logic correctness is done via manual check of output or unit tests

try {
    const results = calcIndicators(mockCandles);
    console.log("Indicators calculated successfully");

    // Check for new fields (ATR, RSI, etc) - which are NOT YET implemented
    // This script will be updated as we implement features
    if (results.atr) console.log("ATR present");
    if (results.rsi) console.log("RSI present");

} catch (e) {
    console.error("Error calculating indicators:", e);
    process.exit(1);
}
