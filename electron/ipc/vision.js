const { desktopCapturer } = require('electron');

function visionHandlers(ipcMain) {
    ipcMain.handle('vision:capture', async () => {
        try {
            const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 1920, height: 1080 } });
            // Por defecto tomamos la primera pantalla/ventana disponible que sea relevante
            const mainSource = sources.find(s => s.name === 'Entire Screen' || s.name === 'Screen 1') || sources[0];

            if (!mainSource) {
                throw new Error('No se detectaron fuentes de captura.');
            }

            return {
                ok: true,
                imageB64: mainSource.thumbnail.toDataURL(),
                name: mainSource.name
            };
        } catch (error) {
            console.error('[Vision IPC] Error capturando pantalla:', error);
            return { ok: false, error: error.message };
        }
    });
}

module.exports = visionHandlers;
