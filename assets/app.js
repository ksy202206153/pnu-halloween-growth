import {track,stage,configured,rpc,resetConsent} from './analytics.js';
const $ = s=>document.querySelector(s);
const modal=$('#modal');
const toast=message=>{ $('#toast').textContent=message;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',4000); };
function begin(){stage('page_view'); if (location.hash==='#tickets') stage('event_view');}
$('#consent').hidden=localStorage.getItem('pnu_consent')!==null;
$('#accept').onclick=()=>{localStorage.setItem('pnu_consent','yes');$('#consent').hidden=true;begin();};
$('#decline').onclick=()=>{localStorage.setItem('pnu_consent','no');resetConsent();$('#consent').hidden=true;};
$('#privacy').onclick=()=>{$('#consent').hidden=false;};
begin();
document.addEventListener('click',e=>{const b=e.target.closest('[data-track]');if(b)track('button_click',b.dataset.track);});
new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting)stage('event_view');},{threshold:0.3}).observe($('#tickets'));
$('#start').onclick=()=>{stage('registration_start');$('#modal-body').innerHTML='<p class="eyebrow">JOIN THE NIGHT</p><h2>관심을 남겨주세요.</h2><p>개인정보 없이 익명으로 참여 관심을 등록합니다. 알림 발송이나 입장권 예약은 제공하지 않습니다.</p><label><input type="checkbox" id="interest-check" style="display:inline;width:auto"> 행사 기획 중이며 예약이 아님을 확인했습니다.</label><button class="primary" id="complete" data-track="registration_submit">관심 등록 완료하기 ↗</button><p id="form-status" role="status"></p>';modal.showModal();$('#complete').onclick=async()=>{if(!$('#interest-check').checked){$('#form-status').textContent='안내 내용을 확인해 주세요.';return;}if(!configured()){$('#form-status').textContent='아직 접수 준비 중입니다. Supabase 연결 후 등록할 수 있습니다.';return;}const b=$('#complete');b.disabled=true;try{let id=localStorage.getItem('pnu_interest');if(!id){id=crypto.randomUUID();localStorage.setItem('pnu_interest',id);}await rpc('register_interest',{p_event_id:window.APP_CONFIG.eventId,p_registration_id:id});stage('registration_complete');$('#modal-body').innerHTML='<p class="eyebrow">YOU’RE ON THE LIST</p><h2>관심 등록 완료!</h2><p>함께할 밤을 기대해 주세요. 실제 행사 일정과 참여 방법은 공식 안내를 확인해 주세요.</p><button class="primary" id="done" data-track="registration_done">돌아가기 ↗</button>';$('#done').onclick=()=>modal.close();}catch(err){$('#form-status').textContent=err.message+' 잠시 후 다시 시도해 주세요.';b.disabled=false;}};};
$('.close').onclick=()=>modal.close();
modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
document.querySelectorAll('[data-info]').forEach(b=>b.onclick=()=>{const [title,body]=b.dataset.info.split('|');$('#modal-body').replaceChildren();const h=document.createElement('h2'),p=document.createElement('p');h.textContent=title;p.textContent=body;$('#modal-body').append(h,p);modal.showModal();});
$('#share').onclick=async()=>{const url=new URL(location.href);url.hash='';url.search='utm_source=share&utm_medium=referral&utm_campaign=halloween';try{if(navigator.share)await navigator.share({title:'PNU AFTER DARK',url:url.href});else {await navigator.clipboard.writeText(url.href);toast('공유 링크를 복사했습니다.');}track('share_complete');}catch(err){if(err.name!=='AbortError')toast('주소창의 링크를 복사해 공유해 주세요.');}};
document.querySelectorAll('details').forEach((d,i)=>d.addEventListener('toggle',()=>{if(d.open)track('button_click',`faq_${i+1}`);}));
