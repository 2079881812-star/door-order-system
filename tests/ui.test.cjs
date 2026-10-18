// In-memory DOM test: no browser, user tab, clipboard or files are controlled.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/index.html','utf8'),nodes=new Map(),docEvents={};
let copied='';
class Element{
 constructor(id,attrs=''){this.id=id;this.events={};this.dataset={};this._html='';this._value='';this.type=attrs.match(/type="([^"]*)"/)?.[1]||'';this.classList={toggle(){}};
  for(const m of attrs.matchAll(/data-([a-z]+)="([^"]*)"/g))this.dataset[m[1]]=m[2];
  this.value=attrs.match(/value="([^"]*)"/)?.[1]||'';
  this.checked=/\bchecked\b/.test(attrs);this.hidden=/\bhidden\b/.test(attrs);
 }
 set value(v){this._value=String(v)}get value(){return this._value}
 set innerHTML(v){this._html=String(v);register(this._html)}get innerHTML(){return this._html}
 set textContent(v){this._html=String(v)}get textContent(){return this._html.replace(/<[^>]*>/g,'')}
 addEventListener(type,fn){this.events[type]=fn}
 focus(){}select(){}showModal(){}close(){}
 closest(selector){return selector==='[data-candidate]'&&this.dataset.candidate?this:null}
}
function register(markup){for(const m of markup.matchAll(/<[a-z][a-z0-9]*\b([^>]*\bid="([^"]+)"[^>]*)>/g))nodes.set(m[2],new Element(m[2],m[1]));}
register(html);
const tabs=[...html.matchAll(/<button\b([^>]*data-tab="([^"]+)"[^>]*)>/g)].map(m=>new Element('tab-'+m[2],m[1]));
const document={querySelector:s=>nodes.get(s.slice(1))||null,querySelectorAll:s=>s==='[data-tab]'?tabs:[],addEventListener:(t,f)=>docEvents[t]=f};
const context={document,TextEncoder,console,Blob,setTimeout:()=>0,clearTimeout(){},confirm:()=>true,navigator:{clipboard:{writeText:async text=>{copied=text}}},addEventListener(){}};
context.window=context;vm.createContext(context);
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);scripts.forEach(s=>vm.runInContext(s,context));
const get=id=>{assert.ok(nodes.has(id),'Missing rendered control '+id);return nodes.get(id)};
async function change(id,value){const target=get(id);target.value=value;get('editor').events.change({target});}
(async()=>{
 assert.equal(tabs.length,0);assert.equal(get('splitMode').value,'blank');assert.equal(get('orderSelect').disabled,true);assert.equal(get('mallOrderInput').checked,false);
 assert.equal(get('defaultDeduction').value,'0.08');get('sourceInput').value='JF28白对开两窗，宽4.5高2.745';get('parseBtn').onclick();assert.match(get('productionResult').textContent,/2.665/);assert.match(get('materialInfo').textContent,/半片规格：15公分/);
 assert.equal(get('preview').hidden,false);assert.equal(get('editor').hidden,false);assert.equal(get('orderSelect').disabled,false);
 await change('f_model','JF19');assert.equal(get('f_materialSize').value,'19');assert.match(get('materialInfo').textContent,/半片规格：10公分/);await change('f_materialSize','24');assert.equal(get('f_model').value,'JF24');assert.match(get('materialInfo').textContent,/半片规格：12公分/);
 get('formulaDemoBtn').onclick();assert.match(get('productionResult').textContent,/111.392/);assert.match(get('windowResult').textContent,/1.277/);
 await change('f_claws','20');assert.match(get('productionResult').textContent,/8字\s*16/);assert.match(get('formulaTrace').textContent,/手填覆盖/);
 await change('f_claws','');await change('f_large','15');assert.match(get('productionResult').textContent,/8字\s*17/);
 assert.match(get('cutResult').textContent,/0.2991/);
 await change('f_height','3');assert.match(get('productionResult').textContent,/116.9/);assert.match(get('windowResult').textContent,/1.4045/);
 await get('copyBtn').onclick();assert.equal(copied.split('\r\n')[0].split('\t').length,14);
 assert.ok(!nodes.has('copyLegacyBtn'));
 const oldOrder=context.OrderEngine.parse('JF15白单开两窗，宽4.6高2.92',{date:'2026-09-25',deduction:.08});Object.assign(oldOrder,{cutProfile:'production1',cutPitch:.1535,cutHalfLock:.26,large:29,half:2});
 const draft=JSON.stringify({version:1,appVersion:'1.2',date:'2026-09-25',orders:[oldOrder]});
 await get('dataFile').onchange({target:{files:[{size:draft.length,text:async()=>draft}],value:'mock-file'}});
 assert.equal(get('f_cutPitch').value,'');assert.match(get('cutResult').textContent,/0.148/);assert.match(get('productionResult').textContent,/116.252/);
 assert.match(get('toast').textContent,/最新规则/);
 get('cutDemoBtn').onclick();assert.equal(get('f_large').value,'16');assert.equal(get('f_half').value,'4');assert.ok(!get('editor').innerHTML.includes('id="f_aux'));assert.ok(!get('editor').innerHTML.includes('id="f_errorHint'));assert.match(get('cutResult').textContent,/5.5238/);
 await change('f_width','7');assert.equal(get('f_large').value,'21');
 await change('f_large','19');await change('f_width','5.6');assert.equal(get('f_large').value,'19');assert.match(get('cutMode').textContent,/手工/);
 docEvents.click({target:get('autoPieces')});assert.equal(get('f_large').value,'16');assert.equal(get('f_half').value,'4');
 await change('f_model','JF19');assert.match(get('cutResult').textContent,/0.09225/);await change('f_model','JF12');assert.match(get('cutResult').textContent,/0.048/);
 await change('f_model','JJ30');assert.equal(get('f_large').value,'');assert.match(get('candidateButtons').textContent,/待确认/);
 await change('f_cutHalfPitch','0.14955');assert.equal(get('f_large').value,'16');
 await get('copyBtn').onclick();assert.equal(copied.split('\t')[11],'0');assert.equal(copied.split('\t')[12],'少7.62公分');
 get('sourceInput').value='7.2米，高2.5米，单开白色30公分，老弯轨做锁';get('parseBtn').onclick();assert.equal(get('f_width').value,'7.2');assert.equal(get('f_height').value,'2.5');assert.match(get('productionResult').textContent,/多6.84公分/);
 const oldAuto={...context.OrderEngine.parse('JF30双开 宽5.6高2.8'),large:16,half:3,aux:1,auxWidth:.23,errorHint:'多0.425公分',countMode:'auto'};
 const v15=JSON.stringify({version:1,appVersion:'1.5',date:'2026-09-26',orders:[oldAuto]});
 await get('dataFile').onchange({target:{files:[{size:v15.length,text:async()=>v15}],value:'draft'}});assert.equal(get('f_half').value,'4');await get('copyBtn').onclick();assert.equal(copied.split('\t')[11],'0');assert.equal(copied.split('\t')[12],'少7.62公分');
 get('batchDemoBtn').onclick();assert.match(get('orderCount').textContent,/3/);assert.equal(get('f_width').value,'13.4');assert.equal(get('f_large').value,'44');
 await get('copyBtn').onclick();const rows=copied.split('\r\n').map(r=>r.split('\t'));assert.equal(rows.length,3);assert.equal(rows[1][3],'13.1');assert.equal(rows[2][3],'7.2');assert.deepEqual(rows.map(r=>r[11]),['0','0','0']);assert.equal(rows[2][12],'多6.84公分');
 get('sourceInput').value='13.4米，13.1米，三个门，高2.5米';get('parseBtn').onclick();assert.match(get('toast').textContent,/3个门.*2个宽度/);assert.match(get('orderCount').textContent,/3/);assert.equal(get('f_width').value,'13.4');
 get('sourceInput').value='7.2米，两个门，高2.5米，JF30单开';get('parseBtn').onclick();assert.match(get('orderCount').textContent,/2/);assert.equal(get('f_quantity').value,'1');
 get('dimensionDemoBtn').onclick();assert.match(get('orderCount').textContent,/1/);assert.equal(get('f_width').value,'13.5');assert.equal(get('f_height').value,'3.28');assert.equal(get('f_model').value,'JF19');assert.equal(get('f_windows').value,'3');assert.match(get('editor').textContent,/要锁中/);
 await get('copyBtn').onclick();const dimensionRow=copied.split('\t');assert.equal(dimensionRow[3],'13.5');assert.equal(dimensionRow[4],'3.28');assert.match(dimensionRow[2],/JF19.*三窗.*要锁中/);
 get('sourceInput').value='13.4米，13.1米，7.2米，三个门，250厘米高，单开白色30公分，老弯轨做锁';get('parseBtn').onclick();assert.match(get('orderCount').textContent,/3/);assert.equal(get('f_height').value,'2.5');await get('copyBtn').onclick();assert.deepEqual(copied.split('\r\n').map(r=>r.split('\t').slice(3,5)),[['13.4','2.5'],['13.1','2.5'],['7.2','2.5']]);
 assert.match(get('preview').textContent,/螺丝，克/);
 get('mallOrderInput').checked=true;get('mallOrderInput').onchange();get('batchDemoBtn').onclick();assert.equal(get('preview').hidden,false);assert.equal(get('editor').hidden,false);assert.equal(get('f_mallOrder').checked,true);assert.match(get('orderSelect').textContent,/商城订单/);
 const mallField=get('f_mallOrder');mallField.checked=false;get('editor').events.change({target:mallField});
 let saved;context.download=(data)=>{saved=JSON.parse(data)};get('saveDraft').onclick();assert.equal(saved.mallOrder,true);assert.deepEqual(saved.orders.map(o=>o.mallOrder),[false,true,true]);
 get('mallOrderInput').checked=false;const mallDraft=JSON.stringify(saved);await get('dataFile').onchange({target:{files:[{size:mallDraft.length,text:async()=>mallDraft}],value:'mall-draft'}});assert.equal(get('mallOrderInput').checked,true);assert.equal(get('f_mallOrder').checked,false);assert.equal(get('preview').hidden,false);get('saveDraft').onclick();assert.deepEqual(saved.orders.map(o=>o.mallOrder),[false,true,true]);
 delete saved.mallOrder;for(const o of saved.orders)delete o.mallOrder;const legacyDraft=JSON.stringify(saved);await get('dataFile').onchange({target:{files:[{size:legacyDraft.length,text:async()=>legacyDraft}],value:'legacy-draft'}});assert.equal(get('mallOrderInput').checked,false);assert.equal(get('f_mallOrder').checked,false);get('saveDraft').onclick();assert.ok(saved.orders.every(o=>o.mallOrder===false));
 const plain=context.OrderEngine.parse('JF19单开宽13.5高3.28');const mall=context.OrderEngine.parse('JF19单开宽13.5高3.28',{mallOrder:true});assert.equal(mall.mallOrder,true);assert.deepEqual(context.OrderEngine.productionRow(plain),context.OrderEngine.productionRow(mall));
 get('mallOrderInput').checked=false;get('splitMode').value='blank';get('sourceInput').value='JF30单开\n宽7.2高2.5\n客户：甲\n\nJF19双开\n宽5.6高3\n客户：乙';get('parseBtn').onclick();assert.equal(get('orderCount').textContent,'2 条');assert.equal(get('f_width').value,'7.2');
 get('orderSelect').value='1';get('orderSelect').onchange();assert.equal(get('f_customer').value,'乙');assert.equal(get('f_width').value,'5.6');await change('f_customer','预览同步客户');assert.match(get('preview').textContent,/预览同步客户/);await change('f_width','5.8');await get('copyBtn').onclick();assert.equal(copied.split('\r\n')[1].split('\t')[3],'5.8');
 get('orderSelect').value='0';get('orderSelect').onchange();assert.equal(get('f_customer').value,'甲');assert.equal(get('f_width').value,'7.2');get('saveDraft').onclick();assert.equal(saved.mode,'blank');
 const checkedDraft=JSON.stringify(saved);get('splitMode').value='line';await get('dataFile').onchange({target:{files:[{size:checkedDraft.length,text:async()=>checkedDraft}],value:'blank-draft'}});assert.equal(get('splitMode').value,'blank');assert.match(get('preview').textContent,/预览同步客户/);
 get('editor').events.click({target:{id:'deleteOrder'}});assert.equal(get('orderCount').textContent,'1 条');get('editor').events.click({target:{id:'deleteOrder'}});assert.equal(get('orderCount').textContent,'0 条');assert.equal(get('orderSelect').disabled,true);assert.equal(get('copyBtn').disabled,true);assert.match(get('editor').textContent,/等待识别订单/);
 get('sourceInput').value='JF30白色单开两窗，宽5.6高2.8';get('parseBtn').onclick();await change('f_opening','左右单开');assert.equal(get('f_large').value,'17');assert.equal(get('f_half').value,'2');assert.match(get('cutResult').textContent,/0.16/);assert.match(get('preview').textContent,/左右单开/);assert.match(get('preview').textContent,/少5.62公分/);await get('copyBtn').onclick();assert.equal(copied.split('\t')[12],'少5.62公分');
 get('sourceInput').value='JF30白色左，右单拉两窗，宽5.6高2.8';get('parseBtn').onclick();assert.match(get('preview').textContent,/左右单开/);get('saveDraft').onclick();assert.equal(saved.appVersion,'1.9');assert.equal(saved.orders[0].opening,'左右单开');const lrDraft=JSON.stringify(saved);await get('dataFile').onchange({target:{files:[{size:lrDraft.length,text:async()=>lrDraft}],value:'lr-draft'}});assert.match(get('preview').textContent,/少5.62公分/);
 get('sourceInput').value='日期：2026-09-26，JF30单开 宽5.6高2.8，目的地：泉州市，客户：泉州市示例客户甲\n\n日期：2026-09-26，JF30单开 宽7.2高2.8，目的地：泉州市，客户：泉州市示例客户甲';get('parseBtn').onclick();assert.equal((get('preview').innerHTML.match(/rowspan="2"/g)||[]).length,2);
 let rich;context.ClipboardItem=class {constructor(data){this.data=data}};context.navigator.clipboard.write=async items=>{rich=items[0].data};await get('copyBtn').onclick();assert.equal(((await rich['text/html'].text()).match(/rowspan="2"/g)||[]).length,2);assert.equal((await rich['text/plain'].text()).split('\r\n').length,2);
 context.navigator.clipboard.write=async()=>{throw Error('HTML clipboard unsupported')};await get('copyBtn').onclick();assert.equal(copied.split('\r\n')[1].split('\t')[1],'泉州市示例客户甲');assert.match(get('toast').textContent,/导出 .xlsx/);
 get('orderSelect').value='1';get('orderSelect').onchange();await change('f_customer','另一个客户');assert.equal((get('preview').innerHTML.match(/rowspan="2"/g)||[]).length,1);await change('f_date','2026-09-27');assert.ok(!get('preview').innerHTML.includes('rowspan='));
 get('sourceInput').value='JF30白色单开两窗，2.5米高7.2米宽\n\nJF30白色单开两窗，高×宽：2.5×7.2\n\nJF30白色单开两窗，250厘米（高）X720厘米（宽）';get('parseBtn').onclick();assert.equal(get('orderCount').textContent,'3 条');assert.equal(get('f_width').value,'7.2');assert.equal(get('f_height').value,'2.5');assert.equal(get('f_large').value,'23');assert.match(get('preview').textContent,/多6.84公分/);await get('copyBtn').onclick();assert.deepEqual(copied.split('\r\n').map(r=>r.split('\t').slice(3,6)),[['7.2','2.5','2.42'],['7.2','2.5','2.42'],['7.2','2.5','2.42']]);
 get('saveDraft').onclick();const directionDraft=JSON.stringify(saved);await get('dataFile').onchange({target:{files:[{size:directionDraft.length,text:async()=>directionDraft}],value:'direction-draft'}});assert.equal(get('f_width').value,'7.2');assert.equal(get('f_height').value,'2.5');
 console.log('In-memory UI integration passed: reversed dimension parsing, copy and draft persistence; merged preview, rich/plain copy and live unmerge, left/right opening, order selection and mall flags.');
})().catch(e=>{console.error(e);process.exitCode=1});
