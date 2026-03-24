// api/leaderboard.js
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
    return res.status(200).json({ players: [] });
  }

  const { Redis } = require('@upstash/redis');
  const redis = new Redis({ url, token });

  const entries = await redis.zrange('leaderboard', 0, 49, { rev: true, withScores: true });

  if (!entries || entries.length === 0) {
    return res.status(200).json({ players: [] });
  }

  const players = await Promise.all(
    entries.map(async function(entry) {
      const profile = (await redis.get('user:' + entry.member)) || {};
      return {
        addr:      entry.member,
        shortAddr: entry.member.slice(0, 6) + '...' + entry.member.slice(-4),
        username:  profile.username      || '',
        avatarB64: profile.avatarB64     || '',
        xp:        entry.score,
        quests:    profile.myQuestsDone  || 0,
      };
    })
  );

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  res.status(200).json({ players });
};
