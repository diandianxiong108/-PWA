(function(){
  const scriptSrc = document.currentScript?.getAttribute('src') || '';
  const ASSET_BASE = /(^|\/)v2\//.test(scriptSrc.replace(/\\/g, '/'))
    ? '../assets/v2-stickers/'
    : 'assets/v2-stickers/';

  const QUICK_ENTRIES = [
    { id: 'today', title: '今日清单', tone: 'tone-yellow', image: 'icons-collage-v2/icon-daily-task.png', action: 'day' },
    { id: 'pool', title: '任务池', tone: 'tone-mint', image: 'icons-collage-v2/icon-note.png', action: 'taskPoolSection' },
    { id: 'planner', title: '本周规划', tone: 'tone-blue', image: 'ui-icons-collage-v1/icon-nav-plan.png', action: 'planner' },
    { id: 'bill', title: '记账', tone: 'tone-yellow', image: 'ui-icons-collage-v1/icon-settings.png', action: 'billSection' },
    { id: 'inspire', title: '灵感便签', tone: 'tone-pink', image: 'cats/cat-note.png', action: 'inspireSection' },
    { id: 'notes', title: '随手记', tone: 'tone-mint', image: 'icons-collage-v2/icon-note.png', action: 'notesSection' },
    { id: 'daily', title: '每日任务', tone: 'tone-yellow', image: 'icons-collage-v2/icon-habit.png', action: 'dailySection' },
    { id: 'project', title: '项目推进', tone: 'tone-blue', image: 'icons-collage-v2/icon-goal.png', action: 'projectSection' },
    { id: 'cyclic', title: '循环琐事', tone: 'tone-blue', image: 'icons-collage-v2/icon-focus.png', action: 'cyclicSection' },
    { id: 'temp', title: '临时任务', tone: 'tone-pink', image: 'icons-collage-v2/icon-pomodoro.png', action: 'tempSection' },
    { id: 'rhythm', title: '生活能量', tone: 'tone-mint', image: 'icons-collage-v2/icon-ai-review.png', action: 'rhythmSection' },
    { id: 'review', title: 'AI复盘', tone: 'tone-blue', image: 'icons-collage-v2/icon-ai-review.png', action: 'reviewSection' },
    { id: 'wish', title: '愿望基金', tone: 'tone-pink', image: 'icons-collage-v2/icon-goal.png', action: 'wishSection' },
    { id: 'all', title: '全部功能', tone: 'tone-yellow', image: 'icons-collage-v2/icon-all.png', action: 'all' }
  ];

  const FEATURE_GROUPS = [
    { title: '任务管理', items: [
      ['今日清单', 'day'],
      ['任务池', 'taskPoolSection'],
      ['每日任务', 'dailySection'],
      ['项目推进', 'projectSection'],
      ['循环琐事', 'cyclicSection'],
      ['临时任务', 'tempSection']
    ]},
    { title: 'AI工具', items: [
      ['AI助手', 'assistant'],
      ['智能识别', 'capture'],
      ['智能规划室', 'planner'],
      ['AI复盘', 'reviewSection']
    ]},
    { title: '记录与生活', items: [
      ['生活能量', 'rhythmSection'],
      ['饮食波动', 'foodSection'],
      ['熬夜节点', 'lateNightSection'],
      ['灵感便签', 'inspireSection'],
      ['随手记', 'notesSection'],
      ['健康提醒', 'healthSection'],
      ['生日提醒', 'birthdaySection']
    ]},
    { title: '财务与其他', items: [
      ['账单', 'billSection'],
      ['额外完成', 'extraSection'],
      ['成就勋章', 'badgeSection'],
      ['愿望基金', 'wishSection'],
      ['设置', 'settings']
    ]}
  ];

  function asset(path){
    return ASSET_BASE + path;
  }

  function todayKey(){
    if(typeof window.todayStr === 'function') return window.todayStr();
    return new Date().toISOString().slice(0, 10);
  }

  function getMode(){
    if(typeof window.getCurrentPlannerMode === 'function') return window.getCurrentPlannerMode() || 'normal';
    return 'normal';
  }

  function getAllTasks(){
    if(Array.isArray(window.appData?.tasks)) return window.appData.tasks;
    if(typeof appData !== 'undefined' && Array.isArray(appData?.tasks)) return appData.tasks;
    return [];
  }

  function getTodayItems(){
    if(typeof window.displayItems === 'function') return window.displayItems(todayKey()) || [];
    return [];
  }

  function getTaskPoolItems(){
    if(typeof window.getTaskPool === 'function') return window.getTaskPool() || [];
    return [];
  }

  function getRhythmEntry(){
    if(typeof window.getLifeRhythmEntry === 'function') return window.getLifeRhythmEntry(todayKey(), false) || null;
    return null;
  }

  function esc(text){
    if(typeof window.esc === 'function') return window.esc(text);
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function countDone(items){
    return items.filter(item => String(item?.status || '').toLowerCase() === 'done').length;
  }

  function countByType(type){
    return getAllTasks().filter(item => String(item?.type || '').trim() === type).length;
  }

  function countOpenPool(items){
    return items.filter(item => !['已完成', '放弃'].includes(String(item?.status || ''))).length;
  }

  function formatDateLabel(dateStr){
    const d = new Date(`${dateStr}T12:00:00`);
    return `${d.getMonth() + 1}.${d.getDate()} 周${'日一二三四五六'[d.getDay()]}`;
  }

  function inferTime(item, index){
    return item?.plannedStart || item?.alarmTime || ['08:00', '10:00', '14:00'][index] || '--:--';
  }

  function quickId(prefix){
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function quickPersist(){
    try{
      if(typeof window.persist === 'function') window.persist();
      else if(window.appData) localStorage.setItem('taskMateData_v2', JSON.stringify(window.appData));
    }catch(error){}
  }

  function quickRerender(){
    try{ if(typeof window.render === 'function') window.render(); }
    catch(error){ renderShell(); }
    setTimeout(renderShell, 0);
  }

  function showQuickToast(text){
    if(typeof window.toast === 'function') window.toast(text);
  }

  function getQuickText(){
    return document.getElementById('homeV2QuickText')?.value.trim() || '';
  }

  function clearQuickText(){
    const input = document.getElementById('homeV2QuickText');
    if(input) input.value = '';
  }

  function saveHomeV2Quick(target){
    const text = getQuickText();
    if(!text){ showQuickToast('先写一句就行'); return; }
    window.appData = window.appData || {};
    const ds = todayKey();
    if(target === 'today'){
      window.upsertPlanItem?.(ds, {
        id: quickId('home-quick-today'),
        title: text,
        type: '临时',
        status: 'todo',
        source: 'home-quick',
        createdAt: new Date().toISOString()
      });
      showQuickToast('已放进今日清单');
    }else if(target === 'pool'){
      window.upsertTaskPoolItem?.({
        id: quickId('home-quick-pool'),
        title: text,
        taskType: '临时',
        status: '待安排',
        source: 'home-quick',
        rawText: text,
        createdAt: new Date().toISOString()
      });
      showQuickToast('已丢进任务池');
    }else if(target === 'inspire'){
      window.appData.inspirations = Array.isArray(window.appData.inspirations) ? window.appData.inspirations : [];
      window.appData.inspirations.unshift({id: quickId('idea'), text, emotion: '💡', date: ds, source: 'home-quick', createdAt: new Date().toISOString()});
      showQuickToast('灵感已收住');
    }else{
      window.appData.notes = Array.isArray(window.appData.notes) ? window.appData.notes : [];
      window.appData.notes.unshift({id: quickId('note'), title: '随手记', text, date: ds, createdAt: new Date().toISOString(), pinned: false, done: false, source: 'home-quick'});
      showQuickToast('随手记已保存');
    }
    clearQuickText();
    quickPersist();
    quickRerender();
  }

  function saveHomeV2Bill(){
    const amount = Number(document.getElementById('homeV2BillAmount')?.value || 0);
    const rawType = document.getElementById('homeV2BillType')?.value || 'expense';
    const note = document.getElementById('homeV2BillNote')?.value.trim() || '';
    let category = document.getElementById('homeV2BillCategory')?.value.trim() || '';
    if(!amount || amount <= 0){ showQuickToast('先填金额'); return; }
    window.appData = window.appData || {};
    const records = window.appData.records = window.appData.records || {entries: [], categories: {income: ['收入'], expense: ['餐饮', '交通', '购物', '其他']}};
    records.entries = Array.isArray(records.entries) ? records.entries : [];
    records.categories = records.categories || {income: ['收入'], expense: ['餐饮', '交通', '购物', '其他']};
    const type = rawType === 'refund' ? 'income' : rawType;
    category = category || (rawType === 'refund' ? '退款' : type === 'income' ? '收入' : '其他');
    const entry = {id: quickId('bill'), date: todayKey(), type, category, amount, note, createdAt: new Date().toISOString(), source: 'home-quick'};
    records.entries.push(entry);
    try{ window.linkFinanceEntry?.(entry); }catch(error){}
    document.getElementById('homeV2BillAmount').value = '';
    document.getElementById('homeV2BillNote').value = '';
    quickPersist();
    try{ window.renderBills?.(); }catch(error){}
    quickRerender();
    showQuickToast(rawType === 'refund' ? '退款已记下' : type === 'income' ? '收入已记下' : '支出已记下');
  }

  function saveHomeV2Pool(){
    const input = document.getElementById('homeV2PoolText');
    const text = input?.value.trim() || '';
    if(!text){ showQuickToast('先写任务名'); return; }
    window.upsertTaskPoolItem?.({
      id: quickId('home-pool'),
      title: text,
      taskType: '临时',
      status: '待安排',
      source: 'home-pool',
      rawText: text,
      createdAt: new Date().toISOString()
    });
    if(input) input.value = '';
    quickPersist();
    quickRerender();
    showQuickToast('已放进任务池');
  }

  function ensureMount(){
    const app = document.querySelector('.app');
    if(!app) return null;
    let mount = document.getElementById('homeV2ShellMount');
    if(!mount){
      mount = document.createElement('section');
      mount.id = 'homeV2ShellMount';
      app.prepend(mount);
    }
    return mount;
  }

  function ensureFeatureSheet(){
    let overlay = document.getElementById('homeV2FeatureOverlay');
    if(overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'homeV2FeatureOverlay';
    overlay.className = 'homev2-feature-overlay';
    overlay.innerHTML = `
      <div class="homev2-feature-sheet">
        <div class="homev2-feature-head">
          <div class="homev2-feature-title">全部功能</div>
          <button class="homev2-feature-close" type="button" data-homev2-close>×</button>
        </div>
        <div id="homeV2FeatureBody"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', event => {
      if(event.target === overlay || event.target.closest('[data-homev2-close]')){
        overlay.classList.remove('show');
      }
    });
    return overlay;
  }

  function ensureFallbackOverlay(id, title, placeholder){
    let overlay = document.getElementById(id);
    if(overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'homev2-fallback-overlay';
    overlay.innerHTML = `
      <div class="homev2-fallback-dialog">
        <div class="homev2-fallback-head">
          <strong>${title}</strong>
          <button class="homev2-fallback-close" type="button" data-fallback-close>×</button>
        </div>
        <div class="homev2-fallback-copy">正式弹层这次没有完整挂上来，我先保留一个可打开的临时入口，避免你点了完全没反应。</div>
        <textarea class="homev2-fallback-input" placeholder="${placeholder}"></textarea>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', event => {
      if(event.target === overlay || event.target.closest('[data-fallback-close]')){
        overlay.classList.remove('show');
      }
    });
    return overlay;
  }
  function safeText(value){
    return String(value ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
  const ASSISTANT_MODES = {
    think: {
      label: '陪我聊',
      prompt: '我想先聊聊，不急着安排任务。请像网页版聊天一样接住我的情绪，帮我看清楚我为什么会这样；如果适合，再轻轻提一个问题，不要上来就给我列计划。',
      status: '陪我聊：先托住情绪，不急着任务化'
    },
    tidy: {
      label: '快速整理',
      prompt: '帮我把下面这段话快速整理成：已完成、待办、日程/截止日期、想法、情绪记录、待确认。先预览，不要直接写入系统：',
      status: '快速整理：分类预览，不长聊'
    },
    today: {
      label: '安排今天',
      prompt: '根据我的状态，只帮我安排今天真正适合做的 1-3 件事。请轻一点，不要把所有事都压到今天。',
      status: '安排今天：只挑 1-3 件'
    },
    days: {
      label: '多天安排',
      prompt: '帮我把这些事情分散到未来 3 天 / 7 天 / 本周，不要都堆到今天。先给计划草案，等我确认再落地。',
      status: '多天安排：分散到几天'
    },
    projects: {
      label: '拆大项目',
      prompt: '我现在有一个或多个大项目卡住了。请先帮我区分主线、副线、暂缓项，再把每个项目拆成一个今天能碰一下的小步骤，不要让我感觉又多了一座山。',
      status: '拆大项目：只拆下一小步'
    },
    long: {
      label: '长期规划',
      prompt: '我想聊长期规划。请先帮我从愿景、年度主题、季度方向、月度推进、本周动作、今天最小行动来想清楚，不要一上来生成一堆任务。',
      status: '长期规划：愿景到本周动作'
    },
    consult: {
      label: '知识咨询',
      prompt: '我想咨询一个方向需要准备什么。请先给知识框架，再问我想优先准备哪几块，最后再考虑项目拆解。',
      status: '知识咨询：先框架，再选择'
    }
  };
  function currentAssistantMode(){
    const active = document.querySelector('#homeV2AssistantPanel [data-homev2-chat-mode].active');
    return active?.dataset.homev2ChatMode || 'think';
  }
  function assistantModeLabel(mode = currentAssistantMode()){
    return ASSISTANT_MODES[mode]?.label || ASSISTANT_MODES.think.label;
  }
  function ensureAssistantPanel(){
    let overlay = document.getElementById('homeV2AssistantPanel');
    if(overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'homeV2AssistantPanel';
    overlay.className = 'homev2-modal-overlay';
    overlay.innerHTML = `
      <section class="homev2-modal-sheet homev2-assistant-sheet" role="dialog" aria-modal="true" aria-label="AI助手">
        <div class="homev2-assistant-grip" aria-hidden="true"></div>
        <div class="homev2-assistant-topline">
          <div class="homev2-assistant-title">
            <span>🤖</span>
            <div>
              <small>Task Mate</small>
              <strong>AI助手</strong>
            </div>
          </div>
          <button class="homev2-modal-close" type="button" data-homev2-modal-close aria-label="关闭">×</button>
        </div>
        <div class="homev2-assistant-toolbar" aria-label="AI助手工具">
          <button type="button" data-homev2-chat-action="weekly">生成本周摘要</button>
          <button type="button" data-homev2-chat-action="memory">查看我的记忆</button>
          <button type="button" data-homev2-chat-action="next">下一轮</button>
          <button type="button" data-homev2-chat-action="summary">会话摘要</button>
          <button type="button" data-homev2-chat-action="new">+ 新对话</button>
        </div>
        <div class="homev2-chat-modebar" aria-label="聊天模式">
          <button type="button" class="active" data-homev2-chat-mode="think">陪我聊</button>
          <button type="button" data-homev2-chat-mode="tidy">快速整理</button>
          <button type="button" data-homev2-chat-mode="today">安排今天</button>
          <button type="button" data-homev2-chat-mode="days">多天安排</button>
          <button type="button" data-homev2-chat-mode="projects">拆大项目</button>
          <button type="button" data-homev2-chat-mode="long">长期规划</button>
          <button type="button" data-homev2-chat-mode="consult">知识咨询</button>
        </div>
        <div class="homev2-assistant-status" id="homeV2AssistantStatus">准备就绪</div>
        <div class="homev2-assistant-log" id="homeV2AssistantLog"></div>
        <div class="homev2-assistant-tools">
          <button type="button" data-homev2-ai-prompt="我最近压力有点大，事情很多，先陪我聊聊，不要急着安排">陪我聊聊</button>
          <button type="button" data-homev2-ai-prompt="帮我从任务池挑三个，但今天只安排最轻的一点">任务池挑三</button>
          <button type="button" data-homev2-ai-prompt="今天低电量，帮我只留最低完成线">低电量安排</button>
          <button type="button" data-homev2-ai-prompt="我有几个项目并行，帮我判断主线、副线和每个项目的下一小步">拆大项目</button>
        </div>
        <div class="homev2-assistant-input">
          <textarea id="homeV2AssistantInput" rows="3" placeholder="想说什么都可以，我先陪你捋一捋。"></textarea>
          <button type="button" id="homeV2AssistantSend">发送</button>
        </div>
      </section>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', event => {
      if(event.target === overlay || event.target.closest('[data-homev2-modal-close]')){
        overlay.classList.remove('show');
      }
    });
    overlay.querySelector('#homeV2AssistantSend')?.addEventListener('click', sendAssistantPanelMessage);
    overlay.querySelector('#homeV2AssistantInput')?.addEventListener('keydown', event => {
      if(event.key === 'Enter' && !event.shiftKey){
        event.preventDefault();
        sendAssistantPanelMessage();
      }
    });
    overlay.querySelectorAll('[data-homev2-ai-prompt]').forEach(button => {
      button.addEventListener('click', () => {
        const input = document.getElementById('homeV2AssistantInput');
        if(input) input.value = button.dataset.homev2AiPrompt || '';
        sendAssistantPanelMessage();
      });
    });
    overlay.querySelectorAll('[data-homev2-chat-mode]').forEach(button => {
      button.addEventListener('click', () => {
        overlay.querySelectorAll('[data-homev2-chat-mode]').forEach(item => item.classList.toggle('active', item === button));
        const mode = button.dataset.homev2ChatMode || '';
        const input = document.getElementById('homeV2AssistantInput');
        if(input){
          input.value = ASSISTANT_MODES[mode]?.prompt || '';
          input.focus();
        }
        setAssistantStatus(ASSISTANT_MODES[mode]?.status || '准备就绪', 'idle');
      });
    });
    overlay.addEventListener('click', event => {
      const actionButton = event.target.closest('[data-homev2-artifact-action]');
      if(!actionButton) return;
      event.preventDefault();
      handleAssistantArtifactAction(actionButton.dataset.homev2ArtifactAction, actionButton.dataset.homev2ArtifactPayload || '');
    });
    overlay.querySelectorAll('[data-homev2-chat-action]').forEach(button => {
      button.addEventListener('click', () => handleAssistantPanelAction(button.dataset.homev2ChatAction));
    });
    return overlay;
  }
  function handleAssistantPanelAction(action){
    if(action === 'new'){
      localStorage.setItem('task-chat-history','[]');
      localStorage.setItem('task-chat-round', String(Number(localStorage.getItem('task-chat-round') || '0') + 1));
      renderAssistantPanelLog([{role:'ai', content:'新对话已经开始啦。你可以直接把今天的状态、手账内容或想安排的事丢给我。'}]);
      return;
    }
    if(action === 'next'){
      localStorage.setItem('task-chat-round', String(Number(localStorage.getItem('task-chat-round') || '0') + 1));
      renderAssistantPanelLog([{role:'ai', content:'我们进入下一轮。我会把重点放在“现在最适合做什么”和“哪些可以先放下”。'}]);
      return;
    }
    if(action === 'summary'){
      const summary = window.buildConversationCarrySummary?.() || summarizeAssistantHistory();
      renderAssistantPanelLog([{role:'ai', content:summary}]);
      return;
    }
    if(action === 'weekly'){
      const text = buildLocalWeekSummary();
      renderAssistantPanelLog([{role:'ai', content:text}]);
      return;
    }
    if(action === 'memory'){
      try{
        if(window.AIMemorySystem?.showMemory){
          window.AIMemorySystem.showMemory(window.appData);
          return;
        }
      }catch(error){}
      renderAssistantPanelLog([{role:'ai', content:'我会优先记住你的偏好、常见卡点和适合你的任务节奏。等记忆系统可用时，这里会直接打开完整记忆页。'}]);
    }
  }
  function summarizeAssistantHistory(){
    const history = assistantHistory().slice(-10).map(item => item.content || item.text || '').filter(Boolean);
    if(!history.length) return '目前还没有足够的对话可以摘要。你可以先告诉我今天的状态，或者贴一段想整理的内容。';
    return `这轮对话的重点：${history.join(' / ').slice(0, 240)}${history.join(' / ').length > 240 ? '...' : ''}`;
  }
  function buildLocalWeekSummary(){
    const data = window.appData || {};
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    const active = tasks.filter(task => !task.done && !task.completed).slice(0, 6);
    if(!active.length) return '这周暂时没有抓到未完成任务。你可以先用智能识别导入手账，或者让我从任务池里挑一点。';
    return `本周可以先盯住这几件：${active.map(task => task.title || task.text || task.name || '未命名任务').join('、')}。如果你今天低电量，我们就只挑其中最小的一步。`;
  }
  function assistantHistoryDigest(limit = 10){
    const history = assistantHistory().slice(-limit);
    return history.map(item => `${item.role === 'user' ? '用户' : 'AI'}：${String(item.content || item.text || '').slice(0, 180)}`).join('\n');
  }
  function maybeCompressAssistantHistory(history){
    if(!Array.isArray(history) || history.length < 18) return history;
    const digest = history.slice(-14).map(item => String(item.content || item.text || '').slice(0, 120)).filter(Boolean).join(' / ');
    if(!digest) return history;
    const old = localStorage.getItem('task-chat-summary') || '';
    const next = `最近对话摘要：${digest.slice(0, 900)}`;
    localStorage.setItem('task-chat-summary', old ? `${old}\n${next}`.slice(-1800) : next);
    return history.slice(-10);
  }
  function taskBrief(task){
    return {
      title: task.title || task.text || task.name || '未命名',
      type: task.type || task.taskType || '任务',
      status: task.status || (task.completed || task.done ? '已完成' : '未完成'),
      duration: task.duration || task.estimate || '',
      deadline: task.deadline || task.date || task.scheduledDate || ''
    };
  }
  function buildAssistantContextPack(mode){
    const data = window.appData || {};
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    const pool = (window.getTaskPool?.() || data.v2?.smartCapture?.taskPool || []).filter(item => !['已完成','放弃'].includes(item.status));
    const today = window.todayStr?.() || new Date().toISOString().slice(0,10);
    const todayItems = (window.displayItems?.(today) || []).slice(0, 8).map(taskBrief);
    const activeTasks = tasks.filter(task => !(task.completed || task.done)).slice(0, mode === 'think' ? 4 : 12).map(taskBrief);
    const poolBrief = pool.slice(0, mode === 'think' ? 4 : 12).map(taskBrief);
    const projectBrief = tasks.filter(task => task.type === '项目').slice(0, mode === 'projects' || mode === 'long' ? 10 : 4).map(taskBrief);
    const emotionBrief = (data.v2?.emotionLogs || []).slice().sort((a,b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || ''))).slice(0, 8).map(item => ({
      date:item.date || '',
      emotion:item.emotion || '',
      intensity:item.intensity || '',
      event:String(item.event || item.rawText || '').slice(0, 90)
    }));
    const lifeDays = Object.values(data.v2?.lifeRhythm?.days || {}).sort((a,b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 5).map(item => ({
      date:item.date || '',
      energy:item.energyLevel || '',
      rhythm:item.rhythm || '',
      control:item.control || '',
      completion:item.completionPercent || '',
      factors:(item.rhythmFactors || item.interrupts || []).slice(0, 3)
    }));
    const menstrual = data.menstrual ? {
      cycleDays:data.menstrual.cycleDays || 28,
      periodDays:data.menstrual.periodDays || 5,
      lastPeriodStart:data.menstrual.lastPeriodStart || '',
      historyCount:Array.isArray(data.menstrual.history) ? data.menstrual.history.length : 0
    } : null;
    return {
      mode,
      modeLabel: assistantModeLabel(mode),
      costLevel: ['think','consult'].includes(mode) ? 'light' : 'focused',
      today,
      appMode: window.modeLabel?.() || '',
      todayStatus: data.todayStatus || {},
      memorySummary: String(localStorage.getItem('task-chat-summary') || '').slice(-1200),
      recentConversationDigest: assistantHistoryDigest(mode === 'think' ? 6 : 10).slice(-1600),
      relevant: {
        todayItems,
        taskPool: poolBrief,
        activeTasks,
        projects: projectBrief,
        emotions: emotionBrief,
        lifeRhythm: lifeDays,
        menstrual
      }
    };
  }
  function renderAssistantPanelLog(extra = []){
    const log = document.getElementById('homeV2AssistantLog');
    if(!log) return;
    let history = [];
    try{
      const saved = JSON.parse(localStorage.getItem('task-chat-history') || '[]');
      if(Array.isArray(saved)) history = saved.slice(-8).map(item => ({role:item.role === 'user' ? 'user' : 'ai', content:item.content || item.text || ''}));
    }catch(error){}
    const items = history.concat(extra).filter(item => item.content);
    if(!items.length){
      log.innerHTML = `<div class="homev2-ai-bubble ai">我在。你可以直接说今天的状态、想做的事，或者让我从任务池里帮你挑一点。</div>`;
      return;
    }
    log.innerHTML = items.map(item => {
      const role = item.role === 'user' ? 'user' : 'ai';
      const artifacts = role === 'ai' ? renderAssistantArtifacts(item.artifacts) : '';
      return `<div class="homev2-ai-bubble ${role}">${safeText(item.content)}</div>${artifacts}`;
    }).join('');
    log.scrollTop = log.scrollHeight;
  }
  function artifactPayload(artifacts){
    try{return encodeURIComponent(JSON.stringify(artifacts || {}))}catch(error){return ''}
  }
  function renderAssistantArtifacts(artifacts){
    if(!artifacts) return '';
    const tasks = Array.isArray(artifacts.suggestedTasks) ? artifacts.suggestedTasks : [];
    const done = Array.isArray(artifacts.completedItems) ? artifacts.completedItems : [];
    const hasContent = tasks.length || done.length || artifacts.consensus;
    if(!hasContent) return '';
    const payload = artifactPayload(artifacts);
    const taskList = tasks.length ? `<div class="homev2-artifact-list">${tasks.slice(0,5).map(task => `<span>${safeText(task.title || task.text || task.name || '未命名任务')}</span>`).join('')}</div>` : '';
    const doneList = done.length ? `<div class="homev2-artifact-list muted">${done.slice(0,4).map(item => `<span>${safeText(item.title || item.text || item.name || String(item))}</span>`).join('')}</div>` : '';
    return `<div class="homev2-artifact-card">
      <strong>要不要把这次共识落地？</strong>
      ${artifacts.consensus ? `<p>${safeText(typeof artifacts.consensus === 'string' ? artifacts.consensus : artifacts.consensus.summary || '')}</p>` : ''}
      ${taskList}${doneList}
      <div class="homev2-artifact-actions">
        <button type="button" data-homev2-artifact-action="pool" data-homev2-artifact-payload="${payload}">加入任务池</button>
        <button type="button" data-homev2-artifact-action="today" data-homev2-artifact-payload="${payload}">只安排今天</button>
        <button type="button" data-homev2-artifact-action="idea" data-homev2-artifact-payload="${payload}">保存为想法</button>
        <button type="button" data-homev2-artifact-action="done" data-homev2-artifact-payload="${payload}">记录完成</button>
      </div>
    </div>`;
  }
  function decodeArtifactPayload(payload){
    try{return JSON.parse(decodeURIComponent(payload || ''))}catch(error){return null}
  }
  function normalizeArtifactTask(task){
    return {
      title:String(task?.title || task?.text || task?.name || '').trim() || '未命名任务',
      taskType:task?.type || '临时',
      note:task?.note || task?.reason || '',
      duration:task?.duration || task?.estimate || '',
      rawText:task?.rawText || task?.title || task?.text || '',
      source:'ai-assistant'
    };
  }
  function handleAssistantArtifactAction(action, payload){
    const artifacts = decodeArtifactPayload(payload);
    if(!artifacts) return;
    const tasks = (artifacts.suggestedTasks || []).map(normalizeArtifactTask).filter(item => item.title);
    const done = artifacts.completedItems || [];
    if(action === 'pool'){
      tasks.forEach(item => window.upsertTaskPoolItem?.(Object.assign({}, item, {status:'待安排'})));
      window.persist?.(); window.render?.();
      renderAssistantPanelLog([{role:'ai', content:`已确认落地：${tasks.length} 条放进任务池。今天不用全做，先让它们有位置。`}]);
      return;
    }
    if(action === 'today'){
      const today = window.todayStr?.() || new Date().toISOString().slice(0,10);
      tasks.slice(0,3).forEach(item => window.upsertPlanItem?.(today, {
        id:'ai-plan-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
        title:item.title,
        type:item.taskType || '临时',
        status:'todo',
        source:'ai-assistant',
        note:item.note || 'AI 助手确认后加入今日'
      }));
      window.persist?.(); window.render?.(); window.renderCalendarInlinePreview?.(today);
      renderAssistantPanelLog([{role:'ai', content:`已确认落地：今天只放入 ${Math.min(tasks.length,3)} 件。我们不把今天塞满。`}]);
      return;
    }
    if(action === 'done'){
      done.forEach(item => {
        try{
          window.upsertPlanItem?.(window.todayStr?.() || new Date().toISOString().slice(0,10), {
            id:'ai-completed-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
            title:item.title || item.text || String(item).slice(0,80),
            type:item.type || '额外完成',
            status:'done',
            completedAt:new Date().toISOString(),
            source:'ai-assistant'
          });
        }catch(error){}
      });
      window.persist?.(); window.render?.();
      renderAssistantPanelLog([{role:'ai', content:`已记录完成：${done.length} 条。这个是记功劳，不是再加压力。`}]);
      return;
    }
    const text = [artifacts.consensus?.summary || artifacts.consensus || '', ...tasks.map(item => item.title)].filter(Boolean).join('\n');
    window.appData = window.appData || {};
    window.appData.inspirations = Array.isArray(window.appData.inspirations) ? window.appData.inspirations : [];
    window.appData.inspirations.unshift({id:'idea-'+Date.now().toString(36),text:text || 'AI 助手整理的想法',source:'ai-assistant',createdAt:new Date().toISOString()});
    window.persist?.(); window.render?.();
    renderAssistantPanelLog([{role:'ai', content:'已保存为想法。它先在那里待着，不会变成今天的压力。'}]);
  }
  function setAssistantStatus(text, tone = 'idle'){
    const el = document.getElementById('homeV2AssistantStatus');
    if(!el) return;
    el.textContent = text || '';
    el.dataset.tone = tone;
  }
  async function sendAssistantPanelMessage(){
    const input = document.getElementById('homeV2AssistantInput');
    const send = document.getElementById('homeV2AssistantSend');
    const text = input?.value.trim();
    if(!text) return;
    input.value = '';
    if(send) send.disabled = true;
    const handled = window.tryHandleLocalChatCommand?.(text);
    let history = [];
    try{history = JSON.parse(localStorage.getItem('task-chat-history') || '[]') || []}catch(error){}
    if(handled?.handled){
      setAssistantStatus('本地指令已执行', 'local');
      history.push({role:'user', content:text}, {role:'assistant', content:handled.reply});
      localStorage.setItem('task-chat-history', JSON.stringify(history.slice(-40)));
      renderAssistantPanelLog([{role:'user', content:text}, {role:'ai', content:handled.reply}]);
      if(send) send.disabled = false;
      return;
    }
    history.push({role:'user', content:text});
    localStorage.setItem('task-chat-history', JSON.stringify(history.slice(-40)));
    const mode = currentAssistantMode();
    setAssistantStatus(`正在连接云端 AI · ${assistantModeLabel(mode)}`, 'loading');
    renderAssistantPanelLog([{role:'user', content:text}, {role:'ai', content:mode === 'think' ? '我先听你说完，不急着安排。我们先把这股情绪和最近发生的事接起来看…' : '我在整理这段内容，先给你草案，不会直接写进系统…'}]);
    const result = await requestAssistantAIReply(text, history, mode);
    const latest = assistantHistory();
    latest.push({role:'assistant', content:result.message || result, artifacts:result.artifacts || null});
    saveAssistantHistory(maybeCompressAssistantHistory(latest));
    renderAssistantPanelLog();
    if(send) send.disabled = false;
  }
  function assistantFunctionUrl(){
    const configured = window.appData?.v2?.ai?.chatEndpoint || localStorage.getItem('task-ai-chat-endpoint') || '';
    const base = configured || '/.netlify/functions/ai-chat-v2';
    return window.resolveTaskApiUrl ? window.resolveTaskApiUrl(base) : base;
  }
  async function requestAssistantAIReply(text, history, mode = currentAssistantMode()){
    try{
      const messages = history.slice(mode === 'think' ? -8 : -12).map(item => ({role:item.role === 'user' ? 'user' : 'assistant', content:item.content || item.text || ''})).filter(item => item.content);
      const contextPack = buildAssistantContextPack(mode);
      const memoryContext = window.AIMemorySystem?.buildPrompt?.(window.appData) || contextPack.memorySummary || '';
      const response = await fetch(assistantFunctionUrl(), {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages, mode, contextPack, memoryContext})
      });
      const data = await response.json().catch(() => ({}));
      if(!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
      setAssistantStatus(`云端 AI 已回复 · ${assistantModeLabel(mode)}`, 'cloud');
      return handleAssistantAIResult(data, text, mode);
    }catch(error){
      setAssistantStatus('云端 AI 连接失败，已切回本地模式', 'error');
      return {message:buildAssistantOfflineReply(text, error), artifacts:null};
    }
  }
  function handleAssistantAIResult(data, text, mode = currentAssistantMode()){
    let message = data.message || data.reply || data.text || '我收到啦。';
    const artifacts = {
      suggestedTasks:Array.isArray(data.suggestedTasks) ? data.suggestedTasks.slice(0, 8) : [],
      completedItems:Array.isArray(data.completedItems) ? data.completedItems.slice(0, 8) : [],
      consensus:data.consensus || data.decisionDraft || null,
      landingOptions:Array.isArray(data.landingOptions) ? data.landingOptions : []
    };
    if(artifacts.suggestedTasks.length && mode !== 'think'){
      const lines = data.suggestedTasks.slice(0,5).map((task, index) => `${index + 1}. ${task.title || task.text || task.name || '未命名任务'}${task.duration ? `（约${task.duration}分钟）` : ''}`);
      message += `\n\n我先整理出这些可安排事项，等你确认再落地：\n${lines.join('\n')}`;
    }
    if(Array.isArray(data.completedItems) && data.completedItems.length){
      message += `\n\n我也识别到一些已完成记录：${data.completedItems.map(item => item.title || item.text || item).join('、')}。是否记录，仍然由你确认。`;
    }
    applyAssistantAIArtifacts(data, text);
    return {message, artifacts:(artifacts.suggestedTasks.length || artifacts.completedItems.length || artifacts.consensus || artifacts.landingOptions.length) ? artifacts : null};
  }
  function applyAssistantAIArtifacts(data, text){
    // Only passive emotion memory is auto-saved. Tasks/completions require an explicit tap.
    if(data.emotionLog && data.emotionLog.event){
      try{
        const log = window.buildEmotionLog?.(data.emotionLog.note || data.emotionLog.event || text, {source:'ai-chat', event:data.emotionLog.event, emotion:data.emotionLog.emotion, intensity:data.emotionLog.intensity});
        if(log) window.saveEmotionLog?.(log);
      }catch(error){}
    }
    window.render?.();
    window.renderCalendarInlinePreview?.(window.todayStr?.());
  }
  function buildAssistantOfflineReply(text, error){
    const canUseCloud = location.protocol !== 'file:';
    if(!canUseCloud){
      return '我现在是在本地 file 页面里，不能直接连 Netlify 的 AI 云函数，所以只能先用本地任务指令。部署到云端并配置 DEEPSEEK_API_KEY 后，我就能恢复完整智能对话。你仍然可以说“任务池挑三个”“提醒我…”“完成…”“延期到明天”等，我会直接操作任务。';
    }
    return `我这次没连上 AI 云函数（${String(error.message || error).slice(0,80)}）。我先保留本地任务处理能力：可以挑任务、安排今天、完成/延期/放回任务池；如果想恢复智能聊天，需要确认云端环境变量 DEEPSEEK_API_KEY 已配置。`;
  }
  function openAssistantPanel(){
    hideOverlay(document.getElementById('chatOverlay'));
    hideOverlay(document.getElementById('v2CaptureOverlay'));
    const overlay = ensureAssistantPanel();
    renderAssistantPanelLog();
    setAssistantStatus(location.protocol === 'file:' ? '本地页面：可用本地指令，云端 AI 需在线部署' : '准备就绪', 'idle');
    overlay.classList.add('show');
    setTimeout(() => document.getElementById('homeV2AssistantInput')?.focus(), 30);
    return true;
  }
  function assistantHistory(){
    try{
      const saved = JSON.parse(localStorage.getItem('task-chat-history') || '[]');
      return Array.isArray(saved) ? saved : [];
    }catch(error){
      return [];
    }
  }
  function saveAssistantHistory(history){
    localStorage.setItem('task-chat-history', JSON.stringify(history.slice(-50)));
  }
  function normalizeAssistantRole(role){
    return role === 'user' ? 'user' : 'ai';
  }
  function renderLegacyAssistantMessages(){
    const box = document.getElementById('chatMessages');
    if(!box) return;
    const history = assistantHistory();
    if(!history.length){
      box.innerHTML = '<div class="chat-msg ai">我在。可以陪你聊，也可以帮你整理今天、挑任务、延期、放回任务池，或者接住智能识别后的内容。</div>';
      return;
    }
    box.innerHTML = history.slice(-18).map(item => `<div class="chat-msg ${normalizeAssistantRole(item.role)}">${safeText(item.content || item.text || '')}</div>`).join('');
    box.scrollTop = box.scrollHeight;
  }
  function appendLegacyAssistantMessage(role, content){
    const history = assistantHistory();
    history.push({role: role === 'user' ? 'user' : 'assistant', content});
    saveAssistantHistory(history);
    renderLegacyAssistantMessages();
  }
  async function sendLegacyAssistantMessage(preset){
    const input = document.getElementById('chatInput');
    const text = String(preset || input?.value || '').trim();
    if(!text) return;
    if(input) input.value = '';
    appendLegacyAssistantMessage('user', text);
    const local = window.tryHandleLocalChatCommand?.(text);
    if(local?.handled){
      appendLegacyAssistantMessage('assistant', local.reply);
      return;
    }
    try{
      const history = assistantHistory().slice(-12).map(item => ({role:item.role === 'user' ? 'user' : 'assistant', content:item.content || item.text || ''}));
      const response = await fetch(assistantFunctionUrl(), {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:history,existingTasks:window.appData?.tasks || [],memoryContext:window.AIMemorySystem?.buildPrompt?.(window.appData) || ''})
      });
      if(!response.ok) throw new Error('AI_CHAT_UNAVAILABLE');
      const data = await response.json();
      appendLegacyAssistantMessage('assistant', data.reply || data.message || data.text || '我收到啦。');
    }catch(error){
      appendLegacyAssistantMessage('assistant', '我先用本地模式接住：可以帮你挑任务、延期、放回任务池、整理低电量安排。在线 AI 暂时不可用时，智能识别和本地调度仍然可以用。');
    }
  }
  function ensureLegacyAssistantRestored(){
    const overlay = document.getElementById('chatOverlay');
    const dialog = overlay?.querySelector('.chat-dialog');
    if(!overlay || !dialog) return false;
    const left = dialog.querySelector('.chat-header .left');
    if(left) left.innerHTML = '<span class="homev2-chat-mark">✦</span><h2>AI 助手</h2>';
    const summaryBtn = document.getElementById('chatSummaryBtn');
    if(summaryBtn){
      summaryBtn.textContent = '摘要';
      summaryBtn.type = 'button';
      summaryBtn.onclick = () => {
        const summary = window.buildConversationCarrySummary?.() || '当前对话摘要会在你聊一段时间后生成。';
        appendLegacyAssistantMessage('assistant', summary);
      };
    }
    const newBtn = document.getElementById('chatNewBtn');
    if(newBtn){
      newBtn.textContent = '新对话';
      newBtn.type = 'button';
      newBtn.onclick = () => {
        localStorage.setItem('task-chat-history','[]');
        localStorage.setItem('task-chat-round', String(Number(localStorage.getItem('task-chat-round') || '0') + 1));
        renderLegacyAssistantMessages();
      };
    }
    const close = document.getElementById('chatClose');
    if(close){
      close.textContent = '×';
      close.type = 'button';
      close.onclick = () => hideOverlay(overlay);
    }
    const input = document.getElementById('chatInput');
    if(input){
      input.placeholder = '先跟我说说今天怎么了、卡在哪里、想怎么安排。';
      input.onkeydown = event => {
        if(event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey){
          event.preventDefault();
          sendLegacyAssistantMessage();
        }
      };
    }
    const send = document.getElementById('chatSend');
    if(send){
      send.textContent = '发送';
      send.type = 'button';
      send.onclick = () => sendLegacyAssistantMessage();
    }
    let workbench = dialog.querySelector('.homev2-chat-workbench');
    const messages = document.getElementById('chatMessages');
    if(messages && !workbench){
      workbench = document.createElement('div');
      workbench.className = 'homev2-chat-workbench';
      workbench.innerHTML = `
        <button type="button" data-homev2-chat-prompt="我今天低电量，帮我轻一点安排">轻量安排</button>
        <button type="button" data-homev2-chat-prompt="今天还有什么能做">今天能做什么</button>
        <button type="button" data-homev2-chat-prompt="帮我从任务池挑三个">任务池挑三个</button>
        <button type="button" data-homev2-chat-prompt="帮我把这个大项目拆成下一步">拆大项目</button>
      `;
      messages.parentNode.insertBefore(workbench, messages);
      workbench.querySelectorAll('[data-homev2-chat-prompt]').forEach(button => button.addEventListener('click', () => sendLegacyAssistantMessage(button.dataset.homev2ChatPrompt)));
    }
    renderLegacyAssistantMessages();
    return true;
  }
  function ensureProfilePanel(){
    let overlay = document.getElementById('homeV2ProfilePanel');
    if(overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'homeV2ProfilePanel';
    overlay.className = 'homev2-modal-overlay';
    overlay.innerHTML = `
      <section class="homev2-modal-sheet homev2-profile-sheet" role="dialog" aria-modal="true" aria-label="我的">
        <div class="homev2-profile-top">
          <div class="homev2-profile-avatar">🐾</div>
          <div>
            <small>Profile</small>
            <strong>我的任务管家</strong>
            <p>偏好、规划、备份和个人节奏都放在这里。</p>
          </div>
          <button class="homev2-modal-close" type="button" data-homev2-modal-close aria-label="关闭">×</button>
        </div>
        <div class="homev2-profile-hero">
          <span>🌿</span>
          <div><b>今天也按你的节奏来</b><small>正常模式 / 居家模式、智能识别、长期规划会继续沿用现有数据。</small></div>
        </div>
        <div class="homev2-profile-grid">
          <button type="button" data-homev2-profile-action="settings"><span>⚙️</span><b>设置与偏好</b><small>模式、提醒、个人规则</small></button>
          <button type="button" data-homev2-profile-action="planner"><span>🧭</span><b>长期规划习惯</b><small>目标、习惯、复盘</small></button>
          <button type="button" data-homev2-profile-action="backup"><span>📦</span><b>导出完整备份</b><small>保存到本机</small></button>
          <button type="button" data-homev2-profile-action="features"><span>✨</span><b>全部功能</b><small>快速进入各模块</small></button>
        </div>
        <div class="homev2-settings-card" id="homeV2SettingsCard" hidden>
          <div class="homev2-cloud-head">
            <span>⚙️</span>
            <div><b>设置与偏好</b><small>这里是稳定设置入口，不依赖旧弹窗。</small></div>
          </div>
          <label class="homev2-setting-toggle">
            <span><b>全局通知</b><small>开启到点提醒、普通通知和重要提醒</small></span>
            <input id="homeV2GlobalNotify" type="checkbox">
          </label>
          <div class="homev2-setting-fields">
            <label>默认精力
              <select id="homeV2SettingEnergy">
                <option value="😄">😄 开心</option>
                <option value="😐">😐 平静</option>
                <option value="😫">😫 疲惫</option>
              </select>
            </label>
            <label>默认空闲度
              <select id="homeV2SettingFree">
                <option value="宽裕">宽裕</option>
                <option value="正常">正常</option>
                <option value="忙碌">忙碌</option>
              </select>
            </label>
          </div>
          <div class="homev2-cloud-actions">
            <button type="button" data-homev2-settings-action="save">保存设置</button>
            <button type="button" data-homev2-settings-action="legacy">打开旧设置</button>
          </div>
          <p class="homev2-cloud-status" id="homeV2SettingsStatus"></p>
        </div>
        <div class="homev2-cloud-card">
          <div class="homev2-cloud-head">
            <span>☁️</span>
            <div><b>云端备份</b><small>填写自己的 JSONBin Bin ID 和 API Key，可手动上传或恢复。</small></div>
          </div>
          <label>云端站点地址<input id="homeV2CloudOrigin" autocomplete="off" placeholder="例如 https://你的站点.netlify.app"></label>
          <label>AI 聊天接口<input id="homeV2AiEndpoint" autocomplete="off" placeholder="可留空，默认 /.netlify/functions/ai-chat-v2"></label>
          <label>Bin ID<input id="homeV2CloudBinId" autocomplete="off" placeholder="粘贴你的 Bin ID"></label>
          <label>API Key<input id="homeV2CloudApiKey" autocomplete="off" type="password" placeholder="输入 X-Master-Key"></label>
          <div class="homev2-cloud-actions">
            <button type="button" data-homev2-cloud-action="save">保存配置</button>
            <button type="button" data-homev2-cloud-action="upload">上传云端</button>
            <button type="button" data-homev2-cloud-action="restore">恢复云端</button>
            <button type="button" data-homev2-cloud-action="compress">压缩本地</button>
          </div>
          <p id="homeV2CloudStatus" class="homev2-cloud-status"></p>
        </div>
        <p class="homev2-profile-note">这里不会替换你的旧功能，只是用稳定入口把它们重新串起来。</p>
      </section>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', event => {
      if(event.target === overlay || event.target.closest('[data-homev2-modal-close]')){
        overlay.classList.remove('show');
      }
      const action = event.target.closest('[data-homev2-profile-action]')?.dataset.homev2ProfileAction;
      if(!action) return;
      if(action === 'settings'){
        toggleProfileSettingsCard();
      }
      if(action === 'planner') window.openPlannerPage?.();
      if(action === 'backup') (window.exportV2 || window.exportData)?.();
      if(action === 'features') openFeatureSheet();
    });
    overlay.querySelectorAll('[data-homev2-cloud-action]').forEach(button => {
      button.addEventListener('click', () => handleProfileCloudAction(button.dataset.homev2CloudAction));
    });
    overlay.querySelectorAll('[data-homev2-settings-action]').forEach(button => {
      button.addEventListener('click', () => handleProfileSettingsAction(button.dataset.homev2SettingsAction));
    });
    return overlay;
  }
  function openProfileSheet(){
    hideOverlay(document.getElementById('chatOverlay'));
    hideOverlay(document.getElementById('v2CaptureOverlay'));
    const overlay = ensureProfilePanel();
    syncProfileSettingsForm();
    syncProfileCloudForm();
    overlay.classList.add('show');
    return true;
  }
  function toggleProfileSettingsCard(force){
    const card = document.getElementById('homeV2SettingsCard');
    if(!card) return;
    const show = force === undefined ? card.hidden : !!force;
    card.hidden = !show;
    if(show) syncProfileSettingsForm();
  }
  function setProfileSettingsStatus(text){
    const el = document.getElementById('homeV2SettingsStatus');
    if(el) el.textContent = text || '';
  }
  function syncProfileSettingsForm(){
    const data = window.appData || {};
    const notify = document.getElementById('homeV2GlobalNotify');
    const energy = document.getElementById('homeV2SettingEnergy');
    const free = document.getElementById('homeV2SettingFree');
    if(notify) notify.checked = data.settings?.notifications !== false;
    if(energy) energy.value = normalizeEnergyValue(data.todayStatus?.energy);
    if(free) free.value = normalizeFreeValue(data.todayStatus?.freeTime);
  }
  function normalizeEnergyValue(value){
    if(['😄','开心','馃槃'].includes(value)) return '😄';
    if(['😫','疲惫','馃槴'].includes(value)) return '😫';
    return '😐';
  }
  function normalizeFreeValue(value){
    if(['宽裕','瀹借'].includes(value)) return '宽裕';
    if(['忙碌','蹇欑'].includes(value)) return '忙碌';
    return '正常';
  }
  function saveProfileSettings(){
    window.appData = window.appData || {};
    window.appData.settings = window.appData.settings || {};
    window.appData.todayStatus = window.appData.todayStatus || {};
    window.appData.settings.notifications = document.getElementById('homeV2GlobalNotify')?.checked !== false;
    window.appData.todayStatus.energy = document.getElementById('homeV2SettingEnergy')?.value || '😐';
    window.appData.todayStatus.freeTime = document.getElementById('homeV2SettingFree')?.value || '正常';
    window.persist?.();
    window.toJSONBin?.();
    window.renderStatusBar?.();
    window.render?.();
    setProfileSettingsStatus('设置已保存。');
  }
  function handleProfileSettingsAction(action){
    if(action === 'save'){
      saveProfileSettings();
      return;
    }
    if(action === 'legacy'){
      try{
        if(ensureLegacySettingsRestored()){
          const settings = document.getElementById('settingsPopup');
          settings.classList.add('show');
          forceShowSettingsOverlay(settings);
          setProfileSettingsStatus('旧设置已打开。如果它显示异常，可以继续用这里的稳定设置。');
          return;
        }
      }catch(error){}
      setProfileSettingsStatus('旧设置入口不可用，可以继续用这里的稳定设置。');
    }
  }
  function profileCloud(){
    window.appData = window.appData || {};
    window.appData.v2 = window.appData.v2 || {};
    window.appData.v2.cloud = Object.assign({provider:'jsonbin', binId:'', apiKey:'', lastUploadedAt:null, lastRestoreAt:null, lastCompressedAt:null, remoteDigest:null, lastError:null}, window.appData.v2.cloud || {});
    return window.appData.v2.cloud;
  }
  function profileAIConfig(){
    window.appData = window.appData || {};
    window.appData.v2 = window.appData.v2 || {};
    window.appData.v2.ai = Object.assign({cloudOrigin:'', chatEndpoint:''}, window.appData.v2.ai || {});
    return window.appData.v2.ai;
  }
  function setProfileCloudStatus(text){
    const status = document.getElementById('homeV2CloudStatus');
    if(status) status.textContent = text || '';
    if(typeof window.updateCloudStatus === 'function') window.updateCloudStatus(text || '');
  }
  function syncProfileCloudForm(){
    const cloud = profileCloud();
    const ai = profileAIConfig();
    const origin = document.getElementById('homeV2CloudOrigin');
    const endpoint = document.getElementById('homeV2AiEndpoint');
    const bin = document.getElementById('homeV2CloudBinId');
    const key = document.getElementById('homeV2CloudApiKey');
    if(origin) origin.value = ai.cloudOrigin || localStorage.getItem('task-cloud-origin') || '';
    if(endpoint) endpoint.value = ai.chatEndpoint || localStorage.getItem('task-ai-chat-endpoint') || '';
    if(bin) bin.value = cloud.binId || '';
    if(key) key.value = cloud.apiKey || '';
    const status = cloud.lastError ? `上次云端操作失败：${cloud.lastError}` : cloud.lastUploadedAt ? `最近上传：${String(cloud.lastUploadedAt).slice(0,16).replace('T',' ')}` : '尚未上传到云端';
    setProfileCloudStatus(status);
  }
  function readProfileCloudForm(){
    const cloud = profileCloud();
    const ai = profileAIConfig();
    const origin = document.getElementById('homeV2CloudOrigin')?.value.trim();
    const endpoint = document.getElementById('homeV2AiEndpoint')?.value.trim();
    const bin = document.getElementById('homeV2CloudBinId')?.value.trim();
    const key = document.getElementById('homeV2CloudApiKey')?.value.trim();
    ai.cloudOrigin = origin || '';
    ai.chatEndpoint = endpoint || '';
    cloud.binId = bin || cloud.binId || '';
    cloud.apiKey = key || cloud.apiKey || '';
    if(ai.cloudOrigin) localStorage.setItem('task-cloud-origin', ai.cloudOrigin);
    else localStorage.removeItem('task-cloud-origin');
    if(ai.chatEndpoint) localStorage.setItem('task-ai-chat-endpoint', ai.chatEndpoint);
    else localStorage.removeItem('task-ai-chat-endpoint');
    window.persist?.();
    window.toJSONBin?.(true);
    return cloud;
  }
  function syncLegacyCloudInputs(){
    const cloud = readProfileCloudForm();
    let bin = document.getElementById('v2CloudBinId');
    let key = document.getElementById('v2CloudApiKey');
    if(!bin){
      bin = document.createElement('input');
      bin.id = 'v2CloudBinId';
      bin.type = 'hidden';
      document.body.appendChild(bin);
    }
    if(!key){
      key = document.createElement('input');
      key.id = 'v2CloudApiKey';
      key.type = 'hidden';
      document.body.appendChild(key);
    }
    bin.value = cloud.binId || '';
    key.value = cloud.apiKey || '';
    return cloud;
  }
  async function handleProfileCloudAction(action){
    const cloud = syncLegacyCloudInputs();
    if(action === 'save'){
      setProfileCloudStatus('云端配置已保存。');
      return;
    }
    if(action === 'upload'){
      if(!cloud.binId || !cloud.apiKey){
        setProfileCloudStatus('请先填写 Bin ID 和 API Key。');
        return;
      }
      setProfileCloudStatus('正在上传到云端…');
      if(typeof window.uploadCloudBackup === 'function') await window.uploadCloudBackup({compressAfter:false});
      else await uploadCloudBackupFallback(false);
      syncProfileCloudForm();
      return;
    }
    if(action === 'restore'){
      if(!cloud.binId || !cloud.apiKey){
        setProfileCloudStatus('请先填写 Bin ID 和 API Key。');
        return;
      }
      setProfileCloudStatus('正在从云端恢复…');
      if(typeof window.restoreCloudBackup === 'function') await window.restoreCloudBackup();
      else await restoreCloudBackupFallback();
      syncProfileCloudForm();
      return;
    }
    if(action === 'compress'){
      if(typeof window.compressLocalData === 'function'){
        const result = window.compressLocalData();
        window.render?.();
        window.renderPlanner?.();
        window.renderReviews?.();
        setProfileCloudStatus(`已压缩：归档 ${result.archivedDays} 天计划，清理 ${result.removedOcrNotes} 条旧 OCR 记录`);
      }else{
        setProfileCloudStatus('当前版本没有可压缩的旧记录。');
      }
    }
  }
  function buildCloudBundleFallback(){
    window.syncTodaySnapshot?.();
    return {exportedAt:new Date().toISOString(), schemaVersion:2, appData:JSON.parse(JSON.stringify(window.appData || {})), aiMemory:window.AIMemorySystem?.exportAll?.() || null};
  }
  async function uploadCloudBackupFallback(){
    const cloud = readProfileCloudForm();
    setProfileCloudStatus('正在上传到云端…');
    try{
      const bundle = buildCloudBundleFallback();
      const res = await fetch(`https://api.jsonbin.io/v3/b/${encodeURIComponent(cloud.binId)}`, {method:'PUT', headers:{'Content-Type':'application/json','X-Master-Key':cloud.apiKey}, body:JSON.stringify(bundle)});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      cloud.lastUploadedAt = new Date().toISOString();
      cloud.lastError = null;
      window.persist?.();
      setProfileCloudStatus(`上传成功：${cloud.lastUploadedAt.slice(0,16).replace('T',' ')}`);
    }catch(error){
      cloud.lastError = String(error.message || error);
      window.persist?.();
      setProfileCloudStatus(`上传失败：${cloud.lastError}`);
    }
  }
  async function restoreCloudBackupFallback(){
    const cloud = readProfileCloudForm();
    if(!confirm('将用云端备份覆盖当前 V2 数据。继续吗？')) return;
    setProfileCloudStatus('正在从云端恢复…');
    try{
      const res = await fetch(`https://api.jsonbin.io/v3/b/${encodeURIComponent(cloud.binId)}/latest`, {headers:{'X-Master-Key':cloud.apiKey}});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const bundle = data.record || data;
      if(!bundle?.appData || !Array.isArray(bundle.appData.tasks)) throw new Error('INVALID_BUNDLE');
      Object.keys(window.appData || {}).forEach(key => delete window.appData[key]);
      Object.assign(window.appData, JSON.parse(JSON.stringify(bundle.appData)));
      window.AIMemorySystem?.importAll?.(bundle.aiMemory || {});
      window.persist?.();
      window.render?.();
      cloud.lastRestoreAt = new Date().toISOString();
      cloud.lastError = null;
      setProfileCloudStatus(`恢复成功：${cloud.lastRestoreAt.slice(0,16).replace('T',' ')}`);
    }catch(error){
      cloud.lastError = String(error.message || error);
      window.persist?.();
      setProfileCloudStatus(`恢复失败：${cloud.lastError}`);
    }
  }
  function ensureLegacySettingsRestored(){
    const overlay = document.getElementById('settingsPopup');
    const form = overlay?.querySelector('.bill-form');
    if(!overlay || !form) return false;
    const title = form.querySelector('h3');
    if(title) title.textContent = '我的 / 设置';
    const fields = form.querySelectorAll('.field');
    if(fields[0]){
      const label = fields[0].querySelector('label');
      const span = fields[0].querySelector('span');
      if(label) label.textContent = '全局通知';
      if(span) span.textContent = '开启所有通知、到点提醒和定时提醒';
    }
    if(fields[1]){
      const label = fields[1].querySelector('label');
      if(label) label.textContent = '精力 / 空闲度默认值';
      const energy = document.getElementById('settingEnergy');
      if(energy){
        energy.innerHTML = '<option value="😄">😄 开心</option><option value="😐">😐 平静</option><option value="😫">😫 疲惫</option>';
        energy.value = window.appData?.todayStatus?.energy || '😐';
      }
      const free = document.getElementById('settingFree');
      if(free){
        free.innerHTML = '<option value="宽裕">宽裕</option><option value="正常">正常</option><option value="忙碌">忙碌</option>';
        free.value = window.appData?.todayStatus?.freeTime || '正常';
      }
    }
    const cancel = form.querySelector('.form-actions .cancel');
    if(cancel){
      cancel.textContent = '关闭';
      cancel.type = 'button';
      cancel.onclick = () => hideOverlay(overlay);
    }
    const save = form.querySelector('.form-actions .save');
    if(save){
      save.textContent = '保存';
      save.type = 'button';
      save.onclick = () => {
        window.appData = window.appData || {};
        window.appData.settings = window.appData.settings || {};
        window.appData.todayStatus = window.appData.todayStatus || {};
        window.appData.settings.notifications = document.getElementById('globalNotify')?.checked !== false;
        window.appData.todayStatus.energy = document.getElementById('settingEnergy')?.value || '😐';
        window.appData.todayStatus.freeTime = document.getElementById('settingFree')?.value || '正常';
        window.toJSONBin?.();
        window.render?.();
        hideOverlay(overlay);
      };
    }
    const utilityButtons = form.querySelectorAll('div[style*="border-top"] button');
    if(utilityButtons[0]) utilityButtons[0].textContent = '导出数据';
    if(utilityButtons[1]) utilityButtons[1].textContent = '导入数据';
    return true;
  }

  function openAssistant(){
    return openAssistantPanel();
  }

  function forceShowChatOverlay(overlay){
    overlay.classList.add('show');
    overlay.style.setProperty('opacity', '1', 'important');
    overlay.style.setProperty('pointer-events', 'auto', 'important');
    overlay.style.setProperty('z-index', '850', 'important');
    overlay.style.setProperty('visibility', 'visible', 'important');
    const dialog = overlay.querySelector('.chat-dialog');
    if(dialog){
      dialog.style.setProperty('z-index', '851', 'important');
      dialog.style.setProperty('transform', 'translateY(0)', 'important');
      dialog.style.setProperty('visibility', 'visible', 'important');
    }
  }
  function forceShowSettingsOverlay(overlay){
    if(!overlay) return;
    overlay.classList.add('show');
    overlay.style.setProperty('opacity', '1', 'important');
    overlay.style.setProperty('pointer-events', 'auto', 'important');
    overlay.style.setProperty('z-index', '980', 'important');
    overlay.style.setProperty('visibility', 'visible', 'important');
    const form = overlay.querySelector('.bill-form');
    if(form){
      form.style.setProperty('z-index', '981', 'important');
      form.style.setProperty('transform', 'translateY(0)', 'important');
      form.style.setProperty('visibility', 'visible', 'important');
    }
  }
  function hideOverlay(overlay){
    if(!overlay) return false;
    overlay.classList.remove('show');
    overlay.style.removeProperty('opacity');
    overlay.style.removeProperty('pointer-events');
    overlay.style.removeProperty('z-index');
    overlay.style.removeProperty('visibility');
    overlay.style.removeProperty('transform');
    const dialog = overlay.querySelector('.chat-dialog');
    if(dialog){
      dialog.style.removeProperty('z-index');
      dialog.style.removeProperty('transform');
      dialog.style.removeProperty('visibility');
    }
    return true;
  }

  function openCapture(){
    try{
      hideOverlay(document.getElementById('chatOverlay'));
      if(!document.getElementById('v2CaptureOverlay') && typeof window.buildQuickCaptureUI === 'function'){
        window.buildQuickCaptureUI();
      }
      const overlay = document.getElementById('v2CaptureOverlay');
      const input = document.getElementById('v2CaptureInput');
      if(overlay){
        forceShowChatOverlay(overlay);
        input?.focus();
        return true;
      }
    }catch(error){
      console.error('homev2 capture open failed', error);
    }
    ensureFallbackOverlay('homeV2CaptureFallback', '智能识别', '例如：我刚洗澡了，收了一个袋子，但副业还没做，今天头有点紧。').classList.add('show');
    return true;
  }

  function openFeatureSheet(){
    const overlay = ensureFeatureSheet();
    const body = document.getElementById('homeV2FeatureBody');
    body.innerHTML = FEATURE_GROUPS.map(group => `
      <section class="homev2-feature-group">
        <h4>${group.title}</h4>
        <div class="homev2-feature-grid">
          ${group.items.map(([label, action]) => `
            <button class="homev2-feature-button" type="button" data-homev2-action="${action}">${label}</button>
          `).join('')}
        </div>
      </section>
    `).join('');
    body.querySelectorAll('[data-homev2-action]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        overlay.classList.remove('show');
        triggerAction(button.dataset.homev2Action);
      });
    });
    overlay.classList.add('show');
  }

  function openSection(sectionId){
    try{
      if(typeof window.openModulePage === 'function'){
        window.openModulePage(sectionId);
        if(routeHasContent(sectionId)) return true;
        if(document.getElementById('v2RoutePage')?.classList.contains('show')) return true;
      }
    }catch(error){
      console.error('homev2 openModulePage failed', sectionId, error);
    }
    return openSectionDirect(sectionId);
  }

  function routeHasContent(sectionId){
    const page = document.getElementById('v2RoutePage');
    const body = document.getElementById('v2RouteBody');
    if(!page?.classList.contains('show') || !body) return false;
    const hasRouteShell = !!body.querySelector('.v2-route-overview,.v2-panel,.card,.v2-route-fallback-shell');
    return hasRouteShell;
  }

  function routeTitle(sectionId){
    const titles = {
      taskPoolSection: '任务池',
      dailySection: '每日任务',
      projectSection: '项目推进',
      cyclicSection: '循环琐事',
      tempSection: '临时任务',
      rhythmSection: '生活能量',
      foodSection: '饮食波动记录',
      lateNightSection: '熬夜节点记录',
      reviewSection: 'AI复盘',
      billSection: '账单',
      healthSection: '健康提醒',
      birthdaySection: '生日提醒',
      inspireSection: '灵感便签',
      notesSection: '随手记',
      badgeSection: '成就勋章',
      wishSection: '愿望基金',
      extraSection: '额外完成'
    };
    return titles[sectionId] || '模块详情';
  }

  function ensureDirectRouteShell(){
    let page = document.getElementById('v2RoutePage');
    const app = document.querySelector('.app');
    if(!app) return null;
    if(!page){
      page = document.createElement('main');
      page.id = 'v2RoutePage';
      page.className = 'v2-route-page';
      page.innerHTML = '<header class="v2-route-head"><button class="v2-route-back" id="v2RouteBack" type="button">‹</button><span class="v2-route-icon" id="v2RouteIcon"></span><h1 class="v2-route-title" id="v2RouteTitle"></h1></header><div id="v2RouteBody"></div><nav class="v2-route-bottom-nav" id="v2RouteBottomNav"></nav>';
      app.after(page);
    }
    let body = document.getElementById('v2RouteBody');
    if(!body){
      body = document.createElement('div');
      body.id = 'v2RouteBody';
      page.appendChild(body);
    }
    document.getElementById('v2RouteBack')?.addEventListener('click', closeDirectRoute);
    return body;
  }

  function closeDirectRoute(){
    const state = window.__homeV2DirectRouteState;
    const page = document.getElementById('v2RoutePage');
    const body = document.getElementById('v2RouteBody');
    if(state?.section && state?.marker?.parentNode){
      state.marker.parentNode.insertBefore(state.section, state.marker);
      state.marker.remove();
      state.section.classList.add('v2-home-module');
      state.section.classList.toggle('collapsed', !!state.wasCollapsed);
      state.section.style.display = '';
      state.section.querySelectorAll('.card-body').forEach(node => node.style.display = '');
      state.cards?.forEach((card, index) => card.classList.toggle('expanded', !!state.expandedStates?.[index]));
    }
    if(body) body.innerHTML = '';
    page?.classList.remove('show');
    document.querySelector('.app')?.classList.remove('v2-hidden');
    window.__homeV2DirectRouteState = null;
  }

  function openSectionDirect(sectionId){
    const section = document.getElementById(sectionId);
    const body = ensureDirectRouteShell();
    if(!section || !body) return false;
    closeDirectRoute();
    const title = routeTitle(sectionId);
    body.innerHTML = '';
    document.getElementById('v2RouteTitle').textContent = title;
    document.getElementById('v2RouteIcon').textContent = '';
    document.querySelector('.app')?.classList.add('v2-hidden');
    document.getElementById('v2RoutePage')?.classList.add('show');
    body.innerHTML = `
      <div class="v2-route-overview day v2-route-journal">
        <div class="v2-route-overview-main">
          <div>
            <div class="v2-overview-eyebrow"><span>${title}</span></div>
            <h3>这一页正在重新接回新版内容</h3>
            <p>为了保护你已经做好的新版界面，我先不再搬旧页面结构，避免露出乱码或空白。返回首页后可以再进一次。</p>
          </div>
          <div class="v2-route-overview-progress">
            <div class="v2-overview-ring"><strong>!</strong><span>保护中</span></div>
            <div class="v2-overview-bar"><div class="v2-overview-bar-track"><span style="width:42%"></span></div><small>旧乱码结构已拦截</small></div>
          </div>
        </div>
      </div>
    `;
    window.__homeV2DirectRouteState = null;
    window.scrollTo(0, 0);
    return true;
  }

  function triggerAction(action){
    try{
      if(action === 'assistant') return openAssistant();
      if(action === 'capture') return openCapture();
      if(action === 'all') return openFeatureSheet();
      if(action === 'planner'){
        if(typeof window.openPlannerPage === 'function'){
          window.openPlannerPage();
          return true;
        }
        const originalPlanner = document.getElementById('v2PlanEntry');
        if(originalPlanner){
          originalPlanner.click();
          return true;
        }
        return false;
      }
      if(action === 'day'){
        if(typeof window.openDaySheet === 'function'){
          window.openDaySheet(todayKey());
          if(document.getElementById('v2RoutePage')?.classList.contains('show')) return true;
        }
        const calendarEntry = document.querySelector('#calendarSection .cal-day.today');
        if(calendarEntry){
          calendarEntry.click();
          return true;
        }
        return openSection('dailySection');
      }
      if(action === 'settings' || action === 'profile'){
        openProfilePanel();
        return true;
      }
      if(action.endsWith('Section')) return openSection(action);
    }catch(error){
      console.error('homev2 action failed', action, error);
    }
    return false;
  }

  function switchHomeV2Mode(mode){
    const next = mode === 'home' ? 'home' : 'normal';
    try{
      if(typeof window.setAppMode === 'function'){
        window.setAppMode(next);
      }else{
        localStorage.setItem('task-homev2-mode', next);
        renderShell();
      }
      document.body.classList.toggle('v2-mode-home', next === 'home');
      document.body.classList.toggle('v2-mode-normal', next !== 'home');
      window.dispatchEvent(new CustomEvent('homev2:mode-change',{detail:{mode:next,source:'homev2-shell'}}));
      setTimeout(renderShell, 0);
      return true;
    }catch(error){
      console.error('homev2 mode switch failed', next, error);
      localStorage.setItem('task-homev2-mode', next);
      renderShell();
      return true;
    }
  }
  function openProfilePanel(){
    return openProfileSheet();
  }
  function installOverlayClosers(){
    if(window.__homeV2OverlayClosersInstalled) return;
    window.__homeV2OverlayClosersInstalled = true;
    document.addEventListener('click', event => {
      const closeButton = event.target.closest('#v2CaptureClose,#chatClose,[data-homev2-overlay-close],[data-homev2-modal-close]');
      if(closeButton){
        event.preventDefault();
        event.stopPropagation();
        const modal = closeButton.closest('.homev2-modal-overlay');
        if(modal) modal.classList.remove('show');
        else hideOverlay(closeButton.closest('.chat-overlay'));
        return;
      }
      if(event.target.matches?.('.chat-overlay')) hideOverlay(event.target);
      if(event.target.matches?.('.homev2-modal-overlay')) event.target.classList.remove('show');
    }, true);
  }
  function installHardEntryFallbacks(){
    if(window.__homeV2HardEntryFallbacksInstalled) return;
    window.__homeV2HardEntryFallbacksInstalled = true;
    document.addEventListener('click', event => {
      const target = event.target;
      const assistantHit = target.closest?.('#chatFab,.homev2-floating-btn.assistant,[data-homev2-action="assistant"]');
      if(assistantHit){
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        openAssistant();
        return;
      }
      const profileHit = target.closest?.('[data-homev2-action="profile"],[data-homev2-action="settings"],.homev2-bottom-nav .homev2-nav-item:last-child,.v2-route-bottom-nav [data-route-nav="profile"]');
      if(profileHit){
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        openProfilePanel();
      }
    }, true);
  }

  function ensureFloatingTools(){
    let wrap = document.getElementById('homeV2FloatingTools');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.id = 'homeV2FloatingTools';
      wrap.className = 'homev2-floating-tools';
      wrap.innerHTML = `
        <button class="homev2-floating-btn capture" type="button" data-homev2-action="capture">
          <img src="${asset('icons-collage-v2/icon-note.png')}" alt="智能识别">
          <span>智能识别</span>
        </button>
        <button class="homev2-floating-btn assistant" type="button" data-homev2-action="assistant">
          <img src="${asset('icons-collage-v2/icon-ai-review.png')}" alt="AI助手">
          <span>AI助手</span>
        </button>
      `;
      document.body.appendChild(wrap);
    }
    wrap.querySelectorAll('[data-homev2-action]').forEach(button => {
      button.onclick = () => triggerAction(button.dataset.homev2Action);
    });
  }

  function renderShell(){
    const mount = ensureMount();
    if(!mount) return;

    const mode = getMode();
    const isHomeMode = mode === 'home';
    const todayItems = getTodayItems();
    const doneCount = countDone(todayItems);
    const percent = todayItems.length ? Math.round(doneCount / todayItems.length * 100) : 0;
    const poolItems = getTaskPoolItems();
    const poolCount = countOpenPool(poolItems);
    const dailyCount = countByType('每日');
    const projectCount = countByType('项目');
    const cyclicCount = countByType('循环');
    const tempCount = countByType('临时');
    const rhythmEntry = getRhythmEntry();
    const energyLabel = rhythmEntry?.energyLevel || '未记录状态';
    const rhythmLabel = rhythmEntry?.rhythm || '还没记录节奏';
    const planItems = todayItems.slice(0, 3);
    const noteCopy = isHomeMode
      ? '今天先照顾好自己，再慢慢把事情接回来也完全可以。'
      : '先抓住今天最重要的那几件事，别让页面把你压满。';

    mount.innerHTML = `
      <div class="homev2-shell ${isHomeMode ? 'home-mode' : 'normal-mode'}">
        <section class="homev2-header">
          <div class="homev2-header-main">
            <div class="homev2-header-left">
              <img class="homev2-header-cat" src="${asset('cats/cat-header.png')}" alt="顶部小猫">
              <div class="homev2-header-copy">
                <strong>${isHomeMode ? '今天先轻一点也没关系' : '今天想先从哪一块开始？'}</strong>
                <span>${isHomeMode ? '先复位，再推进。低压模式下完成一点点也算数。' : '二级页面、AI助手、识别入口我都集中回到这里了。'}</span>
              </div>
            </div>
            <div class="homev2-header-actions">
              <button class="homev2-round" type="button" data-homev2-action="planner"><img src="${asset('ui-icons-collage-v1/icon-nav-plan.png')}" alt="规划"></button>
              <button class="homev2-round" type="button" data-homev2-action="settings"><img src="${asset('ui-icons-collage-v1/icon-settings.png')}" alt="设置"></button>
            </div>
          </div>
          <div class="homev2-mode-row">
            <button class="homev2-mode-pill ${!isHomeMode ? 'active' : ''}" type="button" data-homev2-mode="normal">正常模式</button>
            <button class="homev2-mode-pill ${isHomeMode ? 'active' : ''}" type="button" data-homev2-mode="home">居家模式</button>
          </div>
        </section>

        <section class="homev2-card homev2-capture-desk">
          <div class="homev2-desk-head">
            <div>
              <div class="homev2-kicker">低阻力入口</div>
              <div class="homev2-title">先丢进来，后面再整理</div>
              <div class="homev2-meta">一句话也可以，不需要一开始就分类完美。</div>
            </div>
            <button class="homev2-pill" type="button" data-homev2-action="capture">拍照识别</button>
          </div>
          <textarea id="homeV2QuickText" class="homev2-quick-textarea" rows="2" placeholder="想到什么先写在这里：任务、灵感、备忘、今天要做的一件事..."></textarea>
          <div class="homev2-quick-actions">
            <button type="button" data-homev2-quick="today">加入今日</button>
            <button type="button" data-homev2-quick="pool">丢进任务池</button>
            <button type="button" data-homev2-quick="inspire">存为灵感</button>
            <button type="button" data-homev2-quick="note">存为随手记</button>
          </div>
          <div class="homev2-desk-grid">
            <div class="homev2-mini-form">
              <div class="homev2-mini-form-title">快速记账</div>
              <div class="homev2-mini-line">
                <select id="homeV2BillType" aria-label="账单类型">
                  <option value="expense">支出</option>
                  <option value="income">收入</option>
                  <option value="refund">退款</option>
                </select>
                <input id="homeV2BillAmount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="金额">
              </div>
              <div class="homev2-mini-line">
                <input id="homeV2BillCategory" placeholder="分类，如餐饮/副业/退款">
                <input id="homeV2BillNote" placeholder="备注可不填">
              </div>
              <button class="homev2-mini-submit" type="button" id="homeV2BillSave">记一笔</button>
            </div>
            <div class="homev2-mini-form">
              <div class="homev2-mini-form-title">任务池快丢</div>
              <textarea id="homeV2PoolText" rows="3" placeholder="不确定哪天做的事，先放任务池。"></textarea>
              <button class="homev2-mini-submit" type="button" id="homeV2PoolSave">放进任务池</button>
            </div>
          </div>
        </section>

        <section class="homev2-card">
          <div class="homev2-head">
            <div>
              <div class="homev2-kicker">${isHomeMode ? '居家模式' : '今日进度'}</div>
              <div class="homev2-title">${isHomeMode ? '今天先慢慢复位' : '今天的任务概览'}</div>
              <div class="homev2-meta">${formatDateLabel(todayKey())}</div>
            </div>
            <button class="homev2-pill" type="button" data-homev2-action="day">查看今日</button>
          </div>
          <div class="homev2-progress-grid">
            <div class="homev2-progress-stats">
              <div class="homev2-ring" style="--progress:${percent}">
                <div class="homev2-ring-inner">
                  <strong>${percent}%</strong>
                  <span>完成度</span>
                </div>
              </div>
              <div class="homev2-metrics">
                <div class="homev2-metric">
                  <img src="${asset('ui-icons-collage-v1/icon-complete-badge.png')}" alt="完成">
                  <div><b>${doneCount}</b><span>已完成</span></div>
                </div>
                <div class="homev2-metric">
                  <img src="${asset('icons-collage-v2/icon-note.png')}" alt="任务池">
                  <div><b>${poolCount}</b><span>任务池待安排</span></div>
                </div>
              </div>
            </div>
            <div class="homev2-progress-copy">
              <p>${isHomeMode ? '先照顾自己，再做一件最容易开始的小事。' : '先打开真正要用的那一页，不用在首页来回翻。'}</p>
              <div class="homev2-tags">
                <span>${energyLabel}</span>
                <span>${rhythmLabel}</span>
                <span>${todayItems.length} 条今日任务</span>
              </div>
            </div>
            <div class="homev2-progress-aside">
              <div class="homev2-progress-aside-copy">
                <strong>${isHomeMode ? '低压也算推进' : '快捷跳转已恢复'}</strong>
                <span>${isHomeMode ? '喝水、整理、碰一下任务，都算今天在往前走。' : '常用入口放在下方，AI助手和识别也保留了浮动入口。'}</span>
              </div>
              <div class="homev2-progress-aside-actions">
                <button class="homev2-progress-mini" type="button" data-homev2-action="assistant">AI助手</button>
                <button class="homev2-progress-mini alt" type="button" data-homev2-action="capture">智能识别</button>
              </div>
              <img class="homev2-progress-cat" src="${asset('cats/cat-progress.png')}" alt="进度小猫">
            </div>
          </div>
          <div class="homev2-progress-panels">
            <button class="homev2-progress-panel" type="button" data-homev2-action="dailySection">
              <small>每日任务</small>
              <strong>${dailyCount}</strong>
              <span>习惯与固定动作</span>
            </button>
            <button class="homev2-progress-panel" type="button" data-homev2-action="projectSection">
              <small>项目推进</small>
              <strong>${projectCount}</strong>
              <span>大任务拆成下一步</span>
            </button>
            <button class="homev2-progress-panel" type="button" data-homev2-action="cyclicSection">
              <small>循环琐事</small>
              <strong>${cyclicCount}</strong>
              <span>周期性收尾集中看</span>
            </button>
            <button class="homev2-progress-panel" type="button" data-homev2-action="tempSection">
              <small>临时任务</small>
              <strong>${tempCount}</strong>
              <span>想到就先收住</span>
            </button>
          </div>
        </section>

        <section class="homev2-card">
          <div class="homev2-head">
            <div>
              <div class="homev2-title">今天计划</div>
              <div class="homev2-meta">${isHomeMode ? '轻一点也算数' : '先从最容易开始的一项下手'}</div>
            </div>
            <button class="homev2-pill" type="button" data-homev2-action="planner">去规划室</button>
          </div>
          <div class="homev2-plan-list">
            ${planItems.length ? planItems.map((item, index) => `
              <div class="homev2-plan-item">
                <img class="homev2-plan-icon" src="${asset(['icons-collage-v2/icon-daily-task.png','icons-collage-v2/icon-goal.png','icons-collage-v2/icon-note.png'][index] || 'icons-collage-v2/icon-note.png')}" alt="任务">
                <div class="homev2-plan-title">${esc(item.title || '未命名任务')}</div>
                <div class="homev2-plan-time">${inferTime(item, index)}</div>
                <button class="homev2-plan-check ${String(item.status || '').toLowerCase() === 'done' ? 'done' : ''}" type="button" data-homev2-action="day"></button>
              </div>
            `).join('') : `
              <div class="homev2-plan-item">
                <img class="homev2-plan-icon" src="${asset('icons-collage-v2/icon-note.png')}" alt="空">
                <div class="homev2-plan-title">今天还没排任务，可以先去规划室挑一组轻一点的方案。</div>
                <div></div>
                <button class="homev2-plan-check" type="button" data-homev2-action="planner"></button>
              </div>
            `}
          </div>
        </section>

        <section class="homev2-card">
          <div class="homev2-grid-head">
            <div class="homev2-title">快捷入口</div>
            <button class="homev2-edit" type="button" data-homev2-action="all">更多功能</button>
          </div>
          <div class="homev2-grid">
            ${QUICK_ENTRIES.map(entry => `
              <button class="homev2-entry ${entry.tone}" type="button" data-homev2-action="${entry.action}">
                <span class="homev2-entry-sticker">
                  <img src="${asset(entry.image)}" alt="${entry.title}">
                </span>
                <span>${entry.title}</span>
              </button>
            `).join('')}
          </div>
        </section>

        <section class="homev2-card">
          <div class="homev2-note-layout">
            <div>
              <div class="homev2-title">今日小记</div>
              <div class="homev2-note-text">${noteCopy}</div>
            </div>
            <img class="homev2-note-cat" src="${asset('cats/cat-note.png')}" alt="便签小猫">
          </div>
        </section>

        <nav class="homev2-bottom-nav">
          <button class="homev2-nav-item active" type="button">
            <img src="${asset('ui-icons-collage-v1/icon-nav-home.png')}" alt="首页">
            <small>首页</small>
          </button>
          <button class="homev2-nav-item" type="button" data-homev2-action="planner">
            <img src="${asset('ui-icons-collage-v1/icon-nav-plan.png')}" alt="规划">
            <small>规划</small>
          </button>
          <button class="homev2-nav-item add" type="button" data-homev2-action="capture">
            <span>+</span>
            <small>识别</small>
          </button>
          <button class="homev2-nav-item" type="button" data-homev2-action="reviewSection">
            <img src="${asset('ui-icons-collage-v1/icon-nav-stats.png')}" alt="复盘">
            <small>复盘</small>
          </button>
          <button class="homev2-nav-item" type="button" data-homev2-action="profile">
            <img src="${asset('ui-icons-collage-v1/icon-nav-profile.png')}" alt="我的">
            <small>我的</small>
          </button>
        </nav>
      </div>
    `;

    document.body.classList.add('homev2-shell-active');
    ensureFloatingTools();

    mount.querySelectorAll('[data-homev2-action]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        triggerAction(button.dataset.homev2Action);
      });
    });

    mount.querySelectorAll('[data-homev2-mode]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const nextMode = button.dataset.homev2Mode;
        switchHomeV2Mode(nextMode);
      });
    });

    mount.querySelectorAll('[data-homev2-quick]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        saveHomeV2Quick(button.dataset.homev2Quick);
      });
    });
    document.getElementById('homeV2BillSave')?.addEventListener('click', saveHomeV2Bill);
    document.getElementById('homeV2PoolSave')?.addEventListener('click', saveHomeV2Pool);
    document.getElementById('homeV2PoolText')?.addEventListener('keydown', event => {
      if(event.key === 'Enter' && (event.ctrlKey || event.metaKey)){
        event.preventDefault();
        saveHomeV2Pool();
      }
    });

    const chatFab = document.getElementById('chatFab');
    if(chatFab){
      chatFab.innerHTML = `<img src="${asset('icons-collage-v2/icon-ai-review.png')}" alt="AI助手">`;
      chatFab.onclick = () => triggerAction('assistant');
    }
    const captureFab = document.getElementById('v2CaptureFab');
    if(captureFab) captureFab.innerHTML = `<img src="${asset('icons-collage-v2/icon-note.png')}" alt="智能识别">`;
  }

  function patchRenderRefresh(){
    if(window.__homeV2RenderPatched) return;
    const originalRender = window.render;
    if(typeof originalRender !== 'function') return;
    window.render = function(){
      const result = originalRender.apply(this, arguments);
      renderShell();
      return result;
    };
    window.__homeV2RenderPatched = true;
  }

  function patchBoot(){
    if(typeof window.v2Boot !== 'function' || window.__homeV2BootPatched) return;
    const originalBoot = window.v2Boot;
    window.v2Boot = function(){
      const result = originalBoot.apply(this, arguments);
      setTimeout(() => {
        renderShell();
        patchRenderRefresh();
      }, 0);
      return result;
    };
    window.__homeV2BootPatched = true;
  }

  function installModeRefresh(){
    if(window.__homeV2ModeRefreshInstalled) return;
    window.addEventListener('homev2:mode-change', () => {
      setTimeout(renderShell, 0);
      setTimeout(renderShell, 120);
    });
    window.__homeV2ModeRefreshInstalled = true;
  }

  function installActionDelegation(){
    if(window.__homeV2ActionDelegationInstalled) return;
    document.addEventListener('click', event => {
      const actionButton = event.target.closest('[data-homev2-action]');
      if(actionButton){
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        triggerAction(actionButton.dataset.homev2Action);
        return;
      }
      const modeButton = event.target.closest('[data-homev2-mode]');
      if(modeButton){
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        switchHomeV2Mode(modeButton.dataset.homev2Mode);
      }
    }, true);
    window.__homeV2ActionDelegationInstalled = true;
  }

  function installFallbackRefresh(){
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if(document.querySelector('.app')) renderShell();
      if(tries >= 12 || document.getElementById('homeV2ShellMount')?.children.length) clearInterval(timer);
    }, 500);
  }

  patchBoot();
  installHardEntryFallbacks();
  installActionDelegation();
  installOverlayClosers();
  installModeRefresh();
  window.addEventListener('load', installFallbackRefresh);
  window.HomeV2Shell = {
    render: renderShell,
    openFeatures: openFeatureSheet,
    openAssistant: openAssistantPanel,
    openCapture,
    openProfile: openProfilePanel
  };
})();
