// api/bonus-history.js — returns bonus grant history for admin panel
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_URL;
  const token = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_TOKEN;

  if (!url || !token) return res.status(200).json({ grants: [] });

  const { Redis } = require('@upstash/redis');
  const redis = new Redis({ url, token });

  const history = (await redis.get('admin:bonus-history')) || { grants: [] };
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(history);
};
