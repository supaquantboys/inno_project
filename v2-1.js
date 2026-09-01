const STORAGE = { state:'b300_v2_state', tx:'b300_v2_transactions', settings:'b300_v2_settings' };
const PRODUCTS = {
  seeds:{label:'Viable Seeds',short:'Seeds',unit:'units',decimals:0,max:9999,actions:['receive','send','loss','grow','move','adjust']},
  vcp:{label:'Vegetative Plants',short:'VCP',unit:'units',decimals:0,max:9999,actions:['receive','send','loss','lab','clone','grow','move','adjust']},
  wcp:{label:'Whole Plants',short:'WCP',unit:'units',decimals:0,max:9999,actions:['receive','send','loss','lab','harvest','move','adjust']},
  fm:{label:'Dried/Fresh Flowering kg',short:'FM',unit:'kg',decimals:3,max:null,actions:['receive','send','loss','package','lab','mix','process','move','adjust']},
  nfm:{label:'Dried/Fresh Non-flowering kg',short:'NFM',unit:'kg',decimals:3,max:null,actions:['receive','send','loss','package','lab','mix','process','move','adjust']},
  pi:{label:'Pure Intermediates kg',short:'PI',unit:'kg',decimals:3,max:null,actions:['receive','send','loss','package','lab','mix','process','move','adjust']},
  extracts:{label:'Finished Extracts mg THC',short:'Extracts',unit:'mg THC',decimals:0,max:9999999,actions:['receive','send','loss','move','adjust']},
  edible:{label:'Finished Edible mg THC',short:'Edible',unit:'mg THC',decimals:0,max:9999999,actions:['receive','send','loss','move','adjust']},
  topicals:{label:'Finished Topicals mg THC',short:'Topicals',unit:'mg THC',decimals:0,max:9999999,actions:['receive','send','loss','move','adjust']}
};
const ACTIONS = {
 receive:'Receive shipment',send:'Send shipment',loss:'Loss & destroy',package:'Package',lab:'Lab',clone:'Clone',mix:'Mix',grow:'Grow',harvest:'Harvest',process:'Process',move:'Move',adjust:'Adjust'
};
const CATEGORY = {
 receiveDomestic:'Quantity Received in Canada', receiveInternational:'Quantity Imported into Canada', sendDomestic:'Quantity Sold in Canada', sendInternational:'Quantity Exported Outside Canada', destroy:'Quantity Destroyed', loss:'Quantity Incurred as Drying or Processing Loss', package:'Quantity Packaged', lab:'Quantity Sent for Analysis', grow:'Quantity Taken for Further Processing or Planted', growToWcp:'Quantity Transferred to Whole Cannabis Plant', harvest:'Plant Harvested', production:'Total Production', further:'Quantity Taken for Further Processing or Planted', adjustment:'Manual Count Adjustment', move:'Non-B300 Movement'
};
const DEFAULT_LOCATIONS=['Vault A','Vault B','Grow Room 1','Grow Room 2','Dry Room','Processing Room','Lab Hold','Finished Goods'];
const nowIso=()=>new Date().toISOString();
const uid=(prefix)=>`${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random()*1296).toString(36).padStart(2,'0').toUpperCase()}`;
const productByLabel=(label)=>Object.entries(PRODUCTS).find(([,p])=>p.label===label)?.[0]||null;
const fmt=(qty,key)=>Number(qty||0).toLocaleString('en-CA',{minimumFractionDigits:PRODUCTS[key].decimals,maximumFractionDigits:PRODUCTS[key].decimals});
const esc=(s)=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const seedState=()=>({
  sequence:8,
  locations:[...DEFAULT_LOCATIONS],
  batches:[
    {id:'EAR-260901-001',product:'seeds',qty:240,location:'Vault A',status:'Available',labStatus:'Not required',createdAt:nowIso(),parents:[],notes:'Demo seed inventory'},
    {id:'EAR-260901-002',product:'vcp',qty:85,location:'Grow Room 1',status:'Available',labStatus:'Not sent',createdAt:nowIso(),parents:['EAR-260901-001'],notes:'Demo vegetative plants'},
    {id:'EAR-260901-003',product:'wcp',qty:42,location:'Grow Room 2',status:'Available',labStatus:'Not sent',createdAt:nowIso(),parents:['EAR-260901-002'],notes:'Demo whole plants'},
    {id:'MID-260901-004',product:'fm',qty:18.375,location:'Dry Room',status:'Available',labStatus:'Analyzed',thcLevel:'22.40',createdAt:nowIso(),parents:['EAR-260901-003'],notes:'Demo flowering material'},
    {id:'MID-260901-005',product:'nfm',qty:6.125,location:'Dry Room',status:'Available',labStatus:'Not sent',createdAt:nowIso(),parents:['EAR-260901-003'],notes:'Demo non-flowering material'},
    {id:'LAT-260901-006',product:'pi',qty:3.750,location:'Processing Room',status:'Available',labStatus:'Analyzed',thcLevel:'78.10',createdAt:nowIso(),parents:['MID-260901-004'],notes:'Demo pure intermediate'}
  ],
  transactions:[]
});
function loadState(){try{const raw=localStorage.getItem(STORAGE.state);if(raw)return JSON.parse(raw)}catch(e){}const s=seedState();saveState(s);return s}
function saveState(s){localStorage.setItem(STORAGE.state,JSON.stringify(s));localStorage.setItem(STORAGE.tx,JSON.stringify(s.transactions||[]));localStorage.setItem(STORAGE.settings,JSON.stringify({locations:s.locations||[]}))}
let state=loadState();
let ui={tab:'dashboard',product:null,batch:null,action:null,actionProduct:null,actionBatch:null,search:''};
function toast(msg){const old=document.querySelector('.toast');if(old)old.remove();const el=document.createElement('div');el.className='toast';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2600)}
function totalForProduct(key){return state.batches.filter(b=>b.product===key&&b.qty>0).reduce((a,b)=>a+Number(b.qty||0),0)}
function activeBatches(key=null){return state.batches.filter(b=>(!key||b.product===key)&&b.qty>0&&b.status!=='Closed')}
function getBatch(id){return state.batches.find(b=>b.id===id)}
function nextBatchId(product){state.sequence=(state.sequence||0)+1;const stage=['seeds','vcp','wcp'].includes(product)?'EAR':['fm','nfm'].includes(product)?'MID':'LAT';const d=new Date(),stamp=`${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;return `${stage}-${stamp}-${String(state.sequence).padStart(3,'0')}`}
function normalizeQty(v,key){const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error('Enter a valid non-negative quantity.');const meta=PRODUCTS[key];if(meta.decimals===0&&!Number.isInteger(n))throw new Error(`${meta.short} must use whole numbers.`);if(meta.max!=null&&n>meta.max)throw new Error(`${meta.short} cannot exceed ${meta.max.toLocaleString('en-CA')} ${meta.unit} per entry.`);return Number(n.toFixed(meta.decimals))}
function ensureAvailable(batch,qty){if(!batch)throw new Error('Select a valid batch.');if(qty<=0)throw new Error('Quantity must be greater than zero.');if(qty>Number(batch.qty)+1e-9)throw new Error(`Cannot deduct ${qty}; batch ${batch.id} only has ${fmt(batch.qty,batch.product)} ${PRODUCTS[batch.product].unit}.`)}
function addTx({action,type,product,batchId,quantity,b300Category,location,linked=[],note=''}){state.transactions.unshift({id:uid('V2TX'),timestamp:nowIso(),action,type,product,batchId,quantity:Number(quantity||0),unit:PRODUCTS[product]?.unit||'',b300Category,location:location||'',linkedBatchIds:linked,note});}
function createBatch({product,qty,location,status='Available',labStatus='Not sent',parents=[],notes=''}){const id=nextBatchId(product);const b={id,product,qty:Number(qty),location,status,labStatus,createdAt:nowIso(),parents:[...parents],notes};state.batches.unshift(b);return b}
function closeIfEmpty(b){if(Number(b.qty)<=1e-9){b.qty=0;b.status='Closed'}}
function commit(msg){saveState(state);render();toast(msg)}
function actionAllowed(product,action){return PRODUCTS[product]?.actions.includes(action)}
function field(label,name,type='text',opts={}){const {value='',required=false,placeholder='',min='',max='',step='',options=null,full=false,help=''}=opts;let control;if(options){control=`<select name="${name}" ${required?'required':''}>${options.map(o=>`<option value="${esc(o.value)}" ${String(o.value)===String(value)?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`}else if(type==='textarea'){control=`<textarea name="${name}" ${required?'required':''} placeholder="${esc(placeholder)}">${esc(value)}</textarea>`}else{control=`<input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} placeholder="${esc(placeholder)}" ${min!==''?`min="${min}"`:''} ${max!==''?`max="${max}"`:''} ${step!==''?`step="${step}"`:''}/>`}return `<div class="field ${full?'full':''}"><label>${esc(label)}${required?' *':''}</label>${control}${help?`<small>${esc(help)}</small>`:''}</div>`}
function productOptions(selected=''){return Object.entries(PRODUCTS).map(([k,p])=>({value:k,label:p.short+(p.unit?` — ${p.unit}`:'')}))}
function locationOptions(selected=''){return state.locations.map(x=>({value:x,label:x}))}
function batchOptions(product,selected='',filter=()=>true){return [{value:'',label:'Select batch…'},...activeBatches(product).filter(filter).map(b=>({value:b.id,label:`${b.id} — ${fmt(b.qty,b.product)} ${PRODUCTS[b.product].unit} — ${b.location}`}))]}
