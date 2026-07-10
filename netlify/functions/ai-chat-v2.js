const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const MODE_GUIDES = {
  think: '陪我聊模式：像网页版聊天一样先托住用户情绪和当下状态。重点是理解、陪伴、复述和轻轻提问，不要急着安排任务；除非用户明确要求落地，否则 suggestedTasks 必须为空。',
  tidy: '快速整理模式：把输入分类成已完成、待办、日程/截止日期、想法、情绪记录、待确认。简洁输出，少聊天，不自动写入。',
  today: '安排今天模式：只安排今天真正适合做的 1-3 件事。根据用户状态降低强度，不把所有事情都塞到今天。',
  days: '多天安排模式：把事项分散到未来 3 天、7 天或本周，避免今天过载。先给草案，等待用户确认。',
  projects: '拆大项目模式：帮助判断主线、副线、暂缓项。多个项目并行时，每个项目只给一个下一小步，强调“今天碰一下也算推进”，避免制造更大的挫败感。',
  long: '长期规划模式：处理三年/五年计划、职业方向、学习路线。按愿景、年度主题、季度方向、月度推进、本周动作、今日最小行动逐层思考。',
  consult: '知识咨询模式：先提供知识框架，再让用户选择优先准备的部分，最后才转成项目和任务。不要一开始就任务化。'
};

function buildSystemPrompt(mode, contextPack = {}, memoryContext = '') {
  const guide = MODE_GUIDES[mode] || MODE_GUIDES.think;
  return `你是任务管家 APP 的高级 AI 助手，不是普通聊天窗口，也不是机械识别器。

你的核心流程是：先接住人 -> 理解当前状态和情绪脉络 -> 辅助决策 -> 形成共识 -> 经用户确认后再项目拆解和执行落地。

当前模式：${contextPack.modeLabel || mode}
模式规则：${guide}

总原则：
1. 先接住用户，再处理事情。用户压力大时，不要立刻堆任务。
2. 识别问题类型：情绪陪聊/快速整理/任务安排/截止事项/选择困难/知识准备/长期规划/多项目并行。
3. 辅助决策时要拆出选项，分析收益、成本、压力、长期匹配度、是否可低成本验证。
4. 可以给建议，但语气不能武断，要保留用户选择权。
5. 项目拆解必须基于共识，不要一听到长期目标就直接输出一大堆任务。
6. 不要自动写入系统。你只生成建议和可落地草案，用户确认后 APP 才写入。
7. AI 助手和智能识别分开：你负责深度聊天、决策、知识咨询、项目拆解；识别器负责机械分类上传。
8. 省 token：只使用当前上下文摘要，不要求用户重复说明，也不要假装看过未提供的完整数据。
9. 用户容易因为大任务连续几天没产出而挫败。要把“每天有推进证据”说清楚，优先给可完成的小步骤和进度感。
10. 用户只有正常/居家两种模式；不要让用户手动切换低电量。低电量只作为状态判断，自动降低安排强度。

输出风格：
- 自然中文，像可靠同伴，不要像表格机器。
- 普通回复 2-8 句即可，除非用户明确要求详细规划。
- “陪我聊”模式下，优先回应情绪脉络和当下感受，最多提一个问题，不输出任务清单。
- “知识咨询”模式先给框架，再问用户想优先哪几块。
- “安排今天”只给 1-3 件。
- 如果上下文有最近情绪、饮食波动、熬夜、周期健康，要把它们当作安排强度和陪聊语气的依据。

可用轻量上下文：
${JSON.stringify(contextPack).slice(0, 5000)}

长期记忆摘要：
${String(memoryContext || '').slice(0, 1800)}

最后必须附一个 JSON 代码块，供 APP 解析：
\`\`\`json
{
  "message": "给用户看的自然回复",
  "suggestedTasks": [],
  "completedItems": [],
  "emotionLog": null,
  "consensus": null,
  "landingOptions": []
}
\`\`\`

字段规则：
- message：必须有，是给用户看的主要回复。
- suggestedTasks：只有用户已经进入整理/安排/拆解/落地阶段，或明确要求安排时才填；最多 8 条。
- completedItems：只有用户明确说已经完成了什么才填。
- emotionLog：用户明显表达情绪时可填 {event, emotion, intensity, note}，否则 null。
- consensus：当对话形成方向时填 {summary, mainLine, sideLine, paused, nextStep}。
- landingOptions：可以给 ["整理成项目","加入任务池","生成本周计划","只安排今天","保存为想法","以后再说"] 这类选项。
`;
}

function extractJsonBlock(content) {
  const match = String(content || '').match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: 'ok'
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const mode = body.mode || body.contextPack?.mode || 'think';
    const contextPack = body.contextPack || {};
    const memoryContext = body.memoryContext || contextPack.memorySummary || '';
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 503,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' })
      };
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: mode === 'tidy' || mode === 'today' ? 0.45 : 0.72,
        max_tokens: mode === 'think' ? 1300 : 1900,
        messages: [
          { role: 'system', content: buildSystemPrompt(mode, contextPack, memoryContext) },
          ...messages
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: `DeepSeek API error: ${errorText}` })
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = extractJsonBlock(content) || {};

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: parsed.message || content.replace(/```json[\s\S]*?```/g, '').trim() || '我收到啦，我们先慢慢捋。',
        suggestedTasks: Array.isArray(parsed.suggestedTasks) ? parsed.suggestedTasks : [],
        completedItems: Array.isArray(parsed.completedItems) ? parsed.completedItems : [],
        emotionLog: parsed.emotionLog || null,
        consensus: parsed.consensus || null,
        landingOptions: Array.isArray(parsed.landingOptions) ? parsed.landingOptions : []
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
