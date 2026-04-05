const db = require('../db');

async function loadNotes() {
    return await db.getNotes();
}

module.exports = function registerNotesHandlers(ipcMain) {
    ipcMain.handle('notes:load', async () => {
        return await loadNotes();
    });

    ipcMain.handle('notes:save', async (_event, note) => {
        await db.saveNote(note);
        return { ok: true };
    });

    ipcMain.handle('notes:delete', async (_event, id) => {
        await db.deleteNote(id);
        return { ok: true };
    });
};
