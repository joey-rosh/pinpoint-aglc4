/* Pinpoint · user interface. Depends on core.js, sources.js and state.js. */
"use strict";
let state=loadState();
SETTINGS.cap=state.cap;
const touched=new Set();
let storageWarned=false;
function save(){if(!saveState(state)&&!storageWarned){storageWarned=true;toast('This browser isn’t letting the page save, so your work will be lost when you close the tab. Use Export in the Bibliography tab to keep a copy.',7000);}}
function dataFor(id){if(!isObj(state.data[id])){state.data[id]=blankFor(TMAP[id]);state.sample[id]=false;}return state.data[id];}
/* Two-click confirm: window.confirm() is blocked inside sandboxed frames such as artifact previews. */
function armed(btn,action,label='Click again to confirm'){if(btn.dataset.armed){delete btn.dataset.armed;action();return;}btn.dataset.armed='1';const old=btn.innerHTML;btn.innerHTML=label;btn.classList.add('arm');setTimeout(()=>{if(btn.isConnected&&btn.dataset.armed){delete btn.dataset.armed;btn.innerHTML=old;btn.classList.remove('arm');}},3500);}

/* ================= UI: nav ================= */
const $=s=>document.querySelector(s);
function renderNav(){
  const q=$('#q').value.trim().toLowerCase();const list=$('#navlist');list.innerHTML='';
  const sel=$('#navsel');sel.innerHTML='';
  for(const [cid,cname,ch] of CATS){
    const items=TYPES.filter(t=>t.cat===cid&&(!q||(t.name+' '+t.rule+' '+cname+' '+(t.tip||'')).toLowerCase().includes(q)));
    if(!items.length)continue;
    const g=document.createElement('div');g.className='cat';
    g.innerHTML=`<h3>${cname}<span>${ch}</span></h3>`;
    const og=document.createElement('optgroup');og.label=cname;
    for(const t of items){
      const b=document.createElement('button');b.className='ti';b.type='button';b.setAttribute('aria-current',t.id===state.type?'true':'false');
      b.innerHTML=`<span>${t.name}</span><code>r ${t.rule}</code>`;b.onclick=()=>selectType(t.id);g.appendChild(b);
      const o=document.createElement('option');o.value=t.id;o.textContent=`${t.name} · r ${t.rule}`;if(t.id===state.type)o.selected=true;og.appendChild(o);
    }
    list.appendChild(g);sel.appendChild(og);
  }
  if(!list.children.length)list.innerHTML='<div class="empty">No source type matches that search.</div>';
}
function selectType(id){state.type=id;state.editing=null;save();renderNav();renderForm();renderOut();
  if(window.matchMedia('(max-width:1200px)').matches)$('#tname').scrollIntoView({block:'start',behavior:'smooth'});}

/* ================= UI: form ================= */
function renderForm(){
  const t=TMAP[state.type],d=dataFor(t.id),form=$('#form');
  const cat=CATS.find(c=>c[0]===t.cat);
  $('#tcat').innerHTML=`<i>◇</i> ${cat[1]} · ${cat[2]}`;$('#tname').textContent=t.name;$('#trule').textContent='AGLC4 r '+t.rule;$('#ttip').textContent=t.tip||'';
  form.innerHTML='';
  for(const f of fieldsOf(t)){
    const w=document.createElement('div');w.className='fld'+(f.w===2||f.t==='authors'?' w2':'');w.dataset.fid=f.id;
    const id='f_'+f.id;
    if(f.t==='check'){
      w.innerHTML=`<label class="chk"><input type="checkbox" id="${id}"> ${f.label}</label>`;const cb=w.querySelector('input');cb.checked=!!d[f.id];
      cb.onchange=()=>{d[f.id]=cb.checked;edited();updateWhen();};
    }else if(f.t==='authors'){
      w.innerHTML=`<span class="lbl">${f.label}</span><div class="authors"></div>`;form.appendChild(w);renderAuthors(w.querySelector('.authors'),d,f.id);continue;
    }else{
      const lab=document.createElement('label');lab.htmlFor=id;lab.innerHTML=f.label+(f.req?' <em>*</em>':'');w.appendChild(lab);
      let inp;
      if(f.t==='select'){inp=document.createElement('select');for(const [v,l] of f.opts){const o=document.createElement('option');o.value=v;o.textContent=l;inp.appendChild(o);}inp.value=d[f.id]??f.opts[0][0];}
      else{inp=document.createElement('input');inp.type=f.raw&&f.id.includes('url')||f.id==='arch'?'url':'text';inp.value=d[f.id]??'';if(f.ph)inp.placeholder=f.ph;if(f.list)inp.setAttribute('list',f.list);inp.autocomplete='off';}
      inp.className='inp';inp.id=id;if(f.req)inp.setAttribute('aria-required','true');if(f.help){inp.dataset.help='h_'+f.id;inp.setAttribute('aria-describedby','h_'+f.id);}
      const on=()=>{d[f.id]=inp.value;edited();if(f.t==='select')updateWhen();};
      inp.addEventListener('input',on);inp.addEventListener('change',on);
      w.appendChild(inp);
      if(f.help){const h=document.createElement('span');h.className='help';h.id='h_'+f.id;h.textContent=f.help;w.appendChild(h);}
    }
    form.appendChild(w);
  }
  updateWhen();sampleTag();
  $('#btnSave').textContent=state.editing?'Update saved source':'Save to library';
}
function renderAuthors(box,d,fid){
  if(!Array.isArray(d[fid]))d[fid]=[];
  const arr=d[fid];box.innerHTML='';
  arr.forEach((a,i)=>{
    const r=document.createElement('div');r.className='arow'+(a.kind==='body'?' body':'');
    const k=document.createElement('button');k.type='button';k.className='kind';k.textContent=a.kind==='body'?'ORG':'PERSON';k.title='Switch between a person and an organisation';
    k.onclick=()=>{a.kind=a.kind==='body'?'person':'body';renderAuthors(box,d,fid);edited();};r.appendChild(k);
    const mk=(prop,ph,label)=>{const x=document.createElement('input');x.className='inp';x.placeholder=ph;x.value=a[prop]||'';x.setAttribute('aria-label',label);x.id=`f_${fid}_${i}_${prop}`;x.oninput=()=>{a[prop]=x.value;edited();};r.appendChild(x);};
    if(a.kind==='body')mk('name','Organisation name','Organisation name');else{mk('given','Given names / initials','Given names');mk('surname','Surname','Surname');}
    const x=document.createElement('button');x.type='button';x.className='x';x.innerHTML='&times;';x.setAttribute('aria-label','Remove author');x.onclick=()=>{arr.splice(i,1);renderAuthors(box,d,fid);edited();};r.appendChild(x);
    box.appendChild(r);
  });
  const add=document.createElement('div');add.className='fbtns';
  const b1=document.createElement('button');b1.type='button';b1.className='btn sm';b1.textContent='+ Person';b1.onclick=()=>{arr.push({kind:'person',given:'',surname:''});renderAuthors(box,d,fid);edited();};
  const b2=document.createElement('button');b2.type='button';b2.className='btn sm ghost';b2.textContent='+ Organisation';b2.onclick=()=>{arr.push({kind:'body',name:''});renderAuthors(box,d,fid);edited();};
  add.append(b1,b2);box.appendChild(add);
  if(arr.length>3){const h=document.createElement('span');h.className='help';h.textContent='More than three authors: only the first is shown, followed by “et al” (r 4.1.2).';box.appendChild(h);}
}
function updateWhen(){const t=TMAP[state.type],d=dataFor(t.id);for(const f of fieldsOf(t)){if(!f.when)continue;const w=$(`[data-fid="${f.id}"]`);if(w)w.hidden=!f.when(d);}renderOut();}
let edTimer;function edited(){touched.add(state.type);state.sample[state.type]=false;sampleTag();renderOut();clearTimeout(edTimer);edTimer=setTimeout(save,300);}
function sampleTag(){$('#sampleTag').hidden=!state.sample[state.type];}

/* ================= UI: output ================= */
const SECN={A:'Articles / Books / Reports',B:'Cases',C:'Legislation',D:'Treaties',E:'Other'};
function card(label,html,{hero=false,copy=null,extra=''}={}){
  return `<article class="card${hero?' hero':''}"><div class="chead"><span class="eyebrow">${label}</span>${copy!==null?`<button class="btn sm" data-copy="${copy}">Copy</button>`:''}</div><div class="cbody">${html}${extra}</div></article>`;
}
let COPYBUF=[];
function renderOut(){
  const t=TMAP[state.type],raw=dataFor(t.id),d=prep(t,raw,false);
  const pinF=t.f.find(f=>f.id==='pin');
  let p2=sq(esc(state.pin2.trim()));if(pinF&&!pinF.nodash)p2=dash(p2);if(pinF&&pinF.para&&(typeof pinF.para!=='function'||pinF.para(raw)))p2=paraPin(p2);
  const fn=String(state.fn||'1').replace(/[^\d]/g,'')||'1',sig=state.sig;
  const full=fullCite(t,d,sig);
  const p1=pl(d.pin||'');
  const ibid=(sig?sig+' ibid':'Ibid')+(p2&&pl(p2)!==p1?' '+p2:'')+'.';
  const sub=subRef(t,d,fn,p2,sig);
  const it=inText(t,d);
  const bib=bibEntry(t,raw);
  const n=+fn;
  COPYBUF=[full,ibid,sub.main,sub.alt?sub.alt[1]:'',it.first,it.later,bib,`at ${p2||'[pinpoint]'}`];
  const fnrow=(no,html)=>`<div class="fn"><span class="fnno">${no}</span><div class="cite">${html}</div></div>`;
  let h='';
  h+=card(`<i style="font-style:normal;color:var(--ion)">■</i> Footnote · first citation`,fnrow(n,full),{hero:true,copy:0,extra:`<p class="note">Every footnote ends with a full stop (r 1.1.4).${d.st&&t.st!==false?' The short title goes at the very end of this first citation, after any pinpoint or bracketed judges (r 1.4.4).':''}</p>`});
  h+=card('Footnote · ibid (next footnote, same source)',fnrow(n+1,ibid),{copy:1,extra:`<p class="note">Use ibid only when the <b>immediately preceding</b> footnote cites this source and nothing else. ${p1&&!p2?'<b>No new pinpoint?</b> Because the first footnote had a pinpoint, refer back with the (n '+fn+') form instead of ibid when citing the source generally (r 1.4.3).':'Leave the pinpoint out if it is the same as the previous footnote’s (r 1.4.3).'}</p>`});
  h+=card('Footnote · subsequent reference',fnrow(n+5,sub.main),{copy:2,extra:(sub.alt?`<div class="alt"><span class="lbl">${sub.alt[0]}</span><div class="cite">${sub.alt[1]}</div></div>`:'')+`<p class="note">“n ${fn}” points to the footnote holding the full citation (r 1.4.1).${(t.k==='case'||t.k==='leg')&&!d.st?' <b>Tip:</b> add a short title to shorten this reference.':''}</p>`});
  h+=card('Same footnote · repeat pinpoint',`<div class="cite">… <span style="color:var(--muted)">discursive text</span>: at ${p2||miss('pinpoint')}.</div>`,{copy:7,extra:'<p class="note">Within one footnote, cite the source again with “at” and the pinpoint, not “ibid” (r 1.4.6).</p>'});
  h+=card('In-text · body of your essay',`<div class="intext"><div class="row"><span class="lbl">FIRST MENTION</span><div class="cite">${it.first}</div></div><div class="row"><span class="lbl">LATER</span><div class="cite">${it.later}</div></div></div>`,{copy:4,extra:`<p class="note">AGLC is a footnote style. Name the source in your sentence, then put the footnote number after the punctuation.${t.k==='sec'?' In the body text you may give the author’s full name and title, eg “Professor”.':''}${t.k==='leg'?' Give the full title and jurisdiction on first mention in the text (r 3.5).':''}</p>`});
  h+=card(`Bibliography · ${SECN[t.sec]}`,`<div class="cite">${bib}</div>`,{copy:6,extra:'<p class="note">First author inverted (Surname, Given names), no pinpoint, no short title and no closing full stop (r 1.13).</p>'});
  /* diagnostics */
  const w=[...d._w];
  const missing=fieldsOf(t).filter(f=>f.req&&(!f.when||f.when(raw))&&f.t==='text'&&!String(raw[f.id]||'').trim()).map(f=>f.label.replace(/\s*\(.*\)$/,''));
  if(missing.length)w.unshift(['warn','Still needed: '+missing.join(', ')+'. Placeholders show where each goes.']);
  const au=auOf(t,raw);if(au&&au.some(a=>/\b(Dr|Prof|Professor|the Hon|Hon|Mr|Ms|Mrs)\b\.?\s/.test(a.given||'')))w.push(['warn','Leave honorifics such as Dr, Professor and the Hon out of citations (r 4.1.1). Sir, Dame, peerage titles and sitting judges’ titles stay.']);
  if(au&&au.some(a=>/\b(AM|AO|AC|QC|KC|SC|LLB|PhD)\b/.test(a.surname||'')))w.push(['warn','Leave post-nominals such as AM, QC and LLB out (r 4.1.1).']);
  if(au&&au.some(a=>/\./.test(a.given||'')))w.push(['fix','Removed full stops and spaces from initials (r 4.1.1).']);
  if(state.cap&&fieldsOf(t).some(f=>f.title&&raw[f.id]))w.push(['info','Titles are auto-capitalised under r 1.7. Check proper nouns and foreign phrases.']);
  if(t.k==='case'&&!d.st&&t.st!==false)w.push(['info','If you’ll cite this case again, add a short title, usually the first party’s name (r 2.1.14).']);
  const warnN=w.filter(x=>x[0]==='warn').length;
  $('#diagSum').innerHTML=warnN?`<span style="color:var(--flux)">${warnN} ADVISOR${warnN>1?'IES':'Y'}</span>`:'<span style="color:var(--ok)">CHECKS NOMINAL</span>';
  const ic={fix:'✓',warn:'!',info:'i'};
  h+=card('Rule check',w.length?`<ul class="diag">${w.map(([k,m])=>`<li class="${k}"><span class="ic">${ic[k]}</span><span>${m}</span></li>`).join('')}</ul>`:'<ul class="diag"><li class="fix"><span class="ic">✓</span><span>No issues detected. Still read the citation against the Guide.</span></li></ul>');
  $('#outs').innerHTML=h;
  markInvalid(t,raw);
}
/* Required text fields turn amber once the student has started on this source (or tried to save). */
function markInvalid(t,raw){
  const showErr=touched.has(t.id);
  for(const f of fieldsOf(t)){
    if(!f.req||f.t!=='text')continue;
    const w=document.querySelector(`[data-fid="${f.id}"]`);if(!w)continue;
    const inp=w.querySelector('input');
    const bad=showErr&&(!f.when||f.when(raw))&&!String(raw[f.id]||'').trim();
    w.classList.toggle('invalid',bad);
    let m=w.querySelector('.err');
    if(bad&&!m){m=document.createElement('span');m.className='err';m.id='err_'+f.id;m.textContent=`${f.label.replace(/\s*\(.*\)$/,'')} is needed for this citation.`;w.appendChild(m);}
    if(!bad&&m)m.remove();
    if(inp){inp.setAttribute('aria-invalid',bad?'true':'false');const ids=[inp.dataset.help,bad?'err_'+f.id:''].filter(Boolean).join(' ');if(ids)inp.setAttribute('aria-describedby',ids);else inp.removeAttribute('aria-describedby');}
  }
}
function missingRequired(t,raw){return fieldsOf(t).filter(f=>f.req&&f.t==='text'&&(!f.when||f.when(raw))&&!String(raw[f.id]||'').trim());}
$('#outs').addEventListener('click',e=>{const b=e.target.closest('[data-copy]');if(!b)return;copyRich(COPYBUF[+b.dataset.copy]).then(ok=>toast(ok?'Copied with formatting':'Copy blocked. Select the text and copy it manually.'));});

/* ================= copy ================= */
async function copyRich(html){
  const text=pl(html.replace(/<sup>(.*?)<\/sup>/g,'$1'));
  try{if(navigator.clipboard&&window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);return true;}}catch(e){}
  try{const el=document.createElement('div');el.contentEditable='true';el.innerHTML=html;el.style.cssText='position:fixed;left:-9999px;top:0;white-space:pre-wrap';document.body.appendChild(el);const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);const ok=document.execCommand('copy');s.removeAllRanges();el.remove();if(ok)return true;}catch(e){}
  try{await navigator.clipboard.writeText(text);return true;}catch(e){return false;}
}
let tT;function toast(m,ms=2600){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tT);tT=setTimeout(()=>t.classList.remove('on'),ms);}

/* ================= library, sequencer, bibliography ================= */
function libLabel(item){const t=TMAP[item.t];return t?pl(bibEntry(t,item.d)):'(unknown)';}
function saveToLib(){
  const t=TMAP[state.type];const d=clone(dataFor(t.id));
  const miss=missingRequired(t,d);touched.add(t.id);
  if(state.editing){const it=state.lib.find(x=>x.id===state.editing);if(it){it.t=t.id;it.d=d;toast('Saved source updated');}else{state.editing=null;}}
  if(!state.editing){state.lib.push({id:newId(),t:t.id,d});toast(miss.length?`Saved, but ${miss.length} required field${miss.length>1?'s are':' is'} still empty (highlighted).`:'Saved to library. It now appears in the Sequencer and Bibliography.',miss.length?4200:2600);}
  state.editing=null;$('#btnSave').textContent='Save to library';save();counts();renderOut();
}
function counts(){$('#ctLib').textContent=state.lib.length||'';$('#ctSeq').textContent=state.fns.length||'';}
const computeFns=()=>sequence(state.lib,state.fns,TMAP);
function renderSeq(){
  const sel=$('#sqSrc');const cur=sel.value;sel.innerHTML='';
  if(!state.lib.length){sel.innerHTML='<option value="">Library is empty. Save a source in the Generator first.</option>';}
  for(const it of state.lib){const o=document.createElement('option');o.value=it.id;const l=libLabel(it);o.textContent=(l.length>90?l.slice(0,88)+'…':l);sel.appendChild(o);}
  if(cur&&state.lib.some(x=>x.id===cur))sel.value=cur;
  const ol=$('#fnlist');const res=computeFns();
  if(!state.fns.length){ol.innerHTML='<li class="empty" style="display:block">No footnotes yet. Add one on the left.</li>';return;}
  const lab={full:'Full citation',ibid:'Ibid',sub:'Cross-reference',x:'Missing'};
  ol.innerHTML=res.map((r,i)=>`<li><span class="fnno">${i+1}</span><div><div class="cite">${r.html}</div><span class="mode ${r.mode}">${lab[r.mode]}</span></div><div class="ctl"><button class="x" data-up="${i}" aria-label="Move footnote ${i+1} up">↑</button><button class="x" data-dn="${i}" aria-label="Move footnote ${i+1} down">↓</button><button class="x" data-rm="${i}" aria-label="Remove footnote ${i+1}">&times;</button></div></li>`).join('');
}
$('#fnlist').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const f=state.fns;
  if(b.dataset.rm!==undefined)f.splice(+b.dataset.rm,1);
  else if(b.dataset.up!==undefined){const i=+b.dataset.up;if(i>0)[f[i-1],f[i]]=[f[i],f[i-1]];}
  else if(b.dataset.dn!==undefined){const i=+b.dataset.dn;if(i<f.length-1)[f[i+1],f[i]]=[f[i],f[i+1]];}
  save();counts();renderSeq();});
$('#sqAdd').onclick=()=>{const s=$('#sqSrc').value;if(!s){toast('Save a source to the library first');return;}state.fns.push({s,pin:$('#sqPin').value.trim(),sig:$('#sqSig').value});$('#sqPin').value='';save();counts();renderSeq();};
$('#sqClear').onclick=e=>{if(!state.fns.length)return;armed(e.currentTarget,()=>{state.fns=[];save();counts();renderSeq();toast('Footnotes cleared');},'Confirm clear');};
$('#sqCopy').onclick=()=>{const res=computeFns();if(!res.length)return;copyRich(res.map((r,i)=>`<p>${i+1}&nbsp;&nbsp;${r.html}</p>`).join('')).then(ok=>toast(ok?'Footnotes copied':'Copy blocked'));};

function renderBib(){
  const ll=$('#liblist');
  ll.innerHTML=state.lib.length?state.lib.map(it=>{const t=TMAP[it.t];return `<div class="libitem"><div><div class="t">${t?t.name:'Unknown'} · r ${t?t.rule:''}</div><div class="cite">${t?bibEntry(t,it.d):''}</div></div><div class="fbtns"><button class="btn sm" data-edit="${it.id}">Edit</button><button class="x" data-del="${it.id}" aria-label="Delete source">&times;</button></div></div>`;}).join(''):'<div class="empty">No saved sources yet. In the Generator, choose <b>Save to library</b>.</div>';
  const h=bibliography(state.lib,TMAP).map((g,i)=>`<section><h4>${'ABCDE'[i]}&nbsp;&nbsp;${SECN[g.sec]}</h4>${g.entries.map(e=>`<p class="cite ent">${e}</p>`).join('')}</section>`).join('');
  $('#biblist').innerHTML=h||'<div class="empty">Your bibliography builds here as you save sources.</div>';
}
$('#liblist').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.del){const id=b.dataset.del;armed(b,()=>{state.lib=state.lib.filter(x=>x.id!==id);state.fns=state.fns.filter(f=>f.s!==id);save();counts();renderBib();toast('Source deleted');},'?');}
  if(b.dataset.edit){const it=state.lib.find(x=>x.id===b.dataset.edit);if(!it)return;state.type=it.t;state.data[it.t]=clone(it.d);state.sample[it.t]=false;state.editing=it.id;save();show('gen');renderNav();renderForm();renderOut();toast('Loaded into the Generator. Choose “Update saved source” when you’re done.');}});
$('#libClear').onclick=e=>{if(!state.lib.length)return;armed(e.currentTarget,()=>{state.lib=[];state.fns=[];save();counts();renderBib();toast('Library cleared');},'Confirm clear');};
$('#bibCopy').onclick=()=>{const html=$('#biblist').innerHTML;if(!state.lib.length)return;copyRich(html.replace(/<h4>/g,'<p><b>').replace(/<\/h4>/g,'</b></p>').replace(/ class="[^"]*"/g,'').replace(/<\/?section>/g,'')).then(ok=>toast(ok?'Bibliography copied':'Copy blocked'));};

/* ================= primer ================= */
function renderPrimer(){
  const ex=(id,over={})=>{const t=TMAP[id];return fullCite(t,prep(t,{...clone(t.ex),...over},false),'');};
  const P=$('#primer');
  P.innerHTML=`
  <div class="panel"><div class="phead"><span class="eyebrow"><i>◇</i> r 1.4 · Subsequent references</span></div><div class="body">
    <p>Choose how to cite a source you have already cited, in this order:</p>
    <div class="flow">
      <div class="step"><span class="num">1</span><span><b>Same source, same footnote?</b> Use “at” and the new pinpoint, eg “… : at 45.”</span></div>
      <div class="step"><span class="num">2</span><span><b>Cited alone in the immediately preceding footnote?</b> Use “Ibid”, adding a pinpoint only if it has changed. If the previous footnote had a pinpoint and you now need none, go to step 3.</span></div>
      <div class="step"><span class="num">3</span><span><b>Cited earlier?</b> Use the short form with a cross-reference: author surname, short title, case name or Act short title, then “(n X)” and the pinpoint.</span></div>
      <div class="step"><span class="num">4</span><span><b>First time?</b> Give the full citation and introduce any short title at its end.</span></div>
    </div></div></div>

  <div class="panel"><div class="phead"><span class="eyebrow"><i>◇</i> r 1.2 · Introductory signals</span></div><div class="body tbl"><table>
    <tr><th>Signal</th><th>Use when the source…</th></tr>
    <tr><td><span class="k">[none]</span></td><td>is quoted or directly supports the proposition</td></tr>
    <tr><td><span class="k">See</span></td><td>gives qualified support</td></tr>
    <tr><td><span class="k">See, eg,</span></td><td>is one of several authorities in support</td></tr>
    <tr><td><span class="k">See also</span></td><td>gives additional or general support</td></tr>
    <tr><td><span class="k">See especially</span></td><td>is the strongest of several supporting authorities</td></tr>
    <tr><td><span class="k">See generally</span></td><td>gives background on the topic</td></tr>
    <tr><td><span class="k">Cf</span></td><td>offers a useful contrast (“compare”)</td></tr>
    <tr><td><span class="k">But see</span></td><td>partly disagrees with the proposition</td></tr>
  </table><p class="note">A new signal inside a footnote starts a new sentence (r 1.2).</p></div></div>

  <div class="panel"><div class="phead"><span class="eyebrow"><i>◇</i> r 1.13 · Bibliography</span></div><div class="body">
    <p>Sections: <b>A</b> Articles/Books/Reports, <b>B</b> Cases, <b>C</b> Legislation, <b>D</b> Treaties, <b>E</b> Other. Leave out empty sections and re-letter the rest.</p>
    <p>Invert only the first author’s name (Surname, Given names). Leave out pinpoints and closing full stops. List all sources you relied on, not just the ones you cited.</p>
    <p>Alphabetise by the first author’s surname, then first name, then co-authors. Where the author is a body, or there is no author, alphabetise by the first word (ignoring “The”). A work by one author comes before that author’s co-authored works.</p>
  </div></div>

  <div class="panel"><div class="phead"><span class="eyebrow"><i>◇</i> r 1.1 · 1.5 · 1.6 · 1.11 · Formatting basics</span></div><div class="body tbl"><table>
    <tr><td>Footnotes</td><td>End every footnote with a full stop. Put the footnote number after punctuation. Separate multiple sources with semicolons.</td></tr>
    <tr><td>Quotation marks</td><td>Single ‘ ’ quotation marks, with double “ ” for a quote within a quote.</td></tr>
    <tr><td>Spans</td><td>Use an en-dash: <span class="k">389–90</span>, <span class="k">[196]–[197]</span>, <span class="k">ss 42–9</span>.</td></tr>
    <tr><td>Abbreviations</td><td>No full stops: <span class="k">Pty Ltd</span>, <span class="k">eg</span>, <span class="k">HLA Hart</span>.</td></tr>
    <tr><td>Dates</td><td><span class="k">21 September 2026</span>, never 21st September.</td></tr>
    <tr><td>Time</td><td><span class="k">9:37pm</span>, with no space before am/pm.</td></tr>
    <tr><td>Other sources</td><td>“quoting” or “citing” links a source to the source it refers to (r 1.3).</td></tr>
  </table></div></div>

  <div class="panel"><div class="phead"><span class="eyebrow"><i>◇</i> r 3.1.4 · 3.4 · Pinpoint abbreviations</span></div><div class="body tbl"><table>
    <tr><th>Designation</th><th>Single</th><th>Plural</th></tr>
    <tr><td>Section / subsection</td><td><code>s</code> · <code>sub-s</code></td><td><code>ss</code> · <code>sub-ss</code></td></tr>
    <tr><td>Part / division / subdivision</td><td><code>pt</code> · <code>div</code> · <code>sub-div</code></td><td><code>pts</code> · <code>divs</code> · <code>sub-divs</code></td></tr>
    <tr><td>Chapter / schedule</td><td><code>ch</code> · <code>sch</code></td><td><code>chs</code> · <code>schs</code></td></tr>
    <tr><td>Clause / paragraph</td><td><code>cl</code> · <code>para</code></td><td><code>cls</code> · <code>paras</code></td></tr>
    <tr><td>Article / appendix</td><td><code>art</code> · <code>app</code></td><td><code>arts</code> · <code>apps</code></td></tr>
    <tr><td>Regulation / rule / order</td><td><code>reg</code> · <code>r</code> · <code>ord</code></td><td><code>regs</code> · <code>rr</code> · <code>ords</code></td></tr>
    <tr><td>Item</td><td colspan="2">written in full: <code>sch 1 item 4</code></td></tr>
  </table><p class="note">No space before a subsection: <span class="k">s 5(1)</span>. No commas within a single pinpoint: <span class="k">pt III div 2</span>. Keep the hyphen in tax provisions such as <span class="k">s 20-110</span>.</p></div></div>

  <div class="panel"><div class="phead"><span class="eyebrow"><i>◇</i> r 2.4 · Judicial officers</span></div><div class="body tbl"><table>
    <tr><th>Office</th><th>Abbreviation</th><th>Office</th><th>Abbreviation</th></tr>
    <tr><td>Chief Justice</td><td><code>CJ</code></td><td>Justice / Justices</td><td><code>J</code> · <code>JJ</code></td></tr>
    <tr><td>Justice of Appeal</td><td><code>JA</code> · <code>JJA</code></td><td>President</td><td><code>P</code></td></tr>
    <tr><td>Acting Justice</td><td><code>AJ</code></td><td>Associate Justice</td><td><code>AsJ</code></td></tr>
    <tr><td>Chief Judge at Common Law</td><td><code>CJ at CL</code></td><td>Chief Judge in Equity</td><td><code>CJ in Eq</code></td></tr>
    <tr><td>Deputy Chief Justice</td><td><code>DCJ</code></td><td>Judicial Registrar</td><td><code>JR</code></td></tr>
    <tr><td colspan="4">These go <b>before</b> the name, in full: Judge, Magistrate, Master, Commissioner (eg “Judge Lacava”).</td></tr>
  </table><p class="note">Judges go in brackets after the pinpoint. Don’t use “per”. Show agreement as “(Kitto J, Webb J agreeing at 591)” and a single judgment for the Court as “(Hudson AJ for the Court)”.</p></div></div>

  <div class="panel" style="grid-column:1/-1"><div class="phead"><span class="eyebrow"><i>◇</i> Anatomy · generated from the sample data</span></div><div class="body tbl"><table>
    <tr><th>Source</th><th>Footnote</th></tr>
    <tr><td>Reported case</td><td><div class="cite">${ex('case-rep')}</div></td></tr>
    <tr><td>Act</td><td><div class="cite">${ex('act')}</div></td></tr>
    <tr><td>Journal article</td><td><div class="cite">${ex('journal')}</div></td></tr>
    <tr><td>Book</td><td><div class="cite">${ex('book')}</div></td></tr>
    <tr><td>Treaty</td><td><div class="cite">${ex('treaty')}</div></td></tr>
    <tr><td>Hansard</td><td><div class="cite">${ex('hansard')}</div></td></tr>
  </table></div></div>`;
}

/* ================= views & wiring ================= */
function show(v){state.view=v;save();document.querySelectorAll('.tab').forEach(t=>{const on=t.dataset.view===v;t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1;});
  document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!=='view-'+v);
  if(v==='seq')renderSeq();if(v==='bib')renderBib();if(v==='primer')renderPrimer();window.scrollTo({top:0});}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>show(t.dataset.view));
$('.tabs').addEventListener('keydown',e=>{
  const tabs=[...document.querySelectorAll('.tab')];const i=tabs.indexOf(document.activeElement);if(i<0)return;
  let j=null;if(e.key==='ArrowRight')j=(i+1)%tabs.length;else if(e.key==='ArrowLeft')j=(i-1+tabs.length)%tabs.length;else if(e.key==='Home')j=0;else if(e.key==='End')j=tabs.length-1;
  if(j===null)return;e.preventDefault();tabs[j].focus();show(tabs[j].dataset.view);});
$('#home').onclick=e=>{e.preventDefault();show('gen');};
$('#q').addEventListener('input',renderNav);
$('#navsel').onchange=e=>selectType(e.target.value);
const focusFirstField=()=>{const el=$('#form input, #form select');if(el)el.focus();};
$('#btnEx').onclick=()=>{state.data[state.type]=clone(TMAP[state.type].ex);state.sample[state.type]=true;touched.delete(state.type);save();renderForm();renderOut();focusFirstField();toast('Example loaded. It is made-up sample data.');};
$('#btnClear').onclick=()=>{const t=TMAP[state.type];state.data[t.id]=blankFor(t);state.sample[t.id]=false;touched.delete(t.id);save();renderForm();renderOut();focusFirstField();};
$('#btnSave').onclick=saveToLib;
$('#sig').onchange=e=>{state.sig=e.target.value;save();renderOut();};
$('#fnno').oninput=e=>{state.fn=e.target.value;save();renderOut();};
$('#pin2').oninput=e=>{state.pin2=e.target.value;save();renderOut();};
$('#optCap').onchange=e=>{state.cap=e.target.checked;SETTINGS.cap=state.cap;save();renderOut();};

/* library export / import (JSON file) */
$('#libExport').onclick=()=>{
  if(!state.lib.length){toast('Nothing to export yet');return;}
  const blob=new Blob([JSON.stringify(exportLibrary(state),null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`pinpoint-library-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  toast('Library exported as a .json file');};
$('#libImport').onclick=()=>$('#impFile').click();
$('#impFile').onchange=e=>{const file=e.target.files&&e.target.files[0];if(!file)return;
  const r=new FileReader();r.onload=()=>{try{const res=importLibrary(state,String(r.result));save();counts();renderBib();toast(`Imported ${res.added} source${res.added===1?'':'s'} and ${res.footnotes} footnote${res.footnotes===1?'':'s'}`);}catch(err){toast(err.message,4200);}e.target.value='';};
  r.onerror=()=>toast('That file could not be read.');r.readAsText(file);};

$('#sig').value=state.sig;$('#fnno').value=state.fn;$('#pin2').value=state.pin2;$('#optCap').checked=state.cap!==false;
$('#typeCount').textContent='· '+TYPES.length+' SOURCE TYPES';
renderNav();renderForm();renderOut();counts();show(state.view||'gen');
