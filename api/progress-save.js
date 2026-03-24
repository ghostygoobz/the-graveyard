// api/progress-save.js
const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

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
