// api/nfts.js — Vercel Serverless Function
// Proxies OpenSea API v2 so the API key is never exposed in browser JS.
// Required Vercel Environment Variable: OPENSEA_API_KEY

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet, contract } = req.query;

  if (!wallet || !contract) {
    return res.status(400).json({ error: 'wallet and contract params required' });
  }

  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENSEA_API_KEY not configured' });
  }

  const url = 'https://api.opensea.io/api/v2/chain/apechain/account/' + wallet + '/nfts'
    + '?contract=' + contract + '&limit=200';

  try {
    const upstream = await fetch(url, {
      headers: {
        'accept':    'application/json',
        'x-api-key': apiKey,
      },
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      return res.status(upstream.status).json({ error: body });
    }

    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
