const fs = require('fs');
const os = require('os');
const path = require('path');

const configPath = path.join(os.homedir(), '.devassist', 'config.json');
const voiceDir = path.join(os.homedir(), '.devassist', 'voice');
const targetFile = path.join(voiceDir, 'vectron_clone.wav');

if (!fs.existsSync(voiceDir)) {
    fs.mkdirSync(voiceDir, { recursive: true });
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

async function cloneVoice() {
    // Generate enough audio for a full 15 seconds reference
    const text = 'Señor Chris, soy VECTRON. Estoy operativo y en línea. Preparado para procesamiento local avanzado. Mis sistemas están calibrados, los protocolos de seguridad están activos, y la arquitectura de orquestación neuronal funciona a niveles óptimos. Espero sus instrucciones.';
    const apiKey = config.apiKeys.elevenlabs;
    
    if (!apiKey) {
        console.error('No ElevenLabs API key');
        process.exit(1);
    }
    
    console.log("Generating clone voice directly in MP3...");
    
    // Default format is usually mp3 or standard pcm, let's use mp3 to be safe and use ffmpeg
    const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/LlZr3QuzbW4WrPjgATHG', {
        method: 'POST',
        headers: { 
            'xi-api-key': apiKey, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
    });
    
    if (!res.ok) {
        console.error("Failed", await res.text());
        process.exit(1);
    }
    
    const buffer = await res.arrayBuffer();
    const tempFile = path.join(voiceDir, 'temp.mp3');
    fs.writeFileSync(tempFile, Buffer.from(buffer));
    console.log("Saved temp mp3");
}
cloneVoice();
