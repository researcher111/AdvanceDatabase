/* Shared audience framing, applied after the authored diagrams and teaching notes.
 * The original stable scene IDs, object keys, build order, and timing survive. */
(function () {
  'use strict';
  const V=window.DeckViz,P=V.palette;
  const hiddenHeadings=new Set(['cover','title','heading','title0','title1','title2']);
  function wrap(text,max){const lines=[''];for(const word of text.split(/\s+/)){const n=lines.length-1;if((lines[n]+' '+word).trim().length>max&&lines[n])lines.push(word);else lines[n]=(lines[n]+' '+word).trim();}return lines;}
  for(const [id,scenes] of Object.entries(window.CourseClarityCaptions)) {
    const deck=window.COURSE_DECKS[id];if(!deck)continue;
    for(const scene of deck.scenes){
      const captions=scenes[scene.id];
      if(!captions||captions.length!==scene.steps)throw new Error('Missing clarity captions: '+id+'/'+scene.id);
      const native=scene.clarityNative,oldDraw=scene.draw;
      const [left,top,right,bottom]=window.CourseClarityLayout[id+'/'+scene.id];
      const scale=Math.min(1,1180/(right-left),446/(bottom-top));
      const tx=640-scale*(left+right)/2,ty=428-scale*(top+bottom)/2;
      const audienceTitle=scene.kind==='definition'?scene.term:scene.title;
      const definition=scene.kind==='definition'?scene.term+': '+scene.definition:'';
      scene.kind='visual';scene.clarityTitle=audienceTitle;scene.clarityCaptions=captions;
      scene.draw=(d,step)=>{
        const original=new V.Drawing();oldDraw(original,step);
        for(const item of original.items){
          if(!native&&item.tag==='text'&&hiddenHeadings.has(item.key))continue;
          const attrs={...item.attrs};
          if(!native){
            attrs.transform=`translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(5)})`;
            if(item.tag==='text')attrs['font-size']=Math.max(attrs['font-size'],18/scale);
          }
          d.add(item.key,item.tag,attrs,item.text);
        }
        d.text('clarity-title',640,53,audienceTitle,38,P.ink,'middle',650);
        const lines=wrap(captions[step],92);
        lines.forEach((line,i)=>d.text('clarity-caption-'+i,640,lines.length===1?123:110+i*33,line,26,P.ink));
        d.text('clarity-step',640,690,'Step '+(step+1)+' of '+scene.steps+' · '+scene.states[step],21,P.muted);
      };
      // Keep the approachable notes structure and put the visible claim first.
      if(definition)scene.teaching.context=[definition,scene.teaching.context].filter(Boolean).join(' ');
      scene.teaching.builds=scene.teaching.builds.map((cue,i)=>captions[i]+(cue===captions[i]?'':' '+cue));
      scene.notes=[scene.teaching.idea,...scene.teaching.builds,'Ask: '+scene.teaching.question,'Expected answer: '+scene.teaching.answer,scene.teaching.context,scene.teaching.reference].filter(Boolean).join('\n\n');
    }
  }
})();
