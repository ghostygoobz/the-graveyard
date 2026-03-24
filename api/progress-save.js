// api/progress-save.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // If Upstash isn't connected yet, return ok silently
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return res.status(200).json({ ok: true, note: 'storage not configured' });
  }

  const { Redis } = require('@upstash/redis');
  const redis = Redis.fromEnv();

  const { wallet, data } = req.body;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  const key = 'user:' + wallet.toLowerCase();
  const existing = (await redis.get(key)) || {};

  const record = {
    ...existing,
    ...data,
    wallet: wallet.toLowerCase(),
    updatedAt: Date.now(),
  };

  await redis.set(key, record);

  if (typeof data.myXP === 'number') {
    await redis.zadd('leaderboard', { score: data.myXP, member: wallet.toLowerCase() });
  }

  res.status(200).json({ ok: true });
};
