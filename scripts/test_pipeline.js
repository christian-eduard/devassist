const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const url = "https://www.tiktok.com/@alejavirivera/video/7603064928114625814?lang=es-419";
const videosDir = path.join(os.homedir(), '.devassist', 'videos');

async function test() {
    console.log("🚀 Probando yt-dlp con:", url);
    try {
        const { stdout: meta } = await execAsync(
            `yt-dlp --impersonate chrome --no-check-certificates --no-playlist --print "%(title)s|||%(uploader)s" "${url}"`
        );
        console.log("✅ Metadatos:", meta);

        const videoPath = path.join(videosDir, 'test_video.mp4');
        console.log("📥 Descargando video a:", videoPath);
        await execAsync(
            `yt-dlp --impersonate chrome --no-check-certificates -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]" -o "${videoPath}" --no-playlist --max-filesize 100m "${url}"`
        );
        console.log("✅ Descarga completada.");
    } catch (e) {
        console.error("❌ Fallo crítico:", e.message);
    }
}

test();
