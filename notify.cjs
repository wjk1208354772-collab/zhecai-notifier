'use strict';
const {createHash}=require('node:crypto');
const sources=require('./collectors/sources.js');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const day=now=>new Date(now).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
const date=t=>new Date(t).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});
function fingerprint(r){return hash([r.title,r.project,r.type,r.buyer,r.budget,r.deadline,r.invalid,String(r.text||'').replace(/\s+/g,'')]);}
function verified(r){return !!r.text&&!r.retained&&!r.detailError;}
function deadlineSafe(r,now){return verified(r)&&r.relationsChecked===true&&!r.invalid&&['采购公告','招标公告','非招标公告'].includes(r.type)&&r.deadline>now&&r.deadline<=now+3*86400000&&!(r.related||[]).some(x=>/更正|变更|澄清|补充|终止|废标|流标|中标|成交/.test(x.title)&&(!x.published||x.published>=r.published));}
function block(r,kind){return [kind+'：'+r.title,'类别：'+(r.tags||[]).join('、'),'公告阶段：'+r.type,'地区：'+(r.city||'')+' '+(r.district||''),'采购人：'+(r.buyer||'未明确'),'预算：'+(r.budget?Number(r.budget).toLocaleString('zh-CN')+' 元':'未明确'),...(r.deadline?['正文提取截止时间：'+date(r.deadline)+'（以最新官方公告为准）']:[]),'来源：'+(r.sourceName||sources.sites[r.source||'zj'].name),sources.safeURL(r)].join('\n');}
function plan(snapshot,old,now=Date.now()){
 const state=structuredClone(old||{version:1,initialized:{},seen:{},reminders:{},outbox:[]});
 const messages=[];
 for(const source of ['zj','nb','zcy']){
  const coverage=snapshot.coverage.filter(c=>(c.source||'zj')===source);
  const complete=coverage.length>0&&coverage.every(c=>c.complete);
  if(!complete){const key='health:'+source+':'+day(now);if(!state.reminders[key]){messages.push('核查异常：'+sources.sites[source].name+'\n本轮检索未完成，不能视为没有新项目。请查看 GitHub Actions 运行记录或官方来源。');state.reminders[key]=true;}continue;}
  for(const r of snapshot.records.filter(r=>(r.source||'zj')===source&&!r.retained)){
   const key=source+':'+r.id,prior=state.seen[key];
   if(!verified(r)){if(!prior)state.seen[key]={fingerprint:null,pendingNew:!!state.initialized[source]};continue;}
   const fp=fingerprint(r);
   if(state.initialized[source]&&(!prior||prior.pendingNew||prior.fingerprint&&prior.fingerprint!==fp))messages.push(block(r,!prior||prior.pendingNew?'新发现公告':'公告内容变化'));
   state.seen[key]={fingerprint:fp};
   if(deadlineSafe(r,now)){const reminder=key+':deadline:'+r.deadline;if(!state.reminders[reminder]){messages.push(block(r,'3天内截止提醒'));state.reminders[reminder]=true;}}
  }
  if(!state.initialized[source])messages.unshift(sources.sites[source].name+'：初次核查已建立基线，历史公告不会逐条补发。');
  state.initialized[source]=true;
 }
 state.previous={records:snapshot.records.filter(r=>r.deadline>now).map(r=>Object.fromEntries(['id','source','title','project','type','tags','published','deadline','projectCode','projectId','categoryCode','parentId'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]])))};
 state.lastCheck={at:new Date(now).toISOString(),coverage:snapshot.coverage.map(c=>({source:c.source||'zj',code:c.code,complete:c.complete,scanned:c.scanned}))};
 let content='浙采雷达 · '+date(now)+'\n';
 const flush=()=>{if(content.trim())state.outbox.push({id:hash([now,content]),status:'pending',summary:'浙采雷达项目更新',content});content='';};
 for(const message of messages){const part=message.slice(0,6000)+'\n\n';if(Buffer.byteLength(content+part,'utf8')>24000)flush();content+=part;}
 if(messages.length)flush();
 state.outbox=state.outbox.filter(x=>x.status!=='accepted');
 return state;
}
async function send(spt,message,request=fetch){
 if(!/^SPT_[A-Za-z0-9_-]+$/.test(spt||''))throw Error('请在 GitHub Actions Secrets 中配置 WXPUSHER_SPT。');
 let response;
 try{response=await request('https://wxpusher.zjiecode.com/api/send/message/simple-push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({spt,content:message.content,summary:message.summary,contentType:1}),signal:AbortSignal.timeout(30000)});}catch{throw Error('推送请求结果不确定，已暂停自动重发，请核对接收端。');}
 if(!response.ok)throw Error('推送接口 HTTP 错误，已暂停自动重发。');
 let result;try{result=await response.json();}catch{throw Error('推送响应无法解析，已暂停自动重发。');}
 if(result.code!==1000)throw Error('推送平台未受理消息，请检查密钥及账号状态。');
 return true;
}
module.exports={plan,send,deadlineSafe,fingerprint};

