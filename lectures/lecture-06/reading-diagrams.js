/* Reuse the slide drawings in the reading without loading the slide player. */
(function () {
  'use strict';
  const V=window.DeckViz,deck=window.COURSE_DECKS?.[6];
  if(!V||!deck)return; // Static SVGs and the surrounding lesson remain readable.
  const headings=new Set(['title','heading','growth-title']);
  const captions=new Set(['caption','operation','growth-caption']);
  const el=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
  document.querySelectorAll('[data-btree-scene]').forEach((root,index)=>{
    const scene=deck.scenes.find(s=>s.id===root.dataset.btreeScene);
    if(!scene)return;
    let step=0,dialog=null,returnFocus=null;
    const panel=el('div','bt-reading-panel');
    const title=el('div','bt-reading-title',scene.title);title.id='bt-reading-title-'+index;
    panel.setAttribute('role','region');panel.setAttribute('aria-labelledby',title.id);
    const controls=el('div','bt-reading-controls');
    const button=(action,text)=>{const b=el('button','btn',text);b.type='button';b.dataset.action=action;controls.append(b);return b;};
    const previous=button('previous','← Previous'),next=button('next','Next →');
    const selectLabel=el('label','bt-reading-select-label','Step '),select=el('select','bt-reading-select');
    scene.states.forEach((state,i)=>{const option=el('option','',`${i+1}. ${state}`);option.value=i;select.append(option);});
    selectLabel.append(select);controls.append(selectLabel);
    const reset=button('reset','Restart'),enlarge=button('enlarge','Enlarge');
    const status=el('p','bt-reading-status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
    const viewport=el('div','bt-reading-viewport');viewport.tabIndex=0;
    viewport.setAttribute('aria-label','Diagram. Scroll horizontally on a narrow screen; use left and right arrow keys to change steps.');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 170 1280 530');viewport.append(svg);
    const hint=el('p','bt-reading-hint','On a narrow screen, scroll the diagram sideways or choose Enlarge.');
    const check=el('details','bt-reading-check'),summary=el('summary','','Pause and predict'),question=el('p',''),answer=el('details','bt-reading-answer'),answerTitle=el('summary','','Expected answer'),answerText=el('p','');
    answer.append(answerTitle,answerText);check.append(summary,question,answer);
    panel.append(title,controls,status,viewport,hint,check);
    root.prepend(panel);root.dataset.ready='true';
    const link=root.querySelector('.bt-slide-link');
    function render(animate=true){
      const drawing=V.sceneDrawing(scene,step);
      title.textContent=drawing.find(i=>headings.has(i.key))?.text||scene.title;
      const caption=drawing.find(i=>captions.has(i.key))?.text||scene.states[step];
      status.textContent=`Step ${step+1} of ${scene.steps}: ${caption}`;
      V.mount(svg,drawing.filter(i=>!headings.has(i.key)&&!captions.has(i.key)),{animate,label:scene.title,description:caption+' '+scene.teaching.idea});
      previous.disabled=reset.disabled=step===0;next.disabled=step===scene.steps-1;select.value=String(step);
      root.dataset.step=String(step);
      const prompt=scene.teaching.checks?.[step]||scene.teaching;
      question.textContent=prompt.question;answerText.textContent=prompt.answer;answer.open=false;
      if(link)link.href=`../../slides/lecture-06.html#s=${deck.scenes.indexOf(scene)+1}&b=${step+1}`;
    }
    function move(n){step=Math.max(0,Math.min(scene.steps-1,n));render();}
    previous.addEventListener('click',()=>move(step-1));next.addEventListener('click',()=>move(step+1));reset.addEventListener('click',()=>move(0));select.addEventListener('change',()=>move(Number(select.value)));
    panel.addEventListener('keydown',event=>{
      // Native select type-ahead and arrow keys must not navigate the reading.
      event.stopPropagation();
      if(event.target.tagName==='SELECT')return;
      if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(step+(event.key==='ArrowRight'?1:-1));}
    });
    enlarge.addEventListener('click',()=>{
      returnFocus=document.activeElement;
      dialog=el('dialog','bt-reading-dialog');dialog.setAttribute('aria-labelledby',title.id);
      dialog.addEventListener('keydown',event=>event.stopPropagation());
      const close=el('button','btn bt-reading-close','Close enlarged diagram');close.type='button';
      close.addEventListener('click',()=>dialog.close());dialog.append(close,panel);document.body.append(dialog);
      dialog.addEventListener('close',()=>{root.prepend(panel);enlarge.hidden=false;dialog.remove();dialog=null;returnFocus?.focus();});
      enlarge.hidden=true;dialog.showModal();close.focus();
    });
    render(false);
  });
})();
