const fs=require('fs'),p=require('path');
const d=process.argv[2];
const sl=fs.readdirSync(p.join(d,'ppt/slides')).filter(f=>/^slide\d+\.xml$/.test(f)).sort((a,b)=>parseInt(a.match(/\d+/))-parseInt(b.match(/\d+/)));
function txt(x){
  // tables: rows -> cells joined by |
  x=x.replace(/<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/g,(m,r)=>{const cells=[...r.matchAll(/<a:tc\b[^>]*>([\s\S]*?)<\/a:tc>/g)].map(c=>[...c[1].matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(t=>t[1]).join(' '));return '\n[ROW] '+cells.join(' | ')+'\n';});
  x=x.replace(/<\/a:p>/g,'\n');
  return [...x.matchAll(/<a:t>([^<]*)<\/a:t>|\n(\[ROW\][^\n]*)\n|(\n)/g)].map(m=>m[1]!==undefined?m[1]:(m[2]?'\n'+m[2]+'\n':'\n')).join('').replace(/\n{2,}/g,'\n').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
}
let out='';
for(const f of sl){const n=f.match(/\d+/)[0];out+=`\n===== SLIDE ${n} =====\n`+txt(fs.readFileSync(p.join(d,'ppt/slides',f),'utf8'));
 const nf=p.join(d,'ppt/notesSlides',`notesSlide${n}.xml`);
 // notes mapping via rels
 const rel=p.join(d,'ppt/slides/_rels',f+'.rels');
 if(fs.existsSync(rel)){const r=fs.readFileSync(rel,'utf8').match(/notesSlide(\d+)\.xml/);if(r){const t=txt(fs.readFileSync(p.join(d,'ppt/notesSlides',`notesSlide${r[1]}.xml`),'utf8')).trim();if(t&&!/^\d+$/.test(t))out+='\n--- NOTES ---\n'+t+'\n';}}
}
fs.writeFileSync(process.argv[3],out);console.log(out.length);
