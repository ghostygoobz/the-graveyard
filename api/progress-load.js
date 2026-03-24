// api/progress-load.js
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const url   = process.env.KV_REST_API_URL
             || process.env.UPSTASH_REDIS_REST_URL
             || process.env.STORAGE_URL
             || process.env.KV_URL;

  const token = process.env.KV_REST_API_TOKEN
             || process.env.UPSTASH_REDIS_REST_TOKEN
             || process.env.STORAGE_TOKEN
             || process.env.KV_REST_API_READ_ONLY_TOKEN;

  if (!url || !token) {
    console.log('[progress-load] No storage env vars found. Available:', Object.keys(process.env).filter(k => k.includes('KV') || k.includes('REDIS') || k.includes('STORAGE') || k.includes('UPSTASH')));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(null);
  }

  const { Redis } = require('@upstash/redis');
  const redis = new Redis({ url, token });

  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  const record = await redis.get('user:' + wallet.toLowerCase());

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(record || null);
};
