
import { drawSixMonthCalendar, parseISO } from './calendar.js';
import { loadJSON } from './dataLoader.js';

import { Assistant } from './assistant.js';
let assistant;


const state = {
  rooms: {},
  config: {},
  restricted: {
    diwali: ['2025-10-17','2025-11-02'],
    christmas: ['2025-12-19','2026-01-04'],
    monsoon: ['2025-06-09','2025-10-14']
  }
};

async function init(){
  try{
    const [rooms, rules] = await Promise.all([
      loadJSON('data/rooms.json'),
      loadJSON('data/config/rules.json')
    ]);
    rooms.forEach(r => state.rooms[r.id]=r);
    state.config = rules;

    drawSixMonthCalendar(document.getElementById('calendarContainer'), state.restricted);
    fillDropdowns();
    document.getElementById('checkBtn').addEventListener('click', onCheck);
    assistant = new Assistant('assistantOut','micBtn','assistantInput','sendBtn');
  }catch(e){
    document.getElementById('calendarContainer').innerHTML = '<p class="bad">Failed to initialize: '+e.message+'</p>';
  }
}

function fillDropdowns(){
  ['mAdults','mKids','mDepend','tAdults','tKids'].forEach((id,i)=>fill(id,6));
  function fill(id,max){ const s=document.getElementById(id); s.innerHTML=''; for(let i=0;i<=max;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; s.appendChild(o);} }
}

function listRooms(dates){
  const roomLists = document.getElementById('roomLists'); roomLists.innerHTML='';
  // Demo booking map: alternate nights block a few rooms. Replace with real ledger later.
  const bookedMap = {};
  dates.forEach((iso, idx)=>{ bookedMap[iso] = (idx%2===0) ? ['A2','D3'] : ['C7']; });
  dates.forEach(iso=>{
    const all = Object.keys(state.rooms);
    const booked = bookedMap[iso]||[];
    const free = all.filter(id => !booked.includes(id));
    const div = document.createElement('div'); div.className='card';
    const pill = (iso,id) => `<span class='room-pill' data-iso='${iso}' data-id='${id}' title='Click to select'>${id} • ${state.rooms[id]?.block||''} • ${(state.rooms[id]?.ac?'AC':'Non‑AC')}</span>`;
    div.innerHTML = `<h4>${iso}</h4>
      <div><strong>FREE:</strong> ${free.map(id=>pill(iso,id)).join(' ')||'—'}</div>
      <div style='margin-top:6px'><strong>BOOKED:</strong> ${booked.map(id=>`<span class='room-pill'>${id}</span>`).join(' ')||'—'}</div>`;
    roomLists.appendChild(div);
  });
  return bookedMap;
}

function suggestTransfers(dates, bookedMap){
  const res = document.getElementById('result');
  const conflict = dates.some(iso => (bookedMap[iso]||[]).length>0);
  if(!conflict){
    res.innerHTML += `<p class='good'>Great news! Continuous stay available — no room change needed.</p>`;
    return;
  }
  res.innerHTML += `<p class='warn'>Suggestion: consider a split stay (e.g., C7 for the first night, D3 for the second). The Club can move luggage at no charge.</p>`;
}

function onCheck(){
  const from = document.getElementById('fromDate').value;
  const to   = document.getElementById('toDate').value;
  const res  = document.getElementById('result'); res.innerHTML='';
  if(!from || !to){ res.textContent='Please choose a valid date range.'; return; }
  const start = new Date(from), end = new Date(to);
  if(end <= start){ res.textContent='“To” must be after “From”.'; return; }
  const dates=[]; for(let d=new Date(start); d<end; d.setDate(d.getDate()+1)) dates.push(d.toISOString().slice(0,10));
  res.innerHTML = `<p>Searching ${dates.length} night(s)…</p>`;
  const bookedMap = listRooms(dates);
  const total = Object.keys(state.rooms).length;
  const counts = dates.map(iso => ({ free: total - (bookedMap[iso]||[]).length, booked: (bookedMap[iso]||[]).length }));
  const freeMin = Math.min(...counts.map(x=>x.free));
  res.innerHTML += `<p><strong>Availability:</strong> Minimum free rooms across your dates: ${freeMin} of ${total}.</p>`;
  suggestTransfers(dates, bookedMap);
}

init();


// Simple room selection registry
const selection = { rooms: {} };

function toggleRoom(iso, id){
  if(!selection.rooms[iso]) selection.rooms[iso] = new Set();
  if(selection.rooms[iso].has(id)) selection.rooms[iso].delete(id);
  else selection.rooms[iso].add(id);
  document.getElementById('selectionOut').textContent = summarySelection();
}

function summarySelection(){
  const nights = Object.keys(selection.rooms);
  if(!nights.length) return "No rooms selected yet.";
  const parts = nights.sort().map(d => d + ": " + Array.from(selection.rooms[d]).join(", "));
  return parts.join("  •  ");
}

// Delegate clicks for .room-pill
document.body.addEventListener('click', (e)=>{
  const pill = e.target.closest('.room-pill[data-iso][data-id]');
  if(!pill) return;
  toggleRoom(pill.dataset.iso, pill.dataset.id);
});

