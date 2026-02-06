import { request } from "./client";

export function fetchKline({ symbol, asset, interval }) {
  return request(`/market/kline?symbol=${symbol}&asset=${asset}&interval=${interval}`);
}

export function fetchIndicators({ symbol, asset, interval }) {
  return request(`/market/indicators?symbol=${symbol}&asset=${asset}&interval=${interval}`);
}
