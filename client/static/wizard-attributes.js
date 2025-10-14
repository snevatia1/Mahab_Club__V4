let ROOMS=[], POL={}, TAR={}, CAL={}, PROM={};
let FILTER=[], CI=null, CO=null, CART=[];
const $=s=>document.querySelector(s);
function nightsBetween(ci,co){const out=[];let d=dayjs(ci);const e=dayjs(co);while(d.isBefore(e,'day')){out.push(d.format('YYYY-MM-DD'));d=d.add(1,'day');}return out;}
function calMeta(ds){const m=CAL[ds]; if(m) return m; const cfg=POL.auto_calendar||{weekend_days:[5,6],defaults:{season:'regular'}}; const weekend=(cfg.weekend_days||[5,6]).includes(dayjs(ds).day()); return {season:cfg.defaults?.season||'regular', weekend};}
function nightly(type, meta){ let base=TAR.base.member[type]||0; let mult=1; if(meta.weekend) mult*=TAR.multipliers?.weekend||1; if(meta.season && TAR.multipliers?.[meta.season]) mult*=TAR.multipliers[meta.season]; return Math.round(base*mult); }
async function load(){[POL,TAR,ROOMS,CAL,PROM] = await Promise.all([
  fetch('../data/policies.json').then(r=>r.json()),
  fetch('../data/tariff.json').then(r=>r.json()),
  fetch('../data/rooms.json').then(r=>r.json()),
  fetch('../data/calendar.json').then(r=>r.json()),
  fetch('../data/promotions.json').then(r=>r.json())
]);}
function renderMatches(){
  const box=$('#match'); box.innerHTML='';
  if(!FILTER.length){ box.innerHTML='<p class="muted">Choose filters and click “Show matching rooms”.</p>'; return; }
  FILTER.forEach(r=>{
    const row=document.createElement('div'); row.className='room';
    row.innerHTML=`<div class="flex"><strong>${r.block} ${r.room_no}</strong> <span class="badge">${r.type.toUpperCase()}</span> <span class="badge">${r.ac?'AC':'Non-AC'}</span> <span class="badge">${r.view}</span>
    <span class="right"><small>Pick dates below and click Quote & Add</small></span></div>
    <div class="flex">Adults(10+): <select class="gA">${Array.from({length:6},(_,i)=>`<option>${i}</option>`).join('')}</select>
    Children(5–9): <select class="gC">${Array.from({length:6},(_,i)=>`<option>${i}</option>`).join('')}</select>
    Infants(0–4): <select class="gI">${Array.from({length:6},(_,i)=>`<option>${i}</option>`).join('')}</select></div>`;
    row.dataset.room = JSON.stringify(r);
    box.appendChild(row);
  });
}
function renderMonths(){
  const wrap=$('#calendarWrap'); wrap.innerHTML='';
  const months=POL.ui?.months_per_view||6;
  const start=dayjs().startOf('month');
  const chips=$('#monthChips'); chips.innerHTML='';
  for(let i=0;i<months;i++){ const md=start.add(i,'month'); const b=document.createElement('button'); b.className='chip'; b.textContent=md.format('MMM YY'); if(md.format('YYYY-MM')===dayjs().format('YYYY-MM')) b.classList.add('active'); b.onclick=()=>{document.getElementById('mon-'+md.format('YYYY-MM')).scrollIntoView({behavior:'smooth'});}; chips.appendChild(b); }
  for(let i=0;i<months;i++){
    const d=start.add(i,'month'); const title=document.createElement('div'); title.className='monthTitle'; title.id='mon-'+d.format('YYYY-MM'); title.textContent=d.format('MMMM YYYY'); wrap.appendChild(title);
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(s=>{const el=document.createElement('div'); el.className='dow'; el.textContent=s; wrap.appendChild(el);});
    let cur=d.startOf('month').startOf('week'); const end=d.endOf('month').endOf('week');
    while(cur.isBefore(end,'day')){ const cell=document.createElement('div'); cell.className='day'; if([5,6].includes(cur.day())) cell.classList.add('weekend'); cell.dataset.ds=cur.format('YYYY-MM-DD'); cell.innerHTML=`<div>${cur.date()}</div>`; cell.onclick=()=>pick(cell.dataset.ds); wrap.appendChild(cell); cur=cur.add(1,'day');}
  }
  markSel();
}
function pick(ds){
  if(!CI || (CI && CO)){ CI=dayjs(ds); CO=null; }
  else if(dayjs(ds).isBefore(CI,'day')){ CI=dayjs(ds); }
  else { CO=dayjs(ds); }
  $('#lblCI').textContent = CI? CI.format('DD/MM/YYYY') : '—';
  $('#lblCO').textContent = CO? CO.format('DD/MM/YYYY') : '—';
  markSel();
}
function markSel(){
  document.querySelectorAll('.day').forEach(d=> d.classList.remove('sel'));
  if(CI){ const el=document.querySelector(`.day[data-ds="${CI.format('YYYY-MM-DD')}"]`); el && el.classList.add('sel'); }
  if(CO){ const el=document.querySelector(`.day[data-ds="${CO.format('YYYY-MM-DD')}"]`); el && el.classList.add('sel'); }
}
function quoteAndAdd(){
  if(!CI || !CO){ alert('Please pick check-in and check-out.'); return; }
  const nights=nightsBetween(CI,CO);
  document.querySelectorAll('#match .room').forEach((row,idx)=>{
    const r=JSON.parse(row.dataset.room); const A=+row.querySelector('.gA').value||0; const C=+row.querySelector('.gC').value||0; const I=+row.querySelector('.gI').value||0;
    if (A||C||I){ // only add rooms where user set at least someone
      const price = nights.reduce((s,ds)=> s + nightly(r.type, calMeta(ds)), 0);
      CART.push({room:r, ci:CI, co:CO, price, guests:{adults:A,children:C,infants:I}});
    }
  });
  renderCart();
}
function renderCart(){
  const box=$('#cart'); box.innerHTML='';
  if(!CART.length){ box.innerHTML='<p class="muted">No rooms selected yet.</p>'; $('#payWrap').style.display='none'; return; }
  CART.forEach((it,i)=>{
    const row=document.createElement('div'); row.className='room';
    row.innerHTML=`<div class="flex"><strong>${it.room.block} ${it.room.room_no}</strong> <span class="badge">${it.room.type.toUpperCase()}</span> <span class="right">₹ ${it.price.toLocaleString()}</span></div>
      <div class="flex">Veg:<input id="veg${i}" type="number" value="0" min="0" style="width:70px"> Non-veg:<input id="nveg${i}" type="number" value="0" min="0" style="width:80px"> BBQ <input id="bbq${i}" type="checkbox"></div>
      <div class="flex"><button class="btn ghost" id="rm${i}">Remove</button></div>`;
    row.querySelector(`#rm${i}`).onclick=()=>{ CART.splice(i,1); renderCart(); };
    box.appendChild(row);
  });
  $('#payWrap').style.display='block';
}
function proceed(){
  if(!CART.length){ alert('Add at least one room.'); return; }
  let totalGuests=0,totalMeals=0;
  CART.forEach((it,i)=>{ totalGuests += (it.guests.adults||0) + (it.guests.children||0); totalMeals += (+$('#veg'+i).value||0)+(+$('#nveg'+i).value||0); });
  if(totalMeals!==totalGuests){ alert('Veg + Non-veg must equal total guests (excluding infants).'); return; }
  // Save test booking or open payment
  if(POL.test_mode){
    alert('Test Mode: Booking saved locally.');
    const existing = JSON.parse(localStorage.getItem('bookings')||'[]'); existing.push({ts:Date.now(), cart:CART}); localStorage.setItem('bookings', JSON.stringify(existing));
    location.href='./my-bookings.html'; return;
  }
  window.open(POL.payment?.pay_url || 'https://www.clubmahabaleshwar.net/pay', '_blank');
}
document.addEventListener('DOMContentLoaded', async ()=>{
  await load();
  renderMonths();
  $('#btnFilter').onclick=()=>{
    const b=$('#fBlock').value, t=$('#fType').value, ac=$('#fAC').value, v=$('#fView').value;
    FILTER = ROOMS.filter(r => (!b||r.block===b) && (!t||r.type===t) && (!v||r.view===v) && (ac==='' || String(r.ac)===ac));
    renderMatches();
  };
  $('#btnQuote').onclick=quoteAndAdd;
  $('#btnPay').onclick=proceed;
});
