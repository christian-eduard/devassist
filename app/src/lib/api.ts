// src/lib/api.ts — API client for DevAssist Cloud backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.noahpro.studio/api";

interface RequestOptions extends RequestInit {
  apiKey?: string;
}

async function request<T = Record<string, unknown>>(path: string, options: RequestOptions = {}): Promise<T> {
  const { apiKey, ...fetchOptions } = options;

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
      ...fetchOptions.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API Error ${res.status}`);
  return data as T;
}

export const api = {
  health: (apiKey: string) => request("/health", { apiKey }),

  submitUrl: (url: string, channel: string, apiKey: string) =>
    request("/fichas", {
      method: "POST",
      body: JSON.stringify({ url, channel }),
      apiKey,
    }),

  getFichas: (apiKey: string, limit = 50) =>
    request<{ ok: boolean; fichas: Ficha[]; count: number }>(`/fichas?limit=${limit}`, { apiKey }),

  getFicha: (id: string, apiKey: string) =>
    request<{ ok: boolean; ficha: Ficha }>(`/fichas/${id}`, { apiKey }),

  deleteFicha: (id: string, apiKey: string) =>
    request(`/fichas/${id}`, { method: "DELETE", apiKey }),

  getJob: (jobId: string, apiKey: string) =>
    request<{ ok: boolean; job: Job }>(`/fichas/jobs/${jobId}`, { apiKey }),

  search: (query: string, limit: number, apiKey: string) =>
    request("/search", {
      method: "POST",
      body: JSON.stringify({ query, limit }),
      apiKey,
    }),
};

// Types
export interface Ficha {
  id: string;
  title: string;
  tl_dr: string;
  channel: string;
  author: string;
  urgency: number;
  content_type: string;
  created_at: string;
  url_original?: string;
  transcripcion?: string;
  manual_uso?: string;
  key_points?: string[];
  tech_stack?: string[];
  metadata?: Record<string, unknown>;
}

export interface Job {
  id: string;
  url: string;
  status: string;
  progress: string;
  ficha_id?: string;
  error?: string;
  created_at: string;
}
