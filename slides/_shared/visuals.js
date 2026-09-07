/* Editable diagram primitives. Stable keys identify objects across animation builds. */
(function () {
  'use strict';
  const palette = {bg:'#f7f6f2',ink:'#20352e',muted:'#61716a',line:'#c8d1c9',green:'#30785b',greenLight:'#dcece1',orange:'#c06335',orangeLight:'#f4dfd1',blue:'#356885',blueLight:'#dce9f0',red:'#b84945',redLight:'#f5dedd',white:'#ffffff',purple:'#765785'};
  class Drawing {
    constructor() { this.items = []; this.keys = new Set(); }
    add(key,tag,attrs,text) {
      if(this.keys.has(key)) throw new Error('Duplicate diagram key: '+key);
      this.keys.add(key); this.items.push({key,tag,attrs,text}); return this;
    }
    rect(k,x,y,w,h,fill=palette.white,stroke=palette.line,r=8,sw=2) { return this.add(k,'rect',{x,y,width:w,height:h,rx:r,fill,stroke,'stroke-width':sw}); }
    text(k,x,y,text,size=28,fill=palette.ink,anchor='middle',weight=500) { return this.add(k,'text',{x,y,fill,'font-size':size,'text-anchor':anchor,'font-weight':weight,'dominant-baseline':'middle'},String(text)); }
    circle(k,cx,cy,r,fill=palette.green,stroke='none',sw=2) { return this.add(k,'circle',{cx,cy,r,fill,stroke,'stroke-width':sw}); }
    line(k,x1,y1,x2,y2,stroke=palette.line,width=3,dash='') { return this.add(k,'line',{x1,y1,x2,y2,stroke,'stroke-width':width,'stroke-dasharray':dash,'stroke-linecap':'round'}); }
    arrow(k,x1,y1,x2,y2,stroke=palette.green,width=3) {
      this.line(k,x1,y1,x2,y2,stroke,width);
      const a=Math.atan2(y2-y1,x2-x1),l=12;
      return this.path(k+'-head',`M ${x2-l*Math.cos(a-.45)} ${y2-l*Math.sin(a-.45)} L ${x2} ${y2} L ${x2-l*Math.cos(a+.45)} ${y2-l*Math.sin(a+.45)}`,'none',stroke,width);
    }
    path(k,d,fill='none',stroke=palette.ink,width=3) { return this.add(k,'path',{d,fill,stroke,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round'}); }
    box(k,x,y,w,h,label,fill=palette.white,stroke=palette.line,size=28) { this.rect(k,x,y,w,h,fill,stroke); return this.text(k+'-label',x+w/2,y+h/2,label,size); }
    table(k,x,y,widths,rows,opt={}) {
      const rh=opt.rowHeight||48,fs=opt.fontSize||24;
      rows.forEach((row,r)=>{let cx=x;row.forEach((value,c)=>{
        const header=opt.header!==false&&r===0,hi=(opt.highlightRows||[]).includes(r)||(opt.highlightCols||[]).includes(c);
        const color=header?palette.greenLight:hi?palette.orangeLight:palette.white;
        this.rect(`${k}-${r}-${c}`,cx,y+r*rh,widths[c],rh,color,palette.line,0,1);
        this.text(`${k}-${r}-${c}-text`,cx+widths[c]/2,y+(r+.5)*rh,value,fs,palette.ink,'middle',header?650:450);cx+=widths[c];
      });});return this;
    }
  }
  const NS='http://www.w3.org/2000/svg';
  const runs = new WeakMap();
  function mount(svg,items,{animate=true,label='',description=''}={}) {
    const active=runs.get(svg);if(active) cancelAnimationFrame(active);
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) animate=false;
    const existing=new Map(Array.from(svg.children).filter(el=>el.dataset.key).map(el=>[el.dataset.key,el]));
    const tracks=[]; const wanted=new Set(items.map(i=>i.key));
    for(const [k,el] of existing)if(!wanted.has(k))el.remove();
    for(const item of items) {
      let el=existing.get(item.key),fresh=!el||el.tagName.toLowerCase()!==item.tag;
      if(fresh){if(el)el.remove();el=document.createElementNS(NS,item.tag);el.dataset.key=item.key;svg.append(el);}
      else svg.append(el); // preserve authored layering after every build
      for(const [a,v] of Object.entries(item.attrs)) {
        const prev=el.getAttribute(a);
        if(animate&&!fresh&&typeof v==='number'&&prev!==null&&Number.isFinite(Number(prev))&&Number(prev)!==v)tracks.push({el,a,from:Number(prev),to:v});
        else el.setAttribute(a,v);
      }
      if(item.text!==undefined)el.textContent=item.text;
      if(animate&&fresh){el.style.opacity='0';tracks.push({el,a:'opacity',from:0,to:1,style:true});}
      else el.style.opacity='1';
    }
    svg.setAttribute('aria-label',label);svg.setAttribute('role','img');
    let desc=svg.querySelector('desc');if(!desc){desc=document.createElementNS(NS,'desc');svg.prepend(desc);}desc.textContent=description;
    if(tracks.length){const start=performance.now();function frame(t){const p=Math.min(1,(t-start)/520),ease=1-Math.pow(1-p,3);for(const a of tracks){const v=a.from+(a.to-a.from)*ease;if(a.style)a.el.style[a.a]=v;else a.el.setAttribute(a.a,v);}if(p<1)runs.set(svg,requestAnimationFrame(frame));else runs.delete(svg);}runs.set(svg,requestAnimationFrame(frame));}
  }
  function sceneDrawing(scene,step) {
    const d=new Drawing();scene.draw(d,step);
    if(scene.kind==='definition') {
      d.text('__definition-term',80,87,scene.term||scene.title,46,palette.ink,'start',650);
      const words=(scene.definition||'').split(/\s+/),lines=[''];for(const word of words){let i=lines.length-1;if((lines[i]+' '+word).trim().length>76)lines.push(word);else lines[i]=(lines[i]+' '+word).trim();}
      lines.forEach((line,i)=>d.text('__definition-'+i,80,148+i*36,line,28,palette.muted,'start',400));
    }
    return d.items;
  }
  window.DeckViz={palette,Drawing,mount,sceneDrawing,draw:()=>new Drawing()};
})();
