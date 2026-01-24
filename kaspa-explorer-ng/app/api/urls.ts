const DEFAULT_HOST = typeof window === "undefined" ? "umbrel.local" : window.location.hostname;
const DEFAULT_ORIGIN =
  typeof window === "undefined" ? `http://${DEFAULT_HOST}` : window.location.origin;
const DEFAULT_SOCKET_ORIGIN =
  typeof window === "undefined" ? `ws://${DEFAULT_HOST}` : window.location.origin.replace(/^http/, "ws");

const DEFAULT_API_BASE = `${DEFAULT_ORIGIN}/api`;
const DEFAULT_SOCKET_URL = `${DEFAULT_SOCKET_ORIGIN}/ws`;

export const API_BASE = import.meta.env.VITE_KASPA_API_BASE ?? DEFAULT_API_BASE;
export const SOCKET_URL = import.meta.env.VITE_KASPA_SOCKET_URL ?? DEFAULT_SOCKET_URL;

export const apiUrl = (path: string) => {
  const base = API_BASE.replace(/\/$/, "");
  const suffix = path.replace(/^\//, "");
  return `${base}/${suffix}`;
};
