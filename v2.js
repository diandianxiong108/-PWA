(function(){
const STORAGE_KEY='task-manager-v2-data';
const LEGACY_KEY='appCache';
const COLOR={每日:'#64b5f6',项目:'#ce93d8',临时:'#ffb74d',循环:'#81c784',记录:'#90a4ae'};
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

function defaultV2(){return{
  schemaVersion:2,
  createdAt:nowISO(),
  dayPlans:{},
  planner:{
    profile:{maxTaskTypes:3,insertLowResistance:true,choresPerDay:1,quietStart:'22:30',quietEnd:'07:30',principles:'一天不超过三种任务类型；精力低时优先低阻力任务；家务少量穿插。'},
    batches:[],activeBatchId:null,habitSignals:{},suggestions:[]
  },
  financeLink:{category:'保研小红书主包',wishId:null,linkedEntryIds:[],pendingEntryIds:[]},
  notifications:{regularEnabled:true,alarmEnabled:true,nativeReady:false,scheduled:{}},
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
  appData.v2.dayPlans=appData.v2.dayPlans||{};
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
  saveCache=persist;
  loadCache=()=>!!parseJSON(localStorage.getItem(STORAGE_KEY),null);
  syncFromRemote=async()=>false;
  _putRemote=async()=>false;
  toJSONBin=function(){syncTodaySnapshot();persist();refreshPlannerStats();schedulePendingReminders();};
  checkDailyReset=function(){const ds=todayStr();if(appData.lastVisitDate!==ds){appData.tasks.forEach(t=>{if(t.type==='每日')t.completedToday=false;if(t.type==='临时')t.hiddenToday=false});appData.lastVisitDate=ds;syncTodaySnapshot();persist();render()}};
  getTasksForDate=function(date){return displayItems(dateKey(date)).map(x=>({id:x.id,color:COLOR[x.type]||COLOR.记录,title:x.title,timeLabel:x.timeLabel,status:x.status,important:x.important}))};
  getWeekTasksForDay=function(ds){return getTasksForDate(new Date(ds+'T12:00:00'))};
  showDayTasks=function(value){const ds=dateKey(value);calSelectedDate=new Date(ds+'T12:00:00');selectedDay=ds;renderCalendar();openDaySheet(ds)};
  exportData=exportV2;
  importData=importV2;
  const legacySaveBill=saveBill;
  saveBill=function(){const before=new Set(appData.records.entries.map(x=>x.id));legacySaveBill();appData.records.entries.filter(x=>!before.has(x.id)).forEach(linkFinanceEntry);persist();renderFinanceLink()};
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
  const settingsActions=document.querySelector('#settingsPopup .form-actions');if(settingsActions){const tools=document.createElement('div');tools.className='v2-row';tools.style.marginTop='10px';tools.innerHTML='<button class="v2-secondary" id="v2BackupBtn">导出 V2 完整备份</button><button class="v2-secondary" id="v2ExactAlarmBtn">授权重要闹钟</button>';settingsActions.parentElement.appendChild(tools);document.getElementById('v2BackupBtn').addEventListener('click',exportV2);document.getElementById('v2ExactAlarmBtn').addEventListener('click',requestExactAlarmPermission)}
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
function openModulePage(id){const cfg=HOME_ROUTES[id],section=document.getElementById(id);if(!cfg||!section)return;const body=beginRoute(cfg[0],cfg[1],id.replace('Section',''));const marker=document.createComment('v2-return-'+id);section.parentNode.insertBefore(marker,section);const cards=[...section.querySelectorAll('.card')],expandedStates=cards.map(c=>c.classList.contains('expanded'));routeState=Object.assign(routeState,{section,marker,wasCollapsed:section.classList.contains('collapsed'),cards,expandedStates});section.classList.remove('collapsed','v2-home-module');cards.forEach(c=>c.classList.add('expanded'));body.appendChild(section)}
function openPlannerPage(){const body=beginRoute('智能规划室','规划','planner'),planner=document.getElementById('v2Planner');routeState.planner=planner;body.appendChild(planner);renderPlanner()}
function requestCloseRoute(){if(routeState)history.back()}
function closeRouteInternal(restoreScroll=true){if(!routeState)return;const state=routeState;routeState=null;if(state.section){state.cards?.forEach((c,i)=>c.classList.toggle('expanded',state.expandedStates[i]));state.marker.parentNode.insertBefore(state.section,state.marker);state.marker.remove();state.section.classList.add('v2-home-module');state.section.classList.toggle('collapsed',state.wasCollapsed)}if(state.planner)document.getElementById('v2Parking').appendChild(state.planner);document.getElementById('v2RouteBody').innerHTML='';document.getElementById('v2RoutePage').classList.remove('show');document.querySelector('.app').classList.remove('v2-hidden');if(restoreScroll)requestAnimationFrame(()=>window.scrollTo(0,homeScroll))
}

function openDaySheet(ds){selectedDay=ds;const d=new Date(ds+'T12:00:00');beginRoute(`${d.getMonth()+1}月${d.getDate()}日 · 周${['日','一','二','三','四','五','六'][d.getDay()]}`,'提醒','day');renderDaySheet()}
function closeDaySheet(){requestCloseRoute()}

function renderDaySheet(){
  const items=displayItems(selectedDay),done=items.filter(x=>x.status==='done').length;const past=selectedDay<todayStr();
  let html=`<div class="v2-day-summary"><span>${items.length} 项任务</span><span>${done} 项完成</span><span>${past?'历史回顾':selectedDay===todayStr()?'今天':'未来计划'}</span></div>`;
  if(past&&!getPlan(selectedDay,false))html+='<div class="v2-warning">旧版没有保存这一天的任务快照，因此只能显示当时实际保存下来的记录。V2 启用后的日期会完整保留。</div>';
  html+=items.length?items.map(item=>`<div class="v2-day-item ${item.status==='done'?'done':''}" style="border-left-color:${COLOR[item.type]||COLOR.记录}"><button class="v2-day-check" data-v2-toggle="${esc(item.id)}">✓</button><div><div class="v2-day-title">${esc(item.title)}</div><div class="v2-day-meta">${esc(item.type||'任务')}${item.timeLabel?' · '+esc(item.timeLabel):''}${item.plannedStart?' · '+esc(item.plannedStart):''}${item.reminderMode==='alarm'?' · 闹钟':' · 通知'}</div></div><button class="v2-important" data-v2-important="${esc(item.id)}" title="切换重要提醒">${item.important?'★':'☆'}</button></div>`).join(''):'<div class="v2-empty">这一天还没有安排<br>可以在下面添加一项</div>';
  html+=`<div class="v2-panel"><h3>＋ 安排到这一天</h3><div class="v2-fields"><label>任务内容<input id="v2DayNewTitle" placeholder="要做什么"></label><div class="v2-grid"><label>类型<select id="v2DayNewType"><option>临时</option><option>每日</option><option>项目</option><option>循环</option></select></label><label>时间<input id="v2DayNewTime" type="time"></label></div><label><span><input id="v2DayNewImportant" type="checkbox"> 重要任务（闹钟式提醒）</span></label><button class="v2-primary" id="v2DayAdd">加入当日计划</button></div></div>`;
  const target=routeState?.kind==='day'?document.getElementById('v2RouteBody'):document.getElementById('v2DayBody');target.innerHTML=html;
  target.querySelectorAll('[data-v2-toggle]').forEach(b=>b.addEventListener('click',()=>toggleDayItem(b.dataset.v2Toggle)));
  target.querySelectorAll('[data-v2-important]').forEach(b=>b.addEventListener('click',()=>toggleImportant(b.dataset.v2Important)));
  document.getElementById('v2DayAdd').addEventListener('click',addManualDayItem);
}

function findDisplayedItem(ds,id){return displayItems(ds).find(x=>x.id===id)}
function materializeItem(ds,id){const existing=getPlan(ds,true).items.find(x=>x.id===id);if(existing)return existing;const predicted=findDisplayedItem(ds,id);return predicted?upsertPlanItem(ds,predicted):null}
function toggleDayItem(id){const item=materializeItem(selectedDay,id);if(!item)return;item.status=item.status==='done'?'todo':'done';item.completedAt=item.status==='done'?nowISO():null;if(item.sourceTaskId&&selectedDay===todayStr()){const task=appData.tasks.find(x=>x.id===item.sourceTaskId);if(task?.type==='每日'){task.completedToday=item.status==='done';task.lastCompletedDate=task.completedToday?selectedDay:task.lastCompletedDate}else if(task?.type==='循环'&&item.status==='done')task.lastDoneDate=selectedDay}persist();renderDaySheet();render();}
function toggleImportant(id){const item=materializeItem(selectedDay,id);if(!item)return;item.important=!item.important;item.reminderMode=item.important?'alarm':'notification';persist();scheduleItem(item,selectedDay);renderDaySheet()}
function addManualDayItem(){const title=document.getElementById('v2DayNewTitle').value.trim();if(!title){toast('先写下任务内容');return}const important=document.getElementById('v2DayNewImportant').checked;const item={id:'plan-'+genId(),title,type:document.getElementById('v2DayNewType').value,status:'todo',plannedStart:document.getElementById('v2DayNewTime').value,timeLabel:'',important,reminderMode:important?'alarm':'notification',alarmTime:document.getElementById('v2DayNewTime').value,createdAt:nowISO(),completedAt:null};upsertPlanItem(selectedDay,item);persist();scheduleItem(item,selectedDay);renderDaySheet();renderCalendar();toast('已加入当日计划')}

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
  const notes=document.getElementById('notesSection');const ocr=document.createElement('div');ocr.id='v2OcrPanel';ocr.className='v2-panel';ocr.innerHTML='<h3>📷 手写内容识别</h3><p class="hint">拍照后先识别为文字，确认修改后再录入，不会直接写入任务。</p><input id="v2OcrFile" type="file" accept="image/*" capture="environment" style="margin-top:8px;font-size:12px"><img id="v2OcrPreview" class="v2-ocr-preview" alt="手写图片预览"><div class="v2-fields"><textarea id="v2OcrText" rows="4" placeholder="识别结果会显示在这里，也可以手动修改"></textarea><div class="v2-row"><button class="v2-secondary" id="v2OcrRun">识别图片</button><select id="v2OcrTarget" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:9px"><option value="note">存为随手记</option><option value="today">加入今日任务</option><option value="batch">加入当前批次</option></select><button class="v2-primary" id="v2OcrSave">确认录入</button></div></div>';notes.insertBefore(ocr,notes.children[1]||null);
  document.getElementById('v2OcrFile').addEventListener('change',previewOCR);
  document.getElementById('v2OcrRun').addEventListener('click',recognizeOCR);
  document.getElementById('v2OcrSave').addEventListener('click',saveOCRText);
  renderFinanceLink();
}

function renderFinanceLink(){const box=document.getElementById('v2FinanceLink');if(!box)return;const link=appData.v2.financeLink,options=appData.wishes.map(w=>`<option value="${esc(w.id)}" ${w.id===link.wishId?'selected':''}>${esc(w.title)}</option>`).join('');box.innerHTML=`<h3>🔗 保研主包自动归集</h3><p class="hint">收入分类选择“${esc(link.category)}”后，金额自动计入关联目标；每笔账单只归集一次。</p><div class="v2-row" style="margin-top:8px"><select id="v2FinanceWish" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:9px"><option value="">选择愿望基金目标</option>${options}</select><button class="v2-secondary" id="v2FinanceSave">保存关联</button></div>`;document.getElementById('v2FinanceSave').addEventListener('click',()=>{link.wishId=document.getElementById('v2FinanceWish').value||null;persist();toast('自动归集目标已保存')})}
function linkFinanceEntry(entry){const link=appData.v2.financeLink;if(!entry||entry.type!=='income'||entry.category!==link.category||link.linkedEntryIds.includes(entry.id))return;const wish=appData.wishes.find(w=>w.id===link.wishId)||appData.wishes.find(w=>/保研.*主包|主包/.test(w.title));if(!wish){if(!link.pendingEntryIds.includes(entry.id))link.pendingEntryIds.push(entry.id);return}wish.currentAmount=(Number(wish.currentAmount)||0)+Number(entry.amount||0);link.linkedEntryIds.push(entry.id);link.pendingEntryIds=link.pendingEntryIds.filter(x=>x!==entry.id);toast(`已自动计入「${wish.title}」`)}

function previewOCR(e){const file=e.target.files?.[0];if(!file)return;const img=document.getElementById('v2OcrPreview');img.src=URL.createObjectURL(file);img.style.display='block'}
async function recognizeOCR(){const file=document.getElementById('v2OcrFile').files?.[0];if(!file){toast('请先拍照或选择图片');return}const btn=document.getElementById('v2OcrRun');btn.disabled=true;btn.textContent='识别中…';try{
  if('TextDetector'in window){const bitmap=await createImageBitmap(file),detector=new TextDetector(),lines=await detector.detect(bitmap);document.getElementById('v2OcrText').value=lines.map(x=>x.rawValue).join('\n');toast('已完成本机识别，请检查文字')}
  else{const imageDataUrl=await prepareOCRImage(file);const res=await fetch('/.netlify/functions/ocr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageDataUrl})});if(!res.ok)throw new Error('OCR_NOT_CONFIGURED');const data=await res.json();document.getElementById('v2OcrText').value=data.text||'';toast('识别完成，请检查文字')}
 }catch(e){toast('当前识别服务尚未配置，可先在文本框中修改录入')}finally{btn.disabled=false;btn.textContent='识别图片'}}
async function prepareOCRImage(file){const bitmap=await createImageBitmap(file),max=1800,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();return canvas.toDataURL('image/jpeg',.88)}
function saveOCRText(){const text=document.getElementById('v2OcrText').value.trim();if(!text){toast('没有可录入的文字');return}const target=document.getElementById('v2OcrTarget').value;if(target==='note'){appData.notes.push({id:genId(),title:'手写识别',text,date:todayStr(),createdAt:nowISO(),pinned:false,done:false})}else if(target==='today'){text.split(/\r?\n/).filter(Boolean).forEach(line=>upsertPlanItem(todayStr(),{id:'ocr-'+genId(),title:line.trim(),type:'临时',status:'todo',important:false,reminderMode:'notification',createdAt:nowISO()}))}else{const batch=activeBatch();if(!batch){toast('请先在规划室开启任务批次');return}text.split(/\r?\n/).filter(Boolean).forEach(line=>batch.items.push({id:genId(),title:line.trim(),done:false}))}persist();render();document.getElementById('v2OcrText').value='';toast('已确认录入')}

function nativePlugins(){return window.Capacitor?.Plugins||null}
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
function schedulePendingReminders(){Object.entries(appData.v2.dayPlans).forEach(([ds,p])=>(p.items||[]).filter(x=>x.status!=='done').forEach(x=>scheduleItem(x,ds)))}
function scheduleAIMemorySuggestion(){const ai=window.AIMemorySystem,suggestion=ai?.nextSuggestion(appData);if(!suggestion||!appData.v2.notifications.nativeReady)return;const key='tm_ai_last_proactive_push',today=todayStr();if(localStorage.getItem(key)===today)return;let date=today,time=suggestion.time||'09:00',at=new Date(`${date}T${time}:00`);if(at<=new Date()){at=new Date(Date.now()+60000);date=dateKey(at);time=`${String(at.getHours()).padStart(2,'0')}:${String(at.getMinutes()).padStart(2,'0')}`}scheduleItem({id:'ai-proactive-'+today,title:suggestion.text,type:suggestion.type,plannedStart:time,important:false,reminderMode:'notification'},date);localStorage.setItem(key,today)}

function exportV2(){syncTodaySnapshot();persist();const payload=JSON.stringify(appData,null,2),blob=new Blob([payload],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`task-manager-v2-backup-${todayStr()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('完整备份已导出')}
async function importV2(event){const file=event.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!data||typeof data!=='object'||!Array.isArray(data.tasks))throw new Error();if(!confirm('导入内容会写入 V2 独立副本，不会修改原版。继续吗？'))return;Object.keys(appData).forEach(k=>delete appData[k]);Object.assign(appData,data);ensureDataShape();appData.v2.migration={source:'manual-json-import',migratedAt:nowISO(),legacyHistoryUnavailable:!data.v2};persist();syncTodaySnapshot();render();renderPlanner();renderFinanceLink();document.getElementById('v2ImportBanner').classList.add('v2-hidden');toast('已导入 V2 独立副本')}catch(e){alert('文件无法识别，请使用原版导出的 JSON 文件')}}

function captureLegacyActions(){document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action,id=btn.dataset.id;if(action==='temp-done'){const task=appData.tasks.find(x=>x.id===id);if(task){const item=itemFromTask(task,todayStr());item.status='done';item.completedAt=nowISO();upsertPlanItem(todayStr(),item)}}},true)}

window.v2Boot=function(){
  patchLegacyHooks();const source=loadIsolatedData();injectShell();captureLegacyActions();syncTodaySnapshot();updateHabitSummary();window.AIMemorySystem?.init(appData);persist();render();
  if(source==='empty')document.getElementById('v2ImportBanner').classList.remove('v2-hidden');
  if(source==='legacy')toast('已把原版本机数据复制到 V2，原版未改变');
  initNativeNotifications().then(()=>{schedulePendingReminders();scheduleAIMemorySuggestion()});
};
})();
