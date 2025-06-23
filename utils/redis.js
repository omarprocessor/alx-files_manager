import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
    });
    this.isConnected = false;
    this.client.on('connect', () => {
      this.isConnected = true;
    });
    this.client.on('end', () => {
      this.isConnected = false;
    });
  }

  isAlive() {
    return this.isConnected;
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, reply) => {
        if (err) return reject(err);
        resolve(reply);
      });
    });
  }

  async set(key, value, duration) {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, 'EX', duration, (err, reply) => {
        if (err) return reject(err);
        resolve(reply);
      });
    });
  }

  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, reply) => {
        if (err) return reject(err);
        resolve(reply);
      });
    });
  }
}

const redisClient = new RedisClient();
export default redisClient; 