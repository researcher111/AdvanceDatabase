/* Embed the authored Lecture 13 scenes without creating full slide players.
 * Load after the trace adapter, teaching cues, and course clarity layer.
 * Each instance owns its step. Only a reader action starts a transition. */
(function () {
  'use strict';
  const scriptURL=document.currentScript?.src||new URL('slide-walkthroughs.js',document.baseURI).href;
  const deckURL=new URL('../../slides/lecture-13.html',scriptURL);
  const NS='http://www.w3.org/2000/svg';
  let serial=0;
  const el=(tag,className,text)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  function svg(){
    const node=document.createElementNS(NS,'svg');
    node.setAttribute('viewBox','0 0 1280 720');
    node.setAttribute('width','1280');node.setAttribute('height','720');
    node.setAttribute('preserveAspectRatio','xMidYMid meet');
    return node;
  }
  function initialize(scope=document){
    const V=window.DeckViz,deck=window.COURSE_DECKS?.[13];
    const roots=[...(scope.matches?.('.lecture-walkthrough[data-lecture-scene]')?[scope]:[]),...scope.querySelectorAll('.lecture-walkthrough[data-lecture-scene]')];
    for(const root of roots){
      if(root.dataset.walkthroughReady==='true')continue;
      const scene=deck?.scenes.find(item=>item.id===root.dataset.lectureScene);
      if(!V||!scene){
        if(root.querySelector('.lw-unavailable'))continue;
        const notice=el('p','lw-unavailable','The diagram could not load. ');
        const link=el('a','','Open the lecture slides.');link.href=deckURL.href;
        notice.append(link);root.append(notice);continue;
      }
      root.querySelector('.lw-unavailable')?.remove();
      const id='lecture-walkthrough-'+(++serial),title=scene.clarityTitle||scene.title;
      let step=0;
      root.setAttribute('role','group');root.setAttribute('aria-label',title+' — step-by-step diagram');
      root.dataset.steps=String(scene.steps);

      const screen=el('div','lw-screen'),controls=el('div','lw-controls');
      controls.setAttribute('role','group');controls.setAttribute('aria-label','Diagram step controls');
      const button=(action,text)=>{
        const node=el('button','lw-button',text);node.type='button';node.dataset.action=action;
        node.setAttribute('aria-controls',id+'-drawing');controls.append(node);return node;
      };
      const previous=button('previous','← Previous'),next=button('next','Next →'),reset=button('reset','Reset');
      controls.title='Left and Right change steps. Home returns to the first step. End shows the last step.';
      const progress=el('p','lw-progress');progress.setAttribute('role','status');
      progress.setAttribute('aria-live','polite');progress.setAttribute('aria-atomic','true');
      const viewport=el('div','lw-viewport');viewport.tabIndex=0;
      viewport.setAttribute('role','region');viewport.setAttribute('aria-label',title+' diagram. Scroll horizontally if needed.');
      const drawing=svg();drawing.id=id+'-drawing';viewport.append(drawing);
      const caption=el('p','lw-caption');caption.id=id+'-caption';
      const hint=el('p','lw-hint','Use the buttons to change steps. On a narrow screen, scroll the diagram sideways.');
      viewport.setAttribute('aria-describedby',caption.id);
      screen.append(controls,progress,viewport,caption,hint);

      // A separate final-state drawing prints reliably without changing screen state.
      const print=el('figure','lw-print'),printDrawing=svg(),printCaption=el('figcaption','lw-print-caption');
      const captionAt=n=>scene.clarityCaptions?.[n]||scene.states?.[n]||title;
      const stateAt=n=>scene.states?.[n]||'Step '+(n+1);
      function itemsAt(n){
        return V.sceneDrawing(scene,n).map(item=>item.tag==='a'
          ?{...item,attrs:{...item.attrs,href:new URL(item.attrs.href,deckURL).href}}
          :item);
      }
      function render(animate){
        V.mount(drawing,itemsAt(step),{animate,label:title,description:captionAt(step)});
        progress.textContent=`Step ${step+1} of ${scene.steps}: ${stateAt(step)}`;
        caption.textContent=captionAt(step);
        previous.disabled=reset.disabled=step===0;next.disabled=step===scene.steps-1;
        root.dataset.step=String(step);
      }
      function move(requested){
        const bounded=Math.max(0,Math.min(scene.steps-1,requested));
        if(bounded===step)return;
        step=bounded;render(true);
      }
      previous.addEventListener('click',()=>move(step-1));
      next.addEventListener('click',()=>move(step+1));
      reset.addEventListener('click',()=>move(0));
      controls.addEventListener('keydown',event=>{
        if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
        const target={ArrowLeft:step-1,ArrowRight:step+1,Home:0,End:scene.steps-1}[event.key];
        if(target===undefined)return;
        event.preventDefault();event.stopPropagation();move(target);
      });
      // Let a focused viewport scroll with native keys, without changing reading slides.
      viewport.addEventListener('keydown',event=>{
        if(['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(event.key))event.stopPropagation();
      });
      render(false);
      V.mount(printDrawing,itemsAt(scene.steps-1),{animate:false,label:title+' — final step',description:captionAt(scene.steps-1)});
      printCaption.textContent=`Final step: ${captionAt(scene.steps-1)}`;
      print.append(printDrawing,printCaption);root.append(screen,print);
      root.dataset.walkthroughReady='true';
    }
  }
  window.LectureSlideWalkthroughs=Object.freeze({initialize});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>initialize(),{once:true});
  else initialize();
})();
