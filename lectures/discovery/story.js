(() => {
  'use strict';
  const cases = window.DISCOVERY_CASES || {};
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => Number(value).toLocaleString('en-US', {maximumFractionDigits:1});
  const config = {
    city: {title:'Taxi activity by hour', choices:[['count','Total trips'],['rate','Trips per observed day']],
      note:'Filtered yellow trips, July 2015. Green = weekday; blue = weekend. Each hour has 23 observed weekdays and 8 weekend dates in this snapshot.'},
    weather: {title:'A suspicious July temperature field', choices:[['average','First clue: encoded average'],['range','Reveal minimum and maximum']],
      note:'Central Park, July 2015; °C. Orange = encoded average; green = maximum; blue = minimum. Zeros are preserved for investigation, not certified as measurements.'},
    planets: {title:'What is in the detected planet catalog?', choices:[['count','Planets in the catalog'],['period','With period value (%)'],['radius','With radius value (%)']],
      note:'Discovery years 1990–2024, from a later catalog snapshot. Coverage means a non-null value, not necessarily a direct measurement. This is not the frequency of planets in the universe.'},
    evidence: {title:'TESS → operator → attached evidence', choices:[['operators','Follow the operator edges'],['references','Reveal attached-reference presence']],
      note:'Wikidata statements about one mission. A reference node and a reference URL are different fields. Inspect the result table and source, not just the edge.'}
  };
  const text = (x,y,value,extra='') => `<text x="${x}" y="${y}" ${extra}>${escape(value)}</text>`;
  function chart(id, snapshot, mode) {
    const rows = snapshot.rows.map(values => Object.fromEntries(snapshot.columns.map((name,i)=>[name,values[i]])));
    let body = '', height = 430;
    if (id === 'city' || id === 'weather') {
      const series = id === 'city'
        ? ['Weekday','Weekend'].map((type,i)=>({name:type,color:['#30785b','#326c92'][i],points:rows.filter(r=>r.day_type===type).map(r=>[+r.hour,+(mode==='count'?r.trips:r.trips_per_observed_day)])}))
        : [{name:'Encoded average',color:'#bd572f',points:rows.map(r=>[+r.date.slice(-2),+r.encoded_avg_c])}, ...(mode==='range' ? [
          {name:'Maximum',color:'#30785b',points:rows.map(r=>[+r.date.slice(-2),+r.max_c])},
          {name:'Minimum',color:'#326c92',points:rows.map(r=>[+r.date.slice(-2),+r.min_c])}] : [])];
      const maximum = Math.max(1,...series.flatMap(s=>s.points.map(p=>p[1]))) * 1.12;
      const minimum = Math.min(0,...series.flatMap(s=>s.points.map(p=>p[1]))) - (id==='weather'?2:0);
      const minX=id==='city'?0:1,maxX=id==='city'?23:31;
      const x=v=>85+(v-minX)/(maxX-minX)*735, y=v=>340-(v-minimum)/(maximum-minimum)*245;
      body += text(85,30,id==='city'?(mode==='count'?'Trips in July 2015':'Trips per observed day'):'Temperature (°C)','font-size="16" font-weight="600"');
      series.forEach((s,i)=>{body+=`<line x1="${85+i*230}" y1="56" x2="${111+i*230}" y2="56" stroke="${s.color}" stroke-width="3"/>`+text(120+i*230,61,s.name,'font-size="14"');});
      for(let i=0;i<=4;i++) { const value=minimum+(maximum-minimum)*i/4, py=y(value);
        body+=`<line x1="85" y1="${py}" x2="820" y2="${py}" stroke="#dbe2db"/>`+text(75,py+4,number(value),'text-anchor="end" font-size="12"');
      }
      (id==='city'?[0,4,8,12,16,20,23]:[1,5,10,15,20,25,31]).forEach(v=>{body+=text(x(v),365,v,'text-anchor="middle" font-size="13"');});
      body+=text(455,403,id==='city'?'Pickup hour as stored in the hosted table':'Day of July 2015','text-anchor="middle" font-size="14"');
      series.forEach(s=>{body+=`<polyline fill="none" stroke="${s.color}" stroke-width="3" points="${s.points.map(p=>`${x(p[0])},${y(p[1])}`).join(' ')}"/>`;
        s.points.forEach(p=>{body+=`<circle cx="${x(p[0])}" cy="${y(p[1])}" r="3" fill="${s.color}"><title>${escape(`${s.name}, ${id==='city'?'hour':'day'} ${p[0]}: ${number(p[1])}`)}</title></circle>`;});
      });
    } else if (id === 'planets') {
      height=110+rows.length*42;
      const value=r=>mode==='count'?+r.planets:100*+(mode==='period'?r.with_period:r.with_radius)/+r.planets;
      const max=mode==='count'?Math.max(...rows.map(value)):100;
      body+=text(280,30,mode==='count'?'Catalog count':'Percent of each method’s catalog rows','font-size="16" font-weight="600"');
      rows.forEach((r,i)=>{const y=58+i*42,w=value(r)/max*490;
        body+=text(264,y+19,r.discoverymethod,'text-anchor="end" font-size="13"');
        body+=`<rect x="280" y="${y}" width="490" height="27" rx="3" fill="#e4ece4"/><rect x="280" y="${y}" width="${w}" height="27" rx="3" fill="#30785b"><title>${escape(`${r.discoverymethod}: ${number(value(r))}${mode==='count'?' planets':'%'}; denominator ${number(r.planets)}`)}</title></rect>`;
        body+=text(785,y+19,number(value(r))+(mode==='count'?'':'%'),'font-size="14"');
      });
      body+=text(280,height-12,'A small group can have 100% coverage; inspect its count.','font-size="13"');
    } else {
      const grouped = [...new Set(rows.map(r=>r.statement))].map(statement=>rows.filter(r=>r.statement===statement));
      height=Math.max(340,100+grouped.length*130);
      const center=height/2;
      body+=`<rect x="25" y="${center-35}" width="140" height="70" rx="9" fill="#e1eee4" stroke="#30785b"/>`+text(95,center+5,'TESS · Q1323537','text-anchor="middle" font-size="15"');
      grouped.forEach((group,i)=>{const y=65+i*130, label=group[0].operatorLabel;
        body+=`<path d="M 165 ${center} L 270 ${y+30}" stroke="#8ea397" fill="none" stroke-width="2"/>`;
        body+=`<rect x="270" y="${y}" width="360" height="68" rx="7" fill="#f1f5ef" stroke="#8ea397"/>`;
        const words=label.split(' '),lines=['']; words.forEach(word=>{if((lines.at(-1)+' '+word).trim().length>35)lines.push(word);else lines[lines.length-1]=(lines.at(-1)+' '+word).trim();});
        lines.forEach((line,j)=>{body+=text(450,y+24+j*20,line,'text-anchor="middle" font-size="14"');});
        if(mode==='references') { const hasReference=group.some(r=>r.reference),hasURL=group.some(r=>r.referenceURL);
          body+=`<line x1="630" y1="${y+30}" x2="675" y2="${y+30}" stroke="#8ea397" stroke-width="2"/>`;
          body+=text(687,y+22,hasReference?'Reference attached':'No attached reference','font-size="13"');
          body+=text(687,y+43,hasURL?'Source URL returned':group.some(r=>r.importURL)?'Wikimedia import URL':'No source URL returned','font-size="12"');
        }
      });
      body+=text(25,height-20,'Edges represent operator statements; reference presence does not certify truth.','font-size="14"');
    }
    return `<svg viewBox="0 0 900 ${height}" role="img" aria-labelledby="${id}-chart-title ${id}-chart-desc"><title id="${id}-chart-title">${escape(config[id].title)}</title><desc id="${id}-chart-desc">${escape(config[id].note)} Full values are available in the result table and CSV.</desc>${body}</svg>`;
  }
  for(const section of document.querySelectorAll('[data-case]')) {
    const id=section.dataset.case,snapshot=cases[id],panel=section.querySelector('.query-card');
    if(!snapshot){panel.textContent='The saved result is unavailable. Use the hosted service and query file from the course repository.';continue;}
    const sqlURL='queries/'+snapshot.query_file;
    const liveURL=id==='planets'?snapshot.endpoint+'?'+new URLSearchParams({query:snapshot.query,format:'json'}):id==='evidence'?'https://query.wikidata.org/#'+encodeURIComponent(snapshot.query):'https://sql.clickhouse.com/';
    panel.innerHTML=`<h3>Open the case file</h3><p class="small">Saved evidence · ${escape(snapshot.retrieved_at)} · ${snapshot.rows.length} result rows. No live request runs when you open this page.</p>
      <details><summary>Inspect the ${id==='evidence'?'SPARQL':id==='planets'?'ADQL':'SQL'} query</summary><pre><code>${escape(snapshot.query)}</code></pre></details>
      <div class="actions"><button class="btn copy" type="button">Copy query</button><a class="btn" href="${escape(liveURL)}" target="_blank" rel="noopener">${id==='planets'?'Run at NASA (JSON)':id==='evidence'?'Open Wikidata query':'Open ClickHouse editor'}</a><a href="${sqlURL}" download>Query file</a><span class="copy-status" role="status"></span></div>
      <p class="small">${id==='city'||id==='weather'?'Paste the query into the hosted editor and run it; select the fully qualified table shown in the query. ':id==='planets'?'The NASA link runs this exact query on its hosted service and returns JSON. Change its query parameter or use the archive’s table interface to explore further. ': 'The Wikidata link opens this query in the editor; press Run there. '}Use saved evidence below for a common baseline.</p>
      <button class="btn reveal" type="button" aria-expanded="false" aria-controls="${id}-result">Reveal saved evidence</button>
      <div class="result" id="${id}-result" hidden><div class="actions"><label for="${id}-view">View</label><select id="${id}-view">${config[id].choices.map(([value,label])=>`<option value="${value}">${escape(label)}</option>`).join('')}</select></div><div class="chart"></div><p class="caption">${escape(config[id].note)}</p>
      <details><summary>Inspect every result row</summary><div class="table-scroll" tabindex="0" role="region" aria-label="${escape(config[id].title)} result table"><table><thead><tr>${snapshot.columns.map(c=>`<th scope="col">${escape(c)}</th>`).join('')}</tr></thead><tbody>${snapshot.rows.map(row=>`<tr>${row.map(v=>`<td>${v===null?'NULL':/^https?:\/\//.test(String(v))?`<a href="${escape(v)}" target="_blank" rel="noopener">${escape(v)}</a>`:escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
      <p><a href="snapshots/${id}.csv" download>Download result CSV</a> · <a href="snapshots/${id}.json" download>Query, timestamp, hashes + result JSON</a></p></div>`;
    const select=panel.querySelector('select'),render=()=>{panel.querySelector('.chart').innerHTML=chart(id,snapshot,select.value);};
    select.addEventListener('change',render);render();
    panel.querySelector('.reveal').addEventListener('click',event=>{const result=panel.querySelector('.result');result.hidden=!result.hidden;event.currentTarget.setAttribute('aria-expanded',String(!result.hidden));event.currentTarget.textContent=result.hidden?'Reveal saved evidence':'Hide saved evidence';});
    panel.querySelector('.copy').addEventListener('click',async()=>{const status=panel.querySelector('.copy-status');try{await navigator.clipboard.writeText(snapshot.query);status.textContent='Query copied.';}catch{panel.querySelector('details').open=true;status.textContent='Select and copy the query text above.';}});
  }
})();
