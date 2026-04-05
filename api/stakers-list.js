// api/stakers-list.js — returns all registered stakers for admin panel
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_URL;
  const token = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_TOKEN;

  if (!url || !token) return res.status(200).json({ stakers: [] });

  const { Redis } = require('@upstash/redis');
  const redis = new Redis({ url, token });

  const wallets = await redis.smembers('admin:staker-wallets');
  if (!wallets || wallets.length === 0) {
    return res.status(200).json({ stakers: [] });
  }

  const stakers = await Promise.all(
    wallets.map(w => redis.get('staker:' + w))
  );

  const valid = stakers
    .filter(Boolean)
    .sort((a, b) => (b.stakedCount || 0) - (a.stakedCount || 0));

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ stakers: valid });
};
