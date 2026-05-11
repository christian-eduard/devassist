// src/utils/logger.js — Structured logging with Pino
const pino = require('pino');
const config = require('../config');

const logger = pino({
    level: config.isDev ? 'debug' : 'info',
    transport: config.isDev
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined,
});

module.exports = logger;
