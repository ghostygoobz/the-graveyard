// api/db.js — Single consolidated API handler
// Routes all database operations through one Vercel function
// Usage: /api/db?action=progress-load&wallet=0x...
//        /api/db?action=progress-save  (POST with JSON body)
// etc.

module.exports = async function handler(req, res) {
  const url   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_TOKEN;

  const action = req.query.action;
  if (!action) return res.status(400).json({ error: 'action param required' });

  // ── Helper: get Redis client ──────────────────────────────────────────────
  function getRedis() {
    if (!url || !token) return null;
    const { Redis } = require('@upstash/redis');
    return new Redis({ url, token });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PROGRESS
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'progress-load') {
    if (req.method !== 'GET') return res.status(405).end();
    const redis = getRedis();
    if (!redis) { res.setHeader('Cache-Control','no-store'); return res.status(200).json(null); }
    const { wallet } = req.query;
    if (!wallet) return res.status(400).json({ error: 'wallet required' });
    const record = await redis.get('user:' + wallet.toLowerCase());
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(record || null);
  }

  if (action === 'progress-save') {
    if (req.method !== 'POST') return res.status(405).end();
    const redis = getRedis();
    if (!redis) return res.status(200).json({ ok: true, note: 'storage not configured' });
    const { wallet, data } = req.body;
    if (!wallet) return res.status(400).json({ error: 'wallet required' });
    const key = 'user:' + wallet.toLowerCase();
    const existing = (await redis.get(key)) || {};
    const record = { ...existing, ...data, wallet: wallet.toLowerCase(), updatedAt: Date.now() };
    await redis.set(key, record);
    if (typeof data.myXP === 'number') {
      await redis.zadd('leaderboard', { score: data.myXP, member: wallet.toLowerCase() });
    }
    return res.status(200).json({ ok: true });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LEADERBOARD
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'leaderboard') {
    if (req.method !== 'GET') return res.status(405).end();
    const redis = getRedis();
    if (!redis) return res.status(200).json({ players: [] });
    try {
      const raw = await redis.zrange('leaderboard', 0, 49, { rev: true, withScores: true });
      if (!raw || raw.length === 0) return res.status(200).json({ players: [] });
      const entries = [];
      if (raw[0] && typeof raw[0] === 'object' && 'member' in raw[0]) {
        entries.push(...raw);
      } else {
        for (let i = 0; i + 1 < raw.length; i += 2) {
          entries.push({ member: raw[i], score: Number(raw[i + 1]) });
        }
      }
      const players = await Promise.all(entries.map(async ({ member, score }) => {
        const profile = (await redis.get('user:' + member)) || {};
        return {
          addr: member,
          shortAddr: member.slice(0,6) + '...' + member.slice(-4),
          username:  profile.username     || '',
          avatarB64: profile.avatarB64    || '',
          xp:        score,
          quests:    profile.myQuestsDone || 0,
        };
      }));
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      return res.status(200).json({ players });
    } catch(err) {
      console.error('[leaderboard]', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // QUESTS
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'quests-load') {
    if (req.method !== 'GET') return res.status(405).end();
    const redis = getRedis();
    if (!redis) { res.setHeader('Cache-Control','no-store'); return res.status(200).json(null); }
    const data = await redis.get('admin:quests');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data || null);
  }

  if (action === 'quests-save') {
    if (req.method !== 'POST') return res.status(405).end();
    const redis = getRedis();
    if (!redis) return res.status(200).json({ ok: true, note: 'storage not configured' });
    const { quests, config } = req.body;
    if (!quests) return res.status(400).json({ error: 'quests required' });
    await redis.set('admin:quests', { quests, config, updatedAt: Date.now() });
    return res.status(200).json({ ok: true });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SHOP
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'shop-load') {
    if (req.method !== 'GET') return res.status(405).end();
    const redis = getRedis();
    if (!redis) { res.setHeader('Cache-Control','no-store'); return res.status(200).json(null); }
    const data = await redis.get('admin:shop');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data || null);
  }

  if (action === 'shop-save') {
    if (req.method !== 'POST') return res.status(405).end();
    const redis = getRedis();
    if (!redis) return res.status(200).json({ ok: true, note: 'storage not configured' });
    const { shopItems, nextShopId } = req.body;
    if (!shopItems) return res.status(400).json({ error: 'shopItems required' });
    await redis.set('admin:shop', { shopItems, nextShopId, updatedAt: Date.now() });
    return res.status(200).json({ ok: true });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SUBMISSIONS
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'submissions-load') {
    if (req.method !== 'GET') return res.status(405).end();
    const redis = getRedis();
    if (!redis) { res.setHeader('Cache-Control','no-store'); return res.status(200).json(null); }
    const data = await redis.get('admin:submissions');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data || null);
  }

  if (action === 'submissions-save') {
    if (req.method !== 'POST') return res.status(405).end();
    const redis = getRedis();
    if (!redis) return res.status(200).json({ ok: true, note: 'storage not configured' });
    const { submissions, nextSubmissionId } = req.body;
    if (!submissions) return res.status(400).json({ error: 'submissions required' });
    await redis.set('admin:submissions', { submissions, nextSubmissionId, updatedAt: Date.now() });
    return res.status(200).json({ ok: true });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BONUS SKLZ
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'bonus-grant') {
    if (req.method !== 'POST') return res.status(405).end();
    const redis = getRedis();
    if (!redis) return res.status(200).json({ ok: true, note: 'storage not configured' });
    const { wallet, amount, reason } = req.body;
    if (!wallet || !amount) return res.status(400).json({ error: 'wallet and amount required' });
    const key = 'user:' + wallet.toLowerCase();
    const existing = (await redis.get(key)) || {};
    await redis.set(key, { ...existing, wallet: wallet.toLowerCase(), questSKLZ: (existing.questSKLZ || 0) + parseInt(amount), updatedAt: Date.now() });
    const history = (await redis.get('admin:bonus-history')) || { grants: [] };
    history.grants.push({ wallet: wallet.toLowerCase(), amount: parseInt(amount), reason: reason || 'Admin bonus', grantedAt: new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) });
    if (history.grants.length > 100) history.grants = history.grants.slice(-100);
    await redis.set('admin:bonus-history', history);
    return res.status(200).json({ ok: true });
  }

  if (action === 'bonus-history') {
    if (req.method !== 'GET') return res.status(405).end();
    const redis = getRedis();
    if (!redis) return res.status(200).json({ grants: [] });
    const history = (await redis.get('admin:bonus-history')) || { grants: [] };
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(history);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STAKERS
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'stakers-update') {
    if (req.method !== 'POST') return res.status(405).end();
    const redis = getRedis();
    if (!redis) return res.status(200).json({ ok: true, note: 'storage not configured' });
    const { wallet, shortAddr, username, stakedCount, stakedTokenIds, lastSeen } = req.body;
    if (!wallet) return res.status(400).json({ error: 'wallet required' });
    await redis.set('staker:' + wallet.toLowerCase(), { wallet: wallet.toLowerCase(), shortAddr, username, stakedCount, stakedTokenIds, lastSeen, updatedAt: Date.now() });
    await redis.sadd('admin:staker-wallets', wallet.toLowerCase());
    return res.status(200).json({ ok: true });
  }

  if (action === 'stakers-list') {
    if (req.method !== 'GET') return res.status(405).end();
    const redis = getRedis();
    if (!redis) return res.status(200).json({ stakers: [] });
    const wallets = await redis.smembers('admin:staker-wallets');
    if (!wallets || wallets.length === 0) return res.status(200).json({ stakers: [] });
    const stakers = (await Promise.all(wallets.map(w => redis.get('staker:' + w))))
      .filter(Boolean)
      .sort((a, b) => (b.stakedCount || 0) - (a.stakedCount || 0));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ stakers });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NFTs (OpenSea proxy)
  // ══════════════════════════════════════════════════════════════════════════
  if (action === 'nfts') {
    if (req.method !== 'GET') return res.status(405).end();
    const apiKey = process.env.OPENSEA_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENSEA_API_KEY not configured' });
    const { wallet: w, contract } = req.query;
    if (!w || !contract) return res.status(400).json({ error: 'wallet and contract required' });
    const upstream = await fetch(`https://api.opensea.io/api/v2/chain/apechain/account/${w}/nfts?contract=${contract}&limit=200`, {
      headers: { 'accept': 'application/json', 'x-api-key': apiKey }
    });
    if (!upstream.ok) return res.status(upstream.status).json({ error: await upstream.text() });
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data);
  }

  return res.status(400).json({ error: 'unknown action: ' + action });
};
