// api/progress-save.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Check all possible variable name combinations Vercel might have created
  const url   = process.env.KV_REST_API_URL
             || process.env.UPSTASH_REDIS_REST_URL
             || process.env.STORAGE_URL
             || process.env.KV_URL;

  const token = process.env.KV_REST_API_TOKEN
             || process.env.UPSTASH_REDIS_REST_TOKEN
             || process.env.STORAGE_TOKEN
             || process.env.KV_REST_API_READ_ONLY_TOKEN;

  if (!url || !token) {
    console.log('[progress-save] No storage env vars found. Available:', Object.keys(process.env).filter(k => k.includes('KV') || k.includes('REDIS') || k.includes('STORAGE') || k.includes('UPSTASH')));
    return res.status(200).json({ ok: true, note: 'storage not configured' });
  }

  const { Redis } = require('@upstash/redis');
  const redis = new Redis({ url, token });

  const { wallet, data } = req.body;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  const key = 'user:' + wallet.toLowerCase();
  const existing = (await redis.get(key)) || {};

  const record = { ...existing, ...data, wallet: wallet.toLowerCase(), updatedAt: Date.now() };

  await redis.set(key, record);

  if (typeof data.myXP === 'number') {
    await redis.zadd('leaderboard', { score: data.myXP, member: wallet.toLowerCase() });
  }

  res.status(200).json({ ok: true });
};
