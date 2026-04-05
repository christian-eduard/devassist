const path = require('path');
const os = require('os');
const { processTikTokUrl } = require('../electron/ipc/fichas');
const { loadConfig } = require('../electron/ipc/config');

async function runTest() {
    console.log("=== INICIANDO TEST DEL PIPELINE ===");
    try {
        const config = await loadConfig();
        const url = "https://www.tiktok.com/@alejavirivera/video/7603064928114625814?lang=es-419";
        
        console.log("Cargando config. Model asignado a vault-transcribe:", config.aiAssignments?.['vault-transcribe']?.model);
        
        // El cuarto argumento es _event. Pasaremos null o un event mockeado con reply.
        const mockEvent = {
            reply: (eventName, data) => {
                console.log(`[Event Reply: ${eventName}]`, data);
            }
        };

        const result = await processTikTokUrl(url, config, {}, mockEvent);
        console.log("=== TEST COMPLETADO CON ÉXITO ===");
        console.log("Resultado final ficha:", JSON.stringify(result, null, 2));

    } catch (err) {
        console.error("=== TEST FALLÓ ===");
        console.error(err);
    }
}

runTest();
