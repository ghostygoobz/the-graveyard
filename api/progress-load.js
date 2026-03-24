// api/progress-load.js
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // If Upstash isn't connected yet, return null silently
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(null);
  }

  const { Redis } = require('@upstash/redis');
  const redis = Redis.fromEnv();

  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  const key = 'user:' + wallet.toLowerCase();
  const record = await redis.get(key);

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(record || null);
};
