'use strict';
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const {plan,send}=require('./notify.cjs');
const {collect}=require('./collectors/sources.js');
const file='monitor-state.json';
function git(...args){execFileSync('git',args,{stdio:'pipe'});}
function save(state){
 fs.writeFileSync(file,JSON.stringify(state,null,2)+'\n');
 if(process.env.GITHUB_ACTIONS!=='true')throw Error('持久化发送队列仅允许在已配置的 GitHub Actions 中运行。');
 git('add','--',file);git('commit','-m','Update procurement monitor state');git('fetch','origin',process.env.GITHUB_REF_NAME);git('rebase','origin/'+process.env.GITHUB_REF_NAME);git('push','origin','HEAD:'+process.env.GITHUB_REF_NAME);
}
async function dispatch(state,persist=save,deliver=send){
 if(state.outbox.some(x=>x.status==='dispatching'))throw Error('有发送结果不确定的消息，需要人工核对；未自动重发。');
 for(const message of state.outbox.filter(x=>x.status==='pending')){
  message.status='dispatching';persist(state);
  await deliver(process.env.WXPUSHER_SPT,message);
  message.status='accepted';message.acceptedAt=new Date().toISOString();persist(state);
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 if(state.outbox.some(x=>x.status==='dispatching'))throw Error('有发送结果不确定的消息，需要人工核对；为避免重复未自动重发。');
}
async function main(){
 if(!/^SPT_[A-Za-z0-9_-]+$/.test(process.env.WXPUSHER_SPT||''))throw Error('缺少或无效的 WXPUSHER_SPT，请先添加 Actions Secret。');
 if(process.env.GITHUB_ACTIONS!=='true')throw Error('请从 GitHub Actions 运行；本地不会发送消息。');
 let state;
 if(fs.existsSync(file)){state=JSON.parse(fs.readFileSync(file,'utf8'));if(state.version!==1||!Array.isArray(state.outbox))throw Error('状态文件无效，停止以防重复推送。');}
 if(process.env.MODE==='test'){
  await send(process.env.WXPUSHER_SPT,{summary:'浙采雷达连接测试',content:'这是一条浙采雷达测试消息。收到后表示当前接收通道可用，尚不代表定时监测已启用。请确认是在 WxPusher App 还是微信聊天内收到。'});
  console.log('测试消息已被平台受理，请在手机确认实际送达。');return;
 }
 if(state)await dispatch(state);
 const snapshot=await collect({previous:state?.previous,progress:m=>console.log(m)});
 for(const source of ['zj','nb','zcy']){
  const rows=snapshot.coverage.filter(c=>(c.source||'zj')===source);
  console.log(JSON.stringify({source,completed:rows.filter(c=>c.complete).length,total:rows.length,errors:[...new Set(rows.filter(c=>!c.complete).map(c=>String(c.error||'unknown')))]}));
 }
 const next=plan(snapshot,state);save(next);await dispatch(next);
 const failures=snapshot.coverage.filter(c=>!c.complete);
 if(failures.length)throw Error('部分来源核查未完成：'+failures.length+' 个栏目/检索项。');
 console.log('核查完成；没有变化时不发送项目消息。');
}
if(require.main===module)main().catch(e=>{console.error(e.message.startsWith('Command failed')?'GitHub 状态保存失败，已停止后续推送。':e.message);process.exitCode=1;});
module.exports={dispatch,main};

