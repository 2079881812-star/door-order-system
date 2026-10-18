const fs=require('node:fs'),assert=require('node:assert/strict');require('./load-rules.cjs');require('../src/engine.js');const E=global.OrderEngine;
const parse=s=>E.parse(s,{date:'2026-09-26'}),many=s=>E.parseMany(s,{date:'2026-09-26'}),close=(a,b)=>assert.ok(a!==null&&Math.abs(a-b)<1e-7,`${a} != ${b}`);
const one=parse('7.2米，高2.5米，单开白色30公分，老弯轨做锁。');
assert.deepEqual([one.width,one.height,one.large,one.half,one.aux],[7.2,2.5,23,2,0]);close(E.cutting(one).actual,7.2684);assert.equal(E.production(one).errorHint,'多6.84公分');
assert.deepEqual(E.cutting(one).candidates.map(x=>[x.n,x.hint]),[[22,'少23.07公分'],[23,'多6.84公分']]);
const raw='13.4米，13.1米，7.2米，三个门，高2.5米，单开白色30公分，老弯轨做锁。';
const batch=many(raw);assert.equal(batch.length,3);assert.equal(new Set(batch.map(o=>o.id)).size,3);assert.deepEqual(batch.map(o=>o.width),[13.4,13.1,7.2]);
assert.deepEqual(batch.map(o=>o.large),[44,42,23]);assert.deepEqual(batch.map(o=>E.production(o).errorHint),['多14.95公分','少14.87公分','多6.84公分']);
for(const o of batch){assert.equal(o.height,2.5);assert.equal(o.quantity,1);assert.equal(o.model,'JF30');assert.equal(o.track,'老弯轨');assert.equal(o.lock,'做锁');assert.equal(o.raw,raw);assert.equal(o.aux,0);}
for(const text of [raw.replace('三个门','3个门'),'三个门：13.4米、13.1米、7.2米，高2.5米，JF30白单开老弯轨做锁','宽分别为13.4、13.1、7.2米，3个门，高2.5米，JF30单开','1340、1310、720厘米，三个门，高250厘米，30公分单开','三个门，13.4米和13.1米及7.2米，高2.5米，30公分单开'])assert.deepEqual(many(text).map(o=>o.width),[13.4,13.1,7.2],text);
for(const [label,n] of [['两',2],['二',2],['十',10],['十一',11],['二十一',21],['一百零二',102],['二百',200],['五百',500]]){const a=many(`${label}个门，宽7.2米，高2.5米，JF30单开`);assert.equal(a.length,n);assert.ok(a.every(o=>o.width===7.2&&o.quantity===1));}
for(const text of ['13.4米，13.1米，三个门，高2.5米','0个门，7.2米，高2.5米','五百零一个门，7.2米，高2.5米','2.5个门，7.2米，高2.5米','两个门，高2.5米','3米，4米，两个门，高2米，高3米'])assert.throws(()=>many(text),undefined,text);
const priced=many(raw+'，客户：示例门业，地址：测试区示例路，电话13000000000，100元/平方米，总价5000');assert.ok(priced.every(o=>o.unitPrice===100&&o.quantity===1&&o.quotedTotal===null&&o.customer==='示例门业'&&o.phone==='13000000000'));close(priced.map(E.calculations).reduce((s,c)=>s+c.total,0),8425);
const same=many('两个门，7.2*2.5，JF30单开');assert.ok(same.every(o=>o.width===7.2&&o.height===2.5));
assert.equal(E.parseOrders(raw+'\n\n宽4高3，JF24单开').length,4);assert.throws(()=>E.parseOrders('500个门，7.2米，高2.5米\n\n宽4高3'));
const exact=parse('JF30双开 宽5.5238高2.8');assert.equal(E.production(exact).errorHint,'0公分');
const lower=parse('JF30双开 宽5.6高2.8');assert.equal(lower.large,16);assert.equal(E.production(lower).errorHint,'少7.62公分');
const tie=parse('JF30单开 宽7.11885高3');assert.equal(tie.large,22);assert.equal(E.cutting(tie).candidates[0].error,-.14955);
let compared=0;for(const size of [30,28,24,19,15,12,10])for(const opening of ['单开','双开'])for(const width of [1,3.3,5.6,7.2,13.4]){
 const o=parse(`JF${size}${opening} 宽${width}高2.5`),c=E.cutting(o),p=E.panelParameters(o);
 const all=Array.from({length:Math.floor(width/p.pitch)+1},(_,n)=>({n,e:Number((Number((n*p.pitch).toFixed(6))+Number((p.defaultHalf*p.halfPitch).toFixed(6))+p.correction-width).toFixed(6))})).sort((a,b)=>Math.abs(a.e)-Math.abs(b.e)||a.n-b.n);
 assert.equal(o.large,all[0].n);close(c.error,all[0].e);assert.equal(o.half,p.defaultHalf);compared++;
}
const old={...one,large:22,countMode:'auto'};E.upgradeOrder(old,'1.6');assert.equal(old.large,23);
const manual={...one,large:22,countMode:'manual'};E.upgradeOrder(manual,'1.6');assert.equal(manual.large,22);assert.equal(E.production(manual).errorHint,'少23.07公分');
const missing=parse('客户：空白');assert.equal(E.production(missing).eights,null);assert.equal(missing.aux,0);
assert.equal(E.parseOrders('').length,0);
E.validate([...batch,one,exact,lower,tie]);
console.log(`v1.7: ${compared} exhaustive nearest-choice checks, sign labels, ties, width-list groups, Chinese counts through 500, shared fields/pricing, mismatch protection and migration passed.`);
console.log(batch.map(o=>({width:o.width,height:o.height,large:o.large,half:o.half,error:E.production(o).errorHint})));
