// api/progress-load.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: 'wallet required' });

  const key = 'user:' + wallet.toLowerCase();
  const record = await redis.get(key);

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(record || null);
}
