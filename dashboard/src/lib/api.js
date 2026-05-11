const API_BASE = import.meta.env.VITE_API_URL || '/api';
// Usar clave local por defecto, idealmente debería venir del servidor tras login,
// pero por ahora para dev mantenemos un valor por defecto o la variable de entorno.
const API_KEY = import.meta.env.VITE_API_KEY || 'devassist_prod_api_key_8Hj3kL9mQr5';
async function request(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            ...options.headers,
        },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
}

export const api = {
    health: () => request('/health'),
    submitUrl: (url, channel = 'app') => request('/fichas', {
        method: 'POST',
        body: JSON.stringify({ url, channel }),
    }),
    getFichas: (limit = 50) => request(`/fichas?limit=${limit}`),
    getFicha: (id) => request(`/fichas/${id}`),
    deleteFicha: (id) => request(`/fichas/${id}`, { method: 'DELETE' }),
    getJob: (jobId) => request(`/fichas/jobs/${jobId}`),
    search: (query, limit = 5) => request('/search', {
        method: 'POST',
        body: JSON.stringify({ query, limit }),
    }),
    getAiConfig: () => request('/ai/config'),
    updateAiConfig: (config) => request('/ai/config', {
        method: 'PATCH',
        body: JSON.stringify(config)
    }),
    getProjects: () => request('/projects'),
    getProject: (id) => request(`/projects/${id}`),
    createProject: (data) => request('/projects', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
    initAgent: () => request('/agents/init', { method: 'POST' }),
    chatAgent: (data) => request('/agents/chat', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getAgentMemory: (agentId, channel = 'default') => request(`/agents/${agentId}/memory/${channel}`)
};
