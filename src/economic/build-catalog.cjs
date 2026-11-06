// Approved life/UI recordings remain immutable; newly authored legacy prose is refreshed before its first recording.
const fs=require('node:fs'),ts=require('typescript');
const root=__dirname, file=root+'\\narration-catalog.json', legacy=JSON.parse(fs.readFileSync(root+'\\legacy-content.json','utf8')),catalog=JSON.parse(fs.readFileSync(file,'utf8'));
const source=fs.readFileSync(root+'\\model.ts','utf8'),ast=ts.createSourceFile('model.ts',source,ts.ScriptTarget.Latest,true),rows=[];
function visit(n){if(ts.isArrayLiteralExpression(n)&&n.elements.length===11&&n.elements.every(ts.isStringLiteral))rows.push(n.elements.map(e=>e.text));ts.forEachChild(n,visit);}visit(ast);
const {spoken,legacyBodyZh}=require('./catalog-speech.cjs');
function add(id,text){const clean=Object.fromEntries(['zh','en','ja','mn'].map(lang=>[lang,spoken(text[lang],lang)]));const old=catalog.scripts.find(s=>s.id===id);if(old){if(JSON.stringify(old.text)!==JSON.stringify(clean)){if(!id.startsWith('legacy.'))throw new Error('Recorded stable ID changed: '+id);old.text=clean;}return;}catalog.scripts.push({id,text:clean});}
if(rows.length!==24)throw new Error('Expected original 24 stories');
rows.forEach((r,i)=>{const story=legacy.stories[i];add('legacy.'+r[0]+'.title',{zh:r[1],en:r[2],ja:story.ja.title,mn:story.mn.title});add('legacy.'+r[0]+'.body',{zh:legacyBodyZh(r[0],r[5],r[3]),en:r[6]+' '+r[4],ja:story.ja.body,mn:story.mn.body});});
for(const [id,text] of Object.entries(legacy.actions))add('legacy.action.'+id,text);
for(const [id,text] of Object.entries(legacy.items))add('legacy.item.'+id,text);
for(const [id,text] of Object.entries(legacy.common))add('legacy.common.'+id,text);
for(const script of catalog.scripts){if(Object.keys(script.text).sort().join(',')!=='en,ja,mn,zh'||Object.values(script.text).some(t=>!t.trim()||/[{}\d]/.test(t)))throw new Error('Invalid spoken script '+script.id);}
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');console.log(catalog.scripts.length+' scripts, '+catalog.scripts.length*8+' recording keys');
