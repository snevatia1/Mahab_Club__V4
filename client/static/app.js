/* Minimal app: 6-month calendar, CI/CO selection, availability, cart, simple validation */
let STATE = { policies:{}, tariff:{}, rooms:[], calendar:{}, promotions:{}, startMonth: dayjs().startOf('month'), monthIdx:0, ci:null, co:null, cart:[] };

const $ = s => document.querySelector(s);
function fmt(d){ return dayjs(d).format('DD/MM/YYYY'); }
function nightsBetween(ci,co){ const out=[]; let d=dayjs(ci); const e=dayjs(co); while(d.isBefore(e,'day')){ out.push(d.format('YYYY-MM-DD')); d=d.add(1,'day'); } return out; }

async function loadData(){
  [STATE.policies, STATE.tariff, STATE.rooms, STATE.calendar, STATE.promotions] = await Promise.all([
    fetch('../data/policies.json').then(r=>r.json()),
    fetch('../data/tariff.json').then(r=>r.json()),
    fetch('../data/rooms.json').then(r=>r.json()),
    fetch('../data/calendar.json').then(r=>r.json()),
    fetch('../data/promotions.json').then(r=>r.json())
  ]);
}
function calMeta(ds){
  const m=STATE.calendar[ds]; if (m) return m;
  const cfg=STATE.policies.auto_calendar; const dow=dayjs(ds).day();
  const weekend=(cfg.weekend_days||[5,6]).includes(dow);
  return {season:(cfg.defaults?.season||'regular'), weekend, closed:!!cfg.defaults?.closed, bbq:!!cfg.defaults?.bbq};
}
function renderMonths(){
  const wrap = $('#calendarWrap'); wrap.innerHTML='';
  const months = (STATE.policies.ui?.months_per_view)||6;
  const start = STATE.startMonth.add(STATE.monthIdx,'month');
  // chips
  const chips = $('#monthChips'); chips.innerHTML='';
  const prev = document.createElement('button'); prev.className='chip'; prev.textContent='« Prev'; prev.onclick=()=>{STATE.monthIdx-=months; renderMonths();}; chips.appendChild(prev);
  for(let i=0;i<months;i++){
    const md = start.add(i,'month');
    const b = document.createElement('button'); b.className='chip'; b.textContent=md.format('MMM YY');
    b.onclick=()=>{ document.getElementById('mon-'+md.format('YYYY-MM')).scrollIntoView({behavior:'smooth'}); };
    if (md.format('YYYY-MM')===dayjs().format('YYYY-MM')) b.classList.add('active');
    chips.appendChild(b);
  }
  const next = document.createElement('button'); next.className='chip'; next.textContent='Next »'; next.onclick=()=>{STATE.monthIdx+=months; renderMonths();}; chips.appendChild(next);

  for(let i=0;i<months;i++){
    const d = start.add(i,'month');
    const title = document.createElement('div'); title.className='monthTitle'; title.id='mon-'+d.format('YYYY-MM'); title.textContent = d.format('MMMM YYYY');
    wrap.appendChild(title);
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(s=>{ const el=document.createElement('div'); el.className='dow'; el.textContent=s; wrap.appendChild(el); });

    let cursor = d.startOf('month').startOf('week');
    const end = d.endOf('month').endOf('week');
    while(cursor.isBefore(end,'day')){
      const cell = document.createElement('div'); cell.className='day';
      if ([5,6].includes(cursor.day())) cell.classList.add('weekend');
      cell.dataset.ds = cursor.format('YYYY-MM-DD');
      cell.innerHTML = `<div>${cursor.date()}</div>`;
      cell.onclick = () => onPickDate(cell.dataset.ds);
      wrap.appendChild(cell);
      cursor = cursor.add(1,'day');
    }
  }
  markSelection();
}

function onPickDate(ds){
  if (!STATE.ci || (STATE.ci && STATE.co)) { STATE.ci = dayjs(ds); STATE.co = null; }
  else if (dayjs(ds).isBefore(STATE.ci,'day')) { STATE.ci = dayjs(ds); }
  else { STATE.co = dayjs(ds); }
  $('#lblCI').textContent = STATE.ci? fmt(STATE.ci): '—';
  $('#lblCO').textContent = STATE.co? fmt(STATE.co): '—';
  markSelection();
}
function markSelection(){
  document.querySelectorAll('.day').forEach(d=> d.classList.remove('sel'));
  if (STATE.ci){ const el = document.querySelector(`.day[data-ds="${STATE.ci.format('YYYY-MM-DD')}"]`); el && el.classList.add('sel'); }
  if (STATE.co){ const el = document.querySelector(`.day[data-ds="${STATE.co.format('YYYY-MM-DD')}"]`); el && el.classList.add('sel'); }
}

function nightly(type, meta){ let base=STATE.tariff.base.member[type]||0; let mult=1; if (meta.weekend) mult*=STATE.tariff.multipliers.weekend||1; if (meta.season && STATE.tariff.multipliers[meta.season]) mult*=STATE.tariff.multipliers[meta.season]; return Math.round(base*mult); }

function showAvail(){
  if (!STATE.ci || !STATE.co){ alert('Please select check-in and check-out by tapping two dates.'); return; }
  const list = $('#avail'); list.innerHTML='';
  const nights = nightsBetween(STATE.ci, STATE.co);
  STATE.rooms.forEach(r=>{
    const price = nights.reduce((s,ds)=> s + nightly(r.type, calMeta(ds)), 0);
    const div = document.createElement('div'); div.className='room';
    div.innerHTML = `<div class="flex"><strong>${r.block} ${r.room_no}</strong> <span class="badge">${r.type.toUpperCase()}</span> <span class="badge">${r.ac?'AC':'Non-AC'}</span> <span class="badge">${r.view}</span> <span class="right">₹ ${price.toLocaleString()}</span></div>`
      + `<div class="flex">Adults(10+): <select class="gA">${Array.from({length:6},(_,i)=>`<option>${i}</option>`).join('')}</select>
          Children(5–9): <select class="gC">${Array.from({length:6},(_,i)=>`<option>${i}</option>`).join('')}</select>
          Infants(0–4): <select class="gI">${Array.from({length:6},(_,i)=>`<option>${i}</option>`).join('')}</select>
          <button class="btn add">Add</button></div>`;
    const btn = div.querySelector('.add');
    btn.onclick = () => {
      const A = Number(div.querySelector('.gA').value);
      const C = Number(div.querySelector('.gC').value);
      const I = Number(div.querySelector('.gI').value);
      STATE.cart.push({room:r, ci:STATE.ci, co:STATE.co, guests:{adults:A, children:C, infants:I}});
      renderCart();
    };
    list.appendChild(div);
  });
}

function renderCart(){
  const box = $('#cart'); box.innerHTML='';
  if (!STATE.cart.length){ box.innerHTML='<p class="muted">No rooms in cart.</p>'; return; }
  STATE.cart.forEach((it,idx)=>{
    const nights = nightsBetween(it.ci,it.co);
    const price = nights.reduce((s,ds)=> s + nightly(it.room.type, calMeta(ds)), 0);
    const row = document.createElement('div'); row.className='room';
    row.innerHTML = `<div class="flex"><strong>${it.room.block} ${it.room.room_no}</strong> <span class="badge">${it.room.type.toUpperCase()}</span> <span class="right">₹ ${price.toLocaleString()}</span></div>
      <div class="flex">Veg:<input id="veg${idx}" type="number" value="0" min="0" style="width:70px"> Non-veg:<input id="nveg${idx}" type="number" value="0" min="0" style="width:80px"> BBQ <input id="bbq${idx}" type="checkbox"></div>
      <div class="flex"><button class="btn ghost" id="rm${idx}">Remove</button></div>`;
    row.querySelector(`#rm${idx}`).onclick=()=>{ STATE.cart.splice(idx,1); renderCart(); };
    box.appendChild(row);
  });
  $('#payWrap').style.display='block';
}

function proceedPay(){
  if (!STATE.cart.length){ alert('Please add at least one room.'); return; }
  // Simple validation: total Veg+Nonveg across all rooms must equal total non-infant guests
  let totalGuests = 0, totalMeals = 0;
  STATE.cart.forEach((it,idx)=>{
    totalGuests += (it.guests.adults||0) + (it.guests.children||0);
    const veg = Number(document.getElementById(`veg${idx}`).value||0);
    const nveg = Number(document.getElementById(`nveg${idx}`).value||0);
    totalMeals += veg + nveg;
  });
  if (totalMeals !== totalGuests){ alert('Veg + Non-veg must equal total guests (excluding infants).'); return; }

  // In test mode, simulate confirmation
  if (STATE.policies.test_mode){
    alert('Test Mode: Booking saved locally.');
    const existing = JSON.parse(localStorage.getItem('bookings')||'[]');
    existing.push({ts:Date.now(), cart:STATE.cart});
    localStorage.setItem('bookings', JSON.stringify(existing));
    location.href = './my-bookings.html';
    return;
  }
  // Live: open payment URL
  window.open(STATE.policies.payment?.pay_url || 'https://www.clubmahabaleshwar.net/pay', '_blank');
}

async function init(){
  // Import from Assistant (if used)
  try {
    const p=JSON.parse(localStorage.getItem('assistantPrefill')||'null');
    if (p){
      STATE.ci = dayjs(p.ci); STATE.co = dayjs(p.co);
      STATE.cart = (p.items||[]).map(it=>({room:it.room, ci:STATE.ci, co:STATE.co, guests: it.guests||{}}));
      document.getElementById('lblCI').textContent = STATE.ci? dayjs(STATE.ci).format('DD/MM/YYYY') : '—';
      document.getElementById('lblCO').textContent = STATE.co? dayjs(STATE.co).format('DD/MM/YYYY') : '—';
      localStorage.removeItem('assistantPrefill');
    }
  } catch(e){}

  await loadData();
  renderMonths();
  renderCart();
  $('#btnAvail').onclick = showAvail;
  $('#btnPay').onclick = proceedPay;
}
document.addEventListener('DOMContentLoaded', init);
