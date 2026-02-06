const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000/api";

export async function request(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Request failed");
  }
  return res.json();
}
