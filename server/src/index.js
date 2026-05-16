const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const { initDatabase } = require('./db/connection');
const { apiKeyAuth } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

// Routes
const fichasRouter = require('./routes/fichas');
const searchRouter = require('./routes/search');
const healthRouter = require('./routes/health');
const aiRouter = require('./routes/ai');
const projectsRouter = require('./routes/projects');
const agentsRouter = require('./routes/agents');
const graphifyRouter = require('./routes/graphify');

const app = express();

// ── Global Middleware ──
app.use(helmet({
    contentSecurityPolicy: false,  // Disabled: Graphify HTMLs use inline scripts + CDN
    crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: config.isDev ? '*' : ['https://noahpro.studio', 'https://www.noahpro.studio', 'https://api.noahpro.studio'] }));
app.use(express.json({ limit: '50mb' }));

// Serve uploaded files (videos + graphify reports) as static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        logger.info({
            method: req.method,
            path: req.path,
            status: res.statusCode,
            ms: Date.now() - start,
        }, 'request');
    });
    next();
});

// ── Routes ──
app.use('/api/health', healthRouter);                    // Public
app.use('/api/fichas', apiKeyAuth, fichasRouter);        // Protected
app.use('/api/search', apiKeyAuth, searchRouter);        // Protected
app.use('/api/ai', apiKeyAuth, aiRouter);                // Protected
app.use('/api/projects', apiKeyAuth, projectsRouter);    // Protected
app.use('/api/agents', apiKeyAuth, agentsRouter);        // Protected
app.use('/api/graphify', apiKeyAuth, graphifyRouter);    // Protected

// ── Error Handler ──
app.use(errorHandler);

// ── Bootstrap ──
async function start() {
    try {
        // Initialize database (create tables if needed)
        await initDatabase();

        app.listen(config.port, () => {
            logger.info({
                port: config.port,
                env: config.env,
            }, '🚀 DevAssist Cloud Server running');
        });
    } catch (err) {
        logger.fatal({ err }, 'Failed to start server');
        process.exit(1);
    }
}

start();
