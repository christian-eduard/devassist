// src/config.js — Single source of truth for all configuration
const { z } = require('zod');

require('dotenv').config();

const envSchema = z.object({
    PORT: z.coerce.number().default(3090),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.coerce.number().default(54325),
    DB_USER: z.string().default('devassist_admin'),
    DB_PASSWORD: z.string().default('devassist_secure_pass'),
    DB_NAME: z.string().default('devassist_cloud'),

    GOOGLE_API_KEY: z.string().min(1, 'GOOGLE_API_KEY is required'),

    JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 chars'),
    API_KEY: z.string().min(10, 'API_KEY must be at least 10 chars'),

    REDIS_HOST: z.string().default('127.0.0.1'),
    REDIS_PORT: z.coerce.number().default(6379),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
}

const config = Object.freeze({
    port: parsed.data.PORT,
    env: parsed.data.NODE_ENV,
    isDev: parsed.data.NODE_ENV === 'development',

    db: {
        host: parsed.data.DB_HOST,
        port: parsed.data.DB_PORT,
        user: parsed.data.DB_USER,
        password: parsed.data.DB_PASSWORD,
        database: parsed.data.DB_NAME,
    },

    gemini: {
        apiKey: parsed.data.GOOGLE_API_KEY,
        model: 'gemini-2.5-flash',
        embeddingModel: 'text-embedding-004',
    },

    auth: {
        jwtSecret: parsed.data.JWT_SECRET,
        apiKey: parsed.data.API_KEY,
    },

    redis: {
        host: parsed.data.REDIS_HOST,
        port: parsed.data.REDIS_PORT,
    },
});

module.exports = config;
