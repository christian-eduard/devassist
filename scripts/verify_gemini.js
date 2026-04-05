const https = require('https');

const apiKey = "AIzaSyBje27YicmFjOx3JYjTeHXmlIG-Xw7PShM";
const prompt = "Dime 'OK' si recibes este mensaje.";

const data = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => { responseBody += chunk; });
    res.on('end', () => {
        console.log("Status:", res.statusCode);
        try {
            const parsed = JSON.parse(responseBody);
            if (res.statusCode === 200) {
                console.log("✅ Gemini dice:", parsed.candidates[0].content.parts[0].text);
            } else {
                console.error("❌ Error API:", parsed.error || parsed);
            }
        } catch (e) {
            console.error("❌ No es JSON:", responseBody.substring(0, 100));
        }
    });
});

req.on('error', (e) => { console.error("❌ Error de red:", e.message); });
req.write(data);
req.end();
