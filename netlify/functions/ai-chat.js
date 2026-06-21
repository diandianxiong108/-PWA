// netlify/functions/ai-chat.js
// AI 对话式任务分析/分类/细化 - DeepSeek API

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPT = `你是一个任务管理助手。用户输入他们的任务信息，你需要：

1. 解析用户意图，将任务归类到四种类型：每日、项目、循环、临时
2. 对于模糊之处，主动提问引导用户补充信息
3. 每次回复时，如果你能确定某个任务的结构，用以下 JSON 格式输出（建议放在回复最后）：

\`\`\`json
{
  "suggestedTasks": [
    {
      "type": "每日|项目|循环|临时",
      "title": "任务标题",
      ...根据type不同包含相应字段
    }
  ],
  "message": "你对用户的自然语言回复",
  "questionsNeeded": ["还需要明确的问题列表"]
}
\`\`\`

=== 分类细化规则 ===

**每日任务**：
- 用户说"每天/每日/天天" → frequency="每天"
- "隔天/每隔一天" → frequency="隔天"
- "工作日" → frequency="工作日"
- "每X天" → frequency="每3天"等
- "每周一三五" → frequency="自定义", customDays=[1,3,5]
- "背单词/学英语/锻炼/运动/阅读/读书/冥想/练字/听力"等习惯性行为 → 优先归类为每日
- 需补充 subtask（最小行动描述，不超过15字）
- 每日任务的对象格式：{ type: "每日", title: "📖学英语", frequency: "每天", subtask: "打开多邻国学3分钟" }

**项目任务**：
- 提及"项目/准备/写/做/完成/开发/制作/研究"且有明确产出物
- 或任务周期超过3天且有多个步骤
- 需要拆分为 steps: [{title:"步骤名", duration:分钟数}]
- 如果用户没说步骤，主动问"这个项目可以分为哪几个步骤？每个步骤大概多久？"
- 项目任务的对象格式：{ type: "项目", title: "📕写论文", steps: [{title:"查资料",duration:30},{title:"写初稿",duration:60}], reminderTime: "22:30" }

**循环任务**：
- 用户说"每X天/每隔X天/定期"做某事
- 需确认 cycleDays
- 循环任务格式：{ type: "循环", title: "🐱喂猫", cycleDays: 2 }

**临时任务**：
- 一次性事务、有截止日期的事务
- 需确认 priority（1高/2中/3低）和 duration（预估分钟数）
- 有截止日期时设置 deadline（ISO字符串）
- 临时任务格式：{ type: "临时", title: "📋交材料", deadline: "2026-06-15T00:00:00.000Z", priority: 1, duration: 30 }

**灵感便签**：
- 用户说"记一下/记个/提醒我/想到"等内容 → 归类为灵感
- 灵感格式：{ type: "灵感", text: "记录的内容" }

=== 追问引导策略 ===
- 当信息不足时，先问最关键的问题（最多2个），不要一次问太多
- 对大任务（写论文、准备考试、开发项目等），主动引导拆分："这个任务比较大，设为项目类型来拆分步骤：1. 大概多久完成？2. 分几个阶段？3. 每阶段多久？"
- 用户给出模糊时间时，帮他们具体化："每天背单词"→"建议设为每日任务，频率：每天"

=== 重要规则 ===
- 回复要亲切、简洁、实用
- suggestedTasks 只包含你能100%确定的任务，模糊的不要放进去
- 每次回复必须包含 message 字段（用户的自然语言回复）
- 不确定时就问，不要猜测
- 支持批量处理：用户一次说多个任务，逐一识别
- 如果用户说"帮我整理一下今天的任务"之类，先让他列出任务`;

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
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' }),
      };
    }

    // 构建消息列表
    const systemMessage = {
      role: 'system',
      content: SYSTEM_PROMPT + (existingTasks?.length
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
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        suggestedTasks = parsed.suggestedTasks || [];
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
        message: content,
        suggestedTasks,
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
