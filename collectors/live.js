(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ZCLive=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const BASE='https://zfcg.czt.zj.gov.cn';
const categories=['市政养护','排水管网养护','管网检测修复','环卫保洁','河道养护','绿化养护','水质监测','农村生活污水运维','泵站养护'];
const sources=[['110-600268','采购意向'],['110-684034','招标公告'],['110-511933','非招标公告'],['110-912804','更正公告'],['110-631167','废标公告'],['110-188043','采购结果']];
const cities={'3301':'杭州','3302':'宁波','3303':'温州','3304':'嘉兴','3305':'湖州','3306':'绍兴','3307':'金华','3308':'衢州','3309':'舟山','3310':'台州','3311':'丽水'};
function classify(text){text=String(text||'');const out=[];
 if(/专业群|产教融合|教学|实训|测试基地|慰问品|健康体检|雇主责任险|保险(?:服务|采购)|环保管家|车辆.{0,8}(维修|采购|购置)|设备租赁|设备采购|机械及配件采购|果壳箱|垃圾桶|药剂采购|主材采购|材料采购|苗木采购|花卉采购|土工膜采购|水质日常养护|第三方检查|交安设施采购|物资与劳保|物品采购|机器人采购|工作服|运维工服|电池组|沥青砼采购|工程监理|项目监理|材料及实体检测|压力管道|污泥车间|医院污水站|征集电力劳务/.test(text))return out;
 if(/(?:监测设备|监测仪器|检测仪器|监测系统)(?:的|及配套设备)?(?:购置|采购|租赁|建设|及运维)/.test(text))return out;
 if(/(市政|道路|桥梁|隧道|路灯|城市照明|公路).{0,24}(养护|管养|维护|维修)|养护.{0,12}(道路|桥梁|市政)/.test(text)&&!/(绿化|绿地).{0,8}(养护|管养)/.test(text))out.push(categories[0]);
 if(/(排水|排污|雨污|污水|雨水|管网|管道|泵站).{0,24}(养护|维养|管养|运维|维护|清淤|疏通|清疏)|清淤.{0,12}(管网|管道)|化粪池.{0,12}(清掏|清理|清淤)/.test(text))out.push(categories[1]);
 if(/(管网|管道|排水管|雨污管|污水管).{0,24}(检测|修复|排查)|非开挖|CCTV.{0,12}(检测|管道)/i.test(text))out.push(categories[2]);
 if(/环卫.{0,12}(保洁|一体化|作业)|道路.{0,12}(保洁|清扫)|街巷.{0,16}(保洁|清扫)|环境卫生.{0,8}保洁|垃圾.{0,12}(清运|收运)|城乡.{0,12}保洁|农村.{0,12}保洁|集镇.{0,20}保洁|公厕.{0,8}(管理|保洁)/.test(text)&&!/(车辆|垃圾桶|设备).{0,6}(购置|采购)/.test(text))out.push(categories[3]);
 if(/(河道|河湖|河面|水域|河流).{0,20}(养护|保洁|管护|维护|清淤|打捞|管养)|保洁.{0,12}河道/.test(text))out.push(categories[4]);
 if(/(绿化|绿地|园林|绿植|花卉|行道树|草坪).{0,24}(养护|管养|管护|维护|修剪)|(?:养护|管养|管护).{0,12}(绿化|绿地|园林|行道树)/.test(text))out.push(categories[5]);
 if(/(水质|地表水|地下水|饮用水|水源地|水环境|河湖水体).{0,20}(监测|检测|采样|水样分析)|(?:污水|废水|排口)(?:排放|水质)?(?:在线|自动|自行|监督性|第三方)?(?:监测|检测|采样)|(?:监测|检测).{0,12}水质/.test(text))out.push(categories[6]);
 const operation='(?:运行维护|运行管理|运营管理|运营维护|运营|运维|运管|养护|管养|管护|维护|托管|长效管理)';
 const rural='(?:(?:农村|村镇|乡村|农居|村庄).{0,12}(?:生活)?污水|农污)';
 if(new RegExp(rural+'.{0,30}'+operation+'|'+operation+'.{0,12}'+rural).test(text))out.push(categories[7]);
 if(new RegExp('(?:泵站|泵房|提升泵站|排涝站).{0,24}'+operation+'|'+operation+'.{0,12}(?:泵站|泵房|排涝站)').test(text))out.push(categories[8]);
 return out;
}
function plain(html){return String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();}
function deadline(text,type){if(!['招标公告','非招标公告'].includes(type))return null;const m=text.match(/(?:提交投标文件截止时间|投标截止时间|响应文件提交截止时间|截止时间)[：:\s]*([12]\d{3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*(\d{1,2})\s*[:：时]\s*(\d{1,2})/);if(!m)return null;const [y,mo,d,h,mi]=m.slice(1).map(Number);if(mo<1||mo>12||d<1||d>31||h>23||mi>59)return null;return Date.parse(`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}T${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}:00+08:00`);}
function normalize(row,type){const project=row.projectName||row.title||'';return {id:row.articleId,title:row.title||project,project,type,tags:classify(project),published:Number(row.publishDate)||0,city:cities[String(row.districtCode).slice(0,4)]||'省本级/其他',district:row.districtName||'',buyer:row.purchaseName||'',budget:Number(row.budgetPrice)>0?Number(row.budgetPrice):null,opening:Number(row.bidOpeningTime)||null,deadline:null,url:BASE+'/site/detail?parentId=600007&articleId='+encodeURIComponent(row.articleId),invalid:row.invalid===1,detailStatus:'未读取'};}
function dateCN(n){return new Date(n).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function collect(options={}){const request=options.fetch||fetch,progress=options.progress||(()=>{}),now=options.now||Date.now(),days=options.days||14,start=dateCN(now-(days-1)*86400000),coverage=[],byId=new Map();
 async function get(path,body){let last;for(let attempt=0;attempt<2;attempt++){try{const r=await request(BASE+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,credentials:'omit',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();if(!j.success||!j.result?.data)throw Error('官方接口未返回有效数据');return j.result.data;}catch(e){last=e;if(attempt===0)await delay(650);}}throw last;}
 for(const [code,type]of sources){const status={code,type,total:0,scanned:0,complete:false,error:null};coverage.push(status);try{for(let page=1;page<=40;page++){progress(`读取${type} · 第 ${page} 页`);const data=await get('/portal/category',{categoryCode:code,pageSize:100,pageNo:page,publishDateBegin:start});if(!Array.isArray(data.data)||!Number.isFinite(Number(data.total)))throw Error('公告列表格式变化');status.total=Number(data.total);status.scanned+=data.data.length;for(const row of data.data){if(!row.articleId)continue;const n=normalize(row,type);if(!n.tags.length)continue;const old=byId.get(n.id);if(old){old.tags=[...new Set([...old.tags,...n.tags])];if(old.project!==n.project){old.project=old.title;old.budget=null;}}else byId.set(n.id,n);}if(status.scanned>=status.total||data.data.length===0){status.complete=status.scanned>=status.total;break;}await delay(120);}if(!status.complete)status.error='分页未完成，可能存在遗漏';}catch(e){status.error=e.message;}}
 if(coverage.every(s=>!s.complete&&s.scanned===0))throw Error('未能读取任何官方公告，请检查网络后重试。');
 const records=[...byId.values()].sort((a,b)=>b.published-a.published);let cursor=0,done=0;
 async function detailWorker(){while(cursor<records.length){const item=records[cursor++];try{const d=await get('/portal/detail?articleId='+encodeURIComponent(item.id));item.text=plain(d.content);item.projectCode=d.projectCode||'';item.deadline=deadline(item.text,item.type);item.detailStatus='已读取';item.related=(d.newLinkNodeList||[]).flatMap(n=>n.relatedArticles||[]).filter(r=>r.articleId&&r.articleId!==item.id).map(r=>({id:r.articleId,title:r.title||'关联公告',published:Number(r.publishDate)||0,url:BASE+'/site/detail?parentId=600007&articleId='+encodeURIComponent(r.articleId)}));}catch(e){item.detailStatus='详情暂不可用';item.detailError=e.message;}done++;progress(`核实公告详情 ${done} / ${records.length}`);await delay(120);}}
 await Promise.all([detailWorker(),detailWorker()]);
 return {version:2,updatedAt:new Date().toISOString(),rangeStart:start,days,coverage,records,scope:'浙江政府采购网政府采购栏目；按标题和项目名称匹配七类养护及水质监测业务。未覆盖独立交易平台和非政府采购栏目，可能漏掉标题不明确的项目。'};
}
return {BASE,categories,sources,cities,classify,plain,deadline,normalize,collect};
});
