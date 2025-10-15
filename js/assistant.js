
// Simple Assistant: voice + typing; suggests split-stay, confirms selections
export class Assistant {
  constructor(outletId, micBtnId, inputId, sendBtnId){
    this.out = document.getElementById(outletId);
    this.input = document.getElementById(inputId);
    this.sendBtn = document.getElementById(sendBtnId);
    this.micBtn = document.getElementById(micBtnId);
    this.bind();
    this.say("Hello! I can help you check availability and pick rooms. You can speak or type.");
  }
  bind(){
    if(this.sendBtn) this.sendBtn.addEventListener('click', ()=>this.onUser(this.input.value));
    if(this.input) this.input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ this.onUser(this.input.value); }});
    if(this.micBtn) this.micBtn.addEventListener('click', ()=>this.listen());
  }
  card(html){
    const div = document.createElement('div');
    div.className = 'card'; div.innerHTML = html; this.out.appendChild(div); this.out.scrollTop = this.out.scrollHeight;
  }
  say(text){ this.card(`<strong>Assistant:</strong> ${text}`); try{ const u=new SpeechSynthesisUtterance(text); window.speechSynthesis.speak(u);}catch(e){} }
  onUser(text){
    if(!text) return;
    this.card(`<strong>You:</strong> ${text}`);
    this.input.value='';
    if(/split|change/i.test(text)){ this.say("If the same room isn't free throughout, I can reserve a different room for some nights and the Club will shift your luggage."); return; }
    if(/book|reserve|confirm/i.test(text)){ this.say("This TEST site doesn't confirm bookings yet. On LIVE, I will collect OTP and member details, then confirm. For now I can prepare your selection and export it."); return; }
    if(/availability|free|rooms/i.test(text)){ this.say("Use the 'Check Availability' button after picking dates. Then click a date to see free/ booked rooms and choose specific rooms."); return; }
    this.say("I can guide you: pick your dates, choose counts and attributes, then Check Availability.");
  }
  listen(){
    try{
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if(!SR) { this.say("Voice input isn't supported in this browser. Please type."); return; }
      const rec = new SR(); rec.lang = 'en-IN'; rec.interimResults=false;
      this.say("Listening...");
      rec.onresult = (e)=>{ const text = e.results[0][0].transcript; this.onUser(text); };
      rec.onerror = ()=> this.say("Sorry, I couldn't hear that. Please try again.");
      rec.start();
    }catch(e){ this.say("Voice input not available. Please type."); }
  }
}
