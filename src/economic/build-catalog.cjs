// Approved life/UI recordings remain immutable; newly authored legacy prose is refreshed before its first recording.
const fs=require('node:fs'),ts=require('typescript');
const root=__dirname, file=root+'\\narration-catalog.json', legacy=JSON.parse(fs.readFileSync(root+'\\legacy-content.json','utf8')),catalog=JSON.parse(fs.readFileSync(file,'utf8'));
const source=fs.readFileSync(root+'\\model.ts','utf8'),ast=ts.createSourceFile('model.ts',source,ts.ScriptTarget.Latest,true),rows=[];
function visit(n){if(ts.isArrayLiteralExpression(n)&&n.elements.length===11&&n.elements.every(ts.isStringLiteral))rows.push(n.elements.map(e=>e.text));ts.forEachChild(n,visit);}visit(ast);
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
 const money=(n)=>{const cents=Math.round(Number(n)*100),whole=Math.floor(cents/100),rest=cents%100;return lang==='en'?number(whole,lang)+' yuan'+(rest?' and '+number(rest,lang)+' cents':''):number(whole,lang)+'元'+(rest?number(rest,lang)+'分':'');};
 s=s.replace(/¥(\d+(?:\.\d+)?)/g,(_,n)=>money(n)).replace(/(\d+(?:\.\d+)?)元/g,(_,n)=>money(n));
 s=s.replace(/(\d+)%/g,(_,n)=>lang==='zh'?'百分之'+number(+n,lang):number(+n,lang)+(lang==='ja'?'パーセント':' percent'));
 return s.replace(/\d+(?:\.\d+)?/g,n=>n.includes('.')?number(+n.split('.')[0],lang)+(lang==='en'?' point ':'点')+n.split('.')[1].split('').map(v=>number(+v,lang)).join(lang==='en'?' ':''):number(+n,lang));
}
function add(id,text){const clean=Object.fromEntries(['zh','en','ja','mn'].map(lang=>[lang,spoken(text[lang],lang)]));const old=catalog.scripts.find(s=>s.id===id);if(old){if(JSON.stringify(old.text)!==JSON.stringify(clean)){if(!id.startsWith('legacy.'))throw new Error('Recorded stable ID changed: '+id);old.text=clean;}return;}catalog.scripts.push({id,text:clean});}
if(rows.length!==24)throw new Error('Expected original 24 stories');
rows.forEach((r,i)=>{const story=legacy.stories[i];add('legacy.'+r[0]+'.title',{zh:r[1],en:r[2],ja:story.ja.title,mn:story.mn.title});add('legacy.'+r[0]+'.body',{zh:r[5]+' '+r[3],en:r[6]+' '+r[4],ja:story.ja.body,mn:story.mn.body});});
for(const [id,text] of Object.entries(legacy.actions))add('legacy.action.'+id,text);
for(const [id,text] of Object.entries(legacy.items))add('legacy.item.'+id,text);
for(const [id,text] of Object.entries(legacy.common))add('legacy.common.'+id,text);
for(const script of catalog.scripts){if(Object.keys(script.text).sort().join(',')!=='en,ja,mn,zh'||Object.values(script.text).some(t=>!t.trim()||/[{}\d]/.test(t)))throw new Error('Invalid spoken script '+script.id);}
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');console.log(catalog.scripts.length+' scripts, '+catalog.scripts.length*8+' recording keys');
