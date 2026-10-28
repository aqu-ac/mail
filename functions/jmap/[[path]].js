// Same-origin proxy: mail.aqu.ac/jmap/* -> Stalwart JMAP on the mail server.
// Set JMAP_ORIGIN (for example https://mail.example.com) in the Pages project settings.
export async function onRequest({ request, params, env }) {
  const url = new URL(request.url);
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');
  const target = env.JMAP_ORIGIN + '/jmap/' + path + url.search;
  const h = new Headers();
  for (const k of ['authorization', 'content-type', 'accept']) {
    const v = request.headers.get(k);
    if (v) h.set(k, v);
  }
  const init = { method: request.method, headers: h, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;
  const r = await fetch(target, init);
  const out = new Headers(r.headers);
  out.set('Cache-Control', 'no-store');
  out.delete('set-cookie');
  return new Response(r.body, { status: r.status, headers: out });
}
