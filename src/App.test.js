import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { TextEncoder, TextDecoder } from 'util';

// Mock de Electron API
window.electronAPI = {
    clawbot: {
        sendCommand: jest.fn(),
        getSystemStatus: jest.fn().mockResolvedValue({ gateway: 'online', ai: 'online' }),
        onResponseChunk: jest.fn().mockReturnValue(() => { }),
        onMessageSent: jest.fn().mockReturnValue(() => { }),
        onNotify: jest.fn().mockReturnValue(() => { }),
        onNewVideo: jest.fn().mockReturnValue(() => { }),
        onProjectEvent: jest.fn().mockReturnValue(() => { }),
        onFichaCreated: jest.fn().mockReturnValue(() => { }),
        abortResponse: jest.fn(),
    },
    notifications: {
        load: jest.fn().mockResolvedValue([]),
        save: jest.fn(),
    },
    ai: {
        transcribeAudio: jest.fn(),
        synthesizeSpeech: jest.fn(),
    },
    fs: {
        readFile: jest.fn().mockResolvedValue('{}'),
    }
};


test('App renders without crashing', () => {
    const div = document.createElement('div');
    const root = createRoot(div);
    root.render(<App />);
    root.unmount();
});
