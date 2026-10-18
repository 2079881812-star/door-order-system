(function(root){
'use strict';
const RULES=root.OrderRules;
const USER=RULES.userRules;
const examples=[
'总高2.745，总宽4.50，30公分黑，单开，两窗，直，做锁，示例市测试区示例路 测试甲13000000000，包邮',
'单开 白色24公分三窗新弯轨做锁，5.2*3.16=16.432*105=1725.36示例门业，自提',
'单开白色15公分两窗直轨做锁，4.6*2.92米高，晋江测试乙'
];
const pHeaders=['日期','目的地','规格型号','宽度','高度','净高','爪子','8字','客户','大片','半片','辅','误差提示','螺丝，克'];
const dHeaders=['排单日期','客户/收货人','目的地','联系电话','详细地址','规格型号','宽度(m)','高度(m)','长度(m)','材料规格(cm)','颜色','开启方式','窗数','轨道','锁具','数量(套)','单套面积(㎡)','总面积(㎡)','单价(元)','计价方式','计算金额(元)','原文总价(元)','差额(元)','运输方式','客户分类','材料用量','用量单位','备注','核对提示','原始订单'];
const cHeaders=['订单序号','客户','型号','宽度(m)','高度(m)','扣高(m)','净高(m)','选片模式','开启修正(m)','单片宽度(m)','大片净宽(m)','大约片数','大片数量','大片实宽(m)','实际宽度(m)','有符号误差(m)','有符号误差(cm)','窗数','横条扣减(m)','横条尺寸(m)','大板扣减(m)','大板尺寸(m)','螺丝系数','参数来源','半片实际宽(m)','半片数量','半片总宽(m)','默认半片数','建议大片数','建议半片数','较少大片数','较少方案误差(m)','较多大片数','较多方案误差(m)'];
const num=v=>v===''||v===null||v===undefined?null:Number(v);
const rnd=(v,n=4)=>Number(Number(v).toFixed(n));
function productRounded(values,places){
 if(values.some(v=>!Number.isFinite(v)))return null;
 let product=1n,scale=0;
 for(const value of values){let [mantissa,exp='0']=String(value).toLowerCase().split('e');const fraction=(mantissa.split('.')[1]||'').length;product*=BigInt(mantissa.replace('.',''));scale+=fraction-Number(exp);}
 const shift=scale-places;let result;
 if(shift>0){const divisor=10n**BigInt(shift),sign=product<0n?-1n:1n,absolute=product*sign;result=sign*((absolute+divisor/2n)/divisor)}else result=product*(10n**BigInt(-shift));
 const value=Number(result)/(10**places);return Number.isFinite(value)?value:null;
}
const cn={'零':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
function count(v){
 if(/^-?\d+(?:\.\d+)?$/.test(v))return Number(v);
 const digits={...cn,'〇':0},units={'十':10,'百':100,'千':1000,'万':10000};
 if(!/^[零〇一二两三四五六七八九十百千万]+$/.test(v))return null;
 if(!/[十百千万]/.test(v))return Number([...v].map(c=>digits[c]).join(''));
 let total=0,section=0,n=0;
 for(const c of v){if(c in units){const u=units[c];if(u===10000){total+=(section+n||1)*u;section=0;}else section+=(n||1)*u;n=0;}else n=digits[c];}
 return total+section+n;
}
function normalize(s){return s.normalize('NFKC').replace(/\\\*/g,'*').replace(/[×✕＊]/g,'*').replace(/(?<=[\d高宽长度米mM厘分毫)])\s*[xX]\s*(?=(?:(?:总[高宽长]|[高宽长]度|门[高宽长]|[高宽长])\s*(?:为|是|[:=])?\s*|\(\s*(?:总[高宽长]|[高宽长]度|门[高宽长]|[高宽长])\s*\)\s*)?-?\d)/g,'*').replace(/，/g,',').replace(/：/g,':').replace(/；/g,';').replace(/\r/g,'')}
function splitOrders(raw,mode='auto'){
 const t=raw.trim(); if(!t)return [];
 if(mode==='line')return t.split(/\n+/).map(x=>x.trim()).filter(Boolean);
 if(mode==='blank')return t.split(/\n\s*\n+/).map(x=>x.trim()).filter(Boolean);
 if(/[①②③④⑤⑥⑦⑧⑨⑩]/.test(t))return t.split(/[①②③④⑤⑥⑦⑧⑨⑩]/).map(x=>x.trim()).filter(Boolean);
 if(/(?:^|\n)\s*\d+[、.)）]\s*\D/.test(t))return t.split(/(?:^|\n)\s*\d+[、.)）]\s*(?=\D)/).map(x=>x.trim()).filter(Boolean);
 return t.split(/\n\s*\n+/).map(x=>x.trim()).filter(Boolean);
}
function unitValue(v,u,fallback='m'){return Number(v)/(/毫米|mm/i.test(u||fallback)?1000:/厘米|公分|cm/i.test(u||fallback)?100:1)}
function normalizeOpening(v){return String(v||'').trim().replace(/左\s*[、,，]?\s*右\s*单[拉开]/g,'左右单开').replace(/单拉/g,'单开').replace(/双拉|对开/g,'双开')}
function normalizeModel(v){
 const s=String(v||'').trim().toUpperCase(),m=s.match(/^(JF|JJ)?\s*(\d+(?:\.\d+)?)?\s*(?:公分|厘米|CM)?$/);
 return m?(m[1]||USER.defaultFamily)+(m[2]?Number(m[2]):''):s;
}
function materialInfo(o){
 const m=normalizeModel(o.model).match(/^(JF|JJ)(\d+(?:\.\d+)?)?$/),family=m?.[1]||null;
 const largeWidthCm=m&&Number(m[2])>0?Number(m[2]):null;
 const halfWidthCm=family==='JF'&&largeWidthCm!==null?(USER.jfHalfWidthsCm[String(largeWidthCm)]??largeWidthCm/2):null;
 return {family,kind:USER.families[family]||'未识别型号',largeWidthCm,halfWidthCm};
}
function materialDescription(o){const m=materialInfo(o);return `${m.kind}${m.family?'（'+m.family+'）':''}；大片规格：${m.largeWidthCm??'待填'}公分；半片规格：${m.halfWidthCm===null?'待确认':m.halfWidthCm+'公分'}`;}
function desc(o){return [normalizeModel(o.model), o.color.replace(/色$/,''),normalizeOpening(o.opening),o.windows!==null&&o.windows!==''?`${['零','一','两','三','四','五','六'][o.windows]||o.windows}窗`:'',o.track==='直轨'?'直':o.track,o.lock].filter(Boolean).join('')}

const dimensionNumber='-?\\d+(?:\\.\\d+)?';
const dimensionUnit='毫米|厘米|公分|mm|cm|米|m';
const dimensionLabel='总宽|宽度|门宽|宽|总高|高度|门高|高|总长|长度|门长|长';
const dimensionCounters=/^\s*(?:窗|片|套|樘|扇|个|元|块|公斤|千克|kg|克|g|号|楼|年|月|日|平方|㎡)/i;
function dimensionAxis(label){return /高/.test(label)?'height':/宽/.test(label)?'width':'length';}
function readDimensions(s){
 const quantities=[],notes=[],consumed=[];
 // A nearby “高×宽” / “宽高” declaration describes the numeric pair,
 // not just the number closest to its last label. Mask it without moving offsets.
 const directions=[];
 const orderPattern=new RegExp(`(?<![净扣减片柱条际])(${dimensionLabel})\\s*(?:[xX*]\\s*)?(${dimensionLabel})`,'g');
 s=s.replace(orderPattern,(text,first,second,index)=>{
  directions.push({start:index,end:index+text.length,axes:[dimensionAxis(first),dimensionAxis(second)]});
  return ' '.repeat(text.length);
 });
 const re=new RegExp(`(?<![A-Za-z\\d.])(${dimensionNumber})(?![\\d.])\\s*(${dimensionUnit})?`,'gi');
 const pre=new RegExp(`(?<![净扣减片柱条际])(?:(${dimensionLabel})|\\(\\s*(${dimensionLabel})\\s*\\))\\s*(?:为|是|[:=])?\\s*$`);
 const post=new RegExp(`^\\s*(?:(${dimensionLabel})|\\(\\s*(${dimensionLabel})\\s*\\))`);
 for(const m of s.matchAll(re)){
  const start=m.index,end=m.index+m[0].length,before=s.slice(0,start),after=s.slice(end);
  if(dimensionCounters.test(after))continue;
  if(/(?:净高|扣高|扣减高度|高度扣减|半片(?:实际)?(?:宽度?|尺寸)?|大片(?:实际)?(?:宽度?|尺寸)?|单片宽度?|辅片(?:宽度?|尺寸)?|单价|总价|金额|数量|用量|电话|手机|编号)\s*[:=]?\s*$/.test(before))continue;
  const p=before.match(pre),q=after.match(post);
  quantities.push({rawValue:Number(m[1]),unit:m[2]||'',value:unitValue(m[1],m[2]),numberStart:start,coreEnd:end,
   prefix:p?{label:p[1]||p[2],start:p.index,end:start}:null,
   suffix:q?{label:q[1]||q[2],start:end,end:end+q[0].length}:null});
 }
 const result={width:null,height:null,length:null,pairs:[],notes,consumed,tokens:quantities,multiSize:false};
 // A label between two adjacent numbers could belong to either one.
 // Resolve the whole run: 高2.5宽7.2 uses prefixes; 2.5高7.2宽 uses
 // suffixes. With neither end labelled, preserve “7.2米高2.5米”.
 const sharedLabel=(a,b)=>a.suffix&&b.prefix&&a.suffix.label===b.prefix.label&&a.suffix.start<=b.prefix.start&&a.suffix.end<=b.prefix.end&&/^\s*(?:为|是|[:=])?\s*$/.test(s.slice(a.suffix.end,b.prefix.end));
 for(let first=0;first<quantities.length;first++){
  let last=first;
  while(last+1<quantities.length&&sharedLabel(quantities[last],quantities[last+1]))last++;
  if(last>first){
   const postfix=!quantities[first].prefix&&!!quantities[last].suffix;
   for(let i=first;i<last;i++)if(postfix)quantities[i+1].prefix=null;else quantities[i].suffix=null;
   first=last;
  }
 }
 for(const t of quantities){
  const p=t.prefix,q=t.suffix;
  if(p&&q&&dimensionAxis(p.label)!==dimensionAxis(q.label)){
   notes.push('同一尺寸前后的高/宽/长标注不同，请核对');result.multiSize=true;
  }
  t.label=p?.label||q?.label||'';t.axis=t.label?dimensionAxis(t.label):null;
  t.start=p?p.start:t.numberStart;t.end=q?q.end:t.coreEnd;t.postStart=q?q.start:null;
 }
 const assign=(axis,value)=>{if(result[axis]===null)result[axis]=value;else if(Math.abs(result[axis]-value)>1e-8)notes.push(`存在不同的${axis==='height'?'高度':axis==='width'?'宽度':'长度'}，请核对或拆单`);};
 const remember=t=>{if(!consumed.some(x=>x.start===t.start&&x.end===t.end))consumed.push({start:t.start,end:t.end});};
 for(const t of quantities)if(t.axis){assign(t.axis,t.value);remember(t);}
 for(let i=0;i<quantities.length-1;i++){
  const a=quantities[i],b=quantities[i+1];
  if(!/^[*xX]$/.test(s.slice(a.end,b.start).trim()))continue;
  // Area × unit price after '=' is part of pricing, not another door.
  if(s.slice(0,a.start).trim().endsWith('='))continue;
  const cues=directions.filter(d=>(d.end<=a.start&&/^[\s:=(\[)\]]*$/.test(s.slice(d.end,a.start)))||(d.start>=b.end&&/^[\s:=(\[)\]]*$/.test(s.slice(b.end,d.start))));
  const horizontal=axis=>axis==='length'?'width':axis;
  const declared=cues[0]?.axes;
  if(cues.some(c=>c.axes.some((axis,j)=>horizontal(axis)!==horizontal(declared[j])))||
     declared&&[a,b].some((t,j)=>t.axis&&horizontal(t.axis)!==horizontal(declared[j]))){
   notes.push('尺寸顺序说明与高/宽/长标注冲突，请核对');result.multiSize=true;
  }
  let ax=a.axis||declared?.[0],bx=b.axis||declared?.[1];
  if(ax==='length')ax='width';if(bx==='length')bx='width';
  if(ax&&bx&&ax===bx){notes.push('乘号两侧的尺寸方向相同，请核对高/宽标注');result.multiSize=true;continue;}
  if(!ax&&!bx){ax='width';bx='height';}
  else if(!ax)ax=bx==='height'?'width':'height';
  else if(!bx)bx=ax==='height'?'width':'height';
  // Unlabelled A×B shares a single written unit; labelled measurements
  // without a unit use metres. Explicit units always apply independently.
  const shared=!a.axis&&!b.axis?(a.unit||b.unit||'m'):'m';
  const av=unitValue(a.rawValue,a.unit||shared),bv=unitValue(b.rawValue,b.unit||shared);
  assign(ax,av);assign(bx,bv);remember(a);remember(b);
  if(!a.axis&&declared?.[0]==='length')assign('length',av);
  if(!b.axis&&declared?.[1]==='length')assign('length',bv);
  result.pairs.push({a,b,width:ax==='width'?av:bv,height:ax==='height'?av:bv});
  notes.push(a.axis||b.axis||declared?'尺寸按高/宽/长标注识别，请核对':'尺寸未标注方向，暂按宽×高解析；如为高×宽，请补上高、宽后重新识别');
  if(/^\s*\*/.test(s.slice(b.end)))result.multiSize=true;
  i++;
 }
 if(result.pairs.length>1)result.multiSize=true;
 // Door length paired with a stated height is its horizontal width.
 if(result.width===null&&result.height!==null&&result.length!==null)result.width=result.length;
 if(result.multiSize)notes.push('尺寸标注冲突或存在多组/三维尺寸，请核对并按需拆单');
 result.heightTokens=quantities.filter(t=>t.axis==='height');
 result.widthTokens=quantities.filter(t=>t.axis==='width'||(t.axis==='length'&&result.height!==null));
 return result;
}

function inferredWidth(s,excluded=[]){
 // Only standalone dimension tokens are eligible. Labels, prices, contacts,
 // dates and material specifications must not be reused as door width.
 const re=/(?:^|[,;\s])(\-?\d+(?:\.\d+)?)(?![\d.])\s*(毫米|厘米|公分|mm|cm|米|m)?(?=$|[,;\s。.!！？]|高|左|单开|双开|对开|单拉|双拉|黑|白)/gi;
 const found=[];let m;
 while((m=re.exec(s))){
  const offset=m.index+m[0].indexOf(m[1]);if(excluded.some(x=>offset>=x.start&&offset<x.end))continue;const before=s.slice(0,offset),segment=before.split(/[,;\n]/).pop();
  if(/(?:宽|高|长|净高|扣高|扣减|尺寸|片宽|规格|型号|半片|大片|辅片|材料用量|用量|数量|单价|总价|金额|合计|螺丝|爪子|8字|八字|每米|每平(?:方米|方)?|每套)\s*[:=]?\s*$/i.test(before))continue;
  if(/(?:地址|电话|手机|客户|收货人|联系人|订单号|编号|日期)\s*[:：]?[^,;]*$/.test(segment))continue;
  if(/^\d{7,}$/.test(m[1])||/^\s*(?:元|块|套|樘|片|窗|公斤|kg|克|g|号|楼|日|年|月|[*=/])/i.test(s.slice(m.index+m[0].length)))continue;
  if(/厘米|公分|cm/i.test(m[2]||'')&&Number(m[1])<=60)continue;
  found.push({value:unitValue(m[1],m[2]),rawValue:Number(m[1]),unit:m[2]||'',index:offset,end:m.index+m[0].length});
 }
 return found;
}

function parse(text,options={}){
 let s=normalize(text);const date=options.date||new Date().toLocaleDateString('sv-SE');const notes=[];
 const o={id:Math.random().toString(36).slice(2,10),raw:text.trim(),date,customer:'',destination:'',phone:'',address:'',model:'',materialSize:null,color:'',opening:'',windows:null,track:'',lock:'',width:null,height:null,length:null,quantity:1,unitPrice:null,basis:'',quotedTotal:null,statedArea:null,shipping:'',category:'',usage:null,usageUnit:'',remarks:'',netHeight:null,claws:null,eights:null,large:null,half:null,aux:0,errorHint:'',deduction:num(options.deduction),cutProfile:'',cutHalfLock:null,cutPitch:null,cutHalfPitch:null,auxWidth:null,countMode:'auto',batchCount:null,batchIndex:null,refBase:null,refSegments:null,parseNotes:[],reviewed:false};
 o.mallOrder=options.mallOrder===true;
 let m;
 if((m=s.match(/(?:日期|排单日期)\s*:?\s*(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/)))o.date=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
 else notes.push('日期使用本页排单日期');
 const phone=s.match(/(?<!\d)(?:\+?86[- ]?)?(1[3-9]\d{9})(?!\d)/);if(phone)o.phone=phone[1];
 const unit='(毫米|厘米|公分|mm|cm|米|m)?';
 const dims=readDimensions(s);
 o.width=dims.width;o.height=dims.height;o.length=dims.length;
 notes.push(...dims.notes);if(dims.multiSize)o.multiSize=true;
 let inferredIndex=-1;
 if(o.width===null&&!dims.pairs.length){const candidates=inferredWidth(s,dims.consumed);if(candidates.length){o.width=candidates[0].value;inferredIndex=candidates[0].index;notes.push('未标注用途的尺寸默认按宽度识别，请核对');if(candidates.length>1)notes.push('有多个未标注尺寸，宽度采用第一个，其余请补充用途');}}
 const explicitModel=s.match(/\b(JF|JJ)(?:\s*(\d+(?:\.\d+)?))?/i);
 const enlarged=/加大(?:型|折叠门|门)|(?:^|[,;\s])加大(?=[,;\s\d]|$)/.test(s);
 const namedNominal=s.match(/大片(?:宽度?|规格)?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:公分|厘米|cm)/i);
 let nominal=explicitModel?.[2]??namedNominal?.[1]??null;
 if(nominal===null){
  const candidates=[...s.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)\s*(?:公分|厘米|cm)/gi)];
  const candidate=candidates.find(q=>q.index!==inferredIndex&&!dims.consumed.some(x=>q.index>=x.start&&q.index<x.end)&&!/(?:总[宽高长]|门[宽高]|[宽高长]度|扣高|高度扣减|半片(?:规格|宽度?)?|单片宽度?|辅|补条|加宽|加高|高|宽|长|加)\s*[:=]?\s*$/.test(s.slice(0,q.index)));
  if(candidate)nominal=candidate[1];
 }
 o.model=normalizeModel((explicitModel?.[1]||(enlarged?'JJ':USER.defaultFamily))+(nominal??''));
 o.materialSize=materialInfo(o).largeWidthCm;
 if(options.deduction===undefined)o.deduction=USER.defaultDeduction;
 if((m=s.match(/深灰色?|浅灰色?|磨砂黑色?|磨砂白色?|黑色|白色|灰色|香槟色|咖啡色|木纹|黑|白/)))o.color=m[0].replace(/^(黑|白|深灰|浅灰|灰)$/,'$1色');
 if((m=s.match(/左\s*[、,，]?\s*右\s*单[拉开]|不对称(?:对开|双开|双拉)|偏(?:对开|双开|双拉)|双开|对开|单开|单拉|双拉/)))o.opening=normalizeOpening(m[0]);
 if((m=s.match(/([零一二两三四五六七八九十\d]+)\s*窗/)))o.windows=count(m[1]);
 if((m=s.match(/新弯轨|老弯轨|大弯轨|小弯轨|弯轨|直轨|(?:^|[,\s])直(?=[,\s]|$)|(?:窗)直/)))o.track=m[0].includes('直')?'直轨':m[0];
 if(/不做锁|不带锁|不要锁|不需要锁|无锁/.test(s))o.lock='不做锁';else if((m=s.match(/要锁中|要锁|做锁|装锁|带锁|配锁/)))o.lock=m[0];
 if((m=s.match(/数量\s*:?\s*([零一二两三四五六七八九十\d]+)\s*(?:套|樘|扇)?/))||(m=s.match(/(?<![\d.])([一二两三四五六七八九十\d]+)\s*(?:套|樘)/)))o.quantity=count(m[1]);else notes.push('未写数量，暂按1套');
 const chain=s.match(/(-?\d+(?:\.\d+)?)\s*\*\s*(-?\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/);
 if(chain){o.statedArea=Number(chain[3]);o.unitPrice=Number(chain[4]);o.quotedTotal=Number(chain[5]);o.basis='平方米';}
 if((m=s.match(/(?:单价|每平方(?:米)?|每平米|每平|每套|每米)\s*:?\s*(-?\d+(?:\.\d+)?)/))){o.unitPrice=Number(m[1]);if(/每套/.test(m[0]))o.basis='套';else if(/每米/.test(m[0]))o.basis='米';else if(/每平/.test(m[0]))o.basis='平方米';}
 if((m=s.match(/(-?\d+(?:\.\d+)?)\s*元\s*[/／每]\s*(平方米|平方|平米|㎡|套|米)/))){o.unitPrice=Number(m[1]);o.basis=/平方|平米|㎡/.test(m[2])?'平方米':m[2];}
 if((m=s.match(/(?:总价|总金额|合计金额|金额)\s*:?\s*(-?\d+(?:\.\d+)?)/)))o.quotedTotal=Number(m[1]);
 if((m=s.match(/自提|包邮|到付|送货上门|送货|货运|物流/)))o.shipping=m[0];
 if((m=s.match(/(?:客户分类|客户类别)\s*:?\s*([^,;\n]+)/)))o.category=m[1].trim();
 if((m=s.match(/(?:材料用量|用量)\s*:?\s*(-?\d+(?:\.\d+)?)\s*(千克|公斤|kg|KG|米|m|片|根|个|支)?/))){o.usage=Number(m[1]);o.usageUnit=m[2]||'';}
 const named=(label)=>{const q=s.match(new RegExp(`(?:${label})\\s*:\\s*([^,;\\n]+)`));return q?q[1].trim():''};
 o.customer=named('客户|收货人|联系人');o.address=named('收货地址|地址');o.destination=named('目的地');o.remarks=named('备注');
 // Production numbers are accepted only when explicitly labeled in the input.
 for(const [key,label] of [['netHeight','净高'],['claws','爪子'],['eights','8字|八字'],['large','大片'],['half','半片']]){
  const q=s.match(new RegExp(`(?:${label})\\s*:?\\s*(-?\\d+(?:\\.\\d+)?)${key==='netHeight'?'\\s*'+unit:'(?![\\d.])(?!\\s*(?:公分|厘米|毫米|cm|mm|米|m))'}`,'i'));
  if(q)o[key]=key==='netHeight'?unitValue(q[1],q[2]):Number(q[1]);
 }
 o.errorHint='';
 if((m=s.match(/(?:扣高|扣减高度|高度扣减)\s*:?\s*(\d+(?:\.\d+)?)\s*(毫米|厘米|公分|mm|cm|米|m)/i)))o.deduction=unitValue(m[1],m[2]);
 if(!o.customer&&phone){
  const left=s.slice(0,phone.index).trim();const q=left.match(/(?:^|[,\s])([\u4e00-\u9fff]{2,5})$/);
  if(q)o.customer=q[1];else notes.push('手机号旁的姓名未确定，请补填');
  if(!o.address){const addr=left.replace(new RegExp(o.customer+'$'),'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean).pop()||'';if(/[省市县区镇村路街号巷埕]/.test(addr))o.address=addr;}
 }
 if(!o.customer){
  let tail=s.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean).filter(x=>! /^(自提|包邮|到付|送货)$/.test(x)).pop()||'';
  tail=tail.replace(/^.*[=]\s*-?\d+(?:\.\d+)?\s*/,'').replace(/(?:自提|包邮|到付)$/,'').trim();
  if(tail&&!/\d|公分|单开|单拉|双开|双拉|对开|两窗|三窗|轨|做锁|数量|单价/.test(tail)&&tail.length<=30){o.customer=tail;notes.push('客户名称从订单末尾提取，请核对');}
 }
 if(!o.destination){const q=(o.address||o.customer).match(/^((?:[\u4e00-\u9fff]{2,6}省)?[\u4e00-\u9fff]{2,5}市)/);if(q)o.destination=q[1];else if(/^晋江/.test(o.customer)){o.destination='晋江';o.customer=o.customer.replace(/^晋江\s*/,'');}}
 if(/\d\s*[+＋]\s*\d\s*窗/.test(s)){o.windows=null;notes.push('复合窗数须人工确认，横条和大板尺寸暂留空');}
 if(/\d\.\.\d/.test(s)){o.width=null;o.height=null;notes.push('尺寸含连续小数点，请重新填写宽高');}
 o.screwCoefficient=RULES.screws.coefficient;o.screwGrams=null;
 if((m=s.match(/螺丝(?:重量|用量)?\s*:?\s*(\d+(?:\.\d+)?)\s*(?:克|g)(?![a-z])/i)))o.screwGrams=Number(m[1]);
 o.parseNotes=notes;
 if((m=s.match(/半片实际(?:宽度?|尺寸)?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(毫米|厘米|公分|mm|cm|米|m)/i)))o.cutHalfPitch=unitValue(m[1],m[2]);
 o.countMode=['large','half'].some(k=>num(o[k])!==null)?'manual':'auto';
 applyAuto(o);return o;
}

const doorCountPattern=/(?<![\d.零〇一二两三四五六七八九十百千万])(-?\d+(?:\.\d+)?|[零〇一二两三四五六七八九十百千万]+)\s*(?:个\s*门|樘\s*门|扇\s*门)/g;
function parseMany(text,options={}){
 let s=normalize(text).replace(/、/g,',').replace(/(?<=[\d米m])\s*(?:和|及|与)\s*(?=\d)/gi,',');
 const matches=[...s.matchAll(doorCountPattern)];
 if(!matches.length)return [parse(text,options)];
 if(matches.length>1)throw Error('一段中出现多组门数，请用空行分开每组订单。');
 if(/\d\.\.\d/.test(s))throw Error('尺寸含连续小数点，请核对后再拆单。');
 const marker=matches[0],n=count(marker[1]);
 if(!Number.isInteger(n)||n<1||n>500)throw Error('门数须为1至500的整数，请核对“几个门”的数量。');
 s=s.slice(0,marker.index)+','+s.slice(marker.index+marker[0].length).replace(/^\s*:\s*/,'');
 s=s.replace(/(总宽|宽度|门宽|宽)\s*分别(?:为|是)?\s*:?/g,'$1');
 const dims=readDimensions(s);
 if(dims.heightTokens.length>1)throw Error('多门订单中有多个高度，请按不同高度分段录入。');
 const widths=dims.pairs.length?[]:[...inferredWidth(s,dims.consumed),...dims.widthTokens.map(t=>({...t,index:t.start}))];
 widths.sort((a,b)=>a.index-b.index);
 const base=parse(s,options);
 if(base.multiSize)throw Error('多门订单包含多组宽×高，请每组尺寸单独一段录入。');
 if(!widths.length&&base.width>0)widths.push({value:base.width,index:-1,end:-1,unit:'m',rawValue:base.width});
 if(widths.length!==n&&widths.length!==1)throw Error(`写了${n}个门，但识别到${widths.length}个宽度；请补齐，或只写1个宽度表示所有门同尺寸。`);
 for(let i=0;i<widths.length;i++){
  const w=widths[i],u=w.unit||widths.slice(i+1).find(x=>x.unit)?.unit||widths.slice(0,i).reverse().find(x=>x.unit)?.unit||'m';
  w.value=unitValue(w.rawValue,u);
  if(!(w.value>0))throw Error('多门订单的每个宽度都须大于0，请检查尺寸。');
 }
 let shared=s;
 for(const w of [...widths].reverse())if(w.index>=0)shared=shared.slice(0,w.index)+','+shared.slice(w.end);
 const common=parse(shared,options);
 // A single width×height is reused for identical doors; explicit shared height wins.
 if(common.height===null&&base.height!==null)common.height=base.height;
 const selected=widths.length===1?Array.from({length:n},()=>widths[0]):widths;
 return selected.map((w,i)=>{
  const o={...common,id:Math.random().toString(36).slice(2,10),raw:text.trim(),width:w.value,quantity:1,reviewed:false,parseNotes:[...common.parseNotes.filter(x=>x!=='未写数量，暂按1套'&&!x.startsWith('有多个未标注'))]};
  o.batchCount=n;o.batchIndex=i+1;
  o.parseNotes.push(`已按${n}个门拆单：第${i+1}门，宽${w.value}米，每条数量1；共用高度、型号、工艺及客户信息`);
  if(n>1&&common.quotedTotal!==null){o.quotedTotal=null;o.parseNotes.push(`原文总价${common.quotedTotal}元未分摊到各门，请核对；原文保留`);}
  if(n>1&&common.statedArea!==null)o.statedArea=null;
  applyAuto(o);return o;
 });
}
function parseOrders(raw,options={}){
 const chunks=splitOrders(raw,options.mode||'auto'),orders=[];
 for(const chunk of chunks){const group=parseMany(chunk,options);if(orders.length+group.length>500)throw Error('拆单后超过500条，请分批录入。');orders.push(...group);}
 return orders;
}
function calculations(o){
 const w=num(o.width),h=num(o.height),q=num(o.quantity),p=num(o.unitPrice),l=num(o.length),qt=num(o.quotedTotal);
 const area=w>0&&h>0?productRounded([w,h],6):null,totalArea=area!==null&&q>0?productRounded([area,q],6):null;
 let total=null;if(p!==null&&p>=0&&q>0){if(o.basis==='平方米'&&totalArea!==null)total=productRounded([totalArea,p],2);if(o.basis==='套')total=productRounded([q,p],2);if(o.basis==='米'&&l>0)total=productRounded([l,q,p],2);}
 return {area,totalArea,total,diff:total!==null&&qt!==null?rnd(total-qt,2):null};
}
function modelSize(o){const m=String(o.model||'').match(/^(?:JF|JJ)?(10|12|15|19|24|28|30)$/i);return m?m[1]:null}
// Large pitches are measured values from the yellow 2026 table. Half pitches
// are separate: nominal-size exceptions must not silently use large pitch / 2.
function panelParameters(o){
 const size=modelSize(o),family=materialInfo(o).family;
 const pitch=num(o.cutPitch)??RULES.profiles.current1?.parameters[size]?.pitch??null;
 let halfPitch=num(o.cutHalfPitch);
 if(halfPitch===null&&family==='JF'){
  const halfSource=USER.jfActualHalfSource[size];
  if(halfSource&&halfSource!==size)halfPitch=RULES.profiles.current1.parameters[halfSource].pitch/2;
  else if(pitch>0)halfPitch=rnd(pitch/2,8);
 }
 const opening=normalizeOpening(o.opening),type=opening==='左右单开'?'leftRight':opening.includes('双开')?'double':opening==='单开'?'single':null;
 const correction=type?USER.openingCorrections[type]:null,defaultHalf=type?USER.defaultHalfCounts[type]:null;
 return {pitch,halfPitch,correction,defaultHalf,source:'大片实际宽：2026排单23黄色表；半片、开启修正和选片：用户业务规则'};
}
function setProfile(o,key){o.cutProfile=key;if(key!=='custom'){o.cutPitch=null;o.cutHalfPitch=null;}o.cutHalfLock=null;return o;}
function upgradeOrder(o,fromVersion=''){
 o.model=normalizeModel(o.model);if(/^(JF|JJ)$/.test(o.model)&&num(o.materialSize)>0)o.model+=num(o.materialSize);o.materialSize=materialInfo(o).largeWidthCm;o.opening=normalizeOpening(o.opening);
 if(num(o.deduction)===null)o.deduction=USER.defaultDeduction;
 if(!['1.5','1.6','1.7','1.8','1.9'].includes(fromVersion)){
  if(o.cutProfile!=='custom')o.cutPitch=null;
  o.countMode=['large','half'].some(k=>num(o[k])!==null)?'manual':'auto';
 }
 o.cutHalfLock=null;o.cutProfile=o.cutProfile==='custom'?'custom':'';
 o.aux=0;o.auxWidth=null;o.errorHint='';
 o.parseNotes.push('已按最新规则将辅片归零，按误差绝对值较小方案重新选片，误差显示多/少；自动方案重算，手工大片/半片保留');
 if(o.screwCoefficient===undefined)o.screwCoefficient=RULES.screws.coefficient;
 if(o.screwGrams===undefined)o.screwGrams=null;
 applyAuto(o);o.reviewed=false;return o;
}
function widthHint(error){return error===null?'':error===0?'0公分':`${error>0?'多':'少'}${rnd(Math.abs(error)*100,4)}公分`;}
function cutting(o){
 const params=panelParameters(o),{pitch:b,halfPitch:hp,correction:a,defaultHalf:dh}=params,w=num(o.width);
 const ready=w>0&&b>0&&hp>0&&a!==null;
 const net=ready?rnd(w-dh*hp-a,8):null,approx=net!==null&&net>=0?rnd(net/b,9):null;
 let suggestion=null,waiting='',candidates=[];
 if(!(w>0))waiting='请填写有效宽度';
 else if(!(b>0))waiting='该规格缺少大片实际宽度，请补填';
 else if(a===null)waiting='请选择单开、双开或左右单开';
 else if(!(hp>0))waiting='该规格半片实际宽度待确认，请补填后选片';
 else if(net<0)waiting='宽度不足以放下默认半片及开启修正，请手工选配';
 else {
  const lower=Math.floor((net+1e-9)/b),upper=Math.min(lower+1,Math.floor((w+1e-9)/b));
  candidates=[...new Set([lower,upper])].map(n=>{const actual=rnd(productRounded([n,b],6)+productRounded([dh,hp],6)+a,6),error=rnd(actual-w,6);return {n,actual,error,hint:widthHint(error)};});
  // At equal absolute error prefer the lower count. Compare rounded production
  // widths so the app and spreadsheet choose exactly the same candidate.
  const chosen=candidates.reduce((a,b)=>Math.abs(b.error)<Math.abs(a.error)?b:a);
  suggestion={large:chosen.n,half:dh,aux:0,auxWidth:null,residual:rnd(w-chosen.actual,8),actual:chosen.actual,error:chosen.error};
 }
 const counts=['large','half'].map(k=>num(o[k])),[n,h]=counts.map(v=>v??0);
 const valid=counts.some(v=>v!==null)&&counts.every(v=>v===null||Number.isInteger(v)&&v>=0);
 const realPanelWidth=valid&&(n===0||b>0)?productRounded([n,b??0],6):null;
 const halfTotal=valid&&(h===0||hp>0)?productRounded([h,hp??0],6):null;
 const auxTotal=0;
 const actual=w>0&&a!==null&&[realPanelWidth,halfTotal,auxTotal].every(v=>v!==null)?rnd(realPanelWidth+halfTotal+auxTotal+a,6):null;
 const error=actual===null?null:rnd(actual-w,6);
 return {...params,net,approx,actual,error,hint:widthHint(error),realPanelWidth,halfTotal,auxTotal,suggestion,waiting,candidates};
}
function applyAuto(o,force=false){
 o.aux=0;o.auxWidth=null;o.errorHint='';
 if(force)o.countMode='auto';
 if(o.countMode!=='auto')return o;
 const c=cutting(o);
 for(const k of ['large','half'])o[k]=c.suggestion?.[k]??null;
 return o;
}
function auxiliaryNote(o){return '';}
function production(o){
 const inputs=['large','half'].map(k=>num(o[k]));
 const calculatedEights=inputs.some(x=>x!==null)?inputs.reduce((s,v)=>s+(v??0),0):null;
 const calculatedClaws=calculatedEights===null?null:calculatedEights*2;
 const deduction=num(o.deduction),height=num(o.height);
 const calculatedNet=height>0&&deduction!==null&&deduction>=0&&deduction<height?rnd(height-deduction,6):null;
 const netHeight=num(o.netHeight)??calculatedNet,claws=num(o.claws)??calculatedClaws,eights=num(o.eights)??calculatedEights;
 const width=num(o.width),coefficient=num(o.screwCoefficient);
 const calculatedScrews=width>0&&height>0&&coefficient>0?rnd(productRounded([rnd(width+2*height,9),RULES.screws.factor,coefficient],9)+RULES.screws.allowance,6):null;
 const screwGrams=num(o.screwGrams)??calculatedScrews;
 return {netHeight,claws,eights,screwGrams,errorHint:cutting(o).hint,calculatedNet,calculatedClaws,calculatedEights,calculatedScrews};
}
function windowParts(o){
 const net=production(o).netHeight,n=num(o.windows),valid=[1,2,3,4].includes(n);
 const railDeduction=valid?RULES.windowParts.rail[n]:null,panelDeduction=valid?RULES.windowParts.panel[n]:null;
 return {net,windows:n,railDeduction,panelDeduction,
  rail:net!==null&&valid&&net>railDeduction?rnd((net-railDeduction)/n,9):null,
  panel:net!==null&&valid&&net>panelDeduction?rnd((net-panelDeduction)/n,9):null};
}
function demoOrders(options={}){
 return examples.map((text,i)=>{
  const o=parse(text,{date:options.date,deduction:.08,mallOrder:options.mallOrder});
  Object.assign(o,{large:[14,21,29][i],half:2,aux:0,auxWidth:null,countMode:'manual'});
  o.remarks='公式演示：扣高8公分、大片'+o.large+'、半片2按截图录入，并非原文自动推断';
  return o;
 });
}
function formulaTrace(o){
 const p=production(o),cell=RULES.deductions.find(x=>x.value===num(o.deduction))?.cell;
 const records=[
  {key:'netHeight',label:'F · 净高',rule:'高度 − 扣高',source:cell?'排单23!'+cell:'排单23!F2（结构参考）',
   expression:`${num(o.height)} − ${num(o.deduction)} = ${p.netHeight} 米`,
   waiting:!(num(o.height)>0)?'请填写有效总高':num(o.deduction)===null?'请选择扣高方案':'扣高须大于等于0，且小于总高'},
  {key:'claws',label:'G · 爪子',rule:'（大片 + 半片 + 辅）× 2',source:'排单23!G2316',
   expression:`（${num(o.large)??0} + ${num(o.half)??0} + 0）× 2 = ${p.claws}`,
   waiting:'请填写大片或半片数量；辅固定为0'},
  {key:'eights',label:'H · 8字',rule:'大片 + 半片 + 辅',source:RULES.latestEightsSource,
   expression:`${num(o.large)??0} + ${num(o.half)??0} + 0 = ${p.eights}`,waiting:'请填写片数；手填爪子不会改变8字'},
  {key:'screwGrams',label:'N · 螺丝（克/套）',rule:'（宽 + 高 × 2）× 4.5 × 系数 + 3.5',source:num(o.screwCoefficient)===2.1?RULES.screws.earlySource:RULES.screws.source,
   expression:`（${num(o.width)} + ${num(o.height)} × 2）× 4.5 × ${num(o.screwCoefficient)} + 3.5 = ${p.screwGrams} 克`,waiting:'请填写有效宽、高及螺丝系数'}
 ];
 return records.map(r=>({...r,value:p[r.key],status:num(o[r.key])!==null?'手填覆盖':p[r.key]===null?'等待输入':'自动计算',
  detail:num(o[r.key])!==null?`采用手填值 ${p[r.key]}；清除手填覆盖后恢复公式`:p[r.key]===null?r.waiting:r.expression}));
}
function issues(o){
 const a=[];const c=calculations(o);
 if(!(num(o.width)>0))a.push('缺少有效宽度');if(!(num(o.height)>0))a.push('缺少有效高度');if(materialInfo(o).largeWidthCm===null)a.push('缺少大片规格（如JF30）');if(!o.customer)a.push('缺少客户');
 if(!(num(o.quantity)>0&&Number.isInteger(num(o.quantity))))a.push('数量须为正整数');
 if(o.unitPrice===null||o.unitPrice==='')a.push('单价未提供');else if(num(o.unitPrice)<0)a.push('单价不能为负数');
 if(o.unitPrice!==null&&o.unitPrice!==''&&!o.basis)a.push('请选择计价方式');
 if(o.basis==='米'&&!(num(o.length)>0))a.push('按米计价须填写长度');
 if(o.quotedTotal!==null&&o.quotedTotal!==''&&num(o.quotedTotal)<0)a.push('原文总价不能为负数');
 if(c.diff!==null&&Math.abs(c.diff)>=0.01)a.push('计算金额与原文相差'+c.diff.toFixed(2)+'元');
 if(o.statedArea!==null&&c.area!==null&&Math.abs(num(o.statedArea)-c.area)>0.0001)a.push('原文面积与宽×高不符');
 const p=production(o),cut=cutting(o);
 if([p.netHeight,p.claws,p.eights,num(o.large)].some(v=>v===null))a.push('生产数据待补');
 if(num(o.netHeight)===null&&num(o.deduction)===null)a.push('扣高方案未选择，净高暂留空');
 if(num(o.deduction)!==null&&num(o.height)!==null&&num(o.deduction)>=num(o.height))a.push('扣高须小于总高');
 if(num(o.claws)!==null&&p.calculatedClaws!==null&&num(o.claws)!==p.calculatedClaws)a.push('手填爪子与片数公式不一致');
 if(num(o.eights)!==null&&p.calculatedEights!==null&&num(o.eights)!==p.calculatedEights)a.push('手填8字与大片＋半片＋辅不一致');
 if(num(o.screwGrams)!==null&&p.calculatedScrews!==null&&Math.abs(num(o.screwGrams)-p.calculatedScrews)>1e-6)a.push('手填螺丝克重与所选公式不一致');
 if(num(o.netHeight)!==null&&p.calculatedNet!==null&&Math.abs(num(o.netHeight)-p.calculatedNet)>1e-6)a.push('手填净高与所选扣高不一致');
 if(cut.waiting)a.push(cut.waiting);
 if(o.cutProfile&&o.cutProfile!=='custom'&&cut.source==='未选择参数组')a.push('当前型号没有该组片宽参数');
 if(![1,2,3,4].includes(num(o.windows)))a.push('横条/大板试算需明确1至4窗；其他窗型暂不计算');
 if(!o.reviewed)a.push(...o.parseNotes);
 if(o.multiSize&&!o.reviewed)a.push('多组尺寸需拆单');
 return [...new Set(a)];
}
function productionRecipient(o){
 const clean=v=>String(v??'').trim().replace(/ +/g,' '),destination=clean(o.destination),customer=clean(o.customer);
 if(!destination)return customer;
 if(!customer)return destination;
 return customer.includes(destination)?customer:destination+' '+customer;
}
function productionRow(o){const p=production(o);return [o.date,productionRecipient(o),[desc(o),o.remarks,auxiliaryNote(o)].filter(Boolean).join('，'),num(o.width),num(o.height),p.netHeight,p.claws,p.eights,o.category,num(o.large),num(o.half),0,p.errorHint,p.screwGrams]}
function productionLayout(orders){
 const rows=orders.map(productionRow),rowSpans=rows.map(r=>r.map(()=>1)),merges=[];
 for(const column of [0,1])for(let start=0;start<rows.length;){
  let end=start+1;const value=rows[start][column];
  if(value!==null&&value!==undefined&&value!=='')while(end<rows.length&&rows[end][column]===value)end++;
  if(end-start>1){rowSpans[start][column]=end-start;for(let i=start+1;i<end;i++)rowSpans[i][column]=0;merges.push(`${col(column)}${start+2}:${col(column)}${end+1}`);}
  start=end;
 }
 return {rows,rowSpans,merges};
}
function productionTable(orders,{header=true,clipboard=false}={}){
 const {rows,rowSpans}=productionLayout(orders),text=v=>esc(clipboard?safeTSV(v):v??'');
 const headings=header?`<thead><tr>${pHeaders.map(v=>`<th>${text(v)}</th>`).join('')}</tr></thead>`:'';
 const body=rows.map((row,r)=>`<tr>${row.map((v,c)=>{
  const span=rowSpans[r][c];if(!span)return '';
  const empty=(v===null||v==='')&&[5,6,7,9,10,11,12,13].includes(c);
  return `<td${span>1?` rowspan="${span}"`:''} class="${empty?'blank':''}"${clipboard?' style="border:1px solid #a9b4be;vertical-align:middle;text-align:center;white-space:pre-wrap"':''}>${text(v)}</td>`;
 }).join('')}</tr>`).join('');
 return `<table${clipboard?' style="border-collapse:collapse"':''}>${headings}<tbody>${body}</tbody></table>`;
}
function calculationRow(o,i){const c=cutting(o),p=production(o),w=windowParts(o);return [i+1,o.customer,o.model,num(o.width),num(o.height),num(o.deduction),p.netHeight,o.countMode==='auto'?'自动选片':'手工选片',c.correction,c.pitch,c.net,c.approx,num(o.large),c.realPanelWidth,c.actual,c.error,c.error===null?null:rnd(c.error*100,4),num(o.windows),w.railDeduction,w.rail,w.panelDeduction,w.panel,num(o.screwCoefficient),materialDescription(o)+'；'+c.source+'；辅固定0；比较绝对值选最接近，正多负少；横条/大板：排单23!P2318:X2318',c.halfPitch,num(o.half),c.halfTotal,c.defaultHalf,c.suggestion?.large??null,c.suggestion?.half??null,c.candidates[0]?.n??null,c.candidates[0]?.error??null,(c.candidates[1]??c.candidates[0])?.n??null,(c.candidates[1]??c.candidates[0])?.error??null]}
function detailRow(o){const c=calculations(o);return[o.date,o.customer,o.destination,o.phone,o.address,desc(o),num(o.width),num(o.height),num(o.length),materialInfo(o).largeWidthCm,o.color,normalizeOpening(o.opening),num(o.windows),o.track,o.lock,num(o.quantity),c.area,c.totalArea,num(o.unitPrice),o.basis,c.total,num(o.quotedTotal),c.diff,o.shipping,o.category,num(o.usage),o.usageUnit,o.remarks,issues(o).join('；'),o.raw]}
function safeTSV(v){let s=String(v??'').replace(/[\t\r\n]/g,' ');return /^[=+\-@]/.test(s)?"'"+s:s}
function tsv(orders,kind='production',header=false){const isProduction=kind==='production'||kind==='legacy';const rows=orders.map(isProduction?productionRow:detailRow).map(r=>kind==='legacy'?r.slice(0,13):r);if(header)rows.unshift(isProduction?(kind==='legacy'?pHeaders.slice(0,13):pHeaders):dHeaders);return rows.map(row=>row.map(safeTSV).join('\t')).join('\r\n')}
function validate(orders){if(!orders.length)throw Error('请先识别至少一条订单。');if(orders.length>500)throw Error('每次最多导出500条，请分批处理。');for(const o of orders){for(const k of ['width','height','length','quantity','unitPrice','quotedTotal','netHeight','claws','eights','large','half','aux','usage','windows','materialSize','deduction','cutHalfLock','cutPitch','cutHalfPitch','auxWidth','refBase','refSegments','screwCoefficient','screwGrams']){if(o[k]!==null&&o[k]!==''&&o[k]!==undefined&&!Number.isFinite(Number(o[k])))throw Error('数字格式无效：'+k);if(num(o[k])<0)throw Error('不接受负数，请检查尺寸、价格或数量。');}if(o.quantity!==null&&(!Number.isInteger(num(o.quantity))||num(o.quantity)<=0))throw Error('数量须为正整数。');for(const k of ['claws','eights','large','half','aux','windows'])if(o[k]!==null&&o[k]!==''&&!Number.isInteger(num(o[k])))throw Error('件数/窗数须为整数。');if(!/^\d{4}-\d{2}-\d{2}$/.test(o.date)||!Number.isFinite(Date.parse(o.date)))throw Error('请填写有效的排单日期。');if(num(o.deduction)!==null&&num(o.height)>0&&num(o.deduction)>=num(o.height))throw Error('扣高须小于总高。');}}
// Uses the styles and worksheet shells authored in template.xlsx with Artifact Tool.
const esc=v=>String(v).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function col(i){let s='';for(i++;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s}
function dateSerial(s){return (Date.parse(s+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000}
function cell(ref,value,style=0,formula){const attrs=`r="${ref}" s="${style}"`;if(formula){const v=value===null||value===''?'':String(value);return `<c ${attrs}${typeof value!=='number'?' t="str"':''}><f>${esc(formula)}</f><v>${esc(v)}</v></c>`}if(value===null||value===undefined||value==='')return `<c ${attrs}/>`;if(typeof value==='number')return `<c ${attrs}><v>${value}</v></c>`;return `<c ${attrs} t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`}
function formulas(row,o){const c=calculations(o);return {
 16:[`IF(OR(G${row}="",H${row}="",G${row}<=0,H${row}<=0),"",ROUND(G${row}*H${row},6))`,c.area],
 17:[`IF(OR(Q${row}="",P${row}="",P${row}<=0),"",ROUND(Q${row}*P${row},6))`,c.totalArea],
 20:[`IF(OR(S${row}="",P${row}="",P${row}<=0),"",IF(T${row}="平方米",IF(R${row}="","",ROUND(R${row}*S${row},2)),IF(T${row}="套",ROUND(P${row}*S${row},2),IF(T${row}="米",IF(OR(I${row}="",I${row}<=0),"",ROUND(I${row}*P${row}*S${row},2)),""))))`,c.total],
 22:[`IF(OR(U${row}="",V${row}=""),"",ROUND(U${row}-V${row},2))`,c.diff]
}}
function productionFormulas(r,o){const f={11:['0']},calc=`'生产计算'!`,d=`'订单明细'!`;
 if(o.countMode==='auto'){
  f[9]=[`IF(COUNT(${calc}AD${r})=0,"",${calc}AC${r})`];
  f[10]=[`IF(COUNT(${calc}AD${r})=0,"",${calc}AD${r})`];

 }
 f[0]=[`${d}A${r}`];f[1]=[`IF(TRIM(${d}C${r})="",TRIM(${d}B${r}),IF(ISNUMBER(FIND(TRIM(${d}C${r}),TRIM(${d}B${r}))),TRIM(${d}B${r}),TRIM(${d}C${r}&" "&${d}B${r})))`];f[2]=[`${d}F${r}&IF(${d}AB${r}="","","，"&${d}AB${r})`];
 f[3]=[`IF(COUNT(${d}G${r})=0,"",${d}G${r})`];f[4]=[`IF(COUNT(${d}H${r})=0,"",${d}H${r})`];f[8]=[`IF(${d}Y${r}="","",${d}Y${r})`];
 if(num(o.netHeight)===null)f[5]=[`IF(OR(E${r}="",COUNT(${calc}F${r})=0,E${r}<=${calc}F${r}),"",ROUND(E${r}-${calc}F${r},6))`];
 if(num(o.claws)===null)f[6]=[`IF(COUNT(J${r}:K${r})=0,"",SUM(J${r}:K${r})*2)`];
 if(num(o.eights)===null)f[7]=[`IF(COUNT(J${r}:K${r})=0,"",SUM(J${r}:K${r}))`];
 f[12]=[`IF(COUNT(${calc}P${r})=0,"",IF(${calc}P${r}>0,"多",IF(${calc}P${r}<0,"少",""))&IF(MOD(${calc}Q${r},1)=0,TEXT(ABS(${calc}Q${r}),"0"),TEXT(ABS(${calc}Q${r}),"0.####"))&"公分")`];
 if(num(o.screwGrams)===null)f[13]=[`IF(OR(D${r}="",E${r}="",D${r}<=0,E${r}<=0,COUNT(${calc}W${r})=0,${calc}W${r}<=0),"",ROUND((D${r}+E${r}*2)*4.5*${calc}W${r}+3.5,6))`];
 return f;
}
function calculationFormulas(r,o){const p="'排单'!",d="'订单明细'!";return {
 1:[`IF(${d}B${r}="","",${d}B${r})`],3:[`IF(COUNT(${p}D${r})=0,"",${p}D${r})`],4:[`IF(COUNT(${p}E${r})=0,"",${p}E${r})`],6:[`IF(COUNT(${p}F${r})=0,"",${p}F${r})`],
 8:[`IF(${d}L${r}="左右单开",${USER.openingCorrections.leftRight},IF(ISNUMBER(SEARCH("双开",${d}L${r})),${USER.openingCorrections.double},IF(${d}L${r}="单开",${USER.openingCorrections.single},"")))`],
 10:[`IF(OR(COUNT(D${r},I${r},J${r},Y${r},AB${r})<5,D${r}<=0,J${r}<=0,Y${r}<=0),"",ROUND(D${r}-I${r}-Y${r}*AB${r},8))`],
 11:[`IF(OR(COUNT(K${r},J${r})<2,J${r}<=0,K${r}<0),"",ROUND(K${r}/J${r},9))`],
 12:[`IF(COUNT(${p}J${r})=0,"",${p}J${r})`],
 13:[`IF(COUNT(${p}J${r}:K${r})=0,"",IF(SUM(M${r})=0,0,IF(OR(COUNT(J${r})=0,J${r}<=0),"",ROUND(J${r}*SUM(M${r}),6))))`],
 14:[`IF(OR(COUNT(N${r},AA${r},I${r},D${r})<4,D${r}<=0),"",ROUND(N${r}+AA${r}+I${r},6))`],
 15:[`IF(COUNT(O${r},D${r})<2,"",ROUND(O${r}-D${r},6))`],16:[`IF(COUNT(P${r})=0,"",ROUND(P${r}*100,4))`],
 17:[`IF(COUNT(${d}M${r})=0,"",${d}M${r})`],
 18:[`IF(COUNT(R${r})=0,"",IF(OR(R${r}<1,R${r}>4,MOD(R${r},1)<>0),"",CHOOSE(R${r},0.078,0.111,0.147,0.18)))`],
 19:[`IF(OR(COUNT(G${r},S${r},R${r})<3,G${r}<=S${r}),"",ROUND((G${r}-S${r})/R${r},9))`],
 20:[`IF(COUNT(R${r})=0,"",IF(OR(R${r}<1,R${r}>4,MOD(R${r},1)<>0),"",CHOOSE(R${r},0.2,0.235,0.266,0.298)))`],
 21:[`IF(OR(COUNT(G${r},U${r},R${r})<3,G${r}<=U${r}),"",ROUND((G${r}-U${r})/R${r},9))`],
 25:[`IF(COUNT(${p}K${r})=0,"",${p}K${r})`],
 26:[`IF(COUNT(${p}J${r}:K${r})=0,"",IF(SUM(Z${r})=0,0,IF(OR(COUNT(Y${r})=0,Y${r}<=0),"",ROUND(Y${r}*SUM(Z${r}),6))))`],
 27:[`IF(${d}L${r}="左右单开",${USER.defaultHalfCounts.leftRight},IF(ISNUMBER(SEARCH("双开",${d}L${r})),${USER.defaultHalfCounts.double},IF(${d}L${r}="单开",${USER.defaultHalfCounts.single},"")))`],
 28:[`IF(COUNT(AE${r},AF${r},AG${r},AH${r})<4,"",IF(ABS(AH${r})<ABS(AF${r}),AG${r},AE${r}))`],
 30:[`IF(OR(COUNT(K${r},J${r})<2,J${r}<=0,K${r}<0),"",INT((K${r}+0.000000001)/J${r}))`],
 31:[`IF(COUNT(AE${r})=0,"",ROUND(ROUND(AE${r}*J${r},6)+ROUND(Y${r}*AB${r},6)+I${r}-D${r},6))`],
 32:[`IF(COUNT(AE${r})=0,"",MIN(AE${r}+1,INT((D${r}+0.000000001)/J${r})))`],
 33:[`IF(COUNT(AG${r})=0,"",ROUND(ROUND(AG${r}*J${r},6)+ROUND(Y${r}*AB${r},6)+I${r}-D${r},6))`],
 29:[`IF(COUNT(AC${r})=0,"",AB${r})`]
}}
function buildXlsx(orders,template){validate(orders);const files={...template.files},layout=productionLayout(orders);delete files['xl/calcChain.xml'];
 for(let sheet=1;sheet<=3;sheet++){
  const key=`xl/worksheets/sheet${sheet}.xml`,xml=files[key],styles=template.styles[sheet-1],rows=[];
  const headers=sheet===1?pHeaders:sheet===2?dHeaders:cHeaders;
  rows.push(`<row r="1" ht="32" customHeight="1">${headers.map((h,i)=>cell(col(i)+'1',h,template.headerStyles[sheet-1][i]||0)).join('')}</row>`);
  orders.forEach((o,index)=>{const r=index+2,vals=sheet===1?[...layout.rows[index]]:sheet===2?detailRow(o):calculationRow(o,index),f=sheet===1?productionFormulas(r,o):sheet===2?formulas(r,o):calculationFormulas(r,o);if(sheet<3)vals[0]=dateSerial(o.date);rows.push(`<row r="${r}" ht="80" customHeight="1">${vals.map((v,i)=>sheet===1&&layout.rowSpans[index][i]===0?cell(col(i)+r,null,styles[i]||0):cell(col(i)+r,v,styles[i]||0,f[i]?.[0])).join('')}</row>`)});
  let out=xml.replace(/<sheetData\b[^>]*>[\s\S]*?<\/sheetData>/,`<sheetData>${rows.join('')}</sheetData>`).replace(/<dimension\b[^>]*\/>/,`<dimension ref="A1:${col(headers.length-1)}${orders.length+1}"/>`);
  out=out.replace(/<autoFilter\b[^>]*\/>/g,'').replace(/<conditionalFormatting\b[\s\S]*?<\/conditionalFormatting>/g,'');
  out=out.replace(/<pageMargins\b[^>]*\/>/g,'').replace(/<pageSetup\b[^>]*\/>/g,'').replace(/<headerFooter\b[\s\S]*?<\/headerFooter>/g,'');
  out=out.replace(/<mergeCells\b[^>]*>[\s\S]*?<\/mergeCells>|<mergeCells\b[^>]*\/>/g,'');
  const merged=sheet===1&&layout.merges.length?`<mergeCells count="${layout.merges.length}">${layout.merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`:'';
  out=out.replace('</sheetData>',`</sheetData><autoFilter ref="A1:${col(headers.length-1)}${orders.length+1}"/>${merged}`);
  out=out.replace('</worksheet>','<pageMargins left="0.2" right="0.2" top="0.3" bottom="0.3" header="0.1" footer="0.1"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>');
  files[key]=out;
 }
 files['xl/workbook.xml']=files['xl/workbook.xml'].replace(/<calcPr\b[^>]*\/>/g,'').replace('</workbook>','<calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>');
 return zip(files);
}
const enc=new TextEncoder();let crcTable;
function crc32(a){if(!crcTable)crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0});let n=0xffffffff;for(const b of a)n=crcTable[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0}
function zip(files){let parts=[],central=[],offset=0,count=0;const pack=(n)=>{const a=new Uint8Array(n);return[a,new DataView(a.buffer)]};for(const [name,str] of Object.entries(files)){const nameB=enc.encode(name),data=enc.encode(str),crc=crc32(data);const[a,v]=pack(30+nameB.length);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,nameB.length,true);a.set(nameB,30);parts.push(a,data);const[c,w]=pack(46+nameB.length);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint16(14,33,true);w.setUint32(16,crc,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,nameB.length,true);w.setUint32(42,offset,true);c.set(nameB,46);central.push(c);offset+=a.length+data.length;count++}const size=central.reduce((s,a)=>s+a.length,0);const[e,v]=pack(22);v.setUint32(0,0x06054b50,true);v.setUint16(8,count,true);v.setUint16(10,count,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);const out=new Uint8Array(offset+size+22);let p=0;for(const a of [...parts,...central,e]){out.set(a,p);p+=a.length}return out}
root.OrderEngine={examples,demoOrders,formulaTrace,pHeaders,dHeaders,cHeaders,rules:RULES,normalize,normalizeModel,normalizeOpening,materialInfo,materialDescription,splitOrders,readDimensions,parse,parseMany,parseOrders,desc,calculations,production,windowParts,cutting,panelParameters,applyAuto,auxiliaryNote,setProfile,upgradeOrder,modelSize,issues,productionRow,productionLayout,productionTable,detailRow,calculationRow,tsv,validate,buildXlsx};
})(typeof window!=='undefined'?window:globalThis);
