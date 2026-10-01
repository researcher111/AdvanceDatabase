(function () {
"use strict";
/* Hand-drawn, editable, deterministic lecture diagrams. */
const P = window.DeckViz.palette;
const tx=(d,k,x,y,t,z=28,c=P.ink)=>d.text(k,x,y,t,z,c);
function chip(d,k,x,y,t,fill=P.white,w=72,h=52){d.box(k,x,y,w,h,String(t),fill,P.line,26);}
function line(d,k,x1,y1,x2,y2,c=P.green){d.arrow(k,x1,y1,x2,y2,c,4);}
function dotgrid(d,k,x,y,n,cols,active=0,w=23,gap=8){for(let i=0;i<n;i++)d.rect(k+i,x+(i%cols)*(w+gap),y+Math.floor(i/cols)*(w+gap),w,w,i<active?P.green:P.white,P.line,3);}
function treeNode(d,k,x,y,keys,leaf=false,hi=-1){const w=Math.max(86,keys.length*62+20);d.rect(k,x-w/2,y,w,62,leaf?P.greenLight:P.white,P.green,9);keys.forEach((v,i)=>{if(i===hi)d.rect(k+'hi'+i,x-w/2+10+i*62,y+8,58,46,P.orangeLight,P.orange,5);tx(d,k+'k'+i,x-w/2+40+i*62,y+40,v,26);});return w;}
function branch(d,k,x,y,xx,yy){d.line(k,x,y,xx,yy,P.line,3);}
function heap(d,k,x,y,rows=6,cols=8,sel=[]){for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const i=r*cols+c;d.rect(k+i,x+c*53,y+r*43,45,35,sel.includes(i)?P.orangeLight:P.white,sel.includes(i)?P.orange:P.line,4);}}
function bank(d,k,a,b,y=260){d.rect(k+'a',150,y,350,230,P.greenLight,P.green,18);d.rect(k+'b',780,y,350,230,P.blueLight,P.blue,18);tx(d,k+'al',325,y+55,'A',30);tx(d,k+'bl',955,y+55,'B',30);tx(d,k+'av',325,y+145,'$'+a,62);tx(d,k+'bv',955,y+145,'$'+b,62);tx(d,k+'sum',640,y+265,'Σ '+(a+b),38,a+b===150?P.green:P.red);}
function layer(d,k,x,y,w,label,color=P.blueLight){d.rect(k,x,y,w,95,color,P.line,12);tx(d,k+'t',x+w/2,y+56,label,26);}
function timeline(d,k,x,y,labels,step,spacing=165){d.line(k+'line',x,y,x+(labels.length-1)*spacing,y,P.line,5);labels.forEach((t,i)=>{d.circle(k+'c'+i,x+i*spacing,y,22,i<=step?P.green:P.white,P.line,2);tx(d,k+'t'+i,x+i*spacing,y+63,t,23);});d.circle(k+'moving',x+Math.min(step,labels.length-1)*spacing,y,12,P.orange);}
function flow(d,k,names,step,y=310){names.forEach((name,i)=>{const x=110+i*245;d.box(k+i,x,y,200,110,name,i===step?P.greenLight:P.white,P.line,28);if(i<names.length-1)line(d,k+'a'+i,x+208,y+55,x+237,y+55);});d.circle(k+'dot',150+Math.min(step,names.length-1)*245,y+160,15,P.orange);}
function bars(d,k,labels,vals,step,x=180,y=210,w=780,max=null){const m=max||Math.max(...vals);labels.forEach((l,i)=>{tx(d,k+'l'+i,x,y+i*125+20,l,26);d.rect(k+'b'+i,x+130,y+i*125-18,Math.max(4,(step?vals[i]:0)/m*w),60,i===0?P.orange:P.green,'none',6);if(step)tx(d,k+'v'+i,x+130+(vals[i]/m*w)+55,y+i*125+22,vals[i].toLocaleString(),26);});}
function clock(d,k,x,y,angle){d.circle(k,x,y,54,P.white,P.line,3);d.line(k+'hand',x,y,x+34*Math.cos(angle),y+34*Math.sin(angle),P.orange,5);}
function title(d,words,visual){words.forEach((w,i)=>tx(d,'title'+i,640,120+i*60,w,52));visual();}
function versions(d,step,y=295){const vv=[120,70,50];vv.forEach((v,i)=>{d.rect('v'+i,130+i*350,y,290,170,i===step?P.greenLight:P.white,i===step?P.green:P.line,14,3);tx(d,'balance'+i,275+i*350,y+62,v,44);tx(d,'xmin'+i,275+i*350,y+113,'xmin '+[100,103,107][i],24);tx(d,'xmax'+i,275+i*350,y+146,'xmax '+[103,107,'—'][i],24);if(i<2)line(d,'chain'+i,432+i*350,y+85,466+i*350,y+85);});d.circle('reader',275+step*350,y+230,25,P.blue);line(d,'read',275+step*350,y+200,275+step*350,y+180,P.blue);}
const draws={
6:[
(d,s)=>title(d,['B+ trees'],()=>{heap(d,'h',120,300,5,8,s? [14]:[]);treeNode(d,'r',920,290,[36]);treeNode(d,'l',800,460,[28,31],true);treeNode(d,'rr',1060,460,[36,39],true);branch(d,'bl',920,352,800,460);branch(d,'br',920,352,1060,460);if(s)line(d,'link',790,520,435,360,P.orange);}),
(d,s)=>{tx(d,'query',640,150,'Find uid = 77777',40);heap(d,'h',170,220,6,18,Array.from({length:[0,54,108][s]},(_,i)=>i));tx(d,'counter',640,540,['Start the scan','50,000 rows checked','100,000 rows checked'][s],38);tx(d,'blocks',640,598,['The heap is not ordered by uid','147 of 294 heap blocks visited','All 294 heap blocks visited'][s],29);tx(d,'caption',640,660,'Schematic: each square represents part of the table.',23,P.muted);},
(d,s)=>{tx(d,'heading',640,150,'Value → row address → row',42);d.box('key',85,285,230,115,'GPA 36',P.greenLight,P.green,34);if(s>=1){line(d,'a',330,342,465,342);d.box('rid',485,285,290,115,'(0, 4)',P.orangeLight,P.orange,38);tx(d,'rid-caption',630,465,'block 0, slot 4',28);}if(s>=2){line(d,'b',790,342,915,342);d.box('row',935,285,250,115,'eli, GPA 36',P.blueLight,P.blue,30);}tx(d,'meaning',640,575,['The search key is a field value.','The index returns a RID: a row address.','The table scan uses that address to fetch the row.'][s],30);},
(d,s)=>{tx(d,'op',640,135,['Find one value: key = 31','Insert a new key','Find a range: 31 through 37'][s],39);const rows=[['Structure',['Lookup work','Insertion work','Range work'][s]],['Heap',['Scan rows','Find a free slot','Scan rows'][s]],['Sorted array',['Binary search','May shift many entries','Find start, read forward'][s]],['Hash index',['Choose a bucket','Update a bucket','No key order to follow'][s]],['B+ tree',['Follow one tree path','Insert; split if needed','Find start, follow leaves'][s]]];d.table('choices',150,220,[310,670],rows,{rowHeight:75,fontSize:28});},
(d,s)=>{treeNode(d,'single',640,300,[1,2,3,4].slice(0,s+1),true);tx(d,'root-label',640,235,'The root is also the only leaf.',30);tx(d,'capacity',640,450,(s+1)+' of 4 key slots used',36);tx(d,'rule',640,550,s===3?'Four keys fit. The next distinct key needs a split.':'Keep the leaf keys in sorted order.',29);},
(d,s)=>{treeNode(d,'root',640,205,[36]);branch(d,'a',640,267,350,420);branch(d,'b',640,267,930,420);treeNode(d,'left',350,420,[28,31,34],true);treeNode(d,'right',930,420,[36,37,39],true);tx(d,'root-label',640,155,'Root: the separator gives directions',30);tx(d,'left-label',315,330,'below 36',29);tx(d,'right-label',960,330,'36 or above',29);if(s>0){line(d,'chain',478,515,800,515);tx(d,'chain-label',640,560,'next leaf',24,P.green);}if(s>1){tx(d,'rid',640,625,'Leaf entry: 36 → [(0, 4)]',30,P.orange);}else tx(d,'leaf-label',640,625,'Both leaves are one step below the root.',29);},
(d,s)=>{if(s===0){treeNode(d,'left',640,360,[28,31,37,39],true);chip(d,'new',595,160,36,P.orangeLight,90);}else{treeNode(d,'left',380,440,s===1?[28,31]:[28,31,34],true);treeNode(d,'right',900,440,[36,37,39],true);treeNode(d,'root',640,220,[36]);branch(d,'l',640,282,380,440);branch(d,'r',640,282,900,440);line(d,'chain',475,545,775,545);if(s===1){d.path('copy','M 900 420 Q 950 260 700 250','none',P.orange,4);}}},
(d,s)=>{treeNode(d,'root',640,175,[36],false,s>0?0:-1);treeNode(d,'l',370,395,[28,31,34],true,s===3?2:-1);treeNode(d,'r',910,395,[36,37,39],true,s===2?1:-1);branch(d,'al',640,237,370,395);branch(d,'ar',640,237,910,395);tx(d,'query',200,130,s===3?'35?':'37?',42);d.circle('search',s===0?200:s===1?640:s===2?910:370,s===0?190:s===1?145:360,18,P.orange);if(s===2){line(d,'rid',910,475,910,550,P.orange);chip(d,'heaprow',810,565,'(0, 2)',P.orangeLight,200);}},
(d,s)=>{treeNode(d,'root',640,175,[36]);treeNode(d,'l',350,365,[28,31,34],true);treeNode(d,'r',920,365,[36,37,39],true);branch(d,'a',640,237,350,365);branch(d,'b',640,237,920,365);line(d,'chain',480,440,775,440);tx(d,'range',200,125,'[31, 37]',38);const list=[31,34,36,37];list.slice(0,s===0?0:s===1?2:4).forEach((v,i)=>chip(d,'out'+i,390+i*110,550,v,P.orangeLight));d.circle('cursor',s===0?640:s===1?350:920,s===0?150:330,18,P.orange);if(s===3)tx(d,'stop',1080,500,'39 > 37',28,P.red);},
(d,s)=>{treeNode(d,'root',640,180,s<2?[3]:[3,5]);const leaves=s<2?[[1,2],s===0?[3,4,5]:[3,4,5,6]]:[[1,2],[3,4],[5,6,7]];leaves.forEach((ks,i)=>{let x=leaves.length===2?380+i*520:260+i*380;branch(d,'br'+i,640,242,x,405);treeNode(d,'leaf'+i,x,405,ks,true);});if(s<2)chip(d,'in',595,550,s===0?'6?':'7?',P.orangeLight,90);},
(d,s)=>{const root=s===0?[3,5,7,9]:s===1?[3,5,7,9,11]:[7];treeNode(d,'root',640,150,root);if(s<2){const xx=s===0?[170,380,590,800,1050]:[160,350,540,730,920,1110];xx.forEach((x,i)=>{branch(d,'b'+i,640,212,x,420);const ks=s===0&&i===4?[9,10,11,12]:s===1&&i===5?[11,12,13]:[i*2+1,i*2+2];treeNode(d,'leaf'+i,x,420,ks,true);});if(s===1)tx(d,'over',640,300,'5 > 4',42,P.orange);}else{treeNode(d,'left',345,320,[3,5]);treeNode(d,'right',930,320,[9,11]);branch(d,'i1',640,212,345,320);branch(d,'i2',640,212,930,320);[160,350,540,730,920,1110].forEach((x,i)=>{branch(d,'b'+i,i<3?345:930,382,x,520);treeNode(d,'leaf'+i,x,520,i===5?[11,12,13]:[i*2+1,i*2+2],true);});}},
(d,s)=>{const heights=[16,7,4];const h=heights[s];tx(d,'f',990,300,['2','20','200'][s],70,P.green);tx(d,'symbol',990,375,'children',26);for(let i=0;i<h;i++){const width=140+(i/(h-1))*530;d.rect('level'+i,450-width/2,255+i*(315/h),width,Math.min(46,240/h),P.greenLight,P.green,5);}tx(d,'h',990,495,[27,7,4][s]+' levels',36);if(s===0)tx(d,'ellipsis',450,602,'⋮',38);},
(d,s)=>{tx(d,'title',640,125,'Four node visits can mean fewer disk reads',39);const labels=['root','internal','internal','leaf'];labels.forEach((label,i)=>{const y=200+i*95;d.box('node'+i,195,y,280,70,label,i<2?P.blueLight:P.greenLight,i<2?P.blue:P.green,28);if(i<3)line(d,'a'+i,335,y+74,335,y+90);tx(d,'status'+i,730,y+45,i<2?'already in the buffer pool':s===0?'is this page cached?':i===2?'cached in this example':'read if not cached',27);});if(s>=2){d.line('heap-down',335,555,335,605,P.orange,4);d.line('heap-across',335,605,1085,605,P.orange,4);line(d,'heap-arrow',1085,605,1085,575,P.orange);d.box('heap',975,475,220,90,'heap row',P.orangeLight,P.orange,29);tx(d,'rid-label',710,580,'follow the RID',25,P.orange);}tx(d,'foot',640,655,'Lab 6 keeps every tree node in memory; heap pages use the buffer pool.',24,P.muted);},
(d,s)=>{d.box('row',480,120,320,100,'+ row',P.greenLight,P.green,36);d.box('heap',480,335,320,100,'heap',P.white,P.line,30);line(d,'a',640,230,640,322);const count=s+1;for(let i=0;i<count;i++){const x=200+i*290;treeNode(d,'index'+i,x,550,[i+1],true);line(d,'b'+i,640,440,x,530,P.orange);}tx(d,'writecount',1035,180,(count+1)+' structures',29);},
(d,s)=>{heap(d,'heap',550,190,8,11,s===0?[25]:s===1?[2,8,17,29,37,44,57,63]:Array.from({length:88},(_,i)=>i));treeNode(d,'idx',235,250,[35]);for(let i=0;i<(s===0?1:s===1?6:15);i++)line(d,'jump'+i,280,320,570+(i*137)%550,205+(i*83)%300,P.orange);tx(d,'sel',235,455,['1%','20%','99%'][s],50);if(s===2)line(d,'scan',570,585,1115,585,P.green);},
(d,s)=>{treeNode(d,'root',640,150,[36]);treeNode(d,'l',350,360,[28,31,34],true);treeNode(d,'r',910,360,s<2?[37,39]:[36,37,39],true);branch(d,'a',640,212,350,360);branch(d,'b',640,212,910,360);line(d,'c',470,450,790,450);tx(d,'range',640,560,'[34, 37]',38);if(s===1)d.circle('gap',818,389,28,P.orangeLight,P.red,4);if(s===2)tx(d,'fix',640,620,'34  36  37',34,P.green);},
(d,s)=>{if(s===0){treeNode(d,'node',640,320,[1,2,3,4],true);chip(d,'new',600,150,5,P.orangeLight);}else{treeNode(d,'root',640,180,[3]);treeNode(d,'l',360,390,[1,2],true);treeNode(d,'r',920,390,[3,4,5],true);branch(d,'a',640,242,360,390);branch(d,'b',640,242,920,390);line(d,'chain',470,495,795,495);if(s===2)d.circle('cursor',960,352,18,P.orange);}}
],
7:[
(d,s)=>{bank(d,'bank',s?10:60,90);if(s===1){line(d,'move',515,365,690,365,P.orange);chip(d,'amount',578,300,50,P.orangeLight);}if(s===2){d.line('cut1',590,305,680,420,P.red,12);d.line('cut2',680,305,590,420,P.red,12);}},
(d,s)=>{d.rect('boundary',110,255,1060,345,P.white,P.green,24,4);bank(d,'b',s===0?100:60,s===0?50:90,285);if(s===2)d.circle('commit',640,365,60,P.greenLight,P.green,4);if(s===2)tx(d,'check',640,384,'✓',54,P.green);},
(d,s)=>{const names=['process','OS cache','storage'];names.forEach((n,i)=>layer(d,'l'+i,180,150+i*145,920,n,i<2?P.blueLight:P.greenLight));[0,1,2].forEach(i=>{if(s===0||(s===1&&i>0)||(s===2&&i===2))chip(d,'data'+i,990,170+i*145,60,P.orangeLight,80);});if(s)tx(d,'fail',640,625,s===1?'kill -9':'power loss',40,P.red);},
(d,s)=>{layer(d,'buffer',110,260,290,'page',P.blueLight);layer(d,'log',490,260,300,'log',P.orangeLight);layer(d,'disk',900,260,270,'disk',P.greenLight);line(d,'a',415,308,475,308);line(d,'b',805,308,885,308);chip(d,'old',s===0?205:595,s===0?410:410,100,P.orangeLight,90);chip(d,'new',s<2?205:990,520,s<2?100:60,P.greenLight,90);if(s>0){tx(d,'sync',640,225,'fsync ✓',32,P.green);}if(s===2)tx(d,'newlabel',245,595,'60',32);},
(d,s)=>{flow(d,'wal',['old value','durable log','data page'],s,300);if(s===1)d.circle('seal',600,505,43,P.greenLight,P.green,3);if(s===2)tx(d,'rule',640,600,'log < page',46,P.green);},
(d,s)=>{const a=s<3?100:60,b=s<3?50:90;bank(d,'b',a,b,175);d.rect('log',505,165,270,400,P.white,P.orange,14);['START','A ← 100','B ← 50','COMMIT'].slice(0,s+1).forEach((t,i)=>chip(d,'log'+i,525,205+i*80,t,P.greenLight,230,58));if(s===1)tx(d,'ram',640,615,'RAM: 60 / 50',30);if(s===2)tx(d,'ram',640,615,'RAM: 60 / 90',30);},
(d,s)=>{bank(d,'b',s>0?10:60,90,245);d.box('undo',465,100,350,88,'A ← 60',P.greenLight,P.green,34);if(s===0){chip(d,'buffer',545,395,10,P.orangeLight,190);line(d,'steal',535,420,480,420,P.orange);}if(s===2){d.line('crash1',590,320,690,430,P.red,12);d.line('crash2',690,320,590,430,P.red,12);tx(d,'noc',640,590,'COMMIT ?',38,P.red);}},
(d,s)=>{const entries=['START 1','A ← 100','B ← 50','COMMIT 1','START 2','A ← 60'];entries.forEach((v,i)=>chip(d,'e'+i,130,105+i*76,v,i===5-s?P.orangeLight:P.white,250,56));line(d,'back',425,540,425,170,P.orange);d.box('a',570,300,240,150,s===0?'A: 10':'A: 60',P.greenLight,P.green,40);d.box('b',890,300,240,150,'B: 90',P.blueLight,P.blue,40);tx(d,'total',850,555,s===0?'Σ 100':'Σ 150',48,s===0?P.red:P.green);if(s>0)d.box('receipt',695,100,310,90,'ROLLBACK 2',P.greenLight,P.green,28);},
(d,s)=>{[10,20,30].forEach((v,i)=>{chip(d,'value'+i,180+i*420,180,v,P.blueLight,150,90);if(i<2)line(d,'change'+i,350+i*420,225,570+i*420,225);});chip(d,'old1',230,425,10,P.orangeLight,150,85);chip(d,'old2',890,425,20,P.orangeLight,150,85);d.circle('cursor',s===0?1100:s===1?965:305,560,20,P.green);tx(d,'result',640,610,s===0?'30':s===1?'20':'10',48);if(s)line(d,'reverse',890,390,380,390,P.orange);},
(d,s)=>{d.box('value',470,280,340,145,s===0?'10 → 60':'60 → 60',P.greenLight,P.green,45);d.path('loop','M 830 330 C 1100 140 210 130 450 330','none',P.orange,5);if(s===1){d.line('cr1',890,235,950,300,P.red,6);d.line('cr2',950,235,890,300,P.red,6);}if(s===2)d.box('done',470,510,340,85,'ROLLBACK ✓',P.white,P.green,30);},
(d,s)=>{d.rect('matrix',325,160,750,430,P.white,P.line,10);d.line('v',700,160,700,590,P.line,3);d.line('h',325,375,1075,375,P.line,3);tx(d,'no-steal',515,115,'NO-STEAL',28);tx(d,'steal',885,115,'STEAL',28);tx(d,'force',195,275,'FORCE',28);tx(d,'no-force',195,495,'NO-FORCE',26);d.circle('page',s===0?510:s===1?885:885,s<2?270:485,32,P.orange);if(s===1)line(d,'evict',1010,270,1180,270,P.orange);if(s===2)tx(d,'commit',885,555,'✓',48,P.green);},
(d,s)=>{d.rect('matrix',325,250,750,360,P.white,P.line,10);d.line('v',700,250,700,610,P.line,3);d.line('h',325,430,1075,430,P.line,3);tx(d,'ns',510,210,'NO-STEAL',28);tx(d,'st',885,210,'STEAL',28);tx(d,'f',190,350,'FORCE',28);tx(d,'nf',190,535,'NO-FORCE',26);const labs=['—','UNDO','REDO','UNDO + REDO'];for(let i=0;i<=s;i++)tx(d,'duty'+i,510+(i%2)*375,350+Math.floor(i/2)*180,labs[i],34,i===0?P.muted:P.green);},
(d,s)=>{tx(d,'micro',195,130,'microdb',32);tx(d,'prod',195,405,'NO-FORCE',29);timeline(d,'micro',350,190,['log','pages','COMMIT'],Math.min(s,2),290);timeline(d,'prod',350,470,['log + commit','reply','pages'],Math.min(s,2),290);if(s>0){d.circle('ack1',930,290,27,P.greenLight,P.green);d.circle('ack2',640,580,27,P.greenLight,P.green);tx(d,'c1',930,300,'✓',30,P.green);tx(d,'c2',640,590,'✓',30,P.green);}},
(d,s)=>{for(let i=0;i<12;i++)chip(d,'rec'+i,110+i*88,145,100+i,P.white,70,60);d.line('checkpoint',548,95,548,250,P.orange,5);tx(d,'checkpoint-label',555,290,'checkpoint',28);flow(d,'aries',['analysis','redo','undo'],s,395);d.circle('lsn',s===0?110:s===1?600:1090,235,16,P.orange);},
(d,s)=>{timeline(d,'cuts',180,245,['log','fsync','page','COMMIT'],s,295);[0,1,2,3].forEach(i=>{tx(d,'number'+i,180+i*295,140,i+1,40);});d.path('lightning','M '+(180+s*295)+' 375 l -28 42 h 24 l -20 40 l 54 -54 h -28 z',P.red,P.red,2);if(s>0)d.box('outcome',420,535,440,85,s===3?'keep':'undo if flushed',s===3?P.greenLight:P.orangeLight,P.line,32);},
(d,s)=>{flow(d,'last',['log','page','commit'],s,210);d.path('undo','M 910 450 C 700 650 280 620 215 455','none',P.orange,5);if(s===2){d.circle('done',1040,505,58,P.greenLight,P.green,3);tx(d,'tick',1040,526,'✓',60,P.green);}}
],
8:[
(d,s)=>title(d,['Concurrency'],()=>{d.box('a',180,320,280,130,'+10',P.blueLight,P.blue,42);d.box('b',820,320,280,130,'+10',P.orangeLight,P.orange,42);line(d,'aa',470,385,580,475);line(d,'bb',810,385,700,475,P.orange);d.circle('account',640,510,73,P.greenLight,P.green,4);tx(d,'balance',640,530,s?'110':'100',48);}),
(d,s)=>{d.circle('a',240,250,66,P.blueLight,P.blue,3);d.circle('b',1040,250,66,P.orangeLight,P.orange,3);tx(d,'plus1',240,268,'+10',40);tx(d,'plus2',1040,268,'+10',40);d.box('account',455,405,370,150,s===0?'100':s===1?'110':'120',P.greenLight,P.green,62);line(d,'a1',290,310,470,410,P.blue);line(d,'a2',990,310,810,410,P.orange);},
(d,s)=>{const rows=[['T1',100,110,110],['T2',100,110,110]];rows.forEach((r,i)=>{tx(d,'t'+i,150,235+i*230,r[0],34);['read','+10','write'].forEach((label,j)=>{chip(d,'op'+i+j,285+j*295,170+i*230,s>j?r[j+1]:label,i?P.orangeLight:P.blueLight,210,85);if(j<2)line(d,'arr'+i+j,505+j*295,215+i*230,567+j*295,215+i*230,i?P.orange:P.blue);});});if(s===3)tx(d,'sum',640,620,'110 ≠ 120',48,P.red);},
(d,s)=>{const left=s===1?'T2':'T1',right=s===1?'T1':'T2';flow(d,'serial',[left,right,'120'],2,305);if(s===2){d.path('swap','M 235 535 C 550 415 570 620 820 510','none',P.orange,5);tx(d,'result',1060,555,'✓',62,P.green);}},
(d,s)=>{const modes=[['70','↶','70?'],['100','✓ 70','70'],['● ● ●','+ ●','● ● ● ●']];const labels=['Dirty read','Non-repeatable','Phantom'];tx(d,'newterm',640,125,labels[s],38);modes[s].forEach((t,i)=>{d.box('phase'+i,120+i*375,265,290,145,t,i===1?P.orangeLight:P.blueLight,P.line,38);if(i<2)line(d,'a'+i,423+i*375,338,480+i*375,338);});if(s===0)d.line('abort',490,470,775,470,P.red,6);},
(d,s)=>{tx(d,'s',270,175,'S',48,P.blue);tx(d,'x',990,175,'X',48,P.orange);d.rect('row',450,240,380,220,P.greenLight,P.green,14);tx(d,'rowlabel',640,365,'row',44);if(s===0){[0,1,2].forEach(i=>{d.circle('reader'+i,150+i*100,550,35,P.blueLight,P.blue,3);line(d,'read'+i,150+i*100,505,520+i*60,475,P.blue);});}else{d.circle('writer',990,555,43,P.orangeLight,P.orange,3);line(d,'write',990,500,780,475,P.orange);d.line('gate',395,200,395,505,P.red,7);tx(d,'denied',270,400,'×',70,P.red);}},
(d,s)=>{d.box('row',465,250,350,155,'100',P.greenLight,P.green,56);chip(d,'s1',170,260,'S₁',P.blueLight,110,80);chip(d,'s2',1000,260,'S₂',P.orangeLight,110,80);line(d,'r1',290,300,450,300,P.blue);line(d,'r2',990,300,830,300,P.orange);if(s>0){chip(d,'x1',170,495,'X₁',P.orangeLight,110,80);line(d,'upgrade',225,480,225,355,P.orange);}if(s===2){d.line('conflict',840,225,840,415,P.red,7);tx(d,'abort',640,550,'LockAbortError',38,P.red);}},
(d,s)=>{d.line('time',150,560,1140,560,P.ink,3);d.line('count',150,560,150,260,P.ink,3);const pts=s===0?'M 160 550 L 340 450 L 520 330':s===1?'M 160 550 L 340 450 L 520 330 L 690 330 L 920 550':'M 160 550 L 340 450 L 520 330 L 800 330 L 805 550';d.path('curve',pts,'none',P.green,7);tx(d,'grow',390,610,'acquire',28);tx(d,'shrink',890,610,'release',28);if(s===2){d.line('commit',800,280,800,580,P.orange,4,'8 8');tx(d,'commit-label',800,250,'COMMIT',28,P.orange);}},
(d,s)=>{d.circle('t1',310,270,68,P.blueLight,P.blue,3);d.circle('t2',970,270,68,P.orangeLight,P.orange,3);tx(d,'t1label',310,287,'T1',42);tx(d,'t2label',970,287,'T2',42);chip(d,'a',270,495,'A',P.blueLight,80);chip(d,'b',930,495,'B',P.orangeLight,80);line(d,'holds1',310,350,310,480,P.blue);line(d,'holds2',970,350,970,480,P.orange);if(s>0){line(d,'want1',390,280,940,475,P.blue);line(d,'want2',890,280,340,475,P.orange);}if(s===2){d.line('victim1',910,215,1030,330,P.red,7);d.line('victim2',1030,215,910,330,P.red,7);tx(d,'retry',970,615,'retry',30);}},
(d,s)=>{d.line('range',130,410,1150,410,P.ink,4);[31,35,39].forEach((v,i)=>{d.circle('row'+i,250+i*330,410,28,P.greenLight,P.green,3);tx(d,'v'+i,250+i*330,490,v,30);d.rect('lock'+i,232+i*330,315,36,50,P.blueLight,P.blue,7);});if(s===1)d.circle('new',745,410,26,P.orangeLight,P.orange,3);if(s===2){d.rect('range-lock',180,290,880,175,P.blueLight,P.blue,15,3);[31,35,39].forEach((v,i)=>{d.circle('safe'+i,250+i*330,410,28,P.greenLight,P.green,3);tx(d,'safev'+i,250+i*330,420,v,22);});d.circle('new',745,220,26,P.orangeLight,P.orange,3);d.line('stop',705,260,785,260,P.red,7);}tx(d,'predicate',640,590,'30 < x < 40',40);},
(d,s)=>{const lv=['READ UNCOMMITTED','READ COMMITTED','REPEATABLE READ','SERIALIZABLE'];lv.forEach((l,i)=>d.box('level'+i,115,120+i*130,425,100,l,s===i?P.greenLight:P.white,P.line,27));['dirty','repeat','phantom'].forEach((l,i)=>{tx(d,'name'+i,745+i*165,130,l,24);for(let j=0;j<4;j++)tx(d,'test'+i+j,745+i*165,197+j*130,j>i?'✓':'○',39,j>i?P.green:P.orange);});if(s===2)d.rect('rr',675,420,450,82,'none',P.orange,10,4);},
(d,s)=>{d.rect('old',160,310,340,160,P.blueLight,P.blue,14);tx(d,'oldv',330,405,120,58);if(s>0){d.rect('new',780,310,340,160,P.greenLight,P.green,14);tx(d,'newv',950,405,70,58);line(d,'version',520,390,760,390,P.green);}d.circle('reader',330,555,30,P.blue);line(d,'read',330,515,330,490,P.blue);if(s===2){d.circle('writer',950,555,30,P.orange);line(d,'write',950,515,950,490,P.orange);}},
(d,s)=>versions(d,s,230),
(d,s)=>{tx(d,'rc',275,100,'READ COMMITTED',28);tx(d,'rr',980,100,'REPEATABLE READ',28);[0,1].forEach(i=>{d.line('time'+i,150+i*660,290,525+i*660,290,P.line,5);d.box('first'+i,145+i*660,165,155,90,'120',P.blueLight,P.line,38);d.box('second'+i,385+i*660,375,155,90,s===0?'?':i===0?'70':'120',i===0?P.greenLight:P.blueLight,P.line,38);if(s>0){line(d,'read'+i,222+i*660,265,462+i*660,365,i?P.blue:P.green);}});if(s===2)tx(d,'commit',640,565,'UPDATE → COMMIT',35,P.orange);},
(d,s)=>{for(let i=0;i<8;i++){const kept=s<2||i>4;d.rect('ver'+i,145+i*130,290,105,170,kept?P.greenLight:P.bg,kept?P.green:P.bg,10);if(kept)tx(d,'n'+i,197+i*130,385,100+i,29);}d.circle('old-reader',197,s<2?170:580,30,P.blue);if(s<2)line(d,'retain',197,212,197,270,P.blue);if(s>0){d.path('broom','M 430 550 L 550 470 M 490 485 L 565 540 L 515 590 Z',P.orangeLight,P.orange,4);}if(s===2)tx(d,'gone',480,205,'VACUUM',34,P.green);},
(d,s)=>{[0,1].forEach(i=>{d.circle('doctor'+i,330+i*620,290,55,P.blueLight,P.blue,3);d.path('body'+i,`M ${230+i*620} 445 Q ${330+i*620} 350 ${430+i*620} 445`,'none',P.blue,8);d.circle('on'+i,330+i*620,520,40,s===2?P.red:P.green);tx(d,'status'+i,330+i*620,535,s===2?'0':'1',38,P.white);});if(s>0){line(d,'look1',395,290,885,290,P.blue);line(d,'look2',885,325,395,325,P.orange);}if(s===2)tx(d,'sum',640,625,'Σ = 0',44,P.red);},
(d,s)=>{const words=['pin','latch','lock'];const xs=[265,640,1015];words.forEach((v,i)=>{d.rect('page'+i,xs[i]-130,235,260,235,i===s?P.greenLight:P.white,P.line,12);tx(d,'word'+i,xs[i],170,v,38);});d.path('pin','M 265 305 L 265 415 M 240 305 L 290 305 M 230 350 L 300 350','none',P.blue,8);clock(d,'latch',640,350,s*1.6);d.rect('lockbody',970,335,90,82,P.orangeLight,P.orange,10);d.path('shackle','M 990 335 v -35 q 25 -45 50 0 v 35','none',P.orange,8);if(s===2)line(d,'duration',875,560,1150,560,P.orange);},
(d,s)=>{if(s===0){d.box('sum',415,220,450,150,'110 ≠ 120',P.redLight,P.red,52);line(d,'conflict',360,480,920,480,P.red);}else{d.box('sum',415,220,450,150,'120',P.greenLight,P.green,64);if(s===1){chip(d,'x',585,490,'X',P.orangeLight,110,80);}else versions(d,1,400);}}
],
9:[
(d,s)=>{tx(d,'naive',285,130,'300 × 3',42);tx(d,'pushed',950,130,'60 × 1',42);dotgrid(d,'a',105,210,900,30,s===0?0:900,8,4);dotgrid(d,'b',805,210,60,10,s===0?0:60,8,4);line(d,'out1',485,430,565,545);line(d,'out2',950,340,750,545);d.box('answer',530,555,220,75,s<2?'?':'20',P.greenLight,P.green,42);if(s===2){tx(d,'n1',285,610,'900 pairs',32,P.orange);tx(d,'n2',955,310,'60 pairs',32,P.green);}},
(d,s)=>{d.table('stats',105,275,[110,110],[['N','V'],['300','3']],{rowHeight:60,fontSize:27});d.box('cost',475,310,320,135,'cost',P.blueLight,P.blue,40);line(d,'in',340,365,455,365);[0,1,2].forEach(i=>{d.box('plan'+i,960,255+i*115,190,80,[900,300,60][i],s===2&&i===2?P.greenLight:P.white,P.line,35);});line(d,'out',815,375,940,s===2?523:293+s*115);},
(d,s)=>{d.box('root',475,120,330,100,'join',P.white,P.line,32);d.box('left',180,400,320,105,'60 / 60',s===0?P.greenLight:P.white,P.line,35);d.box('right',800,400,320,105,'1 / 1',s===1?P.greenLight:P.white,P.line,35);line(d,'l',340,385,560,230);line(d,'r',960,385,720,230);if(s===2){tx(d,'out',640,290,'20 / 20',36,P.green);}tx(d,'legend',640,610,'estimate / actual',28,P.muted);},
(d,s)=>{dotgrid(d,'all',140,265,300,20,s>0?60:0,18,5);if(s>0){line(d,'filter',965,350,1130,350);tx(d,'fraction',1060,485,'60 / 300',35);tx(d,'sel',640,605,'0.2',58,P.green);}},
(d,s)=>{for(let i=0;i<20;i++){const x=150+i*45;d.rect('hist'+i,x,230,34,230,i>10&&s>0?P.green:P.line,'none',3);}d.line('threshold',635,195,635,500,P.orange,5);tx(d,'min',150,550,'20',29);tx(d,'cut',635,550,'30',29);tx(d,'max',1040,550,'39',29);if(s===2)tx(d,'result',640,625,'300 × 9/19 × 1/3 ≈ 47',38);},
(d,s)=>{for(let i=0;i<12;i++){const h=s===0?170:40+Math.max(0,5-Math.abs(i-7))*50;d.rect('bar'+i,130+i*80,470-h,60,h,i>5?P.green:P.line,'none',5);}if(s===2){d.circle('city',505,310,95,P.blueLight,P.blue,3);d.circle('state',585,310,185,'none',P.orange,4);tx(d,'citylabel',495,318,'city',27);tx(d,'state-label',700,220,'state',27);}},
(d,s)=>{if(s===0){dotgrid(d,'left',160,245,12,3,12,44,9);dotgrid(d,'right',850,245,12,3,0,44,9);d.path('loop','M 410 300 C 790 80 1100 160 1080 450 C 850 650 480 560 430 440','none',P.orange,5);tx(d,'cost',640,600,'B(L) + N(L) × B(R)',38);}if(s===1){[0,1,2].forEach(i=>d.rect('bucket'+i,540,185+i*130,220,95,P.greenLight,P.green,10));dotgrid(d,'build',160,240,12,3,12,36,8);line(d,'buildarrow',340,325,520,325);dotgrid(d,'probe',945,240,12,3,12,36,8);line(d,'probearrow',925,325,780,325,P.orange);tx(d,'cost',640,625,'B(L) + B(R)',40);}if(s===2){[1,2,3,4,5].forEach((v,i)=>{chip(d,'a'+i,150+i*190,245,v,P.blueLight,95);chip(d,'b'+i,150+i*190,415,v,P.orangeLight,95);line(d,'join'+i,195+i*190,310,195+i*190,400);});tx(d,'cost',640,605,'sort + B(L) + B(R)',40);}},
(d,s)=>{const vals=[13,1003,100003];tx(d,'fraction',640,125,['0.01%','1%','100%'][s],50);const max=100003;const bw=v=>Math.log10(v+1)/Math.log10(max+1)*700;d.box('index-label',100,245,260,90,'index',P.white,P.line,32);d.box('scan-label',100,435,260,90,'scan',P.white,P.line,32);d.rect('indexbar',385,265,bw(vals[s]),50,s===0?P.green:P.orange,'none',6);d.rect('scanbar',385,455,bw(1000),50,s===0?P.orange:P.green,'none',6);tx(d,'iv',1030,365,vals[s].toLocaleString(),38);tx(d,'sv',1030,555,'1,000',38);},
(d,s)=>{if(s===0){d.box('tiny',110,285,190,110,'10 rows',P.blueLight,P.blue,32);treeNode(d,'idx',890,265,[5]);treeNode(d,'leaf',890,460,[2,5],true);line(d,'probe',325,340,785,310,P.orange);branch(d,'b',890,327,890,460);}if(s===1){dotgrid(d,'data',140,225,48,8,48,34,8);[0,1,2,3].forEach(i=>d.box('bucket'+i,850,140+i*130,280,90,i,P.greenLight,P.green,35));line(d,'build',535,350,820,350);}if(s===2){[1,2,2,3].forEach((v,i)=>{chip(d,'l'+i,170+i*260,230,v,P.blueLight,100);chip(d,'r'+i,170+i*260,430,[1,2,2,4][i],P.orangeLight,100);});[1,2].forEach(i=>[1,2].forEach(j=>line(d,'pair'+i+j,220+i*260,292,220+j*260,420,P.green)));}},
(d,s)=>{const first=[300,3000,9000][s];d.box('a',120,110,310,90,['students','students','majors'][s],P.white,P.line,29);d.box('b',850,110,310,90,['majors','enrollments','enrollments'][s],P.white,P.line,29);line(d,'a1',280,215,560,320);line(d,'a2',1000,215,720,320);d.rect('intermediate',220,340,Math.max(40,840*first/9000),105,s===2?P.orange:P.green,'none',9);tx(d,'n',640,310,first.toLocaleString(),44);d.box('final',475,555,330,75,'3,000',P.greenLight,P.green,38);line(d,'finala',640,465,640,545);},
(d,s)=>{const subsets=[['A','B','C','D'],['AB','AC','AD','BC','BD','CD'],['ABC','ABD','ACD','BCD']];for(let r=0;r<=s;r++){const arr=subsets[r],gap=1050/arr.length;arr.forEach((v,i)=>{const x=115+gap*i;d.box('sub'+r+i,x,130+r*190,gap-25,85,v,P.white,P.line,28);if(r>0)line(d,'reuse'+r+i,x+gap/2,130+r*190-15,410+(i%2)*330,215+(r-1)*190,P.green);});}if(s===2){d.circle('property',1130,615,24,P.blueLight,P.blue,3);tx(d,'sort',1015,622,'sorted',25);}},
(d,s)=>{d.box('root',450,95,380,100,'hash join',P.white,P.line,33);d.box('left',180,345,320,100,s===0?'10 / ?':'10 / 10,000',s?P.redLight:P.white,s?P.red:P.line,33);d.box('right',800,345,320,100,'100 / 100',P.white,P.line,33);line(d,'a',340,330,540,210);line(d,'b',960,330,740,210);if(s===2){tx(d,'cause',350,570,'statistics?',35,P.orange);tx(d,'memory',970,570,'memory?',35,P.orange);}tx(d,'legend',640,635,'estimate / actual',25,P.muted);},
(d,s)=>{if(s===0){chip(d,'byte',125,240,8,P.orangeLight,70);line(d,'to-page',210,267,425,267);d.box('page',455,200,420,160,'4,096 B',P.greenLight,P.green,42);clock(d,'fsync',1040,280,0);tx(d,'promise',1040,440,'fsync',30);}else{dotgrid(d,'pool',190,160,50,10,s===1?49:50,65,15);d.circle('active',s===1?990:910,570,25,P.orange);tx(d,'frames',1020,350,s===1?'49':'50',64);tx(d,'hits',1020,455,s===1?'miss':'hit',34,s===1?P.red:P.green);}},
(d,s)=>{if(s===0){d.rect('page',160,150,440,440,P.white,P.green,16);for(let i=0;i<6;i++){d.rect('slot'+i,185,180+i*60,390,45,i===3?P.orangeLight:P.greenLight,P.line,4);tx(d,'slot-n'+i,220,210+i*60,i,22);}tx(d,'rid',950,310,'(block, slot)',36);line(d,'ridarr',800,330,620,383,P.orange);}else{flow(d,'pipe',['scan','filter','project'],s-1,290);d.circle('rowtoken',260+(s-1)*280,490,22,P.orange);tx(d,'pairs',640,625,'900 → 60',48,P.green);}},
(d,s)=>{if(s===0)flow(d,'sql',['tokens','syntax','plan','rows'],1,270);else{treeNode(d,'root',640,140,[36]);treeNode(d,'l',350,360,[28,31,34],true);treeNode(d,'r',920,360,s===1?[37,39]:[36,37,39],true);branch(d,'l1',640,202,350,360);branch(d,'r1',640,202,920,360);line(d,'leafchain',465,465,790,465);tx(d,'rangelabel',640,590,'[34, 37]',38);}},
(d,s)=>{if(s===0){timeline(d,'wal',160,320,['log','fsync','page','COMMIT'],3,310);}else{d.box('t1',130,190,280,105,'100 → 110',P.blueLight,P.blue,36);d.box('t2',870,190,280,105,'100 → 110',P.orangeLight,P.orange,36);line(d,'a',410,310,560,425);line(d,'b',870,310,720,425,P.orange);d.box('result',475,445,330,120,s===1?'110':'X conflict',s===1?P.redLight:P.greenLight,P.line,40);}},
(d,s)=>{const names=['files','buffers','records','iterators','SQL','indexes','WAL','isolation'];names.forEach((v,i)=>{const x=120+(i%4)*290,y=145+Math.floor(i/4)*285;d.box('layer'+i,x,y,240,140,v,i%3===s?P.greenLight:P.white,P.line,28);if(i<3||i>3&&i<7)line(d,'edge'+i,x+245,y+70,x+280,y+70);});}
],
10:[
(d,s)=>title(d,['The analytics stack','In-database machine learning'],()=>{for(let r=0;r<5;r++)for(let c=0;c<9;c++){d.rect('cell'+r+c,200+c*98,300+r*53,83,40,s===0?(r===2?P.orangeLight:P.white):(c===4?P.greenLight:P.white),P.line,5);}}),
(d,s)=>{for(let r=0;r<7;r++)for(let c=0;c<12;c++){const x=s===2?170+r*140:125+c*86,y=s===2?165+c*36:185+r*60;d.rect('cell'+r+c,x,y,s===2?120:70,s===2?26:45,s===0?(r===3?P.orangeLight:P.white):(c===5?P.greenLight:P.white),P.line,4);}if(s===2)tx(d,'rotate',1060,625,'90°',38,P.green);},
(d,s)=>{dotgrid(d,'events',140,265,100,10,s?100:0,29,8);line(d,'agg',550,420,790,420);[3,6,4,8].forEach((n,i)=>d.rect('group'+i,840+i*85,550-n*30,60,s?n*30:5,P.green,'none',6));if(s===2)tx(d,'avg',990,625,'AVG',38);},
(d,s)=>{const values=[[1,3,12.4,0],[2,3,8.1,1],[3,4,22,0],[4,4,9.7,0],[5,5,15.2,1],[6,5,31.9,0]];values.forEach((row,r)=>row.forEach((v,c)=>{chip(d,'c'+r+c,235+c*210,125+r*76,v,s===0?P.white:c===2?P.greenLight:P.orangeLight,175,60);}));if(s===2)tx(d,'used',640,635,'24 → 6',45);},
(d,s)=>{const vals=[[1,2,3,4,5,6],[3,3,4,4,5,5],[12.4,8.1,22,9.7,15.2,31.9],[0,1,0,0,1,0]];vals.forEach((row,r)=>row.forEach((v,c)=>chip(d,'c'+r+c,125+c*177,175+r*100,v,r===2&&s?P.greenLight:P.white,150,74)));if(s===2)tx(d,'ratio',640,635,'6 → 6',45,P.green);},
(d,s)=>{[0,1,2,3].forEach(r=>{for(let c=0;c<6;c++)chip(d,'c'+r+c,135+c*176,130+r*106,r===0?c+1:'•',c===3?P.orangeLight:P.white,145,78);});if(s>0){[0,1,2,3].forEach(r=>line(d,'collect'+r,845,169+r*106,1100,590,P.orange));}if(s===2)d.box('row',400,590,520,65,'4   4   9.7   0',P.greenLight,P.green,34);},
(d,s)=>{for(let i=0;i<12;i++)chip(d,'raw'+i,135+i*82,270,'A',P.blueLight,66,70);if(s>0){line(d,'compress',250,410,1030,410);d.box('packed',s===1?495:175,485,s===1?290:930,80,s===1?'A × 12':'A A A A A A A A A A A A',P.greenLight,P.green,32);}if(s===2)tx(d,'equal',640,625,'=',50,P.green);},
(d,s)=>{for(let i=0;i<24;i++){const v=1+Math.floor(i/8);if(s===0||i%8===0)chip(d,'value'+i,s===0?125+(i%12)*87:270+Math.floor(i/8)*280,s===0?185+Math.floor(i/12)*95:335,v,s===0?P.white:[P.greenLight,P.blueLight,P.orangeLight][v-1],s===0?70:150,65);}if(s>0){['1 × 8','2 × 8','3 × 8'].forEach((v,i)=>d.box('run'+i,210+i*340,470,220,95,v,P.greenLight,P.green,36));}if(s===2)tx(d,'bytes',640,635,'96 B → 24 B',40);},
(d,s)=>{if(s<2){const vals=['card','card','cash','card','cash','card'];vals.forEach((v,i)=>chip(d,'value'+i,150+i*166,230,s===0?v:v==='card'?0:1,P.blueLight,145,80));if(s===1){d.box('dict0',210,440,330,90,'card → 0',P.white,P.line,34);d.box('dict1',740,440,330,90,'cash → 1',P.white,P.line,34);}}else{[4000,4001,4002,4003,4004].forEach((v,i)=>chip(d,'value'+i,150+i*205,200,v,P.blueLight,175,80));d.box('start',165,440,275,100,'4000',P.greenLight,P.green,38);d.box('delta',650,440,440,100,'+1 × 4',P.greenLight,P.green,38);line(d,'deltaa',455,490,620,490);}},
(d,s)=>{[0,1,2].forEach(i=>{d.rect('op'+i,160+i*380,220,230,230,P.white,P.line,15);tx(d,'oplabel'+i,275+i*380,185,['scan','filter','sum'][i],30);});if(s===0)d.circle('single',230,330,20,P.orange);else{const x=s===1?185:945;d.rect('tray',x,265,160,135,P.greenLight,P.green,10);for(let i=0;i<12;i++)d.circle('dot'+i,x+25+(i%4)*36,288+Math.floor(i/4)*41,9,P.green);}line(d,'a',415,335,515,335);line(d,'b',795,335,895,335);tx(d,'batch',640,590,s===0?'1':'2,048',58);},
(d,s)=>{const bounds=[[1,3],[4,7],[8,12]];bounds.forEach((b,i)=>{d.rect('group'+i,130+i*375,265,295,270,s>0&&i<2?P.bg:P.greenLight,s>0&&i<2?P.line:P.green,14);tx(d,'bounds'+i,278+i*375,335,`[${b[0]}, ${b[1]}]`,36);if(s>0&&i<2){d.line('skip'+i,180+i*375,405,380+i*375,480,P.line,5);}else dotgrid(d,'rows'+i,185+i*375,390,8,4,s===2?8:0,31,9);});tx(d,'q',640,150,'x = 10',46);if(s===2)line(d,'open',1050,205,1050,245,P.orange);},
(d,s)=>{for(let i=0;i<12;i++){const x=130+(i%6)*178,y=210+Math.floor(i/6)*215;d.path('folder'+i,`M ${x} ${y+25} v -25 h 55 l 15 25 h 85 v 125 h -155 z`,s&&i!==11?P.bg:P.greenLight,s&&i!==11?P.line:P.green,3);tx(d,'month'+i,x+77,y+88,i+1,32);if(s===2&&i===11)d.rect('fare',x+90,y+45,26,85,P.orange,'none',3);}tx(d,'filter',640,125,'month = 12',44);if(s)tx(d,'files',640,635,'1 / 12',40,P.green);},
(d,s)=>{const widths=[980,980/12,Math.max(7,980/144)];d.rect('bytes',150,250,widths[s],180,P.greenLight,P.green,10);tx(d,'n',640,150,['5.76 MB','0.48 MB','40 KB'][s],60);tx(d,'math',640,545,['60,000 × 12 × 8','60,000 × 8','60,000 × 8 / 12'][s],40);if(s===2)tx(d,'ratio',640,640,'144×',52,P.orange);},
(d,s)=>{d.rect('process',340,150,740,440,P.white,P.blue,22,4);tx(d,'python',720,205,'Python',35);d.box('duck',525,295,370,150,'DuckDB',P.greenLight,P.green,46);['CSV','Parquet','dataframe'].forEach((v,i)=>d.box('src'+i,105,190+i*145,205,85,v,P.white,P.line,27));line(d,'in',325,375,505,375);if(s>0)d.circle('data',s===1?450:935,375,17,P.orange);if(s===2)d.box('df',915,485,250,95,'dataframe',P.blueLight,P.blue,30);},
(d,s)=>{d.rect('storage',120,475,1040,150,P.greenLight,P.green,16);tx(d,'storelabel',640,565,'object storage',36);for(let i=0;i<(s===0?1:s===1?3:2);i++){d.rect('compute'+i,170+i*340,140,260,185,P.blueLight,P.blue,12);dotgrid(d,'cpu'+i,220+i*340,185,6,3,6,31,9);line(d,'reads'+i,300+i*340,345,300+i*340,455,P.blue);}tx(d,'compute-label',640,100,'compute',32);},
(d,s)=>{const files=['a','b','c','d'];files.forEach((v,i)=>chip(d,'file'+i,135+i*275,460,v,i<2?P.blueLight:P.greenLight,160,100));d.box('manifestA',145,275,320,95,'A: a, b',P.blueLight,P.blue,34);if(s>0)d.box('manifestB',815,275,320,95,'B: a, c, d',P.greenLight,P.green,34);line(d,'old',305,385,305,445,P.blue);if(s>0){line(d,'new',970,385,805,445);line(d,'new2',970,385,1090,445);}d.circle('head',s<2?305:975,200,27,P.orange);if(s===2)d.circle('reader',305,620,24,P.blue);},
(d,s)=>{
  tx(d,'heading',640,100,'Fit inside the query engine',42);
  tx(d,'train-label',285,195,'training rows',29,P.green);
  d.table('train',110,230,[170,180],[['distance','fare'],[1,6],[2,6],[3,8],[4,12]],{rowHeight:56,fontSize:28});
  tx(d,'heldout',285,570,'test rows stay out',26,P.orange);
  if(s>=1){line(d,'fit-arrow',480,360,550,360);d.box('fit',575,280,270,160,'Aggregate',P.greenLight,P.green,35);tx(d,'func1',710,475,'regr_intercept',25);tx(d,'func2',710,518,'regr_slope',25);}
  if(s>=2){line(d,'model-arrow',860,360,915,360);d.table('model',935,280,[125,125],[['b','w'],[3,2]],{rowHeight:80,fontSize:34});tx(d,'model-label',1060,475,'model table',28,P.green);}
  if(s>=3)tx(d,'equation',640,635,'predicted fare = 3 + 2 × distance',38,P.green);
},
(d,s)=>{
  tx(d,'heading',640,90,'Apply the saved model',42);
  d.table('test',110,175,[175,175,185],[['distance','actual','predicted'],[2.5,9,s>=1?8:'?'],[4.5,11,s>=1?12:'?']],{rowHeight:66,fontSize:29});
  d.box('model',795,175,365,115,'b = 3     w = 2',P.greenLight,P.green,34);
  if(s>=1){line(d,'score',775,275,665,275);tx(d,'apply',980,360,'b + w × distance',31);}
  if(s>=2){d.box('mae',150,445,450,90,'Held-out MAE = $1',P.orangeLight,P.orange,32);d.box('new',720,445,450,90,'3.5 miles → $10',P.blueLight,P.blue,32);}
  if(s>=3){tx(d,'cloud',640,600,'BigQuery ML: CREATE MODEL → ML.PREDICT',29,P.blue);tx(d,'split',640,653,'ML.EVALUATE uses separate test rows',26,P.muted);}
},
(d,s)=>{const ww=[760,230,60];tx(d,'scan-label',220,150,'bytes',35);d.rect('scan',170,210,ww[s],110,P.greenLight,P.green,10);for(let i=0;i<Math.max(1,6-s*2);i++)d.circle('coin'+i,1050,520-i*45,39,P.orangeLight,P.orange,3);clock(d,'compute',315,505,s*1.3);tx(d,'clocklabel',315,610,'compute time',30);tx(d,'coinlabel',1045,610,'scanned bytes',30);},
(d,s)=>{for(let r=0;r<6;r++)for(let c=0;c<12;c++){const active=s===0?r===2:s===1?c===5:c===5&&r===5;d.rect('cell'+r+c,140+c*85,170+r*67,70,50,active?P.greenLight:P.white,active?P.green:P.line,5);}tx(d,'q',640,625,['ride #4','AVG(fare)','month = 12'][s],40);}
]
};

const plans = [
  {
    "id": 6,
    "title": "B+ Trees",
    "source": "lectures/lecture-06/btrees.html",
    "date": "2026-09-29",
    "scenes": [
      {
        "title": "An index gives another route to a row",
        "minutes": 2,
        "kind": "title",
        "notes": "The index finds row addresses without scanning every heap row.\n\nPoint to the heap: the rows already exist. Introduce the index as a second way to reach them.\n\nFollow the arrow from the index to the heap. The answer still comes from the same stored row.\n\nAsk: What does the index help us avoid?\n\nExpected answer: Testing every heap row when only a few rows match.",
        "id": "b-trees",
        "steps": 2,
        "states": [
          "A second access path",
          "Index finds the heap row"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#problem"
        ],
        "teaching": {
          "idea": "The index finds row addresses without scanning every heap row.",
          "builds": [
            "Point to the heap: the rows already exist. Introduce the index as a second way to reach them.",
            "Follow the arrow from the index to the heap. The answer still comes from the same stored row."
          ],
          "question": "What does the index help us avoid?",
          "answer": "Testing every heap row when only a few rows match."
        }
      },
      {
        "title": "A complete scan checks every row",
        "minutes": 3,
        "kind": "visual",
        "notes": "A scan has no shortcut to the matching value.\n\nRead the request uid = 77777. Explain that this is the separate 100,000-row Lab 6 benchmark.\n\nHalfway through, 50,000 rows and 147 heap blocks have been visited. The diagram is schematic.\n\nThe complete scan has tested 100,000 rows across 294 blocks. Cached blocks may avoid new disk reads.\n\nAsk: Why keep scanning after the first match?\n\nExpected answer: The scan returns all matches; its implementation does not stop after finding one.",
        "id": "one-row-every-block",
        "steps": 3,
        "states": [
          "Find one row",
          "Read the first half",
          "Read every block"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#costs"
        ],
        "teaching": {
          "idea": "A scan has no shortcut to the matching value.",
          "builds": [
            "Read the request uid = 77777. Explain that this is the separate 100,000-row Lab 6 benchmark.",
            "Halfway through, 50,000 rows and 147 heap blocks have been visited. The diagram is schematic.",
            "The complete scan has tested 100,000 rows across 294 blocks. Cached blocks may avoid new disk reads."
          ],
          "question": "Why keep scanning after the first match?",
          "answer": "The scan returns all matches; its implementation does not stop after finding one."
        }
      },
      {
        "title": "An index maps values to row addresses",
        "minutes": 3,
        "kind": "visual",
        "notes": "A RID tells us where to fetch a row.\n\nGPA 36 is the value we want. A search key is a field value, not necessarily a primary key.\n\nReveal (0, 4). Say: block zero, slot four. Expand RID as record identifier.\n\nFollow that address to eli. Index lookup and row retrieval are separate steps.\n\nAsk: What does the index return for GPA 31?\n\nExpected answer: Two RIDs: (0, 1) for ben and (1, 0) for gia.",
        "definition": "An index maps field values to row addresses.",
        "id": "index",
        "steps": 3,
        "states": [
          "Look up GPA 36",
          "Get a row address",
          "Fetch eli’s row"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#problem"
        ],
        "term": "Index",
        "teaching": {
          "idea": "A RID tells us where to fetch a row.",
          "builds": [
            "GPA 36 is the value we want. A search key is a field value, not necessarily a primary key.",
            "Reveal (0, 4). Say: block zero, slot four. Expand RID as record identifier.",
            "Follow that address to eli. Index lookup and row retrieval are separate steps."
          ],
          "question": "What does the index return for GPA 31?",
          "answer": "Two RIDs: (0, 1) for ben and (1, 0) for gia."
        }
      },
      {
        "title": "Different structures suit different requests",
        "minutes": 5,
        "kind": "activity",
        "notes": "Keeping keys in order makes range access possible.\n\nCompare ways to find one value. Define a hash bucket simply as the group selected by the hash function.\n\nNow add a key. A sorted array may shift many entries; a B+ tree can split a single overfull node.\n\nFor a range, the sorted array reads forward and the B+ tree follows leaf links. A hash index has no key order to follow.\n\nAsk: Why are hashes not our only index?\n\nExpected answer: They support equality lookups but do not preserve the key order used for range scans.",
        "id": "four-storage-choices",
        "steps": 3,
        "states": [
          "Equality lookup",
          "Insert a key",
          "Walk a range"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#faq"
        ],
        "teaching": {
          "idea": "Keeping keys in order makes range access possible.",
          "builds": [
            "Compare ways to find one value. Define a hash bucket simply as the group selected by the hash function.",
            "Now add a key. A sorted array may shift many entries; a B+ tree can split a single overfull node.",
            "For a range, the sorted array reads forward and the B+ tree follows leaf links. A hash index has no key order to follow."
          ],
          "question": "Why are hashes not our only index?",
          "answer": "They support equality lookups but do not preserve the key order used for range scans."
        }
      },
      {
        "title": "Four keys fit in one leaf",
        "minutes": 3,
        "kind": "visual",
        "notes": "A node splits only after it exceeds its capacity.\n\nStart a fresh example with key 1. This is separate from the GPA tree.\n\nInsert 2 in sorted order. The single node is both the root and a leaf.\n\nInsert 3. There is still one free key slot.\n\nInsert 4. The leaf is full but legal. ORDER = 4 means four keys, not four children.\n\nAsk: Does inserting another RID for key 4 trigger a split?\n\nExpected answer: No. It extends the RID list for key 4; it does not add another distinct key.",
        "id": "first-four-keys",
        "steps": 4,
        "states": [
          "Insert 1",
          "Insert 2",
          "Insert 3",
          "Insert 4: full but legal"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#try-it"
        ],
        "demo": "viz-btree",
        "teaching": {
          "idea": "A node splits only after it exceeds its capacity.",
          "builds": [
            "Start a fresh example with key 1. This is separate from the GPA tree.",
            "Insert 2 in sorted order. The single node is both the root and a leaf.",
            "Insert 3. There is still one free key slot.",
            "Insert 4. The leaf is full but legal. ORDER = 4 means four keys, not four children."
          ],
          "question": "Does inserting another RID for key 4 trigger a split?",
          "answer": "No. It extends the RID list for key 4; it does not add another distinct key."
        }
      },
      {
        "title": "Internal nodes route; leaves hold entries",
        "minutes": 3,
        "kind": "visual",
        "notes": "The root gives directions and the leaves hold keys with row addresses.\n\nUse the GPA tree. At separator 36, smaller values go left and equal or larger values go right.\n\nReveal next. Both leaves have the same depth, and the link puts them in key order.\n\nThe leaf entry for 36 owns the RID list [(0, 4)]. The separator at the root has no RID list.\n\nAsk: Is matching the root separator enough to return a row?\n\nExpected answer: No. Follow the right child and find the RID list in the leaf.",
        "definition": "A B+ tree routes searches to sorted, linked leaves.",
        "id": "b-tree",
        "steps": 3,
        "states": [
          "Routing above entries",
          "Linked equal-depth leaves",
          "Entries carry RIDs"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#anatomy"
        ],
        "term": "B+ tree",
        "teaching": {
          "idea": "The root gives directions and the leaves hold keys with row addresses.",
          "builds": [
            "Use the GPA tree. At separator 36, smaller values go left and equal or larger values go right.",
            "Reveal next. Both leaves have the same depth, and the link puts them in key order.",
            "The leaf entry for 36 owns the RID list [(0, 4)]. The separator at the root has no RID list."
          ],
          "question": "Is matching the root separator enough to return a row?",
          "answer": "No. Follow the right child and find the RID list in the leaf."
        }
      },
      {
        "title": "A leaf split copies a separator",
        "minutes": 5,
        "kind": "visual",
        "notes": "Every key and its row addresses must remain in a leaf.\n\nAsk: Why must key 3 stay in the right leaf?\n\nExpected answer: It is an actual index entry. The parent only needs a routing copy.",
        "id": "the-fifth-key",
        "steps": 3,
        "states": [
          "A full leaf",
          "36 splits the root",
          "34 enters the left leaf"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#split"
        ],
        "demo": "viz-btree",
        "teaching": {
          "idea": "Every key and its row addresses must remain in a leaf.",
          "builds": [],
          "question": "Why must key 3 stay in the right leaf?",
          "answer": "It is an actual index entry. The parent only needs a routing copy."
        }
      },
      {
        "title": "Follow a key to its row",
        "minutes": 5,
        "kind": "activity",
        "notes": "Follow one root-to-leaf path, then use the returned RID.\n\nAsk: What does search(35) return?\n\nExpected answer: An empty list. It reaches the left leaf, where 35 is absent.",
        "id": "find-37",
        "steps": 4,
        "states": [
          "Search 37",
          "Choose the right branch",
          "Find and fetch 37",
          "Search for absent 35"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#anatomy"
        ],
        "demo": "viz-btree",
        "teaching": {
          "idea": "Follow one root-to-leaf path, then use the returned RID.",
          "builds": [],
          "question": "What does search(35) return?",
          "answer": "An empty list. It reaches the left leaf, where 35 is absent."
        }
      },
      {
        "title": "A range follows the leaf links",
        "minutes": 3,
        "kind": "visual",
        "notes": "Descend once, then collect row addresses in key order.\n\nAsk: Why do four matching keys return five RIDs?\n\nExpected answer: Two students have key 31, so that key contributes two row addresses.",
        "id": "walk-a-range",
        "steps": 4,
        "states": [
          "One descent",
          "Collect the left range",
          "Follow the leaf chain",
          "Stop beyond the high key"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#anatomy"
        ],
        "teaching": {
          "idea": "Descend once, then collect row addresses in key order.",
          "builds": [],
          "question": "Why do four matching keys return five RIDs?",
          "answer": "Two students have key 31, so that key contributes two row addresses."
        }
      },
      {
        "title": "Full is allowed; overfull needs a split",
        "minutes": 5,
        "kind": "activity",
        "notes": "Insert 6 fits; insert 7 creates a fifth key and needs a split.\n\nShow root [3] over [1, 2] and [3, 4, 5]. Ask partners to draw the result of inserting 6.\n\nReveal [3, 4, 5, 6]. Four keys fit, so no split occurs. Now ask them to insert 7.\n\nSplit into [3, 4] and [5, 6, 7]. Copy 5 into the parent, which becomes [3, 5]. Height stays at two levels.\n\nAsk: Why does the tree not grow taller here?\n\nExpected answer: The parent has room for the new separator; it does not need a new parent.",
        "id": "predict-the-next-split",
        "steps": 3,
        "states": [
          "Insert 6?",
          "Full but legal",
          "7 triggers copy-up"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#split"
        ],
        "demo": "viz-btree",
        "teaching": {
          "idea": "Insert 6 fits; insert 7 creates a fifth key and needs a split.",
          "builds": [
            "Show root [3] over [1, 2] and [3, 4, 5]. Ask partners to draw the result of inserting 6.",
            "Reveal [3, 4, 5, 6]. Four keys fit, so no split occurs. Now ask them to insert 7.",
            "Split into [3, 4] and [5, 6, 7]. Copy 5 into the parent, which becomes [3, 5]. Height stays at two levels."
          ],
          "question": "Why does the tree not grow taller here?",
          "answer": "The parent has room for the new separator; it does not need a new parent."
        }
      },
      {
        "title": "An internal split moves a separator",
        "minutes": 4,
        "kind": "visual",
        "notes": "The middle separator moves to the parent while every child is preserved.\n\nThis is the tree after inserting 1 through 12. The root has four separators and five children.\n\nInsert 13. Splitting its leaf adds separator 11, so the root now has five separators and six children.\n\nMove 7 to a new root. Left keeps [3, 5] and three children; right keeps [9, 11] and three children. All leaves gain one level together.\n\nAsk: Did moving 7 remove its lookup entry?\n\nExpected answer: No. The actual key 7 and its RID list remain in a leaf below the internal nodes.",
        "id": "a-root-splits",
        "steps": 3,
        "states": [
          "The internal root is full",
          "Five separators overflow",
          "7 moves into a new root"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#split"
        ],
        "demo": "viz-btree",
        "teaching": {
          "idea": "The middle separator moves to the parent while every child is preserved.",
          "builds": [
            "This is the tree after inserting 1 through 12. The root has four separators and five children.",
            "Insert 13. Splitting its leaf adds separator 11, so the root now has five separators and six children.",
            "Move 7 to a new root. Left keeps [3, 5] and three children; right keeps [9, 11] and three children. All leaves gain one level together."
          ],
          "question": "Did moving 7 remove its lookup entry?",
          "answer": "No. The actual key 7 and its RID list remain in a leaf below the internal nodes."
        }
      },
      {
        "title": "More children keep the tree short",
        "minutes": 3,
        "kind": "definition",
        "notes": "Fan-out is the number of children a node can point to.\n\nCompare the fully packed model for 100 million distinct keys. Two children and two leaf entries need 27 levels; the drawing abbreviates them.\n\nWith 20 children and 20 entries per leaf, the model needs seven levels.\n\nWith 200 children and 200 entries per leaf, it needs four levels. This is a capacity estimate, not a guarantee about a real tree.\n\nAsk: Why does more branching reduce the number of levels?\n\nExpected answer: Each choice narrows the search to one of more groups, so fewer choices are needed.",
        "definition": "Fan-out is the number of children an internal node can have.",
        "id": "fan-out",
        "steps": 3,
        "states": [
          "Binary fan-out",
          "Twenty children",
          "Page-sized fan-out"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#fanout"
        ],
        "term": "Fan-out",
        "demo": "viz-fanout",
        "teaching": {
          "idea": "Fan-out is the number of children a node can point to.",
          "builds": [
            "Compare the fully packed model for 100 million distinct keys. Two children and two leaf entries need 27 levels; the drawing abbreviates them.",
            "With 20 children and 20 entries per leaf, the model needs seven levels.",
            "With 200 children and 200 entries per leaf, it needs four levels. This is a capacity estimate, not a guarantee about a real tree."
          ],
          "question": "Why does more branching reduce the number of levels?",
          "answer": "Each choice narrows the search to one of more groups, so fewer choices are needed."
        }
      },
      {
        "title": "Node visits and disk reads are different counts",
        "minutes": 3,
        "kind": "visual",
        "notes": "A cached page can be visited without reading it from disk again.\n\nThis is a disk-based index example. The upper two nodes are already in the buffer pool.\n\nSuppose the third level is cached too. The leaf needs a disk read only if it is not cached.\n\nAfter finding a RID, fetch the matching heap row. Its page may also be cached. In Lab 6, all tree nodes are in memory.\n\nAsk: Are four node visits always four physical reads?\n\nExpected answer: No. Cached index pages need no new read; fetching the heap row adds separate work.",
        "id": "index-pages-and-heap-pages",
        "steps": 3,
        "states": [
          "Upper pages are cached",
          "Check the lower pages",
          "Fetch the matching heap row"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#fanout"
        ],
        "teaching": {
          "idea": "A cached page can be visited without reading it from disk again.",
          "builds": [
            "This is a disk-based index example. The upper two nodes are already in the buffer pool.",
            "Suppose the third level is cached too. The leaf needs a disk read only if it is not cached.",
            "After finding a RID, fetch the matching heap row. Its page may also be cached. In Lab 6, all tree nodes are in memory."
          ],
          "question": "Are four node visits always four physical reads?",
          "answer": "No. Cached index pages need no new read; fetching the heap row adds separate work."
        }
      },
      {
        "title": "Each index adds work when rows change",
        "minutes": 3,
        "kind": "visual",
        "notes": "An insert must update the heap and each of its indexes.\n\nAdd a row to a table with one index: maintain two structures.\n\nWith two indexes, the insert maintains three structures.\n\nWith three indexes, maintain four structures. Buffering, splits, and logging determine physical writes.\n\nAsk: If GPA changes, what must happen to its index entry?\n\nExpected answer: Remove or replace the old GPA entry and add the new GPA with the row address.",
        "id": "the-write-bill",
        "steps": 3,
        "states": [
          "One index",
          "Two indexes",
          "Three indexes"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#costs"
        ],
        "teaching": {
          "idea": "An insert must update the heap and each of its indexes.",
          "builds": [
            "Add a row to a table with one index: maintain two structures.",
            "With two indexes, the insert maintains three structures.",
            "With three indexes, maintain four structures. Buffering, splits, and logging determine physical writes."
          ],
          "question": "If GPA changes, what must happen to its index entry?",
          "answer": "Remove or replace the old GPA entry and add the new GPA with the row address."
        }
      },
      {
        "title": "Many matches can make a scan cheaper",
        "minutes": 5,
        "kind": "activity",
        "notes": "The index benefit depends on the work needed to fetch its matching rows.\n\nFew matches mean only a few heap rows to fetch. The picture illustrates addresses, not measured disk reads.\n\nAs more rows match, the index returns more RIDs. Scattered addresses can revisit heap pages.\n\nAt 99% matches, a sequential scan may be cheaper. Locality, cached pages, and covered columns can change the choice.\n\nAsk: Does an available index have to be used?\n\nExpected answer: No. The planner can choose a scan when it estimates less work.",
        "id": "when-scanning-wins",
        "steps": 3,
        "states": [
          "Few matches",
          "More heap jumps",
          "A scan becomes attractive"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#costs"
        ],
        "teaching": {
          "idea": "The index benefit depends on the work needed to fetch its matching rows.",
          "builds": [
            "Few matches mean only a few heap rows to fetch. The picture illustrates addresses, not measured disk reads.",
            "As more rows match, the index returns more RIDs. Scattered addresses can revisit heap pages.",
            "At 99% matches, a sequential scan may be cheaper. Locality, cached pages, and covered columns can change the choice."
          ],
          "question": "Does an available index have to be used?",
          "answer": "No. The planner can choose a scan when it estimates less work."
        }
      },
      {
        "title": "A missing leaf entry breaks the answer",
        "minutes": 3,
        "kind": "activity",
        "notes": "Keeping a separator in the root does not replace its leaf entry.\n\nAsk for keys 34 through 37. The left leaf has 34, but the right leaf is missing 36.\n\nPoint to the gap: the root has separator 36, yet the leaf chain cannot return it.\n\nRestore the leaf entry for 36 and its RID list. The range now finds 34, 36, and 37.\n\nAsk: Which lab operation exposes this mistake?\n\nExpected answer: A range including 36, or search(36), shows that the leaf entry is missing.",
        "id": "build-and-test",
        "steps": 3,
        "states": [
          "A missing separator entry",
          "Find the leaf gap",
          "Repair the range"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#thursday"
        ],
        "teaching": {
          "idea": "Keeping a separator in the root does not replace its leaf entry.",
          "builds": [
            "Ask for keys 34 through 37. The left leaf has 34, but the right leaf is missing 36.",
            "Point to the gap: the root has separator 36, yet the leaf chain cannot return it.",
            "Restore the leaf entry for 36 and its RID list. The range now finds 34, 36, and 37."
          ],
          "question": "Which lab operation exposes this mistake?",
          "answer": "A range including 36, or search(36), shows that the leaf entry is missing."
        }
      },
      {
        "title": "Explain one split and one lookup",
        "minutes": 2,
        "kind": "recap",
        "notes": "Leaves keep the entries, and a root split adds a level above every leaf.\n\nShow [1, 2, 3, 4] and ask where 5 belongs. Four keys fit; five do not.\n\nSplit into [1, 2] and [3, 4, 5]. Copy 3 into the new root; keep its RID list in the leaf.\n\nTrace a lookup for 4: go right, find its RID list, then fetch the matching row.\n\nAsk: What will you implement in Lab 6?\n\nExpected answer: Search, insertion, splitting, and inclusive range lookup. Nodes live in memory; the provided scan fetches heap rows.",
        "id": "exit-trace",
        "steps": 3,
        "states": [
          "A full leaf",
          "Split and grow",
          "Search then walk"
        ],
        "sources": [
          "lectures/lecture-06/btrees.html#recap"
        ],
        "teaching": {
          "idea": "Leaves keep the entries, and a root split adds a level above every leaf.",
          "builds": [
            "Show [1, 2, 3, 4] and ask where 5 belongs. Four keys fit; five do not.",
            "Split into [1, 2] and [3, 4, 5]. Copy 3 into the new root; keep its RID list in the leaf.",
            "Trace a lookup for 4: go right, find its RID list, then fetch the matching row."
          ],
          "question": "What will you implement in Lab 6?",
          "answer": "Search, insertion, splitting, and inclusive range lookup. Nodes live in memory; the provided scan fetches heap rows."
        }
      }
    ]
  },
  {
    "id": 7,
    "title": "Transactions & Recovery",
    "source": "lectures/lecture-07/wal.html",
    "date": "2026-10-08",
    "scenes": [
      {
        "title": "Money disappears",
        "minutes": 4,
        "kind": "visual",
        "notes": "There is no quiz on this Thursday lecture. Ask whether each assignment was valid on its own and where the missing money should be found. Expected: the transfer was only partly applied; individual writes do not establish transaction atomicity. Separate the live RAM image from durable storage in the visual. The missing 50 is a deliberately inconsistent intermediate state, not literal destruction of banknotes.",
        "id": "money-disappears",
        "steps": 3,
        "states": [
          "150 total",
          "Only the debit landed",
          "A crash interrupts"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ]
      },
      {
        "title": "Transaction",
        "minutes": 3,
        "kind": "definition",
        "notes": "Define the unit of work and distinguish database atomicity from application correctness. A perfectly atomic transfer can still debit the wrong account. Introduce the familiar ACID letters verbally: today emphasizes atomicity and durability; declared constraints and correct application logic matter for consistency; the next lecture addresses concurrency. Ask what a successful commit acknowledgement promises to the client.",
        "definition": "A transaction groups operations into one unit that commits completely or rolls back.",
        "id": "transaction",
        "steps": 3,
        "states": [
          "A unit of work",
          "Both changes applied",
          "One commit boundary"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ],
        "term": "Transaction"
      },
      {
        "title": "Two kinds of unfinished",
        "minutes": 4,
        "kind": "activity",
        "notes": "Let students predict the survivors before each interruption. Process termination leaves the OS cache alive; power failure does not. An application write reaching the OS is not the same as an acknowledged fsync. The lab uses abrupt process termination, not arbitrary power-loss or torn-write testing. This distinction is essential before showing the scripted bank recovery; avoid implying that kill -9 proves all hardware failure behavior.",
        "id": "two-kinds-of-unfinished",
        "steps": 3,
        "states": [
          "Three storage layers",
          "Process termination",
          "Power failure"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ]
      },
      {
        "title": "Durable first",
        "minutes": 4,
        "kind": "visual",
        "notes": "Ask students to place the safety boundary. The required ordering is durable recovery information before the associated changed data page can become durable. The lab enforces a stronger simple rule by syncing each log append before changing the buffer page. Production engines can batch log writes and force through the page LSN before flushing a data page. Do not repeat the older one-fsync-per-lab-transaction claim.",
        "id": "durable-first",
        "steps": 3,
        "states": [
          "Old value in the page",
          "Old value made durable",
          "Changed page may flush"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ]
      },
      {
        "title": "Write-ahead logging",
        "minutes": 3,
        "kind": "definition",
        "notes": "Ask what would go wrong if the page reached disk before the old value became durable. Expected: an uncommitted change might survive with no usable undo record. In microdb the log stores old values because its FORCE policy avoids redo. Production schemes may need after-images or physiological redo records too. Separate the general WAL rule from the particular record format used by the lab.",
        "definition": "Write-ahead logging makes recovery information durable before the changed data it protects.",
        "id": "write-ahead-logging",
        "steps": 3,
        "states": [
          "Recovery data",
          "Durability boundary",
          "Log before page"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ],
        "term": "Write-ahead logging"
      },
      {
        "title": "A complete transfer",
        "minutes": 4,
        "kind": "visual",
        "notes": "The widget starts at 100 and 50; this first committed transaction transfers 40. Build sequence: START, SET A old=100, SET B old=50, then data flush and COMMIT. Ask where the new balances live after each SET. Expected: in buffers until the FORCE commit flushes them. All default append records are synced in the current lab logger. Use lecture-07/styles.css and viz.js; no database process is required for this visual. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "a-complete-transfer",
        "steps": 4,
        "states": [
          "START",
          "Log the first old value",
          "Log the second old value",
          "Flush then commit"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ],
        "demo": "viz-crash"
      },
      {
        "title": "Crash after eviction",
        "minutes": 4,
        "kind": "activity",
        "notes": "Let students choose what they would preserve or restore. The second transaction begins a 50 transfer but only its debit has reached disk. The old value 60 is already durable in its SET record. Ask whether a dirty-page eviction implicitly commits the transaction. Expected: no. Point out why buffer management cannot infer logical completion from a page write. Do not run recovery until the class has identified tx2 as unfinished. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "crash-after-eviction",
        "steps": 3,
        "states": [
          "Uncommitted buffer change",
          "Eviction puts it on disk",
          "Crash without commit"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ],
        "demo": "viz-crash"
      },
      {
        "title": "Read the log backward",
        "minutes": 4,
        "kind": "visual",
        "notes": "Walk the reasoning, not just the result. A backward scan encounters completion records before earlier writes from the same transaction. It restores records for unfinished transactions and skips finished ones. Ask why tx1 must not return to 100/50. Expected: its commit is durable and the FORCE policy placed its data on disk first. Repaired pages must become durable before the recovery completion receipt is synced. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "read-the-log-backward",
        "steps": 3,
        "states": [
          "Find unfinished tx2",
          "Restore its old value",
          "Keep the committed transfer"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ],
        "demo": "viz-crash"
      },
      {
        "title": "Two writes, reverse undo",
        "minutes": 4,
        "kind": "activity",
        "notes": "Ask partners to predict both replay directions before revealing the values. The reverse order is not arbitrary: each before-image reverses the most recent remaining change. Tie the exercise directly to rollback and records_backwards. Recovery must also identify transaction fate and obey locking assumptions; this toy demonstration concerns a serial stream of field changes. Avoid presenting before-image assignment alone as a complete general recovery algorithm.",
        "id": "two-writes-reverse-undo",
        "steps": 3,
        "states": [
          "Two changes",
          "Undo the latest change",
          "Undo the earlier change"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ]
      },
      {
        "title": "Repair can crash too",
        "minutes": 3,
        "kind": "definition",
        "notes": "Define idempotence with assignment rather than subtraction. Ask why writing a ROLLBACK receipt before flushing repaired pages is unsafe: the next restart could skip a repair that never became durable. In the lab, repeated full recovery passes reach the same repaired state under its assumptions. Production ARIES adds compensation records and more bookkeeping for robust partial-progress recovery.",
        "definition": "Idempotence means repeating an operation has the same effect as performing it once.",
        "id": "repair-can-crash-too",
        "steps": 3,
        "states": [
          "Restore a value",
          "Recovery is interrupted",
          "Repeat and complete"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ],
        "term": "Idempotence"
      },
      {
        "title": "Two policy decisions",
        "minutes": 4,
        "kind": "activity",
        "notes": "Introduce STEAL and FORCE orally, then use the axes to derive consequences before naming quadrants. STEAL admits uncommitted data on disk, so undo support is needed in this simple in-place model. NO-FORCE admits committed changes whose data pages are missing, so redo support is needed. Keep buffer eviction policy and transaction acknowledgement policy visibly separate; students commonly collapse them into one choice.",
        "id": "two-policy-decisions",
        "steps": 3,
        "states": [
          "Two independent policies",
          "STEAL allows early data",
          "NO-FORCE allows late data"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ]
      },
      {
        "title": "Four recovery duties",
        "minutes": 4,
        "kind": "activity",
        "notes": "Derive the textbook matrix: FORCE/NO-STEAL neither undo nor redo for transaction updates; FORCE/STEAL undo; NO-FORCE/NO-STEAL redo; NO-FORCE/STEAL both. These are update-recovery requirements under the model, not proof that a system needs no recovery metadata or protection from partial writes. The existing widget overgeneralizes all engines as ARIES and calls FORCE/NO-STEAL always correct; do not expose those explanatory strings. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "four-recovery-duties",
        "steps": 4,
        "states": [
          "Neither",
          "UNDO",
          "REDO",
          "UNDO and REDO"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ],
        "demo": "viz-quad"
      },
      {
        "title": "Commit boundary",
        "minutes": 4,
        "kind": "visual",
        "notes": "Ask where acknowledgement may appear in each lane. Microdb commits can require several syncs and dirty-page flushes. A NO-FORCE engine can make commit wait on durable log progress and defer page writes, with group commit sharing the cost. If the connection fails after durability but before acknowledgement, the client may not know the outcome. Treat this as a normal distributed acknowledgement ambiguity, not evidence that commit failed.",
        "id": "commit-boundary",
        "steps": 3,
        "states": [
          "Required log writes",
          "Where reply becomes safe",
          "Deferred data flush"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ]
      },
      {
        "title": "Recovery at scale",
        "minutes": 4,
        "kind": "visual",
        "notes": "Provide the bridge to production without teaching ARIES as merely three generic loops. LSNs track progress; checkpoints record enough state to bound work; redo may repeat history and undo removes losers. PostgreSQL uses WAL redo with MVCC visibility instead of the exact physical-undo lab design. A simple lab checkpoint is safe only after unfinished transactions are resolved and relevant data is durable; an arbitrary timestamp is not a safe cutoff.",
        "id": "recovery-at-scale",
        "steps": 3,
        "states": [
          "Analyze transaction fate",
          "Redo progress",
          "Undo losers"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ]
      },
      {
        "title": "Place the crash",
        "minutes": 4,
        "kind": "activity",
        "notes": "Spend two minutes in pairs, then ask one group per cut point. Expected: no durable change before the log boundary; undo if uncommitted data survives; keep a transaction with durable commit under FORCE. Ask the harder case: the client never receives the commit reply. Expected: inspect or retry through an idempotent application protocol; outcome may already be committed. Mention fsync errors must propagate rather than being reported as successful commits.",
        "id": "place-the-crash",
        "steps": 4,
        "states": [
          "Before log",
          "After durable log",
          "After changed data",
          "After durable commit"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ]
      },
      {
        "title": "From promise to code",
        "minutes": 3,
        "kind": "recap",
        "notes": "Have students narrate the WAL order and one recovery example without reading prose. Lab 7 will ask for set_int/set_string, commit, rollback and recover; the supplied logger and lock table provide the supporting pieces. Crash tests cover process termination and repeated recovery, not arbitrary corrupt storage. Tuesday October 13 addresses two correct transactions interfering even when no crash occurs. The full sequence is exactly 60 teaching minutes.",
        "id": "from-promise-to-code",
        "steps": 3,
        "states": [
          "Log first",
          "Page second",
          "Commit and repair"
        ],
        "sources": [
          "lectures/lecture-07/wal.html"
        ]
      }
    ]
  },
  {
    "id": 8,
    "title": "Concurrency & MVCC",
    "source": "lectures/lecture-08/concurrency.html",
    "date": "2026-10-13",
    "scenes": [
      {
        "title": "Concurrency & MVCC",
        "minutes": 2,
        "kind": "title",
        "notes": "Start with two clients intending to add ten to one account. Ask students to predict the outcome if both transactions complete, then reveal the possibility of 110. Expected: 120 is the intended serial outcome; interleaving can lose an update even without a crash. Keep this unsolved until the scheduler scene. Today students will construct bad schedules and justify lock and snapshot behavior. The scheduled ten-minute Quiz 6 is separate from this sixty-minute teaching deck.",
        "id": "concurrency-mvcc",
        "steps": 2,
        "states": [
          "Two clients share state",
          "Their writes can conflict"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ]
      },
      {
        "title": "Two deposits",
        "minutes": 3,
        "kind": "visual",
        "notes": "Ask students what should happen after both deposits complete. No crash or durability failure will occur in this example. Each individual read-compute-write sequence is correct in isolation. The mystery is how the combined execution can reach 110. Keep expected and actual balances spatially distinct so the later discrepancy reads immediately without a paragraph.",
        "id": "two-deposits",
        "steps": 3,
        "states": [
          "Starting balance",
          "First deposit",
          "Both deposits expected"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ]
      },
      {
        "title": "Schedule the failure",
        "minutes": 5,
        "kind": "activity",
        "notes": "Let two volunteers alternate the buttons and predict each shared balance. Both read 100 and compute 110; the second write overwrites the first result. Both commit and final A is 110. Ask whether a WAL can infer the missing intended deposit. Expected: recovery preserves committed actions; it cannot repair an incorrect concurrent schedule from business intent. Reuse lecture-08/styles.css and viz.js; consider hiding verbose message and stats elements. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "schedule-the-failure",
        "steps": 4,
        "states": [
          "Read the same value",
          "Compute independently",
          "Overwrite the same row",
          "Both commit to 110"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ],
        "demo": "viz-ilv"
      },
      {
        "title": "Serializability",
        "minutes": 3,
        "kind": "definition",
        "notes": "Introduce serializability as equivalence to some serial execution, not a requirement to execute literally one transaction at a time. Ask whether every interleaving is bad. Expected: no; many preserve the same dependencies and result. The deposit example is commutative, so use dependency arrows to emphasize why this property is more general than comparing one number.",
        "definition": "A serializable execution is equivalent to some serial order of its transactions.",
        "id": "serializability",
        "steps": 3,
        "states": [
          "One serial order",
          "The other serial order",
          "Equivalent interleaving"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ],
        "term": "Serializability"
      },
      {
        "title": "Anomaly gallery",
        "minutes": 3,
        "kind": "activity",
        "notes": "Ask students to describe the difference before naming dirty read, non-repeatable read and phantom. Dirty read depends on uncommitted data; non-repeatable read changes an existing row; phantom changes the set selected by a predicate. These are examples, not the entire isolation model. Keep each timeline on screen long enough for an audience member to retell it.",
        "id": "anomaly-gallery",
        "steps": 3,
        "states": [
          "Dirty read",
          "Non-repeatable read",
          "Phantom"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ]
      },
      {
        "title": "Shared and exclusive",
        "minutes": 3,
        "kind": "visual",
        "notes": "Define shared read and exclusive write locks orally. Ask why two shared holders are allowed even when both eventually intend to write. Expected: a read lock alone protects reading, while an upgrade requires compatibility with other holders. The lock scope in microdb is a block, not necessarily a row; coarse locks can create conflicts between distinct rows on one page. Keep this caveat in notes, not a dense slide.",
        "id": "shared-and-exclusive",
        "steps": 2,
        "states": [
          "Shared readers coexist",
          "Exclusive access conflicts"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ]
      },
      {
        "title": "Replay with locks",
        "minutes": 5,
        "kind": "activity",
        "notes": "Ask exactly where the previous schedule is refused. Both reads succeed; the first attempted X-lock upgrade conflicts with the other transaction’s S lock. The lab raises LockAbortError rather than waiting; the caller must roll back and retry. The existing console has no rollback control, so do not pretend it can finish this deadlocked schedule; reset and demonstrate a safe serial schedule if needed. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "replay-with-locks",
        "steps": 3,
        "states": [
          "Both shared reads succeed",
          "The first upgrade request",
          "Upgrade is refused"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ],
        "demo": "viz-ilv"
      },
      {
        "title": "Two phases",
        "minutes": 3,
        "kind": "definition",
        "notes": "Define the growing and shrinking phases. Under classic 2PL, acquiring a new lock after releasing one is forbidden. Explain the lab’s stronger hold-all-locks-until-end rule; terminology varies, and holding all S and X locks until completion is often called rigorous 2PL, while strict 2PL requires X locks until completion. Predicate protection is needed for serializable range queries, not only row locks.",
        "definition": "Two-phase locking acquires locks before releasing any; once release begins, no new locks are acquired.",
        "id": "two-phases",
        "steps": 3,
        "states": [
          "Acquire",
          "Release",
          "Hold until completion"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ],
        "term": "Two-phase locking"
      },
      {
        "title": "Deadlock",
        "minutes": 3,
        "kind": "activity",
        "notes": "Ask whether waiting longer can resolve a true cycle. Expected: no. A database can detect a cycle and abort a participant; application code must safely retry the transaction. A consistent lock acquisition order avoids this two-resource cycle. Distinguish a deadlock from ordinary blocking. microdb aborts on conflict because its simple single-threaded transaction model cannot safely wait for an idle holder.",
        "id": "deadlock",
        "steps": 3,
        "states": [
          "Each holds one resource",
          "Each wants the other",
          "Abort and retry"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ]
      },
      {
        "title": "Protect the empty space",
        "minutes": 3,
        "kind": "visual",
        "notes": "Use the phantom example to show why locking existing rows does not protect a predicate’s future members. Expected fix in a locking design: protect a range or equivalent predicate, rather than an absent row. Serializable MVCC systems may detect dangerous read/write dependencies instead and retry. This scene prevents the false inference that basic per-row S/X rules alone solve every anomaly.",
        "id": "protect-the-empty-space",
        "steps": 3,
        "states": [
          "Existing rows locked",
          "A gap admits a phantom",
          "Protect the predicate range"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ]
      },
      {
        "title": "Isolation ladder",
        "minutes": 5,
        "kind": "activity",
        "notes": "Ask which minimum SQL level disallows each of dirty reads, non-repeatable reads and phantoms. The standard permits implementation differences, and the three-anomaly table is not a complete definition of serializability. PostgreSQL READ UNCOMMITTED behaves as READ COMMITTED; its REPEATABLE READ uses a transaction snapshot and prevents these phantom changes while still allowing write skew. Do not present the source’s gray zone as PostgreSQL allowing snapshot phantoms. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "isolation-ladder",
        "steps": 4,
        "states": [
          "Read uncommitted",
          "Read committed",
          "Repeatable read nuances",
          "Serializable"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ],
        "demo": "viz-iso"
      },
      {
        "title": "Versions instead of waiting",
        "minutes": 3,
        "kind": "definition",
        "notes": "Define MVCC once. Ordinary snapshot reads can coexist with updates because they can use different versions. This does not make writers independent of writers, nor eliminate all blocking, explicit locking reads or schema locks. Ask what new resource pays for this concurrency. Expected: version storage and cleanup, plus visibility bookkeeping.",
        "definition": "MVCC keeps row versions so each reader can see the version allowed by its snapshot.",
        "id": "versions-instead-of-waiting",
        "steps": 3,
        "states": [
          "Original version",
          "An update creates another",
          "Reader and writer coexist"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ],
        "term": "MVCC"
      },
      {
        "title": "Walk the version chain",
        "minutes": 3,
        "kind": "activity",
        "notes": "Before each slider move ask the balance a reader should see. After committed tx100 it sees 120; after tx103 it sees 70; after tx107 it sees 50. The widget assumes all these transaction IDs commit in order. Real visibility requires transaction status, snapshot membership and the reader’s own writes, not simply comparing two transaction numbers. Crop or rewrite its final whole-run message so it applies to a transaction snapshot. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "walk-the-version-chain",
        "steps": 3,
        "states": [
          "After tx100",
          "After tx103",
          "After tx107"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ],
        "demo": "viz-chain"
      },
      {
        "title": "Statement or transaction snapshot",
        "minutes": 3,
        "kind": "visual",
        "notes": "Use the same update and ask which second read changes. PostgreSQL’s default READ COMMITTED takes a new statement snapshot; REPEATABLE READ shares a transaction snapshot. MVCC by itself does not specify when snapshots are taken. Tie the outcome back to the anomaly gallery, and ask why long reports may request a stable snapshot even when they are read-only.",
        "id": "statement-or-transaction-snapshot",
        "steps": 3,
        "states": [
          "Two snapshot rules",
          "Another transaction commits",
          "Repeat the read"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ]
      },
      {
        "title": "The version bill",
        "minutes": 3,
        "kind": "visual",
        "notes": "Explain why old versions cannot be reclaimed while a valid snapshot may still need them. Ask why an idle transaction can grow a table even without producing queries. Expected: its snapshot can hold back cleanup. MVCC moves work into version management; it does not erase the cost of isolation. Distinguish VACUUM reclamation from the immediate slot reuse in the teaching record manager.",
        "id": "the-version-bill",
        "steps": 3,
        "states": [
          "Reader retains an old version",
          "Cleanup cannot pass it",
          "Reader ends; cleanup proceeds"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ]
      },
      {
        "title": "Write skew",
        "minutes": 5,
        "kind": "activity",
        "notes": "Give pairs thirty seconds to find the missing conflict. Expected: they wrote different rows, so no direct write/write conflict stopped them, but the joint invariant fails. In any serial execution the second doctor would see nobody else on call and remain. Serializable Snapshot Isolation can detect dangerous dependency patterns and abort a transaction; snapshot isolation alone does not guarantee serializability.",
        "id": "write-skew",
        "steps": 3,
        "states": [
          "Two doctors on call",
          "Each sees the other",
          "Both leave"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ]
      },
      {
        "title": "Three mechanisms, three jobs",
        "minutes": 3,
        "kind": "activity",
        "notes": "Ask which mechanism prevents eviction, which protects a shared in-memory operation, and which controls transaction access. Expected: pin, latch, transaction lock. A pin never makes a row immune to another client’s write. Finish by asking whether lock waiting, transaction retries and retained versions are interchangeable costs; they solve related problems through distinct protocols.",
        "id": "three-mechanisms-three-jobs",
        "steps": 3,
        "states": [
          "Pin controls eviction",
          "Latch guards short operations",
          "Transaction lock guards access"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ]
      },
      {
        "title": "Exit schedule",
        "minutes": 2,
        "kind": "recap",
        "notes": "Ask a student to identify the first lock conflict in read/read/compute/compute/write, then another to name what snapshot isolation still allows. Expected: first X upgrade; write skew. Lab 7 joins today’s locks with the WAL protocol, but does not implement MVCC. Next lecture reads and improves the plans built by the engine. The scheduled quiz is separate from this 60-minute teaching deck.",
        "id": "exit-schedule",
        "steps": 3,
        "states": [
          "An invalid schedule",
          "Lock protection",
          "Snapshot visibility"
        ],
        "sources": [
          "lectures/lecture-08/concurrency.html"
        ]
      }
    ]
  },
  {
    "id": 9,
    "title": "Query Optimization",
    "source": "lectures/lecture-09/optimizer.html",
    "date": "2026-10-20",
    "scenes": [
      {
        "title": "Same answer, different work",
        "minutes": 4,
        "kind": "visual",
        "notes": "No quiz is scheduled today. Ask why two equivalent plans can do radically different amounts of intermediate work. Reuse the Lab 4 setting and make both predicates explicit orally: gpa > 35 and dept = cs, plus the join condition. The pushed plan produces 60 candidate pairs, not automatically 60 final rows. The last twenty minutes are reserved for the scheduled cumulative midterm review.",
        "id": "same-answer-different-work",
        "steps": 3,
        "states": [
          "Two equivalent plans",
          "Different intermediate work",
          "Same twenty rows"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ]
      },
      {
        "title": "Optimizer",
        "minutes": 3,
        "kind": "definition",
        "notes": "Define the optimizer and separate correctness from efficiency. The supplied Lab 5 planner translates a correct query into a fixed shape; optimization searches alternatives. It estimates candidate cost rather than executing every plan. Estimates, physical properties and a limited search budget all affect the choice. Ask which plan transformations students measured in Lab 5 and what an automatic optimizer must now choose.",
        "definition": "A query optimizer chooses an execution plan using estimated costs and data statistics.",
        "id": "optimizer",
        "steps": 3,
        "states": [
          "Stored statistics",
          "Candidate estimates",
          "A selected plan"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ],
        "term": "Query optimizer"
      },
      {
        "title": "Read a plan",
        "minutes": 3,
        "kind": "activity",
        "notes": "Explain that EXPLAIN displays the chosen plan; EXPLAIN ANALYZE also executes it and measures behavior. Have students trace the inside-out dataflow and compare estimated versus actual row counts at each node. Costs in PostgreSQL are model units, not milliseconds or literally just blocks. For writes, ANALYZE execution has effects; today’s example is a read. Keep SQL and large plan text in notes or optional detail view.",
        "id": "read-a-plan",
        "steps": 3,
        "states": [
          "Read the left leaf",
          "Read the right leaf",
          "Combine at the join"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ]
      },
      {
        "title": "Selectivity",
        "minutes": 3,
        "kind": "definition",
        "notes": "Define the fraction kept. Smaller selectivity fractions mean fewer surviving rows, while people sometimes say a predicate is highly selective to mean it keeps few rows. Ask students to identify N and survivors rather than memorize the phrase. Row estimates feed the costs of later operators, so errors near the bottom can multiply above.",
        "definition": "Selectivity is the fraction of rows a predicate keeps.",
        "id": "selectivity",
        "steps": 2,
        "states": [
          "Rows before filtering",
          "Fraction that survives"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ],
        "term": "Selectivity"
      },
      {
        "title": "Estimate from a sketch",
        "minutes": 4,
        "kind": "activity",
        "notes": "Students compute the estimate in pairs. First the uniform continuous range approximation gives about 142 survivors, then the independent one-third department filter gives about 47. State the assumptions: queried values exist, approximate uniformity, independent predicates, and compatible domains. Integer endpoints can matter, so this is not the exact answer for all actual datasets. Ask what information could improve the sketch: sampled distributions, most-common values and histograms.",
        "id": "estimate-from-a-sketch",
        "steps": 3,
        "states": [
          "Distribution sketch",
          "Range estimate",
          "Combine independent filters"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ]
      },
      {
        "title": "When estimates fail",
        "minutes": 3,
        "kind": "visual",
        "notes": "Use city = Charlottesville and state = Virginia as the correlation example; the second condition does not independently remove two thirds of the same rows. Ask how stale statistics differ from wrong independence assumptions. Expected: ANALYZE refreshes data summaries, while correlated conditions may need richer statistics or a better model. Do not imply that a statistics refresh automatically fixes every bad plan.",
        "id": "when-estimates-fail",
        "steps": 3,
        "states": [
          "Uniform assumption",
          "Skewed actual data",
          "Correlated conditions"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ]
      },
      {
        "title": "Price the work",
        "minutes": 4,
        "kind": "visual",
        "notes": "Price scans in blocks to connect to Lecture 1. Explain nested loop B(L)+N(L)B(R), hash B(L)+B(R) when the build fits in memory, and merge scans plus sorting if needed. CPU, output, cache, startup and spills also matter. Ask which method can return an early row with little setup and which needs building first. LIMIT can change which cost dimension matters.",
        "id": "price-the-work",
        "steps": 3,
        "states": [
          "Nested loop",
          "Hash join",
          "Merge join"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ]
      },
      {
        "title": "Watch the access path flip",
        "minutes": 3,
        "kind": "activity",
        "notes": "The model fixes N=100,000, B=1,000 and tree height 3. The index estimate is 3+matching RIDs; sequential scan is 1,000. Before crossing ask for the break-even fraction: (1000−3)/100000≈0.997%. Slider 50 is 1%, so the scan slightly wins. This is a toy model, not a universal 1% rule; clustering, caching and index-only scans change the crossover. Bar widths are logarithmic, so use numeric values for ratio comparisons. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "watch-the-access-path-flip",
        "steps": 3,
        "states": [
          "Selective index wins",
          "Near the crossover",
          "A scan wins"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ],
        "demo": "flip-sel"
      },
      {
        "title": "Choose the join machine",
        "minutes": 3,
        "kind": "activity",
        "notes": "Expected choices: indexed nested-loop for few outer rows and cheap probes; hash for a suitable equality join with a manageable build side; merge for appropriately sorted inputs. Ask why the same algorithm is not always best. Include duplicates in the merge picture: equal-key groups must produce every matching pair, not just one zip. The total answer size is unavoidable work.",
        "id": "choose-the-join-machine",
        "steps": 3,
        "states": [
          "Tiny indexed probe",
          "Build and probe a hash",
          "Merge equal-key groups"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ]
      },
      {
        "title": "Join order",
        "minutes": 3,
        "kind": "visual",
        "notes": "Ask which first pair has no connecting predicate. Expected: majors and enrollments, producing a 9,000-row cross product. Distinguish first-intermediate ratios from total produced rows: SM totals 3,300, SE 6,000, ME 12,000 in this widget. Do not claim total work is thirty times larger merely because the first intermediate is. Each plan has the same answer under the stated join assumptions. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "join-order",
        "steps": 3,
        "states": [
          "Students and majors first",
          "Students and enrollments first",
          "An unconnected pair first"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ],
        "demo": "order-readout"
      },
      {
        "title": "Search without enumerating everything",
        "minutes": 3,
        "kind": "visual",
        "notes": "Explain dynamic programming as reusable subproblems, not trying every complete tree. Physical properties such as sorted output can justify retaining multiple plans for the same subset; the cheapest local raw cost is not always the only useful survivor. The 10!×Catalan(9) count is about 17.6 billion labeled binary join trees under one counting convention, not the number every optimizer actually enumerates. Larger joins often trigger restricted search or heuristics.",
        "id": "search-without-enumerating-everything",
        "steps": 3,
        "states": [
          "Single relations",
          "Reuse pairs",
          "Retain useful physical properties"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ]
      },
      {
        "title": "Diagnose, then review",
        "minutes": 4,
        "kind": "activity",
        "notes": "Give students one minute to identify the earliest major divergence rather than blaming the slowest top node. Expected investigation: data distribution, stale or correlated statistics, row-width/memory assumptions and alternative plans. Explain why measuring actual behavior matters. Close the optimizer segment by having the class name statistics, costing and search. At elapsed minute 40 transition explicitly to the scheduled twenty-minute midterm review.",
        "id": "diagnose-then-review",
        "steps": 3,
        "states": [
          "An estimated plan",
          "The earliest large error",
          "Investigate the assumptions"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ]
      },
      {
        "title": "Review: storage and memory",
        "minutes": 4,
        "kind": "activity",
        "notes": "Spend one minute individual recall, one minute partner explanation and two minutes checking mechanisms. Ask why fsync differs from buffered write and why a repeated 50-page loop can thrash a 49-frame LRU cache. Expected: durability ordering and working-set capacity, not a universal measured ratio. Pinning prevents eviction; dirty eviction may need a write. Use actual benchmark values only as examples, not fixed promises across machines.",
        "id": "review-storage-and-memory",
        "steps": 3,
        "states": [
          "Durability and blocks",
          "A working set that misses",
          "The missing frame changes it"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ]
      },
      {
        "title": "Review: rows and pipelines",
        "minutes": 4,
        "kind": "activity",
        "notes": "Ask students to explain fixed slot arithmetic, byte capacity for UTF-8 strings, and when RID reuse is unsafe for stale references. Then ask why a streaming operator does not imply every operator uses constant memory: sort, aggregation and some joins can hold state. Have them reconstruct the 900-to-60 candidate-pair change. The target is a mechanism explanation, not memorized API signatures.",
        "id": "review-rows-and-pipelines",
        "steps": 3,
        "states": [
          "Rows and stable addresses",
          "Pull a row",
          "Reduce candidate pairs"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ]
      },
      {
        "title": "Review: SQL and indexes",
        "minutes": 4,
        "kind": "activity",
        "notes": "Ask what each stage accepts and produces, why parsing a query does not optimize it, and why the copied separator must remain in a leaf. Expected distinctions: tokens versus syntax structure versus query description versus executable scans; leaf copy-up versus internal move-up; one descent followed by leaf traversal. Follow with a broad-selectivity predicate to check that students do not insist every available index must be used.",
        "id": "review-sql-and-indexes",
        "steps": 3,
        "states": [
          "Parsing to execution",
          "Missing leaf entry",
          "Repair the range"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ]
      },
      {
        "title": "Review: recovery and isolation",
        "minutes": 4,
        "kind": "activity",
        "notes": "Ask students to place the durable log before data, and the FORCE commit receipt after dirty data is durable. Recovery undoes unfinished transactions under the lab model; it does not infer intended concurrent operations. In the lost-update schedule both S reads succeed and the first X upgrade conflicts. Ask why MVCC’s snapshots do not by themselves eliminate write skew. Spend the final minute on the distinction between crash safety and isolation.",
        "id": "review-recovery-and-isolation",
        "steps": 3,
        "states": [
          "Crash-safe ordering",
          "A lost update",
          "Conflict protection"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ]
      },
      {
        "title": "Exit mechanism",
        "minutes": 4,
        "kind": "recap",
        "notes": "Use a rapid oral retrieval round: each student explains one mechanism in twenty seconds and names a failure if it is missing. Correct misconceptions rather than reveal assessment answers. Give logistics orally: the scheduled midterm is Thursday October 22, 70 minutes, 39 multiple-choice questions, closed book; Lab 7 is due today. Next Tuesday shifts to analytics. This twenty-minute review completes the 60-minute deck without adding a lab-day deck.",
        "id": "exit-mechanism",
        "steps": 3,
        "states": [
          "Storage mechanisms",
          "Execution mechanisms",
          "Transaction mechanisms"
        ],
        "sources": [
          "lectures/lecture-09/optimizer.html"
        ]
      }
    ]
  },
  {
    "id": 10,
    "title": "The Analytics Stack & In-Database ML",
    "source": "lectures/lecture-10/analytics.html",
    "date": "2026-10-27",
    "scenes": [
      {
        "title": "The Analytics Stack & In-Database ML",
        "minutes": 2,
        "kind": "title",
        "notes": "Open on a matrix representing the same rides in both workloads. First highlight a complete row, then a numeric column across every row. Ask what changed: the question, not the underlying information. Expected: physical layout should follow the access pattern. This lecture connects bytes moved, compression, execution batches and file metadata to analytical systems. The scheduled ten-minute Quiz 7 is separate from this sixty-minute teaching deck. Extend the same operators to machine learning: fit coefficients with an aggregate, save a model table, and score rows with a query. Reserve ten teaching minutes for the two ML scenes.",
        "id": "the-analytics-stack",
        "steps": 2,
        "states": [
          "Rows serve a lookup",
          "Columns serve an aggregate"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ]
      },
      {
        "title": "The workload rotates",
        "minutes": 2,
        "kind": "visual",
        "notes": "Ask students to describe the two access patterns without using OLTP or OLAP first. Expected: one complete record versus a small number of attributes across many records. The same dataset can support both, but the physical layout changes which bytes move. Avoid saying one layout is universally wrong; the choice follows workload and engine features.",
        "id": "the-workload-rotates",
        "steps": 3,
        "states": [
          "One complete row",
          "One complete column",
          "Rotate physical grouping"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ]
      },
      {
        "title": "Analytical workload",
        "minutes": 3,
        "kind": "definition",
        "notes": "Introduce analytics as aggregating many records, often over a few columns. Operational systems frequently need short lookups and updates, while analytical systems often scan, group and join large datasets. These are workload tendencies, not a law that analytic systems cannot update rows or row stores cannot aggregate. Ask students to name one application with both workloads.",
        "definition": "An analytical workload summarizes many records, often using only a few columns.",
        "id": "analytical-workload",
        "steps": 3,
        "states": [
          "Event records",
          "Group many records",
          "Aggregate the groups"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ],
        "term": "Analytical workload"
      },
      {
        "title": "Read a row layout",
        "minutes": 3,
        "kind": "activity",
        "notes": "Ask how many of the 24 toy values contribute to avg(fare). Expected: six; the other eighteen move because they share the row-oriented storage. Explain that the widget is a cell-level illustration, not literal disk page boundaries. Real reads operate in pages or ranges, so the visual demonstrates projection waste rather than an exact measured I/O count. Reuse lecture-10/styles.css and viz.js. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "read-a-row-layout",
        "steps": 3,
        "states": [
          "Row-organized cells",
          "Read and waste",
          "Six useful of twenty-four"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ],
        "demo": "viz-layout"
      },
      {
        "title": "Read a column layout",
        "minutes": 3,
        "kind": "activity",
        "notes": "Let a student predict the new number of useful and total values read. Expected: six used, six read in this model. Same logical query and answer, different physical movement. If all columns were requested, projection savings would disappear. Ask why typed, adjacent values might also reduce CPU and storage work; this leads into encodings. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "read-a-column-layout",
        "steps": 3,
        "states": [
          "Column-organized cells",
          "Read only fare",
          "Six useful of six"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ],
        "demo": "viz-layout"
      },
      {
        "title": "The point lookup reverses it",
        "minutes": 3,
        "kind": "visual",
        "notes": "Ask where row storage retains an advantage. Expected: reconstructing one full row can require accessing multiple column regions. Avoid claiming every real column store must read all values or perform exactly four disk operations; indexing, caches and encoding affect access. Layout tradeoffs are illustrated here, not universally benchmarked. Reinforce that an architecture can keep both operational and analytical copies. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "the-point-lookup-reverses-it",
        "steps": 3,
        "states": [
          "One ride across columns",
          "Gather dispersed values",
          "Reconstruct the row"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ],
        "demo": "viz-layout"
      },
      {
        "title": "Compression",
        "minutes": 3,
        "kind": "definition",
        "notes": "Define lossless compression and ask why it can make scans faster despite decode work. Expected: fewer bytes to fetch can outweigh decompression cost. The pattern and type distribution drive suitable encoding choices; no fixed compression factor is guaranteed. Distinguish encoding from a general-purpose compression codec, while noting they can combine.",
        "definition": "Lossless compression stores the same information using fewer bytes.",
        "id": "compression",
        "steps": 3,
        "states": [
          "Repeated information",
          "A compact encoding",
          "Reconstruct exactly"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ],
        "term": "Lossless compression"
      },
      {
        "title": "Runs",
        "minutes": 3,
        "kind": "activity",
        "notes": "Before the reveal ask how to represent eight 1s, eight 2s and eight 3s. Expected: three runs. In the widget the teaching byte model changes 96 bytes into 24, a factor of four. Ask what happens if the same months alternate randomly. Expected: runs become short and the benefit can collapse. Sorting can improve compression but has a write and ordering cost. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "runs",
        "steps": 3,
        "states": [
          "Twenty-four values",
          "Three runs",
          "Compare payload bytes"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ],
        "demo": "viz-enc"
      },
      {
        "title": "Dictionary and deltas",
        "minutes": 3,
        "kind": "visual",
        "notes": "Ask which patterns justify each encoding: low-cardinality strings favor a dictionary; smooth numeric sequences favor deltas. The widget assumes a tiny dictionary and bit-packed codes, and its delta example also compresses repeated differences. These are illustrative byte counts, not a promise of exact Parquet output size. Have students recover one original value from the encoded form before moving on. The slide recreates the mechanism as editable SVG. The optional source-demo link provides the original widget; its full-page explanatory prose is not projected in this deck.",
        "id": "dictionary-and-deltas",
        "steps": 3,
        "states": [
          "Two repeated strings",
          "Dictionary codes",
          "Start and deltas"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ],
        "demo": "viz-enc"
      },
      {
        "title": "Batches through the pipeline",
        "minutes": 3,
        "kind": "visual",
        "notes": "Connect to Lecture 4’s pull interface. DuckDB commonly processes chunks with vectors of around 2048 values; batch processing amortizes dispatch and improves locality. Vectorized execution is not identical to SIMD or multicore parallelism, though either may help. Do not say overhead vanishes: operators still perform useful work, and selection vectors, nulls and types introduce machinery. Ask which cost is reduced by batching.",
        "id": "batches-through-the-pipeline",
        "steps": 3,
        "states": [
          "One row per call",
          "A batch enters",
          "A batch moves onward"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ]
      },
      {
        "title": "Skip a row group",
        "minutes": 3,
        "kind": "activity",
        "notes": "Let students decide which groups can be ruled out before opening them. Min/max statistics can prove absence; they cannot prove every row in the surviving group matches. Partition pruning and row-group skipping operate at different levels. Unsorted or overlapping ranges reduce skipping effectiveness. Explain that metadata itself must be read, and selected compressed pages still need decoding.",
        "id": "skip-a-row-group",
        "steps": 3,
        "states": [
          "Inspect min and max",
          "Rule out two groups",
          "Open the possible match"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ]
      },
      {
        "title": "Skip eleven partitions",
        "minutes": 3,
        "kind": "visual",
        "notes": "Ask what makes the folder filter available without inspecting all values. Expected: the partition value is encoded in the directory layout. Contrast skipping files using partition metadata with checking row-group statistics inside files. Partition keys should suit common filters; many tiny partitions can impose overhead. Keep the month label as meaningful data rather than a paragraph.",
        "id": "skip-eleven-partitions",
        "steps": 3,
        "states": [
          "Twelve month folders",
          "Choose December",
          "Project within that partition"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ]
      },
      {
        "title": "Predict the byte ratio",
        "minutes": 3,
        "kind": "activity",
        "notes": "Give pairs one minute with the assumptions: 60,000 rows, 12 columns, eight bytes per value, twelve equal partitions, reading only fare. The row-to-projected-partition ratio is 144. This estimates payload bytes before metadata, encodings and compression; it is not a wall-clock speedup guarantee. A month filter supplied by the directory need not read a separate month data column. Ask what changes if December contains half the rows.",
        "id": "predict-the-byte-ratio",
        "steps": 3,
        "states": [
          "All row payload",
          "One column",
          "One column in one partition"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ]
      },
      {
        "title": "An engine inside the process",
        "minutes": 3,
        "kind": "visual",
        "notes": "Explain the embedded deployment: no separate database server is required for the lab. DuckDB provides analytical SQL over files and in-process dataframes. It supports transactions and WAL and can have concurrent writers within one process; cross-process write coordination differs from a client-server database. Pandas and DuckDB can compose. Keep code invocation details in presenter notes so the audience sees the dataflow.",
        "id": "an-engine-inside-the-process",
        "steps": 3,
        "states": [
          "Engine in the process",
          "Read files or dataframes",
          "Return a dataframe"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ]
      },
      {
        "title": "Storage and compute separate",
        "minutes": 3,
        "kind": "visual",
        "notes": "Ask what can scale independently. Expected: durable stored data and compute used to query it. Describe warehouse and data-lake ideas as architecture, not identical vendor implementation. A lake can be files readable by multiple engines; a warehouse adds managed execution and services. Object storage supports range reads but not arbitrary in-place file edits like a local disk. Avoid the source’s overbroad whole-object-only claim.",
        "id": "storage-and-compute-separate",
        "steps": 3,
        "states": [
          "One compute group",
          "Scale compute separately",
          "Stored data remains"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ]
      },
      {
        "title": "A table over files",
        "minutes": 3,
        "kind": "definition",
        "notes": "Define the lakehouse briefly. Explain that transactional metadata identifies the files belonging to a table snapshot; readers do not discover partial commits by naively listing a folder. Iceberg and Delta use different metadata and commit protocols; a single generic manifest is a conceptual picture. Connect snapshot history to MVCC and mention cleanup retention costs. Atomic metadata publication and concurrency control are necessary, not just writing a file list.",
        "definition": "A lakehouse adds transactional table metadata to data stored in open files.",
        "id": "a-table-over-files",
        "steps": 3,
        "states": [
          "Snapshot A",
          "Write files for B",
          "Publish B; old readers keep A"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ],
        "term": "Lakehouse"
      },
      {
        "title": "Train a model inside the query engine",
        "minutes": 5,
        "kind": "activity",
        "notes": "Define in-database machine learning as training or applying a model using database execution over stored data. Separate feature preparation, which only produces inputs, from learning parameters. Use the runnable Lecture 10 demo: ml_rides stores four training rows with distance/fare pairs (1,6), (2,6), (3,8), (4,12), and two held-out rows. Ask which operators fit a one-feature line. Expected: scan ml_rides, filter split = train, aggregate regr_intercept(fare, distance) and regr_slope(fare, distance), then store b = 3 and w = 2 in one model row. Emphasize argument order: target first, feature second. These coefficients are estimated from the training rows; SQL is doing the training, not merely fetching data for Python. Show the SQL in the companion reading and run in_database_ml.py; Python dispatches statements and prints results. Ask why test rows must stay outside the aggregate. Expected: evaluating on rows that influenced the fit would contaminate the held-out check. This tiny synthetic example explains execution, not real taxi-fare accuracy.",
        "id": "train-inside-the-query-engine",
        "steps": 4,
        "states": [
          "Separate training rows",
          "Aggregate target and feature",
          "Store learned coefficients",
          "A fitted prediction expression"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html#in-database-ml"
        ]
      },
      {
        "title": "Evaluate and apply the saved model",
        "minutes": 5,
        "kind": "activity",
        "notes": "Have pairs predict fares for the held-out distances 2.5 and 4.5 using b + w * distance. Expected: 8 and 12 dollars; actual fares are 9 and 11, so MAE and RMSE are both one dollar. The two synthetic test rows do not establish real-world generalization. Trace the scoring plan: scan the test rows, cross join the one-row model table, project the prediction, then aggregate errors for evaluation. Keeping more than one model row would multiply results, so a production query selects a specific model version. A new unlabeled 3.5-mile ride scores at ten dollars without retraining. Ask which data crosses into Python: only the requested result, not a training matrix. Finally show the managed BigQuery ML example in the reading: CREATE MODEL with linear_reg learns a model, ML.EVALUATE receives explicit test data, and ML.PREDICT scores new inputs. Its setup requires a cloud dataset and permissions and may incur charges; the local DuckDB demo needs no cloud account. An SQL interface alone does not guarantee that every vendor model executes in the database process; remote models can invoke external services. Discuss saved-model versioning, feature consistency, and the cost of sharing compute with other queries.",
        "id": "evaluate-and-apply-the-model",
        "steps": 4,
        "states": [
          "Keep evaluation rows separate",
          "Apply the learned expression",
          "Measure error and score a new row",
          "Map to managed ML statements"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html#in-database-ml"
        ]
      },
      {
        "title": "Performance becomes cost",
        "minutes": 2,
        "kind": "activity",
        "notes": "Ask which changes can lower bytes-scanned billing and which may lower compute duration. BigQuery on-demand commonly prices scanned data; Snowflake-style compute billing is different, so avoid one pricing rule for every warehouse. No actual price quote is needed. In Lab 8 students compare CSV/Parquet, projection and pruning; actual timings depend on machine, caching and data, so the deck must not promise the source’s universal 100× result.",
        "id": "performance-becomes-cost",
        "steps": 3,
        "states": [
          "Read everything",
          "Read one column",
          "Read one partition"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ]
      },
      {
        "title": "Choose the shape",
        "minutes": 2,
        "kind": "recap",
        "notes": "Have students choose the access shape and narrate the savings: fewer unrelated columns, encodings, batches and skipping. Lab 8 uses eight SQL queries and a fixed sample of real 2024 NYC taxi trips; project proposals are due Thursday October 29. Direct setup details to notes or the lab link. Next lecture asks what happens when the column stores an embedding and the query asks for similarity. The scheduled quiz is separate from this 60-minute teaching deck. Add one final retrieval question: which stage learns coefficients and which reuses them? Expected: training aggregates learn them; inference applies the saved model without fitting again.",
        "id": "choose-the-shape",
        "steps": 3,
        "states": [
          "Point lookup",
          "Whole-table aggregate",
          "Partitioned aggregate"
        ],
        "sources": [
          "lectures/lecture-10/analytics.html"
        ]
      }
    ]
  }
];
for (const deck of plans) {
 deck.scenes.forEach((scene, i) => { scene.draw = draws[deck.id][i]; });
 const lectureSixTeaching = deck.id === 6 ? new Map(deck.scenes.map(scene => [scene.id, scene.teaching])) : null;
 window.CourseTraceSlides.apply(deck);
 if (deck.id === 6) {
   for (const scene of deck.scenes) {
     if (!scene.traceId) continue;
     const example = window.CourseTraces.examples[scene.traceId];
     scene.teaching = {...lectureSixTeaching.get(scene.id), builds: example.frames.map(frame => frame.explanation)};
     scene.teaching.question = example.question;
     scene.teaching.answer = example.answer;
   }
 }
 window.COURSE_DECKS = window.COURSE_DECKS || {};
 window.COURSE_DECKS[deck.id] = deck;
}
})();
