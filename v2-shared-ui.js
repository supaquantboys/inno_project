(()=>{
 const baseModal=renderModal;
 renderModal=function(){baseModal();const info=document.querySelector('#modalRoot .alert.info');if(info)info.innerHTML='V1 and V2 write to the same <b>b300_transactions</b> database. V2 batch/lab metadata is stored in <b>b300_shared_batch_metadata</b>.';};
 const baseRender=render;
 function patch(){
   const note=document.querySelector('.side-note');if(note)note.innerHTML='<b>Shared database</b><br>V1 and V2 use the same <code>b300_transactions</code> ledger and <code>b300_settings_locations</code> location list.';
   const head=document.querySelector('.internal-head');if(head){const p=head.querySelector('p');if(p)p.textContent='New action-first experience · shared transaction database';const pill=head.querySelector('.v2-pill');if(pill)pill.textContent='INVENTORY SPECIALIST';}
   document.querySelectorAll('.nav button').forEach(b=>{if(b.textContent.trim()==='V2 Settings')b.textContent='Shared Settings'});
   document.querySelectorAll('.metric .label').forEach(el=>{if(el.textContent.trim()==='V2 ledger entries')el.textContent='Shared ledger entries'});
   document.querySelectorAll('.metric .sub').forEach(el=>{if(el.textContent.includes('Independent from Legacy'))el.textContent='Visible in both V1 and V2'});
   if(ui.tab==='settings'){const h2=document.querySelector('.pagehead h2');if(h2)h2.textContent='Shared Settings';const p=document.querySelector('.pagehead p');if(p)p.textContent='Locations are shared with the Legacy workspace.';document.querySelectorAll('.card h3').forEach(h=>{if(h.textContent.trim()==='Data isolation')h.textContent='Shared data model'});document.querySelectorAll('.card p').forEach(p=>{if(p.textContent.includes('V2 reads/writes only'))p.innerHTML='Inventory ledger activity uses <code>b300_transactions</code>. Locations use <code>b300_settings_locations</code>. V2 operational state uses companion <code>b300_shared_batch_metadata</code>.';});}
   const clear=document.getElementById('clearV2');if(clear){clear.textContent='Refresh shared data';clear.onclick=()=>{state=loadState();ui.search='';render();toast('Shared database refreshed.')}}
 }
 render=function(){baseRender();patch();};
 render();
})();