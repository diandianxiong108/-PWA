// netlify/functions/ai-review.js
// DeepSeek API 复盘生成 - 供主应用 "AI复盘" 按钮调用

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

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
    const { tasks, inspirations, notes, period } = JSON.parse(event.body);

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' }),
      };
    }

    // 构建复盘提示词
    const taskSummary = (tasks || []).map(t =>
      `- ${t.type}任务：${t.title}${t.completedToday ? '（已完成）' : ''}`
    ).join('\n');

    const inspirationSummary = (inspirations || []).map(i =>
      `- ${i.date} ${i.emotion || ''} ${i.text}`
    ).join('\n');

    const notesSummary = (notes || []).map(n =>
      `- ${n.date} ${n.text.slice(0, 80)}${n.text.length > 80 ? '...' : ''}`
    ).join('\n');

    const systemPrompt = `你是一个温暖贴心的个人成长复盘助手。用朋友般的口吻，根据用户提供的数据生成一份有温度、有洞察的复盘报告。

要求：
1. 语言温暖、鼓励、具体，像朋友聊天一样自然
2. 总结周期内任务完成情况和亮点
3. 观察情绪变化趋势，给正面反馈
4. 从笔记中发现有价值的信息
5. 给出1-2个具体的、可执行的建议
6. 整体篇幅控制在300-500字，段落分明
7. 不要用评价性语言（"很好"、"不错"），而是描述事实和感受

格式：
先用一个温暖的问候开头，然后分段描述各个维度，最后以鼓励收尾。`;

    const userPrompt = `请为以下周期（${period.start} ~ ${period.end}）生成一份温暖的复盘报告：

==已完成任务==
${taskSummary || '（暂无）'}

==情绪便签==
${inspirationSummary || '（暂无）'}

==随手记==
${notesSummary || '（暂无）'}`;

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
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
    const report = data.choices[0].message.content.trim();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ report }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
