function deductionOptions(value){
 const choices=[{value:null,label:'未选择（净高留空）'},...E.rules.deductions.map(x=>({value:x.value,label:`扣 ${fmt(x.value*100,3)} 公分 · 今年表 ${x.count} 处`}))];
 if(value!==null&&value!==''&&!choices.some(x=>x.value===Number(value)))choices.push({value:Number(value),label:`扣 ${fmt(value*100,3)} 公分 · 自定义`});
 return choices.map(x=>`<option value="${x.value??''}" ${(x.value??'')===(value??'')?'selected':''}>${h(x.label)}</option>`).join('');
}
function productionEditor(){
 const o=orders[selected];
 return `<div class="formula-panel"><div class="group-title">生产计算 · 2026 排单23</div>
 <div class="fields"><div class="field"><label for="f_deduction">净高扣减方案</label><select id="f_deduction" data-field="deduction" data-number="1">${deductionOptions(o.deduction)}</select></div>${field('large','大片（选定片数）','number')}${field('half','半片数量（片）','number')}</div>
 <div class="calc" id="productionResult"></div><div id="formulaTrace" class="formula-trace" aria-live="polite"></div>
 <div class="formula-source">按今年后段公式：8字直接合计大片、半片、辅，手填爪子不改变8字。辅固定为0；至少填写大片或半片一项后计算，其余空白按0。</div>
 <details id="cutDetails" open><summary>自动选片 · 实际片宽与成品误差</summary>
 <div class="fields">${field('cutPitch','大片实际宽覆盖（米，留空用表值）','number','wide')}${field('cutHalfPitch','半片实际宽覆盖（米，留空用默认）','number','wide')}</div>
 <div id="cutMode" class="help stack"></div><div class="formula-source" id="cutSource"></div><div class="calc" id="cutResult"></div><div class="source stack" id="cutBreakdown"></div><div id="candidateButtons" class="candidate-actions"></div>
 <div class="actions stack"><button id="autoPieces" class="primary">重新自动选片</button><button id="resetPitch">恢复默认实际片宽</button></div>
 <p class="help">先预留单开2半片 / 双开4半片 / 左右单开2半片和修正宽度，比较向下/向上两种大片数量，取误差绝对值较小的方案；相同则取较少大片。保留默认半片，辅片固定0；成品宽减目标宽为正显示“多”，为负显示“少”。手改大片或半片后保留手工方案，点击“重新自动选片”可恢复联动。</p>
 <p class="help">JF28/JF30半片0.14955米；JF19半片0.09225米；JF12/JF10半片0.048米。JJ半片实际宽待确认，可在上方补填。单片规格名不直接作为实际宽计算。</p>
 <div class="source">成品宽度＝大片总宽＋半片总宽＋修正。单开修正0.09米，双开修正0.14米，左右单开修正0.16米。旧表“半片锁柱”合计值不重复加入。辅列统一填写0，无需输入。</div></details>
 <details id="windowDetails" open><summary>横条 / 大板下料试算（1至4窗）</summary><div id="windowResult" class="calc"></div><div id="windowFormula" class="formula-source"></div><p class="help">基准使用本单净高，窗数使用上方“窗数”。来源：排单23!O2317:X2318。复合窗型如3+2窗，需先人工确认适用尺寸。</p></details>
 <details><summary>螺丝系数 / 手填覆盖</summary><div class="fields">${field('screwCoefficient','螺丝系数：当前2.4，年初2.1','number')}${field('screwGrams','螺丝克重手填（留空自动）','number')}${field('netHeight','净高手填（留空自动）','number')}${field('claws','爪子手填（留空自动）','number')}${field('eights','8字手填（留空自动）','number')}</div><p class="help">螺丝按一套门的宽、高计算。多套订单另按套数配料；N列保持单套克重。2.4来自今年5月17日起的公式，2.1用于复核年初记录。</p><button id="resetProduction" class="stack">清除手填覆盖，恢复公式</button></details>
 <details><summary>今年公式与核查结果</summary><p class="help">已展开排单23的 ${E.rules.formulaCount.toLocaleString()} 个公式，8,716个复算一致。N1153的原始宽度为4..45，导致原表#VALUE!；N2150引用下一行，需核对。程序使用本单有效尺寸，不沿用这些异常引用。</p><p class="help">默认扣高8公分，特殊订单可选择其他扣高。大片、半片可自动选配并手改，辅固定0。30公分单片宽现为0.2991米，15公分为0.148米；各项参数都以今年文件为准。</p></details></div>`;
}
function syncProfileFields(){const o=orders[selected];for(const k of ['large','half','cutPitch','cutHalfPitch'])if($('#f_'+k))$('#f_'+k).value=o[k]??'';}
function productionSummary(){
 if(!$('#productionResult'))return;
 const o=orders[selected],p=E.production(o),c=E.cutting(o),w=E.windowParts(o);
 $('#productionResult').innerHTML=`<span>净高 <b>${fmt(p.netHeight,6)} m</b></span><span>爪子 <b>${fmt(p.claws,0)}</b></span><span>8字 <b>${fmt(p.eights,2)}</b></span><span>螺丝 <b>${fmt(p.screwGrams,4)} 克/套</b></span><span>误差 <b>${h(p.errorHint||'—')}</b></span>`;
 $('#formulaTrace').innerHTML=E.formulaTrace(o).map(r=>`<div class="trace-item"><div class="trace-title"><b>${h(r.label)}</b><span class="badge ${r.status==='自动计算'?'ok':''}">${h(r.status)}</span></div><div class="trace-rule">${h(r.rule)}</div><div class="trace-detail">${h(r.detail)}</div><div class="trace-source">来源：${h(r.source)}</div></div>`).join('');
 $('#cutMode').textContent=o.countMode==='auto'?'当前：自动选片，修改宽度、型号、开启方式或实际片宽后重新计算。':'当前：手工选片，已保留你填写的大片、半片数量。';
 $('#cutSource').textContent='参数来源：'+c.source;
 $('#cutResult').innerHTML=`<span>大片实宽 <b>${fmt(c.pitch,6)} m</b></span><span>半片实宽 <b>${fmt(c.halfPitch,6)} m</b></span><span>开启修正 <b>${fmt(c.correction,2)} m</b></span><span>成品宽度 <b>${fmt(c.actual,6)} m</b></span><span>误差 <b>${c.error===null?'—':fmt(c.error*100,4)} cm</b></span>`;
 $('#cutBreakdown').textContent=c.actual===null?c.waiting||'请补齐大片、半片数量及实际片宽。':`${o.large??0}大片 × ${c.pitch??0} + ${o.half??0}半片 × ${c.halfPitch??0} + ${c.correction} = ${c.actual}米。误差${c.hint}。`;
 const proposal=c.suggestion;
 $('#candidateButtons').innerHTML=proposal?`<p class="help">${c.candidates.map(x=>`${x.n}大片：${x.hint}`).join('；')}。自动建议：${proposal.large}大片、${proposal.half}半片；辅固定0。</p>`:`<p class="help">${h(c.waiting)}</p>`;
 $('#windowResult').innerHTML=`<span>当前窗数 <b>${fmt(w.windows,0)}</b></span><span>横条尺寸 <b>${fmt(w.rail,6)} m</b></span><span>大板尺寸 <b>${fmt(w.panel,6)} m</b></span>`;
 $('#windowFormula').textContent=w.rail!==null&&w.panel!==null?`横条＝（${w.net}－${w.railDeduction}）÷${w.windows}；大板＝（${w.net}－${w.panelDeduction}）÷${w.windows}。`:!w.net?'请先选择扣高方案或填写有效净高。':![1,2,3,4].includes(w.windows)?'请填写1至4窗，其他窗型暂留空。':'净高不足扣减，请核对。';
}
document.addEventListener('click',e=>{
 if(['autoPieces','resetPitch'].includes(e.target.id)&&orders.length){
  const o=orders[selected];if(e.target.id==='resetPitch'){o.cutPitch=null;o.cutHalfPitch=null;}
  E.applyAuto(o,e.target.id==='autoPieces');o.reviewed=false;$('#reviewed').checked=false;dirty=true;syncProfileFields();calcPanel();updateOrderControls();
  toast(o.countMode==='auto'?'已按当前尺寸重新选片，请核对成品宽度误差。':'已恢复默认片宽，手工片数保持。');
 }
 if(e.target.id==='resetProduction'){
  const o=orders[selected];for(const k of ['netHeight','claws','eights','screwGrams']){o[k]=null;$('#f_'+k).value='';}
  o.errorHint='';o.reviewed=false;$('#reviewed').checked=false;dirty=true;calcPanel();updateOrderControls();
 }
});
