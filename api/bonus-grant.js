// api/bonus-grant.js — adds bonus SKLZ to a wallet's saved record
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_URL;
  const token = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_TOKEN;

  if (!url || !token) return res.status(200).json({ ok: true, note: 'storage not configured' });

  const { Redis } = require('@upstash/redis');
  const redis = new Redis({ url, token });

  const { wallet, amount, reason } = req.body;
  if (!wallet || !amount) return res.status(400).json({ error: 'wallet and amount required' });

  const key = 'user:' + wallet.toLowerCase();
  const existing = (await redis.get(key)) || {};

  // Add bonus SKLZ to their questSKLZ balance
  const updated = {
    ...existing,
    wallet: wallet.toLowerCase(),
    questSKLZ: (existing.questSKLZ || 0) + parseInt(amount),
    updatedAt: Date.now(),
  };
  await redis.set(key, updated);

  // Log to bonus history
  const historyKey = 'admin:bonus-history';
  const history = (await redis.get(historyKey)) || { grants: [] };
  history.grants.push({
    wallet:    wallet.toLowerCase(),
    amount:    parseInt(amount),
    reason:    reason || 'Admin bonus',
    grantedAt: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  });
  // Keep last 100 grants
  if (history.grants.length > 100) history.grants = history.grants.slice(-100);
  await redis.set(historyKey, history);

  res.status(200).json({ ok: true });
};
