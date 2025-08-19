import { createClient } from 'redis';
import Redis from 'ioredis';

// Client Redis avec le package redis (pour la compatibilité avec certains modules)
const redisClient = createClient({
  url: process.env.REDIS_URI || 'redis://default:10FLlkZJ6ojUJcxnxLRA5qFOSkVDmnnV@redis-12102.c279.us-central1-1.gce.redns.redis-cloud.com:12102'
});

// Client Redis avec ioredis (pour la compatibilité avec d'autres modules)
const ioRedisClient = new Redis(process.env.REDIS_URI || 'redis://default:10FLlkZJ6ojUJcxnxLRA5qFOSkVDmnnV@redis-12102.c279.us-central1-1.gce.redns.redis-cloud.com:12102');

redisClient.on('error', (err) => console.log('Redis Client Error', err));
ioRedisClient.on('error', (err) => console.log('ioRedis Client Error', err));

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis successfully');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
};

export const getRedisClient = () => redisClient;
export const getIoRedisClient = () => ioRedisClient;

export default redisClient;
