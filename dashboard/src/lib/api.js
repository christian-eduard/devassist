// src/lib/api.js — API client with auth support
export const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
    return localStorage.getItem('da_token');
}

async function request(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Use Bearer token for dashboard auth
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
}

export const api = {
    // Auth (public, no token needed for login/register)
    auth: {
        login: (email, password) => fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        }).then(r => r.json()),

        register: (name, email, password) => fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        }).then(r => r.json()),

        me: (token) => fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
        }).then(r => r.json()),

        logout: (token) => fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        }).then(r => r.json()),
    },

    // Health
    health: () => request('/health'),

    // Fichas
    submitUrl: (url, channel = 'app') => request('/fichas', {
        method: 'POST',
        body: JSON.stringify({ url, channel }),
    }),
    getFichas: (limit = 50) => request(`/fichas?limit=${limit}`),
    getFicha: (id) => request(`/fichas/${id}`),
    deleteFicha: (id) => request(`/fichas/${id}`, { method: 'DELETE' }),
    getJob: (jobId) => request(`/fichas/jobs/${jobId}`),

    // Search
    search: (query, limit = 5) => request('/search', {
        method: 'POST',
        body: JSON.stringify({ query, limit }),
    }),

    // AI Config
    getAiConfig: () => request('/ai/config'),
    updateAiConfig: (config) => request('/ai/config', {
        method: 'PATCH',
        body: JSON.stringify(config)
    }),

    // Projects
    getProjects: () => request('/projects'),
    getProject: (id) => request(`/projects/${id}`),
    createProject: (data) => request('/projects', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
    updateProject: (id, data) => request(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    addIdea: (projectId, data) => request(`/projects/${projectId}/ideas`, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    deleteIdea: (projectId, ideaId) => request(`/projects/${projectId}/ideas/${ideaId}`, { method: 'DELETE' }),
    getUnassignedIdeas: () => request('/projects/ideas/unassigned'),
    deleteUnassignedIdea: (ideaId) => request(`/projects/ideas/unassigned/${ideaId}`, { method: 'DELETE' }),
    assignIdea: (data) => request('/projects/ideas/assign', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    linkFicha: (projectId, fichaId) => request(`/projects/${projectId}/fichas`, {
        method: 'POST',
        body: JSON.stringify({ ficha_id: fichaId })
    }),
    unlinkFicha: (projectId, fichaId) => request(`/projects/${projectId}/fichas/${fichaId}`, { method: 'DELETE' }),
    tessAction: (data) => request('/projects/tess-action', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // Agents
    initAgent: () => request('/agents/init', { method: 'POST' }),
    chatAgent: (data) => request('/agents/chat', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    getAgentMemory: (agentId, channel = 'default') => request(`/agents/${agentId}/memory/${channel}`),

    // Graphify
    getAnalyses: () => request('/graphify'),
    submitAnalysis: (url) => request('/graphify', {
        method: 'POST',
        body: JSON.stringify({ url }),
    }),
    getAnalysis: (id) => request(`/graphify/${id}`),
    queryGraph: (id, query) => request(`/graphify/${id}/query?q=${encodeURIComponent(query)}`),

    // GitHub
    getGitHubRepos: () => request('/github/repos'),
    getGitHubProjects: () => request('/github/projects'),
    linkRepo: (projectId, repoUrl, repoName, language) => request('/github/link', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, repo_url: repoUrl, repo_name: repoName, language }),
    }),
    unlinkRepo: (projectId) => request('/github/unlink', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId }),
    }),
};
