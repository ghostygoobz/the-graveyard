// api/leaderboard.js
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // If Upstash isn't connected yet, return empty leaderboard
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return res.status(200).json({ players: [] });
  }

  const { Redis } = require('@upstash/redis');
  const redis = Redis.fromEnv();

  const entries = await redis.zrange('leaderboard', 0, 49, {
    rev: true,
    withScores: true,
  });

  if (!entries || entries.length === 0) {
    return res.status(200).json({ players: [] });
  }

  const players = await Promise.all(
    entries.map(async function(entry) {
      const member  = entry.member;
      const score   = entry.score;
      const profile = (await redis.get('user:' + member)) || {};
      return {
        addr:      member,
        shortAddr: member.slice(0, 6) + '...' + member.slice(-4),
        username:  profile.username  || '',
        avatarB64: profile.avatarB64 || '',
        xp:        score,
        quests:    profile.myQuestsDone || 0,
      };
    })
  );

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  res.status(200).json({ players });
};
