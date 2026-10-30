import {test} from 'node:test';
import assert from 'node:assert/strict';
const storage = () => {const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
globalThis.localStorage=storage();globalThis.sessionStorage=storage();
globalThis.window={APP_CONFIG:{supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'public-test-key',eventId:'pnu-halloween-2026'}};
globalThis.location={search:'?utm_source=instagram&utm_campaign=halloween',pathname:'/'};
globalThis.document={addEventListener(){}};
const realInterval=globalThis.setInterval;globalThis.setInterval=()=>0;
let calls=[];let fail=false;
globalThis.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:!fail,status:503,json:async()=>({ok:true})};};
const analytics=await import('./analytics.js');globalThis.setInterval=realInterval;
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('consent gate, stage deduplication, retry IDs and consent withdrawal',async()=>{
 analytics.stage('page_view');await settle();assert.equal(calls.length,0);
 localStorage.setItem('pnu_consent','yes');analytics.stage('page_view');await settle();analytics.stage('page_view');await settle();assert.equal(calls.length,1);assert.equal(calls[0].p_events[0].utm_source,'instagram');
 fail=true;analytics.track('button_click','hero_ticket');await settle();const failedId=calls.at(-1).p_events[0].id;fail=false;await analytics.flush();assert.equal(calls.at(-1).p_events[0].id,failedId);
 fail=true;analytics.track('button_click','share');await settle();localStorage.setItem('pnu_consent','no');analytics.resetConsent();const before=calls.length;await analytics.flush();assert.equal(calls.length,before);assert.equal(localStorage.getItem('pnu_visitor'),null);
});
