
export function inRange(d, a, b){ return d>=a && d<=b; }
export function parseISO(d){ return new Date(d+'T00:00:00'); }

export function drawSixMonthCalendar(container, restricted){
  container.innerHTML='';
  const today = new Date();
  for(let m=0;m<6;m++){
    const dt = new Date(today.getFullYear(), today.getMonth()+m, 1);
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.innerHTML = `<h3>${dt.toLocaleString('en',{month:'long'})} ${dt.getFullYear()}</h3>`;

    const cal = document.createElement('div');
    cal.className = 'calendar';

    const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const head = document.createElement('div'); head.className='cal-head'; head.style.gridColumn='1 / span 7';
    const row = document.createElement('div'); row.style.display='grid'; row.style.gridTemplateColumns='repeat(7,1fr)';
    weekdays.forEach(w=>{ const d=document.createElement('div'); d.textContent=w; row.appendChild(d); });
    head.appendChild(row); cal.appendChild(head);

    const startDay = new Date(dt.getFullYear(), dt.getMonth(), 1).getDay();
    const daysInMonth = new Date(dt.getFullYear(), dt.getMonth()+1, 0).getDate();

    for(let i=0;i<startDay;i++){ const e=document.createElement('div'); e.className='day disabled'; cal.appendChild(e); }

    for(let d=1; d<=daysInMonth; d++){
      const cell = document.createElement('div'); cell.className='day';
      const cur = new Date(dt.getFullYear(), dt.getMonth(), d);
      const diwali = inRange(cur, parseISO(restricted.diwali[0]), parseISO(restricted.diwali[1]));
      const xmas   = inRange(cur, parseISO(restricted.christmas[0]), parseISO(restricted.christmas[1]));
      const mon    = inRange(cur, parseISO(restricted.monsoon[0]), parseISO(restricted.monsoon[1]));
      let tag=''; if(mon) tag='<div class="tag closed">Closed</div>';
      else if(diwali||xmas) tag='<div class="tag special">Special</div>';
      else tag='<div class="tag season">Regular</div>';
      cell.innerHTML = `<div style="font-weight:600">${d}</div>${tag}`;
      cal.appendChild(cell);
    }
    wrap.appendChild(cal);
    container.appendChild(wrap);
  }
}
