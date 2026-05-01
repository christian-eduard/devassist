import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { TextEncoder, TextDecoder } from 'util';

// Mock de Electron API
window.electronAPI = {
    system: {
        getSystemStatus: jest.fn().mockResolvedValue({ status: 'online', ai: 'online' }),
        onNotify: jest.fn().mockReturnValue(() => { }),
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
