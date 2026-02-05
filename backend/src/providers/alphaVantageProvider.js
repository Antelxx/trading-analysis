const axios = require("axios");

const BASE_URL = "https://www.alphavantage.co/query";

function mapTimeSeriesToCandles(series) {
  const keys = Object.keys(series || {}).sort();
  return keys.map((t) => {
    const row = series[t];
    // OHLCV: time, open, high, low, close, volume
    return {
      t: new Date(t + "Z").toISOString(),
      o: Number(row["1. open"]),
      h: Number(row["2. high"]),
      l: Number(row["3. low"]),
      c: Number(row["4. close"]),
      v: Number(row["5. volume"] || 0)
    };
  });
}

async function fetchStockCandles({ symbol, interval, apiKey }) {
  if (!apiKey) throw new Error("ALPHAVANTAGE_API_KEY missing");

  if (interval === "1day") {
    const { data } = await axios.get(BASE_URL, {
      params: { function: "TIME_SERIES_DAILY", symbol, apikey: apiKey }
    });
    return mapTimeSeriesToCandles(data["Time Series (Daily)"]);
  }

  const timeInterval = "60min";
  const { data } = await axios.get(BASE_URL, {
    params: { function: "TIME_SERIES_INTRADAY", symbol, interval: timeInterval, apikey: apiKey }
  });
  return mapTimeSeriesToCandles(data[`Time Series (${timeInterval})`]);
}

async function fetchGoldCandles({ interval, apiKey }) {
  if (!apiKey) throw new Error("ALPHAVANTAGE_API_KEY missing");

  if (interval === "1day") {
    const { data } = await axios.get(BASE_URL, {
      params: {
        function: "GOLD_SILVER_HISTORY",
        symbol: "XAU",
        interval: "daily",
        apikey: apiKey
      }
    });
    const series = data["data"] || [];
    return series.map((row) => ({
      t: new Date(row["date"]).toISOString(),
      o: Number(row["price"]),
      h: Number(row["price"]),
      l: Number(row["price"]),
      c: Number(row["price"]),
      v: 0
    }));
  }

  // Alpha Vantage does not offer free intraday gold candles; fallback to 1day data.
  const { data } = await axios.get(BASE_URL, {
    params: {
      function: "GOLD_SILVER_HISTORY",
      symbol: "XAU",
      interval: "daily",
      apikey: apiKey
    }
  });
  const series = data["data"] || [];
  return series.map((row) => ({
    t: new Date(row["date"]).toISOString(),
    o: Number(row["price"]),
    h: Number(row["price"]),
    l: Number(row["price"]),
    c: Number(row["price"]),
    v: 0
  }));
}

module.exports = { fetchStockCandles, fetchGoldCandles };
