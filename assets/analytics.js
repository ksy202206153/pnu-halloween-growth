const config = window.APP_CONFIG;
const uuid = () => crypto.randomUUID();
let session = sessionStorage.getItem('pnu_session') || uuid();
sessionStorage.setItem('pnu_session', session);
let visitor = localStorage.getItem('pnu_visitor');
export const configured = () => Boolean(config.supabaseUrl && config.supabaseAnonKey);
export async function rpc(name, data, token) {
  const headers = {'Content-Type':'application/json', apikey:config.supabaseAnonKey};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${name}`, { method:'POST', headers, body:JSON.stringify(data)});
  if (!res.ok) throw new Error(`서버 요청 실패 (${res.status})`);
  return res.json();
}
let queue = [];
let busy = false;
const stages = new Set();
export function track(name, button = null) {
  if (localStorage.getItem('pnu_consent') !== 'yes') return;
  if (!visitor) { visitor = uuid(); localStorage.setItem('pnu_visitor', visitor); }
  const source = new URLSearchParams(location.search);
  queue.push({id:uuid(), event_id:config.eventId, visitor_id:visitor, session_id:session, name, button, path:location.pathname, utm_source:(source.get('utm_source')||'direct').slice(0,80), utm_medium:(source.get('utm_medium')||'').slice(0,80), utm_campaign:(source.get('utm_campaign')||'').slice(0,80)});
  flush();
}
export function stage(name) { if (localStorage.getItem('pnu_consent') === 'yes' && !stages.has(name)) { stages.add(name); track(name); } }
export async function flush() {
  if (busy || !queue.length || !configured()) return;
  busy = true;
  const batch = queue.slice(0,50);
  try { await rpc('collect_events', {p_events:batch}); queue.splice(0,batch.length); }
  catch { /* Retry the same IDs; the database deduplicates accepted batches. */ }
  finally { busy = false; }
}
setInterval(flush, 5000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && configured() && queue.length && localStorage.getItem('pnu_consent') === 'yes') fetch(`${config.supabaseUrl}/rest/v1/rpc/collect_events`, {method:'POST',headers:{'Content-Type':'application/json',apikey:config.supabaseAnonKey},body:JSON.stringify({p_events:queue.slice(0,50)}),keepalive:true}).catch(()=>{}); });
export function resetConsent() { queue=[]; stages.clear(); localStorage.removeItem('pnu_visitor'); visitor=null; }
