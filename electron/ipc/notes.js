const logger = require("./logger");
const fs = require('fs');
const path = require('path');

const NOTES_FILE = 'notes.json';

function loadNotes(dataDir) {
    const filePath = path.join(dataDir, NOTES_FILE);
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    } catch (err) {
        logger.error('[notes:load] Error:', err.message);
    }
    return [];
}

function saveNotes(dataDir, notes) {
    const filePath = path.join(dataDir, NOTES_FILE);
    fs.writeFileSync(filePath, JSON.stringify(notes, null, 2), 'utf-8');
}

module.exports = function registerNotesHandlers(ipcMain, dataDir) {
    ipcMain.handle('notes:load', async () => {
        return loadNotes(dataDir);
    });

    ipcMain.handle('notes:save', async (_event, note) => {
        const notes = loadNotes(dataDir);
        const idx = notes.findIndex((n) => n.id === note.id);
        const now = new Date().toISOString();

        if (idx >= 0) {
            notes[idx] = { ...notes[idx], ...note, updatedAt: now };
        } else {
            notes.push({
                ...note,
                id: note.id || Date.now().toString(),
                createdAt: now,
                updatedAt: now,
                pinned: note.pinned || false,
            });
        }

        saveNotes(dataDir, notes);
        return notes[idx >= 0 ? idx : notes.length - 1];
    });

    ipcMain.handle('notes:delete', async (_event, id) => {
        let notes = loadNotes(dataDir);
        notes = notes.filter((n) => n.id !== id);
        saveNotes(dataDir, notes);
        return { ok: true };
    });
};
