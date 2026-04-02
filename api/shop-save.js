// api/shop-save.js — saves admin-defined shop items
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_URL;
  const token = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_TOKEN;

  if (!url || !token) return res.status(200).json({ ok: true, note: 'storage not configured' });

  const { Redis } = require('@upstash/redis');
  const redis = new Redis({ url, token });

  const { shopItems, nextShopId } = req.body;
  if (!shopItems) return res.status(400).json({ error: 'shopItems required' });

  await redis.set('admin:shop', { shopItems, nextShopId, updatedAt: Date.now() });
  res.status(200).json({ ok: true });
};
