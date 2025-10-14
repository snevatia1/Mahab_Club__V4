// Assistant (text + voice). Guides user and pre-fills main app.
const $ = s => document.querySelector(s);
const say = (h, who='assistant') => { const d=document.createElement('div'); d.className='msg '+who; d.innerHTML=h; $('#chat').appendChild(d); d.scrollIntoView(); };
const state = { step:0, data:{ member:{}, dates:{}, prefs:{}, rooms:[], guests:{adults:0,children:0,infants:0,parents:0,temps:0}, bbq:false, veg:0, nonveg:0 } };
let ROOMS=[], POL={}, TAR={}, CAL={}, PROM={};

async function loadData(){
  [ROOMS, POL, TAR, CAL, PROM] = await Promise.all([
    fetch('../data/rooms.json').then(r=>r.json()),
    fetch('../data/policies.json').then(r=>r.json()),
    fetch('../data/tariff.json').then(r=>r.json()),
    fetch('../data/calendar.json').then(r=>r.json()),
    fetch('../data/promotions.json').then(r=>r.json())
  ]);
}
function nightsBetween(ci,co){ const out=[]; let d=dayjs(ci); const e=dayjs(co); while(d.isBefore(e,'day')){ out.push(d.format('YYYY-MM-DD')); d=d.add(1,'day'); } return out; }
function parseDate(s){
  s=s.trim();
  const m1=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m1){ const [_,dd,mm,yyyy]=m1; const d=dayjs(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`); return d.isValid()?d:null; }
  const m2=s.match(/^(\d{1,2})\s+([A-Za-z]{3,})$/);
  if(m2){ const yyyy=dayjs().year(); const d=dayjs(`${m2[1]} ${m2[2]} ${yyyy}`); return d.isValid()?d:null; }
  return null;
}
function quote(ci,co,r){
  const nights = nightsBetween(ci,co);
  const mults = TAR.multipliers||{}; const baseMap = TAR.base?.member||{};
  return nights.reduce((s,ds)=>{
    const dow = dayjs(ds).day();
    const weekend = (POL.auto_calendar?.weekend_days||[5,6]).includes(dow);
    let mult=1; if (weekend) mult*=mults.weekend||1;
    return s + Math.round((baseMap[r.type]||0)*mult);
  },0);
}
function findRooms(ci,co,block,type){
  const rs = ROOMS.filter(x => (!block||x.block===block) && (!type||x.type===type));
  return rs.slice(0,12).map(r => ({room:r, price: quote(ci,co,r)}));
}
function refreshSummary(){
  const d=state.data, g=d.guests||{};
  const lines=[];
  if (d.member?.id || d.member?.name) lines.push(`<tr><th>Member</th><td>${d.member.name||''} ${d.member.id?`(${d.member.id})`:''}</td></tr>`);
  if (d.dates?.ci && d.dates?.co) lines.push(`<tr><th>Stay</th><td>${dayjs(d.dates.ci).format('DD/MM/YYYY')} → ${dayjs(d.dates.co).format('DD/MM/YYYY')} (${nightsBetween(d.dates.ci,d.dates.co).length} nights)</td></tr>`);
  if (d.prefs?.block) lines.push(`<tr><th>Block</th><td>${d.prefs.block}</td></tr>`);
  if (d.prefs?.type)  lines.push(`<tr><th>Room type</th><td>${d.prefs.type}</td></tr>`);
  if (d.rooms?.length) lines.push(`<tr><th>Selected rooms</th><td>${d.rooms.map(x=>x.room.block+' '+x.room.room_no).join(', ')}</td></tr>`);
  lines.push(`<tr><th>Guests</th><td>Adults ${g.adults||0}, Children ${g.children||0}, Infants ${g.infants||0}, Parents ${g.parents||0}, Temps ${g.temps||0}</td></tr>`);
  lines.push(`<tr><th>Meals</th><td>Veg ${d.veg||0}, Non-veg ${d.nonveg||0} ${d.bbq?'• BBQ':''}</td></tr>`);
  $('#sum').innerHTML = `<table class="table">${lines.join('')}</table>`;
}
function onUser(text){
  text=(text||'').trim(); if(!text) return; say(text,'user'); const d=state.data;
  if(state.step===0){ say("What is your check-in date? (DD/MM/YYYY)"); state.step=1; return; }
  if(state.step===1){
    const v=parseDate(text); if(!v){ say("Please type DD/MM/YYYY."); return; }
    d.dates.ci=v.format('YYYY-MM-DD'); refreshSummary(); say("Thanks! And your check-out date? (DD/MM/YYYY)"); state.step=2; return;
  }
  if(state.step===2){
    const v=parseDate(text); if(!v){ say("Please type DD/MM/YYYY."); return; }
    if(v.isBefore(dayjs(d.dates.ci),'day')){ say("Check-out must be after check-in."); return; }
    d.dates.co=v.format('YYYY-MM-DD'); refreshSummary();
    say("Any block preference? (A/B/C/D or 'no')"); state.step=3; return;
  }
  if(state.step===3){
    let b=text.toUpperCase().match(/[ABCD]/)?.[0]||''; d.prefs.block=(text.toLowerCase().includes('no'))?'':b; refreshSummary();
    say("Room type? (single/double/triple/quad or 'any')"); state.step=4; return;
  }
  if(state.step===4){
    const t=text.toLowerCase(); d.prefs.type=(t.includes('any'))?'':(['single','double','triple','quad'].find(x=>t.includes(x))||'');
    const list=findRooms(d.dates.ci,d.dates.co,d.prefs.block,d.prefs.type); d.suggestions=list;
    if(!list.length){ say("No rooms matched. Try another block/type."); return; }
    const opts=list.map((x,i)=> `${i+1}) ${x.room.block} ${x.room.room_no} – ₹${x.price}`).join('<br/>');
    say("Reply with numbers to select (e.g., '1 3 4'):<br/>"+opts); state.step=5; return;
  }
  if(state.step===5){
    const nums=text.match(/\d+/g)||[]; const sel=[]; nums.forEach(n=>{ const i=(Number(n)-1); if(state.data.suggestions[i]) sel.push(state.data.suggestions[i]); });
    if(!sel.length){ say("Please reply with valid numbers (e.g., '1 2')."); return; }
    d.rooms=sel; refreshSummary(); say("Guests per room? Say 'Adults 2, Children 1, Infants 0' (Parents/Temps optional)."); state.step=6; return;
  }
  if(state.step===6){
    const g={adults:0,children:0,infants:0,parents:0,temps:0};
    const map={'adults':'adults','adult':'adults','children':'children','child':'children','infants':'infants','infant':'infants','parents':'parents','parent':'parents','temps':'temps','temp':'temps'};
    text.toLowerCase().split(/[,;]/).forEach(part=>{ const m=part.match(/(\w+)\s+(\d+)/); if(m){ const k=map[m[1]]; if(k) g[k]=Number(m[2]); }});
    d.guests=g; refreshSummary(); say("Meals? say 'Veg X, Non-veg Y'. BBQ? say 'include BBQ' or 'no BBQ'."); state.step=7; return;
  }
  if(state.step===7){
    const vm=text.match(/veg\s+(\d+)/i); if(vm) d.veg=Number(vm[1]);
    const nm=text.match(/non-?veg\s+(\d+)/i); if(nm) d.nonveg=Number(nm[1]);
    if(/include\s+bbq/i.test(text)) d.bbq=true; if(/no\s+bbq/i.test(text)) d.bbq=false;
    refreshSummary(); say("Done. Click ‘Apply to App’ to review and pay."); state.step=8; return;
  }
}
function applyToApp(){
  const d=state.data;
  const payload={ ci:d.dates.ci, co:d.dates.co, items:(d.rooms||[]).map(x=>({room:x.room, guests:d.guests})), prefs:d.prefs, bbq:!!d.bbq, veg:d.veg|0, nonveg:d.nonveg|0 };
  localStorage.setItem('assistantPrefill', JSON.stringify(payload)); location.href='./';
}
function aiAsk(){
  const text=$('#txt').value.trim(); if(!text) return;
  fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({message:text})})
    .then(r=>r.ok?r.json():Promise.reject(r.statusText))
    .then(j=> say(j.reply||'(no reply)'))
    .catch(()=> say('AI not configured (needs serverless proxy).','assistant'));
}
function initSpeech(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR){ $('#status').textContent='Speech not supported in this browser.'; return null; }
  const rec=new SR(); rec.lang='en-IN'; rec.interimResults=false;
  rec.onresult=(ev)=>{ const t=ev.results[0][0].transcript; $('#txt').value=t; onUser(t); };
  rec.onstart=()=> $('#status').textContent='Listening…'; rec.onend=()=> $('#status').textContent='Ready'; return rec;
}
let rec=null; function toggleMic(){ if(!rec){ rec=initSpeech(); if(!rec) return; } try{ rec.start(); }catch(e){} }

document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('btnSend').onclick = ()=>{ const t=$('#txt').value; $('#txt').value=''; onUser(t); };
  document.getElementById('btnMic').onclick = toggleMic;
  document.getElementById('btnReset').onclick = ()=>{ state.step=0; state.data={member:{},dates:{},prefs:{},rooms:[],guests:{adults:0,children:0,infants:0,parents:0,temps:0},bbq:false,veg:0,nonveg:0}; $('#chat').innerHTML=''; $('#sum').innerHTML=''; };
  document.getElementById('btnAI').onclick = aiAsk;
  document.getElementById('btnApply').onclick = applyToApp;
  loadData().then(()=>{ say("Hello! I can plan your booking. Tell me your check-in date (DD/MM/YYYY)."); });
});
