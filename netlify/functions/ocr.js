// Handwriting OCR for V2. Images are processed in-memory and are not persisted here.
const OPENAI_RESPONSES_URL='https://api.openai.com/v1/responses';

const json=(statusCode,body)=>({
  statusCode,
  headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'},
  body:JSON.stringify(body)
});

function responseText(data){
  if(typeof data.output_text==='string')return data.output_text.trim();
  for(const item of data.output||[]){
    for(const part of item.content||[]){if(part.type==='output_text'&&typeof part.text==='string')return part.text.trim()}
  }
  return'';
}

exports.handler=async event=>{
  if(event.httpMethod==='OPTIONS')return json(200,{ok:true});
  if(event.httpMethod!=='POST')return json(405,{error:'METHOD_NOT_ALLOWED'});
  const key=process.env.OPENAI_API_KEY;
  if(!key)return json(503,{error:'OCR_NOT_CONFIGURED',message:'需要在 V2 部署环境设置 OPENAI_API_KEY'});
  try{
    const body=JSON.parse(event.body||'{}'),imageDataUrl=body.imageDataUrl;
    if(typeof imageDataUrl!=='string'||!/^data:image\/(jpeg|png|webp);base64,/i.test(imageDataUrl))return json(400,{error:'INVALID_IMAGE'});
    if(imageDataUrl.length>9_000_000)return json(413,{error:'IMAGE_TOO_LARGE'});
    const upstream=await fetch(OPENAI_RESPONSES_URL,{
      method:'POST',
      headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:process.env.OPENAI_VISION_MODEL||'gpt-5.5',
        input:[{role:'user',content:[
          {type:'input_text',text:'请准确转写这张图片里的中文或英文手写内容。保持原来的分行和清单结构；看不清的局部写作【无法辨认】，不要猜测，不要解释，只输出转写文字。'},
          {type:'input_image',image_url:imageDataUrl}
        ]}],
        max_output_tokens:1600
      })
    });
    const data=await upstream.json();
    if(!upstream.ok)return json(upstream.status>=500?502:upstream.status,{error:'OCR_UPSTREAM_ERROR',message:data.error?.message||'识别服务调用失败'});
    const text=responseText(data);
    if(!text)return json(502,{error:'EMPTY_OCR_RESULT'});
    return json(200,{text});
  }catch(error){return json(500,{error:'OCR_FAILED',message:error.message})}
};
