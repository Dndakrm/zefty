// File: worker.js (Cloudflare Workers)
// Route: POST /api/chat
// Env: OPENAI_API_KEY (Secrets)
// Optional: CORS_ORIGIN (comma-separated)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env, request) });
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const body = await request.json();
        const userMsg = String(body?.message || '').slice(0, 2000);
        const dept = String(body?.dept || 'sales');
        const site = body?.site || {};

        const system = [
          'You are Zefty AI, a helpful assistant for Zefty ID (game topup & account marketplace).',
          'Answer briefly (2-6 sentences), use Indonesian unless user uses English.',
          'Never ask for passwords/OTP. If user requests sensitive data, politely refuse.',
          'If asked about order status, request Order ID and explain operating hours.',
          'If asked prices, remind that prices can change; provide examples if not available.',
        ].join(' ');

        const deptNote = dept === 'support' ?
          'Focus on troubleshooting steps and contact options.' :
          dept === 'orders' ? 'Focus on order status flow; ask for Order ID.' :
          'Focus on product availability and pricing guidance.';

        const siteContext = `Brand: ${site.brand||'Zefty ID'}. Currencies: ${(site.currencies||[]).join(', ')||'IDR'}. Hours: ${site.hours||'09.00–22.00 WIB'}. WhatsApp: ${site?.contact?.wa||''}. Email: ${site?.contact?.email||''}.`;

        const payload = {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `${system} ${deptNote} ${siteContext}` },
            { role: 'user', content: userMsg }
          ],
          temperature: 0.3,
        };

        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!r.ok) {
          const errText = await r.text();
          return new Response(JSON.stringify({ error: 'openai_error', detail: errText }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) } });
        }
        const j = await r.json();
        const reply = j?.choices?.[0]?.message?.content || 'Maaf, tidak ada jawaban.';

        return new Response(JSON.stringify({ reply }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) } });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'bad_request', detail: String(e) }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) } });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders(env, request) });
  }
}

function corsHeaders(env, request){
  const origin = request.headers.get('Origin') || '';
  const allow = (env.CORS_ORIGIN || '').split(',').map(s=>s.trim()).filter(Boolean);
  const allowed = allow.length ? (allow.includes(origin) ? origin : allow[0]) : origin || '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

/*
Deployment (Wrangler):
1) wrangler init zefty-chat --yes
2) Put this file as src/worker.js (update package.json main) or index.js
3) Add Routes in wrangler.toml:
   [[routes]]
   pattern = "yourdomain.com/api/chat"
   script = "zefty-chat"
4) Secrets:
   wrangler secret put OPENAI_API_KEY
   (optional) wrangler secret put CORS_ORIGIN  # e.g. https://zeftyid.com
5) wrangler deploy
*/
