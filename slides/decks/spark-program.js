/* Line-by-line walkthrough of the unchanged downloadable spark_lunch.py.
 * Keep source line numbers and indentation: tests compare every excerpt with the file.
 * Loaded after spark-ray.js; the new scenes follow its complete Spark flow. */
(function () {
  'use strict';
  const deck=window.COURSE_DECKS['13b'];if(!deck)return;
  const P=window.DeckViz.palette,parts=[];
  const sourcePath='lectures/lecture-13/spark_lunch.py';
  const program=[
    '"""Count a tiny lunch fixture with Spark on this computer."""',
    'import argparse',
    'import re',
    'from operator import add',
    '',
    'from pyspark import SparkContext',
    '',
    '',
    'def split_order(order):',
    '    """Return one word per meal request, including repeats."""',
    '    return re.findall(r"[a-z]+", order.lower())',
    '',
    '',
    'def main():',
    '    parser = argparse.ArgumentParser(description=__doc__)',
    '    parser.add_argument(',
    '        "--plan", action="store_true", help="Print the RDD dependencies."',
    '    )',
    '    args = parser.parse_args()',
    '',
    '    sc = SparkContext(master="local[2]", appName="Lunch counts")',
    '    try:',
    '        orders = ["Pizza, pizza!", "Salad pizza."]',
    '        source = sc.parallelize(orders, numSlices=2)',
    '',
    '        # These transformations describe work. They do not start the count.',
    '        meals = source.flatMap(split_order)',
    '        pairs = meals.map(lambda meal: (meal, 1))',
    '        counts = pairs.reduceByKey(add, numPartitions=2)',
    '',
    '        if args.plan:',
    '            print(counts.toDebugString().decode("utf-8"))',
    '',
    '        # collect starts the job and brings this small result to the driver.',
    '        totals = dict(sorted(counts.collect()))',
    '        print("Totals:", totals)',
    '    finally:',
    '        sc.stop()',
    '',
    '',
    'if __name__ == "__main__":',
    '    main()'
  ];
  function wrap(text,max=92){const lines=[''];for(const word of text.split(/\s+/)){const i=lines.length-1;if(lines[i]&&(lines[i]+' '+word).length>max)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;}return lines;}
  function header(d,title,caption,state,index,count){
    d.text('program-title',640,53,title,38,P.ink,'middle',650);
    const lines=wrap(caption);
    lines.forEach((line,i)=>d.text('program-caption-'+i,640,lines.length===1?123:110+i*33,line,26,P.ink));
    d.text('program-step',640,690,'Step '+(index+1)+' of '+count+' · '+state,21,P.muted);
  }
  function code(d,first,last,active){
    d.rect('program-panel',45,190,1190,250,P.white,P.line,10,2);
    d.text('program-file',65,216,'spark_lunch.py · original lines '+first+'–'+last,22,P.muted,'start',650);
    for(let n=first;n<=last;n++){
      const y=255+(n-first)*30;
      if(active.includes(n))d.rect('program-highlight-'+n,55,y-14,1170,28,P.orangeLight,'none',4);
      d.text('program-number-'+n,86,y,String(n),21,P.muted,'end');
      d.add('program-line-'+n,'text',{x:109,y,fill:P.ink,'font-size':23,style:'font-family:ui-monospace, SFMono-Regular, Menlo, monospace;white-space:pre','xml:space':'preserve','text-anchor':'start','dominant-baseline':'middle'},program[n-1]);
    }
  }
  function cards(d,boxes,links=[]){
    const gap=40,w=(1190-gap*(boxes.length-1))/boxes.length;
    boxes.forEach((box,i)=>{
      const x=45+i*(w+gap),color=box.color||P.green;
      d.rect('program-card-'+i,x,475,w,140,P.white,color,10,2);
      d.text('program-card-title-'+i,x+w/2,503,box.title,25,color,'middle',650);
      box.lines.forEach((line,j)=>{
        const key='program-card-'+i+'-line-'+j,y=box.mono?535+j*28:542+j*30;
        if(box.mono)d.add(key,'text',{x:x+16,y,fill:P.ink,'font-size':23,style:'font-family:ui-monospace, SFMono-Regular, Menlo, monospace;white-space:pre','xml:space':'preserve','text-anchor':'start','dominant-baseline':'middle'},line);
        else d.text(key,x+w/2,y,line,23,P.ink);
      });
      if(links.includes(i)&&i<boxes.length-1)d.arrow('program-arrow-'+i,x+w+7,545,x+w+gap-7,545,P.muted,3);
    });
  }
  const card=(title,...lines)=>({title,lines});
  function part(id,title,first,last,minutes,steps,question,answer){
    const captions=steps.map(s=>s.caption),states=steps.map(s=>s.state);
    const teaching={idea:answer,question,answer,
      context:'The excerpts preserve the complete downloadable program. Source order differs from execution order: definitions register first, then the bottom guard calls main. The later result displays are explanatory traces, not extra Python statements.',
      builds:steps.map(s=>s.caption+'\n\n'+s.note)};
    parts.push({id,title,minutes,kind:'visual',clarityNative:true,steps:steps.length,states,clarityCaptions:captions,
      programSource:{path:sourcePath,firstLine:first,lines:program.slice(first-1,last),activeLines:steps.map(s=>s.active)},
      sources:['lectures/lecture-13/spark-ray.html#'+id,sourcePath,'https://spark.apache.org/docs/latest/rdd-programming-guide.html'],
      teaching,notes:[teaching.idea,...teaching.builds,'Ask: '+question,'Expected answer: '+answer,teaching.context].join('\n\n'),
      draw(d,s){const step=steps[s];header(d,title,step.caption,step.state,s,steps.length);code(d,first,last,step.active);if(step.draw)step.draw(d);else cards(d,step.boxes,step.links);d.text('program-foot',640,650,step.foot||'The highlighted line is part of the unchanged program · Follow the values below',22,P.muted);}});
  }

  part('spark-code-imports','Read the program description and imports',1,6,1,[
    {state:'Line 1 · describe the module',active:[1],caption:'The opening string documents the file. Python stores it in __doc__. It does not print the text.',boxes:[card('File description','__doc__ stores the opening string'),card('Used later','ArgumentParser uses it in --help')],note:'A module is a Python file. Its opening docstring describes the program. Distinguish this description from an executed print call. The parser later uses this string for its help text.'},
    {state:'Line 2 · read command-line options',active:[2],caption:'import argparse makes Python’s command-line argument tools available under the name argparse.',boxes:[card('Command typed by the user','python3 spark_lunch.py --plan'),card('argparse reads the option','args.plan becomes True')],note:'Importing argparse makes its tools available. It does not parse options yet. The later main function creates a parser and asks it to read the command line.'},
    {state:'Line 3 · find word patterns',active:[3],caption:'import re makes Python’s regular-expression tools available. A regular expression describes a text pattern.',boxes:[card('Input text','“Pizza, pizza!”'),card('Later helper','re.findall extracts meal names')],note:'A text pattern describes which character sequences to match. The re module provides findall. The helper will use it after converting the order to lowercase.'},
    {state:'Line 4 · import addition',active:[4],caption:'from operator import add gives the program a function that adds two values: add(2, 1) returns 3.',boxes:[card('Function inputs','a = 2, b = 1'),card('add(a, b)','2 + 1 = 3')],note:'add is an ordinary function from Python’s operator module. Later, reduceByKey receives this function. It will call it on count values belonging to the same meal key.'},
    {state:'Line 6 · import SparkContext',active:[6],caption:'from pyspark import SparkContext makes Spark’s RDD connection class available. This import does not start the context.',boxes:[card('Imported name','SparkContext'),card('Later construction','sc = SparkContext(...)')],note:'PySpark is Spark’s Python interface. Importing the class and creating its instance are different steps. The blank line separates imports visually and performs no work.'}
  ],'Which import supplies the function that adds two partial counts?','The operator module supplies add. Spark later calls it with two count values for the same key.');

  part('spark-code-tokenize','Extract every meal name',9,11,2,[
    {state:'Line 9 · define the helper',active:[9],caption:'def registers a function named split_order. The order parameter receives one string when the function is called.',boxes:[card('Definition registered','split_order is available'),card('No call yet','The body has not processed an order')],note:'Defining a function does not execute its body. Spark will invoke the helper on records when the requested computation runs. For this trace, focus on one future call with Pizza, pizza!.'},
    {state:'Line 10 · state the result contract',links:[0],active:[10],caption:'The function’s docstring promises one word per request, including repeated meal names.',boxes:[card('Two pizza requests','“Pizza, pizza!”'),card('Required result','Keep both occurrences')],note:'This docstring documents the helper. It differs from the module docstring used by argparse. Neither docstring is a print instruction. Removing repeated meal names would violate the result contract.'},
    {state:'Line 11 · lowercase first',links:[0],active:[11],caption:'order.lower() produces a lowercase string. The first order becomes "pizza, pizza!" before findall examines it.',boxes:[card('order','"Pizza, pizza!"'),card('order.lower()','"pizza, pizza!"')],note:'Python evaluates the arguments before calling findall. lower creates the lowercase text used by this expression. The comma and exclamation mark remain at this intermediate step.'},
    {state:'Line 11 · read the pattern',links:[0],active:[11],caption:'[a-z]+ matches one or more lowercase letters. Punctuation separates the two matches in this toy input.',boxes:[card('Pattern','[a-z] = a lowercase letter','+ = one or more'),card('Matches in the input','pizza','pizza')],note:'The r prefix marks a raw Python string, where backslashes are preserved for a pattern. This particular pattern contains no backslash. The a–z range covers ASCII letters. It is a deliberately limited tokenizer, not a rule for every language or meal name.'},
    {state:'Line 11 · return all matches',active:[11],caption:'re.findall returns a list of every matching word. return sends that list back to the caller.',boxes:[card('findall on order 0','["pizza", "pizza"]'),card('findall on order 1','["salad", "pizza"]')],note:'Read the result as a list containing two separate elements. The duplicate pizza survives. flatMap later emits these elements into its result collection. Ask students to predict the result for Salad, salad! before revealing two salad elements.'}
  ],'What does split_order("Salad, salad!") return?','It returns ["salad", "salad"]. The lowercase words remain separate occurrences.');

  part('spark-code-options','Read the optional --plan flag',14,19,1,[
    {state:'Line 14 · define main',active:[14],caption:'main groups the driver’s instructions. Its body waits until the call at the bottom of the file.',boxes:[card('When Python reads def main','Registers the function'),card('When main() is called','Starts its indented instructions')],note:'The source file places function definitions above the entry-point guard. Reading those definitions does not start the Spark count. The final call enters this body.'},
    {state:'Line 15 · create the parser',active:[15],caption:'ArgumentParser creates an option reader. description=__doc__ reuses the opening file description for help.',boxes:[card('description','The module’s opening docstring'),card('parser','An object that defines valid options')],note:'The parser is an object stored in a variable. __doc__ here is the module description, not split_order’s docstring. The parser can later display a description and option help.'},
    {state:'Lines 16–18 · define the flag',active:[16,17,18],caption:'add_argument declares --plan. store_true makes args.plan False by default and True when the flag is present.',boxes:[card('Without --plan','args.plan = False'),card('With --plan','args.plan = True')],note:'The opening parenthesis begins a multi-line function call, and the closing parenthesis ends it. --plan is the accepted option name. action="store_true" means the flag needs no following value. help supplies the option’s help message.'},
    {state:'Line 19 · read the command',links:[0],active:[19],caption:'parse_args reads the supplied options and returns them in args. The --help option prints help and exits before Spark starts.',boxes:[card('Command-line text','--plan'),card('Parsed value','args.plan is True')],note:'Declare options first, then parse them. With neither --plan nor --help, the program continues with args.plan false. --help is supplied by argparse. Its exit occurs before the SparkContext constructor.'}
  ],'Does omitting --plan skip the word count?','No. It skips only the dependency-plan printout. Both modes still collect and print the meal totals.');

  part('spark-code-input','Start Spark and divide the input',21,24,1,[
    {state:'Line 21 · create the Spark context',active:[21],caption:'SparkContext starts the connection named sc. local[2] requests two execution threads on this computer.',boxes:[card('master="local[2]"','Two local execution threads'),card('appName="Lunch counts"','A label for this application')],note:'The context connects the driver to Spark’s RDD execution system. local[2] is local mode, not two computers. appName is a display label, not an input filename. The constructor occurs before the try block.'},
    {state:'Line 22 · protect the work with cleanup',active:[22],caption:'try starts the block paired with finally below. After entering this block, normal completion or an exception leads to cleanup.',boxes:[card('try','Run the indented work'),card('finally, shown later','Call sc.stop()')],note:'The finally clause will run on normal completion or when an exception unwinds this block. It does not promise cleanup after a forced process termination. If context construction fails before try, this finally has not been entered.'},
    {state:'Line 23 · create the local records',active:[23],caption:'orders is an ordinary Python list in the driver. Each string is one input record, not one meal.',boxes:[card('Record 0','"Pizza, pizza!"'),card('Record 1','"Salad pizza."')],note:'The list has two records but contains four meal requests. Spark has not yet extracted the words. Ask students to distinguish the number of strings from the number of requested meals.'},
    {state:'Line 24 · create two partitions',active:[24],caption:'parallelize creates the source RDD from the list. numSlices=2 requests two input partitions.',boxes:[card('Input partition 0','"Pizza, pizza!"'),card('Input partition 1','"Salad pizza."')],note:'An RDD is a partitioned collection. Here each input partition holds one record. numSlices controls input divisions, while local[2] controls local execution capacity. The count transformations have not run.'}
  ],'Do local[2] and numSlices=2 mean the same thing?','No. local[2] requests local execution threads. numSlices=2 requests two input partitions.');

  part('spark-code-transformations','Build the count one transformation at a time',26,29,2,[
    {state:'Line 26 · recognize deferred work',links:[0],active:[26],caption:'The comment states the rule: these transformations describe the count. An action will request its computation.',boxes:[card('Now','Record the data dependencies'),card('Later: collect()','Run the required computation')],note:'A comment explains the program and executes no operation. The next assignments each create an RDD describing a new collection. The example traces expected values before the action runs.'},
    {state:'Line 27 · extract and flatten',links:[0,1],active:[27],caption:'flatMap calls split_order for each input record, then emits the returned list’s individual words.',boxes:[card('One record','"Pizza, pizza!"'),card('Helper result','["pizza", "pizza"]'),card('Two RDD elements','pizza · pizza')],note:'The helper returns one list per record. flatMap removes that list boundary in its output collection. It does not remove duplicates. The second record contributes salad and pizza.'},
    {state:'Line 28 · attach one count',links:[0],active:[28],caption:'map applies the lambda to each word. lambda meal: (meal, 1) returns a key-value pair for one request.',boxes:[card('Input element','pizza'),card('Function result','("pizza", 1)'),card('All four requests','pizza: 1, 1, 1','salad: 1')],note:'A lambda is a short function. meal names the current word. The tuple stores a key, the meal name, and a value, one request. map returns one pair for each word.'},
    {state:'Line 29 · identify the reducer’s arguments',active:[29],caption:'reduceByKey calls add on two values for the same key. lambda a, b: a + b is an equivalent function.',boxes:[card('Key selects a group','pizza'),card('Function arguments','a and b are count values'),card('Equivalent functions','add','lambda a, b: a + b')],note:'lambda defines a short function. a and b name its two inputs. The expression after the colon gives its returned value. Passing add or the lambda supplies a function for Spark to call later. The reducer does not receive the word as a or b. It does not receive partition numbers or the entire group as a list. It receives two values from one key’s group, and returns their combined value. The optional corpus example writes the same addition as a lambda.'},
    {state:'Line 29 · combine within partition 0',links:[0,1],active:[29],caption:'For partition 0’s two pizza requests, Spark can call add(1, 1). The returned partial count is 2.',boxes:[card('Two values for pizza','a = 1, b = 1'),card('Reducer call','add(1, 1) → 2'),card('Partial pair','("pizza", 2)')],note:'Local addition can reduce transferred pairs. This partial pair still represents two requests. The original ones are represented by the value 2 and are not sent again as extra contributions. This is an explanatory grouping, not a promised scheduling order.'},
    {state:'Line 29 · combine after the shuffle',links:[0,1],active:[29],caption:'The shuffle brings pizza’s partial values 2 and 1 together. add(2, 1) returns the final count 3.',boxes:[card('Pizza contributions','Partition 0: 2','Partition 1: 1'),card('Reducer call','a = 2, b = 1','a + b = 3'),card('One final pair','("pizza", 3)')],note:'Both inputs to this invocation are count values for pizza. A previous invocation can supply one of those values. Spark manages the regrouping and calls the supplied function to combine values. Addition permits different combining orders with the same total.'},
    {state:'Line 29 · preserve a single value',links:[0],active:[29],caption:'Salad has one value, so its result stays 1. numPartitions=2 requests output partitions, not two meal totals.',boxes:[card('Salad group','One contribution: 1'),card('Result','("salad", 1)'),card('Output partition count','Two requested partitions','Keys may share one partition')],note:'A group with one value needs no addition to preserve that value. numSlices=2 divides the original orders into two input partitions. numPartitions=2 chooses two partitions for the grouped result after the shuffle. These settings divide different collections. They do not have to match. Different keys can share a result partition. No action has requested these results yet.'},
    {state:'Line 29 · compare two inputs with one output',active:[29],caption:'What if only numPartitions changes to 1? The two input partitions stay. One result partition holds both meal totals.',foot:'What-if comparison · Original program: numPartitions=2 · Hypothetical change: numPartitions=1',note:'Keep line 24 unchanged, so numSlices remains 2. Imagine changing only line 29 to numPartitions=1. Both input partitions send their contributions to the single result partition. The addition still produces pizza 3 and salad 1. One partition can hold several keys. Ask whether choosing one result partition changes the pizza total. It does not. The highlighted source still shows the original program. This diagram illustrates the proposed change, not its original execution.',draw(d){
      [0,1].forEach(i=>{
        const y=475+i*75;
        d.rect('comparison-input-'+i,45,y,360,65,P.white,P.blue,8,2);
        d.text('comparison-label-'+i,225,y+19,'Input partition '+i,23,P.blue,'middle',650);
        d.text('comparison-record-'+i,225,y+46,i===0?'"Pizza, pizza!"':'"Salad pizza."',23,P.ink);
      });
      d.rect('comparison-shuffle',495,495,270,100,P.white,P.orange,8,2);
      d.text('comparison-shuffle-title',630,527,'Shuffle + add',25,P.orange,'middle',650);
      d.text('comparison-shuffle-key',630,565,'Group by meal',23,P.ink);
      d.arrow('comparison-route-0',415,507,485,530,P.blue,3);
      d.arrow('comparison-route-1',415,582,485,560,P.blue,3);
      d.arrow('comparison-route-out',775,545,825,545,P.green,3);
      d.rect('comparison-result',835,475,400,140,P.white,P.green,8,2);
      d.text('comparison-result-title',1035,503,'Result partition 0',25,P.green,'middle',650);
      d.text('comparison-pizza',1035,547,'("pizza", 3)',23,P.ink);
      d.text('comparison-salad',1035,585,'("salad", 1)',23,P.ink);
    }}
  ],'In lambda a, b: a + b, what are a and b when pizza’s partial counts are 2 and 1?','They are the numeric values 2 and 1 for the same pizza key. The function returns 3. It does not count the number of pairs.');

  part('spark-code-results','Inspect the plan and collect the result',31,36,2,[
    {state:'Line 31 · choose diagnostic output',active:[31],caption:'if args.plan runs the indented print only when --plan was supplied. The count below runs in either mode.',boxes:[card('args.plan = False','Skip the dependency print'),card('args.plan = True','Print the dependency description')],note:'The branch controls diagnostic output. It does not control the later collect call. Both command variants produce the same dictionary.'},
    {state:'Line 32 · turn dependency bytes into text',links:[0,1],active:[32],caption:'toDebugString describes the RDD dependencies as bytes. decode("utf-8") turns them into text, and print displays it.',boxes:[card('toDebugString()','Dependency description as bytes'),card('decode("utf-8")','Readable text'),{...card('print(...) · excerpt','(2) PythonRDD[5]',' |  MapPartitionsRDD[4]',' |  ShuffledRDD[3]'),mono:true}],foot:'Terminal excerpt · Source locations and later lines omitted · The next slide shows the full dependency tree',note:'Read the nested calls from inside outward. The print card shows the first three dependency lines from the captured run. Source locations, empty storage markers, and later lines are omitted for space. The complete capture is linked in the reading. toDebugString does not request the word-count result. This print displays the plan before collect runs. Line 36 later prints the totals. The next slide shows all six dependency lines and locates the ShuffledRDD boundary.'},
    {state:'Lines 34–35 · request Spark’s results',links:[0],active:[34,35],caption:'Inside the totals expression, counts.collect() runs first. It requests the computation and returns result pairs to the driver.',boxes:[card('Before collect','A plan for counts'),card('After collect','[(pizza, 3), (salad, 1)]','Returned order may differ')],note:'The comment names the action. collect triggers the required job and gathers its result. Use it only when the collected result fits the driver. The ordering shown here is illustrative until sorted runs.'},
    {state:'Line 35 · sort the returned pairs',links:[0],active:[35],caption:'sorted runs in the driver on the collected Python list. It orders the pairs for a stable display.',boxes:[card('Possible collected order','[(salad, 1), (pizza, 3)]'),card('After sorted','[(pizza, 3), (salad, 1)]')],note:'sorted is a Python function here, not a distributed Spark sorting transformation. It receives data already collected to the driver. Sorting changes display order, not the counts.'},
    {state:'Line 35 · construct the dictionary',links:[0],active:[35],caption:'dict converts each returned pair into a dictionary entry. reduceByKey has already added the counts.',boxes:[card('Sorted pairs','[(pizza, 3), (salad, 1)]'),card('totals','{"pizza": 3, "salad": 1}')],note:'Follow the expression from collect to sorted to dict. The pairs already contain one final count per key. The dictionary constructor converts their representation. It is not the reducer.'},
    {state:'Line 36 · print the totals',active:[36],caption:'print adds the Totals: label and displays the dictionary. All four meal requests remain represented.',boxes:[card('Terminal output',"Totals: {'pizza': 3, 'salad': 1}")],note:'The final count is three pizzas and one salad. Startup logs can differ. Ask students which earlier line combined the values and which line merely printed the completed result.'}
  ],'Which part of dict(sorted(counts.collect())) adds the pizza contributions?','None of those wrappers supplies the addition rule. collect executes the RDD plan, whose reduceByKey(add) combines the counts. sorted and dict then run locally.');

  // This scene is placed here so the code above introduces the diagnostic method first.
  const planCaptions=[
    'Both layouts connect a result to the inputs it needs. Read from the bottom input toward the top result.',
    'PythonRDD marks work done by Python functions. Start at the bottom input and follow the dependencies upward.',
    'PythonRDD[1] extracts words, creates (meal, 1) pairs, and adds matching counts within each input partition.',
    'ShuffledRDD marks the redistribution dependency. Python work before and after that boundary runs in separate stages here.',
    'PythonRDD[5] adds the partial counts received after the shuffle. For pizza, 2 + 1 produces the final total 3.',
    'The (2) markers count partitions. Bracketed numbers identify RDDs. Neither is a machine count or an elapsed time.'
  ];
  const planStates=['Compare with microdb','Read the printed dependencies','Trace PythonRDD[1] before the shuffle','Locate the stage boundary','Trace PythonRDD[5] after the shuffle','Interpret the labels'];
  const planTeaching={idea:'The printed RDD dependencies connect the source collection to its result, with a shuffle boundary separating stages.',
    question:'Does each Python transformation require its own printed RDD node or stage?',
    answer:'No. Spark can pipeline Python transformations. The ShuffledRDD dependency identifies the redistribution boundary in this example.',
    context:'Captured by running the unchanged spark_lunch.py --plan with PySpark 4.0.1, Python 3.12.14, and Java 17. The slide omits source locations and empty storage-level suffixes. Identifiers and implementation wrappers can change across runs or versions.',
    builds:[
      'Recall the microdb example selecting name from students where gpa > 35. ProjectScan wraps SelectScan over TableScan. Its next calls pull rows from child operators. The arrows here show data dependencies from input to result. Spark’s RDD layout also connects input to output, but tracks partitioned collections. This RDD display is not Spark SQL’s optimized relational plan.',
      'Read the captured output from ParallelCollectionRDD[0] upward. It identifies the source created by parallelize. A PythonRDD represents a partitioned collection produced by running Python functions. Several chained operations can share one PythonRDD node.\n\nThe printed tree places the result at the top. Source paths were omitted for readability. The reading links to the captured terminal text.',
      'Find the lower PythonRDD[1]. Its Python work includes flatMap(split_order), map to create occurrence pairs, and local addition for reduceByKey. Input partition 0 combines pizza values 1 and 1 into 2. Input partition 1 contributes pizza 1 and salad 1.\n\nThe same Python operations run on each input partition. Spark also prepares these contributions for redistribution. The one node covers several operations, so its identifier does not name one source line.',
      'Find ShuffledRDD[3]. Work below this dependency includes word extraction, pairs, and local combination. Work above it finishes the per-key combination. Spark can pipeline several Python transformations, so printed wrappers do not map one-to-one to source lines. collect requests the job but is not another RDD node in this tree.',
      'Find the upper PythonRDD[5]. The shuffle has brought matching meal contributions together. This Python work merges the received partial counts. Pizza values 2 and 1 become 3. Salad has a single value, so its result remains 1.\n\nAsk which PythonRDD combines the final pizza contributions. The answer is PythonRDD[5], above the shuffle. Both PythonRDD nodes are parts of the same requested count.',
      'The parenthesized 2 describes partitions. RDD numbers in square brackets identify objects in the recorded dependency graph. They are not durations or machine identifiers. toDebugString explains dependencies, not measured performance. Use execution measurements separately. Ask students to connect the boundary back to the pizza values 2 and 1.'
    ].map((note,i)=>planCaptions[i]+'\n\n'+note)};
  function planBox(d,key,x,y,w,title,detail,color=P.green){d.rect(key,x,y,w,75,P.white,color,8,2);d.text(key+'-title',x+w/2,y+25,title,25,color,'middle',650);d.text(key+'-detail',x+w/2,y+55,detail,22,P.ink);}
  parts.push({id:'spark-plan-visual',title:'Read the plan across the shuffle',minutes:2,kind:'visual',clarityNative:true,steps:planStates.length,states:planStates,clarityCaptions:planCaptions,
    sources:['lectures/lecture-13/spark-ray.html#spark-plan-visual','lectures/lecture-13/spark_lunch_plan.txt','lectures/lecture-09/optimizer.html#query-contract','https://spark.apache.org/docs/latest/api/python/reference/api/pyspark.RDD.toDebugString.html','https://spark.apache.org/docs/latest/api/python/_modules/pyspark/core/rdd.html'],
    teaching:planTeaching,notes:[planTeaching.idea,...planTeaching.builds,'Ask: '+planTeaching.question,'Expected answer: '+planTeaching.answer,planTeaching.context].join('\n\n'),
    draw(d,s){
      header(d,'Read the plan across the shuffle',planCaptions[s],planStates[s],s,planStates.length);
      if(s===0){
        d.text('micro-title',330,210,'microdb · local operator tree',28,P.blue);
        d.text('spark-title',950,210,'Spark · RDD dependencies',28,P.green);
        planBox(d,'micro-project',95,270,470,'ProjectScan(name)','Keep the requested field',P.blue);
        planBox(d,'micro-select',95,390,470,'SelectScan(gpa > 35)','Keep qualifying rows',P.blue);
        planBox(d,'micro-scan',95,510,470,'TableScan(students)','Read input rows',P.blue);
        d.arrow('micro-flow0',330,500,330,475,P.blue,3);d.arrow('micro-flow1',330,380,330,355,P.blue,3);
        planBox(d,'spark-final',715,270,470,'Final addition','pizza: 3 · salad: 1');
        planBox(d,'spark-shuffle',715,390,470,'Shuffle by key','Bring matching contributions together',P.orange);
        planBox(d,'spark-source',715,510,470,'Input → words → partial counts','Two input partitions');
        d.arrow('spark-flow0',950,500,950,475,P.orange,3);d.arrow('spark-flow1',950,380,950,355,P.green,3);
        d.text('plan-foot',640,645,'Arrows show data dependencies · microdb pulls rows through next() · Spark schedules partition tasks',22,P.muted);
      }else{
        d.rect('plan-text-panel',45,205,620,390,P.white,P.line,10,2);
        d.text('plan-text-title',65,235,'Captured --plan · source locations omitted',23,P.muted,'start',650);
        const lines=['(2) PythonRDD[5]',' |  MapPartitionsRDD[4]',' |  ShuffledRDD[3]',' +-(2) PairwiseRDD[2]','    |  PythonRDD[1]','    |  ParallelCollectionRDD[0]'];
        lines.forEach((line,i)=>{
          const y=292+i*47;
          const focus=s===2?4:s===3?2:s===4?0:-1;
          if(i===focus)d.rect('plan-highlight',57,y-19,596,38,s===2?P.blueLight:s===3?P.orangeLight:P.greenLight,'none',4);
          d.add('plan-text-'+i,'text',{x:70,y,fill:P.ink,'font-size':25,style:'font-family:ui-monospace, SFMono-Regular, Menlo, monospace;white-space:pre','xml:space':'preserve','text-anchor':'start','dominant-baseline':'middle'},line);
        });
        d.text('plan-bottom-up',350,565,'Read the input-to-result path upward ↑',23,P.blue);
        planBox(d,'plan-final',735,230,490,'PythonRDD[5] · finish each key','Add pizza 2 + 1 → 3');
        planBox(d,'plan-shuffle',735,355,490,'ShuffledRDD[3]','Redistribute contributions',P.orange);
        planBox(d,'plan-input',735,510,490,'PythonRDD[1] · count locally','flatMap → map → local addition',P.blue);
        d.arrow('plan-up0',980,500,980,440,P.orange,3);d.arrow('plan-up1',980,345,980,315,P.green,3);
        if(s===3)d.line('stage-boundary',700,470,1240,470,P.orange,3,'8 6');
        const foot=s===2?'Stage 0 · Input 0: pizza 1 + 1 → 2 · Input 1: pizza 1 and salad 1':
          s===3?'Stage 0: Python work before the shuffle · Stage 1: Python work after the shuffle':
          s===4?'Stage 1 · Pizza: 2 + 1 → 3 · Salad: one value stays 1 · One final total per meal':
          s===5?'(2) = partitions · [1] and [5] = RDD identifiers · IDs can vary by run and Spark version':
          'Several Python operations can share one PythonRDD node · collect() requests execution';
        d.text('plan-foot',640,645,foot,22,P.muted);
      }
    }});

  part('spark-code-entry-cleanup','Follow the entry point and cleanup',37,42,1,[
    {state:'Line 37 · run cleanup after try',links:[0],active:[37],caption:'finally introduces cleanup after the try block. It runs after normal completion or an exception inside that block.',boxes:[card('Count finishes or raises','Leave the try block'),card('finally','Enter the cleanup block')],note:'The finally clause pairs with line 22’s try. It does not catch and suppress an error by itself. The exception can still propagate after cleanup. A forced termination can prevent this code from running.'},
    {state:'Line 38 · stop the context',links:[0],active:[38],caption:'sc.stop() shuts down this SparkContext and releases its resources. It does not calculate or print the totals.',boxes:[card('After a successful count','Totals: pizza 3, salad 1'),card('sc.stop()','Stop this Spark context')],note:'The context was constructed before try. Once the work enters try, finally calls stop on normal completion or exception. The standalone script stops resources after their work is complete.'},
    {state:'Line 41 · recognize direct execution',active:[41],caption:'When Python runs this file directly, __name__ equals "__main__". Importing it gives a different module name.',boxes:[card('Run spark_lunch.py directly','The condition is True'),card('Import spark_lunch','The condition is False')],note:'This test is the entry-point guard. It lets a program define reusable helpers without starting the whole application when imported. Imports at the top still occur, but the main call is skipped when the guard is false.'},
    {state:'Line 42 · call main',links:[0,1],active:[42],caption:'The bottom main() call starts the driver’s instructions. Source order and execution order are different.',boxes:[card('First','Imports and definitions'),card('Then','Guard → main()','collect() runs the count'),card('Finally','Print totals → sc.stop()')],note:'Trace the complete control flow. Python registers split_order and main, reaches the guard, then calls main. Spark invokes split_order while evaluating the requested work. Finally stops the context. Blank lines only separate code visually.'}
  ],'Does importing this file call main automatically?','No. The __main__ guard prevents the main call when the file is imported as a module.');

  deck.scenes.splice(6,0,...parts);
  // The detailed walkthrough replaces time previously spent explaining these same lines in the overview scenes.
  const overviewIds=['same-orders-two-runtimes','spark-driver-executors','spark-lazy-plan','spark-map-word-occurrences','spark-local-combine','spark-partitions-tasks','spark-cache-recompute','spark-skew','spark-dataframe-rdd'];
  for(const scene of deck.scenes){if(overviewIds.includes(scene.id))scene.minutes=2;if(scene.id==='spark-shuffle-stages'||scene.id==='choose-and-transfer')scene.minutes=3;}
})();
