// api/leaderboard.js
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_URL;
  const token = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_TOKEN;

  if (!url || !token) return res.status(200).json({ players: [] });

  try {
    const { Redis } = require('@upstash/redis');
    const redis = new Redis({ url, token });

    // Use ZRANGE with REV and WITHSCORES — returns flat array [member, score, member, score...]
    // We handle both flat array and object array formats for compatibility
    const raw = await redis.zrange('leaderboard', 0, 49, {
      rev: true,
      withScores: true,
    });

    if (!raw || raw.length === 0) {
      return res.status(200).json({ players: [] });
    }

    // Normalise to [{member, score}] regardless of which format Upstash returns
    const entries = [];
    if (raw[0] && typeof raw[0] === 'object' && 'member' in raw[0]) {
      // Object format: [{member, score}, ...]
      entries.push(...raw);
    } else {
      // Flat format: [member, score, member, score, ...]
      for (let i = 0; i + 1 < raw.length; i += 2) {
        entries.push({ member: raw[i], score: Number(raw[i + 1]) });
      }
    }

    const players = await Promise.all(
      entries.map(async function({ member, score }) {
        const profile = (await redis.get('user:' + member)) || {};
        return {
          addr:      member,
          shortAddr: member.slice(0, 6) + '...' + member.slice(-4),
          username:  profile.username     || '',
          avatarB64: profile.avatarB64    || '',
          xp:        score,
          quests:    profile.myQuestsDone || 0,
        };
      })
    );

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ players });

  } catch (err) {
    console.error('[leaderboard] error:', err);
    return res.status(500).json({ error: err.message });
  }
};
