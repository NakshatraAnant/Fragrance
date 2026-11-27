// Parses the text extracted from Fragrance_Enterprise_Blueprint.pptx (see extract-pptx-text.js)
// into structured catalogue JSON. Source of truth: slides 71-74 (SKU master), 195-206 (concept library).
// Usage: node scripts/parse-blueprint.js <extracted.txt> data/catalogue
const fs = require('fs'), path = require('path');
const [, , src, outDir] = process.argv;
const text = fs.readFileSync(src, 'utf8');
const slides = {};
for (const part of text.split(/\n===== SLIDE (\d+) =====\n/).slice(1).reduce((a, v, i, arr) => (i % 2 === 0 && a.push([v, arr[i + 1]]), a), [])) slides[+part[0]] = part[1];
const rows = (n) => (slides[n] || '').split('\n').filter((l) => l.startsWith('[ROW] ')).map((l) => l.slice(6).split(' | ').map((c) => c.trim()));
const rs = (s) => (s === '—' || s === '' ? null : Math.round(parseFloat(s.replace(/Rs|,|\s/g, '')) * 100));
const skus = [];
for (const n of [71, 72, 73, 74]) for (const r of rows(n)) {
  if (r[0] === 'Code') continue;
  const [code, product, format, netQty, conc, mrp, esp, mrpPerMl, channels, gift, replen] = r;
  skus.push({ code, product, format, netQty, concentrationPct: parseFloat(conc), mrpPaise: rs(mrp), expectedSellingPricePaise: rs(esp), mrpPerMl: mrpPerMl === '—' ? null : mrpPerMl, channels: channels.split(',').map((s) => s.trim()), giftSuitability: gift, replenishment: replen, sourceSlide: n });
}
const olf = {}, com = {};
for (let n = 195; n <= 200; n++) for (const r of rows(n)) { if (r[0] === 'ID') continue; const [id, name, brand, family, top, heart, base, journey] = r; olf[id] = { id, name, brand, family, top: top.split(',').map((s) => s.trim()), heart: heart.split(',').map((s) => s.trim()), base: base.split(',').map((s) => s.trim()), journey, sourceSlide: n }; }
for (let n = 201; n <= 206; n++) for (const r of rows(n)) { if (r[0] === 'ID') continue; const [id, , story, character, target, occasion, climate, gender, tierFormat, differentiation, packaging, marketing] = r; com[id] = { story, character, target, occasion, climate, gender, tierFormat, differentiation, packaging, marketing, sourceSlide: n }; }
const concepts = Object.values(olf).map((o) => ({ ...o, ...(com[o.id] || {}), phase: o.journey.startsWith('Pipeline') ? 'PIPELINE' : 'PHASE_ONE' }));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'skus.json'), JSON.stringify(skus, null, 2));
fs.writeFileSync(path.join(outDir, 'concepts.json'), JSON.stringify(concepts, null, 2));
console.log('SKUs:', skus.length, 'concepts:', concepts.length, 'phase-one:', concepts.filter((c) => c.phase === 'PHASE_ONE').length);
