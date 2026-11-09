/* Lecture 13B: native SVG diagrams with captions and structured presenter cues.
 * Sixty teaching minutes are followed by a separate fifteen-minute discussion.
 * Lunch orders and execution diagrams are teaching examples, not benchmarks. */
(function () {
  'use strict';
  const P=window.DeckViz.palette;
  const decks=window.COURSE_DECKS=window.COURSE_DECKS||{};
  const source='lectures/lecture-13/spark-ray.html';
  const refs={
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
  function scene(id,title,minutes,states,captions,draw,teaching,sources=[]){
    const builds=teaching.builds.map((cue,i)=>captions[i]+'\n\n'+cue);
    const sc={id,title,minutes,kind:'visual',steps:states.length,states,clarityNative:true,
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

  scene('same-orders-two-runtimes','The same lunch count, two runtimes',3,
    ['Recall the inputs','Recover the baseline','Ask who coordinates'],[
      'Maya has two group orders. Predict the total for each meal before choosing an execution framework.',
      'Every implementation must return pizza = 3 and salad = 1.',
      'Spark coordinates a data-processing plan. Ray runs Python tasks whose results your program combines.'
    ],(d,s)=>{
      order(d,'order0',65,260,'Order 0','“Pizza, pizza!”');
      order(d,'order1',65,435,'Order 1','“Salad pizza.”');
      if(s>=1){
        arrow(d,'to-total',390,410,505,410);
        box(d,'baseline',530,335,285,165,'Correct totals',['pizza: 3','salad: 1']);
      }
      if(s>=2){
        box(d,'spark',900,260,300,125,'Spark',['Plan over partitions'],P.orange);
        box(d,'ray',900,435,300,125,'Ray',['Calls and references'],P.blue);
      }
      foot(d,'Fictional club lunch · One word and one occurrence per requested meal');
    },{
      idea:'The result contract stays fixed while the runtime changes how work is coordinated.',
      builds:[
        'Return to Lecture 13. Each repeated meal name requests another meal. Ask students to count the two orders by hand. The story is fictional, and these inputs are a small correctness fixture.',
        'Reveal the baseline. Keep this answer for every execution example. Changing machines, partitions, or scheduling must preserve these counts.',
        'Maya wants to run the same calculation with two libraries. Ask which responsibilities each library takes over. Introduce runtime as the software that schedules and executes work. The following diagrams describe mechanisms, not measured speedups.'
      ],question:'What result must both implementations preserve?',answer:'Both must produce pizza: 3 and salad: 1, including all repeated requests.',
      context:'Teaching occupies minutes 0–60. Reserve minutes 60–75 for the discussion in the teaching guide. There is no quiz in this session.'
    });

  scene('spark-driver-executors','Spark: the driver schedules executor work',3,
    ['Describe the roles','Assign partition tasks','Return a small result'],[
      'The driver runs the coordinating program. Executors run tasks and retain application data.',
      'A task is a unit of work on one partition. An executor can run many tasks over time.',
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
        'Define the driver and executors before following the arrows. The driver requests application resources through a cluster manager. Executors belong to this application. The drawing separates roles, not a required machine count.',
        'Give each of the two input partitions a task. A partition is data, a task is a unit of execution, and an executor is a process. Those terms describe different things. PySpark also uses Python workers for Python functions.',
        'Explain that collect returns the complete result to the driver. Our two totals are small. Collecting a large dataset can exceed driver memory. A distributed write is usually more suitable for a large output.'
      ],question:'Does having eight partitions require eight executor processes?',answer:'No. Executors can process several partition tasks, concurrently when resources allow or in successive waves.'
    },[refs.cluster,refs.spark]);

  scene('spark-lazy-plan','RDD transformations describe work',4,
    ['Start with a collection','Add transformations','Request an action'],[
      'An RDD is a Resilient Distributed Dataset: a collection split into partitions.',
      'Transformations define new RDDs and their dependencies. They do not yet compute these meal counts.',
      'collect() is an action. It requests the result and starts the required computation.'
    ],(d,s)=>{
      const xs=[65,365,665,965],names=['Input RDD','flatMap','map','reduceByKey'];
      const lines=[['Two order records'],['Extract words'],['Attach count 1'],['Add matching keys']];
      const visible=s?4:1;
      for(let i=0;i<visible;i++){
        box(d,'op'+i,xs[i],300,250,145,names[i],lines[i],i===3?P.orange:P.green,s===2);
        if(i)arrow(d,'dep'+i,xs[i]-40,370,xs[i]-10,370,P.muted);
      }
      if(s>=1)label(d,'plan-state',640,510,s===1?'Dependencies recorded · no result requested':'counts.collect() → request execution',30,s===1?P.muted:P.orange);
      if(s===2)label(d,'action-result',640,570,'Result: [(pizza, 3), (salad, 1)]',28,P.green);
      foot(d,'A dependency says which earlier data an operation needs');
    },{
      idea:'Spark records transformations and executes the required plan when an action requests results.',
      builds:[
        'Expand RDD and identify its two example partitions. An RDD is a logical collection, not one large Python list held by the driver. Input reading has its own API details; focus on when the transformations run.',
        'Follow the chain from order records to words, pairs, and grouped counts. Define a transformation as an operation that describes a new collection. Pause before revealing the action. Ask whether writing these expressions has computed the totals.',
        'Reveal collect. Define an action as a request that starts the computation needed for its result. Spark uses the recorded dependencies to schedule that work. The printed order of the two final pairs is not a correctness guarantee.'
      ],question:'Is reduceByKey an action because its name contains “reduce”?',answer:'No. reduceByKey defines another RDD. An action such as collect requests its result.'
    },[refs.spark]);

  scene('spark-map-word-occurrences','flatMap and map keep every occurrence',3,
    ['Read both partitions','Extract the words','Attach one to each word'],[
      'Each input partition contains one order in this small example.',
      'flatMap extracts words from each record and places those words in the output collection.',
      'map converts each word to (word, 1). Both pizza requests in order 0 remain present.'
    ],(d,s)=>{
      const names=['Partition 0','Partition 1'];
      const inputs=['“Pizza, pizza!”','“Salad pizza.”'];
      for(let i=0;i<2;i++){
        const y=260+i*175;
        box(d,'input'+i,65,y,320,130,names[i],[inputs[i]],P.blue,false);
        if(s>=1){arrow(d,'words-arrow'+i,405,y+65,505,y+65);box(d,'words'+i,525,y,290,130,'flatMap',i?['salad, pizza']:['pizza, pizza']);}
        if(s>=2){arrow(d,'pairs-arrow'+i,835,y+65,905,y+65,P.orange);box(d,'pairs'+i,925,y,290,130,'map',i?['(salad, 1)','(pizza, 1)']:['(pizza, 1)','(pizza, 1)'],P.orange);}
      }
      foot(d,'Normalization: lowercase letters · punctuation separates words');
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
      'Spark reduceByKey can combine values for the same key within each input partition.',
      'Partition 0 produces (pizza, 2). Partition 1 produces (salad, 1) and (pizza, 1).',
      'Three partial-count pairs represent four requests. Add their values, not their number of pairs.'
    ],(d,s)=>{
      box(d,'p0',70,255,480,190,'Input partition 0',s?['Local sum','(pizza, 2)']:['(pizza, 1)','(pizza, 1)'],P.blue);
      box(d,'p1',730,255,480,190,'Input partition 1',s?['(salad, 1)','(pizza, 1)']:['(salad, 1)','(pizza, 1)'],P.green);
      if(s>=1){label(d,'pair-count',640,505,'Pairs sent: 3',30,P.orange);}
      if(s>=2){label(d,'weight',640,566,'Requests represented: 2 + 1 + 1 = 4',34,P.ink);}
      foot(d,'Addition permits partial sums · Other operations need a valid combining rule');
    },{
      idea:'A valid local combine reduces transfer without losing the contributions represented by the values.',
      builds:[
        'Return to the four occurrence pairs. Spark reduceByKey performs local merging for its combining function. For addition, replacing two ones with their sum preserves the final result. This differs from the graded micro-mapreduce mapper, which emits occurrences.',
        'Reveal the three partial pairs. The value 2 represents two original requests. A value is no longer always 1 after local combining. The second partition still contributes two different keys.',
        'Ask students to count pairs and then count represented requests. Those quantities differ. For an average, preserve both sum and count rather than averaging unequal partial averages. Addition is the only combining rule used in this fixture.'
      ],question:'Why does (pizza, 2) preserve both requests while a single (pizza, 1) does not?',answer:'The value 2 retains the combined contribution. The value 1 would discard one occurrence.'
    },[refs.reduce]);

  scene('spark-shuffle-stages','The shuffle separates two stages',4,
    ['Run partition-local operations','Move partial contributions','Sum each destination group'],[
      'Stage 0 extracts words, attaches counts, and combines local values within each input partition.',
      'The shuffle sends every contribution for pizza to its destination, including the partial value 2.',
      'Stage 1 combines the received values: pizza gets [2, 1], while salad gets [1].'
    ],(d,s)=>{
      d.rect('stage0',50,220,450,365,P.white,P.line,12,2);
      d.rect('stage1',780,220,450,365,P.white,P.line,12,2);
      label(d,'stage0-title',275,255,'Stage 0 · input tasks',28,P.blue);
      label(d,'stage1-title',1005,255,'Stage 1 · output tasks',28,P.green);
      box(d,'partial0',90,300,365,100,'From partition 0',['(pizza, 2)'],P.blue);
      box(d,'partial1',90,435,365,125,'From partition 1',['(pizza, 1), (salad, 1)'],P.blue);
      if(s>=1){
        arrow(d,'shuffle0',470,350,805,350,P.orange);
        arrow(d,'shuffle1',470,490,805,385,P.orange);
        arrow(d,'shuffle2',470,510,805,505,P.green);
        label(d,'shuffle-label',640,280,'SHUFFLE',25,P.orange);
        box(d,'pizza',820,300,365,125,'pizza',s===2?['sum([2, 1]) = 3']:['[2, 1]'],P.blue);
        box(d,'salad',820,455,365,100,'salad',s===2?['sum([1]) = 1']:['[1]'],P.green);
      }
      foot(d,'Toy destination labels · Actual hash bucket numbers can differ');
    },{
      idea:'A shuffle moves contributions between partitions and creates a scheduling boundary between stages.',
      builds:[
        'Define a stage as tasks that perform one portion of the dependency plan without crossing a shuffle boundary. The input tasks can pipeline word extraction, pair creation, and local combining. Stage count is not the count of API calls.',
        'Trace both pizza contributions across the boundary. They have values 2 and 1, not two single requests. The salad contribution remains separate. Shuffle can use network transfer and disk storage. Two keys can share a destination partition while keeping separate groups.',
        'Compute the final sums only after their required contributions are available. The drawing uses one destination per meal for clarity. Spark chooses task placement and partition assignments. The invariant is complete per-key aggregation.'
      ],question:'What values must the pizza destination add?',answer:'It must add 2 from partition 0 and 1 from partition 1, producing 3.'
    },[refs.spark,refs.reduce]);

  scene('spark-partitions-tasks','Partitions, tasks, and workers differ',3,
    ['Name the data units','Schedule ready tasks','Distinguish narrow and shuffle dependencies'],[
      'Four partitions describe four subsets of data. They do not require four machines.',
      'With two available execution slots, four ready tasks can run in two waves.',
      'Narrow dependencies permit local pipelines. A shuffle redistributes data to satisfy a new grouping.'
    ],(d,s)=>{
      for(let i=0;i<4;i++)box(d,'partition'+i,65+i*305,230,250,110,'Partition '+i,['Data subset'],P.blue,s===0);
      if(s>=1){
        box(d,'slot0',130,425,440,140,'Slot A',['Task P0 → then task P2'],P.green);
        box(d,'slot1',710,425,440,140,'Slot B',['Task P1 → then task P3'],P.green);
      }
      if(s>=2)label(d,'dependency',640,375,'map → map: narrow     reduceByKey: shuffle here',28,P.orange);
      foot(d,'Task counts describe stage partitions · Slots describe simultaneous execution capacity');
    },{
      idea:'Partition count controls task units while execution resources control how many tasks can run at once.',
      builds:[
        'Use four partitions in this separate scheduling illustration. A partition is a data subset. In a stage, Spark schedules a task for each required partition. A worker or executor can process more than one task over its lifetime.',
        'Assume two available execution slots. Four ready tasks therefore need at least two waves under this illustration. Task durations can differ. These rectangles do not measure time or promise balanced work.',
        'Define a narrow dependency: each parent partition contributes to at most one child partition. This permits pipelining without a shuffle. It does not prohibit every data transfer. The count example requires a shuffle to regroup meal keys across input partitions.'
      ],question:'Does adding partitions always increase simultaneous execution?',answer:'No. Tasks still need available resources. More partitions can create smaller tasks and additional scheduling overhead.'
    },[refs.spark,refs.cluster]);

  scene('spark-cache-recompute','Cache reusable data and rebuild lost output',3,
    ['Compute an intermediate collection','Reuse cached partitions','Recompute a lost partition'],[
      'Caching marks an RDD for reuse. An action computes and stores the partitions it needs.',
      'A later action can reuse available cached partitions instead of repeating their transformations.',
      'If a cached partition is lost, Spark can recompute it from available inputs and recorded dependencies.'
    ],(d,s)=>{
      box(d,'source',65,330,285,160,'Available inputs',['Saved order records'],P.blue,false);
      arrow(d,'compute',370,405,470,405);
      box(d,'cache',490,285,300,250,'Cached RDD',[s===2?'P0: lost → rebuild':'P0: computed','P1: available'],s===2?P.orange:P.green);
      if(s>=1){arrow(d,'reuse',810,405,900,405);box(d,'action',920,330,295,160,'Later action',['Read cached output'],P.blue);}
      if(s===2)label(d,'lineage',640,575,'Lineage = recorded steps for recomputation',27,P.orange);
      foot(d,'Reuse costs memory · Recomputing requires accessible inputs and repeatable transformations');
    },{
      idea:'Caching reuses computed data, while lineage describes how lost data can be recomputed.',
      builds:[
        'Maya wants several queries over the same cleaned orders. Marking the RDD with cache does not immediately compute every partition. The first action materializes the partitions it needs. Choose what to cache from actual reuse and memory needs.',
        'Follow the second action to retained output. Cache placement and storage levels affect reuse. Cached data can consume memory needed by other work. Caching is a performance choice, not a requirement for correct counts.',
        'Erase one cached partition. Follow its recorded transformations back to available inputs. Define lineage as this dependency record. Recalculation must reproduce the required data. Lineage does not roll back writes made to an external service.'
      ],question:'Does cache make the meal counts permanently durable?',answer:'No. Cached partitions can be lost. Spark can recompute supported outputs when the required inputs and transformations remain available.'
    },[refs.spark]);

  scene('spark-skew','A frequent key can delay a stage',3,
    ['Start with several keys','Concentrate pizza requests','Inspect before changing the plan'],[
      'Equal keys must reach a compatible aggregation path. Their frequency determines how much work arrives.',
      'Many pizza requests can leave one destination busy while other tasks finish.',
      'Inspect task duration, input sizes, spill, and shuffle data before choosing a remedy.'
    ],(d,s)=>{
      const widths=s?[690,170,140]:[330,300,320];
      for(let i=0;i<3;i++){
        label(d,'task'+i,170,300+i*90,'Task '+i,25);
        d.rect('track'+i,270,275+i*90,760,45,P.line,'none',6);
        d.rect('work'+i,270,275+i*90,widths[i],45,i===0&&s?P.orange:P.green,'none',6);
      }
      if(s>=1)label(d,'hot',640,555,'pizza is the frequent key',29,P.orange);
      foot(d,s===2?'Schematic work bars · Diagnose the bottleneck before choosing a remedy':'Schematic work bars · No measured times or speedup');
    },{
      idea:'Uneven key frequencies can concentrate work even when a job has many partitions.',
      builds:[
        'Connect the lunch orders to a much larger, hypothetical order collection. Explain skew as uneven data or work. These bars are schematic. They do not claim equal hardware, equal row cost, or measured duration.',
        'Concentrate many requests under pizza. Local combining helps a simple count, but other aggregations can retain much more state. A long task can also result from slow resources or an expensive function, so skew is a hypothesis to test.',
        'Name the measurements to inspect in the Spark UI. A valid partial aggregation, a different join strategy, or salting may help a suitable workload. More partitions alone do not split an indivisible same-key group. Preserve result correctness when changing the plan.'
      ],question:'Does a long task prove that its partition has a frequent key?',answer:'No. Compare data sizes, spill, execution costs, and resource behavior before attributing the delay to skew.'
    },[refs.spark]);

  scene('spark-dataframe-rdd','Use DataFrames for structured operations',3,
    ['Expose the operation','Give Spark a relational plan','Keep RDDs for the mechanism'],[
      'A DataFrame has named columns and a schema. Spark SQL can reason about its relational operations.',
      'A grouping expression describes the requested result and leaves execution planning to Spark SQL.',
      'The RDD example exposes partitions and combining. Choose the API that fits the actual computation.'
    ],(d,s)=>{
      box(d,'rows',65,275,325,270,'DataFrame',['meal: string','pizza','pizza','salad','pizza'],P.blue);
      if(s>=1){arrow(d,'plan-arrow',410,380,500,380);box(d,'plan',520,275,335,210,'Relational operation',['groupBy("meal")','.count()'],P.green);}
      if(s>=2){arrow(d,'output-arrow',875,380,925,380);box(d,'out',945,275,270,210,'Result',['pizza: 3','salad: 1'],P.orange);}
      foot(d,'RDD: explicit functions over elements · DataFrame: schema and relational expressions');
    },{
      idea:'Structured expressions expose information that Spark SQL can use when planning execution.',
      builds:[
        'Define schema as the named columns and their types. The diagram shows all four requests from the same fixture. A DataFrame represents structured data, even when its contents are spread across workers.',
        'Read groupBy meal followed by count. Spark SQL can optimize supported relational expressions because it understands their structure. An arbitrary Python function can conceal details from that optimizer. The diagram states a result, not a universal performance guarantee.',
        'Return to the RDD trace. We used it to expose map, partial aggregation, shuffle, and reduction. For ordinary structured joins and aggregations, a DataFrame is often the appropriate starting API. Measure the actual workload and inspect its plan.'
      ],question:'Why might Spark optimize a column expression more easily than an arbitrary Python function?',answer:'The column expression exposes relational structure and types. An arbitrary Python function can hide how it uses or transforms its inputs.'
    },[refs.sql]);

  scene('ray-task-results','Ray task calls return result references',4,
    ['Define a remote task','Submit both orders','Read completed results','Merge counts explicitly'],[
      'A Ray task is a function call scheduled by the runtime. Each count_order call handles one order.',
      '.remote() submits work and returns an ObjectRef, which identifies a result that may not be ready.',
      'ray.get([a, b]) waits for both results and returns them in the order of those references.',
      'Our driver adds matching dictionary counts. Ray Core does not automatically group these meal keys.'
    ],(d,s)=>{
      box(d,'call0',65,265,410,130,'count_order(order0)',['“Pizza, pizza!”'],P.blue);
      box(d,'call1',65,445,410,130,'count_order(order1)',['“Salad pizza.”'],P.blue);
      if(s>=1){
        arrow(d,'ref0',495,330,565,330);arrow(d,'ref1',495,510,565,510);
        box(d,'result0',585,265,300,130,s>=2?'Result a':'ObjectRef a',s>=2?['{pizza: 2}']:['Pending or ready']);
        box(d,'result1',585,445,300,130,s>=2?'Result b':'ObjectRef b',s>=2?['{salad: 1, pizza: 1}']:['Pending or ready']);
      }
      if(s>=3){
        arrow(d,'merge0',895,345,940,385,P.orange);arrow(d,'merge1',895,510,940,470,P.orange);
        box(d,'merge',950,345,265,165,'Driver merge',['pizza: 3','salad: 1'],P.orange);
      }
      if(s>=1)label(d,'submit-a',640,599,'a = count_order.remote(order0)',23,P.muted);
      foot(d,s>=1?'b = count_order.remote(order1)':'@ray.remote marks count_order as a remotely scheduled function');
    },{
      idea:'Ray schedules function calls and tracks their results, while this program explicitly combines the returned counts.',
      builds:[
        'Move from Spark collections to Ray Core function calls. The reading supplies a runnable count_order function. It returns a dictionary of local counts without changing shared state. The decorator makes remote submission available.',
        'Submit both calls before requesting their values. Define ObjectRef as a handle to a result. Receiving the reference does not mean the computation has finished. Ray schedules tasks subject to declared resources and available capacity.',
        'Wait with ray.get on the list of references. The returned list follows the reference order, even if tasks finish in the opposite order. This example gathers two small dictionaries. Gathering a large output at one driver can become a bottleneck.',
        'Add counts with the same meal name in the driver. Do not use ordinary dictionary update to combine repeated keys, because it replaces values. Use explicit addition or Counter.update. Ray Core has no automatic word-count shuffle in this program.'
      ],question:'Where are the two pizza contributions combined in this Ray example?',answer:'The driver combines the returned dictionaries explicitly. The Ray runtime schedules the two count_order tasks and tracks their results.'
    },[refs.tasks,refs.objects]);

  scene('ray-submit-before-wait','Submit independent work before waiting',4,
    ['Wait after each call','Submit both calls first','Separate permission from speed'],[
      'Waiting immediately after each submission prevents the driver from submitting the next task until the first completes.',
      'Submitting both calls first lets the runtime overlap them when resources are available.',
      'This order permits concurrency. It does not guarantee a speedup for tiny tasks.'
    ],(d,s)=>{
      const x=270,unit=260;
      label(d,'wait-label',135,300,'Wait in loop',25);
      box(d,'serial0',x,255,unit,100,'Task A',[],P.orange);
      box(d,'serial1',x+unit+40,255,unit,100,'Task B',[],P.orange,s===0);
      arrow(d,'serial-order',x+unit+8,305,x+unit+30,305,P.orange);
      label(d,'submit-label',135,480,'Submit first',25);
      if(s>=1){
        box(d,'parallel0',x,420,unit,80,'Task A',[],P.green);
        box(d,'parallel1',x,515,unit,80,'Task B',[],P.blue);
        label(d,'wait-once',880,500,'ray.get([a, b])',31,P.green);
      }
      foot(d,s===2?'Schematic schedules · Actual overlap depends on resources and task duration':'First submit the independent tasks. Then wait for their results.');
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
      'Submitting the producer returns an ObjectRef. Its value may still be pending.',
      'Passing that ObjectRef as a top-level argument makes the next task depend on the producer’s result.',
      'Ray resolves the top-level reference before running the consumer. The driver can wait for only the final result.'
    ],(d,s)=>{
      box(d,'producer',65,325,310,160,'count_order',['Produces local counts'],P.blue);
      if(s>=1){
        arrow(d,'a-ref',395,405,480,405,P.blue);
        box(d,'ref',500,325,280,160,'ObjectRef a',['Dependency handle'],P.orange);
        arrow(d,'consumer-input',800,405,875,405,P.orange);
        box(d,'consumer',895,325,320,160,'format_count',['Needs the count value'],P.green);
      }
      if(s>=2){label(d,'chain',640,550,'b = format_count.remote(a)',29,P.green);label(d,'final-get',640,595,'ray.get(b)',27,P.green);}
      foot(d,'Dependency example · Top-level ObjectRef arguments are resolved for the task');
    },{
      idea:'Task-result references connect producers and consumers without requiring an intermediate driver wait.',
      builds:[
        'Use a separate dependency example after the main driver-merge program. The producer returns a count dictionary. The driver receives its reference while the task may still be running.',
        'Pass a as a top-level argument to a formatting task. The consumer is not ready until the producer result is available. This is a dependency, not an instruction to pass the unfinished handle as the function value.',
        'Ray resolves a top-level ObjectRef argument before the consumer executes. The consumer receives the count dictionary. The driver can call ray.get only on b at the final boundary. References nested inside other Python objects have different resolution rules.'
      ],question:'Can the consumer run before the value it needs is available?',answer:'No. A top-level ObjectRef argument makes that result a scheduling dependency. The runtime resolves it before the function executes.'
    },[refs.objects]);

  scene('ray-put-shared-input','Put a reusable input in the object store',3,
    ['Identify repeated input','Create one reference','Pass it to several tasks'],[
      'Several tasks may need the same read-only menu or model input.',
      'ray.put(menu) stores the object and returns a reference that can be reused.',
      'Pass menu_ref to each task. Reusing a reference avoids repeatedly submitting the same large value.'
    ],(d,s)=>{
      box(d,'menu',65,330,320,170,'Shared menu',['Read-only input'],P.orange);
      if(s>=1){arrow(d,'put',405,415,475,415,P.orange);box(d,'store',495,330,290,170,'Object store',['menu_ref'],P.blue);}
      if(s>=2){
        arrow(d,'to-a',805,385,895,320,P.blue);arrow(d,'to-b',805,445,895,520,P.blue);
        box(d,'task0',915,250,300,130,'Check order 0',['menu_ref'],P.green);
        box(d,'task1',915,450,300,130,'Check order 1',['menu_ref'],P.green);
      }
      foot(d,'Data may still move between nodes · A shared reference is not shared mutable state');
    },{
      idea:'A reusable object reference lets several tasks depend on one submitted read-only input.',
      builds:[
        'Extend the lunch application to validate orders against a larger menu. The large shared object is hypothetical. Two short strings do not need this optimization. Identify which input is reused across tasks before choosing an object-store strategy.',
        'Call ray.put once and keep the returned ObjectRef. Ray places the object in its object store. This avoids repeatedly passing the same large Python value by value to many task submissions.',
        'Pass menu_ref as a top-level argument. Tasks receive the object value after resolution. Copies may be transferred to other nodes, and deserialization has costs. The object-store reference does not provide a shared mutable Python dictionary.'
      ],question:'Does ray.put guarantee that no data crosses the network?',answer:'No. Ray may transfer the object to nodes that need it. Reusing its reference avoids repeated submissions of the same value.'
    },[refs.objects]);

  scene('ray-stateful-actor','An actor keeps state between calls',4,
    ['Create a remote object','Apply one method call','Apply the next call'],[
      'An actor is an instance of a remote class. Its state persists between method calls while the actor is alive.',
      'A default synchronous actor runs one method at a time. The first update adds two pizza requests.',
      'The next update sees the changed state and adds one pizza and one salad.'
    ],(d,s)=>{
      box(d,'caller',65,300,330,210,'One caller',['add({pizza: 2})','add({pizza: 1, salad: 1})'],P.blue,false);
      arrow(d,'actor-call',415,405,540,405,P.blue);
      box(d,'actor',560,250,380,310,'MealCounter actor',[
        'Persistent object state',
        s===0?'pizza: 0':s===1?'pizza: 2':'pizza: 3',
        s<2?'salad: 0':'salad: 1'
      ],P.green);
      if(s>=1)box(d,'serial',1010,330,205,150,'Methods',['One at a time'],P.orange);
      foot(d,'Default synchronous actor · No automatic durable recovery of application state');
    },{
      idea:'An actor owns mutable state, while ordinary tasks are function calls that return results.',
      builds:[
        'Define a class with remote methods rather than a remote function. Its constructor creates a counter object in an actor process. The counter state survives from one method call to the next while that actor remains alive.',
        'Submit both updates from one caller. An ordinary synchronous actor executes one method at a time. Without out-of-order options or retries, same-caller calls run in submission order. Async and threaded actor options change concurrency behavior.',
        'Apply the second update to the existing object. The new total depends on the first update. An actor is useful for deliberate persistent state, such as a loaded model. It is not a durable database. Restarts and state reconstruction require an explicit design.'
      ],question:'Why can two calls to the same counter actor observe updated state?',answer:'Both methods operate on the same persistent remote object. A default synchronous actor executes those methods serially.'
    },[refs.actors,refs.order,refs.actorFailure]);

  scene('retries-and-side-effects','A retry can repeat an external effect',3,
    ['Retry a pure count','Consider an external write','Design repeated execution deliberately'],[
      'Repeating a pure count over the same input can reproduce its result.',
      'If a task writes externally before failing, retrying can repeat that write.',
      'Separate result recomputation from external effects. Use an explicit deduplication or idempotency design where needed.'
    ],(d,s)=>{
      box(d,'task',65,325,310,170,'Task attempt',['Count the order'],P.blue);
      if(s===0){arrow(d,'pure-result',395,410,525,410);box(d,'count',550,325,340,170,'Pure result',['{pizza: 2}'],P.green);}
      if(s>=1){
        arrow(d,'external-write',395,410,475,410,P.orange);
        box(d,'external',495,325,340,170,'External file',['Append receipt row'],P.orange);
        arrow(d,'crash',855,410,925,410,P.red);
        box(d,'failure',945,325,270,170,'Worker fails',['Before completion'],P.red);
      }
      if(s===2)label(d,'repeat-risk',640,565,'A retry may append the receipt again',31,P.red);
      foot(d,'Task retries, exception retries, actor restarts, and state recovery are separate policies');
    },{
      idea:'Runtime retries do not automatically make external side effects occur exactly once.',
      builds:[
        'Begin with the pure count_order function. Its result depends on its input and has no external writes. Ray can retry task execution after supported system failures according to its configuration. Application-exception retry settings are a separate choice.',
        'Change the function to append a receipt before it returns. Crash after the append but before completion is acknowledged. Repeating the task can repeat that effect. This is a hypothetical failure trace, not an observed course incident.',
        'Ask what identifies one logical receipt across attempts. Possible application designs include idempotent writes or deduplication by a stable request ID. Actor restarts do not automatically reconstruct arbitrary state. Spark lineage also does not undo external writes.'
      ],question:'Does receiving one task result prove that an external append happened once?',answer:'No. An earlier failed attempt may have performed the append before a later attempt returned the accepted result.'
    },[refs.retries,refs.actorFailure]);

  scene('measure-overhead','Parallel work still has overhead',3,
    ['Name all the work','Batch small inputs','Measure equal results'],[
      'Elapsed time includes setup, serialization, data movement, computation, and result handling.',
      'Combining tiny inputs into larger tasks can reduce scheduling overhead per item.',
      'Compare equal outputs and the same workload before interpreting elapsed time.'
    ],(d,s)=>{
      const labels=['Start','Serialize','Transfer','Compute','Collect'];
      labels.forEach((text,i)=>box(d,'cost'+i,60+i*240,285,210,110,text,[],i===3?P.green:P.orange));
      if(s>=1){
        box(d,'tiny',105,465,440,120,'Many tiny tasks',['More scheduling per item'],P.orange);
        box(d,'batch',735,465,440,120,'Fewer larger tasks',['Less scheduling per item'],P.green);
      }
      foot(d,s===2?'Measure cold and warm runs deliberately · Report workload, resources, and equality':'Schematic cost categories · No benchmark or speedup is claimed');
    },{
      idea:'Parallelism helps only when useful overlapping work outweighs coordination and movement costs.',
      builds:[
        'Read every cost category. The boxes show categories, not proportional times. A two-order job will often be dominated by overhead, so the fixture establishes correctness rather than a performance case.',
        'Batch many small orders into one call when that matches the workload. Explain the tradeoff: very large tasks can reduce scheduling flexibility, increase memory needs, or create stragglers. Batch size is a measurement question.',
        'Compare the same input, output contract, and relevant resources. Decide whether runtime startup belongs in the measured use case. Check result equality first. Then report elapsed times with enough context for another person to interpret the comparison.'
      ],question:'Why can launching more tasks make a small job slower?',answer:'Each task adds scheduling, serialization, and result-handling work. Tiny tasks may not contain enough computation to offset those costs.'
    },[refs.overhead]);

  scene('choose-and-transfer','Choose who should coordinate the work',4,
    ['Choose a local baseline','Match the execution shape','Return to the lunch orders'],[
      'Begin with a local implementation and a result contract. Measure whether it meets the workload’s needs.',
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
