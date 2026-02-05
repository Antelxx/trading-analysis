import { request } from "./client";

export function fetchRules({ symbol, asset, interval }) {
  return request(`/analysis/rules?symbol=${symbol}&asset=${asset}&interval=${interval}`);
}

export function fetchAi({ symbol, asset, interval }) {
  return request(`/analysis/ai?symbol=${symbol}&asset=${asset}&interval=${interval}`);
}
