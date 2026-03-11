const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Config ──
  config: {
    load: () => ipcRenderer.invoke('config:load'),
    save: (config) => ipcRenderer.invoke('config:save', config),
    checkClawbot: () => ipcRenderer.invoke('config:check-clawbot'),
    checkYtdlp: () => ipcRenderer.invoke('config:check-ytdlp'),
    openClawbotSite: () => ipcRenderer.invoke('config:open-clawbot-site'),
    installSkillClawbot: () => ipcRenderer.invoke('config:install-skill-clawbot'),
    selectCredentialsFile: () => ipcRenderer.invoke('config:select-credentials-file'),
    getCacheStats: () => ipcRenderer.invoke('config:get-cache-stats'),
    clearCache: () => ipcRenderer.invoke('config:clear-cache'),
    openUrl: (url) => ipcRenderer.invoke('config:open-url', url),
    getOpenClawAi: () => ipcRenderer.invoke('config:get-openclaw-ai'),
    saveOpenClawAi: (updates) => ipcRenderer.invoke('config:save-openclaw-ai', updates),
  },

  // ── Projects ──
  projects: {
    load: () => ipcRenderer.invoke('projects:load'),
    add: (projectPath) => ipcRenderer.invoke('projects:add', projectPath),
    remove: (id) => ipcRenderer.invoke('projects:remove', id),
    update: (id, updates) => ipcRenderer.invoke('projects:update', id, updates),
    selectFolder: () => ipcRenderer.invoke('projects:select-folder'),
    openAntigravity: (projectPath) => ipcRenderer.invoke('projects:open-antigravity', projectPath),
    openFinder: (projectPath) => ipcRenderer.invoke('projects:open-finder', projectPath),
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
    onNewVideoDetected: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('fichas:new-video-detected', handler);
      return () => ipcRenderer.removeListener('fichas:new-video-detected', handler);
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
    testElevenLabs: () => ipcRenderer.invoke('ai:test-elevenlabs'),
    synthesizeSpeech: (text, voiceId) => ipcRenderer.invoke('ai:synthesize-speech', text, voiceId),
    fetchOpenRouterModels: () => ipcRenderer.invoke('ai:fetch-openrouter-models'),
    saveProvider: (provider) => ipcRenderer.invoke('ai:save-provider', provider),
    updateAssignment: (fnName, assignment) => ipcRenderer.invoke('ai:update-assignment', fnName, assignment),
    transcribeAudio: (buffer) => ipcRenderer.invoke('ai:transcribe-audio', buffer),
    analyzeVision: (imageB64, prompt) => ipcRenderer.invoke('ai:analyze-vision', imageB64, prompt),
    liveChat: (bufferB64) => ipcRenderer.invoke('ai:live-chat', bufferB64)
  },

  // ── Clawbot ──
  clawbot: {
    telegramStart: (token) => ipcRenderer.invoke('clawbot:telegram-start', token),
    telegramStop: () => ipcRenderer.invoke('clawbot:telegram-stop'),
    telegramTest: (token) => ipcRenderer.invoke('clawbot:telegram-test', token),

    whatsappStart: (groupName) => ipcRenderer.invoke('clawbot:whatsapp-start', groupName),
    whatsappStop: () => ipcRenderer.invoke('clawbot:whatsapp-stop'),
    whatsappGroups: () => ipcRenderer.invoke('clawbot:whatsapp-groups'),
    getWAStatus: () => ipcRenderer.invoke('clawbot:wa-status'),

    getHistory: () => ipcRenderer.invoke('clawbot:get-history'),
    getStats: () => ipcRenderer.invoke('clawbot:get-stats'),
    clearHistory: () => ipcRenderer.invoke('clawbot:clear-history'),

    getSkills: () => ipcRenderer.invoke('clawbot:get-skills'),
    saveSkill: (skill) => ipcRenderer.invoke('clawbot:save-skill', skill),
    deleteSkill: (name) => ipcRenderer.invoke('clawbot:delete-skill', name),
    getLogs: () => ipcRenderer.invoke('clawbot:get-logs'),
    getSystemStatus: () => ipcRenderer.invoke('clawbot:get-system-status'),
    restartVoice: () => ipcRenderer.invoke('clawbot:restart-voice'),
    sendCommand: (text) => ipcRenderer.invoke('clawbot:send-command', text),

    // Event listeners
    onTelegramLinked: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('clawbot:telegram-linked', handler);
      return () => ipcRenderer.removeListener('clawbot:telegram-linked', handler);
    },
    onWhatsappQr: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('clawbot:whatsapp-qr', handler);
      return () => ipcRenderer.removeListener('clawbot:whatsapp-qr', handler);
    },
    onWhatsappReady: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('clawbot:whatsapp-ready', handler);
      return () => ipcRenderer.removeListener('clawbot:whatsapp-ready', handler);
    },
    onMessageReceived: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('clawbot:message-received', handler);
      return () => ipcRenderer.removeListener('clawbot:message-received', handler);
    },
    onMessageSent: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('clawbot:message-sent', handler);
      return () => ipcRenderer.removeListener('clawbot:message-sent', handler);
    },
    onNewVideo: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('clawbot:new-video', handler);
      return () => ipcRenderer.removeListener('clawbot:new-video', handler);
    },
    onProjectEvent: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('clawbot:project-event', handler);
      return () => ipcRenderer.removeListener('clawbot:project-event', handler);
    },
    onTikTokProcessing: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('clawbot:tiktok-processing', handler);
      return () => ipcRenderer.removeListener('clawbot:tiktok-processing', handler);
    },
    onFichaCreated: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('clawbot:ficha-created', handler);
      return () => ipcRenderer.removeListener('clawbot:ficha-created', handler);
    },
    onStatus: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('clawbot:status', handler);
      return () => ipcRenderer.removeListener('clawbot:status', handler);
    },
    onNotify: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('vectron:notify', handler);
      return () => ipcRenderer.removeListener('vectron:notify', handler);
    },
    onError: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('clawbot:error', handler);
      return () => ipcRenderer.removeListener('clawbot:error', handler);
    },
    onResponseChunk: (callback) => {
      const handler = (_event, data) => callback(data);
      ipcRenderer.on('clawbot:response-chunk', handler);
      return () => ipcRenderer.removeListener('clawbot:response-chunk', handler);
    },
  },

  // ── Notifications ──
  notifications: {
    save: (notifications) => ipcRenderer.invoke('notifications:save', notifications),
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

  // ── Agents ──
  agents: {
    getAll: () => ipcRenderer.invoke('agents:get-all'),
    toggle: (agentId) => ipcRenderer.invoke('agents:toggle', agentId),
    updateConfig: (agentId, config) => ipcRenderer.invoke('agents:update-config', { agentId, config }),
    getLogs: (agentId) => ipcRenderer.invoke('agents:get-logs', agentId),
    restart: (agentId) => ipcRenderer.invoke('agents:restart', agentId),
  },
});
