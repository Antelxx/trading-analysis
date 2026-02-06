import { request } from "./client";

export function fetchAi({ symbol, asset, interval }) {
  return request(`/analysis/ai?symbol=${symbol}&asset=${asset}&interval=${interval}`);
}
