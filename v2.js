(function(){
const STORAGE_KEY='task-manager-v2-data';
const LEGACY_KEY='appCache';
const RELEASE_API_URL='https://api.github.com/repos/diandianxiong108/-PWA/releases/latest';
const UPDATE_PAGE_URL='https://github.com/diandianxiong108/-PWA/releases/latest';
let APP_VERSION='2.0.web';
let APP_VERSION_CODE=0;
let APP_PACKAGE_NAME='';
let pendingRemoteUpdate=null;
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
const SECTION_IDS=['dailySection','projectSection','cyclicSection','tempSection','healthSection','birthdaySection','billSection','extraSection','rhythmSection','foodSection','lateNightSection','inspireSection','notesSection','reviewSection','badgeSection','wishSection'];
let currentModule='home';
let selectedDay=todayStr();
let toastTimer=null;
const V2_STICKER_BASE=/(^|\/)v2\//.test(location.pathname.replace(/\\/g,'/'))?'../assets/v2-stickers/':'assets/v2-stickers/';

function clone(value){return JSON.parse(JSON.stringify(value))}
function dateKey(value){const d=value instanceof Date?value:new Date(value);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function nowISO(){return new Date().toISOString()}
function parseJSON(value,fallback){try{return JSON.parse(value)}catch(e){return fallback}}
function hashId(value){let h=0;for(let i=0;i<value.length;i++)h=((h<<5)-h+value.charCodeAt(i))|0;return Math.abs(h)||1}
function numericVersion(value){const matched=String(value||'').match(/(\d+)(?!.*\d)/);return matched?Number(matched[1])||0:0}
function versionToken(){return String(APP_VERSION_CODE||APP_VERSION||'0')}
function versionLabel(){return APP_VERSION_CODE?`${APP_VERSION}`:APP_VERSION}
function toast(text){let el=document.getElementById('v2Toast');if(!el){el=document.createElement('div');el.id='v2Toast';el.className='v2-toast';document.body.appendChild(el)}el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
window.v2Toast=toast;
window.openTaskCalendar=openTaskCalendar;
window.syncTaskReminder=syncTaskReminder;

function defaultV2(){return{
  schemaVersion:2,
  createdAt:nowISO(),
  dayPlans:{},
  emotionLogs:[],
  eatingLogs:[],
  lateNightLogs:[],
  archives:{daySummaries:[],ocrCleanupLog:[]},
  planner:{
    profile:{maxTaskTypes:3,insertLowResistance:true,choresPerDay:1,quietStart:'22:30',quietEnd:'07:30',principles:'一天不超过三种任务类型；精力低时优先低阻力任务；家务少量穿插。',preferLightPlans:0,preferStrongPlans:0,avoidSideHustleWhenLow:0,preferLifeFirst:0,preferMoneyFirst:0,preferPaperFirst:0,preferTidyFirst:0,lastChosenStyle:'正常版'},
    batches:[],activeBatchId:null,habitSignals:{},suggestions:[],planOptions:[],planHistory:[]
  },
  mode:{current:'normal',changedAt:nowISO(),history:[]},
  conversation:{carrySummary:'',historyDigests:[],lastSummarizedAt:null,lastRoundStartedAt:null},
  financeLink:{category:'保研小红书主包',wishId:null,linkedEntryIds:[],pendingEntryIds:[]},
  smartCapture:{pendingTasks:[],taskPool:[],tomorrowAdvice:[],waterLogs:[],uploadLog:[],analysisCache:[]},
  notifications:{regularEnabled:true,alarmEnabled:true,nativeReady:false,scheduled:{}},
  reviewMeta:{generatedKeys:[],lastAutoCheck:null,pending:[]},
  lifeRhythm:{
    days:{},
    emergencyKit:{
      quick:['喝几口水','站起来走两步','深呼吸 5 次','只做一件最小任务'],
      short:['洗把脸或洗澡','喝热饮/奶茶','出门走 10 分钟','听一首歌，不看消息'],
      medium:['小睡 20 分钟','吃点喜欢的东西','彻底离开任务界面半小时','做一点低阻力整理'],
      rest:['今天先停掉深度任务','只保留必要事项','把剩余任务顺延或降级','允许自己先休息']
    }
  },
  cloud:{provider:'jsonbin',binId:'',apiKey:'',lastUploadedAt:null,lastRestoreAt:null,lastCompressedAt:null,remoteDigest:null,lastError:null},
  migration:{source:null,migratedAt:null,legacyHistoryUnavailable:true}
}}

function ensureDataShape(){
  const defaults=defaultV2();
  appData.schemaVersion=2;
  appData.v2=Object.assign(defaults,appData.v2||{});
  appData.v2.planner=Object.assign(defaults.planner,appData.v2.planner||{});
  appData.v2.planner.profile=Object.assign(defaults.planner.profile,appData.v2.planner.profile||{});
  appData.v2.planner.planOptions=Array.isArray(appData.v2.planner.planOptions)?appData.v2.planner.planOptions:[];
  appData.v2.planner.planHistory=Array.isArray(appData.v2.planner.planHistory)?appData.v2.planner.planHistory:[];
  appData.v2.mode=Object.assign(defaults.mode,appData.v2.mode||{});
  appData.v2.mode.history=Array.isArray(appData.v2.mode.history)?appData.v2.mode.history:[];
  appData.v2.conversation=Object.assign(defaults.conversation,appData.v2.conversation||{});
  appData.v2.conversation.historyDigests=Array.isArray(appData.v2.conversation.historyDigests)?appData.v2.conversation.historyDigests:[];
  appData.v2.financeLink=Object.assign(defaults.financeLink,appData.v2.financeLink||{});
  appData.v2.smartCapture=Object.assign(defaults.smartCapture,appData.v2.smartCapture||{});
  appData.v2.smartCapture.pendingTasks=Array.isArray(appData.v2.smartCapture.pendingTasks)?appData.v2.smartCapture.pendingTasks:[];
  appData.v2.smartCapture.taskPool=Array.isArray(appData.v2.smartCapture.taskPool)?appData.v2.smartCapture.taskPool:(appData.v2.smartCapture.pendingTasks||[]);
  if(!appData.v2.smartCapture.pendingTasks.length&&appData.v2.smartCapture.taskPool.length)appData.v2.smartCapture.pendingTasks=appData.v2.smartCapture.taskPool;
  appData.v2.smartCapture.tomorrowAdvice=Array.isArray(appData.v2.smartCapture.tomorrowAdvice)?appData.v2.smartCapture.tomorrowAdvice:[];
  appData.v2.smartCapture.waterLogs=Array.isArray(appData.v2.smartCapture.waterLogs)?appData.v2.smartCapture.waterLogs:[];
  appData.v2.smartCapture.uploadLog=Array.isArray(appData.v2.smartCapture.uploadLog)?appData.v2.smartCapture.uploadLog:[];
  appData.v2.smartCapture.analysisCache=Array.isArray(appData.v2.smartCapture.analysisCache)?appData.v2.smartCapture.analysisCache:[];
  appData.v2.notifications=Object.assign(defaults.notifications,appData.v2.notifications||{});
  appData.v2.reviewMeta=Object.assign(defaults.reviewMeta,appData.v2.reviewMeta||{});
  appData.v2.lifeRhythm=Object.assign(defaults.lifeRhythm,appData.v2.lifeRhythm||{});
  appData.v2.lifeRhythm.days=appData.v2.lifeRhythm.days||{};
  appData.v2.lifeRhythm.emergencyKit=Object.assign(defaults.lifeRhythm.emergencyKit,appData.v2.lifeRhythm.emergencyKit||{});
  appData.v2.cloud=Object.assign(defaults.cloud,appData.v2.cloud||{});
  appData.v2.archives=Object.assign(defaults.archives,appData.v2.archives||{});
  appData.v2.dayPlans=appData.v2.dayPlans||{};
  appData.v2.emotionLogs=Array.isArray(appData.v2.emotionLogs)?appData.v2.emotionLogs:[];
  appData.v2.eatingLogs=Array.isArray(appData.v2.eatingLogs)?appData.v2.eatingLogs:[];
  appData.v2.lateNightLogs=Array.isArray(appData.v2.lateNightLogs)?appData.v2.lateNightLogs:[];
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
function renderTaskPoolRoute(){
  const target=routeState?.kind==='taskPool'?document.getElementById('v2RouteBody'):document.getElementById('taskPoolList');
  if(!target)return;
  const stats=taskPoolDashboardStats(),items=stats.items;
  const shellNotes=[['想做',taskPoolStatusCount('想做')],['待安排',taskPoolStatusCount('待安排')],['已安排到今日',taskPoolStatusCount('已安排到今日')],['暂缓',taskPoolStatusCount('暂缓')]];
  const listHtml=items.length?items.map(item=>`<div class="v2-panel v2-pool-card ${item.status==='暂缓'?'is-paused':''}"><div class="v2-row" style="justify-content:space-between;align-items:flex-start;gap:10px"><div><div class="v2-day-title">${esc(item.title)}</div><div class="v2-day-meta">${esc(item.taskType)} · ${esc(item.status)}${item.deferredUntil?` · 延到 ${esc(item.deferredUntil)}`:''}</div></div><span class="v2-day-status ${item.status==='进行中'?'doing':item.status==='已完成'?'done':item.status==='暂缓'?'deferred':'todo'}">${esc(item.status)}</span></div>${item.note?`<div class="v2-day-meta" style="margin-top:8px;white-space:pre-wrap">${esc(item.note)}</div>`:''}<div class="v2-row" style="margin-top:10px;gap:6px;flex-wrap:wrap"><button class="v2-secondary" data-pool-schedule="${esc(item.id)}">加入今日</button><button class="v2-secondary" data-pool-pause="${esc(item.id)}">${item.status==='暂缓'?'恢复':'暂缓'}</button><button class="v2-danger" data-pool-drop="${esc(item.id)}">${item.status==='放弃'?'删除':'放弃'}</button></div></div>`).join(''):'<div class="v2-panel"><div class="empty-tip">任务池还是空的。想做但不急的，先丢这里就好。</div></div>';
  target.innerHTML=`<div class="v2-route-overview pool"><div class="v2-route-overview-main"><div>${routeEyebrow('taskPool','任务池总览')}<h3>想做的事先放这里，不用天天压在今天</h3><p>这里是 AI 调度素材库。想做、以后做、项目推进但不一定今天做的事，都先在这里待命。</p></div><div class="v2-route-overview-progress"><div class="v2-overview-ring"><strong>${stats.active.length}</strong><span>待用</span></div><div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:${items.length?Math.round((stats.done.length/items.length)*100):0}%"></span></div><small>${stats.done.length} 条已完成 · ${stats.scheduled.length} 条已安排</small></div></div>${routeDecorPair()}</div><div class="v2-overview-cards">${routeCard('detail-icons-v1/icon-folder-cute.png',stats.active.length,'待安排 / 想做')}${routeCard('detail-icons-v1/icon-laptop-cute.png',stats.scheduled.length,'已推到今天')}${routeCard('ui-icons-collage-v1/icon-alarm.png',stats.paused.length,'暂缓中')}${routeCard('detail-icons-v1/icon-folder-cute.png',stats.projectCount,'项目型任务')}</div>${stats.focus.length?`<div class="v2-route-overview-focus">${stats.focus.map(item=>`<span class="v2-chip">${taskEmoji(item)} ${esc(item.title)}</span>`).join('')}</div>`:''}</div><div class="v2-route-mini-grid"><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('taskPool','待命架')}</h3><div class="v2-mini-chip-grid">${shellNotes.map(([label,count])=>`<span class="v2-chip">${label} ${count}</span>`).join('')}</div><p class="hint">以后做、不急做、想做但今天不塞满的，都先留在这里。</p></div><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('taskPool','使用建议')}</h3><ul class="v2-mini-list"><li>先把模糊想法放进来</li><li>明天再挑 1-2 条进今日</li><li>太累的时候只看待安排</li></ul></div></div><div class="v2-panel"><h3>＋ 加入任务池</h3><p class="hint">想做但不一定今天做的事先丢这里，后面再手动加入今日，或者让 AI 帮你挑。</p><div class="v2-fields"><input id="v2PoolTitle" placeholder="写下想做但不一定今天做的事"><div class="v2-grid"><label>状态<select id="v2PoolStatus"><option>想做</option><option selected>待安排</option><option>暂缓</option></select></label><label>类型<select id="v2PoolType"><option>临时</option><option>项目</option><option>每日</option><option>循环</option></select></label></div><textarea id="v2PoolNote" rows="3" placeholder="备注（选填）：比如为什么先放任务池、后面什么时候再碰"></textarea><div class="v2-row end"><button class="v2-primary" id="v2PoolAdd">加入任务池</button></div></div></div>${listHtml}`;
  document.getElementById('v2PoolAdd')?.addEventListener('click',addTaskPoolItemFromForm);
  target.querySelectorAll('[data-pool-schedule]').forEach(btn=>btn.addEventListener('click',()=>scheduleTaskPoolItem(btn.dataset.poolSchedule,todayStr())));
  target.querySelectorAll('[data-pool-pause]').forEach(btn=>btn.addEventListener('click',()=>toggleTaskPoolPause(btn.dataset.poolPause)));
  target.querySelectorAll('[data-pool-drop]').forEach(btn=>btn.addEventListener('click',()=>dropTaskPoolItem(btn.dataset.poolDrop)));
}
function renderDailyRoute(){
  if(routeState?.kind!=='daily')return;
  const body=document.getElementById('v2RouteBody');
  const section=document.getElementById('dailySection');
  if(!body||!section)return;
  body.querySelector('.v2-daily-route-shell')?.remove();
  const notify=notificationStatusSummary();
  const items=appData.tasks.filter(t=>t.type==='每日');
  const visibleItems=items.filter(task=>shouldShowDaily(task));
  const doneCount=items.filter(task=>task.completedToday).length;
  const restCount=items.filter(task=>!shouldShowDaily(task)&&!task.completedToday).length;
  const splitCount=items.filter(task=>String(task.subtask||'').trim()).length;
  const percent=visibleItems.length?Math.round(doneCount/visibleItems.length*100):0;
  const focusItems=items.filter(task=>!task.completedToday).slice(0,4);
  const shell=document.createElement('div');
  shell.className='v2-daily-route-shell';
  shell.innerHTML=`<div class="v2-route-overview daily"><div class="v2-route-overview-main"><div>${routeEyebrow('daily','每日任务')}<h3>把每天都要碰的事收整齐，今天只要先完成眼前这几件</h3><p>打勾、最小行动、AI 拆分、时间设置和日历导出都还在。上面这块只是先帮你扫一眼今天的节奏。</p></div><div class="v2-route-overview-progress"><div class="v2-overview-ring"><strong>${percent}%</strong><span>今日完成度</span></div><div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:${percent}%"></span></div><small>${doneCount} 项已完成 · ${Math.max(visibleItems.length-doneCount,0)} 项待处理</small></div></div>${routeDecorPair()}</div><div class="v2-overview-cards">${routeCard('ui-icons-collage-v1/icon-complete-badge.png',doneCount,'今日完成')}${routeCard('icons-collage-v2/icon-daily-task.png',visibleItems.length,'今天显示')}${routeCard('ui-icons-collage-v1/icon-bell.png',restCount,'今天休息')}${routeCard('icons-collage-v2/icon-note.png',splitCount,'已拆最小行动')}</div>${focusItems.length?`<div class="v2-route-overview-focus">${focusItems.map(item=>`<span class="v2-chip">${esc(item.title)}${item.subtask?` · ${esc(item.subtask)}`:''}</span>`).join('')}</div>`:''}</div><div class="v2-route-mini-grid"><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('daily','今天先碰这些')}</h3><div class="v2-mini-list">${focusItems.slice(0,3).map(item=>`<span class="v2-chip active">${esc(item.title)}</span>`).join('')||'<span class="v2-chip">先去下面新增一项</span>'}</div></div><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('daily','小提醒')}</h3><ul class="v2-mini-list"><li>先做最容易开始的一件</li><li>子任务拆短一点更好打勾</li><li>今天休息项不用硬推进</li></ul></div></div>`;
  body.insertBefore(shell,section);
}
function renderProjectRoute(){
  if(routeState?.kind!=='project')return;
  const body=document.getElementById('v2RouteBody');
  const section=document.getElementById('projectSection');
  if(!body||!section)return;
  body.querySelector('.v2-project-route-shell')?.remove();
  const items=appData.tasks.filter(t=>t.type==='项目');
  const activeProjects=items.filter(task=>!(task.steps||[]).length||(task.steps||[]).some(step=>!step.done)).length;
  const completedProjects=items.filter(task=>(task.steps||[]).length&&(task.steps||[]).every(step=>step.done)).length;
  const timingProjects=items.filter(task=>task.isTiming).length;
  const totalSteps=items.reduce((sum,task)=>sum+(task.steps?.length||0),0);
  const doneSteps=items.reduce((sum,task)=>sum+((task.steps||[]).filter(step=>step.done).length),0);
  const percent=totalSteps?Math.round(doneSteps/totalSteps*100):0;
  const focusProjects=items.map(task=>{const nextStep=(task.steps||[]).find(step=>!step.done);return nextStep?{title:task.title,nextStep:nextStep.title}:null;}).filter(Boolean).slice(0,4);
  const shell=document.createElement('div');
  shell.className='v2-project-route-shell';
  shell.innerHTML=`<div class="v2-route-overview project"><div class="v2-route-overview-main"><div>${routeEyebrow('project','项目推进')}<h3>把大的事拆成下一步，今天推进一点也算数</h3><p>保留你原来的项目逻辑：步骤勾选、专注计时、AI 拆分、提醒和时间设置都还在。我只是把入口和摘要先整理成更好扫一眼的样子。</p></div><div class="v2-route-overview-progress"><div class="v2-overview-ring"><strong>${percent}%</strong><span>步骤完成度</span></div><div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:${percent}%"></span></div><small>${doneSteps} / ${totalSteps} 步已完成 · ${activeProjects} 个项目推进中</small></div></div>${routeDecorPair()}</div><div class="v2-overview-cards">${routeCard('detail-icons-v1/icon-folder-cute.png',items.length,'项目总数')}${routeCard('detail-icons-v1/icon-laptop-cute.png',activeProjects,'推进中')}${routeCard('ui-icons-collage-v1/icon-complete-badge.png',completedProjects,'已完成')}${routeCard('ui-icons-collage-v1/icon-alarm.png',timingProjects,'正在专注')}</div>${focusProjects.length?`<div class="v2-route-overview-focus">${focusProjects.map(item=>`<span class="v2-chip">下一步：${esc(item.title)} · ${esc(item.nextStep)}</span>`).join('')}</div>`:''}</div><div class="v2-route-mini-grid"><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('project','推进方式')}</h3><div class="v2-mini-chip-grid"><span class="v2-chip active">先列下一步</span><span class="v2-chip active">先开计时</span><span class="v2-chip active">先补一步资料</span></div><p class="hint">大项目不求一口气做完，先把“下一步”变具体，推进感会明显很多。</p></div><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('project','当前焦点')}</h3><div class="v2-mini-list">${focusProjects.map(item=>`<span class="v2-chip">${esc(item.title)} · ${esc(item.nextStep)}</span>`).join('')||'<span class="v2-chip">先新增一个项目</span>'}</div></div></div><div class="v2-panel"><h3>使用方式</h3><p class="hint">先看上面的项目摘要，再往下进具体卡片。你原来的项目步骤、专注按钮、提醒和 AI 拆分都还是原位可用的。</p><div class="v2-row end"><button class="v2-secondary" id="v2ProjectQuickAdd">新增项目</button></div></div>`;
  body.insertBefore(shell,section);
  document.getElementById('v2ProjectQuickAdd')?.addEventListener('click',()=>{const input=document.getElementById('projectSection-title');input?.focus();input?.scrollIntoView({behavior:'smooth',block:'center'});});
}
function renderCyclicRoute(){
  if(routeState?.kind!=='cyclic')return;
  const body=document.getElementById('v2RouteBody');
  const section=document.getElementById('cyclicSection');
  if(!body||!section)return;
  body.querySelector('.v2-cyclic-route-shell')?.remove();
  const items=appData.tasks.filter(t=>t.type==='循环');
  const overdueCount=items.filter(task=>todayStr()>=getCyclicNext(task)).length;
  const dueSoonCount=items.filter(task=>{const next=getCyclicNext(task);const diff=Math.round((new Date(next)-new Date(todayStr()))/86400000);return diff>0&&diff<=2;}).length;
  const avgCycle=items.length?Math.round(items.reduce((sum,task)=>sum+Number(task.cycleDays||0),0)/items.length):0;
  const soonItems=items.slice().sort((a,b)=>String(getCyclicNext(a)).localeCompare(String(getCyclicNext(b)))).slice(0,3);
  const shell=document.createElement('div');
  shell.className='v2-cyclic-route-shell';
  shell.innerHTML=`<div class="v2-route-overview cyclic"><div class="v2-route-overview-main"><div>${routeEyebrow('cyclic','循环琐事')}<h3>这些事不会自己消失，按节奏收掉就已经很厉害了</h3><p>下面还是你原来的真实循环任务卡。这里先把“今天到期多少、快到期多少、平均周期多少天”提炼出来，省得你一张张翻。</p></div><div class="v2-route-overview-progress"><div class="v2-overview-ring"><strong>${items.length}</strong><span>循环任务</span></div><div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:${items.length?Math.min(100,Math.round(overdueCount/items.length*100)):0}%"></span></div><small>${overdueCount} 项今天该碰 · ${dueSoonCount} 项快到期</small></div></div>${routeMascot('cyclic','is-right')}${routeDecorPair()}</div><div class="v2-overview-cards">${routeCard('ui-icons-collage-v1/icon-alarm.png',overdueCount,'今天到期')}${routeCard('icons-collage-v2/icon-focus.png',dueSoonCount,'两天内到期')}${routeCard('icons-collage-v2/icon-all.png',items.length,'全部循环项')}${routeCard('icons-collage-v2/icon-note.png',avgCycle||0,'平均周期 / 天')}</div></div><div class="v2-route-mini-grid"><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('cyclic','最近该收的')}</h3><div class="v2-mini-list">${soonItems.map(item=>`<span class="v2-chip">${esc(item.title)} · ${esc(fmtDate(getCyclicNext(item)))}</span>`).join('')||'<span class="v2-chip">先在下面加一项循环琐事</span>'}</div></div><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('cyclic','收尾顺序')}</h3><ul class="v2-mini-list"><li>先做今天到期的</li><li>再看两天内会过期的</li><li>没到期的先别给自己加压</li></ul></div></div>`;
  body.insertBefore(shell,section);
}
function renderTempRoute(){
  if(routeState?.kind!=='temp')return;
  const body=document.getElementById('v2RouteBody');
  const section=document.getElementById('tempSection');
  if(!body||!section)return;
  body.querySelector('.v2-temp-route-shell')?.remove();
  const items=appData.tasks.filter(t=>t.type==='临时'&&!t.hiddenToday);
  const doneCount=items.filter(task=>task.completed).length;
  const pinnedCount=items.filter(task=>task.pinned).length;
  const deadlineCount=items.filter(task=>task.deadline).length;
  const urgentCount=items.filter(task=>task.deadline&&daysUntil(task.deadline)<=1).length;
  const smartTop=items.slice().sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||calcTempScore(b)-calcTempScore(a)).slice(0,4);
  const shell=document.createElement('div');
  shell.className='v2-temp-route-shell';
  shell.innerHTML=`<div class="v2-route-overview temp"><div class="v2-route-overview-main"><div>${routeEyebrow('temp','临时任务')}<h3>先把真的要处理的挑出来，别让所有临时事同时压过来</h3><p>这里继续沿用你现在的优先级、必做、推迟、截止时间和闹钟逻辑。我只是先把最紧急的一层放到上面，减少信息噪音。</p></div><div class="v2-route-overview-progress"><div class="v2-overview-ring"><strong>${items.length}</strong><span>临时事项</span></div><div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:${items.length?Math.round((urgentCount/items.length)*100):0}%"></span></div><small>${urgentCount} 项紧急 · ${pinnedCount} 项标记必做</small></div></div>${routeDecorPair()}</div><div class="v2-overview-cards">${routeCard('icons-collage-v2/icon-pomodoro.png',pinnedCount,'必做')}${routeCard('ui-icons-collage-v1/icon-alarm.png',urgentCount,'紧急 / 截止近')}${routeCard('icons-collage-v2/icon-note.png',deadlineCount,'已设截止时间')}${routeCard('ui-icons-collage-v1/icon-complete-badge.png',doneCount,'已完成')}</div>${smartTop.length?`<div class="v2-route-overview-focus">${smartTop.map(item=>`<span class="v2-chip">${item.pinned?'📌 ':''}${esc(item.title)}</span>`).join('')}</div>`:''}</div><div class="v2-route-mini-grid"><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('temp','先看这几条')}</h3><div class="v2-mini-list">${smartTop.map(item=>`<span class="v2-chip ${item.pinned?'active':''}">${item.pinned?'📌 ':''}${esc(item.title)}</span>`).join('')||'<span class="v2-chip">今天临时任务不多</span>'}</div></div><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('temp','减压规则')}</h3><div class="v2-mini-chip-grid"><span class="v2-chip">先做必做项</span><span class="v2-chip">能延期就别硬塞</span><span class="v2-chip">太碎的先扔回任务池</span></div></div></div>`;
  body.insertBefore(shell,section);
}
window.renderDailyRouteShell=renderDailyRoute;
window.renderProjectRouteShell=renderProjectRoute;
window.renderCyclicRouteShell=renderCyclicRoute;
window.renderTempRouteShell=renderTempRoute;
function renderLifeRhythmRoute(){
  const target=routeState?.kind==='rhythm'?document.getElementById('v2RouteBody'):document.getElementById('rhythmList');
  if(!target)return;
  const date=selectedDay||todayStr(),entry=getLifeRhythmEntry(date,true),overview=deriveLifeRhythmOverview(entry,date),emergency=appData.v2.lifeRhythm.emergencyKit;
  target.innerHTML=`<div class="v2-route-overview rhythm ${overview.lowEnergy?'home':''}"><div class="v2-route-overview-main"><div>${routeEyebrow('rhythm','生活能量')}<h3>${overview.lowEnergy?'今天先照顾自己，再慢慢把节奏找回来':'把状态记清楚，后面安排任务会更贴身'}</h3><p>${overview.lowEnergy?'今天更适合先恢复，再推进。下面这些卡片会帮你把累、乱、卡的原因记下来。':'状态越记得顺手，AI 后面越知道什么时候该轻一点，什么时候可以帮你往前推。'}</p></div><div class="v2-route-overview-progress"><div class="v2-overview-ring"><strong>${overview.completionPercent}%</strong><span>今天推进度</span></div><div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:${overview.completionPercent}%"></span></div><small>${esc(overview.energyLabel)} · ${esc(overview.rhythmLabel)} · ${esc(overview.factors.slice(0,2).join('、')||'待补充')}</small></div></div>${routeMascot('rhythm','is-right')}${routeDecorPair()}</div><div class="v2-overview-cards">${routeCard('detail-icons-v1/icon-battery-cute.png',overview.energyLabel,'当前电量')}${routeCard('detail-icons-v1/icon-water-cute.png',overview.rhythmLabel,'今日节奏')}${routeCard('ui-icons-collage-v1/icon-complete-badge.png',`${overview.completionPercent}%`,'完成度')}${routeCard('detail-icons-v1/icon-phone-cute.png',overview.factors.length||0,'已记录因素')}</div></div><div class="v2-route-mini-grid"><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('rhythm','先做轻一点')}</h3><div class="v2-mini-chip-grid">${(overview.lowEnergy?emergency.quick.slice(0,3):emergency.short.slice(0,3)).map(x=>`<span class="v2-chip active">${esc(x)}</span>`).join('')}</div></div><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('rhythm','今天这句')}</h3><p class="hint">${esc(overview.aiNote)}</p></div></div>
    <div class="v2-panel v2-rhythm-home"><div class="v2-rhythm-hero"><div><h3>今日状态总览</h3><p class="hint">上面是今天的结果，下面这些卡片记录的是原因。记得越顺手，AI 之后越懂你。</p></div><span class="v2-rhythm-badge ${overview.lowEnergy?'low':'normal'}">${esc(overview.energyLabel)}</span></div><div class="v2-rhythm-overview-grid"><div class="v2-rhythm-overview-item"><b>${routeInfoLabel('detail-icons-v1/icon-battery-cute.png','今日电量')}</b><span>${esc(overview.energyLabel)}</span></div><div class="v2-rhythm-overview-item"><b>${routeInfoLabel('detail-icons-v1/icon-water-cute.png','今日节奏')}</b><span>${esc(overview.rhythmLabel)}</span></div><div class="v2-rhythm-overview-item"><b>${routeInfoLabel('ui-icons-collage-v1/icon-complete-badge.png','任务完成度')}</b><span>${overview.completionPercent}%</span></div><div class="v2-rhythm-overview-item"><b>${routeInfoLabel('detail-icons-v1/icon-phone-cute.png','主要影响因素')}</b><span>${esc(overview.factors.join('、')||'今天还没记录')}</span></div></div>${renderEnergyManualControls(entry,overview)}<div class="v2-rhythm-ai-note">${esc(overview.aiNote)}</div><div class="v2-row end" style="margin-top:10px"><button class="v2-primary" id="v2RhythmQuickFlow">快速记录今天</button></div></div>
    <details class="v2-panel v2-rhythm-card" open>
      <summary><div><h3>😴 睡眠记录</h3><p>${esc(rhythmSummaryText(entry,'sleep'))}</p></div><span>展开填写</span></summary>
      <div class="v2-grid"><label>上床时间<input id="v2RhythmBedTime" type="time" value="${entry.bedTime||''}"></label><label>大概入睡<input id="v2RhythmSleepStart" type="time" value="${entry.sleepStart||''}"></label><label>起床时间<input id="v2RhythmWakeTime" type="time" value="${entry.wakeTime||''}"></label><label>睡眠时长<input value="${esc(entry.sleepStart&&entry.wakeTime?sleepDurationText(entry.sleepStart,entry.wakeTime):'')}" disabled></label></div>
      <div class="v2-rhythm-scale">${['好','一般','差'].map(x=>`<button class="v2-rhythm-pill ${entry.sleepQuality===x?'active':''}" data-rhythm-field="sleepQuality" data-value="${x}">${x}</button>`).join('')}</div>
      <div class="v2-rhythm-scale" style="margin-top:8px">${['是','否'].map(x=>`<button class="v2-rhythm-pill ${entry.stayedUpLate===x?'active':''}" data-rhythm-field="stayedUpLate" data-value="${x}">熬夜 ${x}</button>`).join('')}${['清醒','一般','很困'].map(x=>`<button class="v2-rhythm-pill ${entry.wakeState===x?'active':''}" data-rhythm-field="wakeState" data-value="${x}">醒来 ${x}</button>`).join('')}</div>
      <label class="v2-rhythm-note">备注<textarea id="v2RhythmSleepNote" rows="2" placeholder="比如：夜里醒了两次">${esc(entry.sleepNote||'')}</textarea></label>
      <div class="v2-row end"><button class="v2-primary" data-rhythm-save="sleep">保存睡眠记录</button></div>
    </details>
    <details class="v2-panel v2-rhythm-card">
      <summary><div><h3>🌿 身体状态记录</h3><p>${esc(rhythmSummaryText(entry,'body'))}</p></div><span>展开填写</span></summary>
      <div class="v2-rhythm-scale">${['好','一般','疲惫','不舒服'].map(x=>`<button class="v2-rhythm-pill ${entry.bodyState===x?'active':''}" data-rhythm-field="bodyState" data-value="${x}">${x}</button>`).join('')}</div>
      <div class="v2-rhythm-scale" style="margin-top:8px">${[1,2,3,4,5].map(x=>`<button class="v2-rhythm-pill ${Number(entry.fatigueScore||0)===x?'active':''}" data-rhythm-field="fatigueScore" data-value="${x}">疲惫 ${x}</button>`).join('')}</div>
      <div class="v2-rhythm-field"><b>身体不适</b>${renderChipOptions(DISCOMFORT_OPTIONS,'discomfortTags',entry.discomfortTags||[],'interrupt')}</div>
      <div class="v2-rhythm-field"><b>今日活动</b>${renderChipOptions(MOVEMENT_OPTIONS,'movementType',entry.movementType?[entry.movementType]:[],'soft')}</div>
      <label class="v2-rhythm-note">备注<textarea id="v2RhythmBodyNote" rows="2" placeholder="比如：今天眼睛很酸，坐久了肩颈紧">${esc(entry.bodyNote||'')}</textarea></label>
      <div class="v2-row end"><button class="v2-primary" data-rhythm-save="body">保存身体状态</button></div>
    </details>
    <details class="v2-panel v2-rhythm-card">
      <summary><div><h3>🫶 心情状态记录</h3><p>${esc(rhythmSummaryText(entry,'mood'))}</p></div><span>展开填写</span></summary>
      <div class="v2-rhythm-scale">${['开心','平静','焦虑','烦躁','低落','混乱'].map(x=>`<button class="v2-rhythm-pill ${entry.moodState===x?'active':''}" data-rhythm-field="moodState" data-value="${x}">${x}</button>`).join('')}</div>
      <div class="v2-rhythm-scale" style="margin-top:8px">${[1,2,3,4,5].map(x=>`<button class="v2-rhythm-pill ${Number(entry.moodScore||0)===x?'active':''}" data-rhythm-field="moodScore" data-value="${x}">心情 ${x}</button>`).join('')}</div>
      <div class="v2-rhythm-field"><b>让心情变好的事情</b>${renderChipOptions(MOOD_GOOD_OPTIONS,'moodGoodTags',entry.moodGoodTags||[],'soft')}</div>
      <div class="v2-rhythm-field"><b>让心情变差的事情</b>${renderChipOptions(MOOD_BAD_OPTIONS,'moodBadTags',entry.moodBadTags||[],'drain')}</div>
      <label class="v2-rhythm-note">备注<textarea id="v2RhythmMoodNote" rows="2" placeholder="比如：完成了一件事后轻松很多">${esc(entry.moodNote||'')}</textarea></label>
      <div class="v2-row end"><button class="v2-primary" data-rhythm-save="mood">保存心情状态</button></div>
    </details>
    <details class="v2-panel v2-rhythm-card">
      <summary><div><h3>🌙 今日节奏记录</h3><p>${esc(rhythmSummaryText(entry,'rhythm'))}</p></div><span>展开填写</span></summary>
      <div class="v2-rhythm-scale">${['很顺','一般','有点卡','很乱','被打断'].map(x=>`<button class="v2-rhythm-pill ${entry.rhythm===x?'active':''}" data-rhythm-field="rhythm" data-value="${x}">${x}</button>`).join('')}</div>
      <div class="v2-rhythm-scale" style="margin-top:8px">${['高','中','低'].map(x=>`<button class="v2-rhythm-pill ${entry.control===x?'active':''}" data-rhythm-field="control" data-value="${x}">掌控感 ${x}</button>`).join('')}</div>
      <label class="v2-rhythm-range">今日任务完成度<output id="v2RhythmCompletionOutput">${esc(entry.completionPercent||overview.completionPercent)}</output>%<input id="v2RhythmCompletionPercent" type="range" min="0" max="100" step="5" value="${esc(entry.completionPercent||overview.completionPercent)}"></label>
      <div class="v2-rhythm-field"><b>影响节奏的因素</b>${renderChipOptions(INTERRUPT_OPTIONS,'rhythmFactors',entry.rhythmFactors||[],'interrupt')}</div>
      <label class="v2-rhythm-note">今天最卡的任务<textarea id="v2RhythmStuckTask" rows="2" placeholder="比如：整理主包资料">${esc(entry.stuckTask||'')}</textarea></label>
      <div class="v2-rhythm-field"><b>卡住原因</b>${renderChipOptions(RHYTHM_STUCK_OPTIONS,'stuckReasons',entry.stuckReasons||[],'drain')}</div>
      <label class="v2-rhythm-note">补充说明<textarea id="v2RhythmNote" rows="2" placeholder="比如：下午一直被咨询和快递打断">${esc(entry.rhythmNote||'')}</textarea></label>
      <div class="v2-row end"><button class="v2-primary" data-rhythm-save="rhythm">保存节奏记录</button></div>
    </details>
    <details class="v2-panel v2-rhythm-card">
      <summary><div><h3>🫧 隐形成本记录</h3><p>${esc(rhythmSummaryText(entry,'hidden'))}</p></div><span>展开填写</span></summary>
      <div class="v2-rhythm-field"><b>琐事类型</b>${renderChipOptions(HIDDEN_COST_OPTIONS,'hiddenCostsLibrary',(entry.hiddenCosts||[]).map(x=>x.title),'hidden')}</div>
      <div class="v2-rhythm-hidden-list">${(entry.hiddenCosts||[]).map(cost=>`<div class="v2-hidden-cost-row" data-cost-id="${esc(cost.id)}"><div class="v2-row between"><strong>${esc(cost.title)}</strong><button class="v2-danger" type="button" data-hidden-remove="${esc(cost.id)}">删</button></div><div class="v2-grid"><label>花费时间<input data-hidden-field="duration" value="${esc(cost.duration||'')}" placeholder="如 30m"></label><label>花费金额<input data-hidden-field="money" value="${esc(cost.money||'')}" placeholder="可不填"></label><label>是否打乱<select data-hidden-field="disrupted"><option ${cost.disrupted==='是'?'selected':''}>是</option><option ${cost.disrupted==='否'?'selected':''}>否</option></select></label></div><div class="v2-rhythm-field"><b>消耗类型</b>${renderChipOptions(['时间','体力','情绪','注意力'],`hiddenCostType:${cost.id}`,cost.costTypes||[],'hidden')}</div><label class="v2-rhythm-note">备注<textarea data-hidden-field="note" rows="2" placeholder="例如：来回花了不少精力">${esc(cost.note||'')}</textarea></label></div>`).join('')||'<p class="hint">先点上面的琐事标签，再补充时间、金额和影响。</p>'}</div>
      <div class="v2-row end"><button class="v2-primary" data-rhythm-save="hidden">保存隐形成本</button></div>
    </details>
    <div class="v2-panel"><h3>低电量应急包</h3>${overview.lowEnergy?`<div class="v2-rhythm-alert">当前状态更适合先恢复，再安排高强度任务。</div>`:''}<div class="v2-rhythm-emergency-grid"><div><b>5 分钟恢复</b>${emergency.quick.map(x=>`<span>${esc(x)}</span>`).join('')}</div><div><b>15 分钟恢复</b>${emergency.short.map(x=>`<span>${esc(x)}</span>`).join('')}</div><div><b>30 分钟恢复</b>${emergency.medium.map(x=>`<span>${esc(x)}</span>`).join('')}</div><div><b>直接休息</b>${emergency.rest.map(x=>`<span>${esc(x)}</span>`).join('')}</div></div></div>
    <div class="v2-panel"><h3>一句话交给 AI 识别</h3><div class="v2-fields"><textarea id="v2RhythmText" rows="4" placeholder="例如：今天状态很差，上午被咨询打断好多次，还去拿了快递和买东西，洗了澡喝了奶茶才稍微好一点。">${esc(entry.note||'')}</textarea><div class="v2-row end"><button class="v2-secondary" id="v2RhythmParse">自动识别归类</button><button class="v2-primary" id="v2RhythmSaveAll">保存整页记录</button></div></div></div>`;
  bindLifeRhythmInteractions(date);
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
function hasMeaningfulData(){
  return !!((appData.tasks||[]).length||(appData.notes||[]).length||(appData.inspirations||[]).length||(appData.birthdays||[]).length||(appData.records?.entries||[]).length)
}
function getTaskPool(){return appData.v2.smartCapture.taskPool||[]}
function normalizeTaskPoolItem(item={}){
  return{
    id:item.id||('pool-'+genId()),
    title:String(item.title||'').trim()||'未命名任务',
    status:item.status||'待安排',
    taskType:item.taskType||'临时',
    note:item.note||'',
    source:item.source||'manual',
    rawText:item.rawText||'',
    plannedStart:item.plannedStart||'',
    plannedEnd:item.plannedEnd||'',
    timeLabel:item.timeLabel||'',
    alarmTime:item.alarmTime||'',
    important:!!item.important,
    createdAt:item.createdAt||nowISO(),
    updatedAt:nowISO(),
    lastScheduledDate:item.lastScheduledDate||'',
    deferredUntil:item.deferredUntil||'',
    paused:false
  }
}
function upsertTaskPoolItem(item){
  const list=getTaskPool(),normalized=normalizeTaskPoolItem(item),index=list.findIndex(x=>x.id===normalized.id);
  if(index>=0)list[index]=Object.assign(list[index],normalized,{updatedAt:nowISO()});else list.unshift(normalized);
  appData.v2.smartCapture.pendingTasks=list;
  appData.v2.planner.planOptions=[];
  return normalized
}
function removeTaskPoolItem(id){
  appData.v2.smartCapture.taskPool=getTaskPool().filter(x=>x.id!==id);
  appData.v2.smartCapture.pendingTasks=appData.v2.smartCapture.taskPool;
  appData.v2.planner.planOptions=[];
}
function taskPoolStatusCount(status){return getTaskPool().filter(x=>x.status===status).length}
window.getTaskPool=getTaskPool;
window.upsertTaskPoolItem=upsertTaskPoolItem;
function currentMode(){return appData.v2?.mode?.current==='home'?'home':'normal'}
function isHomeMode(){return currentMode()==='home'}
function modeLabel(mode=currentMode()){return mode==='home'?'居家模式':'正常模式'}
function modeEmoji(mode=currentMode()){return mode==='home'?'🏠':'🌤'}
window.getCurrentPlannerMode=currentMode;
function setAppMode(mode,source='manual'){
  const next=mode==='home'?'home':'normal',prev=currentMode();
  appData.v2.mode.current=next;
  appData.v2.mode.changedAt=nowISO();
  appData.v2.mode.history.unshift({mode:next,source,at:appData.v2.mode.changedAt});
  appData.v2.mode.history=appData.v2.mode.history.slice(0,40);
  if(next!==prev&&next==='home')seedHomeModeRecovery();
  appData.v2.planner.planOptions=[];
  persist();
  renderModeUI();
  renderPlanner();
  renderTaskPoolSection();
  if(routeState?.kind==='taskPool')renderTaskPoolRoute();
  if(routeState?.kind==='day')renderDaySheet();
  window.dispatchEvent(new CustomEvent('homev2:mode-change',{detail:{mode:next,source}}));
  toast(next==='home'?'已切换至居家模式，先喝水、复位、低启动':'已切回正常模式，可以安排推进任务');
}
window.setAppMode=setAppMode;
function energyBucket(){
  const rhythm=getLifeRhythmEntry(todayStr(),false)?.energyLevel||'';
  if(/低/.test(rhythm)||appData.todayStatus?.energy==='😫')return'low';
  if(/高/.test(rhythm)||appData.todayStatus?.energy==='😄')return'high';
  return'mid';
}
function recentDayKeys(days=7){return Object.keys(appData.v2?.dayPlans||{}).sort().slice(-days)}
function recentPlannerHistory(days=7){
  const dates=recentDayKeys(days),items=[],rhythmDays=appData.v2?.lifeRhythm?.days||{};
  dates.forEach(date=>{(appData.v2.dayPlans[date]?.items||[]).forEach(item=>items.push({...item,date}));});
  const rhythms=dates.map(date=>({date,entry:rhythmDays[date]})).filter(x=>x.entry);
  return{dates,items,rhythms};
}
function buildHistoryDigest(days=7){
  const{dates,items,rhythms}=recentPlannerHistory(days),done=items.filter(x=>x.status==='done').length,unfinished=items.filter(x=>x.status!=='done').length;
  const skipped=items.filter(x=>x.status==='skipped').length,deferred=items.filter(x=>x.status==='deferred').length;
  const lowDays=rhythms.filter(x=>/低/.test(x.entry?.energyLevel||'')||/很困|低电量/.test(x.entry?.note||x.entry?.rhythmNote||'')).length;
  const topTypes=Object.entries(items.reduce((acc,item)=>(acc[item.type||'任务']=(acc[item.type||'任务']||0)+1,acc),{})).sort((a,b)=>b[1]-a[1]).slice(0,4);
  return{days:dates.length,done,unfinished,skipped,deferred,lowDays,topTypes,summary:`最近 ${dates.length||0} 天完成 ${done} 项，未完成 ${unfinished} 项${skipped?`，跳过 ${skipped} 项`:''}${deferred?`，延期 ${deferred} 项`:''}${lowDays?`，其中 ${lowDays} 天偏低电量`:''}。`};
}
function classifyPoolTask(item){
  const text=`${item.title||''} ${item.note||''}`;
  if(/喝水|洗脸|换衣|洗澡|吃饭|拉伸|开窗|休息|站起来/.test(text))return'body';
  if(/袋子|桌面|垃圾|快递|行李|收拾|整理|挪开|地上/.test(text))return'reset';
  if(/分装|叠衣服|归类|抽屉|本子|化妆品|拆快递/.test(text))return'mechanical';
  if(/副业|咨询|商品|标题|资料|卖|收入|客户/.test(text))return'hustle';
  if(/论文|PPT|科研|翻译|编程|文案|项目|学习/.test(text))return'deep';
  return item.taskType==='项目'?'deep':(item.taskType==='每日'?'body':'general');
}
function preferFocusCategory(){
  const p=appData.v2.planner.profile||{},scores=[
    ['life',Number(p.preferLifeFirst||0)+Number(p.preferTidyFirst||0)],
    ['money',Number(p.preferMoneyFirst||0)],
    ['paper',Number(p.preferPaperFirst||0)]
  ].sort((a,b)=>b[1]-a[1]);
  return scores[0][1]>0?scores[0][0]:'balanced';
}
function buildConversationCarrySummary(){
  const digest=buildHistoryDigest(7),mode=modeLabel(),poolCount=getTaskPool().filter(x=>!['已完成','放弃'].includes(x.status)).length;
  const unfinished=(displayItems(todayStr())||[]).filter(x=>x.status!=='done').slice(0,5).map(x=>x.title);
  const summary=[
    `当前模式：${mode}`,
    `今日状态：${energyBucket()==='low'?'低电量':energyBucket()==='high'?'高电量':'中等电量'}`,
    digest.summary,
    `任务池待用：${poolCount} 条`,
    unfinished.length?`今日未完成：${unfinished.join('、')}`:'',
    appData.v2.smartCapture.tomorrowAdvice?.length?`明日建议：${appData.v2.smartCapture.tomorrowAdvice.slice(0,3).map(x=>x.title||x.rawText||'').join('；')}`:''
  ].filter(Boolean).join('\n');
  appData.v2.conversation.carrySummary=summary;
  appData.v2.conversation.lastSummarizedAt=nowISO();
  appData.v2.conversation.historyDigests.unshift({at:appData.v2.conversation.lastSummarizedAt,text:summary});
  appData.v2.conversation.historyDigests=appData.v2.conversation.historyDigests.slice(0,12);
  persist();
  localStorage.setItem('task-chat-summary',summary);
  return summary;
}
function startNextChatRound(){
  const summary=buildConversationCarrySummary();
  if(typeof window.startTaskChatRound==='function')window.startTaskChatRound('新一轮开始了。我会带着摘要继续，不用从头解释。');
  else{localStorage.setItem('task-chat-history','[]');localStorage.setItem('task-chat-round','0');}
  appData.v2.conversation.lastRoundStartedAt=nowISO();
  persist();
  toast('已开启下一轮，对话摘要已保留');
  return summary;
}
function todayDashboardStats(){
  const items=displayItems(todayStr()),doneItems=items.filter(x=>x.status==='done'),todoItems=items.filter(x=>x.status!=='done');
  const percent=items.length?Math.round(doneItems.length/items.length*100):0;
  const pool=getTaskPool().filter(x=>!['已完成','放弃'].includes(x.status));
  const waterStatus=waterStatusToday();
  const rhythm=getLifeRhythmEntry(todayStr(),false);
  const tomorrow=(appData.v2.smartCapture.tomorrowAdvice||[]).slice(0,2);
  return{
    items,doneItems,todoItems,percent,
    poolCount:pool.length,
    waterLabel:waterStatus==='ok'?'已喝一些':waterStatus==='low'?'喝水偏少':'还没记录喝水',
    energyLabel:rhythm?.energyLevel|| (energyBucket()==='low'?'低电量':energyBucket()==='high'?'高电量':'中等电量'),
    rhythmLabel:rhythm?.rhythm|| (isHomeMode()?'慢下来也没关系':'今天保持推进'),
    tomorrow
  };
}
function taskPoolDashboardStats(){
  const items=getTaskPool(),active=items.filter(x=>!['已完成','放弃'].includes(x.status)),scheduled=active.filter(x=>x.status==='已安排到今日'||x.status==='进行中'),paused=active.filter(x=>x.status==='暂缓'),done=items.filter(x=>x.status==='已完成');
  return{items,active,scheduled,paused,done,focus:active.slice(0,4),projectCount:active.filter(x=>x.taskType==='项目').length};
}
function pickDashboardFocusItems(limit=3){
  const todayOpen=displayItems(todayStr()).filter(x=>x.status!=='done');
  if(todayOpen.length)return todayOpen.slice(0,limit);
  const plan=(appData.v2.planner.planOptions||[])[0];
  if(plan?.items?.length)return plan.items.slice(0,limit);
  return getTaskPool().filter(x=>!['已完成','放弃','暂缓'].includes(x.status)).slice(0,limit).map(x=>({title:x.title,type:x.taskType||'临时'}));
}
function renderHomeOverviewBoard(){
  const board=ensureHomeOverviewSection();if(!board)return;
  const stats=todayDashboardStats(),focusItems=pickDashboardFocusItems(),mode=currentMode();
  const cards=[
    {icon:'✅',label:'今日完成',value:`${stats.doneItems.length}/${stats.items.length||0}`},
    {icon:'🗂️',label:'任务池待安排',value:String(stats.poolCount)},
    {icon:'🔋',label:'当前电量',value:stats.energyLabel},
    {icon:'💧',label:'喝水状态',value:stats.waterLabel}
  ];
  board.innerHTML=`<div class="v2-overview-hero ${mode}"><div class="v2-overview-main"><div class="v2-overview-copy"><span class="v2-overview-eyebrow">${modeEmoji(mode)} ${modeLabel(mode)}</span><h3>${mode==='home'?'今天先把人照顾好，再做任务':'今天的主线先轻清楚楚地推进'}</h3><p>${mode==='home'?'先喝水、生活复位、再碰一下任务。':'先抓主线，再穿插轻任务，别一下排太满。'}</p></div><div class="v2-overview-progress"><div class="v2-overview-ring"><strong>${stats.percent}%</strong><span>完成度</span></div><div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:${stats.percent}%"></span></div><small>${stats.doneItems.length} 项已完成，${stats.todoItems.length} 项待处理</small></div></div></div><div class="v2-overview-cards">${cards.map(card=>`<div class="v2-overview-card"><span>${card.icon}</span><strong>${esc(card.value)}</strong><small>${esc(card.label)}</small></div>`).join('')}</div></div><div class="v2-overview-grid"><div class="v2-overview-panel"><div class="v2-row" style="justify-content:space-between;align-items:flex-start"><div><h4>${mode==='home'?'现在只做这三步':'今天先看这几件'}</h4><p class="hint">${mode==='home'?'身体重启 1 件、生活复位 1 件、任务碰一下 1 件。':'优先把真正会推进今天的一小组任务放前面。'}</p></div><button class="v2-secondary" id="v2OverviewOpenDay">进入今日详情</button></div><div class="v2-overview-list">${focusItems.length?focusItems.map(item=>`<button class="v2-overview-task" data-overview-open="${esc(item.id||'')}"><span class="v2-task-emoji">${taskEmoji(item)}</span><span>${esc(item.title||'未命名任务')}</span><small>${esc(item.type||'任务')}</small></button>`).join(''):`<div class="v2-empty">今天还没排任务，可以先去规划室选一版</div>`}</div></div><div class="v2-overview-panel"><div class="v2-row" style="justify-content:space-between;align-items:flex-start"><div><h4>${mode==='home'?'模式提示':'节奏提示'}</h4><p class="hint">${mode==='home'?'居家模式会弱化深度任务，优先喝水、收一小块、机械小事。':'正常模式会突出推进感，但也保留休息和缓冲空间。'}</p></div><button class="v2-secondary" id="v2OverviewPlanner">去规划室</button></div><div class="v2-rhythm-tags" style="margin-top:8px">${mode==='home'?'<span class="v2-chip active">先喝水</span><span class="v2-chip active">收一个袋子</span><span class="v2-chip">副业碰一下</span><span class="v2-chip">深度任务后置</span>':`<span class="v2-chip active">${esc(stats.rhythmLabel)}</span><span class="v2-chip">${esc(stats.energyLabel)}</span><span class="v2-chip">${stats.poolCount} 条待调度</span>`}${stats.tomorrow.map(item=>`<span class="v2-chip">明日·${esc(item.title||item.rawText||'')}</span>`).join('')}</div></div></div>`;
  document.getElementById('v2OverviewOpenDay')?.addEventListener('click',()=>openDaySheet(todayStr()));
  document.getElementById('v2OverviewPlanner')?.addEventListener('click',()=>openPlannerPage());
  board.querySelectorAll('[data-overview-open]').forEach(btn=>btn.addEventListener('click',()=>openDaySheet(todayStr())));
}
function daySheetOverviewStats(ds){
  const items=displayItems(ds),done=items.filter(x=>x.status==='done').length,doing=items.filter(x=>x.status==='doing').length,open=items.filter(x=>x.status==='todo').length,skipped=items.filter(x=>x.status==='skipped').length,deferred=items.filter(x=>x.status==='deferred').length;
  const percent=items.length?Math.round(done/items.length*100):0;
  return{items,done,doing,open,skipped,deferred,percent};
}

function renderHomeOverviewBoard(){
  const board=ensureHomeOverviewSection();if(!board)return;
  const stats=todayDashboardStats(),focusItems=pickDashboardFocusItems(),mode=currentMode();
  const homeTitle=pickRotatingCopy('home','title',String(stats.percent));
  const homeBody=pickRotatingCopy('home','body',String(stats.poolCount));
  const cards=[
    {icon:'ui-icons-collage-v1/icon-complete-badge.png',label:'今日完成',value:`${stats.doneItems.length}/${stats.items.length||0}`},
    {icon:'icons-collage-v2/icon-note.png',label:'任务池待安排',value:String(stats.poolCount)},
    {icon:DETAIL_ICON_ART.battery,label:'当前电量',value:stats.energyLabel},
    {icon:DETAIL_ICON_ART.water,label:'喝水状态',value:stats.waterLabel}
  ];
  board.innerHTML=`<div class="v2-overview-hero ${mode}"><div class="v2-overview-main"><div class="v2-overview-copy"><span class="v2-overview-eyebrow">${modeLabel(mode)}</span><h3>${homeTitle}</h3><p>${homeBody}</p></div><div class="v2-overview-progress"><div class="v2-overview-ring"><strong>${stats.percent}%</strong><span>完成度</span></div><div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:${stats.percent}%"></span></div><small>${stats.doneItems.length} 项已完成，${stats.todoItems.length} 项待处理</small></div></div></div><div class="v2-overview-cards">${cards.map(card=>`<div class="v2-overview-card"><span class="v2-overview-card-icon-wrap">${stickerImg(card.icon,'v2-overview-card-icon',card.label)}</span><strong>${esc(card.value)}</strong><small>${esc(card.label)}</small></div>`).join('')}</div></div><div class="v2-overview-grid"><div class="v2-overview-panel"><div class="v2-row" style="justify-content:space-between;align-items:flex-start"><div><h4>${mode==='home'?'现在只做这三步':'今天先看这几件'}</h4><p class="hint">${mode==='home'?'身体重启 1 件、生活复位 1 件、任务碰一下 1 件。':'优先把真正会推进今天的一小组任务放前面。'}</p></div><button class="v2-secondary" id="v2OverviewOpenDay">进入今日详情</button></div><div class="v2-overview-list">${focusItems.length?focusItems.map(item=>`<button class="v2-overview-task" data-overview-open="${esc(item.id||'')}">${taskSticker(item,'v2-task-sticker is-home')}<span>${esc(item.title||'未命名任务')}</span><small>${esc(item.type||'任务')}</small></button>`).join(''):`<div class="v2-empty">今天还没排任务，可以先去规划室选一版</div>`}</div></div><div class="v2-overview-panel"><div class="v2-row" style="justify-content:space-between;align-items:flex-start"><div><h4>${mode==='home'?'模式提示':'节奏提示'}</h4><p class="hint">${mode==='home'?'居家模式会弱化深度任务，优先喝水、收一小块、机械小事。':'正常模式会突出推进感，但也保留休息和缓冲空间。'}</p></div><button class="v2-secondary" id="v2OverviewPlanner">去规划室</button></div><div class="v2-rhythm-tags" style="margin-top:8px">${mode==='home'?'<span class="v2-chip active">先喝水</span><span class="v2-chip active">收一个袋子</span><span class="v2-chip">副业碰一下</span><span class="v2-chip">深度任务后置</span>':`<span class="v2-chip active">${esc(stats.rhythmLabel)}</span><span class="v2-chip">${esc(stats.energyLabel)}</span><span class="v2-chip">${stats.poolCount} 条待调度</span>`}${stats.tomorrow.map(item=>`<span class="v2-chip">明日·${esc(item.title||item.rawText||'')}</span>`).join('')}</div></div></div>`;
  document.getElementById('v2OverviewOpenDay')?.addEventListener('click',()=>openDaySheet(todayStr()));
  document.getElementById('v2OverviewPlanner')?.addEventListener('click',()=>openPlannerPage());
  board.querySelectorAll('[data-overview-open]').forEach(btn=>btn.addEventListener('click',()=>openDaySheet(todayStr())));
}

function persist(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(appData));return true}catch(e){toast('本地保存失败，请导出备份');return false}
}
function esc(value){return String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}
function stickerAsset(path){return `${V2_STICKER_BASE}${path}`}
const ROUTE_ART={
  taskPool:{icon:'icons-collage-v2/icon-note.png',cat:'cats/cat-header.png'},
  daily:{icon:'icons-collage-v2/icon-daily-task.png',cat:'cats/cat-progress.png'},
  project:{icon:'icons-collage-v2/icon-goal.png',cat:'cats/cat-note.png'},
  cyclic:{icon:'icons-collage-v2/icon-focus.png',cat:'cats/cat-note.png'},
  temp:{icon:'icons-collage-v2/icon-pomodoro.png',cat:'cats/cat-header.png'},
  rhythm:{icon:'icons-collage-v2/icon-ai-review.png',cat:'cats/cat-note.png'},
  food:{icon:'detail-icons-v2/icon-water-sticker.svg',cat:'cats/cat-note.png'},
  lateNight:{icon:'detail-icons-v2/icon-sleep-sticker.svg',cat:'cats/cat-progress.png'},
  planner:{icon:'ui-icons-collage-v1/icon-nav-plan.png',cat:'cats/cat-progress.png'},
  day:{icon:'icons-collage-v2/icon-daily-task.png',cat:'cats/cat-note.png'},
  default:{icon:'icons-collage-v2/icon-all.png',cat:'cats/cat-note.png'}
};
const ROUTE_DECOR_ASSETS=['decorations/decor-heart.png','decorations/decor-star.png','decorations/decor-flower.png'];
const DETAIL_ICON_ART={
  battery:'detail-icons-v2/icon-battery-sticker.svg',
  water:'detail-icons-v2/icon-water-sticker.svg',
  rhythm:'detail-icons-v2/icon-rhythm-sticker.svg',
  factor:'detail-icons-v2/icon-factor-sticker.svg',
  sleep:'detail-icons-v2/icon-sleep-sticker.svg',
  mood:'detail-icons-v2/icon-mood-sticker.svg',
  food:'detail-icons-v2/icon-water-sticker.svg',
  lateNight:'detail-icons-v2/icon-sleep-sticker.svg'
};
function routeArt(kind){return ROUTE_ART[kind]||ROUTE_ART.default}
function stickerImg(path,className='',alt=''){
  return `<img src="${stickerAsset(path)}" class="${className}" alt="${esc(alt||'')}">`
}
function routeEyebrow(kind,label){
  return `<span class="v2-overview-eyebrow v2-overview-eyebrow-sticker">${stickerImg(routeArt(kind).icon,'v2-overview-eyebrow-icon',label)}<span>${esc(label)}</span></span>`
}
function routeMetaChip(kind,label){
  return `<span class="v2-route-meta-chip v2-route-meta-chip-sticker">${stickerImg(routeArt(kind).icon,'v2-route-meta-chip-icon',label)}<span>${esc(label)}</span></span>`
}
function routeHeadIcon(kind,title){
  return `<span class="v2-route-head-sticker">${stickerImg(routeArt(kind).icon,'v2-route-head-sticker-img',title)}</span>`
}
function routeCard(iconPath,value,label){
  return `<div class="v2-overview-card"><span class="v2-overview-card-icon-wrap">${stickerImg(iconPath,'v2-overview-card-icon',label)}</span><strong>${esc(value)}</strong><small>${esc(label)}</small></div>`
}
function routeMiniTitle(kind,label){
  return `<span class="v2-mini-title">${stickerImg(routeArt(kind).icon,'v2-mini-title-icon',label)}<span>${esc(label)}</span></span>`
}
function routeInfoLabel(iconPath,label){
  return `<span class="v2-info-label">${stickerImg(iconPath,'v2-info-label-icon',label)}<span>${esc(label)}</span></span>`
}
function routeDecorPair(){
  return `<div class="v2-route-decor-pair">${stickerImg(ROUTE_DECOR_ASSETS[0],'v2-route-decor','decor')}${stickerImg(ROUTE_DECOR_ASSETS[1],'v2-route-decor','decor')}</div>`
}
function routeHeroDecor(kind){
  if(kind!=='day'&&kind!=='rhythm')return'';
  const catWatermark=kind==='rhythm'?'cats/cat-progress.png':'cats/cat-note.png';
  return `<div class="home-mode-hero-decor" aria-hidden="true">
    <img src="${stickerAsset(catWatermark)}" class="home-mode-hero-decor-watermark" alt="">
    <img src="${stickerAsset('decorations/decor-star.png')}" class="home-mode-hero-decor-star is-1" alt="">
    <img src="${stickerAsset('decorations/decor-heart.png')}" class="home-mode-hero-decor-star is-2" alt="">
    <img src="${stickerAsset('decorations/decor-flower.png')}" class="home-mode-hero-decor-star is-3" alt="">
    <span class="home-mode-hero-decor-paw is-1"></span>
    <span class="home-mode-hero-decor-paw is-2"></span>
    <span class="home-mode-hero-decor-paw is-3"></span>
    <span class="home-mode-hero-decor-glow"></span>
  </div>`
}
function routeMascot(kind,extraClass=''){
  return `<div class="v2-route-mascot ${extraClass}">${stickerImg(routeArt(kind).cat,'v2-route-mascot-img',kind)}</div>`
}
function routePromptCard(kind,title,body,chips=[],actionId='',actionLabel=''){
  return `<div class="v2-panel v2-route-prompt">
    <div class="v2-route-prompt-copy">
      <h3>${routeMiniTitle(kind,title)}</h3>
      <p class="hint">${esc(body)}</p>
      ${chips.length?`<div class="v2-route-prompt-tags">${chips.map(text=>`<span class="v2-chip active">${esc(text)}</span>`).join('')}</div>`:''}
      ${actionId&&actionLabel?`<div class="v2-row end" style="margin-top:10px"><button class="v2-primary" id="${esc(actionId)}">${esc(actionLabel)}</button></div>`:''}
    </div>
    <div class="v2-route-prompt-cat">${stickerImg(routeArt(kind).cat,'v2-route-prompt-cat-img',title)}</div>
  </div>`
}
function routeOverviewAside(kind,title,lines=[]){
  return''
}
function metaPill(iconPath,label,tone=''){
  return `<span class="v2-day-pill ${tone}">${stickerImg(iconPath,'v2-day-pill-icon',label)}<span>${esc(label)}</span></span>`
}
const GENERIC_ROUTE_COPY={
  review:{title:'复盘不是审判，是把线索收回来',body:'这一页适合把完成、状态、灵感和情绪收在一起，慢慢看出最近的节奏。',focus:['先看最近完成','再记一句感受','最后补一条下一步']},
  bill:{title:'每一笔都轻轻记下来，心里会更稳',body:'账单页不用很硬核，只要记清收入和支出，后面复盘就会更轻松。',focus:['先补今天支出','收入单独记','分类不确定先随手记']},
  health:{title:'照顾身体不是插队，是正事',body:'先把提醒和记录做轻一点，让它们像陪伴而不是催促。',focus:['先看今天提醒','只改最需要的一项','留一句身体状态']},
  birthday:{title:'把重要的人记住，也是一种温柔',body:'生日提醒不用复杂，先把会忘的日期接住，后面再补细节。',focus:['先看最近生日','补一个日期','想提醒方式再慢慢改']},
  extra:{title:'额外完成也值得被看见',body:'那些没排进计划却做掉的事，会真实决定你今天到底多累、多努力。',focus:['先记今天多做的','一句话就够','后面再交给 AI 整理']},
  inspire:{title:'灵感先收住，别让它一下就跑了',body:'这一页适合放心情片段、灵感火花和一闪而过的小念头。',focus:['先写一句','再选心情','重要的可以钉住']},
  notes:{title:'随手记不是杂乱，是你的缓冲区',body:'把脑子里的碎片放下来，今天就会轻很多。',focus:['先写标题或一句话','有图就先识别','后面再整理也不迟']},
  badge:{title:'一点点成就也值得被点亮',body:'勋章页不是炫耀，是让你看见自己其实已经走了很远。',focus:['先看最近得到的','把想保留的留着','空的时候再回看']},
  wish:{title:'愿望基金慢慢攒，也会有力量',body:'这里不用天天盯，只要偶尔回来看看，目标就会更具体。',focus:['先看当前目标','收入到了再补','保持一点期待']},
  default:{title:'这一页也可以是温柔的工作台',body:'逻辑不动，我们只是把它整理成更顺手、更好扫一眼的样子。',focus:['先看最上面摘要','再做一个小动作','剩下的慢慢来']}
};
function renderGenericSectionRoute(sectionId){
  if(!routeState||!['reviewSection','billSection','healthSection','birthdaySection','extraSection','inspireSection','notesSection','badgeSection','wishSection'].includes(sectionId))return;
  const body=document.getElementById('v2RouteBody');
  const section=document.getElementById(sectionId);
  if(!body||!section)return;
  body.querySelector('.v2-generic-route-shell')?.remove();
  const kind=sectionId.replace('Section','');
  const copy=GENERIC_ROUTE_COPY[kind]||GENERIC_ROUTE_COPY.default;
  const count=Math.max(
    section.querySelectorAll('.card').length,
    section.querySelectorAll('.v2-panel').length,
    section.querySelectorAll('li').length,
    section.querySelectorAll('.task-item,.bill-item,.wish-item,.badge-item,.note-item,.inspire-item').length
  );
  const shell=document.createElement('div');
  shell.className='v2-generic-route-shell';
  shell.innerHTML=`
    <div class="v2-route-overview ${kind==='bill'||kind==='wish'?'project':kind==='review'?'planner':'day'} v2-route-journal">
      <div class="v2-route-overview-main">
        <div>
          ${routeEyebrow(kind==='review'?'planner':kind==='bill'||kind==='wish'?'project':'day',HOME_ROUTES[sectionId]?.[0]||'模块整理')}
          <h3>${copy.title}</h3>
          <p>${copy.body}</p>
        </div>
        <div class="v2-route-overview-progress">
          <div class="v2-overview-ring"><strong>${count}</strong><span>内容块</span></div>
          <div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:${Math.min(100,28+count*12)}%"></span></div><small>往下就是当前真实内容，我只把结构和视觉收得更顺手了。</small></div>
        </div>
        ${routeOverviewAside(kind==='review'?'planner':kind==='bill'||kind==='wish'?'project':'day','现在先做',[copy.focus[0]||'先看顶部摘要',copy.focus[1]||'再做一个小动作',HOME_ROUTES[sectionId]?.[0]?`这一页是 ${HOME_ROUTES[sectionId][0]}`:'慢慢补就行'])}${routeMascot(kind==='review'?'planner':kind==='bill'||kind==='wish'?'project':'day','is-right')}${routeDecorPair()}
      </div>
      <div class="v2-overview-cards">
        ${routeCard('icons-collage-v2/icon-note.png',count,'当前内容')}
        ${routeCard('ui-icons-collage-v1/icon-complete-badge.png',copy.focus.length,'先做这几步')}
        ${routeCard(DETAIL_ICON_ART.mood,selectedDay===todayStr()?'今天':'慢慢补','记录节奏')}
        ${routeCard('icons-collage-v2/icon-all.png',HOME_ROUTES[sectionId]?.[0]||'模块','当前页')}
      </div>
    </div>
    <div class="v2-route-mini-grid">
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle(kind==='review'?'planner':'day','现在先做')}</h3>
        <div class="v2-mini-chip-grid">${copy.focus.map(text=>`<span class="v2-chip active">${esc(text)}</span>`).join('')}</div>
      </div>
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle(kind==='bill'||kind==='wish'?'project':'rhythm','轻提醒')}</h3>
        <p class="hint">这页下面保留的是原来的真实逻辑，我只把它收进了更像手帐内页的壳里。</p>
      </div>
    </div>
    ${routePromptCard(kind==='review'?'planner':kind==='bill'||kind==='wish'?'project':'day','先从一小步开始',copy.body,copy.focus.slice(0,2))}`;
  body.insertBefore(shell,section);
}
function taskStickerAsset(item){
  const text=`${item?.title||''} ${item?.type||''} ${item?.taskType||''}`;
  if(/英语|单词|词汇|学习|复习|阅读|背/.test(text))return 'view-icons/icon-study-english-sticker.svg';
  if(/跑步|散步|运动|锻炼|健身|拉伸/.test(text))return /跑步/.test(text)?'view-icons/icon-run-sticker.svg':'view-icons/icon-workout-sticker.svg';
  if(/主包|保研|项目推进|项目|论文项目|科研项目/.test(text))return 'view-icons/icon-baoyan-project-sticker.svg';
  if(/喝水|热水|补水|水杯|水/.test(text))return DETAIL_ICON_ART.water;
  if(/睡|午休|休息|恢复/.test(text))return DETAIL_ICON_ART.sleep;
  if(/电量|状态|低电量|高电量|疲惫|没力气/.test(text))return DETAIL_ICON_ART.battery;
  if(/节奏|时间|计时|番茄|闹钟|开始/.test(text))return 'ui-icons-collage-v1/icon-alarm.png';
  if(/情绪|心情|开心|烦|焦虑|低落/.test(text))return DETAIL_ICON_ART.mood;
  if(/影响|电话|消息|打断|客户|沟通|咨询/.test(text))return DETAIL_ICON_ART.factor;
  if(/项目|电脑|代码|文档|软件|表格|副业|主包/.test(text))return 'icons-collage-v2/icon-goal.png';
  if(/论文|科研|文献|翻译|写作|PPT|学习|英语|阅读|复习/.test(text))return 'icons-collage-v2/icon-note.png';
  if(/任务池|待安排|想做/.test(text))return 'icons-collage-v2/icon-note.png';
  if(/整理|收纳|家务|洗脸|洗澡|开窗|站起来|袋子/.test(text))return 'icons-collage-v2/icon-focus.png';
  if(/循环|重复/.test(text))return 'icons-collage-v2/icon-all.png';
  if(item?.type==='项目'||item?.taskType==='项目')return 'icons-collage-v2/icon-goal.png';
  if(item?.type==='循环'||item?.taskType==='循环')return 'icons-collage-v2/icon-all.png';
  if(item?.type==='临时'||item?.taskType==='临时')return 'icons-collage-v2/icon-pomodoro.png';
  return 'icons-collage-v2/icon-daily-task.png';
}
function taskSticker(item,className='v2-task-sticker',alt=''){
  return stickerImg(taskStickerAsset(item),className,alt||item?.title||item?.type||item?.taskType||'任务');
}
const ROUTE_ENCOURAGEMENTS={
  home:{
    title:['先照顾自己，再推进事情也来得及','慢一点没关系，今天只要稳稳向前','先把人安顿好，任务自然会顺一点'],
    body:['你不是落后，你只是在给今天留缓冲。','把节奏放顺，比把任务塞满更重要。','今天不用赢很多，只要别把自己压坏。']
  },
  daily:{
    title:['每天重复的小事，也是在把生活慢慢扶正','先做一件能打勾的，今天就有起色了','把每天要碰的事排顺，心也会稳一点'],
    body:['不用全做完，先把最容易开始的一件做掉。','小步完成也算推进，别把自己吓住。','今天只要把节奏扶起来，后面就会轻松一点。']
  },
  project:{
    title:['大任务不靠硬扛，靠下一步清楚','今天只推进一点，也是在认真往前走','项目感不是做很多，是知道下一步做什么'],
    body:['先把下一步写出来，事情就不会那么吓人。','能推进 10 分钟，也比空转半天强。','别催自己一口气做完，先让项目重新动起来。']
  },
  cyclic:{
    title:['循环琐事慢慢收，生活就不会一直漏风','这些小事不起眼，但收掉它们很有力量','把反复出现的小事排顺，脑子会轻很多'],
    body:['先碰今天到期的，别让它们在脑子里排队。','琐事不是没价值，它们在帮你守住生活底盘。','今天收掉一两件，后面就少一点拖拽感。']
  },
  temp:{
    title:['临时事先分轻重，心里就不会一锅粥','不是所有突然出现的事都要立刻处理','先挑真的紧急的，别被噪音推着跑'],
    body:['能延期的别硬塞，今天只保住必要项。','先做最容易清掉的一件，脑子会立刻轻一点。','临时任务不是洪水，分层以后就能喘口气。']
  },
  rhythm:{
    title:['把状态记下来，后面的安排才会更懂你','今天是什么节奏，就按什么节奏来','先看自己现在在哪里，再决定往哪推'],
    body:['状态不是借口，是安排任务的依据。','你记得越真实，AI 后面越不会乱安排。','先把累、乱、卡写清楚，今天就已经前进了。']
  },
  taskPool:{
    title:['想做的先放这里，不必全压到今天','任务池不是积压，是给今天减负','先留住念头，什么时候做可以后面再定'],
    body:['把想做和该做分开，心里会一下轻很多。','先收进任务池，不代表拖延，代表你在分层。','不是每件事都该今天解决，留白本身就是能力。']
  },
  day:{
    title:['这一天的安排和记录，都是在帮你看清自己','今天做了多少不是全部，怎么做的也很重要','把这一天收拢好，明天就不会乱'],
    body:['完成、跳过、延期，都是在描述真实节奏。','今天不是非黑即白，留痕本身就有价值。','把这一天写清楚，后面复盘会轻松很多。']
  },
  planner:{
    title:['先选一套适合今天的，不用一下把自己排满','安排得顺，比安排得多更重要','先选一个能执行的版本，今天就不会乱'],
    body:['今天的计划应该服务你，不是压着你跑。','能落地的安排，才算真正的好安排。','先让今天过得稳，再谈效率和冲刺。']
  }
};
function pickRotatingCopy(kind='home',part='title',seedExtra=''){
  const pool=ROUTE_ENCOURAGEMENTS[kind]?.[part]||ROUTE_ENCOURAGEMENTS.home[part]||['今天也有在慢慢变好'];
  const seed=`${todayStr()}|${kind}|${currentMode?.()||'normal'}|${seedExtra}`;
  return pool[hashId(seed)%pool.length];
}
function updateVersionChip(){const el=document.getElementById('v2VersionChip');if(el)el.textContent=`版本 ${versionLabel()}`}
function setRuntimeAppInfo(info){
  APP_VERSION=info?.versionName||APP_VERSION;
  APP_VERSION_CODE=Number(info?.versionCode)||APP_VERSION_CODE||0;
  APP_PACKAGE_NAME=info?.packageName||APP_PACKAGE_NAME||'';
  window.TASK_MANAGER_APP_VERSION=APP_VERSION;
  window.TASK_MANAGER_APP_VERSION_CODE=APP_VERSION_CODE;
  updateVersionChip();
}
function getHolidayLabel(ds){return HOLIDAYS_2026[ds]||''}
function getBirthdayEntries(ds){const dt=new Date(ds+'T12:00:00'),m=dt.getMonth()+1,d=dt.getDate();return(appData.birthdays||[]).filter(x=>Number(x.month)===m&&Number(x.day)===d)}
function getEmotionEntries(ds){return(appData.v2?.emotionLogs||[]).filter(x=>x.date===ds)}
function getDayNotes(ds){return(appData.notes||[]).filter(x=>x.date===ds)}
function getDayInspirationEntries(ds){return(appData.inspirations||[]).filter(x=>x.date===ds)}
function getEatingLogs(ds=''){const list=appData.v2?.eatingLogs||[];return ds?list.filter(x=>x.date===ds):list}
function getLateNightLogs(ds=''){const list=appData.v2?.lateNightLogs||[];return ds?list.filter(x=>x.date===ds):list}
function recentLogs(list,limit=7){return(list||[]).slice().sort((a,b)=>String(b.createdAt||b.date||'').localeCompare(String(a.createdAt||a.date||''))).slice(0,limit)}
function recentWindowCount(list,days=7){
  const cutoff=daysLater(-(days-1));
  return(list||[]).filter(x=>String(x.date||'')>=cutoff).length
}
function saveEatingLog(entry){
  if(!entry||!entry.date)return false;
  appData.v2.eatingLogs.unshift(Object.assign({id:'eat-'+genId(),createdAt:nowISO(),date:todayStr(),level:'普通想吃',moment:'待补',trigger:'',mood:'',note:'',source:'manual'},entry));
  appData.v2.eatingLogs=appData.v2.eatingLogs.slice(0,400);
  persist();
  return true
}
function saveLateNightLog(entry){
  if(!entry||!entry.date)return false;
  appData.v2.lateNightLogs.unshift(Object.assign({id:'night-'+genId(),createdAt:nowISO(),date:todayStr(),bedtime:'',trigger:'',nextDay:'',mood:'',note:'',source:'manual'},entry));
  appData.v2.lateNightLogs=appData.v2.lateNightLogs.slice(0,400);
  persist();
  return true
}
function eatingWeeklySummary(){
  const logs=getEatingLogs(),today=todayStr(),todayLogs=logs.filter(x=>x.date===today),weekCount=recentWindowCount(logs,7);
  const heavyCount=logs.filter(x=>String(x.date||'')>=daysLater(-6)&&/暴食|失控|停不下来/.test(`${x.level||''} ${x.note||''}`)).length;
  const triggers={};
  logs.filter(x=>String(x.date||'')>=daysLater(-6)).forEach(x=>{const key=(x.trigger||'没写诱因').trim();if(!key)return;triggers[key]=(triggers[key]||0)+1});
  const topTrigger=Object.entries(triggers).sort((a,b)=>b[1]-a[1])[0]?.[0]||'还没看出来';
  return{todayLogs,weekCount,heavyCount,topTrigger}
}
function lateNightWeeklySummary(){
  const logs=getLateNightLogs(),today=todayStr(),todayLogs=logs.filter(x=>x.date===today),weekCount=recentWindowCount(logs,7);
  const after3Count=logs.filter(x=>String(x.date||'')>=daysLater(-6)&&x.bedtime&&timeToMinutes(x.bedtime)>=180).length;
  const triggers={};
  logs.filter(x=>String(x.date||'')>=daysLater(-6)).forEach(x=>{const key=(x.trigger||'没写原因').trim();if(!key)return;triggers[key]=(triggers[key]||0)+1});
  const topTrigger=Object.entries(triggers).sort((a,b)=>b[1]-a[1])[0]?.[0]||'还没看出来';
  return{todayLogs,weekCount,after3Count,topTrigger}
}
function getTimeSlotLabel(timeText){
  if(!timeText)return'未定时';
  const hour=Number(String(timeText).split(':')[0]||0);
  if(hour<12)return'上午';
  if(hour<18)return'下午';
  return'晚上'
}
function timeToMinutes(value){
  const [h='0',m='0']=String(value||'').split(':');
  return Number(h)*60+Number(m)
}
function sleepDurationText(start,end){
  if(!start||!end)return'';
  let diff=timeToMinutes(end)-timeToMinutes(start);
  if(diff<=0)diff+=24*60;
  const h=Math.floor(diff/60),m=diff%60;
  return `${h}h${m?`${m}m`:''}`
}
function formatHHMM(total){
  const h=Math.floor(total/60),m=total%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}
function detectTimeFromText(text){
  const src=String(text||'');
  const match=src.match(/(凌晨|早上|上午|中午|下午|傍晚|晚上|今晚)?\s*([0-2]?\d)(?:[:点时](\d{1,2}))?\s*(?:分)?/);
  if(!match)return null;
  let hour=Number(match[2]||0),minute=Number(match[3]||0);
  const period=match[1]||'';
  if(period==='凌晨'){if(hour===12)hour=0}
  else if(period==='中午'){if(hour<11)hour+=12}
  else if(/下午|傍晚|晚上|今晚/.test(period)){if(hour<12)hour+=12}
  else if(/早上|上午/.test(period)&&hour===12)hour=0;
  if(hour>23||minute>59)return null;
  const value=`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
  return {value,label:getTimeSlotLabel(value)}
}
function detectTimeWindowFromText(text){
  const src=String(text||'').trim();
  if(!src)return null;
  const rangeMatch=src.match(/((?:凌晨|早上|上午|中午|下午|傍晚|晚上|今晚)?\s*[0-2]?\d(?:[:点时]\d{1,2})?\s*(?:分)?)[\s]*(?:到|至|\-|—|~|～)[\s]*((?:凌晨|早上|上午|中午|下午|傍晚|晚上|今晚)?\s*[0-2]?\d(?:[:点时]\d{1,2})?\s*(?:分)?)/);
  if(rangeMatch){
    const start=detectTimeFromText(rangeMatch[1]);
    const end=detectTimeFromText(rangeMatch[2]);
    if(start&&end)return{plannedStart:start.value,plannedEnd:end.value,timeLabel:getTimeSlotLabel(start.value),alarmTime:start.value};
  }
  const single=detectTimeFromText(src);
  if(!single)return null;
  return{plannedStart:single.value,plannedEnd:'',timeLabel:single.label,alarmTime:single.value};
}
function enrichSmartTodoItem(text,target='pending'){
  const rawText=String(text||'').trim();
  const timing=detectTimeWindowFromText(rawText)||{};
  return{
    title:buildPlanTitle(rawText),
    rawText,
    target,
    plannedStart:timing.plannedStart||'',
    plannedEnd:timing.plannedEnd||'',
    timeLabel:timing.timeLabel||'',
    alarmTime:timing.alarmTime||'',
    important:!!timing.alarmTime
  }
}
function inferItemStart(item,index=0){
  const exact=item.plannedStart||item.alarmTime||'';
  if(exact)return exact;
  if(item.timeLabel==='上午')return ['08:00','09:00','10:00','11:00'][index%4];
  if(item.timeLabel==='下午')return ['14:00','15:00','16:00','17:00'][index%4];
  if(item.timeLabel==='晚上')return ['19:00','20:00','21:00'][index%3];
  if(item.type==='每日')return ['08:00','09:00','10:00'][index%3];
  if(item.type==='项目')return ['14:00','15:00','16:00'][index%3];
  if(item.type==='循环')return ['18:00','19:00'][index%2];
  return ['09:00','11:00','15:00','20:00'][index%4]
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
window.buildEmotionLog=buildEmotionLog;
window.saveEmotionLog=saveEmotionLog;
window.esc=esc;
const SMART_CAPTURE_GROUPS=[
  ['completed','已完成'],
  ['todo','待安排'],
  ['status','状态'],
  ['mood','心情'],
  ['interrupts','打断源'],
  ['hiddenCosts','隐形成本'],
  ['bills','账单'],
  ['water','喝水记录'],
  ['tomorrowAdvice','明日建议'],
  ['unknown','待确认']
];
const SMART_CAPTURE_TYPE_ALIASES={已完成:'completed',待安排:'todo',待办:'todo',任务:'todo',状态:'status',心情:'mood',打断源:'interrupts',隐形成本:'hiddenCosts',账单:'bills',喝水:'water',喝水记录:'water',明日建议:'tomorrowAdvice',待确认:'unknown'};
const smartCaptureDrafts={};
function normalizeSmartCaptureText(text){
  return String(text||'').replace(/\s+/g,' ').replace(/[，,]/g,'，').trim()
}
function cloneCachedSmartCapture(entry){
  const result=clone(entry.result||entry);
  result.id='sc-'+genId();
  Object.values(result.groups||{}).forEach(list=>(list||[]).forEach(item=>item.id='sc-item-'+genId()));
  smartCaptureDrafts[result.id]=result;
  return result
}
function findCachedSmartCapture(text){
  const key=normalizeSmartCaptureText(text);
  if(!key)return null;
  const hit=(appData.v2.smartCapture.analysisCache||[]).find(x=>x.key===key);
  return hit?cloneCachedSmartCapture(hit):null
}
function rememberSmartCaptureAnalysis(text,result){
  const key=normalizeSmartCaptureText(text);
  if(!key||!result)return;
  const cached={key,updatedAt:nowISO(),result:clone(result)};
  delete cached.result.id;
  const list=(appData.v2.smartCapture.analysisCache||[]).filter(x=>x.key!==key);
  list.unshift(cached);
  appData.v2.smartCapture.analysisCache=list.slice(0,40);
}
function smartCaptureSkeleton(text=''){return{id:'sc-'+genId(),sourceText:text,createdAt:nowISO(),options:{todoTarget:'auto'},groups:Object.fromEntries(SMART_CAPTURE_GROUPS.map(([key])=>[key,[]])),errors:[],summary:{total:0}}}
function splitSmartCaptureText(text){
  return String(text||'').replace(/\r/g,'').split(/[。！？!\?\n]+/).flatMap(part=>part.split(/[，,；]|但是|不过|然后|另外|还有/)).map(x=>x.trim()).filter(Boolean)
}
function trimCaptureTitle(text){
  return String(text||'').replace(/^(我刚刚|我刚|我已经|我已|刚刚|刚|今天|现在|我等会|等会|我待会|待会|我还想|我想|我还要|还要|我还没|还没|我后面还要|后面还要|我把|我去|我回复了|我做了|我收拾了|我喝了|我寄了|我出去|我本来想|我现在|我感觉|我觉得|明天|别给我|不要给我)+/,'').replace(/(了|啦|呀|呢|吧|一下|一部分)+$/,'').replace(/^(把|将)/,'').replace(/[，。；、,\s]+$/,'').trim()
}
function addSmartCaptureItem(result,key,item){
  if(!result?.groups?.[key])return;
  item=item||{};
  item.id=item.id||('sc-item-'+genId());
  item.previewIndex=result.summary.total+1;
  result.groups[key].push(item);
  result.summary.total++;
}
function detectBillType(text){
  if(/收入|赚了|卖了|进账|收了|到账|咨询收入|代做收入/.test(text))return'income';
  if(/花了|支出|付了|买了|打车|奶茶|花费|用了/.test(text))return'expense';
  return''
}
function detectBillCategory(text,type){
  if(type==='income'){
    if(/咨询/.test(text))return'咨询收入';
    if(/资料/.test(text))return'资料收入';
    if(/PPT|代做/.test(text))return'PPT 代做收入';
    return'其他收入'
  }
  if(/奶茶|咖啡|饮料/.test(text))return'餐饮';
  if(/打车|地铁|公交|车费|交通/.test(text))return'交通';
  if(/散纸|材料|打印|快递盒|胶带/.test(text))return'日用品';
  return'其他支出'
}
function parseBillCapture(text){
  const amountMatch=String(text).match(/(\d+(?:\.\d+)?)/);
  const type=detectBillType(text);
  if(!amountMatch||!type)return null;
  return{rawText:text,title:trimCaptureTitle(text),amount:Number(amountMatch[1]),type,category:detectBillCategory(text,type)}
}
function buildWaterCapture(text){
  let level='正常';
  if(/没怎么喝水|喝水很少|不太喝水|今天没喝水|喝水少/.test(text))level='少';
  else if(/喝了很多水|一直喝水|喝水很多/.test(text))level='多';
  else if(/提醒我喝水/.test(text))level='提醒';
  return{rawText:text,level,title:trimCaptureTitle(text)||'喝水'}
}
function buildHiddenCostCapture(text){
  const durationMatch=String(text).match(/(\d+)\s*(分钟|分|小时|h)/);
  const duration=durationMatch?`${durationMatch[1]}${durationMatch[2].replace('分钟','分')}`:(/半小时/.test(text)?'30分':'');
  return{rawText:text,title:trimCaptureTitle(text)||text,timeCost:duration||(/很久|很多时间/.test(text)?'较久':'未写明'),costTypes:[/体力|累|消耗/.test(text)?'体力':(/情绪|烦|内耗/.test(text)?'情绪':'时间')]}
}
function buildPlanTitle(text){
  return trimCaptureTitle(text).replace(/^(收拾|洗澡|回复|喝水|寄快递|分装)了/,'$1').replace(/^(副业|论文|商品标题|账单|PPT)(还没做|还没看|还要|后面还要)?/,(_,name)=>name)
}
function buildStatusCapture(text){
  const title=trimCaptureTitle(text)||text;
  return{rawText:text,title,energy:/低电量|没电|困|累|不太想动|瘫/.test(text)?'低电量':(/还可以|还能干一点|状态还行/.test(text)?'中等电量':''),body:/头有点紧|头紧|头疼/.test(text)?'头有点紧':(/困|疲惫|累/.test(text)?'疲惫':''),note:title}
}
function classifySmartCaptureSegment(text,result){
  const src=String(text||'').trim();if(!src)return;
  if(/明天/.test(src)&&/(不要|别|少安排|别给我排太满|优先|先|复杂任务)/.test(src)){addSmartCaptureItem(result,'tomorrowAdvice',{title:src,rawText:src});return}
  if(/花了.*(分钟|小时|半小时)|浪费了很久|消耗|跑出去.*花了|等快递/.test(src)){addSmartCaptureItem(result,'hiddenCosts',buildHiddenCostCapture(src));return}
  const bill=parseBillCapture(src);
  if(bill){addSmartCaptureItem(result,'bills',bill);return}
  if(/喝水/.test(src)){addSmartCaptureItem(result,'water',buildWaterCapture(src));return}
  if(/被.*打断|一直被.*打断|插进来|消息太多|电话打断|快递打断|临时事情太多/.test(src)){addSmartCaptureItem(result,'interrupts',{title:trimCaptureTitle(src)||src,rawText:src});return}
  if(/烦|焦虑|内耗|舒服了一点|低落|委屈|崩了|难受/.test(src)){addSmartCaptureItem(result,'mood',{title:trimCaptureTitle(src)||src,rawText:src});return}
  if(/头有点紧|低电量|不太想动|状态一般|有点瘫|很困|累|疲惫|还可以干一点/.test(src)){addSmartCaptureItem(result,'status',buildStatusCapture(src));return}
  if(/刚刚|已经|回复了|把.*分装|喝了|寄快递|洗澡了|收拾了|做完/.test(src)&&!/还没|还要|明天/.test(src)){addSmartCaptureItem(result,'completed',{title:buildPlanTitle(src),rawText:src});return}
  if(/还没|还要|等会|待会|后面还要|明天要|想改|想把|继续弄|继续|要继续|以后想做|后面再弄|不急|有空再做|今天要做|今天必须处理|现在安排一下|等会就做/.test(src)){
    const target=/以后想做|后面再弄|不急|有空再做|明天/.test(src)?'pending':(/等会|待会|今天|现在安排|等会就做|必须处理/.test(src)?'today':'pending');
    addSmartCaptureItem(result,'todo',enrichSmartTodoItem(src,target));
    return
  }
  addSmartCaptureItem(result,'unknown',{title:src,rawText:src,error:'分类不明确'})
}
function analyzeSmartCaptureText(text){
  const cached=findCachedSmartCapture(text);
  if(cached)return cached;
  const result=smartCaptureSkeleton(text);
  splitSmartCaptureText(text).forEach(segment=>classifySmartCaptureSegment(segment,result));
  if(result.groups.completed.length+result.groups.todo.length+result.groups.status.length+result.groups.mood.length+result.groups.interrupts.length+result.groups.hiddenCosts.length+result.groups.bills.length+result.groups.water.length+result.groups.tomorrowAdvice.length===0)return null;
  rememberSmartCaptureAnalysis(text,result);
  smartCaptureDrafts[result.id]=result;
  return result
}
function smartCaptureGroupLabel(key){return SMART_CAPTURE_GROUPS.find(x=>x[0]===key)?.[1]||key}
function smartCaptureTypeOptions(selectedKey){
  return SMART_CAPTURE_GROUPS.filter(([key])=>key!=='unknown').map(([key,label])=>`<option value="${key}" ${selectedKey===key?'selected':''}>${label}</option>`).join('')+`<option value="unknown" ${selectedKey==='unknown'?'selected':''}>待确认</option>`
}
function buildSmartCapturePreviewHTML(result,{interactive=true}={}){
  if(!result)return'<div class="hint">还没有识别到可录入内容</div>';
  const editMode=!!result.editMode;
  const detectedCount=SMART_CAPTURE_GROUPS.reduce((sum,[key])=>sum+((result.groups[key]||[]).length),0);
  const head=`<div class="v2-capture-head"><span>本次识别 ${detectedCount} 条</span><span>${editMode?'编辑中':'已分类预览'}</span></div>`;
  const sections=SMART_CAPTURE_GROUPS.filter(([key])=>(result.groups[key]||[]).length).map(([key,label])=>`<div class="v2-capture-group"><div class="v2-capture-group-title">${label}</div>${result.groups[key].map(item=>`<div class="v2-capture-line ${editMode?'is-editing':''}" data-smart-item-id="${item.id}" data-smart-current-key="${key}"><span class="v2-capture-index">${item.previewIndex}.</span><span>${esc(item.title||item.rawText||'')}</span>${editMode?`<select data-smart-field="type" style="margin-left:auto;padding:4px 6px;border:1px solid var(--border);border-radius:8px">${smartCaptureTypeOptions(key)}</select>`:''}${item.amount?`<span class="v2-capture-meta">${item.type==='income'?'+':'-'}${item.amount}</span>`:''}${item.category?`<span class="v2-capture-meta">${esc(item.category)}</span>`:''}${item.level?`<span class="v2-capture-meta">${esc(item.level)}</span>`:''}${item.target==='today'?`<span class="v2-capture-meta">今日</span>`:''}${item.target==='pending'?`<span class="v2-capture-meta">任务池</span>`:''}</div>${editMode&&key==='bills'?`<div class="v2-row" data-smart-item-id="${item.id}" style="margin:6px 0 10px 22px"><input data-smart-field="amount" type="number" step="0.1" value="${Number(item.amount||0)}" style="flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:8px" placeholder="金额"><input data-smart-field="category" value="${esc(item.category||'')}" style="flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:8px" placeholder="分类"></div>`:''}`).join('')}</div>`).join('');
  const editHint=editMode?`<div class="hint" style="margin-bottom:8px">可以直接改每条内容的类型；账单支持改金额和分类。改完点“保存修改”。</div>`:'';
  const unknown=(result.groups.unknown||[]).length?`<div class="v2-capture-warn">待确认 ${(result.groups.unknown||[]).length} 条，上传时会跳过并说明原因。</div>`:'';
  const actions=interactive?`<div class="v2-row v2-capture-actions" style="flex-wrap:wrap;justify-content:flex-end"><button class="v2-primary" data-smart-action="upload" data-smart-id="${result.id}">一键上传</button>${editMode?`<button class="v2-primary" data-smart-action="save-edit" data-smart-id="${result.id}">保存修改</button><button class="v2-secondary" data-smart-action="cancel-edit" data-smart-id="${result.id}">取消修改</button>`:`<button class="v2-secondary" data-smart-action="edit" data-smart-id="${result.id}">修改分类</button>`}<button class="v2-secondary" data-smart-action="record" data-smart-id="${result.id}">只记录不安排</button><button class="v2-secondary" data-smart-action="today" data-smart-id="${result.id}">加入今日清单</button><button class="v2-secondary" data-smart-action="pending" data-smart-id="${result.id}">加入任务池/待安排</button><button class="v2-secondary" data-smart-action="retry" data-smart-id="${result.id}">重新识别</button><button class="v2-secondary" data-smart-action="discard" data-smart-id="${result.id}">丢弃</button></div>`:'';
  return sections||unknown?`${head}${editHint}${sections}${unknown}${actions}`:'<div class="hint">还没有识别到可录入内容</div>'
}
function parseSmartCaptureEditInstruction(input){
  const text=String(input||'').trim();
  if(!text)return null;
  const billMatch=text.match(/^(\d+)\s+账单\s+([+-]?\d+(?:\.\d+)?)\s+(.+)$/);
  if(billMatch)return{index:Number(billMatch[1]),kind:'bill',amount:Number(billMatch[2]),category:billMatch[3].trim()};
  const targetMatch=text.match(/^(\d+)\s+(今日清单|今日|任务池|待安排|待办|状态|心情|打断源|隐形成本|账单|喝水|明日建议|已完成|待确认)$/);
  if(targetMatch)return{index:Number(targetMatch[1]),kind:'move',targetKey:SMART_CAPTURE_TYPE_ALIASES[targetMatch[2].trim()]||null};
  return null
}
function updateSmartCaptureBill(result,index,amount,category){
  const item=(result.groups.bills||[]).find(x=>Number(x.previewIndex)===Number(index));
  if(!item)return false;
  if(!(amount>0))return false;
  item.amount=amount;
  item.category=category||item.category;
  return true
}
function applySmartCaptureEditsFromContainer(result,container){
  if(!result||!container)return false;
  const rebuilt=Object.fromEntries(SMART_CAPTURE_GROUPS.map(([key])=>[key,[]]));
  const byId={};
  Object.entries(result.groups||{}).forEach(([key,list])=>(list||[]).forEach(item=>{byId[item.id]={...item};if(item._originalKey===undefined)item._originalKey=key}));
  container.querySelectorAll('[data-smart-item-id][data-smart-current-key]').forEach(row=>{
    const itemId=row.dataset.smartItemId;
    const item=byId[itemId];
    if(!item)return;
    const nextKey=row.querySelector('[data-smart-field="type"]')?.value||row.dataset.smartCurrentKey||item._originalKey||'unknown';
    if(nextKey==='bills'){
      const groupRow=container.querySelector(`.v2-row[data-smart-item-id="${itemId}"]`);
      const amountValue=Number(groupRow?.querySelector('[data-smart-field="amount"]')?.value||item.amount||0);
      const categoryValue=groupRow?.querySelector('[data-smart-field="category"]')?.value?.trim()||item.category||'';
      item.amount=amountValue;
      item.category=categoryValue;
    }
    rebuilt[nextKey]=rebuilt[nextKey]||[];
    rebuilt[nextKey].push(item);
  });
  let index=1;
  SMART_CAPTURE_GROUPS.forEach(([key])=>{
    rebuilt[key]=(rebuilt[key]||[]).map(item=>Object.assign(item,{previewIndex:index++}))
  });
  result.groups=rebuilt;
  result.editMode=false;
  return true
}
function updateStatusSummaryFromCapture(items){
  if(items.some(x=>x.energy==='低电量'||/低电量|不太想动|困|累/.test(x.rawText||'')))appData.todayStatus.energy='😫';
  else if(items.some(x=>/还可以|状态好/.test(x.rawText||'')))appData.todayStatus.energy='😐';
}
function uploadSmartCaptureResult(result,mode='auto'){
  const report={success:[],errors:[]};
  if(!result)return report;
  const ds=todayStr();
  const smartTodoPayload=item=>({
    id:'smart-todo-'+genId(),
    title:item.title,
    type:'临时',
    status:'todo',
    important:!!item.important,
    reminderMode:item.alarmTime?'alarm':'notification',
    createdAt:nowISO(),
    source:'smart-capture',
    sourceIntent:item.target||'pending',
    plannedStart:item.plannedStart||'',
    plannedEnd:item.plannedEnd||'',
    timeLabel:item.timeLabel||getTimeSlotLabel(item.plannedStart||item.alarmTime||''),
    alarmTime:item.alarmTime||''
  });
  const smartPoolPayload=item=>({
    id:'pending-'+genId(),
    title:item.title,
    source:'smart-capture',
    createdAt:nowISO(),
    rawText:item.rawText,
    status:'待安排',
    taskType:'临时',
    note:item.plannedStart?`建议时间 ${item.plannedStart}${item.plannedEnd?`-${item.plannedEnd}`:''}`:'',
    plannedStart:item.plannedStart||'',
    plannedEnd:item.plannedEnd||'',
    timeLabel:item.timeLabel||'',
    alarmTime:item.alarmTime||'',
    important:!!item.important
  });
  try{
    (result.groups.completed||[]).forEach(item=>upsertPlanItem(ds,{id:'smart-done-'+genId(),title:item.title,type:'记录',status:'done',important:false,reminderMode:'notification',createdAt:nowISO(),completedAt:nowISO(),source:'smart-capture'}));
    if(result.groups.completed?.length)report.success.push(`今日清单：${result.groups.completed.length} 条已完成事项`);
  }catch(e){report.errors.push('今日清单上传失败，原因是目标模块不存在')}
  try{
    const todoItems=result.groups.todo||[];
    if(todoItems.length){
      if(mode==='today'){
        todoItems.forEach(item=>upsertPlanItem(ds,smartTodoPayload(item)));
        report.success.push(`今日清单：${todoItems.length} 条待办事项`)
      }else if(mode==='record'){
        todoItems.forEach(item=>appData.notes.unshift({id:'note-'+genId(),title:'只记录不安排',text:item.rawText||item.title,date:ds,createdAt:nowISO(),pinned:false,done:false,source:'smart-capture-record'}));
        report.success.push(`随手记：${todoItems.length} 条待办想法（未安排）`)
      }else{
        const todayItems=mode==='auto'?todoItems.filter(item=>item.target==='today'):[];
        const pendingItems=mode==='auto'?todoItems.filter(item=>item.target!=='today'):todoItems;
        if(todayItems.length){
          todayItems.forEach(item=>upsertPlanItem(ds,smartTodoPayload(item)));
          report.success.push(`今日清单：${todayItems.length} 条待办事项`)
        }
        if(pendingItems.length){
          pendingItems.forEach(item=>upsertTaskPoolItem(smartPoolPayload(item)));
          report.success.push(`任务池：${pendingItems.length} 条待安排任务`)
        }
      }
    }
  }catch(e){report.errors.push('待办上传失败，原因是字段缺失')}
  try{
    const entry=getLifeRhythmEntry(ds,true);
    (result.groups.status||[]).forEach(item=>{if(item.energy)entry.energyLevel=item.energy;if(item.body)entry.bodyState=item.body;entry.note=[entry.note,item.note].filter(Boolean).join('；').slice(0,180)});
    (result.groups.interrupts||[]).forEach(item=>{if(!entry.interrupts.includes(item.title))entry.interrupts.push(item.title);if(!entry.rhythmFactors.includes(item.title))entry.rhythmFactors.push(item.title)});
    (result.groups.hiddenCosts||[]).forEach(item=>entry.hiddenCosts.push({id:'hc-'+genId(),title:item.title,duration:item.timeCost,money:'',disrupted:'否',costTypes:item.costTypes,note:''}));
    if((result.groups.status||[]).length||(result.groups.interrupts||[]).length||(result.groups.hiddenCosts||[]).length){
      updateStatusSummaryFromCapture(result.groups.status||[]);
      saveLifeRhythmEntry(entry);
      if((result.groups.status||[]).length)report.success.push(`生活能量：${result.groups.status.length} 条状态记录`);
      if((result.groups.interrupts||[]).length)report.success.push(`今日节奏：${result.groups.interrupts.length} 条打断源`);
      if((result.groups.hiddenCosts||[]).length)report.success.push(`隐形成本：${result.groups.hiddenCosts.length} 条`)
    }
  }catch(e){report.errors.push('生活能量上传失败，原因是数据库写入失败')}
  try{
    (result.groups.mood||[]).forEach(item=>saveEmotionLog({id:'emo-'+genId(),date:ds,event:item.title,emotion:emotionFromText(item.rawText)||'低落',intensity:intensityFromText(item.rawText),source:'smart-capture',rawText:item.rawText,createdAt:nowISO()}));
    if(result.groups.mood?.length)report.success.push(`心情状态：${result.groups.mood.length} 条`)
  }catch(e){report.errors.push('心情上传失败，原因是字段缺失')}
  try{
    (result.groups.bills||[]).forEach(item=>{
      if(!item.amount){report.errors.push(`账单上传失败，原因是金额字段缺失：${item.title||item.rawText}`);return}
      appData.records.entries.push({id:genId(),date:ds,type:item.type,category:item.category,amount:item.amount,note:item.rawText,createdAt:nowISO()})
    });
    if(result.groups.bills?.length)report.success.push(`账单：${result.groups.bills.length} 条${result.groups.bills.some(x=>x.type==='expense')?'收支记录':'收入记录'}`)
  }catch(e){report.errors.push('账单上传失败，原因是数据库写入失败')}
  try{
    (result.groups.water||[]).forEach(item=>appData.v2.smartCapture.waterLogs.unshift({id:'water-'+genId(),date:ds,level:item.level,note:item.rawText,createdAt:nowISO()}));
    if(result.groups.water?.length)report.success.push(`喝水记录：${result.groups.water.length} 条`)
  }catch(e){report.errors.push('喝水记录上传失败，原因是本地存储失败')}
  try{
    (result.groups.tomorrowAdvice||[]).forEach(item=>appData.v2.smartCapture.tomorrowAdvice.unshift({id:'tmr-'+genId(),date:ds,advice:item.title,createdAt:nowISO(),source:'smart-capture'}));
    if(result.groups.tomorrowAdvice?.length)report.success.push(`明日安排参考：${result.groups.tomorrowAdvice.length} 条`)
  }catch(e){report.errors.push('明日安排参考上传失败，原因是目标模块不存在')}
  (result.groups.unknown||[]).forEach(item=>report.errors.push(`分类不明确，已跳过：${item.title}`));
  appData.v2.smartCapture.uploadLog.unshift({id:'log-'+genId(),createdAt:nowISO(),success:report.success.slice(),errors:report.errors.slice(),sourceText:result.sourceText});
  appData.v2.smartCapture.uploadLog=appData.v2.smartCapture.uploadLog.slice(0,80);
  if(!persist())report.errors.push('本地存储失败');
  return report
}
function formatSmartCaptureReport(report){
  if(!report)return'';
  const lines=[];
  if(report.success?.length)lines.push('已更新：',...report.success.map(x=>`- ${x}`));
  if(report.errors?.length)lines.push(report.success?.length?'上传异常：':'上传失败：',...report.errors.map(x=>`- ${x}`));
  return lines.join('\n')
}
function buildTaskPoolChoiceOptions(){
  const options=generatePlanOptions();
  return (options||[]).slice(0,3).map((option,index)=>({
    index:index+1,
    id:option.id,
    type:option.type,
    summary:option.summary,
    reason:option.reason,
    items:(option.items||[]).slice(0,3)
  }))
}
function formatTaskPoolChoiceReply(options){
  if(!options?.length)return'任务池里暂时没有足够内容可以帮你挑。你先往任务池里丢几条想做的事，我就能给你 3 个候选。';
  return ['我先从任务池里给你挑 3 个版本，你直接回复“选1 / 选2 / 选3”就行：',...options.map(option=>`${option.index}. ${option.type}：${option.items.map(item=>item.title).join('、')}。${option.summary}`)].join('\n');
}
function localCommandTitleText(text,prefixPattern){
  return String(text||'').replace(prefixPattern,'').replace(/^(一下|一下子|一下吧|吧|哦|呀|啊)/,'').replace(/[。！!]+$/,'').trim()
}
function normalizeLooseTitle(text){
  return String(text||'').replace(/\s+/g,'').replace(/[，。、“”"'·\-]/g,'').trim().toLowerCase()
}
function findPlanItemByLooseTitle(query,ds=todayStr()){
  const normalized=normalizeLooseTitle(query);
  if(!normalized)return null;
  return displayItems(ds).find(item=>{
    const title=normalizeLooseTitle(item.title||'');
    return title===normalized||title.includes(normalized)||normalized.includes(title)
  })||null
}
function setPlanItemStatusLocal(ds,id,status){
  const item=materializeItem(ds,id);if(!item)return false;
  item.status=status;
  item.completedAt=status==='done'?nowISO():null;
  if(item.sourcePoolId){
    const pool=getTaskPool().find(x=>x.id===item.sourcePoolId);
    if(pool){pool.status=status==='done'?'已完成':status==='doing'?'进行中':status==='skipped'?'待安排':'已安排到今日';pool.updatedAt=nowISO();}
  }
  if(item.sourceTaskId&&ds===todayStr()){
    const task=appData.tasks.find(x=>x.id===item.sourceTaskId);
    if(task?.type==='每日'){task.completedToday=status==='done';if(status==='done')task.lastCompletedDate=ds}
    else if(task?.type==='循环'&&status==='done')task.lastDoneDate=ds;
  }
  persist();
  return true
}
function returnPlanItemToPoolLocal(ds,id){
  const plan=getPlan(ds,true),item=materializeItem(ds,id);if(!item)return false;
  const poolId=item.sourcePoolId||('pool-'+genId());
  upsertTaskPoolItem({id:poolId,title:item.title,taskType:item.type||'临时',status:'待安排',source:'local-chat',note:'从聊天命令放回任务池',rawText:item.title});
  plan.items=plan.items.filter(x=>x.id!==id);
  persist();
  return true
}
function deferPlanItemToDateLocal(ds,id,nextDs){
  const item=materializeItem(ds,id);if(!item)return false;
  item.status='deferred';
  item.completedAt=null;
  item.deferredTo=nextDs;
  const copy=Object.assign({},item,{id:`deferred-${genId()}`,status:'todo',completedAt:null});
  upsertPlanItem(nextDs,copy);
  if(item.sourcePoolId){
    const pool=getTaskPool().find(x=>x.id===item.sourcePoolId);
    if(pool){pool.status='待安排';pool.deferredUntil=nextDs;pool.updatedAt=nowISO();}
  }
  if(item.sourceTaskId){
    const task=appData.tasks.find(x=>x.id===item.sourceTaskId);
    if(task&&task.type!=='每日'&&task.type!=='循环')task.scheduledDate=nextDs;
  }
  persist();
  return true
}
function simpleLocalCaptureEligible(result){
  if(!result||result.summary?.total!==1)return false;
  const nonEmpty=SMART_CAPTURE_GROUPS.filter(([key])=>(result.groups[key]||[]).length);
  return nonEmpty.length===1&&['completed','water','status','mood','interrupts','hiddenCosts','bills','tomorrowAdvice'].includes(nonEmpty[0][0])
}
function createLocalReminderFromText(text){
  const parsed=detectTimeFromText(text);
  const rawTitle=localCommandTitleText(text,/^提醒我/);
  const title=/喝水/.test(text)?'喝水提醒':(rawTitle||'继续当前任务');
  const item={id:'local-remind-'+genId(),title,type:'临时',status:'todo',plannedStart:parsed?.value||'',timeLabel:parsed?.label||getTimeSlotLabel(parsed?.value||''),important:false,reminderMode:'notification',alarmTime:parsed?.value||'',createdAt:nowISO(),source:'local-chat'};
  upsertPlanItem(todayStr(),item);
  persist();
  return item
}
function tryHandleLocalChatCommand(text){
  const src=String(text||'').trim();
  if(!src)return{handled:false};
  if(/^(今天还有什么事情可以做|今天还有什么能做|我还能做什么|帮我从任务池挑(?:三|3)个|从任务池给我三个选项)/.test(src)){
    const options=buildTaskPoolChoiceOptions();
    persist();
    return{handled:true,reply:formatTaskPoolChoiceReply(options)}
  }
  const planPick=src.match(/^选([123])$/);
  if(planPick){
    const options=ensurePlanOptions();
    const option=options[Number(planPick[1])-1];
    if(!option)return{handled:true,reply:'这一轮还没有对应的方案，你先说一句“今天还有什么事情可以做”，我就会重新给你 3 个版本。'};
    applyPlanOption(option.id);
    return{handled:true,reply:`已经帮你采用${option.type}，并放进今天清单了。`}
  }
  if(/^提醒我/.test(src)){
    const item=createLocalReminderFromText(src);
    render?.();renderCalendarInlinePreview?.(todayStr());if(routeState?.kind==='day')renderDaySheet();
    return{handled:true,reply:`已直接记成提醒：${item.title}${item.plannedStart?`（${item.plannedStart}）`:''}`}
  }
  const simpleCapture=analyzeSmartCaptureText(src);
  if(simpleLocalCaptureEligible(simpleCapture)){
    const report=uploadSmartCaptureResult(simpleCapture,'auto');
    delete smartCaptureDrafts[simpleCapture.id];
    render?.();renderBills?.();renderCalendarInlinePreview?.(todayStr());if(routeState?.kind==='day')renderDaySheet();
    return{handled:true,reply:formatSmartCaptureReport(report)||'已经本地记录好了。'}
  }
  if(/^(加入任务池|放进任务池)/.test(src)){
    const title=localCommandTitleText(src,/^(加入任务池|放进任务池)/)||'未命名任务';
    upsertTaskPoolItem({title,status:'待安排',taskType:'临时',source:'local-chat',rawText:src});
    persist();renderTaskPoolSection();if(routeState?.kind==='taskPool')renderTaskPoolRoute();
    return{handled:true,reply:`已放进任务池：${title}`}
  }
  if(/^(开始|继续)/.test(src)){
    const query=localCommandTitleText(src,/^(开始|继续)/);
    const target=query?findPlanItemByLooseTitle(query,todayStr()):displayItems(todayStr()).find(x=>x.status==='todo'||x.status==='skipped');
    if(target&&setPlanItemStatusLocal(todayStr(),target.id,'doing')){render?.();renderCalendarInlinePreview?.(todayStr());if(routeState?.kind==='day')renderDaySheet();return{handled:true,reply:`已开始：${target.title}`}}
    return{handled:true,reply:'我先没找到对应任务，你可以直接说任务名，或者去今日详情里点开始。'}
  }
  if(/(完成|做完|结束|打勾)/.test(src)){
    const query=localCommandTitleText(src,/^(完成|做完了?|任务结束|结束|打勾完成|打勾)/);
    const target=query?findPlanItemByLooseTitle(query,todayStr()):displayItems(todayStr()).find(x=>x.status!=='done');
    if(target&&setPlanItemStatusLocal(todayStr(),target.id,'done')){render?.();renderCalendarInlinePreview?.(todayStr());if(routeState?.kind==='day')renderDaySheet();return{handled:true,reply:`已标记完成：${target.title}`}}
    return{handled:true,reply:'我先没找到要完成的那项任务。'}
  }
  if(/^跳过/.test(src)){
    const query=localCommandTitleText(src,/^跳过/);
    const target=query?findPlanItemByLooseTitle(query,todayStr()):displayItems(todayStr()).find(x=>x.status==='todo'||x.status==='doing');
    if(target&&setPlanItemStatusLocal(todayStr(),target.id,'skipped')){render?.();renderCalendarInlinePreview?.(todayStr());if(routeState?.kind==='day')renderDaySheet();return{handled:true,reply:`已标记今日跳过：${target.title}`}}
    return{handled:true,reply:'我先没找到要跳过的那项任务。'}
  }
  if(/(放回任务池|回任务池)/.test(src)){
    const query=localCommandTitleText(src,/^(放回任务池|回任务池)/);
    const target=query?findPlanItemByLooseTitle(query,todayStr()):displayItems(todayStr()).find(x=>x.status!=='done');
    if(target&&returnPlanItemToPoolLocal(todayStr(),target.id)){render?.();renderTaskPoolSection();renderCalendarInlinePreview?.(todayStr());if(routeState?.kind==='day')renderDaySheet();if(routeState?.kind==='taskPool')renderTaskPoolRoute();return{handled:true,reply:`已放回任务池：${target.title}`}}
    return{handled:true,reply:'我先没找到要放回任务池的那项任务。'}
  }
  if(/(延期到明天|延到明天|明天继续)/.test(src)){
    const query=localCommandTitleText(src,/^(延期到明天|延到明天|明天继续)/);
    const target=query?findPlanItemByLooseTitle(query,todayStr()):displayItems(todayStr()).find(x=>x.status==='todo'||x.status==='doing');
    const next=daysLater(1);
    if(target&&deferPlanItemToDateLocal(todayStr(),target.id,next)){render?.();renderCalendarInlinePreview?.(todayStr());if(routeState?.kind==='day')renderDaySheet();return{handled:true,reply:`已延期到明天：${target.title}`}}
    return{handled:true,reply:'我先没找到要延期的那项任务。'}
  }
  return{handled:false}
}
window.tryHandleLocalChatCommand=tryHandleLocalChatCommand;
function moveSmartCaptureItem(result,index,targetKey){
  if(!result||!targetKey)return false;
  for(const[key,list]of Object.entries(result.groups||{})){
    const found=(list||[]).findIndex(item=>Number(item.previewIndex)===Number(index));
    if(found>=0){
      const[item]=list.splice(found,1);
      result.groups[targetKey].push(item);
      return true
    }
  }
  return false
}
function applySmartCaptureAction(action,id){
  const result=smartCaptureDrafts[id];if(!result)return null;
  if(action==='discard'){delete smartCaptureDrafts[id];return{type:'discard'}}
  if(action==='edit'){
    result.editMode=true;
    return{type:'update',result}
  }
  if(action==='cancel-edit'){result.editMode=false;return{type:'update',result}}
  if(action==='save-edit'){return{type:'save-edit',result}}
  if(action==='retry')return{type:'retry',result:analyzeSmartCaptureText(result.sourceText)};
  if(action==='upload'||action==='record'||action==='today'||action==='pending'){
    const mode=action==='today'?'today':(action==='record'?'record':(action==='pending'?'pending':'auto'));
    const report=uploadSmartCaptureResult(result,mode);
    delete smartCaptureDrafts[id];
    return{type:'uploaded',report}
  }
  return{type:'noop'}
}
window.analyzeSmartCaptureText=analyzeSmartCaptureText;
window.buildSmartCapturePreviewHTML=buildSmartCapturePreviewHTML;
window.applySmartCaptureAction=applySmartCaptureAction;
window.applySmartCaptureEditsFromContainer=applySmartCaptureEditsFromContainer;
window.formatSmartCaptureReport=formatSmartCaptureReport;
window.smartCaptureDrafts=smartCaptureDrafts;
const TASK_ICON_RULES=[
  [/英语|单词|听力|口语|背词/,'📘'],
  [/思维|复习|阅读|看书|学习/,'💡'],
  [/论文|科研|文献|研究|写作|PPT|作业/,'📚'],
  [/小红书|拍照|剪辑|发帖|账号|内容/,'📱'],
  [/电脑|代码|项目|主包|软件|文档|表格|材料|副业/,'💻'],
  [/文创|分装|打包|封箱|贴单|整理货|礼物/,'🎁'],
  [/行李|证件|出发|车票|机票|收拾/,'🧳'],
  [/奶茶|咖啡|喝水|热饮|休息|恢复/,'☕'],
  [/运动|跑步|锻炼|瑜伽|健身/,'🏃'],
  [/家务|整理|收纳|吸尘|拖地|洗衣|打扫/,'🧹'],
  [/沟通|聊天|咨询|开会|客户|电话/,'💬'],
  [/出门|快递|通勤|打车|跑腿|买东西/,'👜'],
  [/记账|账单|报销|收入|花销/,'💰'],
  [/愿望|基金|存钱/,'🐷'],
  [/复盘|总结|回顾/,'🔎'],
  [/睡|休息|午休|恢复/,'😴'],
  [/吃饭|午饭|晚饭|早餐/,'🍱']
];
function taskEmoji(item){
  return taskSticker(item,'v2-task-sticker v2-task-sticker--mini',item?.title||item?.type||item?.taskType||'任务')
}
function taskTone(item){
  const text=`${item?.title||''} ${item?.type||''}`;
  if(/英语|单词|听力|口语|背词|学习|复习|阅读|论文|科研|思维/.test(text))return'study';
  if(/运动|跑步|锻炼|瑜伽|健身|散步/.test(text))return'move';
  if(/小红书|剪辑|发帖|内容|拍照|账号/.test(text))return'create';
  if(/电脑|代码|项目|主包|文档|表格|材料|PPT|软件|文创|分装/.test(text))return'work';
  if(/家务|整理|收纳|吸尘|拖地|洗衣|打扫/.test(text))return'home';
  if(/吃饭|午饭|晚饭|早餐|休息|午休|恢复|奶茶|咖啡/.test(text))return'life';
  if(/出门|快递|通勤|打车|跑腿|行李|证件/.test(text))return'errand';
  if(item?.type==='循环')return'home';
  if(item?.type==='临时')return'life';
  if(item?.type==='项目')return'work';
  return'study'
}
function timeSlotEmoji(slot){
  return slot==='上午'?'🌤️':slot==='中午'?'🍱':slot==='下午'?'🧋':slot==='晚上'?'🌙':'🫧'
}
function createLifeRhythmEntry(date=todayStr()){
  return{
    date,
    bedTime:'',
    sleepStart:'',
    wakeTime:'',
    sleepQuality:'',
    stayedUpLate:'',
    wakeState:'',
    sleepNote:'',
    energyLevel:'',
    energyManual:false,
    bodyState:'',
    fatigueScore:'',
    discomfortTags:[],
    movementType:'',
    bodyNote:'',
    moodState:'',
    moodScore:'',
    moodGoodTags:[],
    moodBadTags:[],
    moodNote:'',
    rechargeTags:[],
    rechargeTop:'',
    drainTags:[],
    drainLevel:{},
    rhythm:'',
    control:'',
    completionLevel:'',
    completionPercent:'',
    rhythmFactors:[],
    stuckTask:'',
    stuckReasons:[],
    rhythmNote:'',
    interrupts:[],
    primaryInterrupt:'',
    hiddenCosts:[],
    note:'',
    createdAt:nowISO(),
    updatedAt:nowISO()
  }
}
function getLifeRhythmEntry(ds=todayStr(),create=false){
  let entry=appData.v2.lifeRhythm.days?.[ds];
  if(!entry&&create){
    entry=createLifeRhythmEntry(ds);
    appData.v2.lifeRhythm.days[ds]=entry;
  }
  return entry||null
}
function summarizeLifeRhythm(entry){
  if(!entry)return'今天还没有记录生活状态';
  const parts=[];
  if(entry.sleepStart||entry.wakeTime)parts.push(`睡眠${entry.sleepStart||'--'}→${entry.wakeTime||'--'}`);
  if(entry.energyLevel)parts.push(entry.energyLevel);
  if(entry.rhythm)parts.push(`节奏${entry.rhythm}`);
  if(entry.control)parts.push(`掌控感${entry.control}`);
  if(entry.completionLevel||entry.completionPercent)parts.push(`完成度${entry.completionPercent?`${entry.completionPercent}%`:entry.completionLevel}`);
  if(entry.rechargeTags?.length||entry.moodGoodTags?.length)parts.push(`补能：${(entry.rechargeTags?.length?entry.rechargeTags:entry.moodGoodTags).slice(0,2).join('、')}`);
  if(entry.drainTags?.length||entry.moodBadTags?.length)parts.push(`消耗：${(entry.drainTags?.length?entry.drainTags:entry.moodBadTags).slice(0,2).join('、')}`);
  if(entry.rhythmFactors?.length||entry.interrupts?.length)parts.push(`打断：${(entry.rhythmFactors?.length?entry.rhythmFactors:entry.interrupts).slice(0,2).join('、')}`);
  return parts.length?parts.join(' · '):'今天还没有记录生活状态'
}
function latestLifeRhythmSummary(limit=5){
  const days=Object.values(appData.v2.lifeRhythm.days||{}).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,limit);
  return days.map(x=>`${x.date}｜${summarizeLifeRhythm(x)}${x.note?`｜${x.note.slice(0,40)}`:''}`).join('\n')
}
function inferLowEnergy(entry){
  if(!entry)return false;
  const sleepShort=entry.sleepStart&&entry.wakeTime?((()=>{let diff=timeToMinutes(entry.wakeTime)-timeToMinutes(entry.sleepStart);if(diff<=0)diff+=24*60;return diff<6*60})()):false;
  return entry.energyLevel==='低电量'||entry.control==='低'||entry.rhythm==='很乱'||entry.rhythm==='完全被打乱'||entry.drainTags?.length>=4||entry.rhythmFactors?.length>=3||entry.sleepQuality==='差'||entry.stayedUpLate==='是'||sleepShort
}
function parseLifeRhythmText(text,date=todayStr()){
  const src=String(text||'').trim();if(!src)return null;
  const entry=createLifeRhythmEntry(date);
  const sleepMatch=src.match(/(?:入睡|睡觉|睡下|睡着)[^\d]*([0-2]?\d)(?:[:点时](\d{1,2}))?/);
  const wakeMatch=src.match(/(?:起床|醒来|睡到)[^\d]*([0-2]?\d)(?:[:点时](\d{1,2}))?/);
  const bedMatch=src.match(/(?:上床|躺下)[^\d]*([0-2]?\d)(?:[:点时](\d{1,2}))?/);
  const toClock=(m)=>m?`${String(Number(m[1]||0)).padStart(2,'0')}:${String(Number(m[2]||0)).padStart(2,'0')}`:'';
  if(bedMatch)entry.bedTime=toClock(bedMatch);
  if(sleepMatch)entry.sleepStart=toClock(sleepMatch);
  if(wakeMatch)entry.wakeTime=toClock(wakeMatch);
  if(/低电量|没电|状态很差|特别累|累死|好累|困死/.test(src))entry.energyLevel='低电量';
  else if(/高电量|状态很好|很有劲|很有精神/.test(src))entry.energyLevel='高电量';
  else if(/还行|一般|中等|普通/.test(src))entry.energyLevel='中等电量';
  if(/不舒服|头疼|生理期|胃疼|身体不适|姨妈痛/.test(src))entry.bodyState='不舒服';
  else if(/累|疲惫|困|乏力/.test(src))entry.bodyState='疲惫';
  else if(/轻松|舒服|状态好/.test(src))entry.bodyState='好';
  else if(/一般/.test(src))entry.bodyState='一般';
  if(/开心|有成就感|轻松|心情不错/.test(src))entry.moodState='开心';
  else if(/平静/.test(src))entry.moodState='平静';
  else if(/焦虑|紧张/.test(src))entry.moodState='焦虑';
  else if(/烦|烦躁/.test(src))entry.moodState='烦躁';
  else if(/低落|委屈|难受/.test(src))entry.moodState='低落';
  else if(/混乱|乱/.test(src))entry.moodState='混乱';
  const rechargeMap={睡觉:'睡觉',洗澡:'洗澡',散步:'散步',运动:'运动',奶茶:'喝奶茶',咖啡:'喝咖啡',聊天:'聊天',独处:'独处',整理:'整理房间',撸猫:'撸猫',晒太阳:'晒太阳',听歌:'听歌',吃到喜欢的东西:'吃到喜欢的东西',吃了喜欢:'吃到喜欢的东西'};
  Object.entries(rechargeMap).forEach(([k,v])=>{if(src.includes(k)&&!entry.rechargeTags.includes(v)){entry.rechargeTags.push(v);if(!entry.moodGoodTags.includes(v))entry.moodGoodTags.push(v)}});
  const drainMap={论文:'论文',PPT:'PPT',咨询:'咨询',学习:'学习',家务:'家务',外出:'外出',沟通:'沟通',临时任务:'临时任务',情绪波动:'情绪波动',跑腿:'跑腿',客户:'咨询'};
  Object.entries(drainMap).forEach(([k,v])=>{if(src.includes(k)&&!entry.drainTags.includes(v)){entry.drainTags.push(v);if(!entry.moodBadTags.includes(v))entry.moodBadTags.push(v);entry.drainLevel[v]=/很|特别|好多次|一直/.test(src)?'重':'中'}}); 
  if(/很顺|挺顺|顺利/.test(src))entry.rhythm='很顺';
  else if(/一般/.test(src))entry.rhythm='一般';
  else if(/有点卡|卡住/.test(src))entry.rhythm='有点卡';
  else if(/有点乱|乱糟糟|很乱/.test(src))entry.rhythm='很乱';
  else if(/打乱|被事情推着走|一直被打断/.test(src))entry.rhythm='完全被打乱';
  if(/掌控感高|很有掌控感/.test(src))entry.control='高';
  else if(/掌控感低|没掌控感|被事情推着走/.test(src))entry.control='低';
  else if(src)entry.control='中';
  const interruptMap={电话:'家里电话',消息:'朋友消息',咨询:'客户咨询',快递:'快递',跑腿:'跑腿',刷手机:'刷手机',不舒服:'身体不舒服',临时任务:'临时任务',外卖:'快递'};
  Object.entries(interruptMap).forEach(([k,v])=>{if(src.includes(k)&&!entry.interrupts.includes(v)){entry.interrupts.push(v);if(!entry.rhythmFactors.includes(v))entry.rhythmFactors.push(v)}});
  const hiddenCostMap={寄快递:'寄快递',拿快递:'拿快递',打车:'打车',通勤:'通勤',买东西:'买东西',办杂事:'办杂事',临时外出:'临时外出',排队:'排队',等人:'等人'};
  Object.entries(hiddenCostMap).forEach(([k,v])=>{if(src.includes(k)&&!entry.hiddenCosts.some(x=>x.title===v))entry.hiddenCosts.push({id:'hc-'+genId(),title:v,duration:/一小时|1小时/.test(src)?'1h+':/半小时|30/.test(src)?'30-60m':'<30m',money:'',disrupted:/打乱|耽误/.test(src)?'是':'否',costTypes:[/体力|累/.test(src)?'体力':/情绪|烦/.test(src)?'情绪':'时间'],note:''})});
  if(/熬夜/.test(src))entry.stayedUpLate='是';
  if(/没睡好|睡眠差|没睡够/.test(src))entry.sleepQuality='差';
  else if(/睡得还行|一般/.test(src))entry.sleepQuality='一般';
  else if(/睡得好|睡得不错|睡够了/.test(src))entry.sleepQuality='好';
  if(/清醒/.test(src))entry.wakeState='清醒';
  else if(/很困|困死/.test(src))entry.wakeState='很困';
  else if(/一般/.test(src))entry.wakeState='一般';
  if(/完成很多|完成度高|推进不错/.test(src))entry.completionLevel='高';
  else if(/完成一般|推进一般/.test(src))entry.completionLevel='中';
  else if(/没推进|完成度低/.test(src))entry.completionLevel='低';
  if(!entry.primaryInterrupt&&entry.interrupts.length)entry.primaryInterrupt=entry.interrupts[0];
  if(!entry.rechargeTop&&entry.rechargeTags.length)entry.rechargeTop=entry.rechargeTags[0];
  entry.note=src.slice(0,180);
  return entry
}
function saveLifeRhythmEntry(entry){
  if(!entry?.date)return false;
  entry.updatedAt=nowISO();
  appData.v2.lifeRhythm.days[entry.date]=Object.assign(createLifeRhythmEntry(entry.date),entry);
  persist();
  return true
}
window.parseLifeRhythmText=parseLifeRhythmText;
window.saveLifeRhythmEntry=saveLifeRhythmEntry;
window.getLifeRhythmEntry=getLifeRhythmEntry;
window.TASK_MANAGER_APP_VERSION=APP_VERSION;
function getTaskChildren(task){return task?.type==='项目'?(task.steps||[]):(task?.checklist||[])}
function hasTaskChildren(task){return getTaskChildren(task).length>0}
function taskChildProgress(task){const items=getTaskChildren(task),done=items.filter(x=>x.done).length;return{done,total:items.length}}
function syncTaskCompletionFromChildren(task){
  const items=getTaskChildren(task);if(!items.length)return;
  const allDone=items.every(x=>x.done);
  if(task.type==='每日'){task.completedToday=allDone;if(allDone)task.lastCompletedDate=todayStr()}
  else if(task.type==='循环'){if(allDone)task.lastDoneDate=todayStr()}
  else if(task.type==='临时'){task.completed=allDone;if(allDone)task.completedAt=nowISO()}
}
function renderTaskChecklistHTML(task,kind='default'){
  const items=task?.checklist||[];if(!items.length)return'';
  return `<div class="v2-task-checklist ${kind}">${items.map(item=>`<button class="v2-check-item ${item.done?'done':''}" data-action="checklist-toggle" data-task-id="${esc(task.id)}" data-item-id="${esc(item.id)}"><span class="v2-check-box">${item.done?'✓':''}</span><span class="v2-check-text">${esc(item.title)}</span></button>`).join('')}</div>`;
}
window.v2RenderChecklistHTML=renderTaskChecklistHTML;
function toggleTaskChecklist(taskId,itemId){
  const task=appData.tasks.find(x=>x.id===taskId);if(!task||!Array.isArray(task.checklist))return;
  const item=task.checklist.find(x=>x.id===itemId);if(!item)return;
  item.done=!item.done;syncTaskCompletionFromChildren(task);persist();render();renderCalendarInlinePreview?.(selectedDay||todayStr());if(routeState?.kind==='day')renderDaySheet();
}
window.v2ToggleTaskChecklist=toggleTaskChecklist;

function dateFromWeekday(label,nextWeek=false){
  const map={日:0,天:0,一:1,二:2,三:3,四:4,五:5,六:6},target=map[label];if(target===undefined)return todayStr();
  const now=new Date(),d=new Date(now.getFullYear(),now.getMonth(),now.getDate()),cur=d.getDay(),delta=((target-cur)+7)%7||7;
  d.setDate(d.getDate()+delta+(nextWeek?7:0));return dateKey(d)
}
function detectDateFromText(text){
  const now=new Date();
  if(/大后天/.test(text)){const d=new Date(now);d.setDate(d.getDate()+3);return{date:dateKey(d),scope:'single',label:'大后天'}}
  if(/后天/.test(text)){const d=new Date(now);d.setDate(d.getDate()+2);return{date:dateKey(d),scope:'single',label:'后天'}}
  if(/明天/.test(text)){const d=new Date(now);d.setDate(d.getDate()+1);return{date:dateKey(d),scope:'single',label:'明天'}}
  if(/今天|今晚|今日/.test(text))return{date:todayStr(),scope:'single',label:'今天'};
  const nextWeekMatch=text.match(/下周([一二三四五六日天])/);if(nextWeekMatch)return{date:dateFromWeekday(nextWeekMatch[1],true),scope:'single',label:nextWeekMatch[0]};
  const weekMatch=text.match(/(?:周|星期)([一二三四五六日天])/);if(weekMatch)return{date:dateFromWeekday(weekMatch[1],false),scope:'single',label:weekMatch[0]};
  if(/这周|本周|这一周/.test(text))return{date:todayStr(),scope:'range',label:'本周'};
  if(/这段时间|最近|近期/.test(text))return{date:todayStr(),scope:'range',label:'近期'};
  return{date:todayStr(),scope:'single',label:'今天'}
}
function detectTaskTypeFromText(text,fixedType){
  if(fixedType)return fixedType;
  if(/每天|每日/.test(text))return'每日';
  if(/循环任务|每周|每月|每隔|每\d+天|每[一二两三四五六七八九十]+天/.test(text))return'循环';
  if(/这段时间|最近|近期|项目|推进|主包|作品集|长期/.test(text))return'项目';
  return'临时'
}
function cleanTaskTitle(text){
  return String(text||'').replace(/^(今天|明天|后天|大后天|下周[一二三四五六日天]|周[一二三四五六日天]|星期[一二三四五六日天]|这周|本周|这段时间|最近|近期)/,'').replace(/^(我要|我得|我要去|我需要|需要|要|得|去|先|再|还要|另外|然后|顺便)+/,'').replace(/[：:，,。.；;、\s]+$/,'').trim()
}
function splitChecklistText(text){
  return String(text||'').replace(/不要忘记/g,'、').replace(/记得带/g,'、').replace(/记得/g,'、').replace(/带上/g,'、').split(/[、，,；;和及]/).map(x=>cleanTaskTitle(x)).filter(x=>x&&x.length<=24)
}
function parseChecklistHints(text){
  const repeated=[...String(text).matchAll(/(?:不要忘记|记得带|记得|带上)([^，。；、\s]+)/g)].map(x=>cleanTaskTitle(x[1]));
  if(repeated.length)return [...new Set(repeated)];
  const listMatch=String(text).match(/(?:包括|清单|主要是|主要注意|要注意|需要带|带上)(.+)/);
  return listMatch?[...new Set(splitChecklistText(listMatch[1]))]:[]
}
function splitPrimaryTasks(text){
  return String(text).replace(/[。；;]/g,'\n').split(/\n+/).flatMap(line=>line.split(/(?:另外|再加一个|再加上|还有|还要|顺便|然后|以及)/)).map(x=>cleanTaskTitle(x)).filter(Boolean)
}
function buildChecklist(items){return items.map(title=>({id:genId(),title,done:false}))}
function buildTaskFromNaturalBlock(block,type,ds,rawText){
  const title=cleanTaskTitle(block.title||block)||'未命名任务';
  const checklistItems=[...new Set((block.checklist||[]).map(cleanTaskTitle).filter(Boolean))];
  const parsedTime=detectTimeFromText(String(block.title||'')+' '+String(rawText||''));
  if(type==='项目'){
    return{id:genId(),type,title,steps:(checklistItems.length?checklistItems:[title]).map(x=>({id:genId(),title:x,duration:30,done:false})),reminderTime:'22:30',isTiming:false,startTime:null,scheduledStart:parsedTime?.value||null,scheduledEnd:null,timeLabel:parsedTime?.label||null,scheduledDate:block.scope==='single'?ds:null,alarmTime:null,rawText}
  }
  if(type==='每日'){
    return{id:genId(),type,title,frequency:'每天',subtask:checklistItems[0]||'',checklist:buildChecklist(checklistItems),completedToday:false,lastCompletedDate:null,startDate:ds,scheduledStart:parsedTime?.value||null,scheduledEnd:null,timeLabel:parsedTime?.label||null,alarmTime:null,rawText}
  }
  if(type==='循环'){
    const cycleMatch=String(rawText||'').match(/每\s*([0-9]+)\s*天|每([一二两三四五六七八九十]+)天/);
    const zhMap={一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};
    const cycleDays=cycleMatch?(Number(cycleMatch[1])||zhMap[cycleMatch[2]]||2):2;
    const base=new Date(ds+'T12:00:00');base.setDate(base.getDate()-cycleDays);
    return{id:genId(),type,title,cycleDays,lastDoneDate:dateKey(base),checklist:buildChecklist(checklistItems),scheduledStart:parsedTime?.value||null,scheduledEnd:null,timeLabel:parsedTime?.label||null,startDate:ds,alarmTime:null,rawText}
  }
  return{id:genId(),type:'临时',title,scheduledDate:ds,deadline:null,deadlineConfirmed:false,confirmInDays:3,confirmDate:daysLater(3),hiddenToday:false,priority:2,duration:null,completed:false,completedAt:null,checklist:buildChecklist(checklistItems),scheduledStart:parsedTime?.value||null,scheduledEnd:null,timeLabel:parsedTime?.label||null,alarmTime:parsedTime?.value||null,important:!!parsedTime,rawText}
}
function parseNaturalTaskInput(text,fixedType){
  const source=String(text||'').trim();if(!source)return null;
  const dateInfo=detectDateFromText(source),type=detectTaskTypeFromText(source,fixedType),baseDate=dateInfo.date;
  const tasks=[],usedTitles=new Set();
  const repeatedChecklist=parseChecklistHints(source);
  let mainTitle='';
  const mainMatch=source.match(/(?:今天|明天|后天|大后天|下周[一二三四五六日天]|周[一二三四五六日天]|星期[一二三四五六日天])?(?:要|得|需要)?([^，。；\n]+?)(?:主要|记得|不要忘记|包括|清单|需要带|带上)/);
  if(mainMatch)mainTitle=cleanTaskTitle(mainMatch[1]);
  if(mainTitle){
    tasks.push(buildTaskFromNaturalBlock({title:mainTitle,checklist:repeatedChecklist,scope:dateInfo.scope},type,baseDate,source));
    usedTitles.add(mainTitle);
  }
  splitPrimaryTasks(source).forEach(title=>{
    if(!title||usedTitles.has(title))return;
    if(repeatedChecklist.length&&title.length<=8&&/充电|耳机|证件|衣|裤|鞋|牙刷|洗漱|药|电脑/.test(title))return;
    tasks.push(buildTaskFromNaturalBlock({title,checklist:[],scope:dateInfo.scope},type,baseDate,source));
    usedTitles.add(title);
  });
  if(!tasks.length)tasks.push(buildTaskFromNaturalBlock({title:source,checklist:repeatedChecklist,scope:dateInfo.scope},type,baseDate,source));
  return{date:baseDate,type,scope:dateInfo.scope,tasks}
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
  if(task.type==='每日'){const start=task.startDate||todayStr();return ds>=start&&recurrenceOn(task,ds)}
  if(task.type==='项目')return task.scheduledDate?task.scheduledDate===ds:ds===todayStr();
  if(task.type==='临时'){
    if(task.scheduledDate)return task.scheduledDate===ds;
    return ds===todayStr()&&!task.hiddenToday;
  }
  if(task.type==='循环'){const start=task.startDate||todayStr();return ds>=start&&ds>=getCyclicNext(task)}
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
window.upsertPlanItem=upsertPlanItem;
window.todayStr=todayStr;

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
  const legacyRender=render;
  saveCache=persist;
  loadCache=()=>!!parseJSON(localStorage.getItem(STORAGE_KEY),null);
  syncFromRemote=async()=>false;
  _putRemote=async()=>false;
  toJSONBin=function(){syncTodaySnapshot();persist();refreshPlannerStats();schedulePendingReminders();};
  checkDailyReset=function(){const ds=todayStr();if(appData.lastVisitDate!==ds){appData.tasks.forEach(t=>{if(t.type==='每日')t.completedToday=false;if(t.type==='临时')t.hiddenToday=false});appData.lastVisitDate=ds;syncTodaySnapshot();persist();render()}};
  getTasksForDate=function(date){return displayItems(dateKey(date)).map(x=>({id:x.id,color:COLOR[x.type]||COLOR.记录,title:x.title,timeLabel:x.timeLabel,status:x.status,important:x.important}))};
  getWeekTasksForDay=function(ds){return getTasksForDate(new Date(ds+'T12:00:00'))};
  showDayTasks=function(value){const ds=dateKey(value);calSelectedDate=new Date(ds+'T12:00:00');selectedDay=ds;renderCalendar();renderCalendarInlinePreview(ds)};
  renderCalendar=function(){legacyRenderCalendar();renderCalendarViewBanner();decorateCalendarCells()};
  render=function(){legacyRender();renderModeUI();renderQuickAddDashboard();renderHomeOverviewBoard();renderTaskPoolSection();renderLifeRhythmSection();if(routeState?.kind==='taskPool')renderTaskPoolRoute();if(routeState?.kind==='rhythm')renderLifeRhythmRoute();if(routeState?.kind==='food')renderFoodRoute();if(routeState?.kind==='lateNight')renderLateNightRoute();if(routeState?.kind==='planner')renderPlanner();renderCalendarViewBanner();renderFinanceLink?.()};
  exportData=exportV2;
  importData=importV2;
  const legacySaveBill=saveBill;
  saveBill=function(){const before=new Set(appData.records.entries.map(x=>x.id));legacySaveBill();appData.records.entries.filter(x=>!before.has(x.id)).forEach(linkFinanceEntry);persist();renderFinanceLink()};
}
function ensureQuickAddDashboard(){
  const quick=document.querySelector('.quick-add');
  if(!quick)return null;
  let board=document.getElementById('v2QuickAddBoard');
  if(board)return board;
  board=document.createElement('div');
  board.id='v2QuickAddBoard';
  board.className='v2-quick-add-board';
  quick.insertBefore(board,quick.firstChild);
  return board;
}
function renderQuickAddDashboard(){
  const board=ensureQuickAddDashboard();
  if(!board)return;
  const stats=todayDashboardStats();
  const pool=getTaskPool();
  const target=document.getElementById('quickTarget')?.value||'today';
  const targetText=target==='pool'?'先收进任务池，今天不硬塞满':target==='legacy'?'继续兼容原任务列表录入':'直接进今日清单，马上就能做';
  const targetCount=target==='pool'?pool.filter(item=>item.status!=='已完成'&&item.status!=='放弃').length:stats.todoCount;
  const tomorrow=(appData.v2.smartCapture.tomorrowAdvice||[]).length;
  board.innerHTML=`<div class="v2-quick-add-main ${isHomeMode()?'home':'normal'}"><div class="v2-quick-add-copy"><span class="v2-quick-add-eyebrow">${modeEmoji()} ${modeLabel()} · 快速入口</span><strong>${isHomeMode()?'今天先记下来，晚点再决定压不压进今天':'想到什么先放进来，再交给今天或任务池'}</strong><small>${targetText}</small></div><div class="v2-quick-add-pills"><span class="v2-quick-pill"><b>${stats.percent}%</b><small>今日进度</small></span><span class="v2-quick-pill"><b>${targetCount}</b><small>${target==='pool'?'池中待排':'待推进'}</small></span><span class="v2-quick-pill"><b>${tomorrow}</b><small>明日提示</small></span></div></div>`;
}
function routeMetaCopy(kind){
  if(kind==='planner')return{chip:`${modeEmoji()} ${modeLabel()}`,desc:isHomeMode()?'先用保底视角排今天，再决定要不要多做。':'今天的安排可以先挑方案，不用一上来就排满。'}
  if(kind==='taskPool')return{chip:'🗂 Task Pool',desc:'想做但不急着今天做的事，先放这里慢慢调度。'}
  if(kind==='rhythm')return{chip:'🫧 Rhythm',desc:isHomeMode()?'先看身体和节奏，再安排任务密度。':'把状态记清楚，后面的 AI 才会更会安排。'}
  if(kind==='day')return{chip:selectedDay===todayStr()?`${modeEmoji()} Today`:selectedDay,desc:selectedDay===todayStr()?'今天的安排、完成和记录都收在这里。':'这一天的任务和记录会一起保留下来。'}
  return{chip:'📍 Page',desc:'这里是当前模块的展开页。'}
}
function updateRouteHead(kind=routeState?.kind){
  const meta=routeMetaCopy(kind);
  const chip=document.getElementById('v2RouteMetaChip');
  const desc=document.getElementById('v2RouteMetaDesc');
  if(chip)chip.textContent=meta.chip;
  if(desc)desc.textContent=meta.desc;
}
function enhanceRouteChrome(){
  const head=document.querySelector('#v2RoutePage .v2-route-head');
  const title=document.getElementById('v2RouteTitle');
  if(!head||!title||document.getElementById('v2RouteMetaChip'))return;
  const wrap=document.createElement('div');
  wrap.className='v2-route-titlewrap';
  const meta=document.createElement('div');
  meta.className='v2-route-meta';
  meta.innerHTML='<span class="v2-route-meta-chip" id="v2RouteMetaChip"></span><small id="v2RouteMetaDesc"></small>';
  title.replaceWith(wrap);
  wrap.appendChild(title);
  wrap.appendChild(meta);
}
function ensureCalendarViewBanner(){
  const card=document.getElementById('calendarSection');
  const anchor=document.getElementById('weekdayRow');
  if(!card||!anchor)return null;
  let banner=document.getElementById('v2CalendarBanner');
  if(banner)return banner;
  banner=document.createElement('div');
  banner.id='v2CalendarBanner';
  banner.className='v2-calendar-banner';
  card.insertBefore(banner,anchor);
  return banner;
}
function renderCalendarViewBanner(){
  const banner=ensureCalendarViewBanner();
  if(!banner)return;
  const stats=todayDashboardStats();
  const selected=selectedDay||todayStr();
  const meta=buildCalendarDayMeta(selected);
  const view=calTimeSlotView?'slot':(calIsYear?'year':(calIsMonth?'month':'week'));
  const viewMap={
    week:['周视图','这周先看轻重缓急，适合扫一眼今天和前后几天的节奏。'],
    month:['月视图','适合看连续性、密度和哪几天已经被事情塞满。'],
    year:['年视图','用来回看全年分布，找节奏和空档会很方便。'],
    slot:['时段视图',isHomeMode()?'居家模式下先看身体和生活任务，再决定要不要加深度任务。':'把今天按时段展开，什么时候做什么一眼就清楚。']
  };
  const [label,desc]=viewMap[view];
  banner.className=`v2-calendar-banner ${view} ${isHomeMode()?'home':'normal'}`;
  banner.innerHTML=`<div class="v2-calendar-banner-main"><div class="v2-calendar-banner-copy"><span class="v2-calendar-banner-eyebrow">${label}${selected===todayStr()?' · 今天':' · '+selected}</span><strong>${isHomeMode()&&view!=='year'?'今天先保留余地，不把自己排太满':'把安排、完成和状态放在同一块看板里'}</strong><small>${desc}</small></div><div class="v2-calendar-banner-stats"><span><b>${stats.doneCount}</b><small>完成</small></span><span><b>${meta.items.length}</b><small>${selected===todayStr()?'今天任务':'当日任务'}</small></span><span><b>${meta.moods+meta.notes+meta.inspirations}</b><small>记录</small></span></div></div>`;
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
function buildCalendarDayMeta(ds){
  return{
    items:displayItems(ds),
    holiday:getHolidayLabel(ds),
    birthdays:getBirthdayEntries(ds),
    moods:getEmotionEntries(ds).length,
    notes:getDayNotes(ds).length,
    inspirations:getDayInspirationEntries(ds).length
  }
}
function renderCalendarDayBadges(meta,size='normal'){
  const parts=[];
  if(meta.holiday)parts.push(`<span class="v2-day-badge holiday ${size}" title="${esc(meta.holiday)}">节</span>`);
  if(meta.birthdays.length)parts.push(`<span class="v2-day-badge birthday ${size}" title="${esc(meta.birthdays.map(x=>x.name).join('、'))}">🎂</span>`);
  if(meta.moods)parts.push(`<span class="v2-day-badge mood ${size}" title="有 ${meta.moods} 条情绪记录">💭</span>`);
  if(meta.notes)parts.push(`<span class="v2-day-badge note ${size}" title="有 ${meta.notes} 条随记">📝</span>`);
  if(meta.inspirations)parts.push(`<span class="v2-day-badge inspire ${size}" title="有 ${meta.inspirations} 条灵感">💡</span>`);
  if(meta.items.length){
    const dots=meta.items.slice(0,3).map(item=>`<i class="v2-day-task-dot" style="background:${COLOR[item.type]||COLOR.记录}"></i>`).join('');
    parts.push(`<span class="v2-day-badge taskload ${size}" title="${meta.items.length} 项任务">${dots}<b>${meta.items.length}</b></span>`);
  }
  return parts.join('')
}
function briefTaskTitle(title,maxLen=4){
  const plain=String(title||'').replace(/[，,、。；;：:]/g,'').trim();
  return plain.length>maxLen?`${plain.slice(0,maxLen)}…`:plain
}
function renderCalendarTaskSummary(meta,size='normal'){
  if(!meta.items.length)return '<div class="v2-day-empty">·</div>';
  const items=meta.items.slice(0,size==='small'?2:3);
  return items.map(item=>{
    const short=briefTaskTitle(item.title,size==='small'?4:6);
    const tone=taskTone(item);
    return `<div class="v2-day-summary-chip ${size} ${tone}" title="${esc(item.title)}"><span class="v2-day-summary-chip-icon">${taskSticker(item,'v2-task-sticker v2-task-sticker--mini')}</span><span class="v2-day-summary-chip-dot" style="background:${COLOR[item.type]||COLOR.记录}"></span><span class="v2-day-summary-chip-text">${esc(short)}</span></div>`
  }).join('')+(meta.items.length>items.length?`<div class="v2-day-summary-more">+${meta.items.length-items.length}</div>`:'');
}
function selectCalendarDay(ds){calSelectedDate=new Date(ds+'T12:00:00');selectedDay=ds;renderCalendar();renderCalendarInlinePreview(ds)}
showDayTasks=function(value){selectCalendarDay(dateKey(value))}
renderCalendar=function(){
  const grid=document.getElementById('calGrid'),title=document.getElementById('calTitle'),wdRow=document.getElementById('weekdayRow'),td=document.getElementById('calDayTasks');
  const today=todayStr(),weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  td.classList.remove('show');
  if(calTimeSlotView){
    const days=getWeekDays(calWeekOffset);
    title.innerHTML=iconImg('提醒',18)+`${days[0].getFullYear()}.${days[0].getMonth()+1} 时段`;
    let activeDs=calSelectedDate?dateKey(calSelectedDate):selectedDay||today;
    if(!days.some(d=>dateKey(d)===activeDs))activeDs=days.some(d=>dateKey(d)===today)?today:dateKey(days[0]);
    wdRow.className='weekday-row v2-slot-daytabs';
    wdRow.innerHTML=days.map((d,i)=>{const ds=dateKey(d);return `<button class="wd ${ds===today?'today':''} ${ds===activeDs?'active':''}" onclick="selectCalendarDay('${ds}')">${weekdays[i]}<span class="dt">${d.getMonth()+1}.${d.getDate()}</span></button>`}).join('');
    const meta=buildCalendarDayMeta(activeDs);
    const dayItems=[...meta.items].map((item,index)=>Object.assign({},item,{_start:inferItemStart(item,index)})).sort((a,b)=>(a._start||'99:99').localeCompare(b._start||'99:99'));
    const startHour=6,endHour=24,rowHeight=24,totalRows=endHour-startHour;
    let timeline=`<div class="v2-day-timeline"><div class="v2-day-timeline-axis">`;
    for(let hour=startHour;hour<endHour;hour++)timeline+=`<div class="v2-day-hour">${String(hour).padStart(2,'0')}:00</div>`;
    timeline+=`</div><div class="v2-day-timeline-main"><div class="v2-day-gridlines">`;
    for(let i=0;i<totalRows;i++)timeline+=`<div class="v2-day-gridline"></div>`;
    timeline+=`</div><button class="v2-day-timeline-surface ${activeDs===today?'today':''}" onclick="selectCalendarDay('${activeDs}')">`;
    if(dayItems.length){
      timeline+=dayItems.map(item=>{
        const startText=item._start||'09:00';
        const endText=item.plannedEnd||formatHHMM(Math.min(timeToMinutes(startText)+60,24*60));
        const startMin=Math.max(timeToMinutes(startText),startHour*60),endMin=Math.max(timeToMinutes(endText),startMin+30);
        const top=((startMin-startHour*60)/60)*rowHeight;
        const height=Math.max(((endMin-startMin)/60)*rowHeight,22);
        const metaLine=`${esc(startText)} - ${esc(endText)}`;
        return `<div class="v2-day-block ${taskTone(item)}" style="top:${top}px;height:${height}px;border-left-color:${COLOR[item.type]||COLOR.记录};background:${COLOR[item.type]||COLOR.记录}18"><div class="v2-day-block-title">${taskSticker(item,'v2-task-sticker v2-task-sticker--mini')}<span class="v2-day-block-text">${esc(item.title)}</span></div>${height>=42?`<div class="v2-day-block-meta">${metaLine}</div>`:''}</div>`
      }).join('');
    }else{
      timeline+=`<div class="v2-day-block-empty">这一天还没有定时任务，点开后可以添加</div>`;
    }
    timeline+=`</button></div></div>`;
    const sideInfo=`<div class="v2-day-sideinfo">${meta.holiday?`<span>🎐 ${esc(meta.holiday)}</span>`:''}${meta.birthdays.length?`<span>🎂 ${meta.birthdays.map(x=>esc(x.name)).join('、')}</span>`:''}${meta.moods?`<span>💭 ${meta.moods} 条情绪</span>`:''}${meta.notes?`<span>📝 ${meta.notes} 条随记</span>`:''}${meta.inspirations?`<span>💡 ${meta.inspirations} 条灵感</span>`:''}</div>`;
    let html=`<div class="v2-slot-daywrap"><div class="v2-slot-dayhead"><strong>${activeDs}</strong><span>点击上方日期切换，点击下方时间轴展开当天详情</span></div>${sideInfo}${timeline}</div>`;
    grid.className='v2-slot-grid-wrap';grid.innerHTML=html;return
  }
  if(calIsYear){
    const year=new Date().getFullYear()+calWeekOffset;
    title.innerHTML=iconImg('提醒',18)+`${year}年`;
    wdRow.className='weekday-row';
    wdRow.innerHTML='';
    grid.className='v2-year-grid';
    let html='';
    for(let m=0;m<12;m++){
      const first=new Date(year,m,1),last=new Date(year,m+1,0),startDay=(first.getDay()+6)%7;
      html+=`<div class="v2-year-card"><div class="v2-year-title">${m+1}月</div><div class="v2-year-week">${weekdays.map(n=>`<span>${n}</span>`).join('')}</div><div class="v2-year-days">`;
      for(let i=0;i<startDay;i++)html+='<span></span>';
      for(let day=1;day<=last.getDate();day++){
        const ds=`${year}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,meta=buildCalendarDayMeta(ds);
        html+=`<button class="v2-year-day ${ds===today?'today':''} ${meta.items.length||meta.holiday||meta.birthdays.length||meta.notes||meta.moods||meta.inspirations?'active':''}" onclick="selectCalendarDay('${ds}')"><span class="v2-year-day-num">${day}</span><span class="v2-year-icons">${renderCalendarDayBadges(meta,'small')}</span>${meta.items.length?`<span class="v2-year-dot" style="background:${COLOR[meta.items[0].type]||COLOR.记录}"></span>`:''}</button>`;
      }
      html+='</div></div>';
    }
    grid.innerHTML=html;return
  }
  if(calIsMonth){
    const base=new Date();base.setDate(1);base.setMonth(base.getMonth()+calWeekOffset);
    title.innerHTML=iconImg('提醒',18)+`${base.getFullYear()}年${base.getMonth()+1}月`;
    wdRow.className='weekday-row v2-month-weekdays';
    wdRow.innerHTML=weekdays.map(n=>`<div class="wd">${n}</div>`).join('');
    grid.className='v2-month-grid';
    const first=new Date(base.getFullYear(),base.getMonth(),1),last=new Date(base.getFullYear(),base.getMonth()+1,0),startDay=(first.getDay()+6)%7;
    let html='';
    for(let i=0;i<startDay;i++)html+='<div class="v2-month-day ghost"></div>';
    for(let day=1;day<=last.getDate();day++){
      const ds=`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,meta=buildCalendarDayMeta(ds);
      html+=`<button class="v2-month-day ${ds===today?'today':''} ${calSelectedDate&&dateKey(calSelectedDate)===ds?'selected':''}" onclick="selectCalendarDay('${ds}')"><div class="v2-month-top"><span class="v2-month-num">${day}</span><span class="v2-month-icons">${renderCalendarDayBadges(meta,'small')}</span></div><div class="v2-month-body">${renderCalendarTaskSummary(meta,'small')}</div></button>`;
    }
    grid.innerHTML=html;return
  }
  const days=getWeekDays(calWeekOffset),m=days[0];
  title.innerHTML=iconImg('提醒',18)+`${m.getFullYear()}.${m.getMonth()+1}`;
  wdRow.className='weekday-row v2-weekdays';
  wdRow.innerHTML=days.map((d,i)=>{const ds=dateKey(d);return `<button class="wd ${ds===today?'v2-strong-day':''}" onclick="selectCalendarDay('${ds}')">${weekdays[i]}<span class="dt">${d.getMonth()+1}.${d.getDate()}</span></button>`}).join('');
  grid.className='v2-week-grid';
  grid.innerHTML=days.map(d=>{const ds=dateKey(d),meta=buildCalendarDayMeta(ds);return `<button class="v2-week-day ${ds===today?'today':''} ${calSelectedDate&&dateKey(calSelectedDate)===ds?'selected':''}" onclick="selectCalendarDay('${ds}')"><div class="v2-week-top"><span class="v2-week-icons">${renderCalendarDayBadges(meta,'normal')}</span></div><div class="v2-week-body">${renderCalendarTaskSummary(meta,'small')}</div></button>`}).join('');
}
window.selectCalendarDay=selectCalendarDay;

function injectShell(){
  const app=document.querySelector('.app');
  const parking=document.createElement('div');parking.id='v2Parking';parking.hidden=true;document.body.appendChild(parking);
  const planner=document.createElement('main');planner.id='v2Planner';planner.className='v2-module';parking.appendChild(planner);
  const route=document.createElement('main');route.id='v2RoutePage';route.className='v2-route-page';route.innerHTML='<header class="v2-route-head"><button class="v2-route-back" id="v2RouteBack">‹</button><span class="v2-route-icon" id="v2RouteIcon"></span><h1 class="v2-route-title" id="v2RouteTitle"></h1></header><div id="v2RouteBody"></div><nav class="v2-route-bottom-nav" id="v2RouteBottomNav"></nav>';app.after(route);
  const banner=document.createElement('div');banner.id='v2ImportBanner';banner.className='v2-import-banner v2-hidden';banner.innerHTML='<span>还没有导入原版数据，可在设置里导入 JSON 到 V2。</span><button class="v2-secondary" id="v2ImportBtn">导入 JSON</button><input id="v2ImportInput" type="file" accept=".json" hidden>';parking.appendChild(banner);
  document.body.classList.add('v2-ready');
  ensureHomeMascotChrome();
  buildHomeLaunchers();
  buildQuickCaptureUI();
  enhanceAssistantWorkbench();
  document.getElementById('v2RouteBack').addEventListener('click',requestCloseRoute);
  window.addEventListener('popstate',()=>{if(routeState)closeRouteInternal()});
  document.getElementById('v2ImportBtn').addEventListener('click',()=>document.getElementById('v2ImportInput').click());
  document.getElementById('v2ImportInput').addEventListener('change',importV2);
  const settingsActions=document.querySelector('#settingsPopup .form-actions');if(settingsActions){const tools=document.createElement('div');tools.className='v2-tools-stack';tools.style.marginTop='10px';tools.innerHTML=`<div class="v2-row"><button class="v2-secondary" id="v2BackupBtn">导出 V2 完整备份</button><button class="v2-secondary" id="v2ExactAlarmBtn">授权重要闹钟</button></div><div class="v2-row" style="margin-top:8px"><span class="v2-chip active" id="v2VersionChip">版本 ${versionLabel()}</span><button class="v2-secondary" id="v2CheckUpdateBtn">检查更新</button></div><div class="v2-row" style="margin-top:8px"><button class="v2-secondary" id="v2ImportJsonBtn">导入原版 JSON</button></div><div class="v2-panel" id="v2CloudPanel" style="margin-top:10px"><h3>☁ 轻量云端备份</h3><p class="hint">适合你自己一个人用：把完整数据备份到云端，需要填写自己的 JSONBin Bin ID 和 API Key。</p><div class="v2-fields"><label>Bin ID<input id="v2CloudBinId" placeholder="粘贴你的 Bin ID"></label><label>API Key<input id="v2CloudApiKey" placeholder="输入 X-Master-Key" type="password"></label><div class="v2-row" style="flex-wrap:wrap"><button class="v2-secondary" id="v2CloudUpload">上传云端</button><button class="v2-secondary" id="v2CloudRestore">恢复云端</button><button class="v2-secondary" id="v2CloudUploadCompress">上传后压缩本地</button><button class="v2-secondary" id="v2CloudCompress">仅压缩本地旧记录</button></div><div id="v2CloudStatus" class="hint"></div></div></div>`;settingsActions.parentElement.appendChild(tools);document.getElementById('v2BackupBtn').addEventListener('click',exportV2);document.getElementById('v2ExactAlarmBtn').addEventListener('click',requestExactAlarmPermission);document.getElementById('v2CheckUpdateBtn').addEventListener('click',()=>checkForAppUpdates(false));document.getElementById('v2ImportJsonBtn').addEventListener('click',()=>document.getElementById('v2ImportInput').click());document.getElementById('v2CloudUpload').addEventListener('click',()=>uploadCloudBackup({compressAfter:false}));document.getElementById('v2CloudRestore').addEventListener('click',restoreCloudBackup);document.getElementById('v2CloudUploadCompress').addEventListener('click',()=>uploadCloudBackup({compressAfter:true}));document.getElementById('v2CloudCompress').addEventListener('click',()=>{const result=compressLocalData();render();renderPlanner();renderReviews?.();updateCloudStatus(`已压缩：归档 ${result.archivedDays} 天计划，清理 ${result.removedOcrNotes} 条旧 OCR 记录`)});syncCloudForm();updateVersionChip()}
  buildPlanner();injectRecordsTools();
  installConversationCarryoverUI();
  renderModeUI();
  enhanceRouteChrome();
  document.getElementById('quickTarget')?.addEventListener('change',renderQuickAddDashboard);
}

function ensureHomeMascotChrome(){
  const app=document.querySelector('.app');
  const status=document.getElementById('statusBar');
  if(app&&status&&!document.getElementById('v2HomeHero')){
    const hero=document.createElement('section');
    hero.id='v2HomeHero';
    hero.className='v2-home-hero';
    hero.innerHTML=`<div class="v2-home-hero-main"><span class="v2-home-hero-avatar" aria-hidden="true"></span><div class="v2-home-hero-copy"><strong>今天也要元气满满呀～</strong><span>可爱治愈 · 清晰高效</span></div><span class="v2-home-hero-badge">今日</span></div><div class="v2-home-hero-actions"><button type="button" class="v2-home-hero-ghost">🔔</button><button type="button" class="v2-home-hero-ghost">⚙️</button></div>`;
    app.insertBefore(hero,status);
    const ghostBtns=hero.querySelectorAll('.v2-home-hero-ghost');
    ghostBtns[0]?.addEventListener('click',()=>openPlannerPage());
    ghostBtns[1]?.addEventListener('click',()=>document.getElementById('settingsPopup')?.classList.add('show'));
  }
  const calendar=document.getElementById('calendarSection');
  if(calendar&&!document.getElementById('v2WeekNote')){
    const note=document.createElement('div');
    note.id='v2WeekNote';
    note.className='v2-week-note';
    note.innerHTML=`<div class="v2-week-note-copy"><strong>本周小记：</strong><span>坚持是给未来最好的礼物呀～</span></div><span class="v2-week-note-cat" aria-hidden="true"></span>`;
    calendar.appendChild(note);
  }
}
function renderModeUI(){
  const hero=document.getElementById('v2HomeHero'),status=document.getElementById('statusBar');
  document.body.classList.toggle('v2-mode-home',currentMode()==='home');
  document.body.classList.toggle('v2-mode-normal',currentMode()!=='home');
  if(hero&&!document.getElementById('v2ModeSwitch')){
    const strip=document.createElement('div');
    strip.id='v2ModeSwitch';
    strip.className='v2-mode-switch';
    strip.innerHTML='<button class="v2-mode-btn" data-mode="normal">🌤 正常</button><button class="v2-mode-btn" data-mode="home">🏠 居家</button><span class="v2-mode-tip" id="v2ModeTip"></span>';
    hero.after(strip);
    strip.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>setAppMode(btn.dataset.mode)));
  }
  const current=currentMode();
  document.querySelectorAll('#v2ModeSwitch [data-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.mode===current));
  const tip=document.getElementById('v2ModeTip');
  if(tip)tip.textContent=current==='home'?'先喝水、复位、低启动':'可以推进主线任务';
  if(hero){
    const copy=hero.querySelector('.v2-home-hero-copy strong'),sub=hero.querySelector('.v2-home-hero-copy span'),badge=hero.querySelector('.v2-home-hero-badge');
    if(copy)copy.textContent=current==='home'?'先把人照顾好，再做任务':'今天也要元气满满呀～';
    if(sub)sub.textContent=current==='home'?'少安排一点 · 先身体重启和生活复位':'可爱治愈 · 清晰高效';
    if(badge)badge.textContent=current==='home'?'居家中':'今日';
  }
  if(status){
    let chip=document.getElementById('v2StatusModeChip');
    if(!chip){chip=document.createElement('button');chip.id='v2StatusModeChip';chip.className='v2-status-mode-chip';chip.type='button';chip.addEventListener('click',()=>setAppMode(currentMode()==='home'?'normal':'home'));status.prepend(chip)}
    chip.textContent=`${modeEmoji(current)} ${modeLabel(current)}`;
    chip.classList.toggle('home',current==='home');
  }
}
function installConversationCarryoverUI(){
  const toolbar=document.querySelector('.chat-toolbar');
  if(toolbar&&!document.getElementById('v2ChatCarryBtn')){
    const carry=document.createElement('button');
    carry.id='v2ChatCarryBtn';
    carry.textContent='下一轮';
    carry.addEventListener('click',()=>{if(confirm('开启下一轮对话？我会保留当前模式、最近摘要和关键偏好。'))startNextChatRound()});
    const digest=document.createElement('button');
    digest.id='v2ChatDigestBtn';
    digest.textContent='会话摘要';
    digest.addEventListener('click',()=>{const summary=buildConversationCarrySummary();const text=document.getElementById('summaryText');if(text)text.textContent=summary;document.getElementById('summaryPopup')?.classList.add('show')});
    toolbar.prepend(digest);
    toolbar.prepend(carry);
  }
}
function seedHomeModeRecovery(){
  const today=todayStr(),todayItems=displayItems(today),waterLogged=(appData.v2.smartCapture.waterLogs||[]).some(x=>x.date===today);
  if(!waterLogged&&!todayItems.some(x=>/喝水/.test(x.title||'')))upsertPlanItem(today,{id:`home-water-${today}`,title:'先喝一杯水',type:'记录',status:'todo',plannedStart:'',important:false,reminderMode:'notification',createdAt:nowISO(),source:'home-mode'});
  if(!todayItems.some(x=>/洗脸|换衣|开窗|站起来/.test(x.title||'')))upsertPlanItem(today,{id:`home-reset-${today}`,title:'站起来一下，洗脸或开窗',type:'记录',status:'todo',plannedStart:'',important:false,reminderMode:'notification',createdAt:nowISO(),source:'home-mode'});
  try{if('Notification'in window&&Notification.permission==='granted')new Notification('任务管家',{body:'先喝几口水，再决定下一步。'});}catch(e){}
}

const HOME_ROUTES={
  taskPoolSection:['任务池','清单'],
  dailySection:['每日任务','学习'],projectSection:['项目推进','项目'],cyclicSection:['循环琐事','循环'],tempSection:['临时任务','临时'],
  rhythmSection:['生活能量与节奏','思考'],
  foodSection:['饮食波动记录','健康'],
  lateNightSection:['熬夜节点记录','健康'],
  birthdaySection:['生日提醒','庆祝'],healthSection:['健康闹钟','健康'],billSection:['账单','记账'],extraSection:['额外完成','完成'],
  reviewSection:['AI复盘','思考'],badgeSection:['成就勋章','成就'],wishSection:['愿望基金','收入']
};
let routeState=null,homeScroll=0;
function ensureLifeRhythmSection(){
  if(document.getElementById('rhythmSection'))return;
  const section=document.createElement('div');
  section.className='section rhythm-section';
  section.id='rhythmSection';
  section.innerHTML=`<div class="section-title"><span class="caticon"></span>生活能量与节奏</div><div id="rhythmList"></div>`;
  const inspire=document.getElementById('inspireSection')||document.getElementById('notesSection');
  inspire?.parentNode?.insertBefore(section,inspire);
  const icon=section.querySelector('.caticon');
  if(icon)icon.innerHTML='🔋';
}
function ensureFoodSection(){
  if(document.getElementById('foodSection'))return;
  const section=document.createElement('div');
  section.className='section food-section';
  section.id='foodSection';
  section.innerHTML=`<div class="section-title"><span class="caticon"></span>饮食波动记录</div><div id="foodLogList"></div>`;
  const target=document.getElementById('inspireSection')||document.getElementById('notesSection');
  target?.parentNode?.insertBefore(section,target);
  const icon=section.querySelector('.caticon');
  if(icon)icon.innerHTML='🍽️';
}
function ensureLateNightSection(){
  if(document.getElementById('lateNightSection'))return;
  const section=document.createElement('div');
  section.className='section late-night-section';
  section.id='lateNightSection';
  section.innerHTML=`<div class="section-title"><span class="caticon"></span>熬夜节点记录</div><div id="lateNightLogList"></div>`;
  const target=document.getElementById('inspireSection')||document.getElementById('notesSection');
  target?.parentNode?.insertBefore(section,target);
  const icon=section.querySelector('.caticon');
  if(icon)icon.innerHTML='🌙';
}
function ensureTaskPoolSection(){
  if(document.getElementById('taskPoolSection'))return;
  const section=document.createElement('div');
  section.className='section task-pool-section';
  section.id='taskPoolSection';
  section.innerHTML=`<div class="section-title"><span class="caticon"></span>任务池</div><div id="taskPoolList"></div>`;
  const target=document.getElementById('rhythmSection')||document.getElementById('inspireSection')||document.getElementById('notesSection');
  target?.parentNode?.insertBefore(section,target);
  const icon=section.querySelector('.caticon');
  if(icon)icon.innerHTML='🗂️';
}
function ensureHomeOverviewSection(){
  let board=document.getElementById('v2OverviewBoard');
  if(board)return board;
  board=document.createElement('section');
  board.id='v2OverviewBoard';
  board.className='v2-overview-board';
  const launchers=document.getElementById('v2Launchers');
  if(launchers)launchers.after(board);
  else document.querySelector('.quick-add')?.after(board);
  return board;
}
function buildHomeLaunchers(){
  ensureTaskPoolSection();
  ensureLifeRhythmSection();
  ensureFoodSection();
  ensureLateNightSection();
  const launchers=document.createElement('section');launchers.id='v2Launchers';launchers.className='v2-launchers';launchers.innerHTML=Object.entries(HOME_ROUTES).map(([id,[title,icon]])=>`<button class="v2-launcher" data-route="${id}"><span class="v2-launcher-icon">${iconImg(icon,36)}</span><span>${title}</span></button>`).join('');document.querySelector('.quick-add').after(launchers);
  Object.keys(HOME_ROUTES).forEach(id=>document.getElementById(id)?.classList.add('v2-home-module'));
  launchers.querySelectorAll('[data-route]').forEach(btn=>btn.addEventListener('click',()=>openModulePage(btn.dataset.route)));
  ensureHomeOverviewSection();
  const footer=document.querySelector('#calendarSection .cal-footer');if(footer&&!document.getElementById('v2PlanEntry')){const btn=document.createElement('button');btn.id='v2PlanEntry';btn.className='v2-plan-entry';btn.innerHTML=iconImg('规划',16)+'进入智能规划室 ›';btn.addEventListener('click',()=>openPlannerPage());footer.appendChild(btn)}
}
function buildQuickCaptureUI(){
  if(document.getElementById('v2CaptureFab'))return;
  const chatFab=document.getElementById('chatFab');
  chatFab.parentElement.insertBefore(Object.assign(document.createElement('button'),{id:'v2CaptureFab',className:'fab v2-capture-fab'}),chatFab);
  const overlay=document.createElement('div');overlay.id='v2CaptureOverlay';overlay.className='chat-overlay';
  overlay.innerHTML=`<div class="chat-dialog v2-capture-dialog"><div class="chat-header"><div class="left">快速整理</div><button class="chat-close" id="v2CaptureClose">✕</button></div><div class="v2-panel" style="margin:0"><p class="hint">直接说你刚做了什么、还没做什么、现在状态怎样、有没有账单或明天建议。我会先分类预览，再决定上传。</p><div class="v2-fields"><textarea id="v2CaptureInput" rows="8" placeholder="例如：我刚刚洗澡了，收拾了一个袋子，但是副业还没做。我头有点紧，今天低电量。明天不要给我排太满。"></textarea><div id="v2CapturePreview" class="v2-capture-preview hint">整理结果会显示在这里</div><div class="v2-row end"><button class="v2-secondary" id="v2CaptureParse">先整理一下</button><button class="v2-primary" id="v2CaptureSave">一键上传</button></div></div></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('v2CaptureFab').innerHTML=iconImg('清单',26);
  document.getElementById('v2CaptureFab').addEventListener('click',()=>{overlay.classList.add('show');document.getElementById('v2CaptureInput').focus()});
  document.getElementById('v2CaptureClose').addEventListener('click',()=>overlay.classList.remove('show'));
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('show')});
  document.getElementById('v2CaptureParse').addEventListener('click',()=>previewNaturalCapture());
  document.getElementById('v2CaptureSave').addEventListener('click',()=>applyNaturalCapture());
  document.getElementById('v2CapturePreview').addEventListener('click',handleSmartCapturePreviewAction);
}
function enhanceAssistantWorkbench(){
  const overlay=document.getElementById('chatOverlay');
  const dialog=overlay?.querySelector('.chat-dialog');
  const input=document.getElementById('chatInput');
  const messages=document.getElementById('chatMessages');
  if(!overlay||!dialog||!input||!messages||dialog.querySelector('.v2-chat-workbench'))return;
  const carry=appData.v2?.conversation?.carrySummary||'还没有提炼对话精华，聊长了之后这里会保留这段时间的重点。';
  const week=window.AIMemorySystem?.weeklySummary?.current?.();
  const workbench=document.createElement('div');
  workbench.className='v2-chat-workbench';
  workbench.innerHTML=`<div class="v2-chat-modebar"><button class="v2-chat-mode active" data-chat-mode="chat">陪我聊</button><button class="v2-chat-mode" data-chat-mode="light">轻量整理</button><button class="v2-chat-mode" data-chat-mode="plan">安排今天</button><button class="v2-chat-mode" data-chat-mode="deep">拆大项目</button><button class="v2-chat-mode" data-chat-mode="memory">查看记忆</button></div><div class="v2-chat-memory-card"><div class="v2-chat-memory-head"><span class="v2-chat-memory-chip">${routeInfoLabel('icons-collage-v2/icon-ai-review.png','AI 会参考你前面的重点')}</span><button class="v2-secondary v2-chat-memory-btn" id="v2ChatMemoryOpen">展开</button></div><p>${esc(carry).slice(0,88)}${carry.length>88?'...':''}</p><small>${week?.startDate?`最近周摘要：${week.startDate} - ${week.endDate}`:'最近周摘要会在这里接上来'}</small></div>`;
  messages.parentNode.insertBefore(workbench,messages);
  workbench.querySelectorAll('[data-chat-mode]').forEach(btn=>btn.addEventListener('click',()=>{
    workbench.querySelectorAll('[data-chat-mode]').forEach(node=>node.classList.toggle('active',node===btn));
    const mode=btn.dataset.chatMode;
    if(mode==='memory'){window.AIMemorySystem?.showMemory?.(appData);return}
    if(mode==='light'){
      input.value='请先帮我轻量整理一下我现在的情况，只分成 2 到 3 块，不要排太满。';
      input.placeholder='先说说刚做了什么、没做什么、现在状态怎样，我会轻量整理。';
    }else if(mode==='plan'){
      input.value='请结合我最近的状态和任务，帮我安排今天，给我轻一点但能推进的版本。';
      input.placeholder='比如：我今天低电量，但想推进一点副业和家务。';
    }else if(mode==='deep'){
      input.value='请帮我把这个大项目拆成更小的下一步，先给我一个能马上开始的版本。';
      input.placeholder='把卡住的大项目丢给我，我们先拆下一步。';
    }else{
      input.value='';
      input.placeholder='先跟我说说今天怎么了、卡在哪里、想怎么安排。';
    }
    input.focus();
  }));
  document.getElementById('v2ChatMemoryOpen')?.addEventListener('click',()=>window.AIMemorySystem?.showMemory?.(appData));
}
function renderCapturePreview(result){
  const box=document.getElementById('v2CapturePreview');if(!box)return;
  box.innerHTML=buildSmartCapturePreviewHTML(result,{interactive:true});
}
function previewNaturalCapture(fixedType){
  const text=document.getElementById('v2CaptureInput')?.value.trim();if(!text){toast('先写下你想整理的内容');return null}
  const result=fixedType?parseNaturalTaskInput(text,fixedType):analyzeSmartCaptureText(text);
  renderCapturePreview(result);return result
}
function applyNaturalCapture(fixedType){
  const result=previewNaturalCapture(fixedType);if(!result)return 0;
  if(fixedType&&result.tasks?.length){
    result.tasks.forEach(task=>appData.tasks.push(task));
    persist();render();toast(`已整理到${fixedType}板块（${result.tasks.length}项）`);
    return result.tasks.length
  }
  const actionResult=applySmartCaptureAction('upload',result.id);
  if(actionResult?.report){
    render();renderBills?.();renderCalendarInlinePreview?.(todayStr());if(routeState?.kind==='day')renderDaySheet();
    document.getElementById('v2CapturePreview').innerHTML=`<pre class="hint" style="white-space:pre-wrap">${esc(formatSmartCaptureReport(actionResult.report))}</pre>`;
    toast(actionResult.report.errors?.length?'部分上传已完成':'已完成一键上传');
    return actionResult.report.success?.length||0
  }
  return 0
}
function handleSmartCapturePreviewAction(e){
  const btn=e.target.closest('[data-smart-action]');if(!btn)return;
  const box=document.getElementById('v2CapturePreview');if(!box)return;
  if(btn.dataset.smartAction==='save-edit'){
    const result=smartCaptureDrafts[btn.dataset.smartId];
    if(!applySmartCaptureEditsFromContainer(result,box)){toast('保存修改失败');return}
  }
  const actionResult=applySmartCaptureAction(btn.dataset.smartAction,btn.dataset.smartId);
  if(actionResult?.type==='update'||actionResult?.type==='retry'){box.innerHTML=buildSmartCapturePreviewHTML(actionResult.result,{interactive:true});return}
  if(actionResult?.type==='error'){toast(actionResult.message);return}
  if(actionResult?.type==='discard'){box.innerHTML='已丢弃这次整理结果';return}
  if(actionResult?.type==='uploaded'){
    render();renderBills?.();renderCalendarInlinePreview?.(todayStr());if(routeState?.kind==='day')renderDaySheet();
    box.innerHTML=`<pre class="hint" style="white-space:pre-wrap">${esc(formatSmartCaptureReport(actionResult.report))}</pre>`;
    toast(actionResult.report.errors?.length?'部分上传已完成':'已完成一键上传')
  }
}
async function clearRuntimeCaches(){
  try{if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('task-mgr-v2-')).map(k=>caches.delete(k)))} }catch(e){}
  try{
    if('serviceWorker'in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(async reg=>{try{await reg.update();reg.waiting?.postMessage('SKIP_WAITING')}catch(e){}}));
    }
  }catch(e){}
}
function ensureUpdateModal(){
  let overlay=document.getElementById('v2UpdateOverlay');
  if(overlay)return overlay;
  overlay=document.createElement('div');overlay.id='v2UpdateOverlay';overlay.className='chat-overlay';
  overlay.innerHTML=`<div class="chat-dialog v2-capture-dialog"><div class="chat-header"><div class="left">发现新版本</div><button class="chat-close" id="v2UpdateClose">✕</button></div><div class="v2-panel" style="margin:0"><div id="v2UpdateBody" class="hint">正在检查更新…</div><div class="v2-row end" style="margin-top:12px"><button class="v2-secondary" id="v2UpdateLater">稍后再说</button><a class="v2-secondary" id="v2UpdatePage" href="${UPDATE_PAGE_URL}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">下载页</a><button class="v2-primary" id="v2UpdateGo">立即更新</button></div></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('v2UpdateClose').addEventListener('click',()=>overlay.classList.remove('show'));
  document.getElementById('v2UpdateLater').addEventListener('click',()=>overlay.classList.remove('show'));
  document.getElementById('v2UpdateGo').addEventListener('click',()=>{if(pendingRemoteUpdate)startAppUpdate(pendingRemoteUpdate)});
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('show')});
  return overlay
}
function compareVersions(a,b){
  const pa=String(a||'').split(/[^\d]+/).filter(Boolean).map(Number),pb=String(b||'').split(/[^\d]+/).filter(Boolean).map(Number),len=Math.max(pa.length,pb.length);
  for(let i=0;i<len;i++){const av=pa[i]||0,bv=pb[i]||0;if(av>bv)return 1;if(av<bv)return-1}
  return 0
}
function normalizeReleasePayload(data){
  const assets=Array.isArray(data?.assets)?data.assets:[];
  const apkAsset=assets.find(x=>/\.apk$/i.test(x?.name||''))||assets[0]||null;
  const bodyText=String(data?.body||'');
  const notes=bodyText.split(/\r?\n/).map(x=>x.replace(/^[-*]\s*/,'').trim()).filter(Boolean).slice(0,8);
  const tag=data?.tag_name||'';
  const versionCode=numericVersion(tag)||numericVersion(data?.name)||numericVersion(apkAsset?.name);
  const versionName=(String(data?.name||'').match(/\d+\.\d+\.\d+/)||[])[0]||`2.0.${versionCode||0}`;
  return{
    versionCode,
    versionName,
    version:versionName,
    publishedAt:data?.published_at||nowISO(),
    downloadUrl:apkAsset?.browser_download_url||data?.html_url||UPDATE_PAGE_URL,
    pageUrl:data?.html_url||UPDATE_PAGE_URL,
    notes:notes.length?notes:['自动构建的新安装包，可直接在应用内下载并安装。']
  }
}
async function initRuntimeAppInfo(){
  const plugin=nativePlugins()?.AppUpdate;
  if(plugin?.getAppInfo){
    try{
      const info=await plugin.getAppInfo();
      setRuntimeAppInfo(info);
      return info
    }catch(e){}
  }
  updateVersionChip();
  return{versionName:APP_VERSION,versionCode:APP_VERSION_CODE,packageName:APP_PACKAGE_NAME}
}
async function fetchLatestRelease(){
  const res=await fetch(`${RELEASE_API_URL}?t=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});
  if(!res.ok)throw new Error('UPDATE_FETCH_FAILED');
  const remote=normalizeReleasePayload(await res.json());
  localStorage.setItem('tm_last_remote_release',JSON.stringify(remote));
  return remote
}
function showUpdatePrompt(remote){
  pendingRemoteUpdate=remote;
  const overlay=ensureUpdateModal(),body=document.getElementById('v2UpdateBody'),page=document.getElementById('v2UpdatePage');
  const notes=(remote.notes||[]).map(x=>`<li>${esc(x)}</li>`).join('');
  body.innerHTML=`<div class="v2-capture-head"><span>当前 ${versionLabel()}</span><span>最新 ${esc(remote.versionName||remote.version||'未知')}</span></div><p style="margin:0 0 8px">这次不是只弹提示，而是会直接下载新版 APK，下载完自动拉起安装。为了避免华为手机继续显示旧页面，安装新版后也会主动清旧缓存。</p>${notes?`<ul style="margin:0;padding-left:18px">${notes}</ul>`:''}`;
  page.href=remote.pageUrl||remote.downloadUrl||UPDATE_PAGE_URL;
  overlay.classList.add('show');
}
async function applyRuntimeVersionMigration(){
  const last=localStorage.getItem('tm_app_runtime_version');
  if(last===versionToken())return false;
  localStorage.setItem('tm_app_runtime_prev',last||'');
  localStorage.setItem('tm_app_runtime_version',versionToken());
  await clearRuntimeCaches();
  return true
}
async function startAppUpdate(remote){
  const plugin=nativePlugins()?.AppUpdate;
  const url=remote?.downloadUrl||remote?.pageUrl||UPDATE_PAGE_URL;
  if(plugin?.downloadAndInstall){
    try{
      const info=await plugin.getAppInfo();
      if(info?.canRequestPackageInstalls===false){
        await plugin.openInstallUnknownSourcesSettings();
        toast('请先允许本应用安装更新包，然后再点一次“立即更新”');
        return false
      }
      await plugin.downloadAndInstall({url,fileName:`task-manager-v2-${remote.versionName||remote.versionCode||Date.now()}.apk`,title:`任务管家 ${remote.versionName||''}`});
      document.getElementById('v2UpdateOverlay')?.classList.remove('show');
      toast('开始下载新版本，下载完成后会自动弹出安装');
      return true
    }catch(e){
      if(String(e?.message||e).includes('INSTALL_UNKNOWN_APPS_PERMISSION_REQUIRED')){
        try{await plugin.openInstallUnknownSourcesSettings()}catch(err){}
        toast('请允许安装未知应用后，再点一次“立即更新”');
        return false
      }
    }
  }
  window.open(url,'_blank','noopener');
  toast('已打开下载页面，请下载安装新包');
  return false
}
async function checkForAppUpdates(silent=true){
  try{
    const remote=await fetchLatestRelease();
    const remoteToken=String(remote.versionCode||remote.versionName||remote.version||'');
    const localCode=Number(APP_VERSION_CODE)||0;
    const hasUpdate=localCode?Number(remote.versionCode||0)>localCode:compareVersions(remote.versionName||remote.version,APP_VERSION)>0;
    if(hasUpdate){
      if(silent&&localStorage.getItem('tm_update_latest_seen')===remoteToken)return remote;
      localStorage.setItem('tm_update_latest_seen',remoteToken);
      showUpdatePrompt(remote);
      return remote
    }
    if(!silent)toast('当前已经是最新版本');
  }catch(e){
    if(!silent)toast('暂时没连上更新服务');
  }
  return null
}
window.checkForTaskManagerUpdates=checkForAppUpdates;
function beginRoute(title,icon,kind){
  if(routeState)closeRouteInternal(false);homeScroll=window.scrollY;const app=document.querySelector('.app'),page=document.getElementById('v2RoutePage'),body=document.getElementById('v2RouteBody');body.innerHTML='';app.classList.add('v2-hidden');page.classList.add('show');document.getElementById('v2RouteTitle').textContent=title;document.getElementById('v2RouteIcon').innerHTML=iconImg(icon,28);routeState={kind};updateRouteHead(kind);window.scrollTo(0,0);history.pushState({v2Route:kind},'',`#/${kind}`);return body
}
function renderOpenedModuleRoute(id){
  if(id==='taskPoolSection')return renderTaskPoolRoute();
  if(id==='dailySection')return renderDailyRoute();
  if(id==='projectSection')return renderProjectRoute();
  if(id==='cyclicSection')return renderCyclicRoute();
  if(id==='tempSection')return renderTempRoute();
  if(id==='rhythmSection')return renderLifeRhythmRoute();
  if(id==='foodSection')return renderFoodRoute();
  if(id==='lateNightSection')return renderLateNightRoute();
  if(!['taskPoolSection','dailySection','projectSection','cyclicSection','tempSection','rhythmSection','foodSection','lateNightSection'].includes(id))return renderGenericSectionRoute(id);
}
function renderRouteFallbackShell(id,error){
  const body=document.getElementById('v2RouteBody');
  const section=document.getElementById(id);
  if(!body||!section)return;
  console.error('route render failed',id,error);
  const cfg=HOME_ROUTES[id]||['模块详情',''];
  body.querySelector('.v2-route-fallback-shell')?.remove();
  const shell=document.createElement('div');
  shell.className='v2-route-fallback-shell';
  shell.innerHTML=`<div class="v2-route-overview day v2-route-journal"><div class="v2-route-overview-main"><div>${routeEyebrow('day',cfg[0])}<h3>这一页刚刚没完整展开</h3><p>我先把原来的功能区保留下来，避免你点进来一片空白。下面的真实内容还在，可以先直接用。</p></div><div class="v2-route-overview-progress"><div class="v2-overview-ring"><strong>!</strong><span>已保留内容</span></div><div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:42%"></span></div><small>先继续操作，后面再把这一页收得更漂亮</small></div></div>${routeMascot('day','is-right')}${routeDecorPair()}</div></div>`;
  body.insertBefore(shell,section);
}
function openModulePage(id){const cfg=HOME_ROUTES[id],section=document.getElementById(id);if(!cfg||!section)return;const body=beginRoute(cfg[0],cfg[1],id.replace('Section',''));const marker=document.createComment('v2-return-'+id);section.parentNode.insertBefore(marker,section);const cards=[...section.querySelectorAll('.card')],expandedStates=cards.map(c=>c.classList.contains('expanded'));routeState=Object.assign(routeState,{section,marker,wasCollapsed:section.classList.contains('collapsed'),cards,expandedStates});section.classList.remove('collapsed','v2-home-module');cards.forEach(c=>c.classList.add('expanded'));body.appendChild(section);try{renderOpenedModuleRoute(id);buildSectionQuickAdd(id)}catch(error){renderRouteFallbackShell(id,error);toast('这一页刚刚没加载完整，先保留原功能区给你用')}} 
function switchRouteModule(id){
  if(routeState?.section?.id===id)return;
  if(routeState)closeRouteInternal(false);
  openModulePage(id);
}
function openPlannerPage(){const body=beginRoute('智能规划室','规划','planner'),planner=document.getElementById('v2Planner');routeState.planner=planner;body.appendChild(planner);renderPlanner()}
function requestCloseRoute(){if(routeState)history.back()}
function routeMetaCopy(kind){
  if(kind==='planner')return{chip:`${modeEmoji()} ${modeLabel()}`,desc:isHomeMode()?'先用保底视角排今天，再决定要不要多做。':'今天的安排可以先挑方案，不用一上来就排满。'}
  if(kind==='taskPool')return{chip:'任务池',desc:'想做但不急着今天做的事，先放这里慢慢调度。'}
  if(kind==='rhythm')return{chip:'生活能量',desc:isHomeMode()?'先看身体和节奏，再安排任务密度。':'把状态记清楚，后面的 AI 才会更会安排。'}
  if(kind==='day')return{chip:selectedDay===todayStr()?`${modeEmoji()} Today`:selectedDay,desc:selectedDay===todayStr()?'今天的安排、完成和记录都收在这里。':'这一天的任务和记录会一起保留下来。'}
  return{chip:'模块详情',desc:'这里会把这一块的入口、摘要和真实内容放在一起。'}
}
const ROUTE_BOTTOM_NAV_ITEMS=[
  {id:'home',label:'首页',icon:'ui-icons-collage-v1/icon-nav-home.png'},
  {id:'planner',label:'规划',icon:'ui-icons-collage-v1/icon-nav-plan.png'},
  {id:'add',label:'添加',icon:'icons-collage-v2/icon-note.png'},
  {id:'stats',label:'统计',icon:'ui-icons-collage-v1/icon-nav-stats.png'},
  {id:'profile',label:'我的',icon:'ui-icons-collage-v1/icon-nav-profile.png'}
];
function currentRouteNavKey(kind=routeState?.kind){
  if(kind==='planner')return'planner';
  if(kind==='review')return'stats';
  return'home';
}
function renderRouteBottomNav(kind=routeState?.kind){
  const nav=document.getElementById('v2RouteBottomNav');
  if(!nav)return;
  const active=currentRouteNavKey(kind);
  nav.innerHTML=ROUTE_BOTTOM_NAV_ITEMS.map(item=>`<button class="v2-route-nav-btn ${item.id===active?'is-active':''} ${item.id==='add'?'is-add':''}" data-route-nav="${item.id}"><span class="v2-route-nav-icon">${stickerImg(item.icon,'v2-route-nav-icon-img',item.label)}</span><span class="v2-route-nav-label">${esc(item.label)}</span></button>`).join('');
  nav.querySelectorAll('[data-route-nav]').forEach(btn=>btn.addEventListener('click',()=>handleRouteBottomNav(btn.dataset.routeNav)));
}
function handleRouteBottomNav(target){
  if(target==='home'){requestCloseRoute();return}
  if(target==='planner'){if(routeState?.kind!=='planner')openPlannerPage();return}
  if(target==='add'){document.getElementById('v2CaptureFab')?.click();return}
  if(target==='stats'){if(routeState?.kind!=='review')openModulePage('reviewSection');return}
  if(target==='profile'){document.getElementById('settingsPopup')?.classList.add('show')}
}
function updateRouteHead(kind=routeState?.kind){
  const meta=routeMetaCopy(kind);
  const chip=document.getElementById('v2RouteMetaChip');
  const desc=document.getElementById('v2RouteMetaDesc');
  if(chip)chip.innerHTML=routeMetaChip(kind,meta.chip);
  if(desc)desc.textContent=meta.desc;
  renderRouteBottomNav(kind);
}
function openCalendarViewFromPlanner(view='week'){
  const activate=()=>{
    const tab=document.querySelector(`#viewTabs .view-tab[data-view="${view}"]`);
    if(tab)tab.click();
    else{
      calIsMonth=view==='month';
      calIsYear=view==='year';
      calTimeSlotView=view==='slot';
      renderCalendar?.();
    }
    if(view!=='year')selectCalendarDay(todayStr());
    document.getElementById('calendarSection')?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  if(routeState){
    closeRouteInternal(false);
    try{history.replaceState(null,'',`${location.pathname}${location.search}`)}catch(e){}
    requestAnimationFrame(activate);
    return;
  }
  activate();
}
function plannerCalendarView(){return calTimeSlotView?'slot':(calIsYear?'year':(calIsMonth?'month':'week'))}
function setPlannerCalendarView(view='week'){
  calIsMonth=view==='month';
  calIsYear=view==='year';
  calTimeSlotView=view==='slot';
  if(view!=='year'&&!calSelectedDate){
    calSelectedDate=new Date(`${todayStr()}T12:00:00`);
    selectedDay=todayStr();
  }
  if(routeState?.kind==='planner')renderPlanner();
}
function shiftPlannerCalendar(step=0){
  calWeekOffset+=Number(step)||0;
  if(routeState?.kind==='planner')renderPlanner();
}
function jumpPlannerCalendarToday(){
  calWeekOffset=0;
  calSelectedDate=new Date(`${todayStr()}T12:00:00`);
  selectedDay=todayStr();
  if(routeState?.kind==='planner')renderPlanner();
}
function selectPlannerCalendarDay(ds){
  selectCalendarDay(ds);
  if(routeState?.kind==='planner')renderPlanner();
}
function beginRoute(title,icon,kind){
  if(routeState)closeRouteInternal(false);
  homeScroll=window.scrollY;
  const app=document.querySelector('.app');
  const page=document.getElementById('v2RoutePage');
  const body=document.getElementById('v2RouteBody');
  body.innerHTML='';
  app.classList.add('v2-hidden');
  page.classList.add('show');
  document.getElementById('v2RouteTitle').textContent=title;
  document.getElementById('v2RouteIcon').innerHTML=routeHeadIcon(kind,title);
  routeState={kind};
  updateRouteHead(kind);
  window.scrollTo(0,0);
  history.pushState({v2Route:kind},'',`#/${kind}`);
  return body
}
window.openModulePage=openModulePage;
window.openPlannerPage=openPlannerPage;
window.requestCloseRoute=requestCloseRoute;
window.openCalendarViewFromPlanner=openCalendarViewFromPlanner;
window.setPlannerCalendarView=setPlannerCalendarView;
window.shiftPlannerCalendar=shiftPlannerCalendar;
window.jumpPlannerCalendarToday=jumpPlannerCalendarToday;
window.selectPlannerCalendarDay=selectPlannerCalendarDay;
function closeRouteInternal(restoreScroll=true){if(!routeState)return;const state=routeState;routeState=null;if(state.section){state.cards?.forEach((c,i)=>c.classList.toggle('expanded',state.expandedStates[i]));state.marker.parentNode.insertBefore(state.section,state.marker);state.marker.remove();state.section.classList.add('v2-home-module');state.section.classList.toggle('collapsed',state.wasCollapsed)}if(state.planner)document.getElementById('v2Parking').appendChild(state.planner);document.getElementById('v2RouteBody').innerHTML='';document.getElementById('v2RoutePage').classList.remove('show');document.querySelector('.app').classList.remove('v2-hidden');renderRouteBottomNav(null);if(restoreScroll)requestAnimationFrame(()=>window.scrollTo(0,homeScroll))
}
const RECHARGE_OPTIONS=['睡觉','洗澡','散步','运动','喝奶茶','喝咖啡','吃到喜欢的东西','聊天','独处','整理房间','撸猫','晒太阳','听歌'];
const DRAIN_OPTIONS=['论文','PPT','咨询','学习','家务','外出','沟通','情绪波动','临时任务','跑腿','被催促','信息太多'];
const INTERRUPT_OPTIONS=['家里电话','朋友消息','客户咨询','快递','跑腿','临时任务','刷手机','身体不舒服','环境吵','等待回复','任务太碎','任务太难'];
const HIDDEN_COST_OPTIONS=['寄快递','拿快递','打车','通勤','买东西','办事','临时外出','排队','等人','家务','临时沟通'];
const DISCOMFORT_OPTIONS=['头痛','胃不舒服','姨妈痛','腰酸','肩颈紧张','眼睛累','困','乏力'];
const MOVEMENT_OPTIONS=['无','散步','拉伸','游泳','运动','出门走动'];
const MOOD_GOOD_OPTIONS=['奶茶','吃到喜欢的东西','聊天','完成任务','休息','运动','整理房间','撸猫','晒太阳'];
const MOOD_BAD_OPTIONS=['任务太多','被打断','家里电话','咨询消耗','身体不舒服','计划被打乱','内耗','任务太碎'];
const RHYTHM_STUCK_OPTIONS=['不知道从哪开始','任务太大','素材不齐','太累','不想做','被打断','需要别人反馈','内耗','担心做不好','任务边界不清','信息太乱'];
function renderChipOptions(list,key,active=[],tone=''){
  const ordered=[...list].sort((a,b)=>(active.includes(b)?1:0)-(active.includes(a)?1:0));
  return `<div class="v2-rhythm-chipset">${ordered.map(name=>`<button class="v2-rhythm-chip ${tone} ${active.includes(name)?'active':''}" data-rhythm-toggle="${key}" data-value="${esc(name)}">${esc(name)}</button>`).join('')}</div>`
}
function taskCompletionPercent(ds=todayStr()){
  const items=displayItems(ds)||[];if(!items.length)return 0;
  return Math.round((items.filter(x=>x.status==='done').length/items.length)*100)
}
function collectLifeRhythmFactors(entry){
  return [...new Set([
    entry.sleepQuality==='差'?'睡眠不足':'',
    entry.stayedUpLate==='是'?'熬夜':'',
    entry.bodyState==='疲惫'?'身体疲惫':'',
    entry.bodyState==='不舒服'?'身体不舒服':'',
    ...((entry.rhythmFactors||[]).slice(0,4)),
    ...((entry.drainTags||[]).slice(0,3)),
    ...((entry.moodBadTags||[]).slice(0,3)),
    ...(entry.hiddenCosts||[]).slice(0,2).map(x=>x.title)
  ].filter(Boolean))]
}
function deriveLifeRhythmOverview(entry,ds=todayStr()){
  const completionPercent=Number(entry.completionPercent||0)||taskCompletionPercent(ds);
  const negativeScore=
    (entry.sleepQuality==='差'?2:entry.sleepQuality==='一般'?1:0)+
    (entry.stayedUpLate==='是'?2:0)+
    (entry.bodyState==='疲惫'?2:entry.bodyState==='不舒服'?3:0)+
    (Number(entry.fatigueScore||0)>=4?2:Number(entry.fatigueScore||0)>=2?1:0)+
    (['低落','焦虑','烦躁','混乱'].includes(entry.moodState)?2:0)+
    ((entry.rhythmFactors||[]).length>=3?2:(entry.rhythmFactors||[]).length>=1?1:0)+
    ((entry.hiddenCosts||[]).length>=3?2:(entry.hiddenCosts||[]).length>=1?1:0);
  const suggestedEnergy=negativeScore>=6?'低电量':negativeScore>=3?'中等电量':'高电量';
  const inferredEnergy=(entry.energyManual&&entry.energyLevel)?entry.energyLevel:(entry.energyLevel||suggestedEnergy);
  const inferredRhythm=entry.rhythm||((entry.rhythmFactors||[]).length>=4?'被打乱':(entry.rhythmFactors||[]).length>=2?'很乱':completionPercent>=70?'很顺':'一般');
  const factors=collectLifeRhythmFactors(entry).slice(0,4);
  const completionLabel=completionPercent>=75?'高':completionPercent>=40?'中':'低';
  const lowEnergy=inferredEnergy==='低电量'||['很乱','被打乱','完全被打乱'].includes(inferredRhythm)||completionPercent<40||entry.moodState==='低落';
  const aiNote=lowEnergy
    ?`今天更适合先恢复再推进。主要卡点是${factors.slice(0,2).join('、')||'状态偏低'}，明天建议先安排边界清楚的小任务。`
    :`今天整体还能推进，主要受${factors.slice(0,2).join('、')||'节奏稳定'}影响，明天可以保留 1 项深度任务。`;
  return{energyLabel:inferredEnergy,suggestedEnergy,rhythmLabel:inferredRhythm,completionPercent,completionLabel,factors,lowEnergy,aiNote,isManualEnergy:!!(entry.energyManual&&entry.energyLevel)}
}
function renderEnergyManualControls(entry,overview){
  return `<div class="v2-rhythm-energy-manual">
    <div class="v2-rhythm-energy-head">
      <b>电量状态</b>
      <span class="v2-rhythm-energy-hint ${overview.isManualEnergy?'manual':''}">${esc(overview.isManualEnergy?'当前按你的手动选择显示':'系统已自动判断，你也可以手动改')}</span>
    </div>
    <div class="v2-rhythm-scale">${['低电量','中等电量','高电量'].map(x=>`<button class="v2-rhythm-pill ${overview.energyLabel===x?'active':''}" data-rhythm-energy="${x}">${x}</button>`).join('')}</div>
  </div>`
}
function rhythmSummaryText(entry,key){
  if(key==='sleep')return entry.sleepStart&&entry.wakeTime?`${entry.sleepStart}-${entry.wakeTime}${sleepDurationText(entry.sleepStart,entry.wakeTime)?` · ${sleepDurationText(entry.sleepStart,entry.wakeTime)}`:''}`:'还没记睡眠';
  if(key==='body')return [entry.bodyState,entry.fatigueScore?`疲惫${entry.fatigueScore}/5`:'' ,(entry.discomfortTags||[])[0]].filter(Boolean).join(' · ')||'还没记身体状态';
  if(key==='mood')return [entry.moodState,entry.moodScore?`心情${entry.moodScore}/5`:'' ,(entry.moodGoodTags||[])[0]||''].filter(Boolean).join(' · ')||'还没记心情';
  if(key==='rhythm'){const ov=deriveLifeRhythmOverview(entry,entry.date);return [ov.rhythmLabel,entry.control?`掌控感${entry.control}`:'',`${ov.completionPercent}%`].filter(Boolean).join(' · ')}
  if(key==='hidden')return entry.hiddenCosts?.length?`${entry.hiddenCosts.length} 项隐形成本`:'还没记隐形成本';
  return ''
}
function renderLifeRhythmSection(){
  const box=document.getElementById('rhythmList');if(!box)return;
  const date=todayStr(),entry=getLifeRhythmEntry(date,true),overview=deriveLifeRhythmOverview(entry,date),emergency=appData.v2.lifeRhythm.emergencyKit;
  box.innerHTML=`
    <div class="v2-panel v2-rhythm-home">
      <div class="v2-rhythm-hero">
        <div>
          <h3>🦋 生活能量与节奏</h3>
          <p class="hint">记录今天为什么累、为什么乱、为什么顺，让 AI 后面更懂你，也更会照顾你。</p>
        </div>
        <span class="v2-rhythm-badge ${overview.lowEnergy?'low':'normal'}">${esc(overview.energyLabel||'未记录')}</span>
      </div>
      <div class="v2-rhythm-overview-grid">
        <div class="v2-rhythm-overview-item"><b>${routeInfoLabel(DETAIL_ICON_ART.battery,'今日电量')}</b><span>${esc(overview.energyLabel||'未记录')}</span></div>
        <div class="v2-rhythm-overview-item"><b>${routeInfoLabel(DETAIL_ICON_ART.rhythm,'今日节奏')}</b><span>${esc(overview.rhythmLabel||'未记录')}</span></div>
        <div class="v2-rhythm-overview-item"><b>${routeInfoLabel('ui-icons-collage-v1/icon-complete-badge.png','任务完成度')}</b><span>${overview.completionPercent}%</span></div>
        <div class="v2-rhythm-overview-item"><b>${routeInfoLabel(DETAIL_ICON_ART.factor,'主要影响因素')}</b><span>${esc(overview.factors.join('、')||'今天还没记录')}</span></div>
      </div>
      ${renderEnergyManualControls(entry,overview)}
      <div class="v2-rhythm-tags">${overview.factors.length?overview.factors.map(x=>`<span class="v2-chip">${esc(x)}</span>`).join(''):'<span class="v2-chip">先点“快速记录今天”开始</span>'}</div>
      ${overview.lowEnergy?`<div class="v2-rhythm-emergency"><strong>🛟 低电量提醒</strong><div class="v2-rhythm-mini">${emergency.short.slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('')}</div></div>`:''}
      <div class="v2-row end" style="margin-top:10px"><button class="v2-primary" id="v2RhythmQuickFill">快速记录今天</button></div>
    </div>`;
  document.getElementById('v2RhythmQuickFill')?.addEventListener('click',()=>openRhythmQuickRecord(date));
  box.querySelectorAll('[data-rhythm-energy]').forEach(btn=>btn.addEventListener('click',()=>setLifeRhythmEnergy(date,btn.dataset.rhythmEnergy)));
}
function renderTaskPoolSection(){
  const box=document.getElementById('taskPoolList');if(!box)return;
  const items=getTaskPool(),show=items.slice(0,4);
  box.innerHTML=`<div class="v2-panel"><div class="v2-row" style="justify-content:space-between;align-items:flex-start"><div><h3>🗂️ 想做的事先放这里</h3><p class="hint">它们不会默认压到今天，等你手动加入或 AI 挑出来再进今日清单。</p></div><span class="v2-chip active">${items.length} 条</span></div><div class="v2-rhythm-tags" style="margin:8px 0">${['想做','待安排','已安排到今日','暂缓','已完成'].map(label=>`<span class="v2-chip">${label} ${taskPoolStatusCount(label)}</span>`).join('')}</div>${show.length?show.map(item=>`<div class="v2-log-card"><div class="v2-row"><div class="v2-day-title">${esc(item.title)}</div><span class="v2-chip">${esc(item.status)}</span></div><div class="v2-day-meta" style="margin-top:4px">${esc(item.taskType||'临时')}</div></div>`).join(''):'<div class="empty-tip">任务池还是空的。想做但不急的事，后面都可以先放这里。</div>'}</div>`;
}
function renderTaskPoolRoute(){
  const target=routeState?.kind==='taskPool'?document.getElementById('v2RouteBody'):document.getElementById('taskPoolList');
  if(!target)return;
  const stats=taskPoolDashboardStats(),items=stats.items;
  const shelfChips=[['想做',taskPoolStatusCount('想做')],['待安排',taskPoolStatusCount('待安排')],['已安排到今日',taskPoolStatusCount('已安排到今日')],['暂缓',taskPoolStatusCount('暂缓')]];
  const quoteTitle=pickRotatingCopy('taskPool','title',String(stats.active.length));
  const quoteBody=pickRotatingCopy('taskPool','body',String(stats.scheduled.length));
  const poolListHtml=items.length
    ?items.map(item=>`<div class="v2-panel v2-pool-card ${item.status==='暂缓'?'is-paused':''} ${item.status==='进行中'?'is-doing':''}"><div class="v2-row" style="justify-content:space-between;align-items:flex-start;gap:10px"><div style="min-width:0"><div class="v2-day-title">${taskSticker(item,'v2-task-sticker')}<span class="v2-day-title-text">${esc(item.title)}</span></div><div class="v2-day-meta-pills" style="margin-top:8px">${metaPill(taskStickerAsset(item),item.taskType||'任务','soft')}${metaPill('icons-collage-v2/icon-note.png',item.status||'待安排','pool')}${item.deferredUntil?metaPill('ui-icons-collage-v1/icon-alarm.png',`延到 ${item.deferredUntil}`,'time'):''}</div></div><span class="v2-day-status ${item.status==='进行中'?'doing':item.status==='已完成'?'done':item.status==='暂缓'?'deferred':'todo'}">${esc(item.status)}</span></div>${item.note?`<div class="v2-day-note" style="margin-top:8px;white-space:pre-wrap">${esc(item.note)}</div>`:''}<div class="v2-row" style="margin-top:10px;gap:6px;flex-wrap:wrap"><button class="v2-primary" data-pool-schedule="${esc(item.id)}">加入今日</button><button class="v2-secondary" data-pool-pause="${esc(item.id)}">${item.status==='暂缓'?'恢复这项':'先放一放'}</button><button class="v2-danger" data-pool-drop="${esc(item.id)}">${item.status==='放弃'?'彻底删除':'先放弃'}</button></div></div>`).join('')
    :'<div class="v2-panel"><div class="empty-tip">任务池还是空的。后面 AI 识别到“以后做”“不急”“有空再做”的内容，也会优先放这里。</div></div>';
  target.innerHTML=`<div class="v2-route-overview pool v2-route-shelf"><div class="v2-route-overview-main"><div>${routeEyebrow('taskPool','任务池总览')}<h3>${quoteTitle}</h3><p>${quoteBody} 这里是 AI 调度素材库。想做、以后做、项目推进但不一定今天做的事，都先在这里待命。</p></div><div class="task-pool-hero-right"><div class="v2-route-overview-progress task-pool-hero-progress"><div class="v2-overview-ring"><strong>${stats.active.length}</strong><span>待用</span></div><div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:${items.length?Math.round((stats.done.length/items.length)*100):0}%"></span></div><small>${stats.done.length} 条已完成 · ${stats.scheduled.length} 条已安排</small></div></div></div>${routeDecorPair()}</div><div class="v2-overview-cards">${routeCard('icons-collage-v2/icon-note.png',stats.active.length,'待安排 / 想做')}${routeCard('icons-collage-v2/icon-goal.png',stats.scheduled.length,'已推到今天')}${routeCard('ui-icons-collage-v1/icon-alarm.png',stats.paused.length,'暂缓中')}${routeCard('icons-collage-v2/icon-daily-task.png',stats.projectCount,'项目型任务')}</div>${stats.focus.length?`<div class="v2-rhythm-tags" style="margin-top:10px">${stats.focus.map(item=>`<span class="v2-chip">${taskSticker(item,'v2-chip-sticker')} ${esc(item.title)}</span>`).join('')}</div>`:''}</div><div class="v2-route-mini-grid v2-route-mini-grid--pool"><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('taskPool','待命架')}</h3><div class="v2-mini-chip-grid">${shelfChips.map(([label,count])=>`<span class="v2-chip">${label} ${count}</span>`).join('')}</div><p class="hint">以后做、不急做、想做但今天不塞满的，都先留在这里。</p></div><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('taskPool','使用建议')}</h3><ul class="v2-mini-list"><li>先把模糊想法放进来</li><li>明天再挑 1-2 条进今日</li><li>太累的时候只看“待安排”</li></ul></div></div>${routePromptCard('taskPool','今天先做哪一步','任务池不是拖延，是给今天减负。先收住，再慢慢挑。',['先收进来','再挑 1 条进今天'])}<div class="v2-panel"><h3>＋ 加入任务池</h3><p class="hint">想做但不一定今天做的事先丢这里，后面再手动加入今日，或者让 AI 帮你挑。</p><div class="v2-fields"><input id="v2PoolTitle" placeholder="写下想做但不一定今天做的事"><div class="v2-grid"><label>状态<select id="v2PoolStatus"><option>想做</option><option selected>待安排</option><option>暂缓</option></select></label><label>类型<select id="v2PoolType"><option>临时</option><option>项目</option><option>每日</option><option>循环</option></select></label></div><textarea id="v2PoolNote" rows="3" placeholder="备注（选填）：比如为什么先放任务池、后面什么时候再碰"></textarea><div class="v2-row end"><button class="v2-primary" id="v2PoolAdd">加入任务池</button></div></div></div>${poolListHtml}`;
  document.getElementById('v2PoolAdd')?.addEventListener('click',addTaskPoolItemFromForm);
  target.querySelectorAll('[data-pool-schedule]').forEach(btn=>btn.addEventListener('click',()=>scheduleTaskPoolItem(btn.dataset.poolSchedule,todayStr())));
  target.querySelectorAll('[data-pool-pause]').forEach(btn=>btn.addEventListener('click',()=>toggleTaskPoolPause(btn.dataset.poolPause)));
  target.querySelectorAll('[data-pool-drop]').forEach(btn=>btn.addEventListener('click',()=>dropTaskPoolItem(btn.dataset.poolDrop)));
}
function renderDailyRoute(){
  if(routeState?.kind!=='daily')return;
  const body=document.getElementById('v2RouteBody');
  const section=document.getElementById('dailySection');
  if(!body||!section)return;
  body.querySelector('.v2-daily-route-shell')?.remove();
  const notify=notificationStatusSummary();
  const items=appData.tasks.filter(t=>t.type==='每日');
  const visibleItems=items.filter(task=>shouldShowDaily(task));
  const doneCount=items.filter(task=>task.completedToday).length;
  const restCount=items.filter(task=>!shouldShowDaily(task)&&!task.completedToday).length;
  const splitCount=items.filter(task=>String(task.subtask||'').trim()).length;
  const percent=visibleItems.length?Math.round(doneCount/visibleItems.length*100):0;
  const focusItems=items.filter(task=>!task.completedToday).slice(0,4);
  const morningItems=visibleItems.filter(task=>/早|晨|喝水|洗脸|英语|背/.test(`${task.title} ${task.subtask||''}`)).slice(0,3);
  const quoteTitle=pickRotatingCopy('daily','title',String(visibleItems.length));
  const quoteBody=pickRotatingCopy('daily','body',String(doneCount));
  const shell=document.createElement('div');
  shell.className='v2-daily-route-shell';
  shell.innerHTML=`
    <div class="v2-route-overview daily v2-route-ledger">
      <div class="v2-route-overview-main">
        <div>
          ${routeEyebrow('daily','每日任务')}
          <h3>${quoteTitle}</h3>
          <p>${quoteBody} 保留你现在的真实功能：打勾、最小行动、AI 拆分、时间设置和日历导出都还在。上面这块只负责先帮你扫一眼今天的节奏。</p>
        </div>
        <div class="daily-task-hero-right">
          <div class="v2-route-overview-progress daily-task-hero-progress">
            <div class="v2-overview-ring">
              <strong>${percent}%</strong>
              <span>今日完成度</span>
            </div>
            <div class="v2-overview-bar">
              <div class="v2-overview-bar-track"><span style="width:${percent}%"></span></div>
              <small>${doneCount} 项已完成 · ${Math.max(visibleItems.length-doneCount,0)} 项待处理</small>
            </div>
          </div>
        </div>
        ${routeDecorPair()}
      </div>
      <div class="v2-overview-cards">
        ${routeCard('ui-icons-collage-v1/icon-complete-badge.png',doneCount,'今日完成')}
        ${routeCard('icons-collage-v2/icon-daily-task.png',visibleItems.length,'今天显示')}
        ${routeCard('ui-icons-collage-v1/icon-bell.png',restCount,'今天休息')}
        ${routeCard('icons-collage-v2/icon-note.png',splitCount,'已拆最小行动')}
      </div>
      ${focusItems.length?`<div class="v2-route-overview-focus">${focusItems.map(item=>`<span class="v2-chip">${esc(item.title)}${item.subtask?` · ${esc(item.subtask)}`:''}</span>`).join('')}</div>`:''}
    </div>
    <div class="v2-route-mini-grid v2-route-mini-grid--daily">
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle('daily','今天先碰这些')}</h3>
        <div class="v2-mini-list">
          ${(morningItems.length?morningItems:focusItems).slice(0,3).map(item=>`<span class="v2-chip active">${esc(item.title)}</span>`).join('')||'<span class="v2-chip">先去下面新增一项</span>'}
        </div>
      </div>
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle('daily','小提醒')}</h3>
        <ul class="v2-mini-list"><li>先做最容易开始的一件</li><li>子任务拆短一点更好打勾</li><li>今天休息项不用硬推进</li></ul>
        <div class="v2-warning" style="margin-top:10px;padding:10px 12px">
          <div class="v2-day-title" style="font-size:13px!important">${esc(notify.label)}</div>
          <div class="v2-day-note" style="margin-top:4px">${esc(notify.detail)}</div>
          <div class="v2-row" style="margin-top:8px;gap:6px;flex-wrap:wrap"><button class="v2-secondary" id="v2DailyRouteCalendar">放进手机日历</button><button class="v2-secondary" id="v2DailyRouteAlarm">重挂闹钟</button><button class="v2-secondary" id="v2DailyRoutePermission">检测提醒权限</button>${notify.hasAlarm?'<button class="v2-secondary" id="v2DailyRouteExactAlarm">系统闹钟授权</button>':''}</div>
        </div>
      </div>
    </div>
    ${routePromptCard('daily','今天先保住节奏','每天都会碰的事不必一次全做完，先做一件最容易打勾的。',['先碰最容易开始的','子任务短一点更好打勾'])}
  `;
  body.insertBefore(shell,section);
  document.getElementById('v2DailyRouteCalendar')?.addEventListener('click',()=>openTaskTypeCalendar('每日'));
  document.getElementById('v2DailyRouteAlarm')?.addEventListener('click',()=>resyncTaskTypeReminder('每日'));
  document.getElementById('v2DailyRoutePermission')?.addEventListener('click',async()=>{const ok=await initNativeNotifications();toast(ok?'提醒权限已就绪':'提醒权限还没准备好');renderDailyRoute()});
  document.getElementById('v2DailyRouteExactAlarm')?.addEventListener('click',()=>requestExactAlarmPermission());
}
function renderProjectRoute(){
  if(routeState?.kind!=='project')return;
  const body=document.getElementById('v2RouteBody');
  const section=document.getElementById('projectSection');
  if(!body||!section)return;
  body.querySelector('.v2-project-route-shell')?.remove();
  const items=appData.tasks.filter(t=>t.type==='项目');
  const activeProjects=items.filter(task=>!(task.steps||[]).length||(task.steps||[]).some(step=>!step.done)).length;
  const completedProjects=items.filter(task=>(task.steps||[]).length&&(task.steps||[]).every(step=>step.done)).length;
  const timingProjects=items.filter(task=>task.isTiming).length;
  const totalSteps=items.reduce((sum,task)=>sum+(task.steps?.length||0),0);
  const doneSteps=items.reduce((sum,task)=>sum+((task.steps||[]).filter(step=>step.done).length),0);
  const percent=totalSteps?Math.round(doneSteps/totalSteps*100):0;
  const focusProjects=items.map(task=>{
    const nextStep=(task.steps||[]).find(step=>!step.done);
    return nextStep?{title:task.title,nextStep:nextStep.title}:null;
  }).filter(Boolean).slice(0,4);
  const methodLabels=['先列下一步','先开计时','先补一步资料'];
  const quoteTitle=pickRotatingCopy('project','title',String(items.length));
  const quoteBody=pickRotatingCopy('project','body',String(doneSteps));
  const shell=document.createElement('div');
  shell.className='v2-project-route-shell';
  shell.innerHTML=`
    <div class="v2-route-overview project v2-route-board">
      <div class="v2-route-overview-main">
        <div>
          ${routeEyebrow('project','项目推进')}
          <h3>${quoteTitle}</h3>
          <p>${quoteBody} 这里保留你原来的项目逻辑：步骤勾选、专注计时、AI 拆分、提醒和时间设置都还在。我只是把入口和摘要先整理成更好扫一眼的样子。</p>
        </div>
        <div class="project-task-hero-right">
          <div class="v2-route-overview-progress project-task-hero-progress">
            <div class="v2-overview-ring">
              <strong>${percent}%</strong>
              <span>步骤完成度</span>
            </div>
            <div class="v2-overview-bar">
              <div class="v2-overview-bar-track"><span style="width:${percent}%"></span></div>
              <small>${doneSteps} / ${totalSteps} 步已完成 · ${activeProjects} 个项目推进中</small>
            </div>
          </div>
        </div>
        ${routeDecorPair()}
      </div>
      <div class="v2-overview-cards">
        ${routeCard('icons-collage-v2/icon-goal.png',items.length,'项目总数')}
        ${routeCard('icons-collage-v2/icon-note.png',activeProjects,'推进中')}
        ${routeCard('ui-icons-collage-v1/icon-complete-badge.png',completedProjects,'已完成')}
        ${routeCard('ui-icons-collage-v1/icon-alarm.png',timingProjects,'正在专注')}
      </div>
      ${focusProjects.length?`<div class="v2-route-overview-focus">${focusProjects.map(item=>`<span class="v2-chip">下一步：${esc(item.title)} · ${esc(item.nextStep)}</span>`).join('')}</div>`:''}
    </div>
    <div class="v2-route-mini-grid v2-route-mini-grid--project">
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle('project','推进方式')}</h3>
        <div class="v2-mini-chip-grid">${methodLabels.map(label=>`<span class="v2-chip active">${label}</span>`).join('')}</div>
        <p class="hint">大项目不求一口气做完，先把“下一步”变具体，推进感就会明显很多。</p>
      </div>
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle('project','当前焦点')}</h3>
        <div class="v2-mini-list">${focusProjects.map(item=>`<span class="v2-chip">${esc(item.title)} · ${esc(item.nextStep)}</span>`).join('')||'<span class="v2-chip">先新增一个项目</span>'}</div>
        <div class="v2-row" style="margin-top:10px;gap:6px"><button class="v2-secondary" id="v2ProjectRouteCalendar">放进手机日历</button><button class="v2-secondary" id="v2ProjectRouteAlarm">重挂闹钟</button></div>
      </div>
    </div>
    ${routePromptCard('project','把下一步写清楚','项目推进感，往往来自“下一步”足够具体，而不是一下做很多。',['先列下一步','再开计时'])}
    <div class="v2-panel">
      <h3>${routeMiniTitle('project','使用方式')}</h3>
      <p class="hint">先看上面的项目摘要，再往下进具体卡片。你原来的项目步骤、专注按钮、提醒和 AI 拆分都还是原位可用的。</p>
      <div class="v2-row end">
        <button class="v2-secondary" id="v2ProjectQuickAdd">新增项目</button>
      </div>
    </div>
  `;
  body.insertBefore(shell,section);
  document.getElementById('v2ProjectQuickAdd')?.addEventListener('click',()=>{
    const input=document.getElementById('projectSection-title');
    input?.focus();
    input?.scrollIntoView({behavior:'smooth',block:'center'});
  });
  document.getElementById('v2ProjectRouteCalendar')?.addEventListener('click',()=>openTaskTypeCalendar('项目'));
  document.getElementById('v2ProjectRouteAlarm')?.addEventListener('click',()=>resyncTaskTypeReminder('项目'));
}
function renderCyclicRoute(){
  if(routeState?.kind!=='cyclic')return;
  const body=document.getElementById('v2RouteBody');
  const section=document.getElementById('cyclicSection');
  if(!body||!section)return;
  body.querySelector('.v2-cyclic-route-shell')?.remove();
  const items=appData.tasks.filter(t=>t.type==='循环');
  const overdueCount=items.filter(task=>todayStr()>=getCyclicNext(task)).length;
  const dueSoonCount=items.filter(task=>{
    const next=getCyclicNext(task);
    const diff=Math.round((new Date(next)-new Date(todayStr()))/86400000);
    return diff>0&&diff<=2;
  }).length;
  const avgCycle=items.length?Math.round(items.reduce((sum,task)=>sum+Number(task.cycleDays||0),0)/items.length):0;
  const soonItems=items.slice().sort((a,b)=>String(getCyclicNext(a)).localeCompare(String(getCyclicNext(b)))).slice(0,3);
  const quoteTitle=pickRotatingCopy('cyclic','title',String(overdueCount));
  const quoteBody=pickRotatingCopy('cyclic','body',String(dueSoonCount));
  const shell=document.createElement('div');
  shell.className='v2-cyclic-route-shell';
  shell.innerHTML=`
    <div class="v2-route-overview cyclic v2-route-stack">
      <div class="v2-route-overview-main">
        <div>
          ${routeEyebrow('cyclic','循环琐事')}
          <h3>${quoteTitle}</h3>
          <p>${quoteBody} 下面还是你原来的真实循环任务卡。这里先把“今天到期多少、快到期多少、平均周期多少天”提炼出来，省得你一张张翻。</p>
        </div>
        <div class="v2-route-overview-progress">
          <div class="v2-overview-ring">
            <strong>${items.length}</strong>
            <span>循环任务</span>
          </div>
          <div class="v2-overview-bar">
            <div class="v2-overview-bar-track"><span style="width:${items.length?Math.min(100,Math.round(overdueCount/items.length*100)):0}%"></span></div>
            <small>${overdueCount} 项今天该碰 · ${dueSoonCount} 项快到期</small>
          </div>
        </div>
        ${routeOverviewAside('cyclic','收尾顺序',['先做今天到期的',dueSoonCount?`${dueSoonCount} 项两天内快到期`:'没到期的先别硬加压',soonItems[0]?.title?`先收：${soonItems[0].title}`:'先在下面加一项循环琐事'])}${routeMascot('cyclic','is-right')}${routeDecorPair()}
      </div>
      <div class="v2-overview-cards">
        ${routeCard('ui-icons-collage-v1/icon-alarm.png',overdueCount,'今天到期')}
        ${routeCard('icons-collage-v2/icon-focus.png',dueSoonCount,'两天内到期')}
        ${routeCard('icons-collage-v2/icon-all.png',items.length,'全部循环项')}
        ${routeCard('icons-collage-v2/icon-note.png',avgCycle||0,'平均周期 / 天')}
      </div>
    </div>
    <div class="v2-route-mini-grid v2-route-mini-grid--cyclic">
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle('cyclic','最近该收的')}</h3>
        <div class="v2-mini-list">${soonItems.map(item=>`<span class="v2-chip">${esc(item.title)} · ${esc(fmtDate(getCyclicNext(item)))}</span>`).join('')||'<span class="v2-chip">先在下面加一项循环琐事</span>'}</div>
      </div>
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle('cyclic','收尾顺序')}</h3>
        <ul class="v2-mini-list"><li>先做今天到期的</li><li>再碰两天内会过期的</li><li>没到期的先别给自己加压</li></ul>
        <div class="v2-row" style="margin-top:10px;gap:6px"><button class="v2-secondary" id="v2CyclicRouteCalendar">放进手机日历</button><button class="v2-secondary" id="v2CyclicRouteAlarm">重挂闹钟</button></div>
      </div>
    </div>
    ${routePromptCard('cyclic','今天先收一小件','先收掉今天到期的，再看快到期的，别让循环小事一直挂在脑子里。',['先看今天到期','再看两天内会到期'])}
  `;
  body.insertBefore(shell,section);
  document.getElementById('v2CyclicRouteCalendar')?.addEventListener('click',()=>openTaskTypeCalendar('循环'));
  document.getElementById('v2CyclicRouteAlarm')?.addEventListener('click',()=>resyncTaskTypeReminder('循环'));
}
function renderTempRoute(){
  if(routeState?.kind!=='temp')return;
  const body=document.getElementById('v2RouteBody');
  const section=document.getElementById('tempSection');
  if(!body||!section)return;
  body.querySelector('.v2-temp-route-shell')?.remove();
  const items=appData.tasks.filter(t=>t.type==='临时'&&!t.hiddenToday);
  const doneCount=items.filter(task=>task.completed).length;
  const pinnedCount=items.filter(task=>task.pinned).length;
  const deadlineCount=items.filter(task=>task.deadline).length;
  const urgentCount=items.filter(task=>task.deadline&&daysUntil(task.deadline)<=1).length;
  const smartTop=items.slice().sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||calcTempScore(b)-calcTempScore(a)).slice(0,4);
  const softRules=['先做必做项','能延期就别硬塞','太碎的先扔回任务池'];
  const quoteTitle=pickRotatingCopy('temp','title',String(urgentCount));
  const quoteBody=pickRotatingCopy('temp','body',String(pinnedCount));
  const shell=document.createElement('div');
  shell.className='v2-temp-route-shell';
  shell.innerHTML=`
    <div class="v2-route-overview temp v2-route-cluster">
      <div class="v2-route-overview-main">
        <div>
          ${routeEyebrow('temp','临时任务')}
          <h3>${quoteTitle}</h3>
          <p>${quoteBody} 这里继续沿用你现在的优先级、必做、推迟、截止时间和闹钟逻辑。我只是先把最紧急的一层放到上面，减少信息噪音。</p>
        </div>
        <div class="temp-task-hero-right">
          <div class="v2-route-overview-progress temp-task-hero-progress">
            <div class="v2-overview-ring">
              <strong>${items.length}</strong>
              <span>临时事项</span>
            </div>
            <div class="v2-overview-bar">
              <div class="v2-overview-bar-track"><span style="width:${items.length?Math.round((urgentCount/items.length)*100):0}%"></span></div>
              <small>${urgentCount} 项紧急 · ${pinnedCount} 项标记必做</small>
            </div>
          </div>
        </div>
        ${routeDecorPair()}
      </div>
      <div class="v2-overview-cards">
        ${routeCard('icons-collage-v2/icon-pomodoro.png',pinnedCount,'必做')}
        ${routeCard('ui-icons-collage-v1/icon-alarm.png',urgentCount,'紧急 / 截止近')}
        ${routeCard('icons-collage-v2/icon-note.png',deadlineCount,'已设截止时间')}
        ${routeCard('ui-icons-collage-v1/icon-complete-badge.png',doneCount,'已完成')}
      </div>
      ${smartTop.length?`<div class="v2-route-overview-focus">${smartTop.map(item=>`<span class="v2-chip ${item.pinned?'active':''}">${esc(item.title)}</span>`).join('')}</div>`:''}
    </div>
    <div class="v2-route-mini-grid v2-route-mini-grid--temp">
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle('temp','先看这几条')}</h3>
        <div class="v2-mini-list">${smartTop.map(item=>`<span class="v2-chip ${item.pinned?'active':''}">${esc(item.title)}</span>`).join('')||'<span class="v2-chip">今天临时任务不多</span>'}</div>
      </div>
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle('temp','减压规则')}</h3>
        <div class="v2-mini-chip-grid">${softRules.map(rule=>`<span class="v2-chip">${rule}</span>`).join('')}</div>
        <div class="v2-row" style="margin-top:10px;gap:6px"><button class="v2-secondary" id="v2TempRouteCalendar">放进手机日历</button><button class="v2-secondary" id="v2TempRouteAlarm">重挂闹钟</button></div>
      </div>
    </div>
    ${routePromptCard('temp','先清掉最刺眼的一件','临时事不是都要立刻做，先挑真的急的，别被噪音推着跑。',['先做必做项','能延期就别硬塞'])}
  `;
  body.insertBefore(shell,section);
  document.getElementById('v2TempRouteCalendar')?.addEventListener('click',()=>openTaskTypeCalendar('临时'));
  document.getElementById('v2TempRouteAlarm')?.addEventListener('click',()=>resyncTaskTypeReminder('临时'));
}
function renderFoodRoute(){
  const target=routeState?.kind==='food'?document.getElementById('v2RouteBody'):document.getElementById('foodLogList');
  if(!target)return;
  const date=selectedDay||todayStr(),logs=getEatingLogs(date),recent=recentLogs(getEatingLogs(),6),summary=eatingWeeklySummary();
  target.innerHTML=`
    <div class="v2-route-overview rhythm v2-route-softgrid v2-route-overview-food">
      <div class="v2-route-overview-main">
        <div>
          ${routeEyebrow('food','饮食波动记录')}
          <h3>${pickRotatingCopy('rhythm','title',`food-${summary.weekCount}`)}</h3>
          <p>不是管你吃，而是把“什么时候容易失控、为什么会想吃、吃完之后感觉怎样”收住。这样 AI 复盘时才能看见压力、心情和暴饮暴食之间的关系。</p>
        </div>
        <div class="v2-route-overview-progress">
          <div class="v2-overview-ring"><strong>${summary.weekCount}</strong><span>近 7 天记录</span></div>
          <div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:${Math.min(100,summary.weekCount*14)}%"></span></div><small>今天 ${logs.length} 条 · 失控 / 暴食 ${summary.heavyCount} 次</small></div>
        </div>
        ${routeOverviewAside('food','先抓诱因',['什么时候开始想吃',summary.topTrigger?`最近最常见：${summary.topTrigger}`:'先抓停不下来的节点',summary.heavyCount?`近 7 天失控 ${summary.heavyCount} 次`:'先记第一条也有价值'])}${routeMascot('food','is-right')}${routeDecorPair()}
      </div>
      <div class="v2-overview-cards">
        ${routeCard(DETAIL_ICON_ART.food,logs.length,'今天记了几次')}
        ${routeCard(DETAIL_ICON_ART.mood,summary.topTrigger,'最常见诱因')}
        ${routeCard('icons-collage-v2/icon-goal.png',summary.heavyCount,'近 7 天失控次数')}
        ${routeCard('icons-collage-v2/icon-note.png',recent.length,'最近可回看')}
      </div>
    </div>
    <div class="v2-route-mini-grid v2-route-mini-grid--rhythm">
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle('food','今天先记这个')}</h3>
        <div class="v2-mini-chip-grid"><span class="v2-chip active">什么时候开始想吃</span><span class="v2-chip">当时心情</span><span class="v2-chip">诱因是什么</span></div>
        <p class="hint">哪怕只写一句“回家后停不下来”，后面复盘都会有用。</p>
      </div>
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle('food','AI 复盘会看')}</h3>
        <div class="v2-mini-chip-grid"><span class="v2-chip">情绪</span><span class="v2-chip">当天经过</span><span class="v2-chip">频率变化</span></div>
        <div class="v2-row end" style="margin-top:10px"><button class="v2-secondary" id="v2FoodOpenReview">交给 AI 复盘</button></div>
      </div>
    </div>
    ${routePromptCard('food','先抓诱因，不用自责','记录不是为了苛责自己，是为了看见：压力大、回家、太晚、太累的时候，你最容易在哪个点失守。',['先记节点','再看诱因'],'v2FoodQuickSave','记这一条')}
    <div class="v2-panel">
      <h3>${routeMiniTitle('food','记下这一餐 / 这一下')}</h3>
      <div class="v2-fields">
        <div class="v2-grid">
          <label>大概时间<input id="v2FoodMoment" placeholder="例如：回家后 / 晚上 10 点"></label>
          <label>程度<select id="v2FoodLevel"><option>普通吃饭</option><option>想吃很多</option><option>停不下来</option><option>暴食 / 失控</option></select></label>
        </div>
        <div class="v2-grid">
          <label>当时心情<input id="v2FoodMood" placeholder="例如：烦、空、累、想奖励自己"></label>
          <label>诱因<input id="v2FoodTrigger" placeholder="例如：压力大 / 回家松下来 / 熬夜"></label>
        </div>
        <textarea id="v2FoodNote" rows="3" placeholder="吃了什么、当时发生了什么、吃完后感觉怎样，都可以写一句。"></textarea>
        <div class="v2-row end"><button class="v2-primary" id="v2FoodSave">保存这条饮食记录</button></div>
      </div>
    </div>
    <div class="v2-panel">
      <h3>${routeMiniTitle('food','最近这些节点')}</h3>
      <div class="v2-day-sheet-list">${recent.length?recent.map(item=>`<div class="v2-day-item todo"><div class="v2-day-main"><div class="v2-day-headline"><div class="v2-day-title">${taskSticker({title:item.level||'饮食记录'},'v2-task-sticker')}<span class="v2-day-title-text">${esc(item.level||'饮食记录')}</span></div><span class="v2-day-status todo">${esc(item.date)}</span></div><div class="v2-day-meta-pills">${metaPill(DETAIL_ICON_ART.food,item.moment||'时间未写','soft')}${item.mood?metaPill(DETAIL_ICON_ART.mood,item.mood,'soft'):''}${item.trigger?metaPill(DETAIL_ICON_ART.factor,item.trigger,'pool'):''}</div>${item.note?`<div class="v2-day-note">${esc(item.note)}</div>`:''}</div></div>`).join(''):'<div class="v2-empty v2-empty-cat">还没有饮食节点记录<br>先记第一次，后面才能看出频率</div>'}</div>
    </div>
  `;
  document.getElementById('v2FoodSave')?.addEventListener('click',saveFoodRouteEntry);
  document.getElementById('v2FoodQuickSave')?.addEventListener('click',saveFoodRouteEntry);
  document.getElementById('v2FoodOpenReview')?.addEventListener('click',()=>switchRouteModule('reviewSection'));
}
function renderLateNightRoute(){
  const target=routeState?.kind==='lateNight'?document.getElementById('v2RouteBody'):document.getElementById('lateNightLogList');
  if(!target)return;
  const date=selectedDay||todayStr(),logs=getLateNightLogs(date),recent=recentLogs(getLateNightLogs(),6),summary=lateNightWeeklySummary();
  target.innerHTML=`
    <div class="v2-route-overview rhythm home v2-route-softgrid v2-route-overview-night">
      <div class="v2-route-overview-main">
        <div>
          ${routeEyebrow('lateNight','熬夜节点记录')}
          <h3>${pickRotatingCopy('home','title',`night-${summary.after3Count}`)}</h3>
          <p>不是只记“睡得晚”，而是记清楚为什么会拖到凌晨 3、4 点。后面 AI 复盘就能把熬夜、情绪、任务压力和白天节奏串在一起看。</p>
        </div>
        <div class="v2-route-overview-progress">
          <div class="v2-overview-ring"><strong>${summary.weekCount}</strong><span>近 7 天熬夜点</span></div>
          <div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:${Math.min(100,summary.weekCount*14)}%"></span></div><small>凌晨 3 点后 ${summary.after3Count} 次 · 今天 ${logs.length} 条</small></div>
        </div>
        ${routeOverviewAside('lateNight','今晚先看',['几点还没睡',summary.topTrigger?`最常见原因：${summary.topTrigger}`:'先记住拖晚的那个点',summary.after3Count?`近 7 天 3 点后 ${summary.after3Count} 次`:'先抓第一次拖到很晚的时间'])}${routeMascot('lateNight','is-right')}${routeDecorPair()}
      </div>
      <div class="v2-overview-cards">
        ${routeCard(DETAIL_ICON_ART.sleep,logs.length,'今天记了几次')}
        ${routeCard('ui-icons-collage-v1/icon-alarm.png',summary.after3Count,'3 点后入睡')}
        ${routeCard(DETAIL_ICON_ART.factor,summary.topTrigger,'最常见原因')}
        ${routeCard(DETAIL_ICON_ART.battery,recent[0]?.nextDay||'待记录','次日电量')}
      </div>
    </div>
    <div class="v2-route-mini-grid v2-route-mini-grid--rhythm">
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle('lateNight','今晚先看这个')}</h3>
        <div class="v2-mini-chip-grid"><span class="v2-chip active">几点还没去睡</span><span class="v2-chip">为什么拖住</span><span class="v2-chip">第二天状态</span></div>
        <p class="hint">不需要长文，抓住那个“本来想睡却继续拖”的节点就够了。</p>
      </div>
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle('lateNight','AI 复盘会看')}</h3>
        <div class="v2-mini-chip-grid"><span class="v2-chip">熬夜频率</span><span class="v2-chip">诱因</span><span class="v2-chip">次日后果</span></div>
        <div class="v2-row end" style="margin-top:10px"><button class="v2-secondary" id="v2NightOpenReview">交给 AI 复盘</button></div>
      </div>
    </div>
    ${routePromptCard('lateNight','先抓住拖晚的那个点','你不是单纯不自律，很多时候是白天太压、回家太松、情绪太满，夜里才开始补偿自己。',['几点还没睡','为什么还不想睡'],'v2NightQuickSave','记这一条')}
    <div class="v2-panel">
      <h3>${routeMiniTitle('lateNight','记下这次熬夜')}</h3>
      <div class="v2-fields">
        <div class="v2-grid">
          <label>大概几点睡<input id="v2NightBedtime" type="time"></label>
          <label>第二天状态<select id="v2NightNextDay"><option>还行</option><option>困</option><option>很困</option><option>直接低电量</option></select></label>
        </div>
        <div class="v2-grid">
          <label>为什么拖晚<input id="v2NightTrigger" placeholder="例如：刷手机 / 不想结束今天 / 工作拖晚"></label>
          <label>当时心情<input id="v2NightMood" placeholder="例如：空、烦、停不下来、舍不得睡"></label>
        </div>
        <textarea id="v2NightNote" rows="3" placeholder="可以写：那天发生了什么、为什么停不下来、第二天有什么影响。"></textarea>
        <div class="v2-row end"><button class="v2-primary" id="v2NightSave">保存这条熬夜记录</button></div>
      </div>
    </div>
    <div class="v2-panel">
      <h3>${routeMiniTitle('lateNight','最近这些熬夜点')}</h3>
      <div class="v2-day-sheet-list">${recent.length?recent.map(item=>`<div class="v2-day-item todo"><div class="v2-day-main"><div class="v2-day-headline"><div class="v2-day-title">${taskSticker({title:'熬夜记录'},'v2-task-sticker')}<span class="v2-day-title-text">${esc(item.bedtime||'时间未写')}</span></div><span class="v2-day-status deferred">${esc(item.date)}</span></div><div class="v2-day-meta-pills">${metaPill(DETAIL_ICON_ART.sleep,item.bedtime||'几点睡','time')}${item.nextDay?metaPill(DETAIL_ICON_ART.battery,item.nextDay,'soft'):''}${item.trigger?metaPill(DETAIL_ICON_ART.factor,item.trigger,'pool'):''}</div>${item.note?`<div class="v2-day-note">${esc(item.note)}</div>`:''}</div></div>`).join(''):'<div class="v2-empty v2-empty-cat">还没有熬夜节点记录<br>先把第一次拖晚的时间记下来</div>'}</div>
    </div>
  `;
  document.getElementById('v2NightSave')?.addEventListener('click',saveLateNightRouteEntry);
  document.getElementById('v2NightQuickSave')?.addEventListener('click',saveLateNightRouteEntry);
  document.getElementById('v2NightOpenReview')?.addEventListener('click',()=>switchRouteModule('reviewSection'));
}
function saveFoodRouteEntry(){
  const date=selectedDay||todayStr();
  const moment=document.getElementById('v2FoodMoment')?.value.trim()||'待补';
  const level=document.getElementById('v2FoodLevel')?.value||'普通吃饭';
  const trigger=document.getElementById('v2FoodTrigger')?.value.trim()||'';
  const mood=document.getElementById('v2FoodMood')?.value.trim()||'';
  const note=document.getElementById('v2FoodNote')?.value.trim()||'';
  if(!moment&&!trigger&&!mood&&!note){toast('至少写下一点节点信息');return}
  saveEatingLog({date,moment,level,trigger,mood,note,source:'food-route'});
  renderFoodRoute();
  toast('已记下这次饮食节点')
}
function saveLateNightRouteEntry(){
  const date=selectedDay||todayStr();
  const bedtime=document.getElementById('v2NightBedtime')?.value||'';
  const trigger=document.getElementById('v2NightTrigger')?.value.trim()||'';
  const mood=document.getElementById('v2NightMood')?.value.trim()||'';
  const nextDay=document.getElementById('v2NightNextDay')?.value||'还行';
  const note=document.getElementById('v2NightNote')?.value.trim()||'';
  if(!bedtime&&!trigger&&!mood&&!note){toast('至少写下一点熬夜节点');return}
  saveLateNightLog({date,bedtime,trigger,mood,nextDay,note,source:'late-night-route'});
  renderLateNightRoute();
  toast('已记下这次熬夜节点')
}
window.renderDailyRouteShell=renderDailyRoute;
window.renderProjectRouteShell=renderProjectRoute;
window.renderCyclicRouteShell=renderCyclicRoute;
window.renderTempRouteShell=renderTempRoute;
function renderLifeRhythmRoute(){
  const target=routeState?.kind==='rhythm'?document.getElementById('v2RouteBody'):document.getElementById('rhythmList');
  if(!target)return;
  const date=selectedDay||todayStr(),entry=getLifeRhythmEntry(date,true),overview=deriveLifeRhythmOverview(entry,date),emergency=appData.v2.lifeRhythm.emergencyKit;
  const foodToday=getEatingLogs(date),foodWeek=eatingWeeklySummary();
  const lateNightToday=getLateNightLogs(date),lateNightWeek=lateNightWeeklySummary();
  const quoteTitle=pickRotatingCopy('rhythm','title',String(overview.completionPercent));
  const quoteBody=pickRotatingCopy('rhythm','body',overview.energyLabel||'');
  target.innerHTML=`
    <div class="v2-route-overview rhythm ${overview.lowEnergy?'home':''} v2-route-softgrid home-mode-hero">
      <div class="v2-route-overview-main">
        <div>
          ${routeEyebrow('rhythm','生活能量')}
          <h3>${overview.lowEnergy?quoteTitle:'把状态记清楚，后面安排任务会更贴心'}</h3>
          <p>${overview.lowEnergy?quoteBody:'状态越记得顺手，AI 后面越知道什么时候该轻一点，什么时候可以帮你往前推。'} 下面这些卡片会帮你把累、乱、卡的原因记下来。</p>
        </div>
        <div class="v2-route-overview-progress">
          <div class="v2-overview-ring">
            <strong>${overview.completionPercent}%</strong>
            <span>今天推进度</span>
          </div>
          <div class="v2-overview-bar">
            <div class="v2-overview-bar-track"><span style="width:${overview.completionPercent}%"></span></div>
            <small>${esc(overview.energyLabel)} · ${esc(overview.rhythmLabel)} · ${esc(overview.factors.slice(0,2).join('、')||'待补充')}</small>
          </div>
        </div>
        ${routeOverviewAside('rhythm','状态提醒',['先记原因，再决定排多少',overview.factors[0]?`当前主要受 ${overview.factors[0]} 影响`:'先把今天状态记清楚',overview.lowEnergy?'低电量时先恢复':'状态允许时可以轻推一项'])}${overview.lowEnergy?routeHeroDecor('rhythm'):''}${routeMascot('rhythm','is-right')}${routeDecorPair()}
      </div>
      <div class="v2-overview-cards">
        ${routeCard(DETAIL_ICON_ART.battery,esc(overview.energyLabel),'当前电量')}
        ${routeCard(DETAIL_ICON_ART.rhythm,esc(overview.rhythmLabel),'今日节奏')}
        ${routeCard('ui-icons-collage-v1/icon-complete-badge.png',`${overview.completionPercent}%`,'完成度')}
        ${routeCard(DETAIL_ICON_ART.factor,esc(overview.factors.length||0),'已记录因素')}
      </div>
    </div>
    <div class="v2-route-mini-grid v2-route-mini-grid--rhythm">
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle('rhythm','先做轻一点')}</h3>
        <div class="v2-mini-chip-grid">${(overview.lowEnergy?emergency.quick.slice(0,3):emergency.short.slice(0,3)).map(x=>`<span class="v2-chip active">${esc(x)}</span>`).join('')}</div>
      </div>
      <div class="v2-panel v2-mini-note">
        <h3>${routeMiniTitle('rhythm','今天这句')}</h3>
        <p class="hint">${esc(overview.aiNote)}</p>
      </div>
    </div>
    <div class="v2-route-mini-grid v2-route-mini-grid--rhythm-log">
      <button class="v2-panel v2-mini-note v2-rhythm-side-entry" id="v2OpenFoodSection" type="button">
        <h3>${routeMiniTitle('food','饮食波动记录')}</h3>
        <div class="v2-mini-chip-grid"><span class="v2-chip active">今天 ${foodToday.length} 条</span><span class="v2-chip">近 7 天 ${foodWeek.weekCount} 条</span></div>
        <p class="hint">${esc(foodToday[0]?.trigger||foodWeek.topTrigger||'先抓住什么时候开始停不下来')}</p>
      </button>
      <button class="v2-panel v2-mini-note v2-rhythm-side-entry" id="v2OpenLateNightSection" type="button">
        <h3>${routeMiniTitle('lateNight','熬夜节点记录')}</h3>
        <div class="v2-mini-chip-grid"><span class="v2-chip active">今天 ${lateNightToday.length} 条</span><span class="v2-chip">3 点后 ${lateNightWeek.after3Count} 次</span></div>
        <p class="hint">${esc(lateNightToday[0]?.trigger||lateNightWeek.topTrigger||'先记住“明明该睡了却还没睡”的点')}</p>
      </button>
    </div>
    ${routePromptCard('rhythm',overview.lowEnergy?'先把自己照顾好':'先把状态记清楚','状态不是借口，是今天安排任务的依据。先记录，再决定怎么推进。',(overview.lowEnergy?emergency.quick:emergency.short).slice(0,2),'v2RhythmQuickFlowTop','快速记录今天')}
    <div class="v2-panel v2-rhythm-home">
      <div class="v2-rhythm-hero">
        <div>
          <h3>${routeMiniTitle('rhythm','今日状态总览')}</h3>
          <p class="hint">上面是今天的结果，下面这些卡片记录的是原因。记得越顺手，AI 之后越懂你。</p>
        </div>
        <span class="v2-rhythm-badge ${overview.lowEnergy?'low':'normal'}">${esc(overview.energyLabel)}</span>
      </div>
      <div class="v2-rhythm-overview-grid">
        <div class="v2-rhythm-overview-item"><b>${routeInfoLabel(DETAIL_ICON_ART.battery,'今日电量')}</b><span>${esc(overview.energyLabel)}</span></div>
        <div class="v2-rhythm-overview-item"><b>${routeInfoLabel(DETAIL_ICON_ART.rhythm,'今日节奏')}</b><span>${esc(overview.rhythmLabel)}</span></div>
        <div class="v2-rhythm-overview-item"><b>${routeInfoLabel('ui-icons-collage-v1/icon-complete-badge.png','任务完成度')}</b><span>${overview.completionPercent}%</span></div>
        <div class="v2-rhythm-overview-item"><b>${routeInfoLabel(DETAIL_ICON_ART.factor,'主要影响因素')}</b><span>${esc(overview.factors.join('、')||'今天还没记录')}</span></div>
      </div>
      ${renderEnergyManualControls(entry,overview)}
      <div class="v2-rhythm-ai-note">${esc(overview.aiNote)}</div>
      <div class="v2-row end" style="margin-top:10px"><button class="v2-primary" id="v2RhythmQuickFlow">快速记录今天</button></div>
    </div>
    <details class="v2-panel v2-rhythm-card" open>
      <summary><div><h3>😴 睡眠记录</h3><p>${esc(rhythmSummaryText(entry,'sleep'))}</p></div><span>展开填写</span></summary>
      <div class="v2-grid">
        <label>上床时间<input id="v2RhythmBedTime" type="time" value="${entry.bedTime||''}"></label>
        <label>大概入睡<input id="v2RhythmSleepStart" type="time" value="${entry.sleepStart||''}"></label>
        <label>起床时间<input id="v2RhythmWakeTime" type="time" value="${entry.wakeTime||''}"></label>
        <label>睡眠时长<input value="${esc(entry.sleepStart&&entry.wakeTime?sleepDurationText(entry.sleepStart,entry.wakeTime):'')}" disabled></label>
      </div>
      <div class="v2-rhythm-scale">${['好','一般','差'].map(x=>`<button class="v2-rhythm-pill ${entry.sleepQuality===x?'active':''}" data-rhythm-field="sleepQuality" data-value="${x}">${x}</button>`).join('')}</div>
      <div class="v2-rhythm-scale" style="margin-top:8px">${['是','否'].map(x=>`<button class="v2-rhythm-pill ${entry.stayedUpLate===x?'active':''}" data-rhythm-field="stayedUpLate" data-value="${x}">熬夜 ${x}</button>`).join('')}${['清醒','一般','很困'].map(x=>`<button class="v2-rhythm-pill ${entry.wakeState===x?'active':''}" data-rhythm-field="wakeState" data-value="${x}">醒来 ${x}</button>`).join('')}</div>
      <label class="v2-rhythm-note">备注<textarea id="v2RhythmSleepNote" rows="2" placeholder="比如：夜里醒了两次">${esc(entry.sleepNote||'')}</textarea></label>
      <div class="v2-row end"><button class="v2-primary" data-rhythm-save="sleep">保存睡眠记录</button></div>
    </details>
    <details class="v2-panel v2-rhythm-card">
      <summary><div><h3>💪 身体状态记录</h3><p>${esc(rhythmSummaryText(entry,'body'))}</p></div><span>展开填写</span></summary>
      <div class="v2-rhythm-scale">${['好','一般','疲惫','不舒服'].map(x=>`<button class="v2-rhythm-pill ${entry.bodyState===x?'active':''}" data-rhythm-field="bodyState" data-value="${x}">${x}</button>`).join('')}</div>
      <div class="v2-rhythm-scale" style="margin-top:8px">${[1,2,3,4,5].map(x=>`<button class="v2-rhythm-pill ${Number(entry.fatigueScore||0)===x?'active':''}" data-rhythm-field="fatigueScore" data-value="${x}">疲惫 ${x}</button>`).join('')}</div>
      <div class="v2-rhythm-field"><b>身体不适</b>${renderChipOptions(DISCOMFORT_OPTIONS,'discomfortTags',entry.discomfortTags||[],'interrupt')}</div>
      <div class="v2-rhythm-field"><b>今日活动</b>${renderChipOptions(MOVEMENT_OPTIONS,'movementType',entry.movementType?[entry.movementType]:[],'soft')}</div>
      <label class="v2-rhythm-note">备注<textarea id="v2RhythmBodyNote" rows="2" placeholder="比如：今天眼睛很酸，坐久了肩颈紧">${esc(entry.bodyNote||'')}</textarea></label>
      <div class="v2-row end"><button class="v2-primary" data-rhythm-save="body">保存身体状态</button></div>
    </details>
    <details class="v2-panel v2-rhythm-card">
      <summary><div><h3>💭 心情状态记录</h3><p>${esc(rhythmSummaryText(entry,'mood'))}</p></div><span>展开填写</span></summary>
      <div class="v2-rhythm-scale">${['开心','平静','焦虑','烦躁','低落','混乱'].map(x=>`<button class="v2-rhythm-pill ${entry.moodState===x?'active':''}" data-rhythm-field="moodState" data-value="${x}">${x}</button>`).join('')}</div>
      <div class="v2-rhythm-scale" style="margin-top:8px">${[1,2,3,4,5].map(x=>`<button class="v2-rhythm-pill ${Number(entry.moodScore||0)===x?'active':''}" data-rhythm-field="moodScore" data-value="${x}">心情 ${x}</button>`).join('')}</div>
      <div class="v2-rhythm-field"><b>让心情变好的事情</b>${renderChipOptions(MOOD_GOOD_OPTIONS,'moodGoodTags',entry.moodGoodTags||[],'soft')}</div>
      <div class="v2-rhythm-field"><b>让心情变差的事情</b>${renderChipOptions(MOOD_BAD_OPTIONS,'moodBadTags',entry.moodBadTags||[],'drain')}</div>
      <label class="v2-rhythm-note">备注<textarea id="v2RhythmMoodNote" rows="2" placeholder="比如：完成了一件事后轻松很多">${esc(entry.moodNote||'')}</textarea></label>
      <div class="v2-row end"><button class="v2-primary" data-rhythm-save="mood">保存心情状态</button></div>
    </details>
    <details class="v2-panel v2-rhythm-card">
      <summary><div><h3>🧭 今日节奏记录</h3><p>${esc(rhythmSummaryText(entry,'rhythm'))}</p></div><span>展开填写</span></summary>
      <div class="v2-rhythm-scale">${['很顺','一般','有点卡','很乱','被打乱'].map(x=>`<button class="v2-rhythm-pill ${entry.rhythm===x?'active':''}" data-rhythm-field="rhythm" data-value="${x}">${x}</button>`).join('')}</div>
      <div class="v2-rhythm-scale" style="margin-top:8px">${['高','中','低'].map(x=>`<button class="v2-rhythm-pill ${entry.control===x?'active':''}" data-rhythm-field="control" data-value="${x}">掌控感 ${x}</button>`).join('')}</div>
      <label class="v2-rhythm-range">今日任务完成度 <output id="v2RhythmCompletionOutput">${esc(entry.completionPercent||overview.completionPercent)}</output>%<input id="v2RhythmCompletionPercent" type="range" min="0" max="100" step="5" value="${esc(entry.completionPercent||overview.completionPercent)}"></label>
      <div class="v2-rhythm-field"><b>影响节奏的因素</b>${renderChipOptions(INTERRUPT_OPTIONS,'rhythmFactors',entry.rhythmFactors||[],'interrupt')}</div>
      <label class="v2-rhythm-note">今天最卡的任务<textarea id="v2RhythmStuckTask" rows="2" placeholder="比如：整理主包资料">${esc(entry.stuckTask||'')}</textarea></label>
      <div class="v2-rhythm-field"><b>卡住原因</b>${renderChipOptions(RHYTHM_STUCK_OPTIONS,'stuckReasons',entry.stuckReasons||[],'drain')}</div>
      <label class="v2-rhythm-note">补充说明<textarea id="v2RhythmNote" rows="2" placeholder="比如：下午一直被咨询和快递打断">${esc(entry.rhythmNote||'')}</textarea></label>
      <div class="v2-row end"><button class="v2-primary" data-rhythm-save="rhythm">保存节奏记录</button></div>
    </details>
    <details class="v2-panel v2-rhythm-card">
      <summary><div><h3>👜 隐形成本记录</h3><p>${esc(rhythmSummaryText(entry,'hidden'))}</p></div><span>展开填写</span></summary>
      <div class="v2-rhythm-field"><b>琐事类型</b>${renderChipOptions(HIDDEN_COST_OPTIONS,'hiddenCostsLibrary',(entry.hiddenCosts||[]).map(x=>x.title),'hidden')}</div>
      <div class="v2-rhythm-hidden-list">${(entry.hiddenCosts||[]).map(cost=>`<div class="v2-hidden-cost-row" data-cost-id="${esc(cost.id)}"><div class="v2-row between"><strong>${esc(cost.title)}</strong><button class="v2-danger" type="button" data-hidden-remove="${esc(cost.id)}">删</button></div><div class="v2-grid"><label>花费时间<input data-hidden-field="duration" value="${esc(cost.duration||'')}" placeholder="如 30m"></label><label>花费金额<input data-hidden-field="money" value="${esc(cost.money||'')}" placeholder="可不填"></label><label>是否打乱<select data-hidden-field="disrupted"><option ${cost.disrupted==='是'?'selected':''}>是</option><option ${cost.disrupted==='否'?'selected':''}>否</option></select></label></div><div class="v2-rhythm-field"><b>消耗类型</b>${renderChipOptions(['时间','体力','情绪','注意力'],`hiddenCostType:${cost.id}`,cost.costTypes||[],'hidden')}</div><label class="v2-rhythm-note">备注<textarea data-hidden-field="note" rows="2" placeholder="例如：来回花了不少精力">${esc(cost.note||'')}</textarea></label></div>`).join('')||'<p class="hint">先点上面的琐事标签，再补充时间、金额和影响。</p>'}</div>
      <div class="v2-row end"><button class="v2-primary" data-rhythm-save="hidden">保存隐形成本</button></div>
    </details>
    <div class="v2-panel">
      <h3>🛟 低电量应急包</h3>
      ${overview.lowEnergy?`<div class="v2-rhythm-alert">当前状态更适合先恢复，再安排高强度任务。</div>`:''}
      <div class="v2-rhythm-emergency-grid"><div><b>5 分钟恢复</b>${emergency.quick.map(x=>`<span>${esc(x)}</span>`).join('')}</div><div><b>15 分钟恢复</b>${emergency.short.map(x=>`<span>${esc(x)}</span>`).join('')}</div><div><b>30 分钟恢复</b>${emergency.medium.map(x=>`<span>${esc(x)}</span>`).join('')}</div><div><b>直接休息</b>${emergency.rest.map(x=>`<span>${esc(x)}</span>`).join('')}</div></div>
    </div>
    <div class="v2-panel"><h3>🤖 一句话交给 AI 识别</h3><div class="v2-fields"><textarea id="v2RhythmText" rows="4" placeholder="例如：今天状态很差，上午被咨询打断好多次，还去拿了快递和买东西，洗了澡喝了奶茶才稍微好一点。">${esc(entry.note||'')}</textarea><div class="v2-row end"><button class="v2-secondary" id="v2RhythmParse">自动识别归类</button><button class="v2-primary" id="v2RhythmSaveAll">保存整页记录</button></div></div></div>
  `;
  bindLifeRhythmInteractions(date);
}
function bindLifeRhythmInteractions(date){
  document.getElementById('v2RhythmQuickFlow')?.addEventListener('click',()=>openRhythmQuickRecord(date));
  document.getElementById('v2RhythmQuickFlowTop')?.addEventListener('click',()=>openRhythmQuickRecord(date));
  document.getElementById('v2RhythmQuickFill')?.addEventListener('click',()=>openRhythmQuickRecord(date));
  document.getElementById('v2OpenFoodSection')?.addEventListener('click',()=>switchRouteModule('foodSection'));
  document.getElementById('v2OpenLateNightSection')?.addEventListener('click',()=>switchRouteModule('lateNightSection'));
  document.getElementById('v2RhythmCompletionPercent')?.addEventListener('input',e=>{const out=document.getElementById('v2RhythmCompletionOutput');if(out)out.textContent=e.target.value});
  document.querySelectorAll('[data-rhythm-energy]').forEach(btn=>btn.addEventListener('click',()=>setLifeRhythmEnergy(date,btn.dataset.rhythmEnergy)));
  document.querySelectorAll('[data-rhythm-field]').forEach(btn=>btn.addEventListener('click',()=>{const e=collectLifeRhythmDraftFromForm(date);e[btn.dataset.rhythmField]=btn.dataset.value;saveLifeRhythmEntry(e);renderLifeRhythmRoute();renderLifeRhythmSection()}));
  document.querySelectorAll('[data-rhythm-toggle]').forEach(btn=>btn.addEventListener('click',()=>toggleLifeRhythmTag(date,btn.dataset.rhythmToggle,btn.dataset.value)));
  document.querySelectorAll('[data-hidden-remove]').forEach(btn=>btn.addEventListener('click',()=>removeHiddenCost(date,btn.dataset.hiddenRemove)));
  document.querySelectorAll('[data-rhythm-save]').forEach(btn=>btn.addEventListener('click',()=>saveLifeRhythmFromForm(date,btn.dataset.rhythmSave)));
  document.getElementById('v2RhythmParse')?.addEventListener('click',()=>applyLifeRhythmText(date));
  document.getElementById('v2RhythmSaveAll')?.addEventListener('click',()=>saveLifeRhythmFromForm(date,'all'));
}
function setLifeRhythmEnergy(date,value){
  const entry=collectLifeRhythmDraftFromForm(date);
  entry.energyLevel=value;
  entry.energyManual=true;
  saveLifeRhythmEntry(entry);
  renderLifeRhythmRoute();renderLifeRhythmSection();toast('已按你的感觉更新今日电量')
}
function toggleLifeRhythmTag(date,key,value){
  const entry=collectLifeRhythmDraftFromForm(date);
  if(key==='hiddenCostsLibrary'){
    const idx=entry.hiddenCosts.findIndex(x=>x.title===value);
    if(idx>=0)entry.hiddenCosts.splice(idx,1);else entry.hiddenCosts.push({id:'hc-'+genId(),title:value,duration:'',money:'',disrupted:'否',costTypes:['时间'],note:''});
  }else if(key.startsWith('hiddenCostType:')){
    const id=key.split(':')[1],item=(entry.hiddenCosts||[]).find(x=>x.id===id);if(item){const list=item.costTypes||[];item.costTypes=list.includes(value)?list.filter(x=>x!==value):list.concat(value)}
  }else if(key==='movementType'){
    entry.movementType=entry.movementType===value?'':value;
  }else{
    const list=entry[key]||[];
    entry[key]=list.includes(value)?list.filter(x=>x!==value):list.concat(value);
  }
  saveLifeRhythmEntry(entry);renderLifeRhythmRoute();renderLifeRhythmSection();
}
function removeHiddenCost(date,id){
  const entry=collectLifeRhythmDraftFromForm(date);
  entry.hiddenCosts=(entry.hiddenCosts||[]).filter(x=>x.id!==id);
  saveLifeRhythmEntry(entry);renderLifeRhythmRoute();renderLifeRhythmSection();
}
function collectLifeRhythmDraftFromForm(date){
  const entry=getLifeRhythmEntry(date,true);
  entry.bedTime=document.getElementById('v2RhythmBedTime')?.value||entry.bedTime;
  entry.sleepStart=document.getElementById('v2RhythmSleepStart')?.value||entry.sleepStart;
  entry.wakeTime=document.getElementById('v2RhythmWakeTime')?.value||entry.wakeTime;
  entry.sleepNote=document.getElementById('v2RhythmSleepNote')?.value.trim()||'';
  entry.bodyNote=document.getElementById('v2RhythmBodyNote')?.value.trim()||'';
  entry.moodNote=document.getElementById('v2RhythmMoodNote')?.value.trim()||'';
  entry.stuckTask=document.getElementById('v2RhythmStuckTask')?.value.trim()||'';
  entry.rhythmNote=document.getElementById('v2RhythmNote')?.value.trim()||'';
  entry.completionPercent=document.getElementById('v2RhythmCompletionPercent')?.value||entry.completionPercent;
  entry.note=document.getElementById('v2RhythmText')?.value.trim()||entry.note;
  document.querySelectorAll('.v2-hidden-cost-row').forEach(row=>{
    const id=row.dataset.costId,item=(entry.hiddenCosts||[]).find(x=>x.id===id);if(!item)return;
    row.querySelectorAll('[data-hidden-field]').forEach(input=>item[input.dataset.hiddenField]=input.value.trim())
  });
  return entry
}
function saveLifeRhythmFromForm(date){
  const entry=collectLifeRhythmDraftFromForm(date);
  saveLifeRhythmEntry(entry);renderLifeRhythmRoute();renderLifeRhythmSection();toast('已更新今日状态')
}
function ensureRhythmQuickOverlay(){
  let overlay=document.getElementById('v2RhythmQuickOverlay');
  if(overlay)return overlay;
  overlay=document.createElement('div');overlay.id='v2RhythmQuickOverlay';overlay.className='chat-overlay';
  overlay.innerHTML=`<div class="chat-dialog v2-capture-dialog"><div class="chat-header"><div class="left">快速记录今天</div><button class="chat-close" id="v2QuickRhythmClose">✕</button></div><div class="v2-panel" style="margin:0"><div id="v2RhythmQuickBody"></div><div class="v2-row end" style="margin-top:12px"><button class="v2-secondary" id="v2RhythmQuickCancel">取消</button><button class="v2-primary" id="v2RhythmQuickSave">保存今天状态</button></div></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('v2QuickRhythmClose').addEventListener('click',()=>overlay.classList.remove('show'));
  document.getElementById('v2RhythmQuickCancel').addEventListener('click',()=>overlay.classList.remove('show'));
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('show')});
  return overlay
}
function openRhythmQuickRecord(date=todayStr()){
  const overlay=ensureRhythmQuickOverlay(),entry=getLifeRhythmEntry(date,true),body=document.getElementById('v2RhythmQuickBody');
  body.innerHTML=`
    <div class="v2-rhythm-field"><b>今日电量</b>${renderChipOptions(['低电量','中等电量','高电量'],'quickEnergy',[entry.energyLevel].filter(Boolean))}</div>
    <div class="v2-rhythm-field"><b>今日心情</b>${renderChipOptions(['开心','平静','焦虑','烦躁','低落','混乱'],'quickMood',[entry.moodState].filter(Boolean))}</div>
    <div class="v2-rhythm-field"><b>今日节奏</b>${renderChipOptions(['很顺','一般','有点卡','很乱','被打乱'],'quickRhythm',[entry.rhythm].filter(Boolean))}</div>
    <label class="v2-rhythm-range">任务完成度 <output id="v2QuickCompletionOutput">${esc(entry.completionPercent||taskCompletionPercent(date))}</output>%<input id="v2QuickCompletion" type="range" min="0" max="100" step="5" value="${esc(entry.completionPercent||taskCompletionPercent(date))}"></label>
    <div class="v2-rhythm-field"><b>补能方式</b>${renderChipOptions(RECHARGE_OPTIONS,'quickRecharge',entry.rechargeTags||[],'soft')}</div>
    <div class="v2-rhythm-field"><b>消耗来源</b>${renderChipOptions(DRAIN_OPTIONS,'quickDrain',entry.drainTags||[],'drain')}</div>
    <div class="v2-rhythm-field"><b>打断源</b>${renderChipOptions(INTERRUPT_OPTIONS,'quickInterrupt',entry.rhythmFactors||[],'interrupt')}</div>
    <label class="v2-rhythm-note">备注<textarea id="v2QuickRhythmNote" rows="3" placeholder="补一句今天为什么会累、乱或顺">${esc(entry.note||'')}</textarea></label>`;
  overlay.classList.add('show');
  body.querySelectorAll('[data-rhythm-toggle]').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.rhythmToggle;
    if(['quickEnergy','quickMood','quickRhythm'].includes(key)){
      body.querySelectorAll(`[data-rhythm-toggle="${key}"]`).forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
    }else{
      btn.classList.toggle('active');
    }
  }));
  document.getElementById('v2QuickCompletion')?.addEventListener('input',e=>{document.getElementById('v2QuickCompletionOutput').textContent=e.target.value});
  document.getElementById('v2RhythmQuickSave').onclick=()=>saveRhythmQuickRecord(date)
}
function saveRhythmQuickRecord(date=todayStr()){
  const entry=getLifeRhythmEntry(date,true);
  const active=(key)=>[...document.querySelectorAll(`#v2RhythmQuickBody [data-rhythm-toggle="${key}"].active`)].map(x=>x.dataset.value);
  const selectedEnergy=active('quickEnergy')[0];
  if(selectedEnergy){
    entry.energyLevel=selectedEnergy;
    entry.energyManual=true;
  }
  entry.moodState=active('quickMood')[0]||entry.moodState;
  entry.rhythm=active('quickRhythm')[0]||entry.rhythm;
  entry.completionPercent=document.getElementById('v2QuickCompletion')?.value||entry.completionPercent;
  entry.rechargeTags=active('quickRecharge');
  entry.drainTags=active('quickDrain');
  entry.rhythmFactors=active('quickInterrupt');
  entry.note=document.getElementById('v2QuickRhythmNote')?.value.trim()||entry.note;
  saveLifeRhythmEntry(entry);
  document.getElementById('v2RhythmQuickOverlay')?.classList.remove('show');
  renderLifeRhythmRoute();renderLifeRhythmSection();toast('已快速记录今天')
}
function applyLifeRhythmText(date){
  const text=document.getElementById('v2RhythmText')?.value.trim();if(!text){toast('先写一句今天的状态');return}
  const parsed=parseLifeRhythmText(text,date);if(!parsed){toast('这一段里还没有识别到状态信息');return}
  const old=getLifeRhythmEntry(date,true);
  saveLifeRhythmEntry(Object.assign(old,parsed,{date}));
  renderLifeRhythmRoute();renderLifeRhythmSection();toast('已自动识别并归类')
}

function openDaySheet(ds){selectedDay=ds;const d=new Date(ds+'T12:00:00');beginRoute(`${d.getMonth()+1}月${d.getDate()}日 · 周${['日','一','二','三','四','五','六'][d.getDay()]}`,'提醒','day');renderDaySheet()}
function closeDaySheet(){requestCloseRoute()}
window.openDaySheet=openDaySheet;
window.closeDaySheet=closeDaySheet;
function dayItemStatusMeta(item){
  if(item.status==='doing')return{label:'进行中',className:'doing',hint:'现在正在推进'};
  if(item.status==='done')return{label:'已完成',className:'done',hint:item.completedAt?`完成于 ${new Date(item.completedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}`:'已经做完'};
  if(item.status==='skipped')return{label:'今日跳过',className:'skipped',hint:'今天先不做'};
  if(item.status==='deferred')return{label:'已延期',className:'deferred',hint:item.deferredTo?`改到 ${item.deferredTo}`:'已经改期'};
  return{label:'未开始',className:'todo',hint:'还没开始'};
}

function renderDaySheet(){
  window.currentDaySheetDate=selectedDay;
  const items=displayItems(selectedDay),stats=daySheetOverviewStats(selectedDay),done=stats.done;const past=selectedDay<todayStr();
  const emotions=getEmotionEntries(selectedDay),notes=getDayNotes(selectedDay),inspirations=getDayInspirationEntries(selectedDay),holiday=getHolidayLabel(selectedDay),birthdays=getBirthdayEntries(selectedDay);
  const firstThreeItems=items.slice(0,3);
  const dayOverviewSupport=(selectedDay===todayStr()&&isHomeMode())
    ?[
      '<span class="v2-chip active">先喝水</span>',
      `<span class="v2-chip">${stats.open} 项待开始</span>`,
      stats.doing?`<span class="v2-chip">正在推进 ${stats.doing} 项</span>`:'<span class="v2-chip">先做最容易开始的一项</span>'
    ].join('')
    :[
      `<span class="v2-chip active">${stats.done} 项完成</span>`,
      `<span class="v2-chip">${stats.open} 项未开始</span>`,
      stats.doing?`<span class="v2-chip">进行中 ${stats.doing} 项</span>`:`<span class="v2-chip">${items.length} 项任务</span>`
    ].join('');
  const dayOverviewNote=(selectedDay===todayStr()&&isHomeMode())
    ?`<div class="v2-overview-note">${routeInfoLabel('icons-collage-v2/icon-note.png','小提示')} 今天先保底就够了，完成 1 项也算稳稳在前进。</div>`
    :'';
  const dayMoodLabel=emotions[0]?.emotion||'🙂';
  const dayNotePreview=notes[0]?.text||inspirations[0]?.text||'这一天还没有留下小记。';
  const dayQuoteTitle=pickRotatingCopy('day','title',selectedDay);
  const dayQuoteBody=pickRotatingCopy('day','body',String(stats.done));
  let html=`<div class="v2-route-overview day ${selectedDay===todayStr()&&isHomeMode()?'home':''} v2-route-journal home-mode-hero"><div class="v2-route-overview-main"><div>${routeEyebrow(selectedDay===todayStr()?(isHomeMode()?'rhythm':'day'):'day',selectedDay===todayStr()?(modeLabel()):(past?'历史回顾':'未来计划'))}<h3>${selectedDay===todayStr()?(isHomeMode()?pickRotatingCopy('home','title',selectedDay):dayQuoteTitle):`${selectedDay} 的任务与记录`}</h3><p>${selectedDay===todayStr()?(isHomeMode()?pickRotatingCopy('home','body',String(stats.percent)):dayQuoteBody):past?'这一天的完成、情绪和随笔都在下面，可以直接回看。':'这一天的安排可以先提前放进去，到了当天直接接着做。'}</p></div><div class="v2-route-overview-progress"><div class="v2-overview-ring"><strong>${stats.percent}%</strong><span>完成度</span></div><div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:${stats.percent}%"></span></div><small>${stats.done} 项完成 · ${stats.open} 项未开始${stats.doing?` · ${stats.doing} 项进行中`:''}</small>${dayOverviewNote}<div class="v2-overview-support">${dayOverviewSupport}</div></div></div>${routeOverviewAside(selectedDay===todayStr()&&isHomeMode()?'rhythm':'day','现在先做',['先完成 1 项就算稳稳往前',stats.open?`还剩 ${stats.open} 项待开始`:'今天先保留轻节奏',stats.doing?`正在推进 ${stats.doing} 项`:'先碰最容易开始的一项'])}${selectedDay===todayStr()&&isHomeMode()?routeHeroDecor('day'):''}${routeMascot('day','is-right')}${routeDecorPair()}</div><div class="v2-overview-cards">${routeCard('ui-icons-collage-v1/icon-complete-badge.png',stats.done,'已完成')}${routeCard('ui-icons-collage-v1/icon-alarm.png',stats.open,'未开始')}${routeCard('icons-collage-v2/icon-focus.png',stats.doing,'进行中')}${routeCard('icons-collage-v2/icon-all.png',stats.skipped+stats.deferred,'跳过 / 延期')}</div></div><div class="v2-day-summary"><span>${items.length} 项任务</span><span>${done} 项完成</span><span>${past?'历史回顾':selectedDay===todayStr()?'今天':'未来计划'}</span></div>`;
  html+=`<div class="v2-route-mini-grid v2-route-mini-grid--day"><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('day','今天先看')}</h3><div class="v2-mini-list">${firstThreeItems.length?firstThreeItems.map(item=>`<span class="v2-chip ${item.status==='done'?'active':''}">${taskSticker(item,'v2-chip-sticker')} ${esc(item.title)}</span>`).join(''):'<span class="v2-chip">先在下面安排一项</span>'}</div></div><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('rhythm','今日气氛')}</h3><div class="v2-mini-chip-grid"><span class="v2-chip active">${routeInfoLabel(DETAIL_ICON_ART.mood,'今日心情')} ${esc(dayMoodLabel)}</span>${holiday?`<span class="v2-chip">${esc(holiday)}</span>`:''}${birthdays.length?`<span class="v2-chip">${birthdays.length} 条生日</span>`:''}</div><p class="hint" style="margin-top:10px">${esc(String(dayNotePreview).slice(0,60)||'这一天还没有留下小记。')}${String(dayNotePreview).length>60?'...':''}</p></div></div>`;
  html+=routePromptCard(selectedDay===todayStr()&&isHomeMode()?'rhythm':'day',past?'先温柔回看这一天':'先做最容易开始的一项',past?'先看完成、心情和随笔，再决定要不要补一句备注。':'先碰最容易开始的那一项，今天就会立刻顺一点。',firstThreeItems.slice(0,2).map(item=>item.title).filter(Boolean));
  if(holiday||birthdays.length)html+=`<div class="v2-panel"><div class="v2-row">${holiday?`<span class="v2-chip active">${esc(holiday)}</span>`:''}${birthdays.length?`<span class="v2-chip">🎂 ${birthdays.map(x=>x.name).join('、')}</span>`:''}</div></div>`;
  const rhythm=getLifeRhythmEntry(selectedDay,false);
  if(rhythm)html+=`<div class="v2-panel"><h3>${routeMiniTitle('rhythm','当天状态感知')}</h3><div class="v2-rhythm-summary"><span>${routeInfoLabel(DETAIL_ICON_ART.sleep,rhythm.sleepStart&&rhythm.wakeTime?`${rhythm.sleepStart}-${rhythm.wakeTime}${sleepDurationText(rhythm.sleepStart,rhythm.wakeTime)?` · ${sleepDurationText(rhythm.sleepStart,rhythm.wakeTime)}`:''}`:'睡眠未填')}</span><span>${routeInfoLabel(DETAIL_ICON_ART.battery,rhythm.energyLevel||'电量未填')}</span><span>${routeInfoLabel(DETAIL_ICON_ART.rhythm,rhythm.rhythm||'节奏未填')}</span><span>${routeInfoLabel(DETAIL_ICON_ART.factor,rhythm.control?`掌控感${rhythm.control}`:'掌控感未填')}</span></div><div class="v2-rhythm-tags" style="margin-top:8px">${(rhythm.rechargeTags||[]).slice(0,3).map(x=>`<span class="v2-chip active">补能·${esc(x)}</span>`).join('')}${(rhythm.drainTags||[]).slice(0,3).map(x=>`<span class="v2-chip">消耗·${esc(x)}</span>`).join('')}${((rhythm.rhythmFactors||rhythm.interrupts||[]).slice(0,2)).map(x=>`<span class="v2-chip">打断·${esc(x)}</span>`).join('')}</div>${(rhythm.note||rhythm.rhythmNote)?`<div class="v2-day-meta" style="margin-top:8px;white-space:pre-wrap">${esc(rhythm.rhythmNote||rhythm.note)}</div>`:''}<div class="v2-row end" style="margin-top:10px"><button class="v2-secondary" id="v2OpenRhythmDay">编辑这一天的状态</button></div></div>`;
  if(past&&!getPlan(selectedDay,false))html+='<div class="v2-warning">旧版没有保存这一天的任务快照，因此只能显示当时实际保存下来的记录。V2 启用后的日期会完整保留。</div>';
  const sortedItems=[...items].sort((a,b)=>(a.plannedStart||'99:99').localeCompare(b.plannedStart||'99:99'));
  let currentSlot='';
  html+=sortedItems.length?sortedItems.map(item=>{const slot=getTimeSlotLabel(item.plannedStart||item.alarmTime||'');const slotHeader=slot!==currentSlot?`<div class="v2-time-slot ${slot}">${slot}</div>`:'';currentSlot=slot;const task=item.sourceTaskId?appData.tasks.find(x=>x.id===item.sourceTaskId):null;const checklist=task?.checklist?.length?`<div class="v2-sheet-checklist">${task.checklist.map(x=>`<div class="v2-sheet-check ${x.done?'done':''}"><span>${x.done?'✓':'○'}</span><span>${esc(x.title)}</span></div>`).join('')}</div>`:'';const status=dayItemStatusMeta(item);const canReturn=!item.sourceTaskId||!!item.sourcePoolId;const noteText=(task?.subtask||item.subtask||item.note||status.hint||'').trim();const metaPills=[metaPill(taskStickerAsset(item),item.type||'任务','soft'),item.plannedStart?metaPill('ui-icons-collage-v1/icon-alarm.png',item.plannedStart,'time'):'',item.reminderMode==='alarm'?metaPill('ui-icons-collage-v1/icon-bell.png','闹钟提醒','time'):metaPill('icons-collage-v2/icon-focus.png','普通通知','soft'),item.sourcePoolId?metaPill('icons-collage-v2/icon-note.png','来自任务池','pool'):'',item.important?metaPill('icons-collage-v2/icon-goal.png','重要','important'):''].filter(Boolean).join('');return slotHeader+`<div class="v2-day-item ${status.className}" style="border-left-color:${COLOR[item.type]||COLOR.记录}"><button class="v2-day-check" data-v2-toggle="${esc(item.id)}">✓</button><div class="v2-day-main"><div class="v2-day-headline"><div class="v2-day-title">${taskSticker(item,'v2-task-sticker')}<span class="v2-day-title-text">${esc(item.title)}</span></div><span class="v2-day-status ${status.className}">${esc(status.label)}</span></div><div class="v2-day-meta-pills">${metaPills}</div>${noteText?`<div class="v2-day-note">${esc(noteText)}</div>`:''}${checklist}<div class="v2-day-primary-row"><button class="v2-primary" data-v2-start="${esc(item.id)}" title="标记进行中">${item.status==='doing'?'继续推进':'开始这一项'}</button><button class="v2-secondary v2-day-more-trigger" data-v2-more-toggle="${esc(item.id)}" aria-expanded="false">更多操作</button></div><div class="v2-day-more" data-v2-more-panel="${esc(item.id)}" hidden><div class="v2-row v2-day-actions" style="gap:6px">${item.status!=='skipped'?`<button class="v2-secondary" data-v2-skip="${esc(item.id)}" title="今日跳过">今天先不做</button>`:`<button class="v2-secondary" data-v2-start="${esc(item.id)}" title="继续处理">重新开始</button>`}<button class="v2-secondary" data-v2-delay="${esc(item.id)}" title="延期到别的日期">稍后再做</button>${canReturn?`<button class="v2-secondary" data-v2-return="${esc(item.id)}" title="放回任务池">放回任务池</button>`:''}<button class="v2-secondary" data-v2-calendar="${esc(item.id)}" title="加入手机日历">放进日历</button><button class="v2-important" data-v2-important="${esc(item.id)}" title="切换重要提醒">${item.important?'取消重要':'设为重要'}</button><button class="v2-danger" data-v2-delete="${esc(item.id)}" title="删除这项">删掉这项</button></div></div></div></div>`}).join(''):`<div class="v2-empty v2-empty-cat">这一天还没有安排<br>可以先在下面加一个最容易开始的小任务</div>`;
  html+=`<div class="v2-panel"><h3>${routeMiniTitle('rhythm','当天情绪')}</h3>${emotions.length?emotions.map(x=>`<div class="v2-log-card"><div class="v2-row"><span class="v2-chip">${esc(x.emotion)}</span><span class="v2-chip ${x.intensity==='重'?'active':''}">${esc(x.intensity)}影响</span><button class="v2-danger" data-v2-del-emotion="${esc(x.id)}" style="margin-left:auto">删除</button></div><div class="v2-day-title" style="margin-top:6px">${esc(x.event)}</div>${x.note?`<div class="v2-day-meta" style="margin-top:4px;white-space:pre-wrap">${esc(x.note)}</div>`:''}</div>`).join(''):'<p class="hint">这一天还没有情绪记录。</p>'}<div class="v2-fields" style="margin-top:10px"><textarea id="v2DayEmotionText" rows="3" placeholder="比如：今天开会很累，心里有点烦，压力中等"></textarea><button class="v2-primary" id="v2DayEmotionAdd">保存这条心情</button></div></div>`;
  html+=`<div class="v2-panel"><h3>${routeMiniTitle('day','当天随笔')}</h3>${notes.length?notes.map(n=>`<div class="v2-log-card"><div class="v2-row"><div class="v2-day-title">${esc(n.title||'随手记')}</div><button class="v2-danger" data-v2-del-note="${esc(n.id)}" style="margin-left:auto">删除</button></div><div class="v2-day-meta" style="margin-top:4px;white-space:pre-wrap">${esc(n.text||'')}</div></div>`).join(''):'<p class="hint">这一天还没有随笔记录。</p>'}<div class="v2-fields" style="margin-top:10px"><input id="v2DayNoteTitle" placeholder="标题（选填）"><textarea id="v2DayNoteText" rows="3" placeholder="记下这一天的想法、备忘或复盘碎片"></textarea><button class="v2-primary" id="v2DayNoteAdd">保存到这一天</button></div></div>`;
  html+=`<div class="v2-panel"><h3>${routeMiniTitle('day','当天灵感')}</h3>${inspirations.length?inspirations.map(n=>`<div class="v2-log-card"><div class="v2-row"><span class="v2-chip">${esc(n.emotion||'灵感')}</span><span class="v2-day-meta">${esc(n.date||selectedDay)}</span><button class="v2-danger" data-v2-del-inspire="${esc(n.id)}" style="margin-left:auto">删除</button></div><div class="v2-day-meta" style="margin-top:6px;white-space:pre-wrap">${esc(n.text||'')}</div></div>`).join(''):'<p class="hint">这一天还没有灵感便签。</p>'}<div class="v2-fields" style="margin-top:10px"><textarea id="v2DayInspireText" rows="3" placeholder="记下今天闪过的灵感、提醒或一句话"></textarea><button class="v2-primary" id="v2DayInspireAdd">保存这条灵感</button></div></div>`;
  html+=`<div class="v2-panel"><h3>＋ 安排到这一天</h3><div class="v2-fields"><label>任务内容<input id="v2DayNewTitle" placeholder="要做什么"></label><div class="v2-grid"><label>类型<select id="v2DayNewType"><option>临时</option><option>每日</option><option>项目</option><option>循环</option></select></label><label>时间<input id="v2DayNewTime" type="time"></label></div><div class="v2-grid"><label>新增位置<select id="v2DayNewTarget"><option value="today">今日清单</option><option value="pool">先放任务池</option></select></label><label><span><input id="v2DayNewImportant" type="checkbox"> 重要任务（闹钟式提醒）</span></label></div><button class="v2-primary" id="v2DayAdd">保存这项</button></div></div>`;
  const target=routeState?.kind==='day'?document.getElementById('v2RouteBody'):document.getElementById('v2DayBody');target.innerHTML=html;
  target.querySelectorAll('[data-v2-toggle]').forEach(b=>b.addEventListener('click',()=>toggleDayItem(b.dataset.v2Toggle)));
  target.querySelectorAll('[data-v2-start]').forEach(b=>b.addEventListener('click',()=>startDayItem(b.dataset.v2Start)));
  target.querySelectorAll('[data-v2-skip]').forEach(b=>b.addEventListener('click',()=>skipDayItem(b.dataset.v2Skip)));
  target.querySelectorAll('[data-v2-delay]').forEach(b=>b.addEventListener('click',()=>deferDayItem(b.dataset.v2Delay)));
  target.querySelectorAll('[data-v2-return]').forEach(b=>b.addEventListener('click',()=>returnDayItemToPool(b.dataset.v2Return)));
  target.querySelectorAll('[data-v2-important]').forEach(b=>b.addEventListener('click',()=>toggleImportant(b.dataset.v2Important)));
  target.querySelectorAll('[data-v2-calendar]').forEach(b=>b.addEventListener('click',()=>openDayItemCalendar(b.dataset.v2Calendar)));
  target.querySelectorAll('[data-v2-delete]').forEach(b=>b.addEventListener('click',()=>deleteDayItem(b.dataset.v2Delete)));
  target.querySelectorAll('[data-v2-del-emotion]').forEach(b=>b.addEventListener('click',()=>deleteDayEmotion(b.dataset.v2DelEmotion)));
  target.querySelectorAll('[data-v2-del-note]').forEach(b=>b.addEventListener('click',()=>deleteDayNote(b.dataset.v2DelNote)));
  target.querySelectorAll('[data-v2-del-inspire]').forEach(b=>b.addEventListener('click',()=>deleteDayInspiration(b.dataset.v2DelInspire)));
  target.querySelectorAll('[data-v2-more-toggle]').forEach(btn=>btn.addEventListener('click',()=>{
    const panel=target.querySelector(`[data-v2-more-panel="${btn.dataset.v2MoreToggle}"]`);
    if(!panel)return;
    const next=panel.hidden;
    panel.hidden=!next;
    btn.setAttribute('aria-expanded',String(next));
    btn.textContent=next?'收起':'更多';
  }));
  document.getElementById('v2DayAdd').addEventListener('click',addManualDayItem);
  document.getElementById('v2DayEmotionAdd').addEventListener('click',addDayEmotion);
  document.getElementById('v2DayNoteAdd').addEventListener('click',addDayNote);
  document.getElementById('v2DayInspireAdd').addEventListener('click',addDayInspiration);
  document.getElementById('v2OpenRhythmDay')?.addEventListener('click',()=>{openModulePage('rhythmSection');renderLifeRhythmRoute()});
  enhanceDaySheetPanels(target,selectedDay);
}

function getRouteCollapseStore(){
  appData.v2=appData.v2||{};
  appData.v2.routeCollapse=appData.v2.routeCollapse||{};
  return appData.v2.routeCollapse;
}
function getDirectPanelTitle(panel){
  return Array.from(panel.children||[]).find(node=>node.tagName==='H3')||null;
}
function makePanelCollapsible(panel,key){
  if(!panel||panel.dataset.foldReady==='1')return;
  const title=getDirectPanelTitle(panel);
  if(!title)return;
  const store=getRouteCollapseStore();
  const collapsed=!!store[key];
  const header=document.createElement('button');
  header.type='button';
  header.className='v2-panel-toggle';
  header.setAttribute('aria-expanded',String(!collapsed));
  header.innerHTML=`<span class="v2-panel-toggle-title">${title.innerHTML}</span><span class="v2-panel-toggle-arrow">${collapsed?'展开':'收起'}</span>`;
  const body=document.createElement('div');
  body.className='v2-panel-toggle-body';
  let node=title.nextSibling;
  while(node){
    const next=node.nextSibling;
    body.appendChild(node);
    node=next;
  }
  title.replaceWith(header);
  panel.appendChild(body);
  panel.classList.add('v2-collapsible-panel');
  panel.dataset.foldReady='1';
  if(collapsed){
    panel.classList.add('is-collapsed');
    body.hidden=true;
  }
  header.addEventListener('click',()=>{
    const nextCollapsed=!panel.classList.contains('is-collapsed');
    panel.classList.toggle('is-collapsed',nextCollapsed);
    body.hidden=nextCollapsed;
    header.setAttribute('aria-expanded',String(!nextCollapsed));
    const arrow=header.querySelector('.v2-panel-toggle-arrow');
    if(arrow)arrow.textContent=nextCollapsed?'展开':'收起';
    store[key]=nextCollapsed;
    persist();
  });
}
function enhanceDaySheetPanels(target,dateKey){
  if(!target)return;
  [
    ['当天状态感知','rhythm'],
    ['当天情绪','emotion'],
    ['当天随笔','note'],
    ['当天灵感','inspire'],
    ['安排到这一天','arrange']
  ].forEach(([label,suffix])=>{
    const panel=Array.from(target.querySelectorAll('.v2-panel')).find(node=>{
      const title=getDirectPanelTitle(node);
      return title&&title.textContent&&title.textContent.includes(label);
    });
    if(panel)makePanelCollapsible(panel,`day:${dateKey}:${suffix}`);
  });
}
function findDisplayedItem(ds,id){return displayItems(ds).find(x=>x.id===id)}
function materializeItem(ds,id){const existing=getPlan(ds,true).items.find(x=>x.id===id);if(existing)return existing;const predicted=findDisplayedItem(ds,id);return predicted?upsertPlanItem(ds,predicted):null}
function startDayItem(id){const item=materializeItem(selectedDay,id);if(!item)return;item.status='doing';item.completedAt=null;if(item.sourcePoolId){const pool=getTaskPool().find(x=>x.id===item.sourcePoolId);if(pool)pool.status='进行中'}persist();renderDaySheet();render();}
function skipDayItem(id){const item=materializeItem(selectedDay,id);if(!item)return;item.status='skipped';item.completedAt=null;if(item.sourcePoolId){const pool=getTaskPool().find(x=>x.id===item.sourcePoolId);if(pool)pool.status='待安排'}persist();renderDaySheet();render();toast('已标记为今日跳过')}
function deferDayItem(id){
  const item=materializeItem(selectedDay,id);if(!item)return;
  const next=prompt('延期到哪一天？请输入 YYYY-MM-DD',daysLater(1));if(!next||!/^\d{4}-\d{2}-\d{2}$/.test(next))return;
  item.status='deferred';item.completedAt=null;item.deferredTo=next;
  const copy=Object.assign({},item,{id:`deferred-${genId()}`,status:'todo',completedAt:null});
  upsertPlanItem(next,copy);
  if(item.sourcePoolId){const pool=getTaskPool().find(x=>x.id===item.sourcePoolId);if(pool){pool.status='待安排';pool.deferredUntil=next;pool.updatedAt=nowISO();}}
  if(item.sourceTaskId){const task=appData.tasks.find(x=>x.id===item.sourceTaskId);if(task&&task.type!=='每日'&&task.type!=='循环')task.scheduledDate=next;}
  persist();renderDaySheet();renderCalendar();renderCalendarInlinePreview(selectedDay);toast(`已延期到 ${next}`)
}
function toggleDayItem(id){const item=materializeItem(selectedDay,id);if(!item)return;item.status=item.status==='done'?'todo':'done';item.completedAt=item.status==='done'?nowISO():null;if(item.sourcePoolId){const pool=getTaskPool().find(x=>x.id===item.sourcePoolId);if(pool){pool.status=item.status==='done'?'已完成':'已安排到今日';pool.updatedAt=nowISO();}}if(item.sourceTaskId&&selectedDay===todayStr()){const task=appData.tasks.find(x=>x.id===item.sourceTaskId);if(task?.type==='每日'){task.completedToday=item.status==='done';task.lastCompletedDate=task.completedToday?selectedDay:task.lastCompletedDate}else if(task?.type==='循环'&&item.status==='done')task.lastDoneDate=selectedDay}persist();renderDaySheet();render();}
function returnDayItemToPool(id){
  const plan=getPlan(selectedDay,true),item=materializeItem(selectedDay,id);if(!item)return;
  const poolId=item.sourcePoolId||('pool-'+genId());
  upsertTaskPoolItem({id:poolId,title:item.title,taskType:item.type||'临时',status:'待安排',source:item.sourcePoolId?'today-return':'day-plan',note:'从今日清单放回任务池',rawText:item.title});
  plan.items=plan.items.filter(x=>x.id!==id);
  persist();renderDaySheet();renderTaskPoolSection();if(routeState?.kind==='taskPool')renderTaskPoolRoute();renderCalendarInlinePreview(selectedDay);toast('已放回任务池')
}
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
function addManualDayItem(){
  const title=document.getElementById('v2DayNewTitle').value.trim();if(!title){toast('先写下任务内容');return}
  const type=document.getElementById('v2DayNewType').value,time=document.getElementById('v2DayNewTime').value,target=document.getElementById('v2DayNewTarget').value,important=document.getElementById('v2DayNewImportant').checked;
  if(target==='pool'){
    upsertTaskPoolItem({title,taskType:type,status:'待安排',source:'day-sheet-manual',note:selectedDay!==todayStr()?`从 ${selectedDay} 的日计划页先存入任务池`:''});
    persist();renderDaySheet();renderTaskPoolSection();if(routeState?.kind==='taskPool')renderTaskPoolRoute();document.getElementById('v2DayNewTitle').value='';document.getElementById('v2DayNewTime').value='';document.getElementById('v2DayNewImportant').checked=false;toast('已放进任务池，今天先不压给你');return
  }
  const item={id:'plan-'+genId(),title,type,status:'todo',plannedStart:time,timeLabel:getTimeSlotLabel(time),important,reminderMode:important?'alarm':'notification',alarmTime:time,createdAt:nowISO(),completedAt:null};
  upsertPlanItem(selectedDay,item);persist();scheduleItem(item,selectedDay);renderDaySheet();renderCalendar();renderCalendarInlinePreview(selectedDay);document.getElementById('v2DayNewTitle').value='';document.getElementById('v2DayNewTime').value='';document.getElementById('v2DayNewImportant').checked=false;toast('已加入今日清单')
}
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
  if(type==='循环')wrap.innerHTML=`<h3>${routeMiniTitle('cyclic',`新增${type}`)}</h3><p class="hint">想到就先记下来，后面它会自己按节奏提醒你回来碰。</p><div class="v2-fields"><input id="${sectionId}-title" placeholder="写下要循环做的事"><div class="v2-row"><input id="${sectionId}-cycle" type="number" min="1" value="2" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:9px" placeholder="每几天一次"><button class="v2-primary" id="${sectionId}-add">先收进来</button></div><textarea id="${sectionId}-bulk" rows="4" placeholder="也可以直接贴一大段内容，我会自动拆成这个板块的任务"></textarea><div class="v2-row end"><button class="v2-secondary" id="${sectionId}-bulk-add">智能整理到本板块</button></div></div>`;
  else wrap.innerHTML=`<h3>${routeMiniTitle(sectionId==='dailySection'?'daily':sectionId==='projectSection'?'project':'temp',`新增${type}`)}</h3><p class="hint">${type==='每日'?'每天都会碰的事先放这里，后面打勾会轻松很多。':type==='项目'?'先把大事写下来，再慢慢拆成下一步。':'一闪而过的临时事先收住，别让它们一起压过来。'}</p><div class="v2-fields"><input id="${sectionId}-title" placeholder="写下任务内容"><div class="v2-row">${type!=='每日'?'<input id="'+sectionId+'-time" type="time" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:9px">':''}<button class="v2-primary" id="${sectionId}-add">先加这一项</button></div><textarea id="${sectionId}-bulk" rows="4" placeholder="直接说一大段，我会自动拆成${type}任务${type==='临时'?'，并识别今天/明天/后天':''}"></textarea><div class="v2-row end"><button class="v2-secondary" id="${sectionId}-bulk-add">智能整理到本板块</button></div></div>`;
  section.insertBefore(wrap,section.children[1]||null);
  document.getElementById(`${sectionId}-add`).addEventListener('click',()=>addSectionTask(sectionId));
  document.getElementById(`${sectionId}-bulk-add`).addEventListener('click',()=>addSectionTasksFromText(sectionId));
}
function addSectionTasksFromText(sectionId){
  const typeMap={dailySection:'每日',projectSection:'项目',cyclicSection:'循环',tempSection:'临时'},type=typeMap[sectionId],input=document.getElementById(`${sectionId}-bulk`);
  const text=input?.value.trim();if(!text){toast('先写下这一批内容');return}
  const result=parseNaturalTaskInput(text,type);if(!result)return;
  if(result.tasks?.length){
    result.tasks.forEach(task=>appData.tasks.push(task));
    persist();render();toast(`已整理到${type}板块（${result.tasks.length}项）`);
    if(input)input.value=''
  }
}
function addTaskPoolItemFromForm(){
  const title=document.getElementById('v2PoolTitle')?.value.trim();if(!title){toast('先写下任务内容');return}
  upsertTaskPoolItem({title,status:document.getElementById('v2PoolStatus')?.value||'待安排',taskType:document.getElementById('v2PoolType')?.value||'临时',note:document.getElementById('v2PoolNote')?.value.trim()||'',source:'manual-pool'});
  persist();renderTaskPoolSection();renderTaskPoolRoute();document.getElementById('v2PoolTitle').value='';document.getElementById('v2PoolNote').value='';toast('已加入任务池')
}
function scheduleTaskPoolItem(poolId,ds=todayStr()){
  const pool=getTaskPool().find(x=>x.id===poolId);if(!pool)return;
  upsertPlanItem(ds,{id:`pool-plan-${pool.id}-${ds}`,sourcePoolId:pool.id,title:pool.title,type:pool.taskType||'临时',status:'todo',important:false,reminderMode:'notification',createdAt:nowISO(),completedAt:null});
  pool.status='已安排到今日';
  pool.lastScheduledDate=ds;
  pool.updatedAt=nowISO();
  persist();renderTaskPoolSection();renderTaskPoolRoute();if(selectedDay===ds)renderDaySheet();renderCalendarInlinePreview?.(ds);toast('已加入今日清单')
}
function toggleTaskPoolPause(poolId){
  const pool=getTaskPool().find(x=>x.id===poolId);if(!pool)return;
  pool.status=pool.status==='暂缓'?'待安排':'暂缓';
  pool.updatedAt=nowISO();
  persist();renderTaskPoolSection();renderTaskPoolRoute();toast(pool.status==='暂缓'?'已暂缓':'已恢复到待安排')
}
function dropTaskPoolItem(poolId){
  const pool=getTaskPool().find(x=>x.id===poolId);if(!pool)return;
  if(pool.status!=='放弃'){pool.status='放弃';pool.updatedAt=nowISO();persist();renderTaskPoolSection();renderTaskPoolRoute();toast('已标记为放弃');return}
  if(!confirm('彻底删除这条任务池记录？'))return;
  removeTaskPoolItem(poolId);persist();renderTaskPoolSection();renderTaskPoolRoute();toast('已删除')
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
function waterStatusToday(){
  const logs=(appData.v2.smartCapture.waterLogs||[]).filter(x=>x.date===todayStr());
  if(!logs.length)return'none';
  if(logs.some(x=>/少|很少|没怎么/.test(`${x.level||''} ${x.rawText||''}`)))return'low';
  return'ok';
}
function buildPlannerContext(){
  const pool=getTaskPool().filter(x=>!['已完成','放弃'].includes(x.status));
  const focus=preferFocusCategory(),history=buildHistoryDigest(7),todayItems=displayItems(todayStr()),yesterday=daysLater(-1);
  const yesterdayPlan=(appData.v2.dayPlans[yesterday]?.items||[]).filter(x=>x.status!=='done');
  const lowEnergy=energyBucket()==='low'||isHomeMode()||history.lowDays>=3||history.unfinished>history.done;
  return{mode:currentMode(),focus,history,pool,todayItems,yesterdayPlan,lowEnergy,waterStatus:waterStatusToday(),profile:appData.v2.planner.profile};
}
function notificationStatusSummary(){
  const plugins=nativePlugins();
  const hasAlarm=!!plugins?.TaskAlarm;
  const hasLocal=!!plugins?.LocalNotifications;
  const nativeReady=!!appData.v2?.notifications?.nativeReady;
  return{
    nativeReady,
    hasAlarm,
    hasLocal,
    label:!hasLocal?'当前网页环境不支持手机提醒':nativeReady?(hasAlarm?'手机通知和重要闹钟已就绪':'普通通知已就绪，重要闹钟仍需系统授权'):'提醒权限还没准备好',
    detail:!hasLocal?'网页里可以先排时间，但真正手机响铃要在 APK 环境下授权。':nativeReady?(hasAlarm?'重要事项可以直接走系统闹钟。':'现在能发普通通知，重要任务建议再点一次“重挂闹钟”。'):'建议先点一次权限检测，再去系统里允许通知和闹钟。'
  }
}
function poolItemToPlan(pool,optionType,index){
  const category=classifyPoolTask(pool),baseTitle=String(pool.title||'').trim();
  let title=baseTitle;
  if(optionType==='保底版'){
    if(category==='hustle'&&!/一个|一页|一下|回复/.test(title))title=`${title}（只碰一下）`;
    if(category==='deep'&&!/只看|打开|列/.test(title))title=`${title}（只开一下）`;
  }else if(optionType==='冲刺版'&&category==='deep'&&!/30|40|1小时/.test(title)){
    title=`${title}（推进 30-60 分钟）`;
  }
  return{id:`planner-option-${pool.id}-${optionType}-${index}`,sourcePoolId:pool.id,title,type:pool.taskType||'临时',status:'todo',important:false,reminderMode:'notification',createdAt:nowISO(),plannerCategory:category,plannerOptionType:optionType};
}
function plannerStarterItems(context){
  const starters=[];
  if(context.mode==='home'||context.lowEnergy){
    if(context.waterStatus!=='ok')starters.push({id:`planner-water-${todayStr()}`,title:'喝一杯水',type:'记录',status:'todo',important:false,reminderMode:'notification',createdAt:nowISO(),plannerCategory:'body'});
    starters.push({id:`planner-reset-${todayStr()}`,title:'洗脸 / 开窗 / 站起来一下',type:'记录',status:'todo',important:false,reminderMode:'notification',createdAt:nowISO(),plannerCategory:'body'});
  }
  return starters;
}
function pickPoolByCategory(pool,category,limit=1,skipTitles=new Set()){
  return pool.filter(item=>classifyPoolTask(item)===category&&!skipTitles.has(item.title)).slice(0,limit);
}
function buildPlanOption(optionType,context){
  const skipTitles=new Set(),items=[...plannerStarterItems(context)],pool=context.pool.filter(x=>x.status!=='暂缓');
  const add=(list)=>list.forEach(item=>{if(skipTitles.has(item.title))return;skipTitles.add(item.title);items.push(poolItemToPlan(item,optionType,items.length))});
  const focusMap={life:['reset','mechanical','body'],money:['hustle','reset'],paper:['deep','body'],balanced:['deep','reset','mechanical']};
  const focusOrder=focusMap[context.focus]||focusMap.balanced;
  if(optionType==='保底版'){
    add(pickPoolByCategory(pool,'body',1,skipTitles));
    add(pickPoolByCategory(pool,'reset',1,skipTitles));
    if(!(context.profile.avoidSideHustleWhenLow>context.profile.preferMoneyFirst))add(pickPoolByCategory(pool,'hustle',1,skipTitles));
    if(items.length<3)add(pickPoolByCategory(pool,'mechanical',1,skipTitles));
  }else if(optionType==='正常版'){
    add(pickPoolByCategory(pool,focusOrder[0],1,skipTitles));
    add(pickPoolByCategory(pool,focusOrder[1],1,skipTitles));
    add(pickPoolByCategory(pool,focusOrder[2],1,skipTitles));
    if(items.length<4)add(pickPoolByCategory(pool,'hustle',1,skipTitles));
    if(items.length<4)add(pickPoolByCategory(pool,'deep',1,skipTitles));
  }else{
    add(pickPoolByCategory(pool,'deep',2,skipTitles));
    add(pickPoolByCategory(pool,'hustle',1,skipTitles));
    add(pickPoolByCategory(pool,'reset',1,skipTitles));
    if(items.length<5)add(pickPoolByCategory(pool,'mechanical',1,skipTitles));
  }
  const unique=items.filter((item,index,self)=>self.findIndex(x=>x.title===item.title)===index).slice(0,optionType==='冲刺版'?5:(optionType==='正常版'?4:3));
  const summary=optionType==='保底版'
    ?'动作小一点，只保最低完成线。'
    :optionType==='正常版'
      ?'一条主线加两三个轻任务，不排太满。'
      :'状态允许时多推进一点，但仍留缓冲。';
  const reason=context.mode==='home'
    ?'当前是居家模式，先复位再推进。'
    :context.lowEnergy
      ?'近期状态偏低，先给轻一点的方案。'
      :`参考最近 ${context.history.days} 天完成趋势和任务池内容。`;
  return{id:`plan-${genId()}`,type:optionType,summary,reason,items:unique};
}
function generatePlanOptions(){
  const context=buildPlannerContext();
  const options=['保底版','正常版','冲刺版'].map(type=>buildPlanOption(type,context));
  appData.v2.planner.planOptions=options;
  persist();
  return options;
}
function ensurePlanOptions(){return appData.v2.planner.planOptions?.length?appData.v2.planner.planOptions:generatePlanOptions()}
function applyPlanOption(optionId){
  const option=(appData.v2.planner.planOptions||[]).find(x=>x.id===optionId);if(!option){toast('这一版方案还没准备好');return}
  option.items.forEach((item,index)=>{
    const id=`selected-${option.id}-${index}`;
    upsertPlanItem(todayStr(),Object.assign({},item,{id,selectedPlanId:option.id,selectedPlanType:option.type}));
    if(item.sourcePoolId){
      const pool=getTaskPool().find(x=>x.id===item.sourcePoolId);
      if(pool){pool.status='已安排到今日';pool.lastScheduledDate=todayStr();pool.updatedAt=nowISO();}
    }
  });
  const profile=appData.v2.planner.profile;
  profile.lastChosenStyle=option.type;
  appData.v2.planner.planHistory.unshift({id:option.id,type:option.type,chosenAt:nowISO(),mode:currentMode(),titles:option.items.map(x=>x.title)});
  appData.v2.planner.planHistory=appData.v2.planner.planHistory.slice(0,30);
  window.AIMemorySystem?.feedbackLog.record('accepted',{title:`选择${option.type}`,type:'AI安排'},{source:'planner-option',mode:currentMode(),energy:appData.todayStatus?.energy});
  persist();render();renderCalendar?.();renderPlanner();renderTaskPoolSection();renderCalendarInlinePreview?.(todayStr());toast(`已采用${option.type}`);
}
function plannerPreferenceFeedback(kind,optionId){
  const p=appData.v2.planner.profile,msgMap={lighter:'后面默认更轻一点',stronger:'后面默认更能推一点',life:'后面更偏生活优先',money:'后面更偏赚钱优先',paper:'后面更偏论文优先',tidy:'后面更偏收拾优先',noHustle:'低状态下会少排副业',reroll:'已重新换一版'};
  if(kind==='lighter')p.preferLightPlans++;
  else if(kind==='stronger')p.preferStrongPlans++;
  else if(kind==='life')p.preferLifeFirst++;
  else if(kind==='money')p.preferMoneyFirst++;
  else if(kind==='paper')p.preferPaperFirst++;
  else if(kind==='tidy')p.preferTidyFirst++;
  else if(kind==='noHustle')p.avoidSideHustleWhenLow++;
  window.AIMemorySystem?.feedbackLog.record('accepted',{title:`planner-${kind}`,type:'AI反馈'},{source:'planner-feedback',optionId,mode:currentMode()});
  generatePlanOptions();renderPlanner();toast(msgMap[kind]||'已记录这次偏好');
}

function buildPlannerCalendarPanel(){
  const today=todayStr(),weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],view=plannerCalendarView();
  const titleMap={week:'这周先看安排、完成和状态',month:'这一月的学习、项目和生活密度',year:'全年分布、节奏和空档一眼看见',slot:'今天按时段展开，不用再二次点进去'};
  const descMap={week:'进规划就直接看见真实周视图，不再跳去别的界面。',month:'月视图适合看连续性和哪几天已经被事情塞满。',year:'年视图先看整体节奏，再决定这一阵子推进什么。',slot:'时段视图适合看今天什么时候学习、什么时候休息。'};
  let viewTitle='',surface='';
  if(view==='slot'){
    const days=getWeekDays(calWeekOffset);
    let activeDs=calSelectedDate?dateKey(calSelectedDate):selectedDay||today;
    if(!days.some(d=>dateKey(d)===activeDs))activeDs=days.some(d=>dateKey(d)===today)?today:dateKey(days[0]);
    viewTitle=`${days[0].getFullYear()}.${days[0].getMonth()+1} 时段视图`;
    const tabs=days.map((d,i)=>{const ds=dateKey(d);return `<button class="wd ${ds===today?'today':''} ${ds===activeDs?'active':''}" onclick="selectPlannerCalendarDay('${ds}')">${weekdays[i]}<span class="dt">${d.getMonth()+1}.${d.getDate()}</span></button>`}).join('');
    const meta=buildCalendarDayMeta(activeDs);
    const dayItems=[...meta.items].map((item,index)=>Object.assign({},item,{_start:inferItemStart(item,index)})).sort((a,b)=>(a._start||'99:99').localeCompare(b._start||'99:99'));
    const startHour=6,endHour=24,rowHeight=24,totalRows=endHour-startHour;
    let timeline=`<div class="v2-day-timeline"><div class="v2-day-timeline-axis">`;
    for(let hour=startHour;hour<endHour;hour++)timeline+=`<div class="v2-day-hour">${String(hour).padStart(2,'0')}:00</div>`;
    timeline+=`</div><div class="v2-day-timeline-main"><div class="v2-day-gridlines">`;
    for(let i=0;i<totalRows;i++)timeline+=`<div class="v2-day-gridline"></div>`;
    timeline+=`</div><button class="v2-day-timeline-surface ${activeDs===today?'today':''}" onclick="openDaySheet('${activeDs}')">`;
    if(dayItems.length){
      timeline+=dayItems.map(item=>{
        const startText=item._start||'09:00',endText=item.plannedEnd||formatHHMM(Math.min(timeToMinutes(startText)+60,24*60));
        const startMin=Math.max(timeToMinutes(startText),startHour*60),endMin=Math.max(timeToMinutes(endText),startMin+30);
        const top=((startMin-startHour*60)/60)*rowHeight,height=Math.max(((endMin-startMin)/60)*rowHeight,22);
        return `<div class="v2-day-block ${taskTone(item)}" style="top:${top}px;height:${height}px;border-left-color:${COLOR[item.type]||COLOR.记录};background:${COLOR[item.type]||COLOR.记录}18"><div class="v2-day-block-title">${taskSticker(item,'v2-task-sticker v2-task-sticker--mini')}<span class="v2-day-block-text">${esc(item.title)}</span></div>${height>=42?`<div class="v2-day-block-meta">${esc(startText)} - ${esc(endText)}</div>`:''}</div>`;
      }).join('');
    }else timeline+=`<div class="v2-day-block-empty">这一天还没有定时任务，先去今日详情加一项也可以。</div>`;
    timeline+=`</button></div></div>`;
    const sideInfo=`<div class="v2-day-sideinfo">${meta.holiday?`<span>🎐 ${esc(meta.holiday)}</span>`:''}${meta.birthdays.length?`<span>🎂 ${meta.birthdays.map(x=>esc(x.name)).join('、')}</span>`:''}${meta.moods?`<span>💭 ${meta.moods} 条情绪</span>`:''}${meta.notes?`<span>📝 ${meta.notes} 条随记</span>`:''}${meta.inspirations?`<span>💡 ${meta.inspirations} 条灵感</span>`:''}</div>`;
    surface=`<div class="weekday-row v2-slot-daytabs">${tabs}</div><div class="v2-slot-daywrap"><div class="v2-slot-dayhead"><strong>${activeDs}</strong><span>点上方日期切换，点时间轴进入当天详情。</span></div>${sideInfo}${timeline}</div>`;
  }else if(view==='year'){
    const year=new Date().getFullYear()+calWeekOffset;
    viewTitle=`${year} 年总览`;
    let html='<div class="v2-year-grid">';
    for(let m=0;m<12;m++){
      const first=new Date(year,m,1),last=new Date(year,m+1,0),startDay=(first.getDay()+6)%7;
      html+=`<div class="v2-year-card"><div class="v2-year-title">${m+1}月</div><div class="v2-year-week">${weekdays.map(n=>`<span>${n}</span>`).join('')}</div><div class="v2-year-days">`;
      for(let i=0;i<startDay;i++)html+='<span></span>';
      for(let day=1;day<=last.getDate();day++){
        const ds=`${year}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,meta=buildCalendarDayMeta(ds);
        html+=`<button class="v2-year-day ${ds===today?'today':''} ${meta.items.length||meta.holiday||meta.birthdays.length||meta.notes||meta.moods||meta.inspirations?'active':''}" onclick="selectPlannerCalendarDay('${ds}')"><span class="v2-year-day-num">${day}</span><span class="v2-year-icons">${renderCalendarDayBadges(meta,'small')}</span>${meta.items.length?`<span class="v2-year-dot" style="background:${COLOR[meta.items[0].type]||COLOR.记录}"></span>`:''}</button>`;
      }
      html+='</div></div>';
    }
    surface=html+'</div>';
  }else if(view==='month'){
    const base=new Date();base.setDate(1);base.setMonth(base.getMonth()+calWeekOffset);
    viewTitle=`${base.getFullYear()}年${base.getMonth()+1}月`;
    let html=`<div class="weekday-row v2-month-weekdays">${weekdays.map(n=>`<div class="wd">${n}</div>`).join('')}</div><div class="v2-month-grid">`;
    const first=new Date(base.getFullYear(),base.getMonth(),1),last=new Date(base.getFullYear(),base.getMonth()+1,0),startDay=(first.getDay()+6)%7;
    for(let i=0;i<startDay;i++)html+='<span class="v2-month-empty"></span>';
    for(let day=1;day<=last.getDate();day++){
      const ds=`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,meta=buildCalendarDayMeta(ds);
      html+=`<button class="v2-month-day ${ds===today?'today':''} ${calSelectedDate&&dateKey(calSelectedDate)===ds?'selected':''}" onclick="selectPlannerCalendarDay('${ds}')"><div class="v2-month-top"><span class="v2-month-num">${day}</span><span class="v2-month-icons">${renderCalendarDayBadges(meta,'small')}</span></div><div class="v2-month-body">${renderCalendarTaskSummary(meta,'small')}</div></button>`;
    }
    surface=html+'</div>';
  }else{
    const days=getWeekDays(calWeekOffset);
    const metas=days.map(d=>({date:dateKey(d),meta:buildCalendarDayMeta(dateKey(d))}));
    const weekTaskCount=metas.reduce((sum,x)=>sum+x.meta.items.length,0);
    const weekBirthdayCount=metas.reduce((sum,x)=>sum+x.meta.birthdays.length,0);
    const weekHolidayCount=metas.filter(x=>x.meta.holiday).length;
    const focusDay=metas.slice().sort((a,b)=>b.meta.items.length-a.meta.items.length)[0];
    viewTitle=`${days[0].getFullYear()}.${days[0].getMonth()+1} 周视图`;
    const head=`<div class="weekday-row">${days.map((d,i)=>{const ds=dateKey(d);return `<button class="wd ${ds===today?'v2-strong-day':''}" onclick="selectPlannerCalendarDay('${ds}')">${weekdays[i]}<span class="dt">${d.getMonth()+1}.${d.getDate()}</span></button>`}).join('')}</div>`;
    const weekIntro=`<div class="v2-planner-week-hero"><div class="v2-planner-week-copy"><span class="v2-chip active">${routeInfoLabel('view-icons/icon-study-english-sticker.svg','周视图 · 今天')}</span><strong>把安排、完成和状态放在同一块看板里</strong><p class="hint">这周先看轻重缓急，适合一眼扫今天和前后几天的节奏。</p><div class="v2-mini-chip-grid"><span class="v2-chip">本周 ${weekTaskCount} 项任务</span><span class="v2-chip">${weekBirthdayCount} 条生日</span><span class="v2-chip">${weekHolidayCount} 个节日提醒</span></div></div><div class="v2-planner-week-stats">${routeCard('view-icons/icon-study-english-sticker.svg',weekTaskCount,'本周任务')}${routeCard('view-icons/icon-run-sticker.svg',focusDay?.meta?.items?.length||0,focusDay?`${focusDay.date.slice(5)} 最满`:'本周最满一天')}${routeCard('view-icons/icon-baoyan-project-sticker.svg',weekBirthdayCount+weekHolidayCount,'生日 / 节日')}</div></div>`;
    const grid=`<div class="v2-week-grid v2-planner-week-grid">${days.map(d=>{const ds=dateKey(d),meta=buildCalendarDayMeta(ds),loadDots=(meta.items||[]).slice(0,4).map(item=>`<span class="v2-planner-load-dot" style="background:${COLOR[item.type]||COLOR.记录}"></span>`).join(''),specialNote=meta.holiday?`<span class="v2-planner-week-special holiday">${esc(meta.holiday)}</span>`:meta.birthdays.length?`<span class="v2-planner-week-special birthday">🎂 ${esc(meta.birthdays[0].name||'生日')}</span>`:'';return `<button class="v2-week-day ${ds===today?'today':''} ${calSelectedDate&&dateKey(calSelectedDate)===ds?'selected':''}" onclick="selectPlannerCalendarDay('${ds}')"><div class="v2-week-top"><span class="v2-week-icons">${renderCalendarDayBadges(meta,'normal')}</span></div><div class="v2-planner-week-load">${loadDots}${meta.items.length?`<b>${meta.items.length}</b>`:''}</div>${specialNote}<div class="v2-week-body">${renderCalendarTaskSummary(meta,'small')}</div></button>`}).join('')}</div>`;
    surface=weekIntro+head+grid;
  }
  return `<div class="v2-panel v2-planner-calendar-panel"><div class="v2-planner-calendar-head"><div class="v2-planner-calendar-copy"><h3>${routeMiniTitle('planner','规划视图')}</h3><strong>${viewTitle}</strong><p class="hint">${titleMap[view]}。${descMap[view]}</p></div><div class="v2-planner-calendar-nav"><button class="v2-secondary" onclick="shiftPlannerCalendar(-1)">‹</button><button class="v2-secondary is-today" onclick="jumpPlannerCalendarToday()">今</button><button class="v2-secondary" onclick="shiftPlannerCalendar(1)">›</button></div></div><div class="v2-planner-view-tabs"><button class="v2-planner-view-tab ${view==='week'?'active':''}" onclick="setPlannerCalendarView('week')">${stickerImg('view-icons/icon-study-english-sticker.svg','v2-planner-tab-img','周视图')}<span>周</span></button><button class="v2-planner-view-tab ${view==='month'?'active':''}" onclick="setPlannerCalendarView('month')">${stickerImg('view-icons/icon-baoyan-project-sticker.svg','v2-planner-tab-img','月视图')}<span>月</span></button><button class="v2-planner-view-tab ${view==='year'?'active':''}" onclick="setPlannerCalendarView('year')">${stickerImg('view-icons/icon-workout-sticker.svg','v2-planner-tab-img','年视图')}<span>年</span></button><button class="v2-planner-view-tab ${view==='slot'?'active':''}" onclick="setPlannerCalendarView('slot')">${stickerImg('view-icons/icon-day-slot-sticker.svg','v2-planner-tab-img','时段视图')}<span>时段</span></button></div><div class="v2-planner-calendar-surface">${surface}</div></div>`;
}

function renderPlanner(){
  refreshPlannerStats();const p=appData.v2.planner.profile,batch=activeBatch(),suggestions=appData.v2.planner.suggestions||[],history=buildHistoryDigest(7),options=ensurePlanOptions(),carry=appData.v2.conversation?.carrySummary||'',context=buildPlannerContext();
  const quoteTitle=pickRotatingCopy('planner','title',String(options.length));
  const quoteBody=pickRotatingCopy('planner','body',String(history.done));
  let html=buildPlannerCalendarPanel();
  const notify=notificationStatusSummary();
  html+=`<div class="v2-route-overview planner ${isHomeMode()?'home':''} v2-route-plannerboard"><div class="v2-route-overview-main"><div>${routeEyebrow('planner','智能规划室')}<h3>${isHomeMode()?pickRotatingCopy('home','title','planner-home'):quoteTitle}</h3><p>${quoteBody} ${history.summary}${p.lastChosenStyle?` 你最近更常选「${p.lastChosenStyle}」。`:''}</p><div class="v2-rhythm-tags" style="margin-top:10px"><span class="v2-chip active">${suggestions.length} 条今日建议</span><span class="v2-chip">${context.pool.length} 条待调度</span><span class="v2-chip">${history.done} 条近 7 天完成</span></div></div><div class="v2-route-overview-progress"><div class="v2-overview-ring"><strong>${options.length}</strong><span>方案</span></div><div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:${Math.min(100,Math.max(24,history.done*8))}%"></span></div><small>先挑一版，再微调轻重</small></div></div>${routeOverviewAside('planner','安排提示',['先从 3 个版本里挑 1 个',context.pool.length?`任务池里还有 ${context.pool.length} 条待调度`:'任务池空了就先去补任务',p.lastChosenStyle?`你最近更常选 ${p.lastChosenStyle}`:'今天先选最轻的一版也可以'])}${routeMascot('planner','is-right')}${routeDecorPair()}</div><div class="v2-overview-cards">${routeCard('icons-collage-v2/icon-goal.png',esc(p.lastChosenStyle||'未选择'),'最近常选方案')}${routeCard('icons-collage-v2/icon-note.png',context.pool.length,'任务池待安排')}${routeCard('ui-icons-collage-v1/icon-complete-badge.png',history.done,'近 7 天完成')}${routeCard(DETAIL_ICON_ART.mood,suggestions.length,'今日建议')}</div></div>`;
  html+=`<div class="v2-route-mini-grid v2-route-mini-grid--planner"><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('planner','今日偏好')}</h3><div class="v2-mini-chip-grid"><span class="v2-chip active">${esc(p.lastChosenStyle||'还没选方案')}</span><span class="v2-chip">${context.focus==='life'?'生活优先':context.focus==='money'?'赚钱优先':context.focus==='paper'?'论文优先':'均衡安排'}</span><span class="v2-chip">${context.lowEnergy?'低电量保护':'可正常推进'}</span></div></div><div class="v2-panel v2-mini-note"><h3>${routeMiniTitle('planner','提醒权限')}</h3><p class="hint">${esc(notify.label)}</p><div class="v2-mini-chip-grid"><span class="v2-chip">${esc(notify.hasLocal?'通知可接入':'当前仅网页预览')}</span><span class="v2-chip">${esc(notify.hasAlarm?'可申请系统闹钟':'暂未接系统闹钟')}</span></div><div class="v2-row" style="margin-top:10px;gap:6px;flex-wrap:wrap"><button class="v2-secondary" id="v2PlannerPermissionCheck">检测权限</button>${notify.hasAlarm?'<button class="v2-secondary" id="v2PlannerExactAlarm">闹钟授权</button>':''}</div></div></div>`;
  html+=routePromptCard('planner','今天先选一个能落地的版本','计划不是拿来压自己的。先选一个愿意执行的，再慢慢调轻重。',['先选一套','再微调','别把今天排满']);
  html+='<div class="v2-panel"><h3>🧭 当前任务批次</h3>';
  if(batch)html+=`<div class="v2-batch active"><div class="v2-batch-title"><span>${esc(batch.title)}</span><span class="v2-chip active">进行中</span></div><small>${batch.startDate} 至 ${batch.endDate}</small>${batch.items.map((x,i)=>`<div class="v2-row" style="margin-top:7px"><span style="flex:1;font-size:13px">${esc(x.title)}</span><button class="v2-secondary" data-batch-today="${i}">安排今天</button></div>`).join('')}</div><div class="v2-row end" style="margin-top:10px"><button class="v2-secondary" id="v2FinishBatch">这一批完成，开启下一批</button></div>`;
  else html+='<p class="hint">当前没有进行中的批次。建立一批本周任务后，短期聊天可以随批次归档，个人习惯不会丢失。</p>';
  html+='</div>';
  html+=`<div class="v2-panel"><h3>${modeEmoji()} 今日安排模式</h3><div class="v2-row" style="justify-content:space-between;align-items:flex-start"><div><div class="v2-day-title">${esc(modeLabel())}</div><div class="hint">${isHomeMode()?'先喝水、身体重启、生活复位，再碰一下副业。':'今天可以推进主线，但别排太满。'}</div></div><div class="v2-row" style="gap:6px"><button class="v2-secondary" data-mode-switch="normal">正常</button><button class="v2-secondary" data-mode-switch="home">居家</button></div></div><div class="v2-rhythm-tags" style="margin-top:10px"><span class="v2-chip ${context.lowEnergy?'':'active'}">最近 7 天完成 ${history.done}</span><span class="v2-chip">${history.unfinished} 条待收尾</span><span class="v2-chip">${context.focus==='life'?'最近偏生活优先':context.focus==='money'?'最近偏赚钱优先':context.focus==='paper'?'最近偏论文优先':'目前均衡'}</span></div></div>`;
  if(isHomeMode())html+=`<div class="v2-panel"><h3>📺 居家陪跑提示</h3><div class="v2-rhythm-tags"><span class="v2-chip active">先喝水</span><span class="v2-chip active">收一个袋子</span><span class="v2-chip">手机放远一点</span><span class="v2-chip">一集配一个小动作</span><span class="v2-chip">20-30 分钟起身一次</span></div><p class="hint" style="margin-top:8px">今天最低完成线：身体重启 1 件、生活复位 1 件、副业/学习碰一下 1 件。做到这 3 件就算没有瘫住。</p></div>`;
  html+=`<div class="v2-panel"><h3>🤖 帮我安排今天</h3><p class="hint">${history.summary} 我会给你保底版、正常版、冲刺版三套，先选一套再落到今日清单。</p><div class="v2-row end" style="margin-top:8px"><button class="v2-primary" id="v2GeneratePlans">重生成三套方案</button></div>${options.map(option=>`<div class="v2-plan-option ${option.type==='保底版'?'is-soft':option.type==='冲刺版'?'is-strong':'is-balanced'}"><div class="v2-row" style="justify-content:space-between;align-items:flex-start"><div><div class="v2-day-title">${esc(option.type)}</div><div class="v2-day-meta">${esc(option.summary)} · ${esc(option.reason)}</div></div><button class="v2-primary" data-plan-apply="${esc(option.id)}">选这个</button></div><div class="v2-rhythm-tags" style="margin-top:8px">${option.items.map(item=>`<span class="v2-chip ${item.plannerCategory==='deep'?'':'active'}">${taskSticker(item,'v2-chip-sticker')} ${esc(item.title)}</span>`).join('')}</div><div class="v2-row v2-plan-feedback" style="margin-top:10px;gap:6px;flex-wrap:wrap"><button class="v2-secondary" data-plan-feedback="lighter" data-plan-id="${esc(option.id)}">改成更轻</button><button class="v2-secondary" data-plan-feedback="stronger" data-plan-id="${esc(option.id)}">改成更强</button><button class="v2-secondary" data-plan-feedback="life" data-plan-id="${esc(option.id)}">今天优先生活</button><button class="v2-secondary" data-plan-feedback="money" data-plan-id="${esc(option.id)}">今天优先赚钱</button><button class="v2-secondary" data-plan-feedback="paper" data-plan-id="${esc(option.id)}">今天优先论文</button><button class="v2-secondary" data-plan-feedback="tidy" data-plan-id="${esc(option.id)}">今天只想收拾</button><button class="v2-secondary" data-plan-feedback="noHustle" data-plan-id="${esc(option.id)}">今天不想副业</button></div></div>`).join('')}</div>`;
  html+=`<div class="v2-panel"><h3>＋ 新建一批</h3><div class="v2-fields"><label>批次名称<input id="v2BatchTitle" value="本周任务"></label><label>任务（每行一项）<textarea id="v2BatchItems" rows="4" placeholder="整理资料\n推进保研主包\n收拾房间"></textarea></label><div class="v2-grid"><label>开始<input id="v2BatchStart" type="date" value="${todayStr()}"></label><label>结束<input id="v2BatchEnd" type="date" value="${weekEnd(todayStr())}"></label></div><button class="v2-primary" id="v2CreateBatch">开启这一批</button></div></div>`;
  html+=`<div class="v2-panel"><h3>✨ 今日建议</h3>${suggestions.length?suggestions.map(s=>`<div class="v2-row" style="padding:7px 0;border-bottom:1px solid var(--border)"><span style="flex:1;font-size:13px">${esc(s.text)}</span><button class="v2-secondary" data-suggest-add="${esc(s.title)}">采纳</button><button class="v2-secondary ai-skip-btn" data-suggest-skip="${esc(s.title)}">跳过</button></div>`).join(''):'<p class="hint">积累几天完成记录后，这里会根据连续习惯提出建议。AI建议只会使用普通通知，不会擅自设闹钟。</p>'}</div>`;
  html+=`<div class="v2-panel"><h3>🧠 会话延续摘要</h3><p class="hint">${carry?esc(carry):'当前还没有生成会话摘要。对话变长时可以直接压缩成下一轮可继承的摘要。'}</p><div class="v2-row end" style="margin-top:8px"><button class="v2-secondary" id="v2BuildCarrySummary">生成会话摘要</button><button class="v2-secondary" id="v2StartNextRound">开启下一轮</button></div></div>`;
  html+=`<div class="v2-panel"><h3>🌱 我的规划底色</h3><div class="v2-fields"><div class="v2-grid"><label>每天最多任务类型<input id="v2MaxTypes" type="number" min="1" max="6" value="${p.maxTaskTypes}"></label><label>每天最多家务<input id="v2Chores" type="number" min="0" max="5" value="${p.choresPerDay}"></label></div><label><span><input id="v2LowResistance" type="checkbox" ${p.insertLowResistance?'checked':''}> 空余时间穿插低阻力任务</span></label><label>长期规划原则<textarea id="v2Principles" rows="4">${esc(p.principles)}</textarea></label><button class="v2-primary" id="v2SaveProfile">保存长期习惯</button></div></div>`;
  document.getElementById('v2PlannerContent').innerHTML=html;
  document.getElementById('v2CreateBatch').addEventListener('click',createBatch);
  document.getElementById('v2SaveProfile').addEventListener('click',saveProfile);
  document.getElementById('v2FinishBatch')?.addEventListener('click',finishBatch);
  document.getElementById('v2GeneratePlans')?.addEventListener('click',()=>{generatePlanOptions();renderPlanner();toast('已重新生成三套方案')});
  document.getElementById('v2BuildCarrySummary')?.addEventListener('click',()=>{buildConversationCarrySummary();renderPlanner();toast('已生成摘要')});
  document.getElementById('v2StartNextRound')?.addEventListener('click',()=>startNextChatRound());
  document.getElementById('v2PlannerPermissionCheck')?.addEventListener('click',async()=>{const ok=await initNativeNotifications();toast(ok?'提醒权限已就绪':'提醒权限还没准备好');renderPlanner()});
  document.getElementById('v2PlannerExactAlarm')?.addEventListener('click',()=>requestExactAlarmPermission());
  document.querySelectorAll('[data-mode-switch]').forEach(b=>b.addEventListener('click',()=>setAppMode(b.dataset.modeSwitch)));
  document.querySelectorAll('[data-plan-apply]').forEach(b=>b.addEventListener('click',()=>applyPlanOption(b.dataset.planApply)));
  document.querySelectorAll('[data-plan-feedback]').forEach(b=>b.addEventListener('click',()=>plannerPreferenceFeedback(b.dataset.planFeedback,b.dataset.planId)));
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
  const eatingLogs=(appData.v2.eatingLogs||[]).filter(x=>x.date&&x.date>=startDate&&x.date<=endDate).map(x=>({date:x.date,moment:x.moment||'',level:x.level||'',trigger:x.trigger||'',mood:x.mood||'',note:(x.note||'').slice(0,120)})).slice(0,30);
  const lateNightLogs=(appData.v2.lateNightLogs||[]).filter(x=>x.date&&x.date>=startDate&&x.date<=endDate).map(x=>({date:x.date,bedtime:x.bedtime||'',trigger:x.trigger||'',mood:x.mood||'',nextDay:x.nextDay||'',note:(x.note||'').slice(0,120)})).slice(0,30);
  return{tasks:completedTasks,inspirations,notes,unfinished,eatingLogs,lateNightLogs}
}
async function generatePeriodReview(kind,options={}){
  const meta=options.meta||periodMeta(kind,new Date(),!!options.completedOnly);
  setReviewStatus(`⏳ 正在生成${meta.label}...`);
  const payload=collectReviewPayload(meta.startDate,meta.endDate);
  try{
    const res=await fetch('/.netlify/functions/ai-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tasks:payload.tasks,inspirations:payload.inspirations,notes:payload.notes,unfinished:payload.unfinished,eatingLogs:payload.eatingLogs,lateNightLogs:payload.lateNightLogs,period:{start:meta.startDate,end:meta.endDate,label:meta.label,kind}})});
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
  const important=!!(task.important||task.alarmTime);
  return{id:'task-reminder-'+task.id,title:task.title,alarmTime:task.alarmTime||'',plannedStart:task.scheduledStart||'',important,reminderMode:task.alarmTime?'alarm':'notification'};
}
function syncTaskReminder(task){
  const item=buildReminderItemFromTask(task),date=getTaskReminderDate(task);
  if(!item||!date)return false;
  if(!item.alarmTime&&!item.plannedStart)return false;
  scheduleItem(item,date);
  return true;
}
function openTaskTypeCalendar(taskType){
  const task=(appData.tasks||[]).find(x=>x.type===taskType&&(x.scheduledStart||x.alarmTime||x.scheduledDate));
  if(!task){toast('先给这一类任务加一个时间，再放进手机日历');return false}
  return openTaskCalendar(task,task.scheduledDate||getTaskReminderDate(task)||todayStr());
}
function resyncTaskTypeReminder(taskType){
  const task=(appData.tasks||[]).find(x=>x.type===taskType&&(x.alarmTime||x.scheduledStart));
  if(!task){toast('先给这一类任务设置时间或闹钟');return false}
  const plugins=nativePlugins();
  syncTaskReminder(task);
  if(task.alarmTime&&plugins?.TaskAlarm)toast('已重挂系统闹钟，请确认系统里“闹钟和提醒”权限已打开');
  else if(task.alarmTime)toast('这项有闹钟时间，但当前环境只能先走普通提醒');
  else toast('已重挂普通提醒');
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
  initRuntimeAppInfo().then(()=>applyRuntimeVersionMigration()).then(changed=>{if(changed)toast(`已切换到新版本 ${versionLabel()}`)});
  setTimeout(()=>checkForAppUpdates(true),1600);
  try{document.getElementById('loadingOverlay')?.classList.remove('show')}catch(e){}
  document.getElementById('v2ImportBanner').classList.add('v2-hidden');
  if(source==='legacy')toast('已把原版本机数据复制到 V2，原版未改变');
  autoGeneratePeriodicReviews();
  syncCloudForm();
  initNativeNotifications().then(()=>{schedulePendingReminders();scheduleAIMemorySuggestion()});
  maybeSendBirthdayWebNotice();
};
})();


