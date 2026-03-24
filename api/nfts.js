// api/nfts.js — Vercel Serverless Function
// Proxies OpenSea API v2 so the API key is never exposed in browser JS.
// Deploy alongside index.html in the same Vercel project.
//
// Required Vercel Environment Variable:
//   OPENSEA_API_KEY = your key from https://docs.opensea.io/reference/api-keys

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet, contract } = req.query;

  if (!wallet || !contract) {
    return res.status(400).json({ error: 'wallet and contract params required' });
  }

  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENSEA_API_KEY not configured in Vercel environment variables' });
  }

  // OpenSea v2 — get NFTs by account filtered to our contract on ApeChain
  // Docs: https://docs.opensea.io/reference/get_nfts_by_account
  const url = `https://api.opensea.io/api/v2/chain/apechain/account/${wallet}/nfts`
    + `?contract=${contract}&limit=200`;

  try {
    const upstream = await fetch(url, {
      headers: {
        'accept':    'application/json',
        'x-api-key': apiKey,
      },
    });

    // If OpenSea returns an error, forward it transparently
    if (!upstream.ok) {
      const body = await upstream.text();
      console.error('[nfts] OpenSea error', upstream.status, body);
      return res.status(upstream.status).json({ error: body });
    }

    const data = await upstream.json();

    // Set cache header — cache for 60 seconds to avoid hammering the API
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data);

  } catch (err) {
    console.error('[nfts] Fetch failed:', err);
    return res.status(500).json({ error: err.message });
  }
}
