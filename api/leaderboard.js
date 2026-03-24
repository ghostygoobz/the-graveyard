// api/leaderboard.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Get top 50 by XP descending
  const entries = await redis.zrange('leaderboard', 0, 49, {
    rev: true,
    withScores: true,
  });

  if (!entries || entries.length === 0) {
    return res.status(200).json({ players: [] });
  }

  // entries: [{ member, score }, ...]
  const players = await Promise.all(
    entries.map(async ({ member, score }) => {
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
}
