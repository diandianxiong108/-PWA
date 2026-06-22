(function(){
const STORAGE_KEY='task-manager-v2-data';
const LEGACY_KEY='appCache';
const COLOR={每日:'#64b5f6',项目:'#ce93d8',临时:'#ffb74d',循环:'#81c784',记录:'#90a4ae'};
const HOLIDAYS_2026={
  '2026-01-01':'元旦',
  '2026-02-16':'除夕',
  '2026-02-17':'春节',
  '2026-02-18':'初二',
  '2026-02-19':'初三',
  '2026-02-20':'初四',
  '2026-02-21':'初五',
  '2026-02-22':'初六',
  '2026-04-05':'清明',
  '2026-05-01':'劳动节',
  '2026-05-02':'劳动节',
  '2026-05-03':'劳动节',
  '2026-06-19':'端午',
  '2026-09-25':'中秋',
  '2026-10-01':'国庆',
  '2026-10-02':'国庆',
  '2026-10-03':'国庆',
  '2026-10-04':'国庆',
  '2026-10-05':'国庆',
  '2026-10-06':'国庆',
  '2026-10-07':'国庆'
};
const originalFetch=window.fetch.bind(window);
window.fetch=function(input,init){const native=window.Capacitor&&typeof window.Capacitor.isNativePlatform==='function'&&window.Capacitor.isNativePlatform();if(native&&typeof input==='string'&&input.startsWith('/.netlify/functions/'))input='https://soft-douhua-52d678.netlify.app'+input;return originalFetch(input,init)};
const SECTION_IDS=['dailySection','projectSection','cyclicSection','tempSection','healthSection','birthdaySection','billSection','extraSection','inspireSection','notesSection','reviewSection','badgeSection','wishSection'];
let currentModule='home';
let selectedDay=todayStr();
let toastTimer=null;

function clone(value){return JSON.parse(JSON.stringify(value))}
function dateKey(value){const d=value instanceof Date?value:new Date(value);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function nowISO(){return new Date().toISOString()}
function parseJSON(value,fallback){try{return JSON.parse(value)}catch(e){return fallback}}
function hashId(value){let h=0;for(let i=0;i<value.length;i++)h=((h<<5)-h+value.charCodeAt(i))|0;return Math.abs(h)||1}
function toast(text){let el=document.getElementById('v2Toast');if(!el){el=document.createElement('div');el.id='v2Toast';el.className='v2-toast';document.body.appendChild(el)}el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
window.v2Toast=toast;
window.openTaskCalendar=openTaskCalendar;
window.syncTaskReminder=syncTaskReminder;

function defaultV2(){return{
  schemaVersion:2,
  createdAt:nowISO(),
  dayPlans:{},
  emotionLogs:[],
  archives:{daySummaries:[],ocrCleanupLog:[]},
  planner:{
    profile:{maxTaskTypes:3,insertLowResistance:true,choresPerDay:1,quietStart:'22:30',quietEnd:'07:30',principles:'一天不超过三种任务类型；精力低时优先低阻力任务；家务少量穿插。'},
    batches:[],activeBatchId:null,habitSignals:{},suggestions:[]
  },
  financeLink:{category:'保研小红书主包',wishId:null,linkedEntryIds:[],pendingEntryIds:[]},
  notifications:{regularEnabled:true,alarmEnabled:true,nativeReady:false,scheduled:{}},
  reviewMeta:{generatedKeys:[],lastAutoCheck:null,pending:[]},
  cloud:{provider:'jsonbin',binId:'',apiKey:'',lastUploadedAt:null,lastRestoreAt:null,lastCompressedAt:null,remoteDigest:null,lastError:null},
  migration:{source:null,migratedAt:null,legacyHistoryUnavailable:true}
}}

function ensureDataShape(){
  const defaults=defaultV2();
  appData.schemaVersion=2;
  appData.v2=Object.assign(defaults,appData.v2||{});
  appData.v2.planner=Object.assign(defaults.planner,appData.v2.planner||{});
  appData.v2.planner.profile=Object.assign(defaults.planner.profile,appData.v2.planner.profile||{});
  appData.v2.financeLink=Object.assign(defaults.financeLink,appData.v2.financeLink||{});
  appData.v2.notifications=Object.assign(defaults.notifications,appData.v2.notifications||{});
  appData.v2.reviewMeta=Object.assign(defaults.reviewMeta,appData.v2.reviewMeta||{});
  appData.v2.cloud=Object.assign(defaults.cloud,appData.v2.cloud||{});
  appData.v2.archives=Object.assign(defaults.archives,appData.v2.archives||{});
  appData.v2.dayPlans=appData.v2.dayPlans||{};
  appData.v2.emotionLogs=Array.isArray(appData.v2.emotionLogs)?appData.v2.emotionLogs:[];
  appData.tasks=Array.isArray(appData.tasks)?appData.tasks:[];
  appData.inspirations=Array.isArray(appData.inspirations)?appData.inspirations:[];
  appData.notes=Array.isArray(appData.notes)?appData.notes:[];
  appData.reviews=Array.isArray(appData.reviews)?appData.reviews:[];
  appData.birthdays=Array.isArray(appData.birthdays)?appData.birthdays:[];
  appData.badges=Array.isArray(appData.badges)?appData.badges:[];
  appData.wishes=Array.isArray(appData.wishes)?appData.wishes:[];
  appData.records=appData.records||{categories:{income:[],expense:[]},entries:[]};
  appData.records.entries=Array.isArray(appData.records.entries)?appData.records.entries:[];
  appData.records.categories=appData.records.categories||{income:[],expense:[]};
}

function loadIsolatedData(){
  const own=parseJSON(localStorage.getItem(STORAGE_KEY),null);
  if(own&&typeof own==='object'){
    Object.assign(appData,own);ensureDataShape();return 'v2';
  }
  const legacy=parseJSON(localStorage.getItem(LEGACY_KEY),null);
  if(legacy&&typeof legacy==='object'){
    delete legacy.cachedAt;Object.assign(appData,clone(legacy));ensureDataShape();
    appData.v2.migration={source:'legacy-local-cache',migratedAt:nowISO(),legacyHistoryUnavailable:true};
    persist();return 'legacy';
  }
  ensureDataShape();persist();return 'empty';
}

function persist(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(appData));return true}catch(e){toast('本地保存失败，请导出备份');return false}
}
function esc(value){return String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}
function getHolidayLabel(ds){return HOLIDAYS_2026[ds]||''}
function getBirthdayEntries(ds){const dt=new Date(ds+'T12:00:00'),m=dt.getMonth()+1,d=dt.getDate();return(appData.birthdays||[]).filter(x=>Number(x.month)===m&&Number(x.day)===d)}
function getEmotionEntries(ds){return(appData.v2?.emotionLogs||[]).filter(x=>x.date===ds)}
function getDayNotes(ds){return(appData.notes||[]).filter(x=>x.date===ds)}
function getDayInspirationEntries(ds){return(appData.inspirations||[]).filter(x=>x.date===ds)}
function getTimeSlotLabel(timeText){
  if(!timeText)return'未定时';
  const hour=Number(String(timeText).split(':')[0]||0);
  if(hour<12)return'上午';
  if(hour<18)return'下午';
  return'晚上'
}
function intensityFromText(text){
  if(/崩溃|特别难受|非常难受|压垮|爆炸|受不了/.test(text))return'重';
  if(/好累|焦虑|烦|难受|委屈|低落|沮丧|压力/.test(text))return'中';
  return'轻'
}
function emotionFromText(text){
  if(/开心|轻松|高兴|愉快|满足/.test(text))return'开心';
  if(/委屈/.test(text))return'委屈';
  if(/烦|烦躁/.test(text))return'烦躁';
  if(/焦虑|紧张/.test(text))return'焦虑';
  if(/累|疲惫/.test(text))return'疲惫';
  if(/难受|低落|沮丧/.test(text))return'低落';
  return''
}
function buildEmotionLog(text,extra={}){
  const emotion=emotionFromText(text);if(!emotion)return null;
  return{id:'emo-'+genId(),date:extra.date||todayStr(),event:extra.event||text.slice(0,120),emotion,intensity:extra.intensity||intensityFromText(text),source:extra.source||'ai-chat',rawText:text,createdAt:nowISO()}
}
function saveEmotionLog(entry){
  if(!entry)return false;
  appData.v2.emotionLogs.unshift(entry);
  appData.v2.emotionLogs=appData.v2.emotionLogs.slice(0,500);
  persist();
  return true
}

function recurrenceOn(task,ds){
  const d=new Date(ds+'T12:00:00'),base=new Date('2026-01-01T12:00:00');
  const diff=Math.floor((d-base)/86400000);
  switch(task.frequency){
    case'隔天':return diff%2===0;
    case'每3天':return diff%3===0;
    case'工作日':return d.getDay()>=1&&d.getDay()<=5;
    case'自定义':{const map=[7,1,2,3,4,5,6];return(task.customDays||[]).includes(map[d.getDay()])}
    default:return true;
  }
}

function taskDueOn(task,ds){
  if(task.type==='每日')return recurrenceOn(task,ds);
  if(task.type==='项目')return task.scheduledDate?task.scheduledDate===ds:ds===todayStr();
  if(task.type==='临时'){
    if(task.scheduledDate)return task.scheduledDate===ds;
    return ds===todayStr()&&!task.hiddenToday;
  }
  if(task.type==='循环')return ds>=getCyclicNext(task);
  return false;
}

function taskDone(task,ds){
  if(task.type==='每日')return ds===todayStr()?!!task.completedToday:task.lastCompletedDate===ds;
  if(task.type==='项目')return !!(task.steps&&task.steps.length&&task.steps.every(s=>s.done));
  if(task.type==='循环')return task.lastDoneDate===ds;
  return !!task.completed;
}

function itemFromTask(task,ds){return{
  id:'task-'+task.id+'-'+ds,sourceTaskId:task.id,title:task.title,type:task.type,
  status:taskDone(task,ds)?'done':'todo',plannedStart:task.scheduledStart||task.alarmTime||'',plannedEnd:task.scheduledEnd||'',
  timeLabel:task.timeLabel||'',important:!!task.important,reminderMode:task.important?'alarm':'notification',
  alarmTime:task.alarmTime||'',createdAt:nowISO(),completedAt:taskDone(task,ds)?nowISO():null
}}

function getPlan(ds,create){
  let plan=appData.v2.dayPlans[ds];
  if(!plan&&create){plan={date:ds,items:[],note:'',createdAt:nowISO(),updatedAt:nowISO()};appData.v2.dayPlans[ds]=plan}
  return plan||null;
}

function upsertPlanItem(ds,item){
  const plan=getPlan(ds,true);const i=plan.items.findIndex(x=>x.id===item.id||item.sourceTaskId&&x.sourceTaskId===item.sourceTaskId);
  if(i>=0)plan.items[i]=Object.assign(plan.items[i],item);else plan.items.push(item);
  plan.updatedAt=nowISO();return item;
}

function predictedItems(ds){
  const stored=getPlan(ds,false);const result=stored?clone(stored.items):[];
  const known=new Set(result.filter(x=>x.sourceTaskId).map(x=>x.sourceTaskId));
  appData.tasks.forEach(task=>{if(!known.has(task.id)&&taskDueOn(task,ds))result.push(itemFromTask(task,ds))});
  return result;
}

function syncTodaySnapshot(){
  const ds=todayStr();const plan=getPlan(ds,true);
  appData.tasks.forEach(task=>{
    if(!taskDueOn(task,ds))return;
    const fresh=itemFromTask(task,ds),old=plan.items.find(x=>x.sourceTaskId===task.id);
    if(old)Object.assign(old,fresh,{createdAt:old.createdAt||fresh.createdAt});else plan.items.push(fresh);
  });
  plan.updatedAt=nowISO();
}

function displayItems(ds){
  if(ds===todayStr())syncTodaySnapshot();
  const items=predictedItems(ds);
  (appData.notes||[]).filter(n=>n.date===ds&&n.done).forEach(n=>{if(!items.some(x=>x.id==='note-'+n.id))items.push({id:'note-'+n.id,title:n.title||n.text,type:'记录',status:'done',important:false,timeLabel:'额外完成'})});
  return items;
}

function patchLegacyHooks(){
  const legacyRenderCalendar=renderCalendar;
  saveCache=persist;
  loadCache=()=>!!parseJSON(localStorage.getItem(STORAGE_KEY),null);
  syncFromRemote=async()=>false;
  _putRemote=async()=>false;
  toJSONBin=function(){syncTodaySnapshot();persist();refreshPlannerStats();schedulePendingReminders();};
  checkDailyReset=function(){const ds=todayStr();if(appData.lastVisitDate!==ds){appData.tasks.forEach(t=>{if(t.type==='每日')t.completedToday=false;if(t.type==='临时')t.hiddenToday=false});appData.lastVisitDate=ds;syncTodaySnapshot();persist();render()}};
  getTasksForDate=function(date){return displayItems(dateKey(date)).map(x=>({id:x.id,color:COLOR[x.type]||COLOR.记录,title:x.title,timeLabel:x.timeLabel,status:x.status,important:x.important}))};
  getWeekTasksForDay=function(ds){return getTasksForDate(new Date(ds+'T12:00:00'))};
  showDayTasks=function(value){const ds=dateKey(value);calSelectedDate=new Date(ds+'T12:00:00');selectedDay=ds;renderCalendar();renderCalendarInlinePreview(ds)};
  renderCalendar=function(){legacyRenderCalendar();decorateCalendarCells()};
  exportData=exportV2;
  importData=importV2;
  const legacySaveBill=saveBill;
  saveBill=function(){const before=new Set(appData.records.entries.map(x=>x.id));legacySaveBill();appData.records.entries.filter(x=>!before.has(x.id)).forEach(linkFinanceEntry);persist();renderFinanceLink()};
}
function decorateCalendarCells(){
  document.querySelectorAll('.cal-day[data-date]').forEach(cell=>{
    const ds=dateKey(cell.dataset.date),holiday=getHolidayLabel(ds),birthdays=getBirthdayEntries(ds),moods=getEmotionEntries(ds).length,notes=getDayNotes(ds).length,inspirations=getDayInspirationEntries(ds).length;
    cell.querySelector('.v2-cal-top')?.remove();
    cell.querySelector('.v2-cal-bottom')?.remove();
    const top=document.createElement('div');top.className='v2-cal-top';
    if(holiday)top.innerHTML+=`<span class="v2-cal-holiday">${esc(holiday)}</span>`;
    if(birthdays.length)top.innerHTML+=`<span class="v2-cal-bday" title="${birthdays.map(x=>x.name).join('、')}">🎂</span>`;
    if(top.innerHTML)cell.appendChild(top);
    if(moods||notes||inspirations){
      const bottom=document.createElement('div');bottom.className='v2-cal-bottom';
      if(moods)bottom.innerHTML+=`<span class="v2-cal-mood" title="有${moods}条情绪记录">💭</span>`;
      if(notes)bottom.innerHTML+=`<span class="v2-cal-note" title="有${notes}条随笔/笔记">📝</span>`;
      if(inspirations)bottom.innerHTML+=`<span class="v2-cal-note" title="有${inspirations}条灵感便签">💡</span>`;
      cell.appendChild(bottom);
    }
  })
}
function renderCalendarInlinePreview(ds){
  const d=new Date(ds+'T12:00:00'),div=document.getElementById('calDayTasks'),items=displayItems(ds);
  if(!div)return;
  const holiday=getHolidayLabel(ds),birthdays=getBirthdayEntries(ds),emotions=getEmotionEntries(ds),notes=getDayNotes(ds),inspirations=getDayInspirationEntries(ds),mode=appData.v2?.calendarPreviewMode||'compact';
  if(!items.length&&!birthdays.length&&!holiday&&!emotions.length&&!notes.length&&!inspirations.length){div.classList.remove('show');return}
  div.className='cal-day-tasks show';
  const previewItems=mode==='all'?items:items.slice(0,6),moreCount=Math.max(0,items.length-previewItems.length);
  const grouped=previewItems.reduce((acc,item)=>{(acc[item.type||'任务']=acc[item.type||'任务']||[]).push(item);return acc},{});
  const compactHtml=Object.entries(grouped).map(([type,list])=>`<div class="v2-cal-compact-row"><div class="v2-cal-compact-dots">${list.map(item=>`<span class="v2-cal-mini-dot" style="background:${COLOR[item.type]||COLOR.记录}"></span>`).join('')}</div><div class="v2-cal-compact-text">${list.map(item=>esc(item.title)).join('、')}</div></div>`).join('');
  const detailHtml=previewItems.map(item=>`<div class="task-item"><span class="task-dot" style="background:${COLOR[item.type]||COLOR.记录}"></span><span>${esc(item.title)}</span><span class="v2-cal-type">${esc(item.type||'任务')}</span></div>`).join('');
  div.innerHTML=`<div class="v2-cal-preview-head"><span>${d.getMonth()+1}月${d.getDate()}日 · 共 ${items.length} 项${holiday?` · ${esc(holiday)}`:''}${birthdays.length?` · 🎂${birthdays.map(x=>x.name).join('、')}`:''}</span><div class="v2-row"><button class="v2-secondary" id="v2PreviewCompact">精简</button><button class="v2-secondary" id="v2PreviewAll">全部</button><button class="v2-secondary" id="v2OpenDayDetail">进入当天详情</button></div></div>`+(mode==='compact'?compactHtml:detailHtml)+(moreCount?`<div class="task-item" style="color:var(--text-l)">还有 ${moreCount} 项...</div>`:'')+((emotions.length||notes.length||inspirations.length)?`<div class="task-item" style="color:var(--text-l)">💭 情绪 ${emotions.length} 条 · 📝 记录 ${notes.length} 条 · 💡 灵感 ${inspirations.length} 条</div>`:'');
  document.getElementById('v2OpenDayDetail')?.addEventListener('click',()=>openDaySheet(ds));
  document.getElementById('v2PreviewCompact')?.addEventListener('click',()=>{appData.v2.calendarPreviewMode='compact';persist();renderCalendarInlinePreview(ds)});
  document.getElementById('v2PreviewAll')?.addEventListener('click',()=>{appData.v2.calendarPreviewMode='all';persist();renderCalendarInlinePreview(ds)});
}

function injectShell(){
  const app=document.querySelector('.app');
  const parking=document.createElement('div');parking.id='v2Parking';parking.hidden=true;document.body.appendChild(parking);
  const planner=document.createElement('main');planner.id='v2Planner';planner.className='v2-module';parking.appendChild(planner);
  const route=document.createElement('main');route.id='v2RoutePage';route.className='v2-route-page';route.innerHTML='<header class="v2-route-head"><button class="v2-route-back" id="v2RouteBack">‹</button><span class="v2-route-icon" id="v2RouteIcon"></span><h1 class="v2-route-title" id="v2RouteTitle"></h1></header><div id="v2RouteBody"></div>';app.after(route);
  const banner=document.createElement('div');banner.id='v2ImportBanner';banner.className='v2-import-banner v2-hidden';banner.innerHTML='<span>没有读取到原版本地数据。请在原版“设置”中导出 JSON，再导入 V2。</span><button class="v2-secondary" id="v2ImportBtn">导入</button><input id="v2ImportInput" type="file" accept=".json" hidden>';document.body.insertBefore(banner,app);
  document.body.classList.add('v2-ready');
  buildHomeLaunchers();
  document.getElementById('v2RouteBack').addEventListener('click',requestCloseRoute);
  window.addEventListener('popstate',()=>{if(routeState)closeRouteInternal()});
  document.getElementById('v2ImportBtn').addEventListener('click',()=>document.getElementById('v2ImportInput').click());
  document.getElementById('v2ImportInput').addEventListener('change',importV2);
  const settingsActions=document.querySelector('#settingsPopup .form-actions');if(settingsActions){const tools=document.createElement('div');tools.className='v2-tools-stack';tools.style.marginTop='10px';tools.innerHTML='<div class="v2-row"><button class="v2-secondary" id="v2BackupBtn">导出 V2 完整备份</button><button class="v2-secondary" id="v2ExactAlarmBtn">授权重要闹钟</button></div><div class="v2-panel" id="v2CloudPanel" style="margin-top:10px"><h3>☁ 轻量云端备份</h3><p class="hint">适合你自己一个人用：把完整数据备份到云端，需要填写自己的 JSONBin Bin ID 和 API Key。</p><div class="v2-fields"><label>Bin ID<input id="v2CloudBinId" placeholder="粘贴你的 Bin ID"></label><label>API Key<input id="v2CloudApiKey" placeholder=\"输入 X-Master-Key\" type=\"password\"></label><div class=\"v2-row\" style=\"flex-wrap:wrap\"><button class=\"v2-secondary\" id=\"v2CloudUpload\">上传云端</button><button class=\"v2-secondary\" id=\"v2CloudRestore\">恢复云端</button><button class=\"v2-secondary\" id=\"v2CloudUploadCompress\">上传后压缩本地</button><button class=\"v2-secondary\" id=\"v2CloudCompress\">仅压缩本地旧记录</button></div><div id=\"v2CloudStatus\" class=\"hint\"></div></div></div>';settingsActions.parentElement.appendChild(tools);document.getElementById('v2BackupBtn').addEventListener('click',exportV2);document.getElementById('v2ExactAlarmBtn').addEventListener('click',requestExactAlarmPermission);document.getElementById('v2CloudUpload').addEventListener('click',()=>uploadCloudBackup({compressAfter:false}));document.getElementById('v2CloudRestore').addEventListener('click',restoreCloudBackup);document.getElementById('v2CloudUploadCompress').addEventListener('click',()=>uploadCloudBackup({compressAfter:true}));document.getElementById('v2CloudCompress').addEventListener('click',()=>{const result=compressLocalData();render();renderPlanner();renderReviews?.();updateCloudStatus(`已压缩：归档 ${result.archivedDays} 天计划，清理 ${result.removedOcrNotes} 条旧 OCR 记录`)});syncCloudForm()}
  buildPlanner();injectRecordsTools();
}

const HOME_ROUTES={
  dailySection:['每日任务','学习'],projectSection:['项目推进','项目'],cyclicSection:['循环琐事','循环'],tempSection:['临时任务','临时'],
  birthdaySection:['生日提醒','庆祝'],healthSection:['健康闹钟','健康'],billSection:['账单','记账'],extraSection:['额外完成','完成'],
  reviewSection:['AI复盘','思考'],badgeSection:['成就勋章','成就'],wishSection:['愿望基金','收入']
};
let routeState=null,homeScroll=0;
function buildHomeLaunchers(){
  const launchers=document.createElement('section');launchers.id='v2Launchers';launchers.className='v2-launchers';launchers.innerHTML=Object.entries(HOME_ROUTES).map(([id,[title,icon]])=>`<button class="v2-launcher" data-route="${id}"><span class="v2-launcher-icon">${iconImg(icon,36)}</span><span>${title}</span></button>`).join('');document.querySelector('.quick-add').after(launchers);
  Object.keys(HOME_ROUTES).forEach(id=>document.getElementById(id)?.classList.add('v2-home-module'));
  launchers.querySelectorAll('[data-route]').forEach(btn=>btn.addEventListener('click',()=>openModulePage(btn.dataset.route)));
  const footer=document.querySelector('#calendarSection .cal-footer');if(footer&&!document.getElementById('v2PlanEntry')){const btn=document.createElement('button');btn.id='v2PlanEntry';btn.className='v2-plan-entry';btn.innerHTML=iconImg('规划',16)+'进入智能规划室 ›';btn.addEventListener('click',()=>openPlannerPage());footer.appendChild(btn)}
}
function beginRoute(title,icon,kind){
  if(routeState)closeRouteInternal(false);homeScroll=window.scrollY;const app=document.querySelector('.app'),page=document.getElementById('v2RoutePage'),body=document.getElementById('v2RouteBody');body.innerHTML='';app.classList.add('v2-hidden');page.classList.add('show');document.getElementById('v2RouteTitle').textContent=title;document.getElementById('v2RouteIcon').innerHTML=iconImg(icon,28);routeState={kind};window.scrollTo(0,0);history.pushState({v2Route:kind},'',`#/${kind}`);return body
}
function openModulePage(id){const cfg=HOME_ROUTES[id],section=document.getElementById(id);if(!cfg||!section)return;const body=beginRoute(cfg[0],cfg[1],id.replace('Section',''));const marker=document.createComment('v2-return-'+id);section.parentNode.insertBefore(marker,section);const cards=[...section.querySelectorAll('.card')],expandedStates=cards.map(c=>c.classList.contains('expanded'));routeState=Object.assign(routeState,{section,marker,wasCollapsed:section.classList.contains('collapsed'),cards,expandedStates});section.classList.remove('collapsed','v2-home-module');cards.forEach(c=>c.classList.add('expanded'));body.appendChild(section);buildSectionQuickAdd(id)}
function openPlannerPage(){const body=beginRoute('智能规划室','规划','planner'),planner=document.getElementById('v2Planner');routeState.planner=planner;body.appendChild(planner);renderPlanner()}
function requestCloseRoute(){if(routeState)history.back()}
function closeRouteInternal(restoreScroll=true){if(!routeState)return;const state=routeState;routeState=null;if(state.section){state.cards?.forEach((c,i)=>c.classList.toggle('expanded',state.expandedStates[i]));state.marker.parentNode.insertBefore(state.section,state.marker);state.marker.remove();state.section.classList.add('v2-home-module');state.section.classList.toggle('collapsed',state.wasCollapsed)}if(state.planner)document.getElementById('v2Parking').appendChild(state.planner);document.getElementById('v2RouteBody').innerHTML='';document.getElementById('v2RoutePage').classList.remove('show');document.querySelector('.app').classList.remove('v2-hidden');if(restoreScroll)requestAnimationFrame(()=>window.scrollTo(0,homeScroll))
}

function openDaySheet(ds){selectedDay=ds;const d=new Date(ds+'T12:00:00');beginRoute(`${d.getMonth()+1}月${d.getDate()}日 · 周${['日','一','二','三','四','五','六'][d.getDay()]}`,'提醒','day');renderDaySheet()}
function closeDaySheet(){requestCloseRoute()}

function renderDaySheet(){
  const items=displayItems(selectedDay),done=items.filter(x=>x.status==='done').length;const past=selectedDay<todayStr();
  const emotions=getEmotionEntries(selectedDay),notes=getDayNotes(selectedDay),inspirations=getDayInspirationEntries(selectedDay),holiday=getHolidayLabel(selectedDay),birthdays=getBirthdayEntries(selectedDay);
  let html=`<div class="v2-day-summary"><span>${items.length} 项任务</span><span>${done} 项完成</span><span>${past?'历史回顾':selectedDay===todayStr()?'今天':'未来计划'}</span></div>`;
  if(holiday||birthdays.length)html+=`<div class="v2-panel"><div class="v2-row">${holiday?`<span class="v2-chip active">${esc(holiday)}</span>`:''}${birthdays.length?`<span class="v2-chip">🎂 ${birthdays.map(x=>x.name).join('、')}</span>`:''}</div></div>`;
  if(past&&!getPlan(selectedDay,false))html+='<div class="v2-warning">旧版没有保存这一天的任务快照，因此只能显示当时实际保存下来的记录。V2 启用后的日期会完整保留。</div>';
  const sortedItems=[...items].sort((a,b)=>(a.plannedStart||'99:99').localeCompare(b.plannedStart||'99:99'));
  let currentSlot='';
  html+=sortedItems.length?sortedItems.map(item=>{const slot=getTimeSlotLabel(item.plannedStart||item.alarmTime||'');const slotHeader=slot!==currentSlot?`<div class="v2-time-slot ${slot}">${slot}</div>`:'';currentSlot=slot;return slotHeader+`<div class="v2-day-item ${item.status==='done'?'done':''}" style="border-left-color:${COLOR[item.type]||COLOR.记录}"><button class="v2-day-check" data-v2-toggle="${esc(item.id)}">✓</button><div><div class="v2-day-title">${esc(item.title)}</div><div class="v2-day-meta">${esc(item.type||'任务')}${item.timeLabel?' · '+esc(item.timeLabel):''}${item.plannedStart?' · '+esc(item.plannedStart):''}${item.reminderMode==='alarm'?' · 闹钟':' · 通知'}</div></div><div class="v2-row" style="gap:6px;flex:0 0 auto"><button class="v2-secondary" data-v2-calendar="${esc(item.id)}" title="加入手机日历">日历</button><button class="v2-important" data-v2-important="${esc(item.id)}" title="切换重要提醒">${item.important?'★':'☆'}</button><button class="v2-danger" data-v2-delete="${esc(item.id)}" title="删除这项">删</button></div></div>`}).join(''):'<div class="v2-empty">这一天还没有安排<br>可以在下面添加一项</div>';
  html+=`<div class="v2-panel"><h3>💭 当天情绪</h3>${emotions.length?emotions.map(x=>`<div class="v2-log-card"><div class="v2-row"><span class="v2-chip">${esc(x.emotion)}</span><span class="v2-chip ${x.intensity==='重'?'active':''}">${esc(x.intensity)}影响</span><button class="v2-danger" data-v2-del-emotion="${esc(x.id)}" style="margin-left:auto">删</button></div><div class="v2-day-title" style="margin-top:6px">${esc(x.event)}</div>${x.note?`<div class="v2-day-meta" style="margin-top:4px;white-space:pre-wrap">${esc(x.note)}</div>`:''}</div>`).join(''):'<p class="hint">这一天还没有情绪记录。</p>'}<div class="v2-fields" style="margin-top:10px"><textarea id="v2DayEmotionText" rows="3" placeholder="比如：今天开会很累，心里有点烦，压力中等"></textarea><button class="v2-primary" id="v2DayEmotionAdd">保存这条心情</button></div></div>`;
  html+=`<div class="v2-panel"><h3>📝 当天随笔</h3>${notes.length?notes.map(n=>`<div class="v2-log-card"><div class="v2-row"><div class="v2-day-title">${esc(n.title||'随手记')}</div><button class="v2-danger" data-v2-del-note="${esc(n.id)}" style="margin-left:auto">删</button></div><div class="v2-day-meta" style="margin-top:4px;white-space:pre-wrap">${esc(n.text||'')}</div></div>`).join(''):'<p class="hint">这一天还没有随笔记录。</p>'}<div class="v2-fields" style="margin-top:10px"><input id="v2DayNoteTitle" placeholder="标题（选填）"><textarea id="v2DayNoteText" rows="3" placeholder="记下这一天的想法、备忘或复盘碎片"></textarea><button class="v2-primary" id="v2DayNoteAdd">保存到这一天</button></div></div>`;
  html+=`<div class="v2-panel"><h3>💡 当天灵感</h3>${inspirations.length?inspirations.map(n=>`<div class="v2-log-card"><div class="v2-row"><span class="v2-chip">${esc(n.emotion||'💡')}</span><span class="v2-day-meta">${esc(n.date||selectedDay)}</span><button class="v2-danger" data-v2-del-inspire="${esc(n.id)}" style="margin-left:auto">删</button></div><div class="v2-day-meta" style="margin-top:6px;white-space:pre-wrap">${esc(n.text||'')}</div></div>`).join(''):'<p class="hint">这一天还没有灵感便签。</p>'}<div class="v2-fields" style="margin-top:10px"><textarea id="v2DayInspireText" rows="3" placeholder="记下今天闪过的灵感、提醒或一句话"></textarea><button class="v2-primary" id="v2DayInspireAdd">保存这条灵感</button></div></div>`;
  html+=`<div class="v2-panel"><h3>＋ 安排到这一天</h3><div class="v2-fields"><label>任务内容<input id="v2DayNewTitle" placeholder="要做什么"></label><div class="v2-grid"><label>类型<select id="v2DayNewType"><option>临时</option><option>每日</option><option>项目</option><option>循环</option></select></label><label>时间<input id="v2DayNewTime" type="time"></label></div><label><span><input id="v2DayNewImportant" type="checkbox"> 重要任务（闹钟式提醒）</span></label><button class="v2-primary" id="v2DayAdd">加入当日计划</button></div></div>`;
  const target=routeState?.kind==='day'?document.getElementById('v2RouteBody'):document.getElementById('v2DayBody');target.innerHTML=html;
  target.querySelectorAll('[data-v2-toggle]').forEach(b=>b.addEventListener('click',()=>toggleDayItem(b.dataset.v2Toggle)));
  target.querySelectorAll('[data-v2-important]').forEach(b=>b.addEventListener('click',()=>toggleImportant(b.dataset.v2Important)));
  target.querySelectorAll('[data-v2-calendar]').forEach(b=>b.addEventListener('click',()=>openDayItemCalendar(b.dataset.v2Calendar)));
  target.querySelectorAll('[data-v2-delete]').forEach(b=>b.addEventListener('click',()=>deleteDayItem(b.dataset.v2Delete)));
  target.querySelectorAll('[data-v2-del-emotion]').forEach(b=>b.addEventListener('click',()=>deleteDayEmotion(b.dataset.v2DelEmotion)));
  target.querySelectorAll('[data-v2-del-note]').forEach(b=>b.addEventListener('click',()=>deleteDayNote(b.dataset.v2DelNote)));
  target.querySelectorAll('[data-v2-del-inspire]').forEach(b=>b.addEventListener('click',()=>deleteDayInspiration(b.dataset.v2DelInspire)));
  document.getElementById('v2DayAdd').addEventListener('click',addManualDayItem);
  document.getElementById('v2DayEmotionAdd').addEventListener('click',addDayEmotion);
  document.getElementById('v2DayNoteAdd').addEventListener('click',addDayNote);
  document.getElementById('v2DayInspireAdd').addEventListener('click',addDayInspiration);
}

function findDisplayedItem(ds,id){return displayItems(ds).find(x=>x.id===id)}
function materializeItem(ds,id){const existing=getPlan(ds,true).items.find(x=>x.id===id);if(existing)return existing;const predicted=findDisplayedItem(ds,id);return predicted?upsertPlanItem(ds,predicted):null}
function toggleDayItem(id){const item=materializeItem(selectedDay,id);if(!item)return;item.status=item.status==='done'?'todo':'done';item.completedAt=item.status==='done'?nowISO():null;if(item.sourceTaskId&&selectedDay===todayStr()){const task=appData.tasks.find(x=>x.id===item.sourceTaskId);if(task?.type==='每日'){task.completedToday=item.status==='done';task.lastCompletedDate=task.completedToday?selectedDay:task.lastCompletedDate}else if(task?.type==='循环'&&item.status==='done')task.lastDoneDate=selectedDay}persist();renderDaySheet();render();}
function toggleImportant(id){const item=materializeItem(selectedDay,id);if(!item)return;item.important=!item.important;item.reminderMode=item.important?'alarm':'notification';persist();scheduleItem(item,selectedDay);renderDaySheet()}
function deleteDayItem(id){
  const plan=getPlan(selectedDay,true),item=materializeItem(selectedDay,id);if(!item)return;
  if(item.sourceTaskId&&selectedDay===todayStr()){
    if(!confirm('这是系统任务，删除后会从任务列表里一起移除。继续吗？'))return;
    appData.tasks=appData.tasks.filter(x=>x.id!==item.sourceTaskId);
    plan.items=plan.items.filter(x=>x.sourceTaskId!==item.sourceTaskId&&x.id!==id);
  }else{
    if(!confirm('删除这一天里的这项安排？'))return;
    plan.items=plan.items.filter(x=>x.id!==id);
  }
  persist();renderDaySheet();renderCalendar();render();toast('已删除');
}
function addManualDayItem(){const title=document.getElementById('v2DayNewTitle').value.trim();if(!title){toast('先写下任务内容');return}const important=document.getElementById('v2DayNewImportant').checked;const item={id:'plan-'+genId(),title,type:document.getElementById('v2DayNewType').value,status:'todo',plannedStart:document.getElementById('v2DayNewTime').value,timeLabel:getTimeSlotLabel(document.getElementById('v2DayNewTime').value),important,reminderMode:important?'alarm':'notification',alarmTime:document.getElementById('v2DayNewTime').value,createdAt:nowISO(),completedAt:null};upsertPlanItem(selectedDay,item);persist();scheduleItem(item,selectedDay);renderDaySheet();renderCalendar();renderCalendarInlinePreview(selectedDay);toast('已加入当日计划')}
function addDayEmotion(){const text=document.getElementById('v2DayEmotionText').value.trim();if(!text){toast('先写一点今天的心情');return}const entry=buildEmotionLog(text,{date:selectedDay,source:'day-sheet'});if(!entry){toast('这一段里还没识别到明显情绪，你也可以再写具体一点');return}entry.note=text.slice(0,160);saveEmotionLog(entry);document.getElementById('v2DayEmotionText').value='';renderDaySheet();renderCalendar();renderCalendarInlinePreview(selectedDay);toast('已保存心情记录')}
function addDayNote(){const text=document.getElementById('v2DayNoteText').value.trim();if(!text){toast('先写一点内容');return}appData.notes.unshift({id:genId(),title:document.getElementById('v2DayNoteTitle').value.trim(),text,date:selectedDay,createdAt:nowISO(),pinned:false,done:false,source:'day-sheet'});persist();document.getElementById('v2DayNoteTitle').value='';document.getElementById('v2DayNoteText').value='';renderDaySheet();renderCalendar();renderCalendarInlinePreview(selectedDay);toast('已保存到这一天')}
function addDayInspiration(){const text=document.getElementById('v2DayInspireText').value.trim();if(!text){toast('先写一点灵感');return}const emo=emotionFromText(text)||'💡';appData.inspirations.unshift({id:genId(),text,date:selectedDay,emotion:emo,source:'day-sheet'});persist();document.getElementById('v2DayInspireText').value='';renderDaySheet();renderCalendar();renderCalendarInlinePreview(selectedDay);toast('已保存这条灵感')}
function deleteDayEmotion(id){if(!confirm('删除这条心情记录？'))return;appData.v2.emotionLogs=(appData.v2.emotionLogs||[]).filter(x=>x.id!==id);persist();renderDaySheet();renderCalendar();renderCalendarInlinePreview(selectedDay);toast('已删除心情记录')}
function deleteDayNote(id){if(!confirm('删除这条随笔？'))return;appData.notes=(appData.notes||[]).filter(x=>x.id!==id);persist();renderDaySheet();renderCalendar();renderCalendarInlinePreview(selectedDay);renderNotes?.();toast('已删除随笔')}
function deleteDayInspiration(id){if(!confirm('删除这条灵感？'))return;appData.inspirations=(appData.inspirations||[]).filter(x=>x.id!==id);persist();renderDaySheet();renderCalendar();renderCalendarInlinePreview(selectedDay);renderInspirations?.();toast('已删除灵感')}
function openDayItemCalendar(id){const item=materializeItem(selectedDay,id);if(!item){toast('没有找到这项任务');return}openTaskCalendar(item,selectedDay)}
function buildSectionQuickAdd(sectionId){
  const section=document.getElementById(sectionId);if(!section||section.querySelector('.v2-inline-add'))return;
  const typeMap={dailySection:'每日',projectSection:'项目',cyclicSection:'循环',tempSection:'临时'};
  const type=typeMap[sectionId];if(!type)return;
  const wrap=document.createElement('div');wrap.className='v2-panel v2-inline-add';
  if(type==='循环')wrap.innerHTML=`<h3>＋ 新增${type}</h3><div class="v2-fields"><input id="${sectionId}-title" placeholder="写下要循环做的事"><div class="v2-row"><input id="${sectionId}-cycle" type="number" min="1" value="2" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:9px" placeholder="每几天一次"><button class="v2-primary" id="${sectionId}-add">添加</button></div></div>`;
  else wrap.innerHTML=`<h3>＋ 新增${type}</h3><div class="v2-fields"><input id="${sectionId}-title" placeholder="写下任务内容"><div class="v2-row">${type!=='每日'?'<input id="'+sectionId+'-time" type="time" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:9px">':''}<button class="v2-primary" id="${sectionId}-add">添加</button></div></div>`;
  section.insertBefore(wrap,section.children[1]||null);
  document.getElementById(`${sectionId}-add`).addEventListener('click',()=>addSectionTask(sectionId));
}
function addSectionTask(sectionId){
  const typeMap={dailySection:'每日',projectSection:'项目',cyclicSection:'循环',tempSection:'临时'};
  const type=typeMap[sectionId],title=document.getElementById(`${sectionId}-title`)?.value.trim();
  if(!title){toast('先写下任务内容');return}
  const task={id:genId(),type,title,scheduledStart:null,scheduledEnd:null,timeLabel:null,scheduledDate:null,alarmTime:null,remindBefore:null,departureTime:null};
  if(type==='每日'){task.frequency='每天';task.subtask='';task.completedToday=false;task.lastCompletedDate=null;}
  if(type==='项目'){task.steps=[{id:genId(),title:'第一步',duration:30,done:false}];task.reminderTime='22:30';task.isTiming=false;task.startTime=null;}
  if(type==='循环'){task.cycleDays=Math.max(1,Number(document.getElementById(`${sectionId}-cycle`)?.value)||2);task.lastDoneDate=todayStr();}
  if(type==='临时'){task.deadline=null;task.deadlineConfirmed=false;task.confirmInDays=3;task.confirmDate=daysLater(3);task.hiddenToday=false;task.priority=2;task.duration=null;task.scheduledDate=todayStr();}
  const timeInput=document.getElementById(`${sectionId}-time`);
  if(timeInput?.value){task.scheduledStart=timeInput.value;task.timeLabel=computeTimeLabel(timeInput.value);if(type==='临时'){task.alarmTime=timeInput.value;task.important=true}}
  addTask(task);
  document.getElementById(`${sectionId}-title`).value='';
  if(timeInput)timeInput.value='';
  if(routeState?.section?.id===sectionId)buildSectionQuickAdd(sectionId);
  toast(`已新增${type}任务`);
}

function buildPlanner(){document.getElementById('v2Planner').innerHTML='<div class="v2-page-head"><div><h2>规划室</h2><p>长期习惯保留，任务批次按周更新</p></div></div><div id="v2PlannerContent"></div>'}
function activeBatch(){return appData.v2.planner.batches.find(x=>x.id===appData.v2.planner.activeBatchId&&x.status==='active')||null}
function weekEnd(ds){const d=new Date(ds+'T12:00:00'),day=d.getDay()||7;d.setDate(d.getDate()+7-day);return dateKey(d)}

function renderPlanner(){
  refreshPlannerStats();const p=appData.v2.planner.profile,batch=activeBatch(),suggestions=appData.v2.planner.suggestions||[];
  let html='<div class="v2-panel"><h3>🧭 当前任务批次</h3>';
  if(batch)html+=`<div class="v2-batch active"><div class="v2-batch-title"><span>${esc(batch.title)}</span><span class="v2-chip active">进行中</span></div><small>${batch.startDate} 至 ${batch.endDate}</small>${batch.items.map((x,i)=>`<div class="v2-row" style="margin-top:7px"><span style="flex:1;font-size:13px">${esc(x.title)}</span><button class="v2-secondary" data-batch-today="${i}">安排今天</button></div>`).join('')}</div><div class="v2-row end" style="margin-top:10px"><button class="v2-secondary" id="v2FinishBatch">这一批完成，开启下一批</button></div>`;
  else html+='<p class="hint">当前没有进行中的批次。建立一批本周任务后，短期聊天可以随批次归档，个人习惯不会丢失。</p>';
  html+='</div>';
  html+=`<div class="v2-panel"><h3>＋ 新建一批</h3><div class="v2-fields"><label>批次名称<input id="v2BatchTitle" value="本周任务"></label><label>任务（每行一项）<textarea id="v2BatchItems" rows="4" placeholder="整理资料\n推进保研主包\n收拾房间"></textarea></label><div class="v2-grid"><label>开始<input id="v2BatchStart" type="date" value="${todayStr()}"></label><label>结束<input id="v2BatchEnd" type="date" value="${weekEnd(todayStr())}"></label></div><button class="v2-primary" id="v2CreateBatch">开启这一批</button></div></div>`;
  html+=`<div class="v2-panel"><h3>✨ 今日建议</h3>${suggestions.length?suggestions.map(s=>`<div class="v2-row" style="padding:7px 0;border-bottom:1px solid var(--border)"><span style="flex:1;font-size:13px">${esc(s.text)}</span><button class="v2-secondary" data-suggest-add="${esc(s.title)}">采纳</button><button class="v2-secondary ai-skip-btn" data-suggest-skip="${esc(s.title)}">跳过</button></div>`).join(''):'<p class="hint">积累几天完成记录后，这里会根据连续习惯提出建议。AI建议只会使用普通通知，不会擅自设闹钟。</p>'}</div>`;
  html+=`<div class="v2-panel"><h3>🌱 我的规划底色</h3><div class="v2-fields"><div class="v2-grid"><label>每天最多任务类型<input id="v2MaxTypes" type="number" min="1" max="6" value="${p.maxTaskTypes}"></label><label>每天最多家务<input id="v2Chores" type="number" min="0" max="5" value="${p.choresPerDay}"></label></div><label><span><input id="v2LowResistance" type="checkbox" ${p.insertLowResistance?'checked':''}> 空余时间穿插低阻力任务</span></label><label>长期规划原则<textarea id="v2Principles" rows="4">${esc(p.principles)}</textarea></label><button class="v2-primary" id="v2SaveProfile">保存长期习惯</button></div></div>`;
  document.getElementById('v2PlannerContent').innerHTML=html;
  document.getElementById('v2CreateBatch').addEventListener('click',createBatch);
  document.getElementById('v2SaveProfile').addEventListener('click',saveProfile);
  document.getElementById('v2FinishBatch')?.addEventListener('click',finishBatch);
  document.querySelectorAll('[data-batch-today]').forEach(b=>b.addEventListener('click',()=>addBatchItemToday(Number(b.dataset.batchToday))));
  document.querySelectorAll('[data-suggest-add]').forEach(b=>b.addEventListener('click',()=>addSuggestedToday(b.dataset.suggestAdd)));
  document.querySelectorAll('[data-suggest-skip]').forEach(b=>b.addEventListener('click',()=>skipSuggestedToday(b.dataset.suggestSkip)));
}

function createBatch(){const title=document.getElementById('v2BatchTitle').value.trim()||'本周任务',lines=document.getElementById('v2BatchItems').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(!lines.length){toast('至少填写一项任务');return}const current=activeBatch();if(current)current.status='archived';const batch={id:'batch-'+genId(),title,startDate:document.getElementById('v2BatchStart').value,endDate:document.getElementById('v2BatchEnd').value,status:'active',createdAt:nowISO(),items:lines.map(x=>({id:genId(),title:x,done:false}))};appData.v2.planner.batches.push(batch);appData.v2.planner.activeBatchId=batch.id;localStorage.setItem('task-chat-history','[]');localStorage.setItem('task-chat-round','0');updateHabitSummary();persist();renderPlanner();toast('新批次已开启，短期聊天已清空')}
function finishBatch(){const batch=activeBatch();if(!batch)return;batch.status='completed';batch.completedAt=nowISO();appData.v2.planner.activeBatchId=null;localStorage.setItem('task-chat-history','[]');localStorage.setItem('task-chat-round','0');persist();renderPlanner();toast('这一批已归档，长期习惯仍保留')}
function addBatchItemToday(index){const batch=activeBatch(),x=batch?.items[index];if(!x)return;upsertPlanItem(todayStr(),{id:'batchitem-'+batch.id+'-'+x.id,batchId:batch.id,title:x.title,type:'项目',status:'todo',important:false,reminderMode:'notification',createdAt:nowISO()});persist();toast('已安排到今天')}
function addSuggestedToday(title){upsertPlanItem(todayStr(),{id:'suggest-'+genId(),title,type:'每日',status:'todo',important:false,reminderMode:'notification',createdAt:nowISO()});window.AIMemorySystem?.feedbackLog.record('accepted',{title,type:'每日'},{source:'planner',energy:appData.todayStatus?.energy,freeTime:appData.todayStatus?.freeTime});persist();toast('建议已安排，使用普通通知')}
function skipSuggestedToday(title){window.AIMemorySystem?.feedbackLog.record('skipped',{title,type:'每日'},{source:'planner',energy:appData.todayStatus?.energy,freeTime:appData.todayStatus?.freeTime});appData.v2.planner.suggestions=(appData.v2.planner.suggestions||[]).filter(x=>x.title!==title);persist();renderPlanner();toast('已跳过，AI会记住这次选择')}
function saveProfile(){const p=appData.v2.planner.profile;p.maxTaskTypes=Math.max(1,Number(document.getElementById('v2MaxTypes').value)||3);p.choresPerDay=Math.max(0,Number(document.getElementById('v2Chores').value)||0);p.insertLowResistance=document.getElementById('v2LowResistance').checked;p.principles=document.getElementById('v2Principles').value.trim();updateHabitSummary();persist();toast('长期规划习惯已保存')}
function updateHabitSummary(){const p=appData.v2.planner.profile;localStorage.setItem('task-chat-summary',`长期规划习惯：${p.principles} 每天最多${p.maxTaskTypes}种任务类型；家务最多${p.choresPerDay}项；${p.insertLowResistance?'空余时间安排低阻力任务。':''}`)}

function refreshPlannerStats(){
  if(!appData.v2)return;const days=Object.keys(appData.v2.dayPlans).sort().slice(-14),counts={};
  days.forEach(ds=>(appData.v2.dayPlans[ds].items||[]).filter(x=>x.status==='done').forEach(x=>{const key=x.sourceTaskId||x.title;counts[key]=counts[key]||{title:x.title,count:0,last:ds};counts[key].count++;if(ds>counts[key].last)counts[key].last=ds}));
  appData.v2.planner.habitSignals=counts;
  appData.v2.planner.suggestions=Object.values(counts).filter(x=>x.count>=3&&!displayItems(todayStr()).some(t=>t.title===x.title)).sort((a,b)=>b.count-a.count).slice(0,3).map(x=>({title:x.title,text:`最近完成了 ${x.count} 次「${x.title}」，今天要继续吗？`,mode:'notification'}));
}

function injectRecordsTools(){
  const bill=document.getElementById('billSection');const finance=document.createElement('div');finance.id='v2FinanceLink';finance.className='v2-panel';bill.insertBefore(finance,bill.children[1]||null);
  const notes=document.getElementById('notesSection');const ocr=document.createElement('div');ocr.id='v2OcrPanel';ocr.className='v2-panel';ocr.innerHTML='<h3>📷 拍照识别录入</h3><p class="hint">直接拍照或选图后会自动尝试识别。识别完成后，你可以修改文字，再决定要存到哪里。</p><div id="v2OcrStatus" class="hint v2-ocr-status">正在检查识别方式…</div><input id="v2OcrFile" type="file" accept="image/*" capture="environment" style="margin-top:8px;font-size:12px"><img id="v2OcrPreview" class="v2-ocr-preview" alt="手写图片预览"><div class="v2-fields"><textarea id="v2OcrText" rows="5" placeholder="识别结果会显示在这里，也可以手动修改"></textarea><div class="v2-row"><button class="v2-secondary" id="v2OcrRun">重新识别</button><select id="v2OcrTarget" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:9px"><option value="note">存为随手记</option><option value="today">加入今日任务</option><option value="batch">加入当前批次</option><option value="inspire">存为灵感便签</option><option value="emotion">存为心情记录</option><option value="review">存为复盘素材</option></select><button class="v2-primary" id="v2OcrSave">确认录入</button></div></div>';notes.insertBefore(ocr,notes.children[1]||null);
  document.getElementById('v2OcrFile').addEventListener('change',async e=>{previewOCR(e);await recognizeOCR()});
  document.getElementById('v2OcrRun').addEventListener('click',recognizeOCR);
  document.getElementById('v2OcrSave').addEventListener('click',saveOCRText);
  refreshOCRStatus();
  renderFinanceLink();
}

function renderFinanceLink(){const box=document.getElementById('v2FinanceLink');if(!box)return;const link=appData.v2.financeLink,options=appData.wishes.map(w=>`<option value="${esc(w.id)}" ${w.id===link.wishId?'selected':''}>${esc(w.title)}</option>`).join('');box.innerHTML=`<h3>🔗 保研主包自动归集</h3><p class="hint">收入分类选择“${esc(link.category)}”后，金额自动计入关联目标；每笔账单只归集一次。</p><div class="v2-row" style="margin-top:8px"><select id="v2FinanceWish" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:9px"><option value="">选择愿望基金目标</option>${options}</select><button class="v2-secondary" id="v2FinanceSave">保存关联</button></div>`;document.getElementById('v2FinanceSave').addEventListener('click',()=>{link.wishId=document.getElementById('v2FinanceWish').value||null;persist();toast('自动归集目标已保存')})}
function linkFinanceEntry(entry){const link=appData.v2.financeLink;if(!entry||entry.type!=='income'||entry.category!==link.category||link.linkedEntryIds.includes(entry.id))return;const wish=appData.wishes.find(w=>w.id===link.wishId)||appData.wishes.find(w=>/保研.*主包|主包/.test(w.title));if(!wish){if(!link.pendingEntryIds.includes(entry.id))link.pendingEntryIds.push(entry.id);return}wish.currentAmount=(Number(wish.currentAmount)||0)+Number(entry.amount||0);link.linkedEntryIds.push(entry.id);link.pendingEntryIds=link.pendingEntryIds.filter(x=>x!==entry.id);toast(`已自动计入「${wish.title}」`)}

function previewOCR(e){const file=e.target.files?.[0];if(!file)return;const img=document.getElementById('v2OcrPreview');img.src=URL.createObjectURL(file);img.style.display='block'}
function setOCRStatus(text,mode='neutral'){const el=document.getElementById('v2OcrStatus');if(!el)return;el.textContent=text;el.dataset.mode=mode}
function refreshOCRStatus(){
  const native=window.Capacitor&&typeof window.Capacitor.isNativePlatform==='function'&&window.Capacitor.isNativePlatform();
  if('TextDetector'in window){setOCRStatus('当前可用：本机识别优先。拍照后会先尝试直接在手机上识别。','ok');return}
  if(native){setOCRStatus('当前会优先走云端识别。你可以直接在这里拍照或选图，不需要退出软件。若网络不稳，也能先手动改字再保存。','neutral');return}
  setOCRStatus('当前将使用云端 OCR。若网络或服务暂时不可用，也可以先手动修改下方文字再保存。','neutral');
}
async function recognizeOCR(){const file=document.getElementById('v2OcrFile').files?.[0];if(!file){toast('请先拍照或选择图片');return}const btn=document.getElementById('v2OcrRun');btn.disabled=true;btn.textContent='识别中…';try{
  if('TextDetector'in window){
    const bitmap=await createImageBitmap(file),detector=new TextDetector(),lines=await detector.detect(bitmap),text=lines.map(x=>x.rawValue).join('\n').trim();
    if(text){document.getElementById('v2OcrText').value=text;setOCRStatus('本机识别完成，你可以直接改字后保存。','ok');toast('已完成本机识别，请检查文字')}
    else{
      const imageDataUrl=await prepareOCRImage(file);const res=await fetch('/.netlify/functions/ocr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageDataUrl})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.message||data.error||'OCR_NOT_CONFIGURED');document.getElementById('v2OcrText').value=data.text||'';setOCRStatus('本机识别结果太少，已自动改用云端识别。','ok');toast('已切换云端识别，请检查文字')
    }
  }else{
    const imageDataUrl=await prepareOCRImage(file);const res=await fetch('/.netlify/functions/ocr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageDataUrl})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.message||data.error||'OCR_NOT_CONFIGURED');document.getElementById('v2OcrText').value=data.text||'';setOCRStatus('云端识别完成，你可以直接改字后保存。','ok');toast('识别完成，请检查文字')
  }
 }catch(e){setOCRStatus('当前识别没有成功：这版支持先保留图片预览，再手动修改文字并直接保存到任务/笔记/心情。','warn');toast('这次识别没成功，但你仍然可以手动改字后直接录入')}finally{btn.disabled=false;btn.textContent='重新识别'}}
async function prepareOCRImage(file){const bitmap=await createImageBitmap(file),max=1800,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();return canvas.toDataURL('image/jpeg',.88)}
function saveOCRText(){const text=document.getElementById('v2OcrText').value.trim();if(!text){toast('没有可录入的文字');return}const target=document.getElementById('v2OcrTarget').value;if(target==='note'){appData.notes.push({id:genId(),title:'手写识别',text,date:todayStr(),createdAt:nowISO(),pinned:false,done:false,source:'ocr'})}else if(target==='today'){text.split(/\r?\n/).filter(Boolean).forEach(line=>upsertPlanItem(todayStr(),{id:'ocr-'+genId(),title:line.trim(),type:'临时',status:'todo',important:false,reminderMode:'notification',createdAt:nowISO(),source:'ocr'}))}else if(target==='batch'){const batch=activeBatch();if(!batch){toast('请先在规划室开启任务批次');return}text.split(/\r?\n/).filter(Boolean).forEach(line=>batch.items.push({id:genId(),title:line.trim(),done:false,source:'ocr'}))}else if(target==='inspire'){appData.inspirations.unshift({id:genId(),text,date:todayStr(),emotion:'💡',source:'ocr'})}else if(target==='emotion'){saveEmotionLog(buildEmotionLog(text,{source:'ocr'}))}else if(target==='review'){appData.notes.push({id:genId(),title:'复盘素材',text,date:todayStr(),createdAt:nowISO(),pinned:false,done:false,source:'ocr-review'})}persist();render();document.getElementById('v2OcrText').value='';toast('已确认录入')}
async function aiSaveExtra(){
  const inp=document.getElementById('extraInput'),text=inp?.value.trim();if(!text){toast('先写下今天额外完成了什么');return}
  toast('AI 正在整理额外完成...');
  try{
    const res=await fetch('/.netlify/functions/ai-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:`请把下面这段今天完成的内容整理成 1~5 条“额外完成事项”，语气保持温和，不需要安慰，只输出任务内容。原文：\n${text}`}],existingTasks:appData.tasks,memoryContext:window.AIMemorySystem?.buildPrompt?.(appData)||''})});
    if(!res.ok)throw new Error('AI_EXTRA_FAILED');
    const data=await res.json(),tasks=(data.suggestedTasks||[]).filter(x=>x.title);
    if(tasks.length){
      tasks.forEach(t=>upsertPlanItem(todayStr(),{id:'extra-'+genId(),title:t.title,type:t.type||'记录',status:'done',important:false,reminderMode:'notification',createdAt:nowISO(),completedAt:nowISO()}));
    }else{
      appData.notes.push({id:genId(),title:'额外完成',text,date:todayStr(),createdAt:nowISO(),pinned:false,done:true});
    }
    const emotionLog=buildEmotionLog(text,{source:'extra-ai'});if(emotionLog)saveEmotionLog(emotionLog);
    persist();render();inp.value='';toast('已整理到今天记录');
  }catch(e){
    const emotionLog=buildEmotionLog(text,{source:'extra-ai-fallback'});if(emotionLog)saveEmotionLog(emotionLog);
    appData.notes.push({id:genId(),title:'额外完成',text,date:todayStr(),createdAt:nowISO(),pinned:false,done:true});
    persist();render();inp.value='';toast('AI整理暂时失败，已先保存为额外完成');
  }
}
window.aiSaveExtra=aiSaveExtra;

function reviewStatusEl(){return document.getElementById('reviewStatus')}
function setReviewStatus(text,isError){const el=reviewStatusEl();if(el){el.textContent=text||'';el.style.color=isError?'#d64b4b':'var(--text-l)'}}
function startOfQuarter(d){return new Date(d.getFullYear(),Math.floor(d.getMonth()/3)*3,1)}
function startOfHalfYear(d){return new Date(d.getFullYear(),d.getMonth()<6?0:6,1)}
function endOfMonth(y,m){return new Date(y,m+1,0)}
function fmtDate(d){return dateKey(d)}
function periodMeta(kind,anchor=new Date(),completedOnly=false){
  const now=new Date(anchor),meta={kind,label:'复盘',start:null,end:null,key:''};
  if(kind==='week'){const start=new Date(now);const day=start.getDay()||7;start.setDate(start.getDate()-day+1);const end=new Date(completedOnly?start:new Date());if(completedOnly)end.setDate(start.getDate()+6);meta.label=completedOnly?'上周复盘':'本周复盘';meta.start=start;meta.end=end;meta.key=`week:${fmtDate(start)}`;if(completedOnly){start.setDate(start.getDate()-7);end.setDate(end.getDate()-7);meta.start=start;meta.end=end;meta.key=`week:${fmtDate(start)}`}}
  if(kind==='month'){let y=now.getFullYear(),m=now.getMonth();if(completedOnly){m-=1;if(m<0){m=11;y-=1}}meta.label=completedOnly?'月度复盘':'本月复盘';meta.start=new Date(y,m,1);meta.end=completedOnly?endOfMonth(y,m):now;meta.key=`month:${y}-${String(m+1).padStart(2,'0')}`}
  if(kind==='quarter'){let y=now.getFullYear(),q=Math.floor(now.getMonth()/3);if(completedOnly){q-=1;if(q<0){q=3;y-=1}}meta.label=completedOnly?'季度复盘':'本季度复盘';meta.start=new Date(y,q*3,1);meta.end=completedOnly?new Date(y,q*3+3,0):now;meta.key=`quarter:${y}-Q${q+1}`}
  if(kind==='halfyear'){let y=now.getFullYear(),h=now.getMonth()<6?0:1;if(completedOnly){h-=1;if(h<0){h=1;y-=1}}meta.label=completedOnly?(h===0?'上半年复盘':'下半年复盘'):(h===0?'上半年进行中':'下半年进行中');meta.start=new Date(y,h===0?0:6,1);meta.end=completedOnly?new Date(y,h===0?5:11,h===0?30:31):now;meta.key=`halfyear:${y}-H${h+1}`}
  if(kind==='year'){const y=completedOnly?now.getFullYear()-1:now.getFullYear();meta.label=completedOnly?`${y} 年复盘`:'今年复盘';meta.start=new Date(y,0,1);meta.end=completedOnly?new Date(y,11,31):now;meta.key=`year:${y}`}
  return{...meta,startDate:fmtDate(meta.start),endDate:fmtDate(meta.end)}
}
function collectReviewPayload(startDate,endDate){
  const items=[];Object.entries(appData.v2.dayPlans||{}).forEach(([date,plan])=>{if(date>=startDate&&date<=endDate)(plan.items||[]).forEach(item=>items.push({...item,date}))});
  const completedTasks=items.filter(x=>x.status==='done').map(x=>({title:x.title,type:x.type||'任务',date:x.date,important:!!x.important})).slice(0,80);
  const unfinished=items.filter(x=>x.status!=='done').map(x=>x.title).filter(Boolean).slice(0,30);
  const inspirations=(appData.inspirations||[]).filter(i=>i.date&&i.date>=startDate&&i.date<=endDate).map(i=>i.text.slice(0,80)+(i.text.length>80?'...':'')).slice(0,20);
  const notes=(appData.notes||[]).filter(n=>n.date&&n.date>=startDate&&n.date<=endDate).map(n=>(n.title||'随手记')+(n.text?'：'+n.text.slice(0,120):'')).slice(0,15);
  return{tasks:completedTasks,inspirations,notes,unfinished}
}
async function generatePeriodReview(kind,options={}){
  const meta=options.meta||periodMeta(kind,new Date(),!!options.completedOnly);
  setReviewStatus(`⏳ 正在生成${meta.label}...`);
  const payload=collectReviewPayload(meta.startDate,meta.endDate);
  try{
    const res=await fetch('/.netlify/functions/ai-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tasks:payload.tasks,inspirations:payload.inspirations,notes:payload.notes,unfinished:payload.unfinished,period:{start:meta.startDate,end:meta.endDate,label:meta.label,kind}})});
    if(!res.ok)throw new Error('REVIEW_FAILED');
    const data=await res.json(),report=data.report||'暂无报告';
    appData.reviews.unshift({id:genId(),period:meta.label,periodKind:kind,startDate:meta.startDate,endDate:meta.endDate,report,createdAt:nowISO(),autoGenerated:!!options.autoGenerated});
    if(options.autoGenerated&&!appData.v2.reviewMeta.generatedKeys.includes(meta.key))appData.v2.reviewMeta.generatedKeys.push(meta.key);
    appData.v2.reviewMeta.lastAutoCheck=nowISO();
    persist();renderReviews?.();
    setReviewStatus(`✅ ${meta.label} 已生成`);
    return true
  }catch(e){setReviewStatus(`❌ ${meta.label} 生成失败`,true);return false}
}
function enhanceReviewSection(){
  const card=document.querySelector('#reviewSection .card');if(!card||document.getElementById('v2ReviewQuickBtns'))return;
  const select=document.getElementById('reviewPeriod');if(select&&!select.querySelector('option[value="quarter"]'))select.insertAdjacentHTML('beforeend','<option value="quarter">本季度</option><option value="halfyear">近半年</option><option value="year">今年</option>');
  const row=document.createElement('div');row.id='v2ReviewQuickBtns';row.className='v2-row';row.style.marginTop='8px';row.style.flexWrap='wrap';
  row.innerHTML='<button class="v2-secondary" data-review-kind="month">手动月复盘</button><button class="v2-secondary" data-review-kind="quarter">手动季度复盘</button><button class="v2-secondary" data-review-kind="halfyear">手动半年复盘</button><button class="v2-secondary" data-review-kind="year">手动年度复盘</button>';
  card.appendChild(row);
  row.querySelectorAll('[data-review-kind]').forEach(btn=>btn.addEventListener('click',()=>generatePeriodReview(btn.dataset.reviewKind,{completedOnly:false})));
  window.generateReview=async function(){
    const period=document.getElementById('reviewPeriod')?.value||'week';
    if(period==='custom'){
      const start=document.getElementById('reviewStart')?.value,end=document.getElementById('reviewEnd')?.value;
      if(!start||!end){setReviewStatus('请选择起止日期',true);return}
      await generatePeriodReview('custom',{meta:{label:'自定义复盘',startDate:start,endDate:end,key:`custom:${start}:${end}`}})
      return
    }
    await generatePeriodReview(period,{completedOnly:false})
  }
}
async function autoGeneratePeriodicReviews(){
  const kinds=['month','quarter','halfyear','year'];
  for(const kind of kinds){
    const meta=periodMeta(kind,new Date(),true);
    if(meta.endDate>=todayStr())continue;
    if(appData.v2.reviewMeta.generatedKeys.includes(meta.key))continue;
    await generatePeriodReview(kind,{completedOnly:true,autoGenerated:true,meta})
  }
}
function syncCloudForm(){
  const bin=document.getElementById('v2CloudBinId'),key=document.getElementById('v2CloudApiKey'),cloud=appData.v2.cloud||{};
  if(bin)bin.value=cloud.binId||'';
  if(key)key.value=cloud.apiKey||'';
  updateCloudStatus(cloud.lastError?`上次云端操作失败：${cloud.lastError}`:cloud.lastUploadedAt?`最近上传：${cloud.lastUploadedAt.slice(0,16).replace('T',' ')}`:'尚未上传到云端')
}
function updateCloudStatus(text){const el=document.getElementById('v2CloudStatus');if(el)el.textContent=text||''}
function readCloudForm(){
  const cloud=appData.v2.cloud||{},bin=document.getElementById('v2CloudBinId')?.value.trim(),key=document.getElementById('v2CloudApiKey')?.value.trim();
  if(bin!==undefined&&bin)cloud.binId=bin;
  if(key!==undefined&&key)cloud.apiKey=key;
  appData.v2.cloud=cloud;persist();
  return cloud
}
function buildCloudBundle(){
  syncTodaySnapshot();
  return{exportedAt:nowISO(),schemaVersion:2,appData:clone(appData),aiMemory:window.AIMemorySystem?.exportAll?.()||null}
}
function importCloudBundle(bundle){
  if(!bundle?.appData||!Array.isArray(bundle.appData.tasks))throw new Error('INVALID_BUNDLE');
  Object.keys(appData).forEach(k=>delete appData[k]);
  Object.assign(appData,clone(bundle.appData));
  ensureDataShape();
  window.AIMemorySystem?.importAll?.(bundle.aiMemory||{});
  persist();syncTodaySnapshot();render();renderPlanner();renderFinanceLink();renderReviews?.();syncCloudForm();
}
function compressLocalData(){
  const threshold=new Date();threshold.setDate(threshold.getDate()-60);const ocrThreshold=new Date();ocrThreshold.setDate(ocrThreshold.getDate()-45);
  let archivedDays=0,removedOcrNotes=0;
  Object.keys(appData.v2.dayPlans||{}).forEach(ds=>{if(ds>=fmtDate(threshold))return;const plan=appData.v2.dayPlans[ds];if(!plan||!plan.items?.length)return;appData.v2.archives.daySummaries.push({date:ds,total:plan.items.length,done:plan.items.filter(x=>x.status==='done').length,titles:plan.items.slice(0,8).map(x=>x.title),archivedAt:nowISO()});delete appData.v2.dayPlans[ds];archivedDays++});
  appData.v2.archives.daySummaries=appData.v2.archives.daySummaries.sort((a,b)=>a.date.localeCompare(b.date)).slice(-180);
  appData.notes=(appData.notes||[]).filter(note=>{const tag=note.source==='ocr'||note.title==='手写识别';if(!tag||!note.date||note.date>=fmtDate(ocrThreshold))return true;removedOcrNotes++;appData.v2.archives.ocrCleanupLog.push({id:note.id,date:note.date,title:note.title||'手写识别',removedAt:nowISO()});return false});
  appData.v2.archives.ocrCleanupLog=appData.v2.archives.ocrCleanupLog.slice(-300);
  appData.v2.cloud.lastCompressedAt=nowISO();persist();
  return{archivedDays,removedOcrNotes}
}
async function uploadCloudBackup(options={}){
  const cloud=readCloudForm();if(!cloud.binId||!cloud.apiKey){updateCloudStatus('请先填写 Bin ID 和 API Key');return}
  updateCloudStatus('正在上传到云端…');
  const bundle=buildCloudBundle();
  try{
    const res=await fetch(`https://api.jsonbin.io/v3/b/${encodeURIComponent(cloud.binId)}`,{method:'PUT',headers:{'Content-Type':'application/json','X-Master-Key':cloud.apiKey},body:JSON.stringify(bundle)});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    cloud.lastUploadedAt=nowISO();cloud.remoteDigest=`${(bundle.appData.tasks||[]).length}任务/${Object.keys(bundle.appData.v2?.dayPlans||{}).length}天`;cloud.lastError=null;persist();
    let suffix='';if(options.compressAfter){const result=compressLocalData();suffix=`，并已压缩本地：${result.archivedDays} 天计划、${result.removedOcrNotes} 条旧 OCR`}
    updateCloudStatus(`上传成功：${cloud.lastUploadedAt.slice(0,16).replace('T',' ')}${suffix}`);toast('云端备份已完成')
  }catch(e){cloud.lastError=String(e.message||e);persist();updateCloudStatus(`上传失败：${cloud.lastError}`)}
}
async function restoreCloudBackup(){
  const cloud=readCloudForm();if(!cloud.binId||!cloud.apiKey){updateCloudStatus('请先填写 Bin ID 和 API Key');return}
  if(!confirm('将用云端备份覆盖当前 V2 数据，但不会影响原版。继续吗？'))return;
  updateCloudStatus('正在从云端恢复…');
  try{
    const res=await fetch(`https://api.jsonbin.io/v3/b/${encodeURIComponent(cloud.binId)}/latest`,{headers:{'X-Master-Key':cloud.apiKey}});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const data=await res.json(),bundle=data.record||data;
    importCloudBundle(bundle);
    appData.v2.cloud.lastRestoreAt=nowISO();appData.v2.cloud.lastError=null;persist();
    updateCloudStatus(`恢复成功：${appData.v2.cloud.lastRestoreAt.slice(0,16).replace('T',' ')}`);toast('已恢复云端备份')
  }catch(e){appData.v2.cloud.lastError=String(e.message||e);persist();updateCloudStatus(`恢复失败：${appData.v2.cloud.lastError}`)}
}

function nativePlugins(){return window.Capacitor?.Plugins||null}
let activeTimeInput=null;
function ensureTimePicker(){
  if(document.getElementById('v2TimePicker'))return;
  const wrap=document.createElement('div');wrap.id='v2TimePicker';wrap.className='v2-overlay';
  const hourOptions=Array.from({length:24},(_,i)=>`<button class="v2-secondary" data-hour="${String(i).padStart(2,'0')}">${String(i).padStart(2,'0')}</button>`).join('');
  const minuteOptions=Array.from({length:60},(_,i)=>`<button class="v2-secondary" data-minute="${String(i).padStart(2,'0')}">${String(i).padStart(2,'0')}</button>`).join('');
  wrap.innerHTML=`<div class="v2-sheet"><div class="v2-sheet-head"><h2>选择时间</h2><button id="v2TimeClose">×</button></div><div class="v2-panel"><h3>常用快捷时间</h3><div class="v2-quick-time-row" id="v2QuickTimes"><button class="v2-secondary" data-quick="08:00">早上</button><button class="v2-secondary" data-quick="10:00">上午</button><button class="v2-secondary" data-quick="12:00">中午</button><button class="v2-secondary" data-quick="15:00">下午</button><button class="v2-secondary" data-quick="20:00">晚上</button><button class="v2-secondary" data-quick="22:30">睡前</button></div></div><div class="v2-grid"><div class="v2-panel"><h3>小时</h3><div class="v2-time-wheel" id="v2HourList">${hourOptions}</div></div><div class="v2-panel"><h3>分钟</h3><div class="v2-time-wheel" id="v2MinuteList">${minuteOptions}</div></div></div><div class="v2-row end"><button class="v2-secondary" id="v2TimeNow">现在</button><button class="v2-primary" id="v2TimeSave">确定</button></div></div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click',e=>{if(e.target===wrap)closeTimePicker()});
  document.getElementById('v2TimeClose').addEventListener('click',closeTimePicker);
  document.getElementById('v2QuickTimes').addEventListener('click',e=>{const btn=e.target.closest('[data-quick]');if(!btn)return;setTimePickerValue(btn.dataset.quick)});
  document.getElementById('v2HourList').addEventListener('click',e=>{const btn=e.target.closest('[data-hour]');if(!btn)return;const minute=(document.getElementById('v2MinuteList').dataset.selected||'00');setTimePickerValue(`${btn.dataset.hour}:${minute}`)});
  document.getElementById('v2MinuteList').addEventListener('click',e=>{const btn=e.target.closest('[data-minute]');if(!btn)return;const hour=(document.getElementById('v2HourList').dataset.selected||'09');setTimePickerValue(`${hour}:${btn.dataset.minute}`)});
  document.getElementById('v2TimeNow').addEventListener('click',()=>{const now=new Date();setTimePickerValue(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`)});
  document.getElementById('v2TimeSave').addEventListener('click',commitTimePicker);
  bindTimeWheelScroll('v2HourList','hour');
  bindTimeWheelScroll('v2MinuteList','minute');
}
function setTimePickerValue(value){
  const[hour='09',minute='00']=String(value||'09:00').split(':');
  const hourList=document.getElementById('v2HourList'),minuteList=document.getElementById('v2MinuteList');
  hourList.dataset.selected=hour;minuteList.dataset.selected=minute;
  hourList.querySelectorAll('[data-hour]').forEach(btn=>btn.classList.toggle('v2-primary',btn.dataset.hour===hour));
  minuteList.querySelectorAll('[data-minute]').forEach(btn=>btn.classList.toggle('v2-primary',btn.dataset.minute===minute));
  centerWheelButton(hourList,`[data-hour="${hour}"]`);
  centerWheelButton(minuteList,`[data-minute="${minute}"]`);
}
function bindTimeWheelScroll(id,kind){
  const list=document.getElementById(id);if(!list)return;
  let timer=null;
  list.addEventListener('scroll',()=>{
    clearTimeout(timer);
    timer=setTimeout(()=>{
      const selected=centerWheelNearest(list,kind);
      if(!selected)return;
      if(kind==='hour'){
        const minute=document.getElementById('v2MinuteList')?.dataset.selected||'00';
        setTimePickerValue(`${selected}:${minute}`);
      }else{
        const hour=document.getElementById('v2HourList')?.dataset.selected||'09';
        setTimePickerValue(`${hour}:${selected}`);
      }
    },90);
  },{passive:true});
}
function centerWheelNearest(list,kind){
  const attr=kind==='hour'?'data-hour':'data-minute';
  const buttons=[...list.querySelectorAll(`[${attr}]`)];if(!buttons.length)return'';
  const mid=list.scrollTop+list.clientHeight/2;
  let best=null,bestDelta=Infinity;
  buttons.forEach(btn=>{
    const center=btn.offsetTop+btn.offsetHeight/2;
    const delta=Math.abs(center-mid);
    if(delta<bestDelta){bestDelta=delta;best=btn}
  });
  if(!best)return'';
  centerWheelButton(list,`[${attr}="${best.getAttribute(attr)}"]`);
  return best.getAttribute(attr)||'';
}
function centerWheelButton(list,selector){
  const btn=list?.querySelector(selector);if(!btn)return;
  const target=btn.offsetTop-(list.clientHeight-btn.offsetHeight)/2;
  if(Math.abs(list.scrollTop-target)>3)list.scrollTop=target;
}
function openTimePickerFor(input){
  activeTimeInput=input;ensureTimePicker();setTimePickerValue(input.value||'09:00');document.getElementById('v2TimePicker').classList.add('show');
}
function closeTimePicker(){document.getElementById('v2TimePicker')?.classList.remove('show');activeTimeInput=null}
function commitTimePicker(){
  if(!activeTimeInput)return closeTimePicker();
  const hour=document.getElementById('v2HourList').dataset.selected||'09',minute=document.getElementById('v2MinuteList').dataset.selected||'00';
  activeTimeInput.value=`${hour}:${minute}`;
  activeTimeInput.dispatchEvent(new Event('change',{bubbles:true}));
  closeTimePicker();
}
function installTimePickerHooks(){
  ensureTimePicker();
  document.addEventListener('focusin',e=>{const input=e.target.closest('input[type="time"]');if(!input)return;input.blur();openTimePickerFor(input)});
  document.addEventListener('click',e=>{const input=e.target.closest('input[type="time"]');if(!input)return;e.preventDefault();openTimePickerFor(input)});
}
function getTaskReminderDate(task){
  if(!task)return null;
  if(task.scheduledDate)return task.scheduledDate;
  if(task.type==='临时')return todayStr();
  if(task.type==='项目'||task.type==='每日')return todayStr();
  if(task.type==='循环')return getCyclicNext(task);
  return todayStr();
}
function buildReminderItemFromTask(task){
  if(!task)return null;
  const important=!!(task.important||(task.type==='临时'&&task.alarmTime));
  return{id:'task-reminder-'+task.id,title:task.title,alarmTime:task.alarmTime||'',plannedStart:task.scheduledStart||'',important,reminderMode:important?'alarm':'notification'};
}
function syncTaskReminder(task){
  const item=buildReminderItemFromTask(task),date=getTaskReminderDate(task);
  if(!item||!date)return false;
  if(!item.alarmTime&&!item.plannedStart)return false;
  scheduleItem(item,date);
  return true;
}
async function openTaskCalendar(task,dateOverride){
  const effectiveDate=dateOverride||task?.scheduledDate||selectedDay;
  const event=window.createCalendarEvent?.(task,effectiveDate);
  if(!event){toast('这项任务暂时无法加入日历');return false}
  const plugins=nativePlugins();
  if(plugins?.TaskCalendar){
    try{
      await plugins.TaskCalendar.openInsert({title:event.title,startIso:event.startIso,endIso:event.endIso,description:event.description});
      toast('已打开手机日历，请确认保存');
      return true;
    }catch(e){}
  }
  if(task?.sourceTaskId)return downloadFallbackCalendar(task.sourceTaskId,effectiveDate);
  if(task?.id&&appData.tasks.some(x=>x.id===task.id))return downloadFallbackCalendar(task.id,effectiveDate);
  const fallbackId='calendar-fallback-'+genId();
  appData.tasks.push({id:fallbackId,type:task.type||'临时',title:event.title,scheduledDate:effectiveDate,scheduledStart:task.plannedStart||task.scheduledStart||task.alarmTime||'09:00',scheduledEnd:task.plannedEnd||task.scheduledEnd||shiftMinutes(task.plannedStart||task.scheduledStart||task.alarmTime||'09:00',60),timeLabel:task.timeLabel||'',alarmTime:task.alarmTime||'',important:!!task.important});
  try{return downloadFallbackCalendar(fallbackId,effectiveDate)}finally{appData.tasks=appData.tasks.filter(x=>x.id!==fallbackId)}
}
function downloadFallbackCalendar(taskId,dateOverride){downloadICS(taskId,dateOverride);toast('已生成日历文件，可导入手机日历');return true}
async function initNativeNotifications(){const plugins=nativePlugins(),ln=plugins?.LocalNotifications;if(!ln)return false;try{
  let permission=await ln.checkPermissions();if(permission.display!=='granted')permission=await ln.requestPermissions();if(permission.display!=='granted'){appData.v2.notifications.nativeReady=false;persist();return false}
  await ln.createChannel({id:'regular-task',name:'普通任务提醒',description:'普通任务到点通知',importance:3,visibility:1,vibration:true});
  await ln.createChannel({id:'important-alarm',name:'重要任务闹钟',description:'重要任务持续提醒',importance:5,visibility:1,vibration:true});
  await ln.registerActionTypes({types:[{id:'TASK_ACTIONS',actions:[{id:'complete',title:'完成'},{id:'snooze',title:'稍后10分钟',foreground:true}]}]});
  await ln.addListener('localNotificationActionPerformed',event=>handleNativeNotificationAction(event));
  if(plugins?.TaskAlarm){const pending=await plugins.TaskAlarm.getPendingActions();for(const action of pending.actions||[]){const found=locatePlanItem(action.itemId);if(found&&action.action==='complete'){found.item.status='done';found.item.completedAt=nowISO()}}}
  appData.v2.notifications.nativeReady=true;persist();return true
 }catch(e){appData.v2.notifications.nativeReady=false;persist();return false}}
async function requestExactAlarmPermission(){const plugin=nativePlugins()?.TaskAlarm;if(!plugin){toast('安装个人 APK 后可授权重要闹钟');return}await plugin.openExactAlarmSettings();toast('请在系统页面允许“闹钟和提醒”')}
function locatePlanItem(id){for(const[date,plan]of Object.entries(appData.v2.dayPlans)){const item=(plan.items||[]).find(x=>x.id===id);if(item)return{date,item}}return null}
async function handleNativeNotificationAction(event){const action=event.actionId,extra=event.notification?.extra||{},found=locatePlanItem(extra.itemId);if(!found)return;if(action==='complete'||action==='tap'){found.item.status='done';found.item.completedAt=nowISO();persist();render()}else if(action==='snooze'){const at=new Date(Date.now()+10*60000),copy=Object.assign({},found.item,{plannedStart:`${String(at.getHours()).padStart(2,'0')}:${String(at.getMinutes()).padStart(2,'0')}`,alarmTime:`${String(at.getHours()).padStart(2,'0')}:${String(at.getMinutes()).padStart(2,'0')}`});await scheduleItem(copy,dateKey(at));toast('已稍后10分钟提醒')}}
async function scheduleItem(item,ds){if(!item.alarmTime&&!item.plannedStart)return;const time=item.alarmTime||item.plannedStart,at=new Date(`${ds}T${time}:00`);if(at<=new Date())return;const plugins=nativePlugins();try{
  let nativeAlarm=false;if(item.reminderMode==='alarm'&&plugins?.TaskAlarm){try{await plugins.TaskAlarm.schedule({id:hashId(item.id),title:item.title,itemId:item.id,date:ds,atMillis:at.getTime()});nativeAlarm=true;appData.v2.notifications.nativeReady=true}catch(e){toast('重要闹钟尚未授权，已改用普通通知')}}
  if(!nativeAlarm&&plugins?.LocalNotifications){await plugins.LocalNotifications.schedule({notifications:[{id:hashId(item.id),title:item.important?'重要任务':'任务提醒',body:item.title,schedule:{at,allowWhileIdle:true},channelId:item.important?'important-alarm':'regular-task',actionTypeId:'TASK_ACTIONS',ongoing:!!item.important,autoCancel:!item.important,extra:{itemId:item.id,date:ds}}]});appData.v2.notifications.nativeReady=true}
  appData.v2.notifications.scheduled[item.id]={at:at.toISOString(),mode:item.reminderMode};persist();
 }catch(e){appData.v2.notifications.nativeReady=false}}
function schedulePendingReminders(){
  Object.entries(appData.v2.dayPlans).forEach(([ds,p])=>(p.items||[]).filter(x=>x.status!=='done').forEach(x=>scheduleItem(x,ds)));
  appData.tasks.forEach(task=>syncTaskReminder(task));
  scheduleBirthdayReminders();
}
function nextBirthdayReminderDate(birthday){
  const now=new Date(),baseYear=now.getFullYear();
  for(let offset=0;offset<=1;offset++){
    const target=new Date(baseYear+offset,Number(birthday.month)-1,Number(birthday.day),9,0,0,0);
    target.setDate(target.getDate()-Number(birthday.remindDays||0));
    if(target>now)return target;
  }
  return null;
}
async function scheduleBirthdayReminders(){
  const plugins=nativePlugins();if(!plugins?.LocalNotifications)return;
  const notifications=(appData.birthdays||[]).map(b=>{
    const at=nextBirthdayReminderDate(b);if(!at)return null;
    return{id:hashId(`birthday-${b.id}-${dateKey(at)}`),title:'生日提醒',body:Number(b.remindDays||0)>0?`${b.name} 还有 ${b.remindDays} 天过生日 🎂`:`今天是 ${b.name} 的生日 🎂`,schedule:{at,allowWhileIdle:true},channelId:'regular-task',extra:{birthdayId:b.id,date:dateKey(at)}}}).filter(Boolean);
  if(!notifications.length)return;
  try{await plugins.LocalNotifications.schedule({notifications});}catch(e){}
}
function scheduleAIMemorySuggestion(){const ai=window.AIMemorySystem,suggestion=ai?.nextSuggestion(appData);if(!suggestion||!appData.v2.notifications.nativeReady)return;const key='tm_ai_last_proactive_push',today=todayStr();if(localStorage.getItem(key)===today)return;let date=today,time=suggestion.time||'09:00',at=new Date(`${date}T${time}:00`);if(at<=new Date()){at=new Date(Date.now()+60000);date=dateKey(at);time=`${String(at.getHours()).padStart(2,'0')}:${String(at.getMinutes()).padStart(2,'0')}`}scheduleItem({id:'ai-proactive-'+today,title:suggestion.text,type:suggestion.type,plannedStart:time,important:false,reminderMode:'notification'},date);localStorage.setItem(key,today)}
function maybeSendBirthdayWebNotice(){
  if(!appData.settings?.notifications)return;
  if(!('Notification'in window)||Notification.permission!=='granted')return;
  const now=new Date(),today=dateKey(now);
  (appData.birthdays||[]).forEach(b=>{
    const at=nextBirthdayReminderDate(b);if(!at)return;
    if(dateKey(at)!==today)return;
    const key=`birthday-web-${b.id}-${today}`;
    if(localStorage.getItem(key))return;
    const body=Number(b.remindDays||0)>0?`${b.name} 还有 ${b.remindDays} 天过生日 🎂`:`今天是 ${b.name} 的生日 🎂`;
    new Notification('生日提醒',{body});
    localStorage.setItem(key,'1');
  });
}

function exportV2(){syncTodaySnapshot();persist();const payload=JSON.stringify(buildCloudBundle(),null,2),blob=new Blob([payload],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`task-manager-v2-backup-${todayStr()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('完整备份已导出')}
async function importV2(event){const file=event.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());const bundle=data?.appData?data:{appData:data,aiMemory:null};if(!bundle?.appData||typeof bundle.appData!=='object'||!Array.isArray(bundle.appData.tasks))throw new Error();if(!confirm('导入内容会写入 V2 独立副本，不会修改原版。继续吗？'))return;importCloudBundle(bundle);appData.v2.migration={source:'manual-json-import',migratedAt:nowISO(),legacyHistoryUnavailable:!data.v2};persist();document.getElementById('v2ImportBanner').classList.add('v2-hidden');toast('已导入 V2 独立副本')}catch(e){alert('文件无法识别，请使用导出的 JSON 备份文件')}}

function captureLegacyActions(){document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action,id=btn.dataset.id;if(action==='temp-done'){const task=appData.tasks.find(x=>x.id===id);if(task){const item=itemFromTask(task,todayStr());item.status='done';item.completedAt=nowISO();upsertPlanItem(todayStr(),item)}}},true)}

window.v2Boot=function(){
  patchLegacyHooks();const source=loadIsolatedData();injectShell();installTimePickerHooks();captureLegacyActions();syncTodaySnapshot();updateHabitSummary();window.AIMemorySystem?.init(appData);enhanceReviewSection();persist();render();
  try{document.getElementById('loadingOverlay')?.classList.remove('show')}catch(e){}
  if(source==='empty')document.getElementById('v2ImportBanner').classList.remove('v2-hidden');
  if(source==='legacy')toast('已把原版本机数据复制到 V2，原版未改变');
  autoGeneratePeriodicReviews();
  syncCloudForm();
  initNativeNotifications().then(()=>{schedulePendingReminders();scheduleAIMemorySuggestion()});
  maybeSendBirthdayWebNotice();
};
})();
