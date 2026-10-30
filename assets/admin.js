import {configured,rpc} from './analytics.js';
const $=s=>document.querySelector(s);let token=null,report=null;
// Confirmation redirects can include a session in the fragment. Keep it out of browser history.
if (location.hash) { const p=new URLSearchParams(location.hash.slice(1)); history.replaceState(null,'',location.pathname+location.search); $('#status').textContent=p.has('error')?'인증 링크가 만료되었거나 유효하지 않습니다.':'이메일 인증 후 로그인해 주세요.'; }
$('#signup').onclick=async()=>{
 if (!$('#login-form').reportValidity()) return;
 if (!configured()) { $('#status').textContent='Supabase 연결 설정이 필요합니다.'; return; }
 if ($('#password').value.length<8) { $('#status').textContent='새 비밀번호를 8자 이상으로 설정해 주세요.'; return; }
 const button=$('#signup');button.disabled=true;$('#status').textContent='계정 생성 요청 중…';
 try {
  const redirect=new URL('admin.html',location.href).href;
  const r=await fetch(`${window.APP_CONFIG.supabaseUrl}/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`,{method:'POST',headers:{apikey:window.APP_CONFIG.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({email:$('#email').value.trim(),password:$('#password').value})});
  const data=await r.json();
  if(!r.ok) throw new Error(data.msg||data.message||'계정 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  $('#password').value='';$('#status').textContent='메일함에서 인증 링크를 확인한 뒤, 설정한 비밀번호로 로그인해 주세요. 계정이 이미 있으면 로그인해 주세요.';
 } catch(err) { $('#status').textContent=err.message; }
 finally {button.disabled=false;}
};
$('#login-form').onsubmit=async e=>{e.preventDefault();if(!configured()){$('#status').textContent='Supabase 연결 설정이 필요합니다.';return;}try{const r=await fetch(`${window.APP_CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:window.APP_CONFIG.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({email:$('#email').value,password:$('#password').value})});if(!r.ok)throw new Error('로그인 정보를 확인해 주세요.');token=(await r.json()).access_token;$('#password').value='';await load();}catch(err){$('#status').textContent=err.message;}};
const cell=(row,value)=>{const c=document.createElement('td');c.textContent=value;row.append(c);};
function rows(selector,data){$(selector).replaceChildren();for(const values of data){const row=document.createElement('tr');for(const v of values)cell(row,v);$(selector).append(row);}if(!data.length){const row=document.createElement('tr');cell(row,'수집된 데이터가 없습니다.');$(selector).append(row);}}
async function load(){try{report=await rpc('analytics_report',{p_event_id:window.APP_CONFIG.eventId,p_days:Number($('#days').value)},token);$('#login').hidden=true;$('#report').hidden=false;$('#status').textContent='';const f=report.funnel;$('#metrics').replaceChildren();for(const [name,value]of [['방문 세션',f[0].sessions],['관심 등록',report.registrations],['구매 전환율',`${report.conversion_rate}%`],['검증된 매출',`${Number(report.revenue).toLocaleString()}원`]]){const d=document.createElement('div');d.className='metric';d.textContent=name;const n=document.createElement('strong');n.textContent=value;d.append(n);$('#metrics').append(d);}rows('#funnel',f.map((s,i)=>[s.label,s.sessions,i===f.length-1?'—':s.sessions?`${Math.round((1-f[i+1].sessions/s.sessions)*1000)/10}%`:'—']));rows('#clicks',report.clicks.map(c=>[c.button,c.clicks,c.sessions]));rows('#sources',report.sources.map(s=>[`${s.source} / ${s.medium||'—'} / ${s.campaign||'—'}`,s.sessions]));}catch(err){$('#status').textContent=err.message+' 운영자 권한과 연결 상태를 확인해 주세요.';}}
$('#refresh').onclick=load;$('#days').onchange=load;$('#logout').onclick=()=>{token=null;report=null;$('#report').hidden=true;$('#login').hidden=false;$('#metrics').replaceChildren();};
$('#export').onclick=()=>{if(!report)return;const safe=v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';const lines=[['유형','이름','값'],...report.funnel.map(x=>['퍼널',x.label,x.sessions]),...report.clicks.map(x=>['버튼',x.button,x.clicks]),['구매','전환율',report.conversion_rate],['구매','매출',report.revenue]];const url=URL.createObjectURL(new Blob(['\ufeff'+lines.map(r=>r.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='pnu-analytics.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
