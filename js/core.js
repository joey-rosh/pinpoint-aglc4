/* Pinpoint · AGLC4 citation core.
   Pure formatting and citation logic with no DOM access, so it also runs under Node for the tests. */
"use strict";
"use strict";
/* ================= text helpers ================= */
const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function sq(s){return s.replace(/(^|[\s(\[{—–\/-])"/g,'$1“').replace(/"/g,'”').replace(/(^|[\s(\[{—–“\/-])'/g,'$1‘').replace(/'/g,'’');}
const nestQ=s=>s.replace(/‘([^‘]*?)’(?=[\s,.;:!?)\]]|$)/g,'“$1”');
const I=s=>s?`<i>${s}</i>`:'';
const Q=s=>s?`‘${nestQ(s)}’`:'';
const J=(...a)=>a.filter(Boolean).join(', ');
const SP=(...a)=>a.filter(Boolean).join(' ');
const P=s=>s?` (${s})`:'';
const pl=s=>String(s).replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const miss=l=>`<span class="miss">[${l}]</span>`;
const MINOR=new Set(('a an the and but or nor yet so as at by for from in into of off on onto per than to upon via with within without before after about above across against along amid among around behind below beneath beside between beyond during except inside outside over through throughout toward towards under underneath until unto v vs versus following regarding concerning').split(' '));
function capSeg(seg,doCap,minorOk){
  if(!seg||seg[0]==='&')return seg;
  const m=seg.match(/^([^A-Za-z]*)([A-Za-z].*)$/); if(!m)return seg;
  const pre=m[1],w=m[2],bare=w.replace(/[^A-Za-z]/g,'').toLowerCase();
  if(/[A-Z]/.test(w.slice(1))||/\d/.test(w))return seg; // IceTV, ASIC, 3D
  if(!doCap&&minorOk&&MINOR.has(bare))return pre+w.toLowerCase();
  if(doCap||!MINOR.has(bare))return pre+w[0].toUpperCase()+w.slice(1);
  return seg;
}
function tc(s){
  const parts=s.split(/(\s+)/);let first=true;
  for(let i=0;i<parts.length;i++){const w=parts[i];if(!w.trim())continue;
    parts[i]=w.split('-').map((seg,j)=>j>0?capSeg(seg,true,false):capSeg(seg,first,true)).join('-');
    first=/[:?!—]$/.test(w)||w==='–'||w==='—';}
  return parts.join('');
}
function nd(s){
  if(!s)return s;let m;
  if(m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)){if(+m[2]>=1&&+m[2]<=12)return `${+m[3]} ${MON[m[2]-1]} ${m[1]}`;}
  if(m=s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/)){if(+m[2]>=1&&+m[2]<=12)return `${+m[1]} ${MON[m[2]-1]} ${m[3]}`;}
  s=s.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi,'$1').replace(/^([A-Z][a-z]+day),\s+/,'$1 ');
  if(m=s.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/)){const i=MON.findIndex(x=>x.toLowerCase().startsWith(m[1].toLowerCase().slice(0,3)));if(i>=0)return `${+m[2]} ${MON[i]} ${m[3]}`;}
  if(m=s.match(/^(\d{1,2})\s+([A-Za-z]+)\.?,?\s+(\d{4})$/)){const i=MON.findIndex(x=>x.toLowerCase().startsWith(m[2].toLowerCase().slice(0,3)));if(i>=0)return `${+m[1]} ${MON[i]} ${m[3]}`;}
  return s;
}
const dash=s=>s.replace(/(\d)\s*-\s*(\d)/g,'$1–$2').replace(/\]\s*[-–]\s*\[/g,']–[');
function paraPin(v){
  if(!v||/[\[\]]/.test(v))return v;
  return v.split(/\s*,\s*/).map(p=>{let m;if(m=p.match(/^(\d+)$/))return `[${m[1]}]`;if(m=p.match(/^(\d+)\s*[–-]\s*(\d+)$/))return `[${m[1]}]–[${m[2]}]`;return p;}).join(', ');
}
function ord(v){const m=String(v).match(/^(\d+)/);if(!m)return v;const n=+m[1];const s=(n%100>=11&&n%100<=13)?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th');return `${n}<sup>${s}</sup>`;}
function cleanGiven(g){
  const t=g.replace(/\.(?=\S)/g,'. ').split(/\s+/).filter(Boolean),out=[];let buf='';
  for(const w of t){const b=w.replace(/\./g,'');if(/^[A-Z]{1,3}$/.test(b)&&(w.includes('.')||b.length===1||buf)){buf+=b;}else{if(buf){out.push(buf);buf='';}out.push(w);}}
  if(buf)out.push(buf);return out.join(' ');
}
function caseClean(v,w){
  let o=v;v=v.replace(/\s*(&amp;|and)\s+(Anor|Ors|Another|Others)\b\.?/gi,'');
  if(v!==o)w.push(['fix','Removed “& Anor / & Ors”. Cite only the first party on each side (r 2.1.1).']);
  o=v;v=v.replace(/\s+vs?\.?\s+/g,' v ');if(v!==o)w.push(['fix','Parties are separated by “v” with no full stop (r 2.1.11).']);
  o=v;v=v.replace(/\b(Pty|Ltd|Co|Inc|Corp|Bros|No)\./g,'$1');if(v!==o)w.push(['fix','Removed full stops from abbreviations (r 1.6.1).']);
  o=v;v=v.replace(/\((No\.? ?\d+)\)/g,(m,x)=>'['+x.replace('.','').replace(/No(\d)/,'No $1')+']');if(v!==o)w.push(['fix','Numbered decisions take square brackets, eg “[No 2]” (r 2.1.13).']);
  return v;
}

/* ================= authors ================= */
const pname=a=>a.kind==='body'?a.name:SP(a.given,a.surname);
function authorsText(list,bib,role){
  const L=(list||[]).filter(a=>a.kind==='body'?a.name:(a.given||a.surname));if(!L.length)return '';
  const nm=(a,i)=>(bib&&i===0&&a.kind!=='body'&&a.surname)?(a.surname+(a.given?', '+a.given:'')):pname(a);
  let s;if(L.length>3)s=nm(L[0],0)+' et al';else if(L.length===1)s=nm(L[0],0);else s=L.slice(0,-1).map(nm).join(', ')+' and '+nm(L[L.length-1],L.length-1);
  if(role)s+=L.length>1?' (eds)':' (ed)';return s;
}
function authorsShort(list,role){
  const L=(list||[]).filter(a=>a.kind==='body'?a.name:(a.given||a.surname));if(!L.length)return '';
  const sn=a=>a.kind==='body'?a.name:(a.surname||a.given);
  let s;if(L.length>3)s=sn(L[0])+' et al';else if(L.length===1)s=sn(L[0]);else s=L.slice(0,-1).map(sn).join(', ')+' and '+sn(L[L.length-1]);
  if(role)s+=L.length>1?' (eds)':' (ed)';return s;
}
const hasPeople=list=>(list||[]).some(a=>a.kind!=='body'&&(a.given||a.surname));
const hasAny=list=>(list||[]).some(a=>a.kind==='body'?a.name:(a.given||a.surname));

/* ================= field constructors ================= */
const T=(id,label,o={})=>({id,label,t:'text',...o});
const S=(id,label,opts,o={})=>({id,label,t:'select',opts,...o});
const C=(id,label,o={})=>({id,label,t:'check',...o});
const AU=(id='au',label='Author(s)',o={})=>({id,label,t:'authors',...o});
const PIN=(ph='',help='',o={})=>T('pin','Pinpoint',{pin:1,ph,help,...o});
const DATE=(id='date',label='Full date',o={})=>T(id,label,{date:1,ph:'21 September 2026',...o});
const person=(given,surname)=>({kind:'person',given,surname});
const body=name=>({kind:'body',name});

/* shared case pieces */
const jjPin=d=>(d.pin?', '+d.pin:'')+(d.pin&&d.jj?` (${d.jj})`:'');
function warnJJ(d){if(d.jj&&!d.pin&&!d._bib)d._w.push(['warn','Judicial officers are identified only after a pinpoint (r 2.4.1). Add a pinpoint or clear the judges field.']);}
const caseRep=d=>{warnJJ(d);return `${I(d.name)} ${d.yb==='square'?`[${d.year}]`:`(${d.year})`}${d.vol?' '+d.vol:''} ${d.rep} ${d.page}`+jjPin(d)+P(d.court);};
const caseMnc=d=>{warnJJ(d);return `${I(d.name)} [${d.year}] ${d.court} ${d.num}`+jjPin(d);};
const YB=S('yb','Year brackets',[['round','( ) series organised by volume'],['square','[ ] series organised by year']],{help:'Use [ ] when the series has no volume numbering by itself, eg [1932] AC 562.'});

/* reports & papers */
const rptCite=(author,d)=>J(author,I(d.title))+` (${J(SP(d.dtype,d.dno?'No '+d.dno:''),d.date)})`+(d.vol?` vol ${d.vol}`+(d.pin?', '+d.pin:''):(d.pin?' '+d.pin:''));
const paperCite=d=>J(authorsText(d.au,d._bib),Q(d.title))+` (${J(SP(d.dtype,d.dno?'No '+d.dno:''),d.inst,d.date)})`+(d.pin?' '+d.pin:'');
const RPT_TAIL=()=>[T('dtype','Document type',{ph:'Report',help:'eg Report, Final Report, Interim Report, Discussion Paper'}),T('dno','Document number',{ph:'129',help:'Only if the document is part of a numbered series.'}),DATE('date','Date',{help:'As much of the date as appears, eg “December 2015”.'}),T('vol','Volume',{ph:'2'}),PIN('57 [3.41]')];
const PAPER=(dtypePh,instLabel,instPh)=>[AU(),T('title','Title',{w:2,req:1,title:1}),T('dtype','Document type',{ph:dtypePh}),T('dno','Number',{ph:'24-07'}),T('inst',instLabel,{w:2,ph:instPh}),DATE('date','Date'),PIN('9')];

/* legislation */
const actCite=(d,italic=true)=>{const t=SP(d.title,d.year);return SP(italic?I(t):t,`(${d.jur})`,d.pin);};
const LEGF=(ph,yph,pph)=>[T('title','Title (without year)',{w:2,req:1,ph}),T('year','Year',{req:1,ph:yph}),T('jur','Jurisdiction',{req:1,list:'dl-jur',ph:'Vic'}),PIN(pph,'eg s 5(1), ss 12–14, pt 3 div 2, sch 1 item 4, s 3 (definition of ‘data’)',{nodash:1,w:2})];

/* ================= settings ================= */
const SETTINGS={cap:true};
const clone=o=>JSON.parse(JSON.stringify(o));

/* ================= preparation ================= */
function fieldsOf(t){const f=[...t.f];if(t.st!==false)f.push(T('st','Short title (optional)',{w:2,help:'Introduced at the end of the first citation and used in later references (r 1.4.4).'}));if(t.url){f.push(T('url','URL',{w:2,raw:1,ph:'https://…'}));f.push(T('arch','Archived permalink (optional)',{w:2,raw:1,ph:'https://perma.cc/…'}));}return f;}
function prep(t,raw,bib){
  const d={_w:[],_bib:bib};
  for(const f of fieldsOf(t)){
    let v=raw[f.id];
    if(f.t==='authors'){d[f.id]=(Array.isArray(v)?v:[]).filter(a=>a&&typeof a==='object').map(a=>({kind:a.kind||'person',given:cleanGiven(sq(esc((a.given||'').trim()))),surname:sq(esc((a.surname||'').trim())),name:sq(esc((a.name||'').trim()))}));continue;}
    if(f.t==='check'){d[f.id]=!!v&&(!f.when||f.when(raw));continue;}
    if(f.t==='select'){d[f.id]=f.opts.some(o=>o[0]===v)?v:f.opts[0][0];continue;}
    v=String(v??'').trim();
    if(f.when&&!f.when(raw)){d[f.id]='';continue;}
    if(bib&&f.pin){d[f.id]='';continue;}
    v=f.raw?esc(v):sq(esc(v));
    if(f.date)v=nd(v);
    if((f.date||f.id==='year')&&!f.raw)v=dash(v);
    if(f.title&&SETTINGS.cap)v=tc(v);
    if(f.pin&&!f.nodash)v=dash(v);
    if(f.para&&(typeof f.para!=='function'||f.para(raw)))v=paraPin(v);
    if(f.clean==='case')v=caseClean(v,d._w);
    if(f.clean==='name')v=cleanGiven(v);
    if(!v&&f.req)v=miss(f.label.replace(/\s*\(.*\)$/,''));
    d[f.id]=v;
  }
  return d;
}
const stStyle=t=>t.stS||(t.k==='case'||t.k==='leg'||t.k==='tr'?'i':(t.ts==='i'?'i':(t.ts==='q'?'q':'')));
const stFirst=(t,st)=>`(‘${stStyle(t)==='i'?I(st):st}’)`;
const stLater=(t,st)=>{const s=stStyle(t);return s==='i'?I(st):s==='q'?Q(st):st;};
function titleOf(t,d){const v=d[t.tf||'title']||'';return t.ts==='i'?I(v):t.ts==='q'?Q(v):v;}
function auOf(t,d){const id=t.auF?t.auF(d):(t.f.some(f=>f.id==='au'&&f.t==='authors')?'au':null);return id?d[id]:null;}
function nameHead(t,d){
  if(t.k==='case')return I(d.name);
  if(t.k==='leg'){const nt=t.ni?SP(d.title,d.year):I(SP(d.title,d.year));return d.jur?`${nt} (${d.jur})`:nt;}
  if(t.k==='tr')return I(d.title);
  return titleOf(t,d);
}
function fullCite(t,d,sig){
  let c=t.cite(d);
  if(t.url&&d.url)c+=` &lt;${d.url}&gt;`;
  if(t.url&&d.arch)c+=`${d.url?',':''} archived at &lt;${d.arch}&gt;`;
  if(d.st&&t.st!==false)c+=' '+stFirst(t,d.st);
  c=c.replace(/\s+/g,' ').trim();
  return (sig?sig+' ':'')+c+(/[.]$/.test(pl(c))?'':'.');
}
function bibEntry(t,raw){const d=prep(t,raw,true);let c=t.cite(d);if(t.url&&d.url)c+=` &lt;${d.url}&gt;`;if(t.url&&d.arch)c+=`${d.url?',':''} archived at &lt;${d.arch}&gt;`;return c.replace(/\s+/g,' ').trim().replace(/\.$/,'');}
function subRef(t,d,fn,pin2,sig){
  const n=` (n ${fn})`,p=pin2?' '+pin2:'',s=sig?sig+' ':'';
  let main,alt=null;
  if(t.subHead){main=t.subHead(d);}
  else if(t.k==='case'||t.k==='leg'||t.k==='tr'){main=d.st?stLater(t,d.st):nameHead(t,d);}
  else{
    const au=auOf(t,d);
    if(au&&hasPeople(au)){const sn=authorsShort(au,t.role&&t.role(d));
      if(d.st){main=`${sn}, ${stLater(t,d.st)}`;alt=['If this is the only work by this author you cite',`${s}${sn}${n}${p}.`];}
      else{main=sn;alt=['If you cite several works by this author',`${s}${sn}, ${titleOf(t,d)}${n}${p}.`];}
    }else if(au&&hasAny(au)){main=d.st?stLater(t,d.st):authorsShort(au);}
    else main=d.st?stLater(t,d.st):titleOf(t,d);
  }
  return {main:`${s}${main}${n}${p}.`,alt};
}
function inText(t,d){
  if(t.txt){const r=t.txt(d);if(d.st&&t.st!==false&&!/‘/.test(pl(r.first)))r.first+=' '+stFirst(t,d.st);return r;}
  const head=nameHead(t,d);
  if(t.k==='case'||t.k==='leg'||t.k==='tr')return {first:head+(d.st?' '+stFirst(t,d.st):''),later:d.st?stLater(t,d.st):head};
  return {first:head+(d.st?' '+stFirst(t,d.st):''),later:d.st?stLater(t,d.st):head};
}
/* r 1.13 ordering: first author's surname, then first name, then each later author's
   first name and surname (a work with fewer authors sorts first), then title ignoring "The".
   SEP is the lowest code point, so a missing co-author sorts before any name. */
const SEP=String.fromCharCode(1);
const normKey=s=>pl(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/^[\s‘’“”'"(\[]+/,'').replace(/^the\s+/i,'').toLowerCase().trim();
function sortKey(t,raw){
  const d=prep(t,raw,true);const au=auOf(t,d);
  if(!t.sort&&au&&hasAny(au)){
    const L=au.filter(a=>a.kind==='body'?a.name:(a.given||a.surname)).slice(0,4),slots=[];
    L.forEach((a,i)=>{if(a.kind==='body')slots.push(normKey(a.name),'');else if(i===0)slots.push(normKey(a.surname||a.given),normKey(a.surname?a.given:''));else slots.push(normKey(a.given),normKey(a.surname));});
    while(slots.length<8)slots.push('');
    return slots.join(SEP)+SEP+normKey(titleOf(t,d));
  }
  return normKey(t.sort?t.sort(d):bibEntry(t,raw));
}
const byKey=(a,b)=>a.k<b.k?-1:a.k>b.k?1:0;
/* Group saved sources into AGLC bibliography sections, sorted and de-duplicated. */
function bibliography(lib,tmap){
  const groups={A:[],B:[],C:[],D:[],E:[]};
  for(const it of lib){const t=tmap[it.t];if(!t)continue;groups[t.sec].push({k:sortKey(t,it.d),h:bibEntry(t,it.d)});}
  const res=[];
  for(const s of 'ABCDE'){const g=groups[s];if(!g.length)continue;g.sort(byKey);const seen=new Set();res.push({sec:s,entries:g.filter(x=>!seen.has(x.h)&&seen.add(x.h)).map(x=>x.h)});}
  return res;
}
const blankFor=t=>{const d={};for(const f of fieldsOf(t)){if(f.t==='select')d[f.id]=f.opts[0][0];else if(f.t==='authors')d[f.id]=[{kind:'person',given:'',surname:''}];}return d;};
const ibidText=(sig,pin)=>(sig?sig+' ibid':'Ibid')+(pin?' '+pin:'')+'.';
/* r 1.4.1 / 1.4.3: full citation on first use, Ibid when the previous footnote cites the
   same source, otherwise a cross-reference to the footnote holding the full citation. */
function sequence(lib,fns,tmap){
  const out=[],first={};
  fns.forEach((f,i)=>{
    const item=lib.find(x=>x.id===f.s);
    if(!item||!tmap[item.t]){out.push({mode:'x',html:'<span class="miss">[source removed from library]</span>'});return;}
    const t=tmap[item.t];
    const d=prep(t,{...clone(item.d),pin:f.pin||'',jj:'',spk:''},false);const pin=d.pin||'',sig=f.sig||'';
    const prev=i>0?fns[i-1]:null;
    if(prev&&prev.s===f.s){
      const pp=prep(t,{...clone(item.d),pin:prev.pin||''},false).pin||'';
      if(pl(pin)===pl(pp)){out.push({mode:'ibid',html:ibidText(sig,'')});return;}
      if(pin){out.push({mode:'ibid',html:ibidText(sig,pin)});return;}
    }
    if(first[f.s]!==undefined){out.push({mode:'sub',html:subRef(t,d,first[f.s]+1,pin,sig).main});return;}
    first[f.s]=i;out.push({mode:'full',html:fullCite(t,d,sig)});
  });
  return out;
}
