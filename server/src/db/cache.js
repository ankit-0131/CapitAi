import { createClient } from 'redis';

let redisClient = null;
let isRedis = false;
const memoryCache = new Map();
const memoryCacheExpirations = new Map();

export async function initCache() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    console.log('Attempting Redis connection to', redisUrl);
    try {
      redisClient = createClient({ url: redisUrl });
      redisClient.on('error', (err) => {
        console.error('Redis client error, using in-memory cache:', err.message);
        isRedis = false;
      });
      await redisClient.connect();
      isRedis = true;
      console.log('Successfully connected to Redis.');
    } catch (err) {
      console.error('Failed to connect to Redis:', err.message);
      console.log('Falling back to In-Memory Caching.');
    }
  } else {
    console.log('No REDIS_URL found. Using In-Memory cache.');
  }
}

export async function get(key) {
  if (isRedis && redisClient) {
    try {
      const val = await redisClient.get(key);
      return val ? JSON.parse(val) : null;
    } catch (err) {
      console.error('Redis get failed:', err.message);
    }
  }

  // Memory cache fallback
  const now = Date.now();
  const expiration = memoryCacheExpirations.get(key);
  if (expiration && now > expiration) {
    memoryCache.delete(key);
    memoryCacheExpirations.delete(key);
    return null;
  }
  const val = memoryCache.get(key);
  return val ? JSON.parse(JSON.stringify(val)) : null;
}

export async function set(key, value, ttlSeconds = 300) {
  const strVal = JSON.stringify(value);
  if (isRedis && redisClient) {
    try {
      await redisClient.set(key, strVal, { EX: ttlSeconds });
      return;
    } catch (err) {
      console.error('Redis set failed:', err.message);
    }
  }

  // Memory cache fallback
  memoryCache.set(key, value);
  memoryCacheExpirations.set(key, Date.now() + (ttlSeconds * 1000));
}

export async function del(key) {
  if (isRedis && redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (err) {
      console.error('Redis del failed:', err.message);
    }
  }

  memoryCache.delete(key);
  memoryCacheExpirations.delete(key);
}

export async function clear() {
  if (isRedis && redisClient) {
    try {
      await redisClient.flushDb();
      return;
    } catch (err) {
      console.error('Redis flush failed:', err.message);
    }
  }

  memoryCache.clear();
  memoryCacheExpirations.clear();
}
