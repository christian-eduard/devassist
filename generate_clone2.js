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
    const text = 'Soy VECTRON, operando en línea, calibrando sistemas de alta prioridad.';
    const apiKey = config.apiKeys.elevenlabs;
    
    // Download already as pcm
    const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/LlZr3QuzbW4WrPjgATHG', {
        method: 'POST',
        headers: { 
            'xi-api-key': apiKey, 
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
    });
    
    if (!res.ok) {
        process.exit(1);
    }
    
    const buffer = await res.arrayBuffer();
    const tempFile = path.join(voiceDir, 'temp2.mp3');
    fs.writeFileSync(tempFile, Buffer.from(buffer));
    console.log("Saved mp3");
}
cloneVoice();
