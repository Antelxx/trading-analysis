const axios = require("axios");

const BASE_URL = "https://api.twelvedata.com";

function mapValuesToCandles(values) {
  const items = Array.isArray(values) ? values : [];
  const normalized = items.map((row) => {
    let dt = row.datetime || row.date;
    if (!dt.endsWith("Z")) {
      dt = dt.replace(" ", "T") + "Z";
    }
    return {
      t: new Date(dt).toISOString(),
      o: Number(row.open),
      h: Number(row.high),
      l: Number(row.low),
      c: Number(row.close),
      v: Number(row.volume || 0)
    };
  });
  // API often returns newest first; sort ascending by time
  return normalized.sort((a, b) => new Date(a.t) - new Date(b.t));
}

async function fetchTimeSeries({ symbol, interval, apiKey, outputsize = 300 }) {
  if (!apiKey) throw new Error("TWELVEDATA_API_KEY missing");

  const { data } = await axios.get(`${BASE_URL}/time_series`, {
    params: {
      symbol,
      interval,
      outputsize,
      timezone: "UTC",
      apikey: apiKey
    },
    timeout: 20000
  });

  if (data && data.status === "error") {
    throw new Error(data.message || "twelvedata error");
  }

  return mapValuesToCandles(data?.values);
}

async function searchSymbol({ query, apiKey }) {
  if (!apiKey) throw new Error("TWELVEDATA_API_KEY missing");
  const { data } = await axios.get(`${BASE_URL}/symbol_search`, {
    params: { symbol: query, apikey: apiKey },
    timeout: 20000
  });
  if (data && data.status === "error") {
    throw new Error(data.message || "twelvedata error");
  }
  return data?.data || [];
}

module.exports = { fetchTimeSeries, searchSymbol };
