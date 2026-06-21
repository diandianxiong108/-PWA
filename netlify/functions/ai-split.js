// netlify/functions/ai-split.js
// DeepSeek API 任务拆分 - 供主应用 "AI拆分" 按钮调用

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
    const { title, type } = JSON.parse(event.body);

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' }),
      };
    }

    let systemPrompt, userPrompt;

    if (type === '项目') {
      systemPrompt = '你是一个项目管理助手。将用户的任务拆分为具体的执行步骤。只输出JSON数组，不要其他文字。';
      userPrompt = `将任务「${title}」拆分为3-6个具体执行步骤。每个步骤包含title（步骤名）和duration（预估分钟数）。步骤名控制在10字内。格式：[{"title":"步骤名","duration":30}]`;
    } else if (type === '每日') {
      systemPrompt = '你是一个习惯养成助手。为用户的每日任务写一个最小行动描述（10字内），让用户能立刻开始做。只输出JSON，不要其他文字。';
      userPrompt = `为每日任务「${title}」写一个最小行动描述（10字内，具体的行动）。格式：{"subtask":"打开App学3分钟"}`;
    } else {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid type. Must be "项目" or "每日"' }),
      };
    }

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
        temperature: 0.3,
        max_tokens: 1024,
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
    let content = data.choices[0].message.content.trim();

    // 清理可能的 markdown 代码块包裹
    content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      // 如果解析失败，尝试从中提取 JSON
      const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
