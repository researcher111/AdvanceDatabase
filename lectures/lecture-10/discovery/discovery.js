/* Saved, executed SQL results for the website; editable queries on localhost. */
(function(){
'use strict';
const cases=window.TAXI_DISCOVERY.cases, live=window.DISCOVERY_LIVE===true;
const $=id=>document.getElementById(id), ns='http://www.w3.org/2000/svg';
let index=0,result=null,submittedSQL='',busy=false;
const notes=cases.map(c=>({sql:c.sql,prediction:'',conclusion:''}));
const human=s=>s.replaceAll('_',' ');
const units=metric=>metric.includes('pct')?'Percent (%)':metric.includes('fare_per_mile')?'USD per mile':/fare|tip/.test(metric)&&!metric.includes('zero')?'USD (recorded amount)':metric.includes('minutes')?'Minutes':metric.includes('miles')?'Miles':'Count';
const fmt=n=>typeof n==='number'?n.toLocaleString('en-US',{maximumFractionDigits:2}):String(n??'NULL');
function element(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
function svgNode(tag,attrs,text){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text!==undefined)e.textContent=text;return e;}
cases.forEach((c,i)=>{const o=element('option',(i+1)+'. '+c.title);o.value=i;$('case').append(o);});
$('mode').textContent=live?'Live database: edit SQL and run it against your local taxi.duckdb. Up to 200 result rows are displayed.':'Website preview: reveal saved results computed from the bundled data. Start the local workbench above to edit and execute SQL.';
$('run').textContent=live?'Run query':'Reveal computed result';$('sql').readOnly=!live;
function save(){Object.assign(notes[index],{sql:$('sql').value,prediction:$('prediction').value,conclusion:$('conclusion').value});}
function choose(next){
 if(busy)return;
 save();index=next;result=null;submittedSQL='';const c=cases[index],n=notes[index];
 $('case').value=index;$('progress').textContent=`Investigation ${index+1} of ${cases.length}`;
 $('question').textContent=c.title;$('prediction-prompt').textContent=c.predict;
 $('sql').value=n.sql;$('prediction').value=n.prediction;$('conclusion').value=n.conclusion;
 $('evidence').hidden=true;$('query-status').textContent='';$('previous').disabled=index===0;$('next').disabled=index===cases.length-1;
}
$('case').addEventListener('change',()=>choose(Number($('case').value)));
$('previous').addEventListener('click',()=>choose(index-1));$('next').addEventListener('click',()=>choose(index+1));
$('restore').addEventListener('click',()=>{$('sql').value=cases[index].sql;notes[index].sql=cases[index].sql;$('evidence').hidden=true;});
$('sql').addEventListener('input',()=>{$('evidence').hidden=true;$('query-status').textContent='Query changed. Run it to refresh the result and chart.';});
$('metric').addEventListener('change',draw);
function show(data,sql){
 result=data;submittedSQL=sql;const c=cases[index];
 $('columns').replaceChildren();const heading=element('tr');data.columns.forEach(col=>{const th=element('th',human(col));th.scope='col';heading.append(th);});$('columns').append(heading);
 $('rows').replaceChildren(...data.rows.map(row=>{const tr=element('tr');row.forEach(value=>tr.append(element('td',fmt(value))));return tr;}));
 const metrics=c.chart.metrics.filter(m=>data.columns.includes(m));
 $('metric').replaceChildren(...metrics.map(m=>{const o=element('option',human(m));o.value=m;return o;}));
 $('metric').disabled=metrics.length===0;
 const original=sql.trim()===c.sql.trim();
 $('interpretation').textContent=original?c.interpret:'You changed the query. Describe the new population, unit, and denominator before comparing this result with the original example. The original interpretation may no longer apply.';
 $('follow-up').textContent=c.follow;$('evidence').hidden=false;
 $('query-status').textContent=`${data.rows.length} rows ${live?'returned by DuckDB':'in the saved result'}${data.truncated?' · display limited to 200; add an aggregate or LIMIT for a smaller result':''}.`;
 draw();
}
function draw(){
 const c=cases[index],metric=$('metric').value,cols=result.columns,mi=cols.indexOf(metric),xi=cols.indexOf(c.chart.x);
 $('chart').replaceChildren();$('metric-unit').textContent=mi<0?'':units(metric);
 if(mi<0||xi<0||!result.rows.length){$('chart-note').textContent='Inspect the table. This query does not return the example’s chart fields, or returned no rows.';return;}
 const invalid=result.rows.some(r=>typeof r[mi]!=='number'||!Number.isFinite(r[mi])||r[mi]<0);
 if(invalid){$('chart-note').textContent='Inspect the table: this example chart supports finite, nonnegative measurements.';return;}
 const max=Math.max(...result.rows.map(r=>r[mi]),1),svg=svgNode('svg',{role:'img','aria-labelledby':'chart-title chart-desc'});
 svg.append(svgNode('title',{id:'chart-title'},c.title+' — '+human(metric)));
 svg.append(svgNode('desc',{id:'chart-desc'},`${units(metric)}. Values come from the SQL result; the full table is below.`));
 const text=(x,y,t,attrs={})=>svg.append(svgNode('text',{x,y,'font-size':14,...attrs},t));
 if(c.chart.type==='heatmap'&&cols.includes(c.chart.group)){
  const gi=cols.indexOf(c.chart.group),groups=[...new Set(result.rows.map(r=>r[gi]))];
  svg.setAttribute('viewBox',`0 0 800 ${85+groups.length*55}`);
  for(let h=0;h<24;h++)text(220+h*22+10,25,String(h),{'text-anchor':'middle','font-size':11});
  groups.forEach((g,yi)=>{text(10,64+yi*55,String(g),{'font-size':13});for(let h=0;h<24;h++){
   const row=result.rows.find(r=>r[gi]===g&&Number(r[xi])===h);const value=row?.[mi];
   const rect=svgNode('rect',{x:220+h*22,y:42+yi*55,width:20,height:34,rx:3,fill:row?`hsl(151 34% ${92-53*value/max}%)`:'#e5e5e2',tabindex:0});
   rect.append(svgNode('title',{},`${g}, hour ${h}: ${row?fmt(value)+' '+units(metric):'no returned row'}`));svg.append(rect);
  }});
  text(220,70+groups.length*55,`Darker = higher ${human(metric)} · grey = no returned row`);
 }else{
  const rows=result.rows.slice(0,24),height=65+rows.length*54;svg.setAttribute('viewBox',`0 0 800 ${height}`);
  text(280,22,'0');text(670,22,fmt(max),{'text-anchor':'end'});
  svg.append(svgNode('path',{d:`M 280 30 V ${height-15}`,stroke:'#bdc9c0'}));
  rows.forEach((r,i)=>{const y=40+i*54,label=String(r[xi]),parts=label.match(/.{1,32}(?:\s|$)|.{1,32}/g)||[label];
   parts.slice(0,2).forEach((part,j)=>text(10,y+16+j*16,part.trim(),{'font-size':13}));
   const bar=svgNode('rect',{x:280,y,width:Math.max(0,390*r[mi]/max),height:31,rx:3,fill:'#30785b'});bar.append(svgNode('title',{},label+': '+fmt(r[mi])+' '+units(metric)));svg.append(bar);
   text(290+390*r[mi]/max,y+21,fmt(r[mi]),{'font-size':13});
  });
 }
 $('chart').append(svg);$('chart-note').textContent=(c.chart.type==='heatmap'?'Compare profiles, then check the counts. ':'The bar scale starts at zero. ')+(result.rows.length>24&&c.chart.type!=='heatmap'?'Chart shows the first 24 result rows. ':'')+'On a small screen, scroll sideways for the full chart. The table preserves every displayed value.';
}
$('run').addEventListener('click',async()=>{
 if(busy)return;busy=true;save();const sql=$('sql').value;$('sql').readOnly=true;
 for(const id of ['run','case','next','previous','restore'])$(id).disabled=true;
 $('evidence').hidden=true;$('query-status').textContent=live?'Running the query…':'Revealing the saved result…';
 try{
  if(live){const response=await fetch('/api/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql})});const data=await response.json();if(!response.ok||data.error)throw new Error(data.error||'Query failed');show(data,sql);}
  else show(cases[index].result,cases[index].sql);
 }catch(error){$('query-status').textContent='Query error: '+error.message;}
 finally{busy=false;$('sql').readOnly=!live;for(const id of ['run','case','restore'])$(id).disabled=false;$('next').disabled=index===cases.length-1;$('previous').disabled=index===0;}
});
$('download').addEventListener('click',()=>{
 save();const c=cases[index],n=notes[index];
 const payload={question:c.title,prediction:n.prediction,sql:submittedSQL,result,conclusion:n.conclusion,source:window.TAXI_DISCOVERY.source,sha256:window.TAXI_DISCOVERY.sha256};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=element('a');a.href=url;a.download='taxi-'+c.id+'-investigation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
// Initialize without saving empty controls over the first example.
$('sql').value=cases[0].sql;choose(0);
})();
