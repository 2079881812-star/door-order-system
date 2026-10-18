const assert=require('node:assert/strict');
require('./load-rules.cjs');require('../src/engine.js');
const E=global.OrderEngine;
let checked=0;
function check(text,width=7.2,height=2.5){
 const o=E.parse('JF30白色单开两窗，'+text,{date:'2026-10-12'});
 assert.deepEqual([o.width,o.height],[width,height],text);
 assert.ok(!o.multiSize,text+': unexpected conflict');
 assert.equal(o.model,'JF30',text);assert.equal(o.windows,2,text);
 const expected=E.parse(`JF30白色单开两窗，宽${width}米，高${height}米`);
 for(const key of ['large','half','aux'])assert.equal(o[key],expected[key],text+': '+key);
 assert.equal(E.production(o).netHeight,Number((height-.08).toFixed(4)),text);
 assert.deepEqual(E.productionRow(o).slice(3,6),[width,height,Number((height-.08).toFixed(4))],text);
 assert.deepEqual(E.tsv([o]).split('\t').slice(3,5),[String(width),String(height)],text);
 checked++;return o;
}
// Test both dimension orders, label positions and units; tall/narrow doors
// ensure direction comes from the label rather than sorting the numbers.
for(const [width,height] of [[7.2,2.5],[2.5,7.2]])
for(const [unit,factor] of [['米',1],['m',1],['CM',100],['厘米',100],['公分',100],['mm',1000],['毫米',1000]])
for(const [w,h] of [['宽','高'],['宽度','高度'],['总宽','总高'],['门宽','门高'],['长','高']]){
 const W=width*factor+unit,H=height*factor+unit;
 for(const sep of ['', ' ', '，','×']){
  check(`${w}${W}${sep}${h}${H}`,width,height);
  check(`${h}${H}${sep}${w}${W}`,width,height);
  check(`${W}${w}${sep}${H}${h}`,width,height);
  check(`${H}${h}${sep}${W}${w}`,width,height);
 }
}
for(const op of ['X','x','*','×','✕','＊','\\*',' X ']){
 for(const text of [`2.5高度${op}7.2宽度`,`2.5（高）${op}7.2（宽）`,`(高)2.5${op}(宽)7.2`,`高:2.5${op}宽:7.2`,
  `高${op}宽：2.5${op}7.2`,`2.5${op}7.2（高${op}宽）`,`宽${op}高：7.2${op}2.5`])check(text);
}
for(const text of ['高宽：2.5*7.2','宽高7.2*2.5','(高×宽)250×720cm','250×720cm(高×宽)',
 '2.5米高7.2米宽，净高2.42米，半片实际宽度0.14955米',
 '2.5高 7.2宽，单价100元，数量2套，电话13000000000','7.2米高2.5米','2.5高，7.2','2.5高7.2宽3窗']){
 // Last input intentionally overrides the common two-window fixture.
 if(text.endsWith('3窗')){const o=E.parse(text+'，JF30');assert.deepEqual([o.width,o.height,o.windows],[7.2,2.5,3]);}
 else check(text);
}
// Unlabelled pairs retain the documented width×height default.
const ambiguous=check('2.5×7.2',2.5,7.2);assert.match(ambiguous.parseNotes.join(' '),/未标注方向.*宽×高/);
assert.equal(check('高×长2.5×7.2').length,7.2);
for(const text of ['高2.5宽','高2.5×高7.2','(高×宽)宽2.5×高7.2','高×宽2.5×7.2(宽×高)']){
 const o=E.parse('JF30，'+text);assert.ok(o.multiSize,text);assert.match(o.parseNotes.join(' '),/标注|冲突/);
}
for(const text of ['净高2.42米，半片实际宽度0.14955米','单价105，数量2套，电话13000000000','30公分白色单开3窗']){
 const o=E.parse(text);assert.deepEqual([o.width,o.height],[null,null],text);
}
for(const text of ['三个门，2.5米高，13.4米宽13.1米宽7.2米宽，30公分单开',
 '2.5米高，13.4米宽，13.1米宽，7.2米宽，三个门，30公分单开',
 '高2.5米，宽13.4米宽13.1米宽7.2米，三个门，30公分单开']){
 assert.deepEqual(E.parseMany(text).map(o=>[o.width,o.height]),[[13.4,2.5],[13.1,2.5],[7.2,2.5]],text);
}
for(const text of ['两个门，2.5高7.2宽，JF30单开','两个门，高×宽2.5×7.2，JF30单开'])
 assert.deepEqual(E.parseMany(text).map(o=>[o.width,o.height]),[[7.2,2.5],[7.2,2.5]],text);
console.log(`Dimension-order regression passed: ${checked} cases, quantities, pricing/production exclusions, ambiguous/conflicting labels, shared multi-door orders and WPS row mapping.`);
