// api/submissions-load.js — loads link submissions queue
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_URL;
  const token = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_TOKEN;

  if (!url || !token) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(null);
  }

  const { Redis } = require('@upstash/redis');
  const redis = new Redis({ url, token });

  const data = await redis.get('admin:submissions');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(data || null);
};
