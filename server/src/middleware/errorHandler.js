// src/middleware/errorHandler.js — Centralized error handling
const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
    logger.error({ err: err.message, stack: err.stack, path: req.path }, 'Unhandled error');

    const status = err.status || 500;
    res.status(status).json({
        ok: false,
        error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
    });
}

module.exports = { errorHandler };
