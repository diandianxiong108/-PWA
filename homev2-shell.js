(function(){
  const scriptSrc = document.currentScript?.getAttribute('src') || '';
  const ASSET_BASE = /(^|\/)v2\//.test(scriptSrc.replace(/\\/g, '/'))
    ? '../assets/v2-stickers/'
    : 'assets/v2-stickers/';
  const QUICK_ENTRIES = [
    { id: 'today', title: '今日清单', tone: 'tone-yellow', image: 'icons-collage-v2/icon-daily-task.png', action: 'day' },
    { id: 'daily', title: '每日任务', tone: 'tone-yellow', image: 'icons-collage-v2/icon-habit.png', action: 'dailySection' },
    { id: 'project', title: '项目任务', tone: 'tone-blue', image: 'icons-collage-v2/icon-goal.png', action: 'projectSection' },
    { id: 'cyclic', title: '循环琐事', tone: 'tone-blue', image: 'icons-collage-v2/icon-focus.png', action: 'cyclicSection' },
    { id: 'temp', title: '临时任务', tone: 'tone-pink', image: 'icons-collage-v2/icon-pomodoro.png', action: 'tempSection' },
    { id: 'pool', title: '任务池', tone: 'tone-mint', image: 'icons-collage-v2/icon-note.png', action: 'taskPool' },
    { id: 'rhythm', title: '生活能量', tone: 'tone-mint', image: 'icons-collage-v2/icon-ai-review.png', action: 'rhythm' },
    { id: 'all', title: '全部功能', tone: 'tone-yellow', image: 'icons-collage-v2/icon-all.png', action: 'all' }
  ];

  const FEATURE_GROUPS = [
    { title: '任务管理', items: [
      ['今日清单', 'day'],
      ['任务池', 'taskPool'],
      ['每日任务', 'dailySection'],
      ['项目推进', 'projectSection'],
      ['循环琐事', 'cyclicSection'],
      ['临时任务', 'tempSection']
    ]},
    { title: 'AI 工具', items: [
      ['AI 助手', 'assistant'],
      ['智能识别', 'capture'],
      ['智能规划室', 'planner'],
      ['AI 复盘', 'reviewSection']
    ]},
    { title: '记录与生活', items: [
      ['生活能量', 'rhythm'],
      ['灵感便签', 'inspire'],
      ['随手记', 'notesSection'],
      ['健康闹钟', 'healthSection'],
      ['生日提醒', 'birthdaySection']
    ]},
    { title: '财务与其他', items: [
      ['账单', 'bill'],
      ['额外完成', 'extraSection'],
      ['成就勋章', 'badgeSection'],
      ['设置', 'settings']
    ]}
  ];

  const HOME_COPY = {
    normal: {
      header: [
        ['早呀！', '今天也要元气满满呀～'],
        ['慢慢推进也很厉害', '先把真正重要的几件事看清楚。'],
        ['今天也别把自己排太满', '留一点余地，效率反而会更稳。']
      ],
      progress: [
        '先把今天真正重要的几件事看清楚。',
        '今天先抓主线，再把轻任务穿插进去。',
        '先推进一点点，今天就会慢慢亮起来。'
      ],
      aside: [
        ['今天先稳稳推进', '先抓主线，再给自己留一点缓冲空位。'],
        ['先做最关键的一步', '别急着全做完，先把节奏找回来。'],
        ['今天也可以温柔高效', '慢一点没关系，方向对就已经很好。']
      ],
      note: [
        '慢慢来，任务不会不爱你，你已经在成为更好的自己啦～',
        '今天哪怕只推进一点，也是在认真把生活往前带。',
        '稳稳做、慢慢做，你不是没在前进。'
      ]
    },
    home: {
      header: [
        ['今天先把自己照顾好', '先喝水、先复位、先做轻一点，今天也算在往前走。'],
        ['先低压过关也很好', '别急着恢复满电，今天先照顾身体和节奏。'],
        ['今天先温柔一点', '先让自己缓过来，再决定要不要多做。']
      ],
      progress: [
        '今天先照顾自己，再慢慢碰任务。做到身体重启 1 件、生活复位 1 件、任务碰一下 1 件，就已经很好。',
        '今天不用跟满电状态比，先把自己照顾稳，再轻轻碰一下任务就够了。',
        '低压模式不是躺平，是先保底、先复位、再慢慢恢复节奏。'
      ],
      aside: [
        ['低压完成线也算完成', '别和满电状态比，先做能做的。喝水、收一小块、碰一下副业，都是有效进度。'],
        ['先做轻一点也很好', '今天的重点不是做很多，而是别把自己压坏。'],
        ['先保底，再加一点点', '喝水、复位、碰一下任务，都算在往前走。']
      ],
      note: [
        '慢一点也没关系，照顾好自己，就是最重要的事。',
        '今天如果只能做一点点，也已经比一直内耗更好了。',
        '先把人照顾好，再谈推进，已经很棒了。'
      ]
    }
  };

  function asset(path){
    return ASSET_BASE + path;
  }

  function todayKey(){
    if(typeof window.todayStr === 'function') return window.todayStr();
    return new Date().toISOString().slice(0, 10);
  }

  function daySeed(){
    const today = todayKey();
    const start = new Date(`${today.slice(0,4)}-01-01T12:00:00`);
    const current = new Date(`${today}T12:00:00`);
    return Math.floor((current - start) / 86400000);
  }

  function pickRotatingCopy(mode, key, offset = 0){
    const list = HOME_COPY[mode]?.[key] || HOME_COPY.normal[key] || [];
    if(!list.length) return Array.isArray(list[0]) ? ['', ''] : '';
    return list[(daySeed() + offset) % list.length];
  }

  function getTodayItems(){
    if(typeof window.displayItems === 'function') return window.displayItems(todayKey()) || [];
    if(typeof displayItems === 'function') return displayItems(todayKey()) || [];
    return [];
  }

  function getTaskPoolItems(){
    if(typeof window.getTaskPool === 'function') return window.getTaskPool() || [];
    return [];
  }

  function getAllTasks(){
    if(Array.isArray(window.appData?.tasks)) return window.appData.tasks;
    if(typeof appData !== 'undefined' && Array.isArray(appData?.tasks)) return appData.tasks;
    return [];
  }

  function getRhythmEntry(){
    if(typeof window.getLifeRhythmEntry === 'function') return window.getLifeRhythmEntry(todayKey(), false) || null;
    return null;
  }

  function getCurrentMode(){
    if(typeof window.getCurrentPlannerMode === 'function') return window.getCurrentPlannerMode() || 'normal';
    return 'normal';
  }

  function countDone(items){
    return items.filter(item => String(item.status || '').toLowerCase() === 'done' || String(item.status || '').includes('完成')).length;
  }

  function countOpenPool(items){
    return items.filter(item => !/已完成|放弃|done|abandon/i.test(String(item.status || ''))).length;
  }

  function countTaskType(type){
    return getAllTasks().filter(item => String(item.type || '').trim() === type).length;
  }

  function getTodayStatusEnergy(){
    if(window.appData?.todayStatus?.energy) return window.appData.todayStatus.energy;
    if(typeof appData !== 'undefined' && appData?.todayStatus?.energy) return appData.todayStatus.energy;
    return '';
  }

  function getEnergySummaryLabel(energyLabel){
    const energy = getTodayStatusEnergy();
    if(energy === '😫' || /低/.test(String(energyLabel || ''))) return '今天偏低电量，先保底';
    if(energy === '😄' || /高/.test(String(energyLabel || ''))) return '今天状态还可以，轻推一点';
    return '今天按自己的节奏来';
  }

  function matchesTitle(item, pattern){
    return pattern.test(String(item?.title || ''));
  }

  function buildHomeModeSummary(items){
    const bodyPattern = /喝水|洗脸|换衣|开窗|站起来|洗澡|吃饭|拉伸|休息/;
    const resetPattern = /收拾|整理|袋子|桌面|垃圾|归位|快递|洗衣|家务/;
    const bodyItems = items.filter(item => matchesTitle(item, bodyPattern));
    const resetItems = items.filter(item => matchesTitle(item, resetPattern));
    const touchItems = items.filter(item => !matchesTitle(item, bodyPattern) && !matchesTitle(item, resetPattern));
    const isDone = item => String(item?.status || '').toLowerCase() === 'done' || String(item?.status || '').includes('完成');

    return {
      bodyDone: bodyItems.filter(isDone).length,
      bodyTotal: Math.max(bodyItems.length, 1),
      resetDone: resetItems.filter(isDone).length,
      resetTotal: Math.max(resetItems.length, 1),
      touchDone: touchItems.filter(isDone).length,
      touchTotal: Math.max(touchItems.length, 1),
      bodyItems,
      resetItems,
      touchItems
    };
  }

  function firstMatchingTitle(items, pattern, fallback){
    return items.find(item => pattern.test(String(item?.title || '')))?.title || fallback;
  }

  function inferTime(item, index){
    return item.plannedStart || item.alarmTime || ['08:00','09:00','14:00'][index] || '--:--';
  }

  function formatDateLabel(dateStr){
    const d = new Date(dateStr + 'T12:00:00');
    return `${d.getMonth() + 1}.${d.getDate()} 周${'日一二三四五六'[d.getDay()]}`;
  }

  function focusText(doneCount){
    const minutes = Math.max(25, doneCount * 25);
    if(minutes >= 60) return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
    return `${minutes}m`;
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
      button.addEventListener('click', () => {
        overlay.classList.remove('show');
        triggerAction(button.dataset.homev2Action);
      });
    });
    overlay.classList.add('show');
  }

  function openRouteSection(sectionId){
    if(typeof window.openModulePage === 'function'){
      window.openModulePage(sectionId);
      return true;
    }
    if(typeof openModulePage === 'function'){
      openModulePage(sectionId);
      return true;
    }
    return false;
  }

  function openDay(){
    if(typeof window.openDaySheet === 'function'){
      window.openDaySheet(todayKey());
      return;
    }
    if(typeof openDaySheet === 'function'){
      openDaySheet(todayKey());
    }
  }

  function openPlanner(){
    if(typeof window.openPlannerPage === 'function'){
      window.openPlannerPage();
      return;
    }
    if(typeof openPlannerPage === 'function'){
      openPlannerPage();
    }
  }

  function triggerAction(action){
    switch(action){
      case 'day':
        openDay();
        break;
      case 'taskPool':
        openRouteSection('taskPoolSection');
        break;
      case 'dailySection':
      case 'projectSection':
      case 'cyclicSection':
      case 'tempSection':
      case 'reviewSection':
      case 'notesSection':
      case 'healthSection':
      case 'birthdaySection':
      case 'extraSection':
      case 'badgeSection':
      case 'inspire':
      case 'inspireSection':
      case 'billSection':
        openRouteSection(action === 'inspire' ? 'inspireSection' : action);
        break;
      case 'rhythm':
        openRouteSection('rhythmSection');
        break;
      case 'bill':
        openRouteSection('billSection');
        break;
      case 'assistant':
        document.getElementById('chatOverlay')?.classList.add('show');
        document.getElementById('chatInput')?.focus();
        break;
      case 'capture':
        document.getElementById('v2CaptureOverlay')?.classList.add('show');
        document.getElementById('v2CaptureInput')?.focus();
        break;
      case 'planner':
        openPlanner();
        break;
      case 'settings':
        document.getElementById('settingsPopup')?.classList.add('show');
        break;
      case 'all':
        openFeatureSheet();
        break;
    }
  }

  function renderShell(){
    const mount = ensureMount();
    if(!mount) return;

    const dateStr = todayKey();
    const items = getTodayItems();
    const doneCount = countDone(items);
    const percent = items.length ? Math.round(doneCount / items.length * 100) : 0;
    const poolCount = countOpenPool(getTaskPoolItems());
    const rhythm = getRhythmEntry();
    const mode = getCurrentMode();
    const isHomeMode = mode === 'home';
    const copyMode = isHomeMode ? 'home' : 'normal';
    const headerCopy = pickRotatingCopy(copyMode, 'header');
    const progressCopy = pickRotatingCopy(copyMode, 'progress', 1);
    const asideCopy = pickRotatingCopy(copyMode, 'aside', 2);
    const noteCopy = pickRotatingCopy(copyMode, 'note', 3);
    const energyLabel = rhythm?.energyLevel || (mode === 'home' ? '低压模式' : '正常节奏');
    const waterLabel = rhythm?.hydrationLevel || '还没记录喝水';
    const energySummary = getEnergySummaryLabel(energyLabel);
    const dailyCount = countTaskType('每日');
    const projectCount = countTaskType('项目');
    const cyclicCount = countTaskType('循环');
    const tempCount = countTaskType('临时');
    const homeSummary = buildHomeModeSummary(items);
    const prioritizedHomeItems = [
      ...homeSummary.bodyItems,
      ...homeSummary.resetItems,
      ...homeSummary.touchItems
    ];
    const homeModeRituals = [
      { title: firstMatchingTitle(items, /喝水/, '喝一杯水'), action: 'day', tone: 'mint' },
      { title: firstMatchingTitle(items, /洗脸|开窗|站起来|换衣/, '站起来 / 开窗 / 洗脸'), action: 'day', tone: 'yellow' },
      { title: firstMatchingTitle(items, /收拾|整理|袋子|桌面|垃圾|归位/, '收一个小角落'), action: 'day', tone: 'pink' },
      { title: firstMatchingTitle(items, /副业|学习|论文|项目|主线/, '碰一下副业 / 学习'), action: 'planner', tone: 'blue' }
    ];
    const planItems = (isHomeMode ? prioritizedHomeItems : items).slice(0, 3);
    const planIcons = [
      'icons-collage-v2/icon-daily-task.png',
      'icons-collage-v2/icon-focus.png',
      'icons-collage-v2/icon-note.png'
    ];

    mount.innerHTML = `
      <div class="homev2-shell ${isHomeMode ? 'home-mode' : 'normal-mode'}">
        <section class="homev2-header">
          <div class="homev2-header-main">
            <div class="homev2-header-left">
              <img class="homev2-header-cat" src="${asset('cats/cat-header.png')}" alt="顶部欢迎小猫">
              <div class="homev2-header-copy">
                <strong>${headerCopy[0]}</strong>
                <span>${headerCopy[1]}</span>
              </div>
            </div>
            <div class="homev2-header-actions">
              <button class="homev2-round" type="button" data-homev2-action="planner"><img src="${asset('ui-icons-collage-v1/icon-bell.png')}" alt="提醒"></button>
              <button class="homev2-round" type="button" data-homev2-action="settings"><img src="${asset('ui-icons-collage-v1/icon-settings.png')}" alt="设置"></button>
            </div>
          </div>
          <div class="homev2-mode-row">
            <button class="homev2-mode-pill ${mode !== 'home' ? 'active' : ''}" type="button" data-homev2-mode="normal">正常</button>
            <button class="homev2-mode-pill ${mode === 'home' ? 'active' : ''}" type="button" data-homev2-mode="home">居家</button>
          </div>
        </section>

        <section class="homev2-card">
          <img class="homev2-tape top" src="${asset('tapes/tape-yellow.png')}" alt="">
          <img class="homev2-decor heart" src="${asset('decorations/decor-heart.png')}" alt="">
          <img class="homev2-decor star" src="${asset('decorations/decor-star.png')}" alt="">
          <div class="homev2-head">
            <div>
              <div class="homev2-kicker">${isHomeMode ? '居家模式' : '今日进度'}</div>
              <div class="homev2-title">${isHomeMode ? '今天先慢慢复位' : '今日进度'}</div>
            </div>
          </div>
          <div class="homev2-progress-grid">
            <div class="homev2-progress-stats">
              <div class="homev2-ring" style="--progress:${percent}">
                <div class="homev2-ring-inner">
                  <div>
                    <strong>${percent}%</strong>
                    <span>${doneCount} / ${items.length || 0} 已完成</span>
                  </div>
                </div>
              </div>
              <div class="homev2-metrics">
                <div class="homev2-metric">
                  <img src="${asset('ui-icons-collage-v1/icon-alarm.png')}" alt="专注时长">
                  <div><b>${focusText(doneCount)}</b><span>专注时长</span></div>
                </div>
                <div class="homev2-metric">
                  <img src="${asset('ui-icons-collage-v1/icon-complete-badge.png')}" alt="任务完成">
                  <div><b>${doneCount} 个</b><span>任务完成</span></div>
                </div>
              </div>
            </div>
            <div class="homev2-progress-copy">
              <p>${progressCopy}</p>
              <div class="homev2-tags">
                <span>${energyLabel}</span>
                <span>${waterLabel}</span>
                <span>${isHomeMode ? '深度任务后置' : `任务池 ${poolCount} 条`}</span>
              </div>
            </div>
            <div class="homev2-progress-aside">
              <div class="homev2-progress-aside-copy">
                <strong>${asideCopy[0]}</strong>
                <span>${asideCopy[1]}</span>
              </div>
              <div class="homev2-progress-aside-actions">
                <button class="homev2-progress-mini" type="button" data-homev2-action="day">今日详情</button>
                <button class="homev2-progress-mini alt" type="button" data-homev2-action="planner">规划室</button>
              </div>
              <img class="homev2-progress-cat" src="${asset('cats/cat-progress.png')}" alt="今日进度小猫">
            </div>
          </div>
          <div class="homev2-progress-panels">
            <button class="homev2-progress-panel ${isHomeMode ? 'is-home-card' : ''}" type="button" data-homev2-action="dailySection">
              <small>${isHomeMode ? '身体重启' : '每日任务'}</small>
              <strong>${isHomeMode ? `${homeSummary.bodyDone}/${homeSummary.bodyTotal}` : dailyCount}</strong>
              <span>${isHomeMode ? '喝水 / 洗脸 / 开窗 / 站起来' : '习惯与固定动作'}</span>
            </button>
            <button class="homev2-progress-panel ${isHomeMode ? 'is-home-card' : ''}" type="button" data-homev2-action="projectSection">
              <small>${isHomeMode ? '生活复位' : '项目任务'}</small>
              <strong>${isHomeMode ? `${homeSummary.resetDone}/${homeSummary.resetTotal}` : projectCount}</strong>
              <span>${isHomeMode ? '收一小块 / 整理 / 归位' : '主线推进入口'}</span>
            </button>
            <button class="homev2-progress-panel ${isHomeMode ? 'is-home-card' : ''}" type="button" data-homev2-action="cyclicSection">
              <small>${isHomeMode ? '任务碰一下' : '循环琐事'}</small>
              <strong>${isHomeMode ? `${homeSummary.touchDone}/${homeSummary.touchTotal}` : cyclicCount}</strong>
              <span>${isHomeMode ? '副业 / 学习 / 主线轻碰一下' : '重复小事集中看'}</span>
            </button>
            <button class="homev2-progress-panel ${isHomeMode ? 'is-home-card is-status-card' : ''}" type="button" data-homev2-action="tempSection">
              <small>${isHomeMode ? '当前状态' : '临时任务'}</small>
              ${isHomeMode
                ? `<strong>${energySummary}</strong><span class="homev2-status-chip">${energyLabel}</span><span>${waterLabel}</span>`
                : `<strong>${tempCount}</strong><span>想到就先收这里</span>`}
            </button>
          </div>
        </section>

        <section class="homev2-card">
          <img class="homev2-tape left" src="${asset('tapes/tape-green.png')}" alt="">
          <img class="homev2-tape right" src="${asset('tapes/tape-pink.png')}" alt="">
          <img class="homev2-decor pin" src="${asset('decorations/decor-pin.png')}" alt="">
          <div class="homev2-head">
            <div>
              <div class="homev2-title">${isHomeMode ? '低压清单' : '今天计划'}</div>
              <div class="homev2-meta">${isHomeMode ? '今天只做轻一点也算数' : formatDateLabel(dateStr)}</div>
            </div>
            <button class="homev2-pill" type="button" data-homev2-action="day">${isHomeMode ? '看日程' : '查看全部'}</button>
          </div>
          <div class="homev2-plan-list">
            ${planItems.length ? planItems.map((item, index) => `
              <div class="homev2-plan-item">
                <img class="homev2-plan-icon" src="${asset(planIcons[index] || planIcons[0])}" alt="">
                <div class="homev2-plan-title">${item.title || '未命名任务'}</div>
                <div class="homev2-plan-time">${inferTime(item, index)}</div>
                <button class="homev2-plan-check ${String(item.status || '').toLowerCase() === 'done' || String(item.status || '').includes('完成') ? 'done' : ''}" type="button" data-homev2-action="day"></button>
              </div>
            `).join('') : `
              <div class="homev2-plan-item">
                <img class="homev2-plan-icon" src="${asset('icons-collage-v2/icon-note.png')}" alt="">
                <div class="homev2-plan-title">今天还没排任务，先去规划室挑一组轻一点的也可以。</div>
                <div></div>
                <button class="homev2-plan-check" type="button" data-homev2-action="planner"></button>
              </div>
            `}
          </div>
        </section>

        ${isHomeMode ? `
          <section class="homev2-card homev2-home-ritual-card">
            <img class="homev2-decor star" src="${asset('decorations/decor-star.png')}" alt="">
            <div class="homev2-head">
              <div>
                <div class="homev2-kicker">低压陪跑</div>
                <div class="homev2-title">居家小习惯</div>
                <div class="homev2-meta">${energySummary}</div>
              </div>
              <button class="homev2-pill" type="button" data-homev2-action="rhythm">记状态</button>
            </div>
            <div class="homev2-home-ritual-grid">
              ${homeModeRituals.map(item => `
                <button class="homev2-home-ritual ${item.tone}" type="button" data-homev2-action="${item.action}">
                  <strong>${item.title}</strong>
                  <span>${item.action === 'planner' ? '轻轻碰一下也算推进' : '做完就算今天在往前走'}</span>
                </button>
              `).join('')}
            </div>
            <div class="homev2-home-reminder">
              <span>最低完成线：身体重启 1 件</span>
              <span>生活复位 1 件</span>
              <span>任务碰一下 1 件</span>
            </div>
          </section>
        ` : ''}

        <section class="homev2-card">
          <img class="homev2-decor star" src="${asset('decorations/decor-star.png')}" alt="">
          <div class="homev2-grid-head">
            <div class="homev2-title">${isHomeMode ? '轻量入口' : '快捷入口'}</div>
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
          <img class="homev2-tape note" src="${asset('tapes/tape-pink.png')}" alt="">
          <img class="homev2-decor heart" src="${asset('decorations/decor-heart.png')}" alt="">
          <img class="homev2-decor flower" src="${asset('decorations/decor-flower.png')}" alt="">
          <div class="homev2-note-layout">
            <div>
              <div class="homev2-title">今日小记</div>
              <div class="homev2-note-text">${noteCopy}</div>
            </div>
            <img class="homev2-note-cat" src="${asset('cats/cat-note.png')}" alt="今日小记小猫">
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
            <small>添加</small>
          </button>
          <button class="homev2-nav-item" type="button" data-homev2-action="reviewSection">
            <img src="${asset('ui-icons-collage-v1/icon-nav-stats.png')}" alt="统计">
            <small>统计</small>
          </button>
          <button class="homev2-nav-item" type="button" data-homev2-action="settings">
            <img src="${asset('ui-icons-collage-v1/icon-nav-profile.png')}" alt="我的">
            <small>我的</small>
          </button>
        </nav>
      </div>
    `;

    document.body.classList.add('homev2-shell-active');

    const chatFab = document.getElementById('chatFab');
    const captureFab = document.getElementById('v2CaptureFab');
    if(chatFab){
      chatFab.innerHTML = `<img src="${asset('icons-collage-v2/icon-ai-review.png')}" alt="AI 助手">`;
    }
    if(captureFab){
      captureFab.innerHTML = `<img src="${asset('icons-collage-v2/icon-note.png')}" alt="快速记录">`;
    }

    mount.querySelectorAll('[data-homev2-action]').forEach(button => {
      button.addEventListener('click', () => triggerAction(button.dataset.homev2Action));
    });

    mount.querySelectorAll('[data-homev2-mode]').forEach(button => {
      button.addEventListener('click', () => {
        if(typeof window.setAppMode === 'function'){
          window.setAppMode(button.dataset.homev2Mode);
        }else if(typeof setAppMode === 'function'){
          setAppMode(button.dataset.homev2Mode);
        }
      });
    });
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

  function installFallbackRefresh(){
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if(document.querySelector('.app')){
        renderShell();
      }
      if(tries >= 12 || document.getElementById('homeV2ShellMount')?.children.length){
        clearInterval(timer);
      }
    }, 500);
  }

  function installModeRefresh(){
    if(window.__homeV2ModeRefreshInstalled) return;
    window.addEventListener('homev2:mode-change', () => {
      setTimeout(renderShell, 0);
      setTimeout(renderShell, 120);
    });
    window.__homeV2ModeRefreshInstalled = true;
  }

  patchBoot();
  installModeRefresh();
  window.addEventListener('load', installFallbackRefresh);
  window.HomeV2Shell = {
    render: renderShell,
    openFeatures: openFeatureSheet
  };
})();
