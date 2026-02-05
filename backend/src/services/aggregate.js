function aggregateCandles(candles, interval) {
  if (interval === "1h" || interval === "1day") return candles;
  const size = interval === "4h" ? 4 : 24;
  const out = [];

  for (let i = 0; i < candles.length; i += size) {
    const chunk = candles.slice(i, i + size);
    if (chunk.length === 0) continue;

    const o = chunk[0].o;
    const c = chunk[chunk.length - 1].c;
    const h = Math.max(...chunk.map((x) => x.h));
    const l = Math.min(...chunk.map((x) => x.l));
    const v = chunk.reduce((sum, x) => sum + (x.v || 0), 0);
    const t = chunk[0].t;

    out.push({ t, o, h, l, c, v });
  }

  return out;
}

module.exports = { aggregateCandles };
