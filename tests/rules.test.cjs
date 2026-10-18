const assert=require('node:assert/strict');require('./load-rules.cjs');require('../src/engine.js');const E=global.OrderEngine;
const parse=s=>E.parse(s,{date:'2026-09-25'});
assert.equal(E.production(parse('宽4.5高2.745')).netHeight,2.665);
assert.equal(E.production(parse('宽4.5高2.745，扣高7公分')).netHeight,2.675);
assert.equal(E.production(parse('宽4.5高2.745，净高2.6')).netHeight,2.6);
assert.equal(E.production(E.parse('宽4.5高2.745',{deduction:null})).netHeight,null);
assert.equal(E.production(E.parse('宽4.5高2.745',{deduction:0})).netHeight,2.745);
for(const [large,half] of [[30,15],[28,15],[19,10],[12,5],[10,5],[24,12],[15,7.5],[22,11]]){
 const o=parse('JF'+large+'白单拉两窗，宽4.5高3');
 assert.equal(E.materialInfo(o).largeWidthCm,large);assert.equal(E.materialInfo(o).halfWidthCm,half);
 assert.ok(E.calculationRow(o,0)[23].includes('半片规格：'+half+'公分'));
}
for(const [input,output] of [['单拉','单开'],['双拉','双开'],['对开','双开'],['单开','单开'],['双开','双开'],['偏对开','偏双开'],['不对称对开','不对称双开']]){
 const o=parse('JF30白'+input+'两窗 宽4高3');assert.equal(o.opening,output);assert.ok(E.desc(o).includes(output));assert.equal(E.detailRow(o)[11],output);
}
assert.equal(parse('白色24公分双拉两窗，宽4高3').model,'JF24');
assert.equal(parse('22公分白单拉，宽4高3').model,'JF22');
assert.equal(parse('宽450公分，高300公分').model,'JF');
assert.equal(parse('扣高8公分，宽4高3').model,'JF');
assert.equal(parse('大片宽度24公分，半片12公分，宽4.5高3').model,'JF24');
assert.equal(parse('大片宽度24公分，半片12公分，宽4.5高3').width,4.5);
assert.equal(parse('JF30 半片15公分').half,null);
assert.equal(parse('JF30 大片14片，半片2片').half,2);
assert.equal(parse('加大24公分白双拉').model,'JJ24');
assert.equal(E.materialInfo(parse('JJ19双拉')).kind,'加大');assert.equal(E.materialInfo(parse('JJ19双拉')).halfWidthCm,null);
assert.equal(E.normalizeModel('jf 24公分'),'JF24');assert.equal(E.normalizeModel('30'),'JF30');
const old=parse('JF30');Object.assign(old,{deduction:null,opening:'对开',netHeight:2.5});E.upgradeOrder(old);assert.equal(old.deduction,.08);assert.equal(old.opening,'双开');assert.equal(old.netHeight,2.5);
const custom=parse('JF30');custom.deduction=.07;E.upgradeOrder(custom);assert.equal(custom.deduction,.07);
console.log('User rules passed: defaults and overrides, all half-width exceptions, family identification, normalized output, dimensions versus counts and draft upgrade.');
