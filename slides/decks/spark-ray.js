/* Lecture 13B: native SVG diagrams with captions and structured presenter cues.
 * Sixty teaching minutes are followed by a separate fifteen-minute discussion.
 * Lunch orders and execution diagrams are teaching examples, not benchmarks. */
(function () {
  'use strict';
  const P=window.DeckViz.palette;
  const decks=window.COURSE_DECKS=window.COURSE_DECKS||{};
  const source='lectures/lecture-13/spark-ray.html';
  const refs={
    mapreduce:'https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/',
    spark:'https://spark.apache.org/docs/latest/rdd-programming-guide.html',
    cluster:'https://spark.apache.org/docs/latest/cluster-overview.html',
    reduce:'https://spark.apache.org/docs/latest/api/python/reference/api/pyspark.RDD.reduceByKey.html',
    sql:'https://spark.apache.org/docs/latest/sql-programming-guide.html',
    tasks:'https://docs.ray.io/en/latest/ray-core/tasks.html',
    objects:'https://docs.ray.io/en/latest/ray-core/objects.html',
    actors:'https://docs.ray.io/en/latest/ray-core/actors.html',
    order:'https://docs.ray.io/en/latest/ray-core/actors/task-orders.html',
    retries:'https://docs.ray.io/en/latest/ray-core/fault_tolerance/tasks.html',
    actorFailure:'https://docs.ray.io/en/latest/ray-core/fault_tolerance/actors.html',
    waiting:'https://docs.ray.io/en/latest/ray-core/patterns/ray-get-loop.html',
    overhead:'https://docs.ray.io/en/latest/ray-core/patterns/too-fine-grained-tasks.html'
  };
  const scenes=[];
  const wrap=(text,width)=>{
    const lines=[''];
    for(const word of text.split(/\s+/)){
      const i=lines.length-1;
      if(lines[i]&&(lines[i]+' '+word).length>width)lines.push(word);
      else lines[i]+=(lines[i]?' ':'')+word;
    }
    return lines;
  };
  function label(d,key,x,y,text,size=25,color=P.ink){d.text(key,x,y,text,size,color);}
  function box(d,key,x,y,w,h,title,lines=[],color=P.green,active=true){
    const light=color===P.blue?P.blueLight:color===P.orange?P.orangeLight:color===P.red?P.redLight:P.greenLight;
    d.rect(key,x,y,w,h,active?light:P.white,active?color:P.line,10,2);
    label(d,key+'-title',x+w/2,y+35,title,27,active?color:P.ink);
    lines.forEach((line,i)=>label(d,key+'-line-'+i,x+w/2,y+78+i*33,line,23));
  }
  function foot(d,text){label(d,'body-foot',640,638,text,23,P.muted);}
  function order(d,key,x,y,title,text){box(d,key,x,y,305,125,title,[text],P.blue,false);}
  function arrow(d,key,x1,y1,x2,y2,color=P.green){d.arrow(key,x1,y1,x2,y2,color,3);}
  // Python stays editable SVG text. Preserve indentation and highlight the current operation.
  function python(d,title,lines,active=[]){
    d.rect('python-panel',45,190,760,420,P.white,P.line,10,2);
    d.text('python-title',65,219,title,22,P.muted,'start',650);
    lines.forEach((line,i)=>{
      const y=258+i*30;
      if(active.includes(i))d.rect('python-highlight-'+i,57,y-14,736,28,P.orangeLight,'none',4);
      d.add('python-line-'+i,'text',{x:68,y,fill:P.ink,'font-size':24,style:'font-family:ui-monospace, SFMono-Regular, Menlo, monospace;white-space:pre','xml:space':'preserve','text-anchor':'start','dominant-baseline':'middle'},line);
    });
  }
  function trace(d,key,y,title,lines=[],color=P.green){
    d.rect(key,840,y,390,55+lines.length*30,P.white,color,10,2);
    label(d,key+'-title',1035,y+27,title,25,color);
    lines.forEach((line,i)=>label(d,key+'-line-'+i,1035,y+64+i*30,line,23));
  }
  function codeLine(d,key,y,text){
    d.add(key,'text',{x:640,y,fill:P.ink,'font-size':24,style:'font-family:ui-monospace, SFMono-Regular, Menlo, monospace;white-space:pre','xml:space':'preserve','text-anchor':'middle','dominant-baseline':'middle'},text);
  }
  function scene(id,title,minutes,states,captions,draw,teaching,sources=[]){
    const builds=teaching.builds.map((cue,i)=>captions[i]+'\n\n'+cue);
    const sc={id,title,minutes,kind:'visual',steps:states.length,states,clarityNative:true,clarityCaptions:captions,
      sources:[source,...sources],teaching:{...teaching,builds},
      notes:[teaching.idea,...builds,'Ask: '+teaching.question,'Expected answer: '+teaching.answer,teaching.context].filter(Boolean).join('\n\n'),
      draw(d,step){
        label(d,'lecture-title',640,53,title,38);
        const lines=wrap(captions[step],92);
        lines.forEach((line,i)=>label(d,'caption-'+i,640,lines.length===1?123:110+i*33,line,26));
        draw(d,step);
        label(d,'step-footer',640,690,'Step '+(step+1)+' of '+states.length+' · '+states[step],21,P.muted);
      }};
    scenes.push(sc);
  }

  scene('same-orders-two-runtimes','More capacity requires coordination',3,
    ['Start with a local loop','Add a reporting window','Ask who coordinates'],[
      'Two lunch orders need only a local loop. The fixture gives pizza = 3 and salad = 1.',
      'A hypothetical delivery report must scan 10 TB within 10 minutes. One 2 GB/s reader cannot finish in time.',
      'A runtime coordinates running work. Spark follows a sequence of data operations. Ray schedules Python calls. Both must preserve correct results.'
    ],(d,s)=>{
      if(s===0){
        order(d,'order0',65,260,'Order 0','“Pizza, pizza!”');
        order(d,'order1',65,435,'Order 1','“Salad pizza.”');
        arrow(d,'to-total',390,410,505,410);
        box(d,'baseline',530,335,285,165,'Local loop',['pizza: 3','salad: 1']);
        box(d,'small-job',900,335,300,165,'Small input',['One computer is enough'],P.blue,false);
      }
      if(s===1){
        box(d,'report',90,275,450,245,'Delivery report',['Stored records: 10 TB','Reporting window: 10 min','Assumed read rate: 2 GB/s'],P.blue);
        arrow(d,'read-cost',560,400,700,400,P.orange);
        box(d,'single-reader',730,275,460,245,'One reader',['10 TB ÷ 2 GB/s = 5,000 s','About 85 minutes to read','Read alone exceeds the window'],P.orange);
      }
      if(s===2){
        box(d,'capacity',65,275,340,260,'100 readers',['100 GB per reader','50 s ideal read','Before coordination costs'],P.green);
        box(d,'spark',470,275,340,260,'Spark',['Run data operations','Group matching meal keys','Restore missing results'],P.orange);
        box(d,'ray',875,275,340,260,'Ray Core',['Schedule Python calls','Track needed results','Your code combines counts'],P.blue);
      }
      label(d,'opening-limit',640,600,s===0?'Fictional club lunch · Keep this result contract when execution changes':'Hypothetical capacity estimate · Scheduling, transfer, computation, and failures add time',22,P.muted);
      d.link('mapreduce-paper',470,646,'Google MapReduce paper · 2004',refs.mapreduce,22);
    },{
      idea:'Execution frameworks coordinate work when workload requirements justify distributing it.',
      builds:[
        'Return to the fictional lunch orders from Lecture 13. A local loop is sufficient for these two records. Ask why introducing Spark or Ray would not make this tiny input a convincing benchmark. We keep the fixture to see whether each implementation counts every request.',
        'Introduce a separate hypothetical food-delivery report over 10 TB of stored records. Its reporting window is ten minutes. At an assumed 2 GB/s, reading alone takes 5,000 seconds, or about 85 minutes. The window is an illustrative business requirement, not a course deadline. Ask which resource limits this scan before proposing more machines.',
        'With 100 balanced readers, each reads 100 GB in an ideal 50 seconds. A cluster is a group of computers working together. A runtime is software that coordinates running work. Spark describes a pipeline: a sequence of data operations. Ray schedules function calls, while our example combines their dictionaries explicitly. This estimate is not a benchmark or a guaranteed running time.'
      ],question:'Why consider distribution for the delivery report but not for the two lunch orders?',answer:'The hypothetical report cannot meet its ten-minute window with the assumed single-reader scan. The lunch fixture is small enough for a local loop.',
      context:'Google’s 2004 MapReduce paper explains separating map and reduce functions from scheduling, communication, and failure handling. Spark and Ray expose different execution models. Teaching occupies minutes 0–60, followed by fifteen discussion minutes. There is no quiz in this session.'
    });
  scenes[0].sources=[refs.mapreduce,source];

  scene('spark-driver-executors','Spark: the driver schedules executor work',3,
    ['Describe the roles','Assign partition tasks','Return a small result'],[
      'The driver coordinates the application. Executors are processes that run its assigned work and retain data.',
      'A partition is a data subset. A task processes a partition. An executor can run many tasks over time.',
      'collect() brings the result to the driver. Use it only when that result fits there.'
    ],(d,s)=>{
      box(d,'driver',455,220,370,120,'Driver',['Your coordinating program'],P.orange);
      box(d,'executor0',85,440,450,145,'Executor A',s?['Task: input partition 0','“Pizza, pizza!”']:['Worker process'],P.blue);
      box(d,'executor1',745,440,450,145,'Executor B',s?['Task: input partition 1','“Salad pizza.”']:['Worker process'],P.blue);
      if(s===1){arrow(d,'schedule0',515,350,320,425,P.orange);arrow(d,'schedule1',765,350,955,425,P.orange);}
      if(s===2){arrow(d,'return0',320,425,515,350,P.green);arrow(d,'return1',955,425,765,350,P.green);}
      if(s>=2){label(d,'small-result',640,385,'Small result → driver',25,P.green);}
      foot(d,'Role diagram · Local mode can run these roles on one machine');
    },{
      idea:'Spark separates the program that coordinates work from the processes that execute its tasks.',
      builds:[
        'Define the driver and executors before following the arrows. A process is a running program. A cluster manager allocates resources to applications, and the driver requests those resources. Executors belong to this application. The drawing separates roles, not a required machine count.',
        'Give each of the two input partitions a task. A partition is data, a task is a unit of execution, and an executor is a process. Those terms describe different things. PySpark also uses Python workers for Python functions.',
        'Explain that collect returns the complete result to the driver. Our two totals are small. Collecting a large dataset can exceed driver memory. A distributed write is usually more suitable for a large output.'
      ],question:'Does having eight partitions require eight executor processes?',answer:'No. Executors can process several partition tasks, concurrently when resources allow or in successive waves.'
    },[refs.cluster,refs.spark]);

  scene('spark-lazy-plan','RDD transformations describe work',4,
    ['Start with a collection','Add transformations','Request an action'],[
      'An RDD is a Resilient Distributed Dataset: a collection split into partitions.',
      'A transformation describes a new RDD without changing its input. Dependencies record which earlier data each operation needs.',
      'collect() is an action. It requests the result and starts the required computation.'
    ],(d,s)=>{
      if(s===0){
        python(d,'Python · create the input RDD',[
          'from pyspark import SparkContext','',
          'sc = SparkContext(',
          '    master="local[2]", appName="Lunch counts")',
          'orders = ["Pizza, pizza!", "Salad pizza."]','',
          'source = sc.parallelize(orders, numSlices=2)'
        ],[6]);
        trace(d,'input0',240,'Input partition 0',['“Pizza, pizza!”'],P.blue);
        trace(d,'input1',410,'Input partition 1',['“Salad pizza.”'],P.blue);
        foot(d,'local[2]: two local execution threads · numSlices=2: two input partitions');
      }else{
        const lines=['import re','from operator import add','def split_order(order):',
          '    return re.findall(r"[a-z]+", order.lower())','',
          'meals = source.flatMap(split_order)',
          'pairs = meals.map(lambda meal: (meal, 1))',
          'counts = pairs.reduceByKey(add, numPartitions=2)'];
        if(s===2)lines.push('','totals = dict(sorted(counts.collect()))');
        python(d,s===1?'Python · describe the count':'Python · request the result',lines,s===1?[5,6,7]:[9]);
        trace(d,'plan',210,'Recorded plan',['source → meals → pairs','→ counts'],P.blue);
        arrow(d,'action',1035,340,1035,385,s===1?P.muted:P.orange);
        trace(d,'plan-state',400,s===1?'No action yet':'collect() starts work',s===1?['No totals computed']:['pizza: 3','salad: 1'],s===1?P.muted:P.orange);
        foot(d,'split_order extracts lowercase words · add sums two values · An action requests the result');
      }
    },{
      idea:'Spark records transformations and executes the required plan when an action requests results.',
      builds:[
        'Expand RDD and identify its two example partitions. SparkContext connects this driver to Spark. local[2] requests two local execution threads, while numSlices=2 splits the list into two input partitions. Those settings describe different things. An RDD is a logical collection, not one large Python list held by the driver. These excerpts share variables across slides. The reading provides the complete script, including sc.stop() cleanup.',
        'Read split_order first. re.findall extracts lowercase letter sequences, preserving repeated meal names. The imported add function sums two values. Follow the assignments from source to meals, pairs, and counts. A lambda is a short Python function. Here it returns one meal and its count of 1. flatMap extracts words, map attaches counts, and reduceByKey adds matching keys. Lazy evaluation means these transformations wait until an action needs their results. Ask whether writing these expressions has computed the totals.',
        'Reveal collect. An action starts the computation needed for its result. Spark uses the recorded dependencies to schedule that work. collect does not promise key order. sorted orders the collected pairs for display, and dict turns those pairs into a dictionary. The counts establish correctness.'
      ],question:'Is reduceByKey an action because its name contains “reduce”?',answer:'No. reduceByKey defines another RDD. An action such as collect requests its result.'
    },[refs.spark]);

  scene('spark-map-word-occurrences','flatMap and map keep every occurrence',3,
    ['Read both partitions','Extract the words','Attach one to each word'],[
      'Each input partition contains one order in this small example.',
      'flatMap extracts words from each record and places those words in the output collection.',
      'map converts each word to (word, 1). Both pizza requests in order 0 remain present.'
    ],(d,s)=>{
      python(d,'Python · one record → words → pairs',[
        'def split_order(order):',
        '    return re.findall(r"[a-z]+", order.lower())','',
        'meals = source.flatMap(split_order)','',
        'pairs = meals.map(lambda meal: (meal, 1))'
      ],s===0?[]:s===1?[0,1,3]:[5]);
      trace(d,'p0',230,'Partition 0',s===0?['“Pizza, pizza!”']:s===1?['pizza, pizza']:['(pizza, 1)','(pizza, 1)'],P.blue);
      trace(d,'p1',430,'Partition 1',s===0?['“Salad pizza.”']:s===1?['salad, pizza']:['(salad, 1)','(pizza, 1)'],P.green);
      foot(d,s===2?'lambda meal: (meal, 1) is a function that returns one pair per word':'re.findall extracts lowercase letter sequences · Repeated words remain present');
    },{
      idea:'flatMap changes the number of elements, while map applies one function to each element.',
      builds:[
        'Read the two input records. Each partition contains one record here for visibility. Real partitions usually contain many records. Partition boundaries do not change the result contract.',
        'Extract lowercase letter sequences. flatMap emits the words from each order into the output collection. Contrast one record containing several words with several individual word elements.',
        'Attach the value 1 to every word. Explain key and value again: the key names the meal, and the value represents one request. Four occurrences produce four pairs. Removing repeated words would change the answer.'
      ],question:'What would go wrong if partition 0 emitted pizza only once?',answer:'The final pizza count would be 2 instead of 3 because one requested meal was discarded.'
    },[refs.spark]);

  scene('spark-local-combine','Combine local counts before sending them',3,
    ['Keep occurrence pairs','Compute partial sums','Preserve the total weight'],[
      'A partial count summarizes part of the input. Spark reduceByKey can add matching values within each input partition.',
      'Partition 0 produces (pizza, 2). Partition 1 produces (salad, 1) and (pizza, 1).',
      'Three partial-count pairs represent four requests. Add their values, not their number of pairs.'
    ],(d,s)=>{
      codeLine(d,'combine-code',205,'counts = pairs.reduceByKey(add, numPartitions=2)');
      box(d,'p0',70,255,480,190,'Input partition 0',s?['Local sum','(pizza, 2)']:['(pizza, 1)','(pizza, 1)'],P.blue);
      box(d,'p1',730,255,480,190,'Input partition 1',s?['(salad, 1)','(pizza, 1)']:['(salad, 1)','(pizza, 1)'],P.green);
      if(s>=1){label(d,'pair-count',640,505,'Pairs sent: 3',30,P.orange);}
      if(s>=2){label(d,'weight',640,566,'Requests represented: 2 + 1 + 1 = 4',34,P.ink);}
      foot(d,'add comes from operator · Spark uses it for local sums and final sums');
    },{
      idea:'A valid local combine reduces transfer without losing the contributions represented by the values.',
      builds:[
        'Return to the four occurrence pairs. Spark reduceByKey performs local merging for its combining function. For addition, replacing two ones with their sum preserves the final result. This differs from the graded micro-mapreduce mapper, which emits occurrences.',
        'Reveal the three partial pairs. The value 2 represents two original requests. A value is no longer always 1 after local combining. The second partition still contributes two different keys.',
        'Ask students to count pairs and then count represented requests. Those quantities differ. A contribution’s weight is the number of requests its value represents. For an average, preserve both sum and count rather than averaging unequal partial averages. Addition is the only combining rule used in this fixture.'
      ],question:'Why does (pizza, 2) preserve both requests while a single (pizza, 1) does not?',answer:'The value 2 retains the combined contribution. The value 1 would discard one occurrence.'
    },[refs.reduce]);

  scene('spark-shuffle-stages','Spark combines counts before and after the shuffle',4,
    ['Run partition-local operations','Move partial contributions','Sum each destination group'],[
      'A stage runs tasks without a shuffle between their operations. Stage 0 extracts words, attaches counts, and adds local values.',
      'The shuffle sends every contribution for pizza to its destination, including the partial value 2.',
      'Stage 1 combines the received values: pizza gets [2, 1], while salad gets [1].'
    ],(d,s)=>{
      codeLine(d,'shuffle-code',184,'pairs.reduceByKey(add, numPartitions=2).collect()');
      d.rect('stage0',35,220,750,390,P.white,P.line,12,2);
      d.rect('stage1',1000,220,250,390,P.white,P.line,12,2);
      label(d,'stage0-title',410,250,'Stage 0 · read and count locally',28,P.ink);
      label(d,'stage1-title',1125,250,'Stage 1 · add',28,P.ink);
      label(d,'input-heading',165,291,'Input partition',23,P.muted);
      label(d,'pairs-heading',430,291,'flatMap → map',23,P.muted);
      label(d,'combine-heading',680,291,'Local sum',23,P.muted);
      label(d,'shuffle-label',890,291,'Shuffle',27,P.ink);
      label(d,'output-heading',1125,291,'One total per key',23,P.muted);
      for(let i=0;i<2;i++){
        const y=i?475:325;
        d.rect('input'+i,65,y,200,110,P.bg,P.line,8,2);
        label(d,'input-name'+i,165,y+32,'Partition '+i,24,P.ink);
        label(d,'input-order'+i,165,y+76,i?'“Salad pizza.”':'“Pizza, pizza!”',25,P.ink);
        arrow(d,'input-to-pairs'+i,275,y+55,320,y+55,P.muted);
      }
      d.rect('pairs0',330,325,200,110,P.blueLight,P.blue,8,2);
      label(d,'pair0a',430,355,'(pizza, 1)',26);
      label(d,'pair0b',430,405,'(pizza, 1)',26);
      d.box('pair1a',330,475,200,52,'(salad, 1)',P.greenLight,P.green,26);
      d.box('pair1b',330,533,200,52,'(pizza, 1)',P.blueLight,P.blue,26);
      arrow(d,'local0',540,380,590,380,P.muted);
      arrow(d,'local1a',540,501,590,501,P.muted);
      arrow(d,'local1b',540,559,590,559,P.muted);
      d.box('partial0',600,351,160,58,'(pizza, 2)',P.blueLight,P.blue,26);
      d.box('partial1a',600,475,160,52,'(salad, 1)',P.greenLight,P.green,26);
      d.box('partial1b',600,533,160,52,'(pizza, 1)',P.blueLight,P.blue,26);
      if(s>=1){
        d.path('shuffle0-curve','M 770 380 C 870 380 920 365 1010 365','none',P.blue,3);
        arrow(d,'shuffle0',1010,365,1020,365,P.blue);
        d.path('shuffle1-curve','M 770 559 C 880 559 900 410 1010 410','none',P.blue,3);
        arrow(d,'shuffle1',1010,410,1020,410,P.blue);
        // A background stroke keeps the crossing routes visually separate.
        d.path('shuffle2-gap','M 770 501 C 870 501 920 535 1010 535','none',P.bg,11);
        d.path('shuffle2-curve','M 770 501 C 870 501 920 535 1010 535','none',P.green,3);
        arrow(d,'shuffle2',1010,535,1020,535,P.green);
        d.rect('pizza',1025,328,200,110,P.blueLight,P.blue,8,2);
        label(d,'pizza-title',1125,365,s===2?'pizza: 3':'pizza',30,P.blue);
        label(d,'pizza-sum',1125,410,s===2?'2 + 1 = 3':'[2, 1]',27);
        d.rect('salad',1025,475,200,110,P.greenLight,P.green,8,2);
        label(d,'salad-title',1125,510,s===2?'salad: 1':'salad',30,P.green);
        label(d,'salad-sum',1125,555,s===2?'1 = 1':'[1]',27);
      }
      foot(d,'Key groups shown · Different keys can share an output partition');
    },{
      idea:'A shuffle moves contributions between partitions and creates a scheduling boundary between stages.',
      builds:[
        'Follow both orders from left to right. flatMap extracts four words, and map makes four occurrence pairs. reduceByKey combines the two pizza pairs in partition 0 into (pizza, 2). Partition 1 retains one contribution for each meal. A stage groups tasks that run without a shuffle between their operations. Running these steps together is called pipelining. An action starts a job: the computation needed for its requested result. The visible collect call requests that work. Stage count is not the number of function calls.',
        'Trace the two blue routes into the pizza group. Their values are 2 and 1, so they still represent three pizza requests. Trace the green route into the salad group. Predict the totals before the next reveal. Shuffle can use network transfer and disk storage. These boxes show key groups, not a required assignment of keys to separate workers. Different keys can share an output partition.',
        'Add the values received by each group. Pizza gets 2 + 1 = 3, and salad gets 1. Return to the two input strings and account for all four requests. reduceByKey performs local and final addition. collect returns the two totals to the driver. Spark chooses task placement and partition assignments.'
      ],question:'What values must the pizza destination add?',answer:'It must add 2 from partition 0 and 1 from partition 1, producing 3.'
    },[refs.spark,refs.reduce]);

  scene('spark-partitions-tasks','Partitions, tasks, and workers differ',3,
    ['Name the data units','Schedule ready tasks','Distinguish narrow and shuffle dependencies'],[
      'Four partitions describe four subsets of data. They do not require four machines.',
      'An execution slot can run one task at a time. With two slots, four ready tasks can run in two waves.',
      'A narrow dependency keeps each parent partition’s output with at most one child. A shuffle can send it to several destinations.'
    ],(d,s)=>{
      if(s<2)for(let i=0;i<4;i++)box(d,'partition'+i,65+i*305,230,250,110,'Partition '+i,['Data subset'],P.blue,s===0);
      if(s===1){
        box(d,'slot0',130,425,440,140,'Slot A',['Task P0 → then task P2'],P.green);
        box(d,'slot1',710,425,440,140,'Slot B',['Task P1 → then task P3'],P.green);
      }
      if(s===2){
        d.rect('narrow-panel',45,205,570,390,P.white,P.line,10,2);
        d.rect('wide-panel',665,205,570,390,P.white,P.line,10,2);
        label(d,'narrow-title',330,240,'map → map: narrow',27,P.green);
        label(d,'shuffle-title',950,240,'reduceByKey: shuffle here',27,P.orange);
        for(let i=0;i<2;i++){
          const y=300+i*145;
          d.box('narrow-parent'+i,75,y,150,75,'Parent '+i,P.blueLight,P.blue,24);
          d.box('narrow-child'+i,435,y,150,75,'Child '+i,P.greenLight,P.green,24);
          arrow(d,'narrow-flow'+i,235,y+38,425,y+38,P.green);
          d.box('wide-parent'+i,695,y,150,75,'Parent '+i,P.blueLight,P.blue,24);
          d.box('wide-child'+i,1055,y,150,75,'Child '+i,P.orangeLight,P.orange,24);
        }
        for(let i=0;i<2;i++)for(let j=0;j<2;j++)arrow(d,'wide-flow'+i+j,855,337+i*145,1045,337+j*145,P.orange);
        label(d,'narrow-meaning',330,560,'Each parent feeds one child',23,P.green);
        label(d,'wide-meaning',950,560,'Each parent can feed both children',23,P.orange);
      }
      foot(d,s===2?'Arrows show data dependencies · Parent: input partition · Child: output partition':'Task counts describe stage partitions · Slots describe simultaneous execution capacity');
    },{
      idea:'Partition count controls task units while execution resources control how many tasks can run at once.',
      builds:[
        'Use four partitions in this separate scheduling illustration. A partition is a data subset. In a stage, Spark schedules a task for each required partition. A worker or executor can process more than one task over its lifetime.',
        'Define an execution slot as capacity to run one task at a time. Assume two slots are available. Four ready tasks therefore need at least two waves in this illustration. Task durations can differ. These rectangles do not measure time or promise balanced work.',
        'Parent means an input partition, and child means an output partition. For a narrow dependency, each parent contributes to at most one child. The left diagram traces two independent paths that can run without a shuffle. The right diagram lets each parent send values to both children. Our count requires this regrouping so matching meal keys meet. A narrow dependency does not prohibit every data transfer.'
      ],question:'Does adding partitions always increase simultaneous execution?',answer:'No. Tasks still need available resources. More partitions can create smaller tasks and additional scheduling overhead.'
    },[refs.spark,refs.cluster]);

  scene('spark-cache-recompute','Cache reusable data and rebuild lost output',3,
    ['Mark a collection for reuse','Compute, save, then reuse','Recompute a lost partition'],[
      'Caching asks Spark to retain computed partitions. Marking the RDD alone does not compute or store them.',
      'The first action computes and saves needed partitions. Later actions can reuse those saved values.',
      'If a cached partition is lost, Spark can recompute it from available inputs and recorded dependencies.'
    ],(d,s)=>{
      python(d,'Python · reuse the meals RDD',[
        'meals.cache()','',
        '# First action computes and stores meals.',
        'requests = meals.count()','',
        '# Later action can read cached partitions.',
        'sample = meals.take(2)'
      ],s===0?[0]:s===1?[3,6]:[6]);
      trace(d,'inputs',210,'Available inputs',['source → split_order'],P.blue);
      arrow(d,'compute',1035,315,1035,350,s===2?P.orange:P.green);
      trace(d,'cache',365,s===0?'Marked for reuse':'Cached meals',s===0?['P0: not stored','P1: not stored']:s===1?['P0: pizza, pizza','P1: salad, pizza']:['P0: lost → recompute','P1: still available'],s===2?P.orange:P.green);
      if(s>=1)label(d,'sample',1035,560,s===1?'count(): 4 · take(2): two pizzas':'Rebuild P0 for take(2)',22,P.green);
      foot(d,s===2?'Lineage records how to rebuild data · Inputs must remain accessible':'cache() marks reuse · count() counts elements · take(2) returns the first two');
    },{
      idea:'Caching reuses computed data, while lineage describes how lost data can be recomputed.',
      builds:[
        'Maya wants several queries over the same cleaned orders. Caching, also called persistence, asks Spark to retain computed partitions for reuse. Marking an RDD does not itself compute or save values. Predict which request will start that work. Choose what to retain from actual reuse and memory needs.',
        'The first action computes the required partitions and saves their values. This computation and storage is called materialization. Follow a later action to those saved values. The storage setting controls whether Spark retains data in memory, on disk, or both. Retained data consumes space that other work may need. Caching is a performance choice, not a requirement for correct counts.',
        'Erase one cached partition. Follow its recorded transformations back to available inputs. Define lineage as this dependency record. Recalculation must reproduce the required data. Lineage does not roll back writes made to an external service.'
      ],question:'Does cache make the meal counts permanently durable?',answer:'No. Cached partitions can be lost. Spark can recompute supported outputs when the required inputs and transformations remain available.'
    },[refs.spark]);

  scene('spark-skew','A frequent key can delay a stage',3,
    ['Start with several keys','Concentrate pizza requests','Inspect before changing the plan'],[
      'Skew means uneven data or work. A frequent meal key can send much of the work to one final group.',
      'Many pizza requests can leave one destination busy while other tasks finish.',
      'Spill is temporary data written to disk when memory is insufficient. Compare task times, input sizes, spill, and shuffle volume.'
    ],(d,s)=>{
      const widths=s?[690,170,140]:[330,300,320];
      for(let i=0;i<3;i++){
        label(d,'task'+i,170,300+i*90,'Task '+i,25);
        d.rect('track'+i,270,275+i*90,760,45,P.line,'none',6);
        d.rect('work'+i,270,275+i*90,widths[i],45,i===0&&s?P.orange:P.green,'none',6);
      }
      if(s>=1)label(d,'hot',640,555,'pizza is the frequent key',29,P.orange);
      foot(d,s===2?'Schematic work bars · Find the cause before choosing a remedy':'Schematic work bars · No measured times or speedup');
    },{
      idea:'Uneven key frequencies can concentrate work even when a job has many partitions.',
      builds:[
        'Connect the lunch orders to a much larger, hypothetical order collection. Explain skew as uneven data or work. These bars are schematic. They do not claim equal hardware, equal row cost, or measured duration.',
        'Concentrate many requests under pizza. Local combining helps a simple count, but other aggregations can retain much more state. A long task can also result from slow resources or an expensive function, so skew is a hypothesis to test.',
        'The Spark UI is a browser page that reports task and stage measurements. Compare input sizes, elapsed times, shuffle bytes, and temporary disk data called spill. Ask whether the longest task also received more data. Valid partial sums or salting may help a suitable workload. Salting splits a frequent key into temporary groups, then combines their results. More partitions alone do not split a same-key group.'
      ],question:'Does a long task prove that its partition has a frequent key?',answer:'No. Compare data sizes, spill, execution costs, and resource behavior before attributing the delay to skew.'
    },[refs.spark]);

  scene('spark-dataframe-rdd','Use DataFrames for structured operations',3,
    ['Expose the operation','Give Spark a relational plan','Keep RDDs for the mechanism'],[
      'A DataFrame is a table with named columns. Its schema specifies the column names and their types.',
      'A grouping expression describes a table operation. Spark SQL can choose how to execute that operation.',
      'The RDD example exposes partitions and combining. Choose the programming interface that fits the actual computation.'
    ],(d,s)=>{
      python(d,'Python · a separate DataFrame example',[
        'from pyspark.sql import SparkSession',
        'spark = (SparkSession.builder.master("local[2]")',
        '         .appName("Lunch table").getOrCreate())',
        'meals = spark.createDataFrame(',
        '    [("pizza",), ("pizza",),',
        '     ("salad",), ("pizza",)], ["meal"])','',
        'totals = meals.groupBy("meal").count()',
        'totals.explain(mode="formatted")',
        'totals.show()'
      ],s===0?[3,4,5]:s===1?[7,8]:[9]);
      trace(d,'rows',210,'Column: meal (string)',['pizza, pizza, salad, pizza'],P.blue);
      if(s>=1){arrow(d,'group',1035,315,1035,350);trace(d,'plan',360,'Group matching meals',['Count each group'],P.green);}
      if(s===2)trace(d,'result',500,'show() requests the result',['pizza: 3 · salad: 1'],P.orange);
      foot(d,'explain() displays the plan · show() displays rows · This meals variable is a DataFrame');
    },{
      idea:'Structured expressions expose information that Spark SQL can use when planning execution.',
      builds:[
        'Define schema as the named columns and their types. The diagram shows all four requests from the same fixture. A DataFrame represents structured data, even when its contents are spread across workers.',
        'Read groupBy meal followed by count. Relational operations act on tables, such as filtering rows, joining tables, and grouping values. Spark’s optimizer chooses an execution plan for supported expressions. Named columns and types help it reason about those operations. An arbitrary Python function can conceal these details. The diagram states a result, not a universal performance guarantee.',
        'Return to the RDD trace. We used it to expose map, partial aggregation, shuffle, and reduction. For ordinary structured joins and aggregations, a DataFrame is often the appropriate starting API. Measure the actual workload and inspect its plan.'
      ],question:'Why might Spark optimize a column expression more easily than an arbitrary Python function?',answer:'The column expression exposes relational structure and types. An arbitrary Python function can hide how it uses or transforms its inputs.'
    },[refs.sql]);

  scene('ray-task-results','Ray task calls return result references',4,
    ['Define a remote task','Submit both orders','Read completed results','Merge counts explicitly'],[
      'A Ray task is a function call scheduled by the runtime. Each count_order call handles one order.',
      '.remote() submits work and returns an ObjectRef, which identifies a result that may not be ready.',
      'ray.get(refs) waits for both results and returns them in the order of those references.',
      'Our driver adds matching dictionary counts. Ray Core does not automatically group these meal keys.'
    ],(d,s)=>{
      if(s===0){
        python(d,'Python · define the task function',[
          'import re','import ray','',
          '@ray.remote','def count_order(order):',
          '    counts = {}',
          '    words = re.findall(r"[a-z]+", order.lower())',
          '    for meal in words:',
          '        counts[meal] = counts.get(meal, 0) + 1',
          '    return counts'
        ],[3,4,8,9]);
        trace(d,'input',235,'One order',['“Pizza, pizza!”'],P.blue);
        arrow(d,'call',1035,340,1035,395);
        trace(d,'output',410,'Function result',['{"pizza": 2}'],P.green);
        foot(d,'@ray.remote enables remote submission · counts.get(meal, 0) supplies zero for a new meal');
      }else if(s<3){
        const lines=['ray.init(num_cpus=2, include_dashboard=False)',
          'orders = ["Pizza, pizza!", "Salad pizza."]','',
          'refs = []','for order in orders:',
          '    refs.append(count_order.remote(order))'];
        if(s===2)lines.push('','partials = ray.get(refs)');
        python(d,s===1?'Python · submit both orders':'Python · wait for the dictionaries',lines,s===1?[3,4,5]:[7]);
        trace(d,'result0',245,s===1?'refs[0]':'partials[0]',s===1?['ObjectRef: pending or ready']:['{"pizza": 2}'],P.blue);
        trace(d,'result1',425,s===1?'refs[1]':'partials[1]',s===1?['ObjectRef: pending or ready']:['{"salad": 1, "pizza": 1}'],P.green);
        foot(d,s===1?'Submit first · Each .remote() returns a reference, without waiting for the count':'The returned list follows reference order · It does not follow completion order');
      }else{
        python(d,'Python · merge inside the driver',[
          'totals = {}','for partial in partials:',
          '    for meal, count in partial.items():',
          '        totals[meal] = (',
          '            totals.get(meal, 0) + count)',
          'print(dict(sorted(totals.items())))'
        ],[1,2,3,4]);
        trace(d,'partials',205,'Task dictionaries',['pizza: 2','salad: 1, pizza: 1'],P.blue);
        arrow(d,'merge',1035,340,1035,390,P.orange);
        trace(d,'totals',405,'Driver totals',['pizza: 2 + 1 = 3','salad: 1'],P.orange);
        foot(d,'Add values for matching keys · An ordinary dictionary update would replace a value');
      }
    },{
      idea:'Ray schedules function calls and tracks their results, while this program explicitly combines the returned counts.',
      builds:[
        'Move from Spark collections to Ray Core function calls. Read the visible count_order definition before submitting a call. A decorator modifies the function defined immediately below it. The ray.remote decorator makes remote submission available. words holds the lowercase meal names. counts.get returns zero when the meal has no entry yet. The function returns local counts without changing shared state. The reading provides the complete script with cleanup in a finally block.',
        'Submit both calls before requesting their values. Define ObjectRef as a handle to a result. Receiving the reference does not mean the computation has finished. Ray schedules tasks subject to declared resources and available capacity.',
        'Wait with ray.get on the list of references. The returned list follows the reference order, even if tasks finish in the opposite order. This example gathers two small dictionaries. Gathering a large output at one driver can become a bottleneck.',
        'Add counts with the same meal name in the driver. Do not use ordinary dictionary update to combine repeated keys, because it replaces values. Use explicit addition or Counter.update. Ray Core has no automatic word-count shuffle in this program.'
      ],question:'Where are the two pizza contributions combined in this Ray example?',answer:'The driver combines the returned dictionaries explicitly. The Ray runtime schedules the two count_order tasks and tracks their results.'
    },[refs.tasks,refs.objects]);

  scene('ray-submit-before-wait','Submit independent work before waiting',4,
    ['Wait after each call','Submit both calls first','Separate permission from speed'],[
      'Waiting immediately after each submission prevents the driver from submitting the next task until the first completes.',
      'Submitting both calls first lets the runtime overlap them when resources are available.',
      'Concurrency means work can overlap in time. This submission order permits overlap but does not guarantee a speedup for tiny tasks.'
    ],(d,s)=>{
      python(d,s===0?'Python · wait inside the loop':'Python · wait after the loop',s===0?[
        'partials = []','for order in orders:',
        '    ref = count_order.remote(order)',
        '    partials.append(ray.get(ref))'
      ]:[
        'refs = []','for order in orders:',
        '    refs.append(count_order.remote(order))','',
        'partials = ray.get(refs)'
      ],s===0?[3]:s===1?[0,1,2]:[4]);
      label(d,'time',1035,235,'Time →',25,P.muted);
      if(s===0){
        d.box('serial0',850,300,165,70,'Task 0',P.orangeLight,P.orange,25);
        arrow(d,'serial-order',1025,335,1040,335,P.orange);
        d.box('serial1',1050,300,165,70,'Task 1',P.orangeLight,P.orange,25);
        trace(d,'waiting',450,'Driver waits twice',['Submit 0 → get 0','Submit 1 → get 1'],P.orange);
      }else{
        d.box('parallel0',850,300,210,70,'Task 0',P.greenLight,P.green,25);
        d.box('parallel1',850,395,210,70,'Task 1',P.blueLight,P.blue,25);
        label(d,'wait',1035,535,'One wait after both submissions',23,P.green);
      }
      foot(d,s===2?'Schematic schedules · Available resources permit overlap but do not guarantee speedup':'Both versions use the same count_order function · Ray is already initialized');
    },{
      idea:'Launching independent tasks before waiting removes an unnecessary serial dependency in the driver.',
      builds:[
        'Read a loop that submits one task and immediately calls ray.get. The wait prevents the loop from submitting the next task. The first task must finish before the second can even be scheduled by this driver.',
        'Move the wait after both submissions. Now both tasks are eligible to run. Explain the limit of the timeline: it assumes suitable available execution resources. Queueing, data movement, and resource constraints can still delay a task.',
        'Ask whether two tiny lunch strings justify a runtime. They are correctness examples, not benchmark workloads. Compare serial and parallel versions on the same larger workload before claiming a speedup. Preserve equality of returned results.'
      ],question:'What changes when ray.get moves outside the submission loop?',answer:'The driver can submit all independent tasks without waiting for earlier results, allowing the runtime to overlap eligible calls.'
    },[refs.waiting,refs.overhead]);

  scene('ray-dependency-references','A result reference expresses a dependency',3,
    ['Submit a producer','Pass its reference','Wait at the final boundary'],[
      'A producer creates a value that another task needs. Submitting it returns an ObjectRef while its value may still be pending.',
      'Pass the reference directly as an argument, rather than inside a list or dictionary. Ray waits for its value before running that task.',
      'Ray replaces the direct argument’s reference with its completed value. The consumer receives the dictionary, and the driver can await its final result.'
    ],(d,s)=>{
      const lines=['@ray.remote','def summarize(partial):',
        '    return sum(partial.values())','',
        'first_ref = count_order.remote("Pizza, pizza!")'];
      if(s>=1)lines.push('second_ref = summarize.remote(first_ref)');
      if(s===2)lines.push('print(ray.get(second_ref))');
      python(d,'Python · one result becomes another task’s input',lines,s===0?[4]:s===1?[5]:[6]);
      trace(d,'producer',205,'Producer: count_order',['first_ref identifies its result'],P.blue);
      if(s>=1){
        arrow(d,'dependency',1035,315,1035,355,P.orange);
        trace(d,'consumer',370,'Consumer: summarize',s===1?['Waits for the dictionary']:['Receives {"pizza": 2}'],P.green);
      }
      if(s===2)trace(d,'summary',510,'Final result',['sum([2]) = 2'],P.orange);
      foot(d,'Pass first_ref directly · Ray supplies the dictionary before summarize runs');
    },{
      idea:'Task-result references connect producers and consumers without requiring an intermediate driver wait.',
      builds:[
        'Use a separate dependency example after the main driver-merge program. A producer creates a value, and a consumer needs that value. The producer returns a count dictionary. The driver receives its reference while the task may still be running.',
        'Read summarize: it sums the values in one count dictionary. Pass first_ref directly to summarize.remote(first_ref). This is a top-level argument: the reference is not inside another list or dictionary. The consumer waits until the producer result is available. The driver can submit the consumer without first calling ray.get(first_ref).',
        'Resolve means replace the direct reference argument with its completed value. summarize receives the dictionary {pizza: 2}, not the pending reference. It returns 2. The driver waits on second_ref for that final result. Passing [first_ref] instead would give the function a list containing a reference. That nested reference is not automatically replaced with its value.'
      ],question:'Can the consumer run before the value it needs is available?',answer:'No. A top-level ObjectRef argument makes that result a scheduling dependency. The runtime resolves it before the function executes.'
    },[refs.objects]);

  scene('ray-put-shared-input','Put a reusable input in the object store',3,
    ['Identify repeated input','Create one reference','Pass it to several tasks'],[
      'Several tasks may need the same read-only menu or model input. Read-only means they do not change that shared input.',
      'Ray’s object store holds values for tasks to retrieve. ray.put(menu) stores a value there and returns a reusable reference.',
      'Pass menu_ref to each task. Reusing a reference avoids repeatedly submitting the same large value.'
    ],(d,s)=>{
      const lines=['@ray.remote','def check_order(order, menu):',
        '    return all(meal in menu',
        '               for meal in split_order(order))','',
        'menu = {"pizza", "salad"}'];
      if(s>=1)lines.push('menu_ref = ray.put(menu)');
      if(s===2)lines.push(
        'first_ref = check_order.remote(',
        '    "Pizza, pizza!", menu_ref)',
        'second_ref = check_order.remote(',
        '    "Salad pizza.", menu_ref)',
        'print(ray.get([first_ref, second_ref]))');
      python(d,'Python · reuse split_order and an initialized Ray session',lines,s===0?[0,1,2,3,5]:s===1?[6]:[7,8,9,10]);
      trace(d,'menu',205,s===0?'Menu value':'Object store: menu_ref',['{"pizza", "salad"}'],P.orange);
      if(s===2){
        arrow(d,'to-a',950,315,950,365,P.blue);
        d.line('to-b-top',1230,257,1250,257,P.blue,3);
        d.line('to-b-side',1250,257,1250,572,P.blue,3);
        arrow(d,'to-b',1250,572,1234,572,P.blue);
        trace(d,'check0',380,'Check order 0',['Receives menu → True'],P.green);
        trace(d,'check1',520,'Check order 1',['Receives menu → True'],P.green);
      }
      foot(d,'Tiny menu demonstrates the calls · The benefit concerns larger inputs · Data may still move');
    },{
      idea:'A reusable object reference lets several tasks depend on one submitted read-only input.',
      builds:[
        'Extend the lunch application to validate orders against a larger menu. The visible two-meal menu demonstrates the calls. A large shared menu is hypothetical. check_order reuses split_order to extract meal names. all returns True only when every extracted meal belongs to the menu. These short inputs do not need this optimization. Identify the reused input before choosing an object-store strategy.',
        'Call ray.put once and keep the returned ObjectRef. Ray places the object in its object store. This avoids repeatedly passing the same large Python value by value to many task submissions.',
        'Pass menu_ref as a direct argument. Tasks receive the object value after Ray resolves the reference. Copies may be transferred to other machines. Reconstructing Python values from transferred bytes also costs work. Stored objects are immutable: changing a local object does not update the stored value for other tasks. The reference does not create a shared editable dictionary.'
      ],question:'Does ray.put guarantee that no data crosses the network?',answer:'No. Ray may transfer the object to nodes that need it. Reusing its reference avoids repeated submissions of the same value.'
    },[refs.objects]);

  scene('ray-stateful-actor','An actor keeps state between calls',4,
    ['Define the actor class','Create an actor and call its method','Apply the next call'],[
      'An actor is a Python object hosted by a worker. Its state is data, such as this counter, retained between method calls.',
      'This synchronous actor finishes one method before starting the next. The first update adds two pizza requests.',
      'The next update sees the changed state and adds one pizza and one salad.'
    ],(d,s)=>{
      if(s===0){
        python(d,'Python · define the actor class',[
          '@ray.remote','class MealCounter:',
          '    def __init__(self):','        self.counts = {}','',
          '    def add(self, partial):',
          '        for meal, count in partial.items():',
          '            self.counts[meal] = (',
          '                self.counts.get(meal, 0)',
          '                + count)',
          '        return dict(self.counts)'
        ],[2,3]);
        trace(d,'class',245,'MealCounter class',['__init__: start empty','add: change stored counts'],P.blue);
        trace(d,'state',445,'Each instance keeps state',['self.counts'],P.green);
      }else{
        const lines=['counter = MealCounter.remote()','',
          'first = counter.add.remote({"pizza": 2})'];
        if(s===2)lines.push('second = counter.add.remote(',
          '    {"pizza": 1, "salad": 1})','',
          'snapshots = ray.get([first, second])');
        python(d,'Python · call methods on the same actor',lines,s===1?[0,2]:[3,4,6]);
        trace(d,'actor',205,'Actor: current state',s===1?['{"pizza": 2}']:['{"pizza": 3, "salad": 1}'],P.green);
        trace(d,'snapshot0',360,s===1?'Result identified by first':'snapshots[0]',['{"pizza": 2}'],P.blue);
        if(s===2)trace(d,'snapshot1',505,'Second returned snapshot',['{"pizza": 3, "salad": 1}'],P.orange);
      }
      foot(d,'Initialized Ray session · One synchronous actor · Returned snapshots keep their earlier values');
    },{
      idea:'An actor owns mutable state, while ordinary tasks are function calls that return results.',
      builds:[
        'A class defines an object’s data and methods. A method is a function attached to that object. The __init__ constructor creates an empty dictionary. self identifies the instance whose method is running. self.counts is state retained between calls while that actor remains alive. The add method adds each incoming count. Returning dict(self.counts) creates a separate snapshot, so later changes do not modify earlier returned results.',
        'MealCounter.remote creates one actor instance and returns its handle. The first add.remote call adds two pizzas and returns a result reference. An ordinary synchronous actor executes one method at a time. Without out-of-order options or retries, same-caller calls run in submission order. Other actor modes can allow methods to overlap, with different ordering rules.',
        'Apply the second update to the existing object. The new total depends on the first update. An actor can retain useful data, such as a loaded model. Durable storage retains data after the worker fails. An actor does not automatically save and restore its counter that way. Its restart and state recovery need an explicit design.'
      ],question:'Why can two calls to the same counter actor observe updated state?',answer:'Both methods operate on the same persistent remote object. A default synchronous actor executes those methods serially.'
    },[refs.actors,refs.order,refs.actorFailure]);

  scene('retries-and-side-effects','A retry can repeat an external effect',3,
    ['Retry a pure count','Consider an external write','Design repeated execution deliberately'],[
      'A pure count depends only on its input and changes no external system. Repeating it can reproduce the same result.',
      'An external effect changes something outside the returned value. A receipt appended before failure remains in the file.',
      'A retry can return one count but leave two receipt rows. The application must recognize repeated requests before applying the effect again.'
    ],(d,s)=>{
      if(s>=1){
        codeLine(d,'append-code',220,'with open("receipts.log", "a") as receipt:');
        codeLine(d,'append-line',255,'    receipt.write("order-0\\n")');
      }
      box(d,'task',65,325,310,170,s===2?'Retry same task':'Task attempt',['Count the order'],P.blue);
      if(s===0){arrow(d,'pure-result',395,410,525,410);box(d,'count',550,325,340,170,'Pure result',['{pizza: 2}'],P.green);}
      if(s>=1){
        arrow(d,'external-write',395,410,475,410,P.orange);
        box(d,'external',495,325,340,170,'External file',s===2?['Receipt from first attempt','Receipt from retry']:['Appended receipt row'],P.orange);
        arrow(d,'crash',855,410,925,410,s===2?P.green:P.red);
        box(d,'failure',945,325,270,170,s===2?'Returned result':'Worker fails',s===2?['{pizza: 2}']:['Before completion'],s===2?P.green:P.red);
      }
      if(s===2)label(d,'repeat-risk',640,565,'One returned dictionary does not prove one external write',29,P.red);
      foot(d,s===0?'A repeated attempt processes the same intended input. It is not a new lunch order.':'Append fragment inside a task · Assume the external file remains accessible after failure');
    },{
      idea:'Runtime retries do not automatically make external side effects occur exactly once.',
      builds:[
        'Begin with the pure count_order function. Its result depends on its input and has no external writes. An attempt is one execution of a task. Ray can retry after supported worker failures according to its configuration. An exception is an error raised by application code. Retrying those errors requires a separate setting.',
        'Change the function to append a receipt before it returns. Crash after the append but before completion is acknowledged. Repeating the task can repeat that effect. This is a hypothetical failure trace, not an observed course incident.',
        'Follow the retry: one returned dictionary, but two appended receipt rows. A stable request ID names the same intended request across attempts. Deduplication recognizes that repeated ID and avoids applying its effect again. An idempotent operation can repeat without changing its intended effect. The application must keep its request tracking and actual updates consistent through failures. Neither actor restarts nor Spark lineage automatically undo external writes.'
      ],question:'Does receiving one task result prove that an external append happened once?',answer:'No. An earlier failed attempt may have performed the append before a later attempt returned the accepted result.'
    },[refs.retries,refs.actorFailure]);

  scene('measure-overhead','Parallel work still has overhead',3,
    ['Name all the work','Batch small inputs','Measure equal results'],[
      'Serialization converts values into bytes. Elapsed time also includes setup, data movement, computation, and result handling.',
      'Batching puts several inputs in one task. This can reduce the scheduling work required for each input.',
      'Compare equal outputs and the same workload before interpreting elapsed time.'
    ],(d,s)=>{
      const labels=['Start','Encode bytes','Transfer','Compute','Collect'];
      labels.forEach((text,i)=>box(d,'cost'+i,60+i*240,285,210,110,text,[],i===3?P.green:P.orange));
      if(s>=1){
        box(d,'tiny',105,465,440,120,'Many tiny tasks',['More scheduling per item'],P.orange);
        box(d,'batch',735,465,440,120,'Fewer larger tasks',['Less scheduling per item'],P.green);
      }
      foot(d,s===2?'State whether startup and saved data are included · Compare the same input and result':'Schematic cost categories · No benchmark or speedup is claimed');
    },{
      idea:'Parallelism helps only when useful overlapping work outweighs coordination and movement costs.',
      builds:[
        'Overhead is work needed to coordinate the computation rather than perform its main calculation. Serialization converts Python values into bytes for storage or transfer. Read every cost category. The boxes show categories, not proportional times. Coordination can cost more than counting two orders. This fixture establishes correctness rather than a performance case.',
        'A batch contains several inputs handled by one call. Grouping small orders into batches can reduce scheduling work per order. Very large tasks can reduce scheduling flexibility and increase memory needs. They can also become stragglers: tasks that finish much later than their peers. Batch size is a measurement question.',
        'Compare the same input, output contract, and relevant resources. Decide whether runtime startup belongs in the measured use case. Check result equality first. Then report elapsed times with enough context for another person to interpret the comparison.'
      ],question:'Why can launching more tasks make a small job slower?',answer:'Each task adds scheduling, serialization, and result-handling work. Tiny tasks may not contain enough computation to offset those costs.'
    },[refs.overhead]);

  scene('choose-and-transfer','Choose who should coordinate the work',4,
    ['Choose a local baseline','Match the execution shape','Return to the lunch orders'],[
      'A baseline is the comparison run. Begin with a correct local implementation and measure whether it meets the workload’s needs.',
      'Spark plans structured data operations. Ray Core coordinates function calls and explicit dependencies.',
      'Explain where each implementation groups the meal counts, then prepare to trace a new order.'
    ],(d,s)=>{
      box(d,'local',65,270,340,270,'One process',['Small input','Simple execution','Baseline result'],P.green,s===0);
      box(d,'spark',470,270,340,270,'Spark',['Partitioned collections','Planned aggregation','Managed shuffle'],P.orange,s>=1);
      box(d,'ray',875,270,340,270,'Ray Core',['Python tasks / actors','Result references','Explicit combination'],P.blue,s>=1);
      if(s>=2)label(d,'same-answer',640,585,'Same fixture: pizza = 3, salad = 1',31,P.green);
      foot(d,'Next: 15-minute discussion · Trace new input, repeated calls, and slow work');
    },{
      idea:'Choose an execution model from the workload and its coordination needs, then test its result and cost.',
      builds:[
        'Return to the smallest correct implementation. A local solution is a useful baseline even if the final workload needs distribution. State the required result, input size, and resource or response-time constraints.',
        'Compare the mechanisms shown throughout the lecture. Spark provides collection operations and manages their aggregation shuffle. Ray Core schedules tasks and actors with references. The example driver explicitly merges task dictionaries. Neither model guarantees that a cluster helps every workload.',
        'Have a student trace pizza through both implementations. Then begin the separate fifteen-minute discussion. First trace a new salad order. Next explain two identical actor updates. Finally compare one slow Spark reduce task with thousands of tiny Ray tasks.'
      ],question:'Where does grouping happen in Spark and in our Ray program?',answer:'Spark reduceByKey combines local values and manages a per-key shuffle. Our Ray driver explicitly adds matching counts from returned dictionaries.',
      context:'Discussion after minute 60: five minutes to trace “Salad, salad!”, five minutes to analyze repeated actor updates, and five minutes to diagnose slow execution.'
    },[refs.spark,refs.tasks]);

  decks['13b']={id:'13b',label:'13B',title:'Spark and Ray: execution step by step',date:'2026-11-12',source,scenes,
    discussionMinutes:15,
    discussion:[
      {title:'Trace a new order',minutes:5,prompt:'Add “Salad, salad!” as a third input record. Trace Spark partial sums and shuffle. Then trace Ray task results and the driver merge.',answer:'Both implementations return pizza: 3 and salad: 3. Spark groups contributions by meal; the Ray example merges the returned dictionaries explicitly.'},
      {title:'Explain repeated actor updates',minutes:5,prompt:'Start with an empty MealCounter actor. Call add with {pizza: 2} twice. What is its total? What if both calls represent the same intended order?',answer:'The actor adds both calls and records pizza: 4. Serial method execution does not deduplicate logical requests. If repeated calls represent one order, the application needs an explicit design, such as tracking stable request IDs.'},
      {title:'Diagnose slow execution',minutes:5,prompt:'One Spark reduce task finishes much later than its peers. A Ray program launches thousands of tiny tasks. What would you inspect or change, while preserving result equality?',answer:'Inspect Spark task input sizes, shuffle data, spill, and durations before attributing the delay to skew. Measure Ray task duration and scheduling or transfer costs. Try batching small inputs, then verify the same result and compare elapsed time on the same workload.'}
    ]
  };
})();
