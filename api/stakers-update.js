// api/stakers-update.js — registers a wallet's current staking state
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_URL;
  const token = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_TOKEN;

  if (!url || !token) return res.status(200).json({ ok: true, note: 'storage not configured' });

  const { Redis } = require('@upstash/redis');
  const redis = new Redis({ url, token });

  const { wallet, shortAddr, username, stakedCount, stakedTokenIds, lastSeen } = req.body;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  const key = 'staker:' + wallet.toLowerCase();
  await redis.set(key, {
    wallet: wallet.toLowerCase(),
    shortAddr,
    username,
    stakedCount,
    stakedTokenIds,
    lastSeen,
    updatedAt: Date.now(),
  });

  // Keep a set of all known staker wallet keys
  await redis.sadd('admin:staker-wallets', wallet.toLowerCase());

  res.status(200).json({ ok: true });
};
