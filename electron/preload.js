const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Config ──
  config: {
    load: () => ipcRenderer.invoke('config:load'),
    save: (config) => ipcRenderer.invoke('config:save', config),
    checkYtdlp: () => ipcRenderer.invoke('config:check-ytdlp'),
    selectCredentialsFile: () => ipcRenderer.invoke('config:select-credentials-file'),
    getCacheStats: () => ipcRenderer.invoke('config:get-cache-stats'),
    clearCache: () => ipcRenderer.invoke('config:clear-cache'),
    openUrl: (url) => ipcRenderer.invoke('config:open-url', url),
    loadOpenClaw: () => ipcRenderer.invoke('config:load-openclaw'),
    saveOpenClaw: (ocConfig) => ipcRenderer.invoke('config:save-openclaw', ocConfig),
  },

  // ── Projects ──
  projects: {
    load: () => ipcRenderer.invoke('projects:load'),
    add: (projectPath) => ipcRenderer.invoke('projects:add', projectPath),
    remove: (id) => ipcRenderer.invoke('projects:remove', id),
    update: (id, updates) => ipcRenderer.invoke('projects:update', id, updates),
    getById: (id) => ipcRenderer.invoke('projects:get-by-id', id),
    deepScan: (id) => ipcRenderer.invoke('projects:deep-scan', id),
    selectFolder: () => ipcRenderer.invoke('projects:select-folder'),
    openAntigravity: (projectPath) => ipcRenderer.invoke('projects:open-antigravity', projectPath),
    openFinder: (projectPath) => ipcRenderer.invoke('projects:open-finder', projectPath),
    onScannerProgress: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('scanner:progress', handler);
      return () => ipcRenderer.removeListener('scanner:progress', handler);
    },
    onRefresh: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('projects:refresh', handler);
      return () => ipcRenderer.removeListener('projects:refresh', handler);
    },
  },

  // ── Fichas ──
  fichas: {
    load: () => ipcRenderer.invoke('fichas:load'),
    save: (ficha) => ipcRenderer.invoke('fichas:save', ficha),
    delete: (id) => ipcRenderer.invoke('fichas:delete', id),
    selectVideo: () => ipcRenderer.invoke('fichas:select-video'),
    copyVideo: (sourcePath, id) => ipcRenderer.invoke('fichas:copy-video', sourcePath, id),
    analyzeGemini: (fileName) => ipcRenderer.invoke('fichas:analyze-gemini', fileName),
    processTikTokUrl: (url) => ipcRenderer.invoke('fichas:process-tiktok-url', url),
    generateDeepResearch: (id) => ipcRenderer.invoke('fichas:generate-deep', id),
    researchPoint: (point) => ipcRenderer.invoke('fichas:research-point', point),
    startWatcher: (folderPath) => ipcRenderer.invoke('fichas:start-watcher', folderPath),
    stopWatcher: () => ipcRenderer.invoke('fichas:stop-watcher'),
    markOpened: (id) => ipcRenderer.invoke('fichas:mark-opened', id),
    onNewVideoDetected: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('fichas:new-video-detected', handler);
      return () => ipcRenderer.removeListener('fichas:new-video-detected', handler);
    },
    onProcessProgress: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('fichas:process-progress', handler);
      return () => ipcRenderer.removeListener('fichas:process-progress', handler);
    },
  },

  // ── Notes ──
  notes: {
    load: () => ipcRenderer.invoke('notes:load'),
    save: (note) => ipcRenderer.invoke('notes:save', note),
    delete: (id) => ipcRenderer.invoke('notes:delete', id),
  },

  // ── AI ──
  ai: {
    getConfig: () => ipcRenderer.invoke('ai:get-config'),
    saveGeminiConfig: (geminiConfig) => ipcRenderer.invoke('ai:save-gemini-config', geminiConfig),
    testGemini: () => ipcRenderer.invoke('ai:test-gemini'),
    testGroq: () => ipcRenderer.invoke('ai:test-groq'),
    testOpenRouter: () => ipcRenderer.invoke('ai:test-openrouter'),
    testOpenAI: () => ipcRenderer.invoke('ai:test-openai'),
    testHuggingFace: () => ipcRenderer.invoke('ai:test-huggingface'),
    fetchOpenRouterModels: () => ipcRenderer.invoke('ai:fetch-openrouter-models'),
    saveProvider: (provider) => ipcRenderer.invoke('ai:save-provider', provider),
    updateAssignment: (fnName, assignment) => ipcRenderer.invoke('ai:update-assignment', fnName, assignment),
    analyzeVision: (imageB64, prompt) => ipcRenderer.invoke('ai:analyze-vision', imageB64, prompt),
    getUsageStats: () => ipcRenderer.invoke('ai:get-usage-stats')
  },

  system: {
    getLogs: () => ipcRenderer.invoke('system:get-logs'),
    getSystemStatus: () => ipcRenderer.invoke('system:get-system-status'),
    onNotify: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('system:notify', handler);
      return () => ipcRenderer.removeListener('system:notify', handler);
    },
  },

  // ── Notifications ──
  notifications: {
    load: () => ipcRenderer.invoke('notifications:load'),
    save: (notifications) => ipcRenderer.invoke('notifications:save', notifications),
    updateNotes: (id, notes) => ipcRenderer.invoke('notifications:update-notes', id, notes),
  },

  // ── Vision (V5.0) ──
  vision: {
    capture: () => ipcRenderer.invoke('vision:capture'),
  },

  // ── FS ──
  fs: {
    readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path, content) => ipcRenderer.invoke('fs:writeFile', path, content),
  },

  // ── Clawbot ──
  clawbot: {
    syncConfig: (config) => ipcRenderer.invoke('clawbot:sync-config', config),
    getWaStatus: () => ipcRenderer.invoke('clawbot:get-wa-status'),
    onWaStatus: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('clawbot:wa-status', handler);
      return () => ipcRenderer.removeListener('clawbot:wa-status', handler);
    },
    onWaQr: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('clawbot:wa-qr', handler);
      return () => ipcRenderer.removeListener('clawbot:wa-qr', handler);
    }
  },

  // ── Agents / TESS ──
  agents: {
    load: () => ipcRenderer.invoke('agents:load'),
    save: (agentData) => ipcRenderer.invoke('agents:save', agentData),
    delete: (agentId) => ipcRenderer.invoke('agents:delete', agentId),
    chat: (payload) => ipcRenderer.invoke('agents:chat', payload),
    getMemory: (payload) => ipcRenderer.invoke('agents:get-memory', payload),
    clearMemory: (agentId) => ipcRenderer.invoke('agents:clear-memory', agentId),
  },

  // ── Google Workspace (Fase 6) ──
  google: {
    startAuth: () => ipcRenderer.invoke('google:start-auth'),
    getStatus: () => ipcRenderer.invoke('google:get-status'),
    exportFicha: (ficha) => ipcRenderer.invoke('google:export-ficha', ficha),
    findSlots: (data) => ipcRenderer.invoke('google:find-slots', data),
    scheduleLearning: (data) => ipcRenderer.invoke('google:schedule-learning', data),
    syncCalendar: () => ipcRenderer.invoke('google:sync-calendar')
  },

  // ── Tutorial Engine (Fase 7) ──
  tutorials: {
    generate: (fichaId) => ipcRenderer.invoke('tutorials:generate', fichaId),
  },

  // ── Tech Radar (Fase 8) ──
  radar: {
    getAll: () => ipcRenderer.invoke('radar:get-all'),
    updateStatus: (data) => ipcRenderer.invoke('radar:update-status', data),
    triggerScan: () => ipcRenderer.invoke('radar:trigger-scan')
  },

  // ── Skills (Fase 11) ──
  skills: {
    load: () => ipcRenderer.invoke('skills:load'),
    getSuggested: () => ipcRenderer.invoke('skills:get-suggested'),
    triggerScan: () => ipcRenderer.invoke('skills:trigger-scan'),
    delete: (id) => ipcRenderer.invoke('skills:delete', id),
    openFolder: (id) => ipcRenderer.invoke('skills:open-folder', id),
    onNavigateToSuggestions: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('skills:navigate-to-suggestions', handler);
      return () => ipcRenderer.removeListener('skills:navigate-to-suggestions', handler);
    }
  },

  // ── Browsing & Gateway (Fase 16) ──
  browsing: {
    getStatus: () => ipcRenderer.invoke('browsing:get-status'),
    restartGateway: () => ipcRenderer.invoke('browsing:restart-gateway'),
  },

  // ── Generic Event Bridge (Para Telemetría V9+) ──
  on: (channel, callback) => {
    const handler = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  }
});
