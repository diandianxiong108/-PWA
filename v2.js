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
const SECTION_IDS=['dailySection','projectSection','cyclicSection','tempSection','healthSection','birthdaySection','billSection','extraSection','rhythmSection','inspireSection','notesSection','reviewSection','badgeSection','wishSection'];
let currentModule='home';
let selectedDay=todayStr();
let toastTimer=null;

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
  archives:{daySummaries:[],ocrCleanupLog:[]},
  planner:{
    profile:{maxTaskTypes:3,insertLowResistance:true,choresPerDay:1,quietStart:'22:30',quietEnd:'07:30',principles:'一天不超过三种任务类型；精力低时优先低阻力任务；家务少量穿插。'},
    batches:[],activeBatchId:null,habitSignals:{},suggestions:[]
  },
  financeLink:{category:'保研小红书主包',wishId:null,linkedEntryIds:[],pendingEntryIds:[]},
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
  appData.v2.financeLink=Object.assign(defaults.financeLink,appData.v2.financeLink||{});
  appData.v2.notifications=Object.assign(defaults.notifications,appData.v2.notifications||{});
  appData.v2.reviewMeta=Object.assign(defaults.reviewMeta,appData.v2.reviewMeta||{});
  appData.v2.lifeRhythm=Object.assign(defaults.lifeRhythm,appData.v2.lifeRhythm||{});
  appData.v2.lifeRhythm.days=appData.v2.lifeRhythm.days||{};
  appData.v2.lifeRhythm.emergencyKit=Object.assign(defaults.lifeRhythm.emergencyKit,appData.v2.lifeRhythm.emergencyKit||{});
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
function hasMeaningfulData(){
  return !!((appData.tasks||[]).length||(appData.notes||[]).length||(appData.inspirations||[]).length||(appData.birthdays||[]).length||(appData.records?.entries||[]).length)
}

function persist(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(appData));return true}catch(e){toast('本地保存失败，请导出备份');return false}
}
function esc(value){return String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}
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
const TASK_ICON_RULES=[
  [/英语|单词|听力|口语|背词/,'📘'],
  [/思维|复习|阅读|看书|论文|科研|学习|写作|PPT|作业/,'📖'],
  [/小红书|拍照|剪辑|发帖|账号|内容/,'📱'],
  [/电脑|代码|项目|主包|软件|文档|表格|材料/,'💻'],
  [/奶茶|咖啡|喝水|热饮/,'🧋'],
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
  const text=`${item?.title||''} ${item?.type||''}`;
  const found=TASK_ICON_RULES.find(([rule])=>rule.test(text));
  if(found)return found[1];
  if(item?.type==='每日')return'🌿';
  if(item?.type==='项目')return'🗂️';
  if(item?.type==='循环')return'🔁';
  if(item?.type==='临时')return'📝';
  return'✨'
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
  renderCalendar=function(){legacyRenderCalendar();decorateCalendarCells()};
  render=function(){legacyRender();renderLifeRhythmSection();if(routeState?.kind==='rhythm')renderLifeRhythmRoute();renderFinanceLink?.()};
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
  if(meta.holiday)parts.push(`<span class="v2-day-badge holiday ${size}">🎐</span>`);
  if(meta.birthdays.length)parts.push(`<span class="v2-day-badge birthday ${size}">🎂</span>`);
  if(meta.moods)parts.push(`<span class="v2-day-badge mood ${size}">💭</span>`);
  if(meta.notes)parts.push(`<span class="v2-day-badge note ${size}">📝</span>`);
  if(meta.inspirations)parts.push(`<span class="v2-day-badge inspire ${size}">💡</span>`);
  return parts.join('')
}
function briefTaskTitle(title,maxLen=4){
  const plain=String(title||'').replace(/[，,、。；;：:]/g,'').trim();
  return plain.length>maxLen?`${plain.slice(0,maxLen)}…`:plain
}
function renderCalendarTaskSummary(meta,size='normal'){
  if(!meta.items.length)return '<div class="v2-day-empty">·</div>';
  const items=meta.items.slice(0,size==='small'?2:2);
  return items.map(item=>{
    const short=briefTaskTitle(item.title,size==='small'?4:5);
    return `<div class="v2-day-summary-chip ${size}" style="border-color:${COLOR[item.type]||COLOR.记录}33"><span class="v2-day-summary-chip-icon">${taskEmoji(item)}</span><span class="v2-day-summary-chip-dot" style="background:${COLOR[item.type]||COLOR.记录}"></span><span class="v2-day-summary-chip-text">${esc(short)}</span></div>`
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
        return `<div class="v2-day-block" style="top:${top}px;height:${height}px;border-left-color:${COLOR[item.type]||COLOR.记录};background:${COLOR[item.type]||COLOR.记录}18"><div class="v2-day-block-title"><span class="v2-task-emoji">${taskEmoji(item)}</span>${esc(item.title)}</div>${height>=42?`<div class="v2-day-block-meta">${metaLine}</div>`:''}</div>`
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
  const route=document.createElement('main');route.id='v2RoutePage';route.className='v2-route-page';route.innerHTML='<header class="v2-route-head"><button class="v2-route-back" id="v2RouteBack">‹</button><span class="v2-route-icon" id="v2RouteIcon"></span><h1 class="v2-route-title" id="v2RouteTitle"></h1></header><div id="v2RouteBody"></div>';app.after(route);
  const banner=document.createElement('div');banner.id='v2ImportBanner';banner.className='v2-import-banner v2-hidden';banner.innerHTML='<span>还没有导入原版数据，可在设置里导入 JSON 到 V2。</span><button class="v2-secondary" id="v2ImportBtn">导入 JSON</button><input id="v2ImportInput" type="file" accept=".json" hidden>';parking.appendChild(banner);
  document.body.classList.add('v2-ready');
  buildHomeLaunchers();
  buildQuickCaptureUI();
  document.getElementById('v2RouteBack').addEventListener('click',requestCloseRoute);
  window.addEventListener('popstate',()=>{if(routeState)closeRouteInternal()});
  document.getElementById('v2ImportBtn').addEventListener('click',()=>document.getElementById('v2ImportInput').click());
  document.getElementById('v2ImportInput').addEventListener('change',importV2);
  const settingsActions=document.querySelector('#settingsPopup .form-actions');if(settingsActions){const tools=document.createElement('div');tools.className='v2-tools-stack';tools.style.marginTop='10px';tools.innerHTML=`<div class="v2-row"><button class="v2-secondary" id="v2BackupBtn">导出 V2 完整备份</button><button class="v2-secondary" id="v2ExactAlarmBtn">授权重要闹钟</button></div><div class="v2-row" style="margin-top:8px"><span class="v2-chip active" id="v2VersionChip">版本 ${versionLabel()}</span><button class="v2-secondary" id="v2CheckUpdateBtn">检查更新</button></div><div class="v2-row" style="margin-top:8px"><button class="v2-secondary" id="v2ImportJsonBtn">导入原版 JSON</button></div><div class="v2-panel" id="v2CloudPanel" style="margin-top:10px"><h3>☁ 轻量云端备份</h3><p class="hint">适合你自己一个人用：把完整数据备份到云端，需要填写自己的 JSONBin Bin ID 和 API Key。</p><div class="v2-fields"><label>Bin ID<input id="v2CloudBinId" placeholder="粘贴你的 Bin ID"></label><label>API Key<input id="v2CloudApiKey" placeholder="输入 X-Master-Key" type="password"></label><div class="v2-row" style="flex-wrap:wrap"><button class="v2-secondary" id="v2CloudUpload">上传云端</button><button class="v2-secondary" id="v2CloudRestore">恢复云端</button><button class="v2-secondary" id="v2CloudUploadCompress">上传后压缩本地</button><button class="v2-secondary" id="v2CloudCompress">仅压缩本地旧记录</button></div><div id="v2CloudStatus" class="hint"></div></div></div>`;settingsActions.parentElement.appendChild(tools);document.getElementById('v2BackupBtn').addEventListener('click',exportV2);document.getElementById('v2ExactAlarmBtn').addEventListener('click',requestExactAlarmPermission);document.getElementById('v2CheckUpdateBtn').addEventListener('click',()=>checkForAppUpdates(false));document.getElementById('v2ImportJsonBtn').addEventListener('click',()=>document.getElementById('v2ImportInput').click());document.getElementById('v2CloudUpload').addEventListener('click',()=>uploadCloudBackup({compressAfter:false}));document.getElementById('v2CloudRestore').addEventListener('click',restoreCloudBackup);document.getElementById('v2CloudUploadCompress').addEventListener('click',()=>uploadCloudBackup({compressAfter:true}));document.getElementById('v2CloudCompress').addEventListener('click',()=>{const result=compressLocalData();render();renderPlanner();renderReviews?.();updateCloudStatus(`已压缩：归档 ${result.archivedDays} 天计划，清理 ${result.removedOcrNotes} 条旧 OCR 记录`)});syncCloudForm();updateVersionChip()}
  buildPlanner();injectRecordsTools();
}

const HOME_ROUTES={
  dailySection:['每日任务','学习'],projectSection:['项目推进','项目'],cyclicSection:['循环琐事','循环'],tempSection:['临时任务','临时'],
  rhythmSection:['生活能量与节奏','思考'],
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
function buildHomeLaunchers(){
  ensureLifeRhythmSection();
  const launchers=document.createElement('section');launchers.id='v2Launchers';launchers.className='v2-launchers';launchers.innerHTML=Object.entries(HOME_ROUTES).map(([id,[title,icon]])=>`<button class="v2-launcher" data-route="${id}"><span class="v2-launcher-icon">${iconImg(icon,36)}</span><span>${title}</span></button>`).join('');document.querySelector('.quick-add').after(launchers);
  Object.keys(HOME_ROUTES).forEach(id=>document.getElementById(id)?.classList.add('v2-home-module'));
  launchers.querySelectorAll('[data-route]').forEach(btn=>btn.addEventListener('click',()=>openModulePage(btn.dataset.route)));
  const footer=document.querySelector('#calendarSection .cal-footer');if(footer&&!document.getElementById('v2PlanEntry')){const btn=document.createElement('button');btn.id='v2PlanEntry';btn.className='v2-plan-entry';btn.innerHTML=iconImg('规划',16)+'进入智能规划室 ›';btn.addEventListener('click',()=>openPlannerPage());footer.appendChild(btn)}
}
function buildQuickCaptureUI(){
  if(document.getElementById('v2CaptureFab'))return;
  const chatFab=document.getElementById('chatFab');
  chatFab.parentElement.insertBefore(Object.assign(document.createElement('button'),{id:'v2CaptureFab',className:'fab v2-capture-fab'}),chatFab);
  const overlay=document.createElement('div');overlay.id='v2CaptureOverlay';overlay.className='chat-overlay';
  overlay.innerHTML=`<div class="chat-dialog v2-capture-dialog"><div class="chat-header"><div class="left">快速整理</div><button class="chat-close" id="v2CaptureClose">✕</button></div><div class="v2-panel" style="margin:0"><p class="hint">你直接说今天/明天/后天、每天、每几天、这段时间要做什么，我会自动识别日期、任务类型和子清单。</p><div class="v2-fields"><textarea id="v2CaptureInput" rows="8" placeholder="例如：明天要收拾行李，别忘了充电宝、耳机、充电线、证件，还要订票和吃饭"></textarea><div id="v2CapturePreview" class="v2-capture-preview hint">整理结果会显示在这里</div><div class="v2-row end"><button class="v2-secondary" id="v2CaptureParse">先整理一下</button><button class="v2-primary" id="v2CaptureSave">确认录入</button></div></div></div></div>`;
  document.body.appendChild(overlay);
  document.getElementById('v2CaptureFab').innerHTML=iconImg('清单',26);
  document.getElementById('v2CaptureFab').addEventListener('click',()=>{overlay.classList.add('show');document.getElementById('v2CaptureInput').focus()});
  document.getElementById('v2CaptureClose').addEventListener('click',()=>overlay.classList.remove('show'));
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('show')});
  document.getElementById('v2CaptureParse').addEventListener('click',()=>previewNaturalCapture());
  document.getElementById('v2CaptureSave').addEventListener('click',()=>applyNaturalCapture());
}
function renderCapturePreview(result){
  const box=document.getElementById('v2CapturePreview');if(!box)return;
  if(!result||!result.tasks?.length){box.innerHTML='还没有识别到可录入的任务';return}
  box.innerHTML=`<div class="v2-capture-head"><span>${result.type} · ${result.date}</span><span>${result.tasks.length} 项</span></div>`+result.tasks.map(task=>{
    const children=task.type==='项目'?(task.steps||[]):(task.checklist||[]);
    return`<div class="v2-capture-card"><strong>${esc(task.title)}</strong>${children.length?`<div class="v2-capture-sub">${children.map(x=>`<span>${esc(x.title)}</span>`).join('')}</div>`:''}</div>`
  }).join('');
}
function previewNaturalCapture(fixedType){
  const text=document.getElementById('v2CaptureInput')?.value.trim();if(!text){toast('先写下你想整理的内容');return null}
  const result=parseNaturalTaskInput(text,fixedType);renderCapturePreview(result);return result
}
function applyParsedTasks(result,{closeOverlay=true,toastText='已整理并录入'}={}){
  if(!result?.tasks?.length){toast('这段话里还没提取到任务');return 0}
  result.tasks.forEach(task=>appData.tasks.push(task));
  persist();render();renderCalendarInlinePreview?.(result.date);if(routeState?.kind==='day'&&selectedDay===result.date)renderDaySheet();toast(`${toastText}（${result.tasks.length}项）`);
  if(closeOverlay)document.getElementById('v2CaptureOverlay')?.classList.remove('show');
  return result.tasks.length
}
function applyNaturalCapture(fixedType){
  const result=previewNaturalCapture(fixedType);if(!result)return 0;
  return applyParsedTasks(result,{closeOverlay:true,toastText:'已自动整理到任务里'});
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
  if(routeState)closeRouteInternal(false);homeScroll=window.scrollY;const app=document.querySelector('.app'),page=document.getElementById('v2RoutePage'),body=document.getElementById('v2RouteBody');body.innerHTML='';app.classList.add('v2-hidden');page.classList.add('show');document.getElementById('v2RouteTitle').textContent=title;document.getElementById('v2RouteIcon').innerHTML=iconImg(icon,28);routeState={kind};window.scrollTo(0,0);history.pushState({v2Route:kind},'',`#/${kind}`);return body
}
function openModulePage(id){const cfg=HOME_ROUTES[id],section=document.getElementById(id);if(!cfg||!section)return;const body=beginRoute(cfg[0],cfg[1],id.replace('Section',''));const marker=document.createComment('v2-return-'+id);section.parentNode.insertBefore(marker,section);const cards=[...section.querySelectorAll('.card')],expandedStates=cards.map(c=>c.classList.contains('expanded'));routeState=Object.assign(routeState,{section,marker,wasCollapsed:section.classList.contains('collapsed'),cards,expandedStates});section.classList.remove('collapsed','v2-home-module');cards.forEach(c=>c.classList.add('expanded'));body.appendChild(section);if(id==='rhythmSection')renderLifeRhythmRoute();buildSectionQuickAdd(id)}
function openPlannerPage(){const body=beginRoute('智能规划室','规划','planner'),planner=document.getElementById('v2Planner');routeState.planner=planner;body.appendChild(planner);renderPlanner()}
function requestCloseRoute(){if(routeState)history.back()}
function closeRouteInternal(restoreScroll=true){if(!routeState)return;const state=routeState;routeState=null;if(state.section){state.cards?.forEach((c,i)=>c.classList.toggle('expanded',state.expandedStates[i]));state.marker.parentNode.insertBefore(state.section,state.marker);state.marker.remove();state.section.classList.add('v2-home-module');state.section.classList.toggle('collapsed',state.wasCollapsed)}if(state.planner)document.getElementById('v2Parking').appendChild(state.planner);document.getElementById('v2RouteBody').innerHTML='';document.getElementById('v2RoutePage').classList.remove('show');document.querySelector('.app').classList.remove('v2-hidden');if(restoreScroll)requestAnimationFrame(()=>window.scrollTo(0,homeScroll))
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
        <div class="v2-rhythm-overview-item"><b>🔋 今日电量</b><span>${esc(overview.energyLabel||'未记录')}</span></div>
        <div class="v2-rhythm-overview-item"><b>🧭 今日节奏</b><span>${esc(overview.rhythmLabel||'未记录')}</span></div>
        <div class="v2-rhythm-overview-item"><b>✅ 任务完成度</b><span>${overview.completionPercent}%</span></div>
        <div class="v2-rhythm-overview-item"><b>☁️ 主要影响因素</b><span>${esc(overview.factors.join('、')||'今天还没记录')}</span></div>
      </div>
      ${renderEnergyManualControls(entry,overview)}
      <div class="v2-rhythm-tags">${overview.factors.length?overview.factors.map(x=>`<span class="v2-chip">${esc(x)}</span>`).join(''):'<span class="v2-chip">先点“快速记录今天”开始</span>'}</div>
      ${overview.lowEnergy?`<div class="v2-rhythm-emergency"><strong>🛟 低电量提醒</strong><div class="v2-rhythm-mini">${emergency.short.slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('')}</div></div>`:''}
      <div class="v2-row end" style="margin-top:10px"><button class="v2-primary" id="v2RhythmQuickFill">快速记录今天</button></div>
    </div>`;
  document.getElementById('v2RhythmQuickFill')?.addEventListener('click',()=>openRhythmQuickRecord(date));
  box.querySelectorAll('[data-rhythm-energy]').forEach(btn=>btn.addEventListener('click',()=>setLifeRhythmEnergy(date,btn.dataset.rhythmEnergy)));
}
function renderLifeRhythmRoute(){
  const target=routeState?.kind==='rhythm'?document.getElementById('v2RouteBody'):document.getElementById('rhythmList');
  if(!target)return;
  const date=selectedDay||todayStr(),entry=getLifeRhythmEntry(date,true),overview=deriveLifeRhythmOverview(entry,date),emergency=appData.v2.lifeRhythm.emergencyKit;
  target.innerHTML=`
    <div class="v2-panel v2-rhythm-home">
      <div class="v2-rhythm-hero">
        <div>
          <h3>🔋 今日状态总览</h3>
          <p class="hint">上面是今天的结果，下面这些卡片记录的是原因。记得越顺手，AI 之后越懂你。</p>
        </div>
        <span class="v2-rhythm-badge ${overview.lowEnergy?'low':'normal'}">${esc(overview.energyLabel)}</span>
      </div>
      <div class="v2-rhythm-overview-grid">
        <div class="v2-rhythm-overview-item"><b>🔋 今日电量</b><span>${esc(overview.energyLabel)}</span></div>
        <div class="v2-rhythm-overview-item"><b>🧭 今日节奏</b><span>${esc(overview.rhythmLabel)}</span></div>
        <div class="v2-rhythm-overview-item"><b>✅ 任务完成度</b><span>${overview.completionPercent}%</span></div>
        <div class="v2-rhythm-overview-item"><b>☁️ 主要影响因素</b><span>${esc(overview.factors.join('、')||'今天还没记录')}</span></div>
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
  document.getElementById('v2RhythmQuickFill')?.addEventListener('click',()=>openRhythmQuickRecord(date));
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

function renderDaySheet(){
  window.currentDaySheetDate=selectedDay;
  const items=displayItems(selectedDay),done=items.filter(x=>x.status==='done').length;const past=selectedDay<todayStr();
  const emotions=getEmotionEntries(selectedDay),notes=getDayNotes(selectedDay),inspirations=getDayInspirationEntries(selectedDay),holiday=getHolidayLabel(selectedDay),birthdays=getBirthdayEntries(selectedDay);
  let html=`<div class="v2-day-summary"><span>${items.length} 项任务</span><span>${done} 项完成</span><span>${past?'历史回顾':selectedDay===todayStr()?'今天':'未来计划'}</span></div>`;
  if(holiday||birthdays.length)html+=`<div class="v2-panel"><div class="v2-row">${holiday?`<span class="v2-chip active">${esc(holiday)}</span>`:''}${birthdays.length?`<span class="v2-chip">🎂 ${birthdays.map(x=>x.name).join('、')}</span>`:''}</div></div>`;
  const rhythm=getLifeRhythmEntry(selectedDay,false);
  if(rhythm)html+=`<div class="v2-panel"><h3>🔋 当天状态感知</h3><div class="v2-rhythm-summary"><span>${esc(rhythm.sleepStart&&rhythm.wakeTime?`😴 ${rhythm.sleepStart}-${rhythm.wakeTime}${sleepDurationText(rhythm.sleepStart,rhythm.wakeTime)?` · ${sleepDurationText(rhythm.sleepStart,rhythm.wakeTime)}`:''}`:'😴 睡眠未填')}</span><span>${esc(rhythm.energyLevel||'电量未填')}</span><span>${esc(rhythm.rhythm||'节奏未填')}</span><span>${esc(rhythm.control?`掌控感${rhythm.control}`:'掌控感未填')}</span></div><div class="v2-rhythm-tags" style="margin-top:8px">${(rhythm.rechargeTags||[]).slice(0,3).map(x=>`<span class="v2-chip active">补能·${esc(x)}</span>`).join('')}${(rhythm.drainTags||[]).slice(0,3).map(x=>`<span class="v2-chip">消耗·${esc(x)}</span>`).join('')}${((rhythm.rhythmFactors||rhythm.interrupts||[]).slice(0,2)).map(x=>`<span class="v2-chip">打断·${esc(x)}</span>`).join('')}</div>${(rhythm.note||rhythm.rhythmNote)?`<div class="v2-day-meta" style="margin-top:8px;white-space:pre-wrap">${esc(rhythm.rhythmNote||rhythm.note)}</div>`:''}<div class="v2-row end" style="margin-top:10px"><button class="v2-secondary" id="v2OpenRhythmDay">编辑这一天的状态</button></div></div>`;
  if(past&&!getPlan(selectedDay,false))html+='<div class="v2-warning">旧版没有保存这一天的任务快照，因此只能显示当时实际保存下来的记录。V2 启用后的日期会完整保留。</div>';
  const sortedItems=[...items].sort((a,b)=>(a.plannedStart||'99:99').localeCompare(b.plannedStart||'99:99'));
  let currentSlot='';
  html+=sortedItems.length?sortedItems.map(item=>{const slot=getTimeSlotLabel(item.plannedStart||item.alarmTime||'');const slotHeader=slot!==currentSlot?`<div class="v2-time-slot ${slot}">${timeSlotEmoji(slot)} ${slot}</div>`:'';currentSlot=slot;const task=item.sourceTaskId?appData.tasks.find(x=>x.id===item.sourceTaskId):null;const checklist=task?.checklist?.length?`<div class="v2-sheet-checklist">${task.checklist.map(x=>`<div class="v2-sheet-check ${x.done?'done':''}"><span>${x.done?'✓':'○'}</span><span>${esc(x.title)}</span></div>`).join('')}</div>`:'';return slotHeader+`<div class="v2-day-item ${item.status==='done'?'done':''}" style="border-left-color:${COLOR[item.type]||COLOR.记录}"><button class="v2-day-check" data-v2-toggle="${esc(item.id)}">✓</button><div><div class="v2-day-title"><span class="v2-task-emoji">${taskEmoji(item)}</span>${esc(item.title)}</div><div class="v2-day-meta">${esc(item.type||'任务')}${item.timeLabel?' · '+esc(item.timeLabel):''}${item.plannedStart?' · '+esc(item.plannedStart):''}${item.reminderMode==='alarm'?' · 闹钟':' · 通知'}</div>${checklist}</div><div class="v2-row" style="gap:6px;flex:0 0 auto"><button class="v2-secondary" data-v2-calendar="${esc(item.id)}" title="加入手机日历">日历</button><button class="v2-important" data-v2-important="${esc(item.id)}" title="切换重要提醒">${item.important?'★':'☆'}</button><button class="v2-danger" data-v2-delete="${esc(item.id)}" title="删除这项">删</button></div></div>`}).join(''):'<div class="v2-empty">这一天还没有安排<br>可以在下面添加一项</div>';
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
  document.getElementById('v2OpenRhythmDay')?.addEventListener('click',()=>{openModulePage('rhythmSection');renderLifeRhythmRoute()});
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
  if(type==='循环')wrap.innerHTML=`<h3>＋ 新增${type}</h3><div class="v2-fields"><input id="${sectionId}-title" placeholder="写下要循环做的事"><div class="v2-row"><input id="${sectionId}-cycle" type="number" min="1" value="2" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:9px" placeholder="每几天一次"><button class="v2-primary" id="${sectionId}-add">添加</button></div><textarea id="${sectionId}-bulk" rows="4" placeholder="也可以直接贴一大段内容，我会自动拆成这个板块的任务"></textarea><div class="v2-row end"><button class="v2-secondary" id="${sectionId}-bulk-add">智能整理到本板块</button></div></div>`;
  else wrap.innerHTML=`<h3>＋ 新增${type}</h3><div class="v2-fields"><input id="${sectionId}-title" placeholder="写下任务内容"><div class="v2-row">${type!=='每日'?'<input id="'+sectionId+'-time" type="time" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:9px">':''}<button class="v2-primary" id="${sectionId}-add">添加</button></div><textarea id="${sectionId}-bulk" rows="4" placeholder="直接说一大段，我会自动拆成${type}任务${type==='临时'?'，并识别今天/明天/后天':''}"></textarea><div class="v2-row end"><button class="v2-secondary" id="${sectionId}-bulk-add">智能整理到本板块</button></div></div>`;
  section.insertBefore(wrap,section.children[1]||null);
  document.getElementById(`${sectionId}-add`).addEventListener('click',()=>addSectionTask(sectionId));
  document.getElementById(`${sectionId}-bulk-add`).addEventListener('click',()=>addSectionTasksFromText(sectionId));
}
function addSectionTasksFromText(sectionId){
  const typeMap={dailySection:'每日',projectSection:'项目',cyclicSection:'循环',tempSection:'临时'},type=typeMap[sectionId],input=document.getElementById(`${sectionId}-bulk`);
  const text=input?.value.trim();if(!text){toast('先写下这一批内容');return}
  const result=parseNaturalTaskInput(text,type);if(!result)return;
  const count=applyParsedTasks(result,{closeOverlay:false,toastText:`已整理到${type}板块`});
  if(count&&input)input.value='';
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
