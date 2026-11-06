const digits=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
function number(n,lang){
 if(!Number.isSafeInteger(n))throw new Error('Unsafe spoken number');
 if(n<0)return (lang==='en'?'minus ':lang==='ja'?'マイナス':'负')+number(-n,lang);
 if(lang==='zh'||lang==='ja'){
  const symbols='零一二三四五六七八九';if(!n)return '零';
  for(const [scale,label] of [[1000000000000,'万亿'],[100000000,'亿'],[10000,'万']])if(n>=scale){const rest=n%scale;return number(Math.floor(n/scale),lang)+label+(rest?(lang==='zh'&&rest<scale/10?'零':'')+number(rest,lang):'');}
  let result='';for(const [scale,label] of [[1000,'千'],[100,'百'],[10,'十']])if(n>=scale){const prefix=Math.floor(n/scale);result+=(lang==='ja'&&prefix===1||scale===10&&prefix===1&&!result?'':symbols[prefix])+label;n%=scale;if(n&&lang==='zh'&&n<scale/10)result+='零';}return result+(n?symbols[n]:'');
 }
 if(n<20)return digits[n];if(n<100)return ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'][Math.floor(n/10)]+(n%10?' '+digits[n%10]:'');
 for(const [scale,label] of [[1000000000000,'trillion'],[1000000000,'billion'],[1000000,'million'],[1000,'thousand'],[100,'hundred']])if(n>=scale)return number(Math.floor(n/scale),lang)+' '+label+(n%scale?(scale===100?' and ':' ')+number(n%scale,lang):'');
}
function spoken(s,lang){
 if(lang==='mn')return s;
 const money=(n,explicitQian=false)=>{
  const cents=Math.round(Number(n)*100),whole=Math.floor(cents/100),rest=cents%100;
  if(lang==='en')return number(whole,lang)+' yuan'+(rest?' and '+number(rest,lang)+' cents':'');
  if(lang==='ja')return number(whole,lang)+'元'+(rest?number(rest,lang)+'分':'');
  if(!rest)return number(whole,lang)+'元'+(explicitQian?'钱':'');
  const jiao=Math.floor(rest/10),fen=rest%10;
  return (whole?number(whole,lang)+'元':'')+(jiao?number(jiao,lang)+'角':whole&&fen?'零':'')+(fen?number(fen,lang)+'分':'')+'钱';
 };
 const yuan=lang==='zh'?/¥(\d+(?:\.\d+)?|\.\d+)/g:/¥(\d+(?:\.\d+)?)/g;
 const yuanSuffix=lang==='zh'?/(\d+(?:\.\d+)?|\.\d+)元(钱)?/g:/(\d+(?:\.\d+)?)元/g;
 s=s.replace(yuan,(_,n)=>money(n)).replace(yuanSuffix,(_,n,qian)=>money(n,qian==='钱'));
 s=s.replace(/(\d+)%/g,(_,n)=>lang==='zh'?'百分之'+number(+n,lang):number(+n,lang)+(lang==='ja'?'パーセント':' percent'));
 return s.replace(/\d+(?:\.\d+)?/g,n=>n.includes('.')?number(+n.split('.')[0],lang)+(lang==='en'?' point ':'点')+n.split('.')[1].split('').map(v=>number(+v,lang)).join(lang==='en'?' ':''):number(+n,lang));
}
// These complete Chinese scripts are authoritative for the approved legacy body recordings.
const legacyBodies={
 'school-list':'小熊文具店长说：玩具恐龙也想进书包，但午饭不能变成恐龙。 给每个孩子买苹果和面包，购物单预算是每人两元五角。',
 'change':'面包阿姨忙得把计算器当电话了。你可以帮她检查找零！ 用五元付款买一元两角的面包，拿回正确找零，交给同学。',
 'foreign-exchange':'鹦鹉兑换员：一贝币＝二元，兑换一次收两角。扫码也能只是花自己的钱，不等于借款！ 看清虚构汇率和费用，兑换五贝币，再用预付钱包支付孩子们的巴士票。',
 'travel-prices':'海螺店长：国内同款两元六角，岛上一贝币；兑换整笔还有两角费用。这只是今天的虚构价格，不保证哪里永远便宜。 把同款纪念品的国内价和贝币价换算比较，给每个孩子选一份。',
 'toy-customs':'螃蟹关员：这是游戏规则，不是现实海关政策。国外买的礼物换算超过四元，这个信封收六角；主动申报，别装成袜子！ 查看虚构海关规则，如实申报纪念品，支付显示的费用，拿到通行章。',
};
function legacyBodyZh(id,intro,goal){return Object.hasOwn(legacyBodies,id)?legacyBodies[id]:intro+' '+goal;}
module.exports={spoken,legacyBodyZh};
