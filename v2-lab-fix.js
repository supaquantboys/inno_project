// Lab UX refinement: keep send/record state while batch selection re-renders,
// and only expose batches that are eligible for the selected lab action.
const baseActionFields = actionFields;
actionFields = function(action, product, batchId) {
  if (action !== 'lab') return baseActionFields(action, product, batchId);
  const mode = ui.labMode || 'send';
  const batchSelect = (filter) => field('Batch','batchId','text',{
    required:true,
    value:batchId || '',
    options:batchOptions(product,batchId,filter),
    full:true
  });
  const modeField = field('Lab action','labMode','text',{
    required:true,
    value:mode,
    options:[
      {value:'send',label:'Send for analysis'},
      {value:'record',label:'Record lab results'}
    ]
  });
  if (mode === 'record') {
    return modeField
      + batchSelect(batch => batch.labStatus === 'In analysis')
      + field('THC %','thc','number',{required:true,min:0,max:100,step:'0.0001'})
      + field('Document / COA reference','document','text',{required:true,full:true,help:'Only batches previously sent for analysis are available.'});
  }
  return modeField
    + batchSelect(batch => batch.labStatus !== 'In analysis')
    + field('Sample %','percent','number',{required:true,min:0.001,max:100,step:'0.001',value:'1'})
    + field('Document / sample reference','document','text',{full:true});
};

const baseOpenAction = openAction;
openAction = function(action, product, batchId=null) {
  if (action === 'lab') {
    const batch = getBatch(batchId);
    ui.labMode = batch?.labStatus === 'In analysis' ? 'record' : 'send';
  }
  baseOpenAction(action, product, batchId);
  if (action !== 'lab') return;
  const form = document.getElementById('actionForm');
  if (!form) return;
  form.addEventListener('change', event => {
    if (event.target.name !== 'labMode') return;
    ui.labMode = event.target.value;
    ui.actionBatch = null;
    const dynamic = document.getElementById('dynamicFields');
    if (dynamic) dynamic.innerHTML = actionFields('lab', ui.actionProduct, null);
  });
};
