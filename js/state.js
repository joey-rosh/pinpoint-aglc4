/* Pinpoint · app state, storage and migrations.
   No DOM access. Depends on core.js and sources.js (TMAP). */
"use strict";

const STORE_KEY='pinpoint.aglc4';
const LEGACY_KEYS=['pinpoint.aglc4.v2','pinpoint.aglc4.v1'];
const SCHEMA=3;
const VIEWS=['gen','seq','bib','primer'];

const defaultState=()=>({version:SCHEMA,type:'case-rep',data:{},sample:{},sig:'',fn:'4',pin2:'',cap:true,lib:[],fns:[],view:'gen',editing:null});

/* localStorage can be missing, blocked (private windows, strict settings),
   full, or hold corrupted JSON. Every call degrades to "not saved" instead of throwing. */
const safeStorage={
  read(key){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}catch(e){return null;}},
  write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}},
  remove(key){try{localStorage.removeItem(key);}catch(e){}}
};

/* Upgrade older saved shapes to the current schema. Add a step here whenever SCHEMA changes. */
function migrate(s){
  if(!s||typeof s!=='object'||Array.isArray(s))return null;
  let v=Number(s.version)||2;          // v1 and v2 had no version field
  if(v<3){v=3;}                        // v2 → v3: same shape, version field added
  s.version=v;
  return s;
}

const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
const str=v=>typeof v==='string'?v:'';
const newId=()=>'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);

function cleanSource(x){
  if(!isObj(x)||!TMAP[x.t]||!isObj(x.d))return null;
  return {id:str(x.id)||newId(),t:x.t,d:x.d};
}

/* Keep only well-formed values; anything unexpected falls back to the default. */
function sanitise(s){
  const o=defaultState();
  if(!s)return o;
  if(TMAP[s.type])o.type=s.type;
  if(isObj(s.data))for(const k of Object.keys(s.data))if(TMAP[k]&&isObj(s.data[k]))o.data[k]=s.data[k];
  if(isObj(s.sample))for(const k of Object.keys(s.sample))o.sample[k]=!!s.sample[k];
  o.sig=str(s.sig);o.fn=str(s.fn)||o.fn;o.pin2=str(s.pin2);o.cap=s.cap!==false;
  if(Array.isArray(s.lib))o.lib=s.lib.map(cleanSource).filter(Boolean);
  const ids=new Set(o.lib.map(x=>x.id));
  if(Array.isArray(s.fns))o.fns=s.fns.filter(f=>isObj(f)&&ids.has(f.s)).map(f=>({s:f.s,pin:str(f.pin),sig:str(f.sig)}));
  if(VIEWS.includes(s.view))o.view=s.view;
  if(ids.has(s.editing))o.editing=s.editing;
  return o;
}

function loadState(){
  let s=safeStorage.read(STORE_KEY);
  if(!s)for(const k of LEGACY_KEYS){s=safeStorage.read(k);if(s)break;}
  return sanitise(migrate(s));
}
/* Returns false when the browser refused to store the data. */
function saveState(state){
  const ok=safeStorage.write(STORE_KEY,state);
  if(ok)LEGACY_KEYS.forEach(k=>safeStorage.remove(k));
  return ok;
}

/* ---------- library export / import ---------- */
function exportLibrary(state){
  return {app:'pinpoint-aglc4',schema:SCHEMA,exported:new Date().toISOString(),lib:state.lib,fns:state.fns};
}
/* Merge an exported file into the current state. Returns {added, footnotes} or throws a readable Error. */
function importLibrary(state,json){
  let obj;
  try{obj=typeof json==='string'?JSON.parse(json):json;}catch(e){throw new Error('That file isn’t valid JSON.');}
  if(!isObj(obj)||!Array.isArray(obj.lib))throw new Error('That file isn’t a Pinpoint library export.');
  const remap={};let added=0;
  for(const raw of obj.lib){
    const src=cleanSource(raw);if(!src)continue;
    const dup=state.lib.find(x=>x.t===src.t&&JSON.stringify(x.d)===JSON.stringify(src.d));
    if(dup){remap[src.id]=dup.id;continue;}
    const id=state.lib.some(x=>x.id===src.id)?newId():src.id;
    remap[src.id]=id;state.lib.push({...src,id});added++;
  }
  let footnotes=0;
  if(Array.isArray(obj.fns))for(const f of obj.fns){if(isObj(f)&&remap[f.s]){state.fns.push({s:remap[f.s],pin:str(f.pin),sig:str(f.sig)});footnotes++;}}
  return {added,footnotes};
}
