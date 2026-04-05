const https = require('https');

const apiKey = "AIzaSyBje27YicmFjOx3JYjTeHXmlIG-Xw7PShM";
const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models?key=${apiKey}`,
    method: 'GET'
};

const req = https.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => { responseBody += chunk; });
    res.on('end', () => {
        console.log("Status:", res.statusCode);
        try {
            const parsed = JSON.parse(responseBody);
            if (res.statusCode === 200) {
                console.log("✅ Modelos disponibles:", parsed.models.map(m => m.name).join(', '));
            } else {
                console.error("❌ Error API:", JSON.stringify(parsed.error || parsed, null, 2));
            }
        } catch (e) { console.error("❌ No es JSON:", responseBody.substring(0, 100)); }
    });
});

req.on('error', (e) => { console.error("❌ Error de red:", e.message); });
req.end();
