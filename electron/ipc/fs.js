const fs = require('fs');

module.exports = (ipcMain) => {
    ipcMain.handle('fs:readFile', async (event, filePath) => {
        try {
            if (!fs.existsSync(filePath)) {
                console.warn(`[IPC FS] File not found: ${filePath}`);
                return null;
            }
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            console.error(`[IPC FS] Error reading file ${filePath}:`, error.message);
            return null;
        }
    });

    ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
        try {
            fs.writeFileSync(filePath, content, 'utf8');
            return { ok: true };
        } catch (error) {
            console.error(`[IPC FS] Error writing file ${filePath}:`, error);
            throw error;
        }
    });
};
