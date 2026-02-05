const axios = require("axios");

const BASE_URL = "https://api.twelvedata.com";

function mapValuesToCandles(values) {
  const items = Array.isArray(values) ? values : [];
  const normalized = items.map((row) => ({
    t: new Date(row.datetime || row.date).toISOString(),
    o: Number(row.open),
    h: Number(row.high),
    l: Number(row.low),
    c: Number(row.close),
    v: Number(row.volume || 0)
  }));
  // API often returns newest first; sort ascending by time
  return normalized.sort((a, b) => new Date(a.t) - new Date(b.t));
}

async function fetchGoldCandles({ interval, apiKey, outputsize = 300 }) {
  if (!apiKey) throw new Error("TWELVEDATA_API_KEY missing");

  const { data } = await axios.get(`${BASE_URL}/time_series`, {
    params: {
      symbol: "XAU/USD",
      interval,
      outputsize,
      apikey: apiKey
    },
    timeout: 20000
  });

  if (data && data.status === "error") {
    throw new Error(data.message || "twelvedata error");
  }

  return mapValuesToCandles(data?.values);
}

module.exports = { fetchGoldCandles };
