const fs=require('node:fs'),assert=require('node:assert/strict');require('./load-rules.cjs');require('../src/engine.js');const E=global.OrderEngine;
const parse=s=>E.parse(s,{date:'2026-09-26'});
const input='19公分白色单开3.28高X13.5米长3窗要锁中';
const original=parse(input);
assert.deepEqual([original.model,original.width,original.height,original.length,original.windows,original.lock],['JF19',13.5,3.28,13.5,3,'要锁中']);
assert.equal(E.production(original).netHeight,3.2);assert.equal(original.large,72);assert.equal(original.half,2);assert.equal(original.aux,0);
let unitsChecked=0,variantsChecked=0;
for(const [unit,scale] of [['米',1],['m',1],['cm',100],['厘米',100],['公分',100],['mm',1000],['毫米',1000],['CM',100],['MM',1000],['M',1]]){
 for(const text of [`JF19单开，${3.28*scale}${unit}高，${13.5*scale}${unit}宽`,`JF19单开，高${3.28*scale}${unit}，宽${13.5*scale}${unit}`,`JF19单开，${3.28*scale}${unit}高X${13.5*scale}${unit}长`]){
  const o=parse(text);assert.equal(o.height,3.28,text);assert.equal(o.width,13.5,text);assert.equal(o.model,'JF19');unitsChecked++;
 }
}
for(const op of ['X','x','*','×','✕','＊','\\*',' X '])for(const [text,w,h] of [
 [`19公分白色单开3.28高${op}13.5米长3窗要锁中`,13.5,3.28],
 [`JF19 高3.28m${op}宽13.5米`,13.5,3.28],
 [`JF19 13.5米宽${op}3.28米高`,13.5,3.28],
 [`JF19 328cm高${op}13500mm长`,13.5,3.28],
 [`JF19 13.5米${op}3.28高`,13.5,3.28],
 [`JF19 720${op}250cm`,7.2,2.5]
]){const o=parse(text);assert.equal(o.width,w,text);assert.equal(o.height,h,text);variantsChecked++;}
for(const [text,w,h,l,m] of [
 ['19公分单开，3.28高，13.5米长',13.5,3.28,13.5,'JF19'],
 ['3.28高X13.5米长，19公分白色单开',13.5,3.28,13.5,'JF19'],
 ['328cm高X1350cm长，19公分单开',13.5,3.28,13.5,'JF19'],
 ['3.28高X1350cm长，19公分单开',13.5,3.28,13.5,'JF19'],
 ['7.2米，高2.5米，30公分单开',7.2,2.5,null,'JF30'],
 ['7.2米高2.5米，30公分单开',7.2,2.5,null,'JF30'],
 ['7.2米，2.5米高，30公分单开',7.2,2.5,null,'JF30'],
 ['2.5m高，7.2m，JF30单开',7.2,2.5,null,'JF30'],
 ['JF30，7.2米高，宽2.5米',2.5,7.2,null,'JF30'],
 ['JF30，宽7.2米高2.5米，长度10米，按米计价',7.2,2.5,10,'JF30'],
 ['JF30，半片15公分，宽4.5高3，净高2.6米',4.5,3,null,'JF30'],
 ['大片宽度24公分，半片12公分，宽4.5高3',4.5,3,null,'JF24']
]){const o=parse(text);assert.deepEqual([o.width,o.height,o.length,o.model],[w,h,l,m],text);}
const price=parse(E.examples[1]);assert.deepEqual([price.width,price.height,price.unitPrice,price.quotedTotal],[5.2,3.16,105,1725.36]);assert.equal(E.calculations(price).total,1725.36);
const batch=E.parseMany('13.4米，13.1米，7.2米，三个门，250厘米高，单开30公分，老弯轨做锁');assert.deepEqual(batch.map(o=>[o.width,o.height,o.quantity]),[[13.4,2.5,1],[13.1,2.5,1],[7.2,2.5,1]]);
const batch2=E.parseMany('13.4米长，13.1米长，7.2米长，三个门，2.5米高，30公分单开');assert.deepEqual(batch2.map(o=>[o.width,o.height]),[[13.4,2.5],[13.1,2.5],[7.2,2.5]]);
const duplicate=E.parseMany('两个门，3.28高X13.5米长，19公分白色单开3窗要锁中');assert.deepEqual(duplicate.map(o=>[o.width,o.height]),[[13.5,3.28],[13.5,3.28]]);
assert.throws(()=>E.parseMany('两个门，7.2米，3米，2.5米高，3米高，JF30'));
assert.ok(parse('JF30，5*3*2').multiSize);assert.ok(parse('JF30，5*3，6*4').multiSize);
assert.equal(parse('JF30，7..2米高，宽5米').height,null);
for(const text of ['JF30，3窗要锁中','JF30，半片15公分','JF30，单价105，数量2套','JF30，电话13000000000']){const o=parse(text);assert.equal(o.width,null,text);assert.equal(o.height,null,text);}
// Row mappings prove both WPS copy and workbook inputs receive metres in D/E.
const row=E.productionRow(original),detail=E.detailRow(original);assert.equal(row[3],13.5);assert.equal(row[4],3.28);assert.equal(detail[6],13.5);assert.equal(detail[7],3.28);assert.match(row[2],/JF19.*三窗.*要锁中/);
assert.equal(E.tsv([original]).split('\t')[3],'13.5');assert.equal(E.tsv([original]).split('\t')[4],'3.28');E.validate([original,...batch]);
console.log(`v1.8 passed: ${unitsChecked} unit conversions, ${variantsChecked} operator/direction variants, dimensions vs counts/materials, billing, batch suffix heights, WPS row mappings.`);
