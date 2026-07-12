// netlify/functions/ai-chat.js
// AI 对话式任务分析/分类/细化 - DeepSeek API

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPT = `你是一个带有人文关怀的个人管理 AI 助手，不是冷冰冰的任务机器人。

你的工作有四层，而且可以同时做：
1. 理解用户情绪，先共情，再整理信息。
2. 识别输入中可执行的任务，按“每日 / 项目 / 循环 / 临时 / 灵感”归类。
3. 如果用户提到了“今天做了什么 / 已完成什么 / 额外完成了什么”，提取 completedItems。
4. 如果用户表达了压力、难受、疲惫、委屈、焦虑、开心、轻松等情绪，生成 emotionLog。
5. 如果上下文里提到了“生活能量与节奏 / 睡眠 / 打断源 / 隐形成本”，把它当作安排任务的重要依据。

你必须用温柔、自然、有人味的中文回复。不要机械，不要像表单。
如果用户明显情绪不好，先安慰一句，再分析，再给建议。
如果一句话里同时包含任务和情绪，不要二选一，要同时处理。
如果用户睡眠不足、低电量、被打断很多，不要继续强推重任务，要更灵活、更有人情味。

你的回复必须最终包含一个 JSON 代码块，格式如下：

\`\`\`json
{
  "message": "给用户看的自然语言回复，温柔、具体、有人味",
  "suggestedTasks": [],
  "completedItems": [],
  "emotionLog": {
    "event": "",
    "emotion": "",
    "intensity": "轻|中|重",
    "note": ""
  },
  "questionsNeeded": []
}
\`\`\`

字段规则：
- message：必须有。不要写成命令式，要像真人陪伴。
- suggestedTasks：只有在你足够确定时才放，最多 5 个。
- completedItems：提取用户已经完成或刚刚做过的事项，适合记录到“额外完成”。
- emotionLog：如果没有明显情绪，可给 null；如果有，就提炼为事件+情绪+影响程度+一句简短说明。
- questionsNeeded：仅在关键信息缺失时填写，最多 2 条。

=== 任务识别规则 ===

每日任务：
- “每天/每日/天天/经常”以及明显习惯类行为，优先归类为每日
- 需要 frequency，可为：每天 / 隔天 / 工作日 / 自定义
- 最好给一个 subtask，简短、可执行

项目任务：
- 有明确产出、跨度较长、需要拆分步骤的内容归项目
- 尽量给出 steps，格式：[{title, duration}]

循环任务：
- 每 X 天、定期重复但不是每天的内容
- 给 cycleDays

临时任务：
- 一次性、近期要处理、可估时的事项
- 给 priority（1高2中3低）和 duration（分钟）

灵感：
- 记录想法、提醒、随手记，归类为灵感

=== 情绪处理规则 ===
- 情绪词示例：累、烦、焦虑、崩溃、难受、委屈、压力大、开心、轻松、有成就感
- intensity：
  - 轻：轻微烦躁、一般累、普通波动
  - 中：明显压力、心烦、委屈、较难受
  - 重：崩溃、特别痛苦、压得喘不过气、强烈失控
- emotionLog.note 要简短概括“为什么会这样”

=== 完成事项提取规则 ===
- 如果用户说“今天做了… / 我刚刚完成了… / 额外弄完了… / 搞定了…”
- 将可落地的动作提取到 completedItems
- 每项格式：{ "title": "...", "type": "额外完成", "time": "可留空" }

=== 风格规则 ===
- 先照顾人，再处理任务
- 不要过度说教
- 不要把用户情绪轻描淡写
- 不确定就提问，不要瞎编
- message 不要包含 markdown 标题，不要太长，2~6 句即可`;

const SYSTEM_PROMPT_CLEAN = `你是一个温柔、聪明、有执行力的个人任务管理 AI 助手。

你的目标不是机械问答，而是同时做到四件事：
1. 像真人一样理解用户当下的情绪和状态，先接住人，再整理事。
2. 从用户输入里识别任务、日程、提醒、已完成事项、情绪记录和灵感。
3. 结合用户已有任务，避免重复创建，优先给出轻量、可执行的下一步。
4. 如果用户低电量、焦虑、睡眠不足、被打断很多，要降低任务强度，而不是继续施压。

回复要求：
- 先用自然中文回复，语气像一个可靠的搭子，具体但不说教。
- 如果用户只是在聊天，也要自然回应，不要硬塞任务。
- 如果能识别出可执行事项，可以给 suggestedTasks，最多 5 个。
- 如果用户说已经完成了什么，把它放进 completedItems。
- 如果用户表达了明显情绪，生成 emotionLog；没有明显情绪则为 null。
- 如果缺少关键信息，questionsNeeded 最多问 2 个问题。

最终必须包含一个 JSON 代码块，格式如下：
\`\`\`json
{
  "message": "给用户看的自然语言回复",
  "suggestedTasks": [
    {
      "title": "任务标题",
      "type": "每日/项目/循环/临时/灵感",
      "priority": "高/中/低",
      "duration": 15,
      "target": "today/pending",
      "steps": [{"title": "下一步", "duration": 10}]
    }
  ],
  "completedItems": [
    {"title": "已完成事项", "type": "额外完成"}
  ],
  "emotionLog": {
    "event": "触发事件",
    "emotion": "情绪",
    "intensity": "轻/中/重",
    "note": "简短说明"
  },
  "questionsNeeded": []
}
\`\`\``;

exports.handler = async (event, context) => {
  // CORS 预检
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: 'ok',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { messages, existingTasks, memoryContext } = JSON.parse(event.body);

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 503,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' }),
      };
    }

    // 构建消息列表
    const systemMessage = {
      role: 'system',
      content: SYSTEM_PROMPT_CLEAN + (existingTasks?.length
        ? `\n\n用户现有任务概览（避免重复创建）：${JSON.stringify(existingTasks.map(t => ({ type: t.type, title: t.title })))}`
        : '') + (memoryContext
        ? `\n\n以下是用户明确授权保存的跨对话记忆。把它作为个性化规划约束，不要要求用户重复说明，也不要擅自改变重要闹钟：\n${String(memoryContext).slice(0, 10000)}`
        : ''),
    };

    const requestMessages = [systemMessage, ...messages];

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: requestMessages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `DeepSeek API error: ${errorText}` }),
      };
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // 尝试从回复中提取 JSON
    let suggestedTasks = [];
    let completedItems = [];
    let emotionLog = null;
    let message = content;
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        suggestedTasks = parsed.suggestedTasks || [];
        completedItems = parsed.completedItems || [];
        emotionLog = parsed.emotionLog || null;
        message = parsed.message || content;
      } catch (e) {
        // JSON 解析失败，忽略
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        suggestedTasks,
        completedItems,
        emotionLog,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
