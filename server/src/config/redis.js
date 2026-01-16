import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export function createRedisClient() {
    const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    client.on('error', (err) => {
        console.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
        console.log('Redis client connected');
    });

    return client;
}

// Export a singleton instance
let redisClient = null;

export async function getRedisClient() {
    if (!redisClient) {
        redisClient = createRedisClient();
        await redisClient.connect();
    }
    return redisClient;
}
