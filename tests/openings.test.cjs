const assert=require('node:assert/strict');require('./load-rules.cjs');require('../src/engine.js');const E=global.OrderEngine;
const parse=s=>E.parse(s,{date:'2026-09-26'});
const aliases=['左右单拉','左右单开','左、右单拉','左、右单开','左，右单拉','左，右单开','左,右单拉','左,右单开','左 、 右 单拉'];
const same=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(const alias of aliases){
 const o=parse(`JF30黑色${alias}，宽5.6米高2.8米，客户：测试客户`),c=E.cutting(o);
 assert.equal(o.opening,'左右单开',alias);assert.equal(E.normalizeOpening(alias),'左右单开');
 assert.deepEqual([o.large,o.half,o.aux],[17,2,0]);same(c.correction,.16);same(c.actual,5.5438);assert.equal(c.hint,'少5.62公分');
 assert.equal(E.detailRow(o)[11],'左右单开');assert.match(E.productionRow(o)[2],/左右单开/);assert.equal(E.tsv([o]).split('\t')[12],'少5.62公分');
 assert.equal(parse(`JF30宽5.6高2.8，${alias}`).customer,'',alias+' should not become customer');
 const batch=E.parseMany(`5.6米，7.2米，两个门，高2.8米，JF30${alias}`);assert.ok(batch.every(o=>o.opening==='左右单开'&&o.half===2));
 const jj=parse(`JJ30${alias} 宽5.6高2.8`);assert.equal(jj.large,null);jj.cutHalfPitch=.14955;E.applyAuto(jj);assert.equal(jj.large,17);same(E.cutting(jj).correction,.16);
}
assert.deepEqual([parse('7.2米左右单拉 高2.5米 JF30').width,parse('7.2米左右单拉 高2.5米 JF30').opening],[7.2,'左右单开']);
let checked=0;
for(const size of [30,28,24,19,15,12,10])for(const width of [1,3.3,5.6,7.2,13.4]){
 const o=parse(`JF${size}左右单开 宽${width}高2.8`),p=E.panelParameters(o),c=E.cutting(o);
 assert.equal(p.defaultHalf,2);assert.equal(p.correction,.16);
 const candidates=Array.from({length:Math.floor(width/p.pitch)+1},(_,n)=>({n,error:Number((Number((n*p.pitch).toFixed(6))+Number((2*p.halfPitch).toFixed(6))+.16-width).toFixed(6))})).sort((a,b)=>Math.abs(a.error)-Math.abs(b.error)||a.n-b.n);
 assert.equal(o.large,candidates[0].n);same(c.error,candidates[0].error);checked++;
}
const positive=parse('JF30左右单开 宽7.2高2.8');assert.equal(E.production(positive).errorHint,'多13.84公分');
const exact=parse('JF30左右单开 宽5.5438高2.8');assert.equal(E.production(exact).errorHint,'0公分');
const tie=parse('JF30左右单开 宽5.69335高2.8');assert.equal(tie.large,17);assert.equal(E.production(tie).errorHint,'少14.955公分');
const manual=parse('JF30左右单拉 宽5.6高2.8 大片16片，半片4片');assert.equal(manual.countMode,'manual');assert.deepEqual([manual.large,manual.half],[16,4]);same(E.cutting(manual).actual,5.5438);E.applyAuto(manual,true);assert.deepEqual([manual.large,manual.half],[17,2]);
const old={...manual,opening:'左、右单拉',large:10,countMode:'manual'};E.upgradeOrder(old,'1.8');assert.equal(old.opening,'左右单开');assert.equal(old.large,10);assert.match(E.production(old).errorHint,/^少/);
assert.equal(parse('JF30左右单开 宽0.1高2.8').large,null);assert.equal(E.cutting(parse('JF30左右单开')).correction,.16);
for(const [opening,correction,halves] of [['单开',.09,2],['单拉',.09,2],['双开',.14,4],['对开',.14,4],['偏双拉',.14,4]]){const o=parse(`JF30${opening} 宽5.6高2.8`);assert.equal(E.cutting(o).correction,correction);assert.equal(o.half,halves);}
console.log(`v1.9 passed: ${aliases.length} aliases, ${checked} exhaustive nearest-choice checks, 2-half defaults, signs, zero/tie, batches, JJ overrides and manual/draft preservation.`);
