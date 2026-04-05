const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 54325,
  user: 'devassist_admin',
  password: 'devassist_secure_pass',
  database: 'devassist_vault',
});

async function disableInternalClaw() {
  try {
    const res = await pool.query("SELECT value FROM settings WHERE key = 'app_config';");
    let config = res.rows.length > 0 ? res.rows[0].value : {};

    // Disable redundant platform listeners in Electron app (OpenClaw does this now)
    config.clawbot_telegramEnabled = false;
    config.clawbot_whatsappEnabled = false;

    await pool.query("INSERT INTO settings (key, value, updated_at) VALUES ('app_config', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW();", [config]);
    
    console.log('INTERNAL_CLAWBOT_DISABLED (Ready for OpenClaw)');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}

disableInternalClaw();
