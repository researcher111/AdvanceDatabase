(function () {
  'use strict';
  const P = window.DeckViz.palette;
  const diagrams = window.Lab11Diagrams;
  const source = 'labs/lab-11/sparkray.html';
  const starter = 'labs/lab-11/starter/';
  const programs = {
    "stage0_serial.py": "import time\n\nimport numpy as np\n\ndef process_image(image):\n    time.sleep(1)\n    return 255 - image\n\n\nif __name__ == \"__main__\":\n    images = [np.random.randint(0, 255, (10, 10, 3)) for _ in range(8)]\n    start_time = time.time()\n    results = [process_image(image) for image in images]\n    print(f\"Processed {len(results)} images in {time.time() - start_time:.2f} seconds.\")\n",
    "stage1_tasks.py": "import time\n\nimport numpy as np\nimport ray\n\n@ray.remote\ndef process_image(image):\n    time.sleep(1)\n    return 255 - image\n\n\nif __name__ == \"__main__\":\n    ray.init()\n    try:\n        images = [np.random.randint(0, 255, (10, 10, 3)) for _ in range(8)]\n        start_time = time.time()\n        result_refs = [process_image.remote(image) for image in images]\n        results = ray.get(result_refs)\n        print(f\"Processed {len(results)} images in {time.time() - start_time:.2f} seconds.\")\n    finally:\n        ray.shutdown()\n",
    "stage2_global.py": "import time\n\nimport numpy as np\nimport ray\n\ntotal_pixels_processed = 0\n\n\n@ray.remote\ndef process_image_and_count(image):\n    global total_pixels_processed\n    num_pixels = image.shape[0] * image.shape[1]\n    total_pixels_processed += num_pixels\n    print(f\"Task processing {num_pixels} pixels. Local total: {total_pixels_processed}\")\n    time.sleep(1)\n    return 255 - image\n\n\nif __name__ == \"__main__\":\n    ray.init()\n    try:\n        images = [np.random.randint(0, 255, (10, 10, 3)) for _ in range(4)]\n        ray.get([process_image_and_count.remote(image) for image in images])\n        expected_total = sum(image.shape[0] * image.shape[1] for image in images)\n        print(f\"Expected total pixels: {expected_total}\")\n        print(f\"Actual total pixels in main script: {total_pixels_processed}\")\n    finally:\n        ray.shutdown()\n",
    "stage2_actor.py": "import time\n\nimport numpy as np\nimport ray\n\n\n@ray.remote\nclass PixelCounter:\n    def __init__(self):\n        self.total_pixels = 0\n\n    def add(self, num_pixels):\n        self.total_pixels += num_pixels\n\n    def get_total(self):\n        return self.total_pixels\n\n\n@ray.remote\ndef process_image_with_actor(image, counter_actor):\n    ray.get(counter_actor.add.remote(image.shape[0] * image.shape[1]))\n    time.sleep(1)\n    return 255 - image\n\n\nif __name__ == \"__main__\":\n    ray.init()\n    try:\n        images = [np.random.randint(0, 255, (10, 10, 3)) for _ in range(8)]\n        counter = PixelCounter.remote()\n        task_refs = [process_image_with_actor.remote(image, counter) for image in images]\n        results = ray.get(task_refs)\n        expected_total = sum(image.shape[0] * image.shape[1] for image in images)\n        final_total = ray.get(counter.get_total.remote())\n        print(f\"Expected total pixels: {expected_total}\")\n        print(f\"Actual total from actor: {final_total}\")\n    finally:\n        ray.shutdown()\n",
    "my-cluster.yaml": "cluster_name: lab11-images\nmax_workers: 10\nprovider:\n  type: aws\n  region: us-east-1\navailable_node_types:\n  head:\n    node_config:\n      InstanceType: m5.large\n    resources: {CPU: 0}\n  worker:\n    min_workers: 10\n    max_workers: 10\n    node_config:\n      InstanceType: c5.2xlarge\n    resources: {CPU: 8}\nhead_node_type: head\n",
    "stage3_cluster.py": "import time\n\nimport numpy as np\nimport ray\n\n\n@ray.remote\nclass PixelCounter:\n    def __init__(self):\n        self.total_pixels = 0\n\n    def add(self, num_pixels):\n        self.total_pixels += num_pixels\n\n    def get_total(self):\n        return self.total_pixels\n\n\n@ray.remote\ndef process_image_with_actor(image, counter_actor):\n    ray.get(counter_actor.add.remote(image.shape[0] * image.shape[1]))\n    time.sleep(1)\n    return 255 - image\n\n\nif __name__ == \"__main__\":\n    ray.init(address=\"auto\")\n    try:\n        images = [np.random.randint(0, 255, (10, 10, 3)) for _ in range(8)]\n        counter = PixelCounter.remote()\n        task_refs = [process_image_with_actor.remote(image, counter) for image in images]\n        results = ray.get(task_refs)\n        expected_total = sum(image.shape[0] * image.shape[1] for image in images)\n        final_total = ray.get(counter.get_total.remote())\n        print(f\"Expected total pixels: {expected_total}\")\n        print(f\"Actual total from actor: {final_total}\")\n    finally:\n        ray.shutdown()\n",
    "stage4_data.py": "import ray\nimport ray.data\n\n\ndef process_image(row):\n    return {\"processed_image\": 255 - row[\"image\"], \"original_id\": row[\"path\"]}\n\n\nif __name__ == \"__main__\":\n    ray.init(address=\"auto\")\n    try:\n        ds = ray.data.read_images(\"s3://YOUR-BUCKET/raw-images\", include_paths=True)\n        processed_ds = ds.map(process_image)\n        processed_ds.write_parquet(\"s3://YOUR-BUCKET/processed-images\")\n    finally:\n        ray.shutdown()\n",
    "stage4_streaming.py": "from pathlib import Path\nfrom tempfile import TemporaryDirectory\n\nimport numpy as np\nfrom PIL import Image\nimport pyarrow.parquet as pq\nimport ray\nimport ray.data\n\n\ndef process_image(row):\n    return {\"processed_image\": 255 - row[\"image\"], \"original_id\": row[\"path\"]}\n\n\nif __name__ == \"__main__\":\n    with TemporaryDirectory() as directory:\n        source = Path(directory) / \"images\"\n        output = Path(directory) / \"processed\"\n        source.mkdir()\n        for i in range(8):\n            image = np.random.randint(0, 255, (10, 10, 3), dtype=np.uint8)\n            Image.fromarray(image).save(source / f\"{i}.png\")\n        ray.init()\n        try:\n            ds = ray.data.read_images(str(source), include_paths=True)\n            processed_ds = ds.map(process_image)\n            processed_ds.explain()\n            processed_ds.write_parquet(str(output))\n            rows = sum(pq.read_metadata(file).num_rows for file in output.glob(\"*.parquet\"))\n            print(\"written rows:\", rows)\n        finally:\n            ray.shutdown()\n"
};
  const scenes = [];
  const video = 'https://www.youtube.com/watch?v=4Rbd_1Kb2qU&t=123s';

  function wrap(text, width = 88) {
    const lines = [''];
    for (const word of text.split(/\s+/)) {
      const last = lines.length - 1;
      if (lines[last] && (lines[last] + ' ' + word).length > width) lines.push(word);
      else lines[last] += (lines[last] ? ' ' : '') + word;
    }
    return lines;
  }

  function code(d, key, x, y, text, size = 24) {
    d.add(key, 'text', {x, y, fill: P.ink, 'font-size': size,
      'text-anchor': 'start', 'dominant-baseline': 'middle',
      style: 'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre',
      'xml:space': 'preserve'}, text);
  }

  function lines(d, key, text, y = 245, size = 32) {
    text.forEach((line, i) => d.text(key + i, 640, y + i * 58, line, size));
  }

  function scene(id, title, minutes, steps, draw, teaching, section, sources = []) {
    const builds = steps.map(step => step.caption + '\n\n' + step.note);
    scenes.push({id, title, minutes, kind: 'visual', clarityNative: true,
      steps: steps.length, states: steps.map(step => step.state),
      clarityCaptions: steps.map(step => step.caption),
      sources: [source + '#' + section, ...sources],
      teaching: {...teaching, builds},
      notes: [teaching.idea, ...builds, 'Ask: ' + teaching.question,
        'Expected answer: ' + teaching.answer, teaching.context].filter(Boolean).join('\n\n'),
      draw(d, step) {
        d.text('title', 640, 52, title, 38);
        wrap(steps[step].caption).forEach((line, i) => d.text('caption' + i, 640, 108 + i * 32, line, 26));
        draw(d, step);
        d.text('step', 640, 690, 'Step ' + (step + 1) + ' of ' + steps.length + ' · ' + steps[step].state, 21, P.muted);
      }
    });
  }

  function codeScene(filename, title, minutes, section, idea, question, answer, note, run = 'python ' + filename) {
    const rows = programs[filename].trimEnd().split('\n').map((line, i) => {
      const parts = [];
      do {
        let end = Math.min(line.length, 68);
        if (line.length > 68 && line.lastIndexOf(' ', 68) > 20) end = line.lastIndexOf(' ', 68) + 1;
        parts.push({number: i + 1, continued: parts.length > 0, text: line.slice(0, end)});
        line = line.slice(end);
      } while (line.length);
      return parts;
    });
    const pages = [[]];
    for (const row of rows) {
      if (pages[pages.length - 1].length + row.length > 13) pages.push([]);
      pages[pages.length - 1].push(...row);
    }
    const steps = pages.map(page => ({
      state: 'Source lines ' + page[0].number + '–' + page[page.length - 1].number,
      caption: idea,
      note: note + '\n\nRead the displayed source lines in order. Continue to the next build for the rest of this same file. A curved arrow marks a wrapped display line.'
    }));
    scene(filename.replace(/\W/g, '-'), title, minutes, steps, (d, s) => {
      d.text('filename', 70, 180, filename + ' · complete file across ' + pages.length + ' builds', 23, P.muted, 'start');
      pages[s].forEach((row, i) => {
        const y = 222 + i * 30;
        d.text('number' + i, 77, y, row.continued ? '↪' : row.number, 18, P.muted, 'end');
        code(d, 'code' + i, 100, y, row.text);
      });
      d.link('download', 70, 630, 'Open complete ' + filename, '../' + starter + filename, 23);
      code(d, 'run', 70, 660, run, 22);
    }, {idea, question, answer}, section, [starter + filename]);
    Object.assign(scenes[scenes.length - 1], {codeSource: starter + filename, code: programs[filename]});
  }

  function diagram(id, title, minutes, labels, captions, notes, teaching, section) {
    scene(id, title, minutes, labels.map((state, i) => ({state, caption: captions[i], note: notes[i]})),
      diagrams[id], teaching, section);
  }

  scene('image-job', 'One image job, four limits', 2, [
    {state: 'Start on one laptop', caption: 'Eight independent images pass through the same color-inversion function.',
      note: 'Start with the serial loop students already know. Ask whether processing image 1 requires the result from image 0. Keep the image operation unchanged as execution changes.'},
    {state: 'Follow the changing problem', caption: 'The next limit determines which Ray feature helps.',
      note: 'Tasks overlap independent calls. An actor owns one count. A cluster adds resources. Ray Data changes how large inputs enter and leave the program. The assignment asks students to choose their own task.'}
  ], (d, s) => {
    if (!s) {
      lines(d, 'job', ['8 images', 'process_image(image)', '8 inverted images'], 240, 38);
      d.text('goal', 640, 470, 'What can run independently?', 32, P.green);
    } else {
      d.table('route', 120, 190, [500, 540], [
        ['Problem', 'Mechanism'], ['Calls wait in a loop', 'Ray tasks'],
        ['Workers need one count', 'Actor'], ['More work needs more resources', 'Cluster'],
        ['Input exceeds driver memory', 'Ray Data blocks']
      ], {fontSize: 27, rowHeight: 65});
    }
    d.link('lab', 80, 595, 'Lab 11 instructions and complete code', '../' + source, 24);
    d.link('video', 80, 640, 'Adapted from Zachary Huang · Ray in 30 min', video, 23);
  }, {idea: 'Follow the same image operation as scheduling, state, resources, and input size change.',
    question: 'Does the second image need the first image’s result?', answer: 'No. Each inversion uses only its own image.',
    context: 'The examples follow the cited video and the Lab 11 reading. This is a guided walkthrough with local runs. Cloud deployment remains optional.'}, 'video-route', [video]);

  scene('setup', 'Repository and local setup', 3, [
    {state: 'Get the repository', caption: 'Clone a new copy, or update the copy you already have.',
      note: 'Open the linked public repository. New users run git clone and enter AdvanceDatabase. Existing users open their AdvanceDatabase folder and run git pull.'},
    {state: 'Install the lab dependencies', caption: 'Use Python 3.11–3.13. The requirements file pins the Ray version.',
      note: 'Run these commands from the repository root. On Windows use .venv\\Scripts\\activate. Each local stage generates its own data. No cloud account is needed.'}
  ], (d, s) => {
    const commands = s ? ['cd labs/lab-11/starter', 'python3 -m venv .venv', 'source .venv/bin/activate', 'python -m pip install -r requirements-ray.txt'] :
      ['git clone https://github.com/researcher111/AdvanceDatabase.git', 'cd AdvanceDatabase', '', 'Existing copy: open AdvanceDatabase, then run', 'git pull'];
    commands.forEach((line, i) => code(d, 'command' + i, 90, 240 + i * 60, line, 25));
    d.link('repo', 90, 605, 'github.com/researcher111/AdvanceDatabase', 'https://github.com/researcher111/AdvanceDatabase', 26);
    if (s) d.text('windows', 640, 650, 'Windows activation: .venv\\Scripts\\activate', 25, P.muted);
  }, {idea: 'The public repository contains complete runnable examples and the required dependencies.',
    question: 'What changes if you already cloned the course repository?', answer: 'Open that folder and run git pull before entering the lab starter directory.'}, 'the-api');

  scene('image-operation', 'The image operation', 2, [
    {state: 'Invert one pixel', caption: 'Subtract each RGB channel value from 255.',
      note: 'Use one pixel to make the arithmetic visible. Its three channel values become 255, 191, and 0. The full local examples generate 10 by 10 RGB images.'},
    {state: 'Explain the artificial delay', caption: 'The one-second sleep makes overlapping waits visible. It does not measure CPU scaling.',
      note: 'The sleep is a demonstration device. Eight sequential sleeps take roughly eight seconds before other costs. Students should inspect their own output without treating the video timing as a guarantee.'}
  ], (d, s) => {
    code(d, 'input', 190, 235, 'Input RGB pixel:    [0, 64, 255]', 31);
    code(d, 'output', 190, 300, 'Inverted pixel:     [255, 191, 0]', 31);
    ['def process_image(image):', '    time.sleep(1)', '    return 255 - image'].forEach((line, i) => code(d, 'operation' + i, 190, 410 + i * 48, line, 30));
    if (s) d.text('sleep', 640, 610, 'Artificial wait · Runtime depends on resources and overhead', 26, P.orange);
  }, {idea: 'The same independent image operation is used in the serial and Ray task examples.',
    question: 'What part of this example causes most of the demonstrated delay?', answer: 'The artificial one-second sleep, not the small array subtraction.'}, 'before-you-start');

  codeScene('stage0_serial.py', 'Stage 0: the complete serial program', 2, 'before-you-start',
    'The loop processes eight images in order and prints elapsed time.',
    'When can the second function call start?', 'After the first call returns.',
    'Read the imports and function first. The entry-point guard then generates eight images. The list comprehension waits for each ordinary function call. Run the complete file and record the displayed count and timing.');

  diagram('tasks', 'Independent image tasks', 2,
    ['Serial calls', 'Submit independent tasks', 'Collect the results'], [
      'A serial loop finishes one call before starting the next.',
      'Ray can overlap independent tasks when resources are available.',
      'The driver retrieves the results in reference-list order.'
    ], [
      'Trace the serial sequence. Each call has the same artificial delay. The images do not depend on one another.',
      'The diagram shows a few of the eight images. Available CPU resources limit concurrency. Submission does not imply simultaneous start.',
      'The reference list preserves submission order. Tasks may finish in a different order. The example submits the independent calls before retrieving the list.'
    ], {idea: 'Separate task submission from result retrieval to allow independent work to overlap.',
      question: 'Must every task start at the same instant?', answer: 'No. Ray schedules tasks when their required resources are available.'}, 'ray-tasks');

  codeScene('stage1_tasks.py', 'Stage 1: the complete task program', 3, 'ray-tasks',
    'The decorator enables remote calls. The driver submits tasks and retrieves their images.',
    'What does process_image.remote(image) return?', 'An ObjectRef identifying the task result.',
    'Locate @ray.remote, then the list of remote submissions. ray.get receives that reference list. The finally block shuts down local Ray. Run the file and compare its image count with stage 0. The two runs generate different random inputs.');

  diagram('objectRef', 'ObjectRef and the returned image', 3,
    ['Submit the task', 'The driver can continue', 'Retrieve the value'], [
      'The remote call returns a reference without waiting for the image result.',
      'The same reference identifies the result while a worker processes the image.',
      'ray.get(ref) waits if necessary and returns the image. ref remains an ObjectRef.'
    ], [
      'Connect the reference to a coffee receipt: the receipt identifies an order. It is not the drink. Here the reference identifies the task output.',
      'Use the one-pixel input [0, 64, 255]. Its output is [255, 191, 0]. The driver may perform other work before retrieving this result.',
      'ray.get retrieves the value, and does not start the task. Assigning the returned image to result does not replace ref. The code can retrieve an already-ready result without waiting for task completion.'
    ], {idea: 'An ObjectRef identifies a result; ray.get retrieves its value.',
      question: 'Does print(ref) print the image after the task finishes?', answer: 'No. ref still holds an ObjectRef. Retrieve its value with ray.get(ref).'}, 'object-reference');

  scene('core-primitives', 'Ray Core primitives', 2, [
    {state: 'Tasks and objects', caption: 'Ray Core organizes function calls and their returned objects.',
      note: 'Use these rows to read stage 1. ray.init connects to Ray and can start a local instance. The remote decorator creates a wrapper, and remote submits work.'},
    {state: 'Actors and additional calls', caption: 'Actors own state. put and wait are additional reference tools.',
      note: 'The actor handle identifies an actor, while a method call returns an ObjectRef. ray.put stores an existing value. ray.wait returns ready and remaining references. Neither extra call is required for the assignment.'}
  ], (d, s) => {
    const rows = s ? [['Call', 'Purpose'], ['PixelCounter.remote()', 'Create an actor with its own state'], ['counter.add.remote(100)', 'Submit an actor method'], ['ray.put(value)', 'Store a value and return a reference'], ['ray.wait(refs, num_returns=1)', 'Return ready and remaining references'], ['ray.shutdown()', 'Disconnect and stop local Ray']] :
      [['Call or value', 'Purpose'], ['ray.init()', 'Connect to Ray'], ['@ray.remote', 'Define a remote function or actor'], ['process_image.remote(image)', 'Submit a task; receive an ObjectRef'], ['ObjectRef', 'Identify a Ray object'], ['ray.get(refs)', 'Retrieve values; wait if needed']];
    d.table('primitives', 60, 200, [555, 605], rows, {rowHeight: 65, fontSize: 25});
  }, {idea: 'Tasks, actors, and object references provide the core programming model.',
    question: 'Does an actor method call return the actor itself?', answer: 'No. It returns an ObjectRef for that method’s return value.',
    context: 'These examples use ordinary calls with one return value. ray.shutdown does not delete cloud machines. put and wait are optional reference material.'}, 'ray-core');

  codeScene('stage2_global.py', 'Stage 2: try a global count', 3, 'global-counter',
    'Four image tasks update globals in worker processes. Predict the driver’s final count.',
    'Will the driver print 0 or 400?', 'It prints 0. Worker updates do not change the driver’s variable.',
    'This standalone failure example uses four images, matching the source sequence. Each image contains 100 pixels. Read global total_pixels_processed before running. Waiting for task results does not merge worker globals.');

  diagram('global', 'Worker globals stay separate', 2,
    ['Separate process memory', 'Worker updates', 'The driver reads its own variable'], [
      'The driver and worker processes hold separate copies of the global variable.',
      'A task changes its worker’s copy of the count.',
      'The driver receives four images, but its own count remains zero.'
    ], [
      'Identify the memory boundary before following any update. Each worker process has its own module state. Workers may process more than one task over time.',
      'Local worker counts can differ with scheduling and worker reuse. The invariant is that these updates do not modify the driver’s copy.',
      'Read the actual terminal pair: Expected total pixels: 400. Actual total pixels in main script: 0. Retrieving task output does not combine unrelated global state.'
    ], {idea: 'A global variable is not shared across Ray worker processes.',
      question: 'Does waiting for all task results merge the workers’ global variables?', answer: 'No. Only the returned task values are retrieved.'}, 'global-counter');

  scene('pixels', 'Pixels and RGB channel values', 1, [
    {state: 'Count the requested quantity', caption: 'The actor counts pixels: height × width.',
      note: 'Each pixel has three RGB channel values. The image.size expression counts all channel values. The global failure has four images, while the actor program has eight.'}
  ], d => {
    d.table('counts', 130, 230, [380, 320, 320], [['Quantity', 'One image', 'Eight images'], ['Pixels', '10 × 10 = 100', '800'], ['RGB channel values', '10 × 10 × 3 = 300', '2,400']], {fontSize: 27, rowHeight: 85});
    code(d, 'pixel-code', 200, 570, 'image.shape[0] * image.shape[1]', 30);
  }, {idea: 'Count pixels separately from their color-channel values.',
    question: 'What count should the eight-image actor return?', answer: '800 pixels. The same arrays contain 2,400 RGB channel values.'}, 'ray-actors');

  codeScene('stage2_actor.py', 'Stage 2: the complete actor program', 4, 'ray-actors',
    'One PixelCounter actor owns the total. Each counted task waits for its update.',
    'What must finish before the driver reads the actor’s total?', 'All counted tasks, including their awaited actor updates.',
    'Trace the actor class, the counted task, and the driver. The actor method adds height times width. The task waits for that method before returning its processed image. After ray.get(task_refs), the driver requests the total. Run the program and expect 800.');

  diagram('actor', 'One actor owns the count', 3,
    ['Create one counter', 'Send updates to that actor', 'Read after the updates finish'], [
      'The driver creates one actor. Its state starts at zero.',
      'Image tasks send pixel counts to the same actor.',
      'Each task awaits its update. The driver waits for the tasks, then reads 800.'
    ], [
      'Distinguish the actor handle from the actor’s state. The counter lives in the actor process. This ordinary synchronous actor handles its methods serially.',
      'Each image contributes 100 pixels. Several workers may submit updates, but the actor owns the one total. The diagram represents eight updates without requiring eight worker processes.',
      'Follow the completion chain: actor update, image-task return, driver task wait, final actor read. This explains why the final total is complete in this code.'
    ], {idea: 'An actor provides one owner for mutable state, and the program explicitly waits for its updates.',
      question: 'Why is the ray.get inside the counted task needed?', answer: 'It makes task completion include the counter update before the driver reads the total.'}, 'ray-actors');

  diagram('cluster', 'Head node and worker nodes', 2,
    ['The local runtime', 'More worker machines', 'The same task definitions'], [
      'A driver submits work to Ray. Worker processes execute tasks.',
      'A cluster provides resources across machines. The head node coordinates cluster services.',
      'More workers can process more independent work. Coordination and data movement still cost time.'
    ], [
      'Separate the driver program, worker processes, and physical machines. A laptop can host several local processes. The driver can run on the head node or elsewhere.',
      'The video grows the workload to 10,000 images. The lab’s eight-image code remains a small behavior check. More machines help only when enough useful work can overlap.',
      'The task and actor definitions can stay the same. The cluster needs the same packages and files. The capacity example assumes eight one-CPU task slots locally and ten eight-CPU workers. It is not measured speedup. Actual concurrency depends on resource requests and available capacity.'
    ], {idea: 'Ray can run the same task definitions across more machines when the environment is configured.',
      question: 'Does adding workers enlarge a Python list in the driver?', answer: 'No. The list still uses memory in one process.'}, 'ray-cluster');

  codeScene('my-cluster.yaml', 'The cluster configuration file', 2, 'ray-cluster',
    'YAML describes the machines and resources for the cluster launcher.',
    'Which task function changes when the worker count changes?', 'None. The machine configuration changes separately from the task definitions.',
    'This excerpt requests an AWS head node and ten workers. The head advertises zero task CPUs in this example. Each worker advertises eight CPUs. Credentials, machine images, dependencies, and other provider setup still need configuration. AWS deployment is optional and machines incur charges.',
    'Reading only · This YAML is not a complete AWS deployment setup');

  diagram('localCloud', 'The program and its environment', 2,
    ['Run locally', 'Configure the cluster', 'Submit the program'], [
      'Local Ray runs the image tasks and actor on one machine.',
      'The cluster needs the program’s Python packages and imported files.',
      'The launcher creates machines, submits the script, and later shuts down the cluster.'
    ], [
      'Run stage2_actor.py locally first. Its behavior provides the comparison when the environment changes.',
      'The YAML describes resources. file_mounts can copy files, and setup_commands can install dependencies. Deploying on AWS is reading only for this lab.',
      'Explain ray up, ray submit, and ray down in order. ray submit copies the named script. Stage 2’s ray.init can attach to Ray already running on the head. The explicit address="auto" in stage 3 requires an existing cluster. ray.shutdown does not replace ray down.'
    ], {idea: 'The task logic can remain unchanged while configuration supplies a different execution environment.',
      question: 'Does ray.init(address="auto") create cloud machines?', answer: 'No. It requires an existing Ray cluster and fails if none is found.'}, 'ray-cluster');

  codeScene('stage3_cluster.py', 'Stage 3: connect the actor program', 2, 'ray-cluster',
    'address="auto" requires an existing cluster. The image tasks and actor stay the same.',
    'What happens if no Ray cluster is running?', 'Initialization raises an error instead of starting a new local instance.',
    'This is the complete cluster variant of the actor program. Point out the initialization line. Running this stage is optional and requires the cluster setup. The eight images test behavior, not cloud performance.',
    'Reading only · Requires an existing configured cluster');

  scene('dashboard', 'The Ray Dashboard', 1, [
    {state: 'Find the head and worker', caption: 'The Cluster view lists nodes and their resource usage.',
      note: 'This is the official documentation screenshot already used in the lab. It shows two alive nodes. Find the Head label and the logs. Values belong to that example cluster, not a lab benchmark.'},
    {state: 'Read the resource columns', caption: 'CPU, node memory, object-store memory, and disk usage describe different resources.',
      note: 'Use the enlarged detail panels in the linked lab when discussing exact numbers. High memory use needs interpretation: distinguish Python process memory from the shared object store. The screenshot does not establish a speedup.'}
  ], (d, s) => {
    if (!s) d.add('dashboard-image', 'image', {href: '../labs/lab-11/images/ray-dashboard-cluster.png', x: 50, y: 225, width: 1180, height: 323});
    else d.table('dashboard-columns', 140, 200, [390, 610], [['Column', 'What to inspect'], ['Head / worker', 'Which machine performs each role'], ['CPU', 'Compute use on each node'], ['Memory', 'Memory use on each node'], ['Object store', 'Memory used for Ray objects'], ['Disk', 'Storage use on each node']], {fontSize: 26, rowHeight: 64});
    d.link('details', 100, 630, 'Open the Dashboard screenshot and enlarged detail panels', '../' + source + '#ray-dashboard', 24);
  }, {idea: 'The Dashboard helps connect the program’s roles to actual cluster resources.',
    question: 'Does a node count tell you how many tasks finish simultaneously?', answer: 'No. Available resources and task requirements determine concurrency.',
    context: 'Screenshot from the official Ray Dashboard documentation. The lab preserves the original source and enlarged crops.'}, 'ray-dashboard', ['https://docs.ray.io/en/latest/ray-observability/getting-started.html#cluster-view']);

  diagram('memory', 'The driver memory limit', 3,
    ['Load every image', 'Read blocks on workers', 'Write output blocks'], [
      'A list of every decoded image must fit in the driver process.',
      'Workers read blocks from storage while the driver coordinates the work.',
      'Workers can read and write blocks while the driver coordinates. Worker memory still has limits.'
    ], [
      'The source example has 500 GB of stored files and a driver machine with 16 GB RAM. Compressed file size differs from decoded array size. Do not equate those quantities.',
      'The solution changes how input reaches the workers. Solid arrows carry data blocks. Dashed arrows carry control messages. The driver appears on the head node here, but can run elsewhere.',
      'Output blocks go directly to storage. Collecting every result into the driver would recreate a memory limit there. Block size, concurrent tasks, and temporary arrays still must fit memory.'
    ], {idea: 'Parallel task scheduling does not fix a driver that first loads an oversized input into one list.',
      question: 'Would ten extra workers fix a failure inside load_all_data?', answer: 'No. The driver must finish building its list before reaching the task submissions.'}, 'out-of-memory');

  diagram('data', 'Ray Data processes blocks', 2,
    ['Read image blocks', 'Apply an ordinary row function', 'Write output blocks'], [
      'Ray Data describes a dataset and schedules work over blocks of rows.',
      'Dataset.map receives an ordinary Python function. Ray Data schedules its calls.',
      'Each result keeps the source path. Output blocks go back to storage.'
    ], [
      'Define a block as a group of rows. The image reader produces row dictionaries. include_paths=True adds the source path.',
      'The ordinary function returns processed_image and original_id. There is no @ray.remote decorator and no artificial sleep in this stage.',
      'Writing avoids collecting every result into the driver. take_all would collect all rows into the calling process. Backpressure slows upstream work when downstream processing cannot keep up. Spilling object-store blocks to disk also reduces memory pressure, but neither makes memory unlimited.'
    ], {idea: 'Ray Data manages reading, row transformations, and writing as a block pipeline.',
      question: 'Why is process_image not decorated with @ray.remote here?', answer: 'Ray Data schedules the ordinary callable supplied to Dataset.map.'}, 'ray-data');

  codeScene('stage4_data.py', 'Stage 4: the storage pipeline', 2, 'ray-data',
    'Read from S3, transform each row, and write Parquet output.',
    'Where does original_id come from?', 'The path field supplied by read_images(include_paths=True).',
    'This complete cloud example contains placeholder bucket paths. Running it is optional and needs an existing cluster, storage access, and configured dependencies. Read the plain row function, then the read, map, and write calls.',
    'Reading only · Replace YOUR-BUCKET after configuring cluster and storage');

  codeScene('stage4_streaming.py', 'Stage 4: run the local file pipeline', 3, 'execution-plan',
    'Create eight PNG files, inspect the plan, and write eight output rows.',
    'Which call starts the planned image transformation?', 'write_parquet requests execution. explain displays the plans.',
    'This complete local program needs no cloud account. It creates temporary PNGs, preserves their paths, prints the plan, and writes Parquet files. The metadata check counts written rows. Expect written rows: 8. The temporary files are removed when the context exits.');

  diagram('plan', 'Ray Data and the MicroDB plan', 3,
    ['Recall the MicroDB operator tree', 'Describe Ray Data work', 'Execute physical operators'], [
      'MicroDB builds a scan tree. Repeated next() calls pull rows through its operators.',
      'Ray Data records read and map operations, then creates an execution plan.',
      'A consumer starts the planned transformation. Ray Data runs physical operators over blocks.'
    ], [
      'Return to the Lab 5 query plan. QueryData records fields, tables, and predicates. plan_query builds scans. before_first prepares them, then next pulls rows.',
      'A logical plan states the work. A physical plan specifies how to execute it. Ray Data optimizes both. This conceptual connection does not make Ray Data a SQL query optimizer.',
      'explain displays logical and physical plans before and after optimization. Reading may inspect files or metadata without running the image map. write_parquet consumes the dataset. The optimizer may fuse compatible operations; exact operators can vary.'
    ], {idea: 'Both systems separate describing work from consuming data, while their execution mechanisms differ.',
      question: 'Does explain transform all eight images if the write call is removed?', answer: 'No. It displays plans. The planned image transformation waits for a consumer.'}, 'execution-plan');

  scene('printed-plan', 'Read the printed execution plan', 2, [
    {state: 'Logical operations', caption: 'Inputs appear below their consumers. Follow the data from the bottom upward.',
      note: 'This excerpt comes from the local Ray 2.60 run preserved in the lab. The read-and-map plan covers the operations before the later write call.'},
    {state: 'Physical operators', caption: 'TaskPoolMapOperator launches Ray tasks. Operators and fusion can vary by version and settings.',
      note: 'Locate the input buffer, image reader, and map operator. The physical layout describes how the work will run. It is not measured runtime evidence.'}
  ], (d, s) => {
    const plan = s ? ['-------- Physical Plan (Optimized) --------', 'TaskPoolMapOperator[Map(process_image)]', '+- TaskPoolMapOperator[ReadImage]', '   +- InputDataBuffer[Input]'] :
      ['-------- Logical Plan --------', 'MapRows[Map(process_image)]', '+- Read[ReadImage]'];
    plan.forEach((line, i) => code(d, 'plan' + i, 105, 240 + i * 65, line, 28));
    d.text('direction', 640, 570, 'Read the input-to-result path upward', 30, P.green);
    d.link('source-plan', 105, 630, 'Captured plan excerpt and explanation', '../' + source + '#execution-plan', 23);
  }, {idea: 'The printed plan exposes dependencies and execution operators before the pipeline runs.',
    question: 'Is write_parquet another line in this displayed read-and-map plan?', answer: 'No. The write call follows explain and requests execution.',
    context: 'Captured plan excerpt from Ray 2.60. Operator names and optimization choices may vary.'}, 'execution-plan');

  scene('completion', 'Your task and completion evidence', 4, [
    {state: 'Choose independent inputs', caption: 'Choose your own small task. Compare its serial and Ray results.',
      note: 'Possible tasks include counting words in separate texts, summarizing number lists, or another image transformation. Students may adapt the supplied pattern. Keep the code short and clear, without comments.'},
    {state: 'Submit two files', caption: 'Submit to Gradescope by Tuesday December 1 at class start.',
      note: 'my_ray_task.py must contain the task, inputs, serial loop, Ray calls, and comparison. completion.txt records the task, inputs, run command, actual output, and two to four explanatory sentences. Include extra setup commands. If a run fails, record the exact error and what was tried.'},
    {state: 'Completion grading', caption: 'A good-faith attempt at all five steps earns completion credit. Speedup does not affect the grade.',
      note: 'Staff review the chosen task, implementation attempt, run evidence, and explanation. An unchanged copy of the image walkthrough or empty files is insufficient. If results differ, describe the difference. The seven helper checks do not grade this assignment. Actors, Ray Data, cloud deployment, and timing are optional.'}
  ], (d, s) => {
    const text = s === 0 ? ['1. Choose a task and independent inputs.', '2. Run a serial loop.', '3. Submit Ray tasks before retrieving results.', '4. Compare serial and Ray results.', '5. Record the run and explain what you learned.'] :
      s === 1 ? ['my_ray_task.py', 'Task + inputs + serial + Ray + comparison', 'completion.txt', 'Task + inputs + command + actual output', '2–4 sentences: independent work + what you learned', 'If the run fails: exact error + what you tried'] :
      ['Full credit: attempt all five steps.', 'No speedup or complexity threshold.', 'Actors, Ray Data, and cloud use are optional.', 'Explain any result difference or error.'];
    lines(d, 'submission', text, 220, 29);
    d.link('requirements', 100, 625, 'Full completion requirements', '../' + source + '#assignment', 25);
  }, {idea: 'Apply the independent-task pattern to your own task and document the attempt.',
    question: 'Can a slower Ray run still earn full credit?', answer: 'Yes. Completion depends on the five steps and evidence, not speedup.',
    context: 'Lab: Thursday November 19, 2026. No class November 24. The December 1 deadline is unchanged. Array comparisons can use np.array_equal. Unordered results need matching input IDs.'}, 'assignment');

  window.COURSE_DECKS = window.COURSE_DECKS || {};
  window.COURSE_DECKS.lab11 = {id: 'lab11', label: '11', type: 'lab', teachingMinutes: 60,
    title: 'Parallelize a task with Ray', date: '2026-11-19', source, scenes,
    timingNote: 'Guided walkthrough with local runs. The completion task continues independently.'};
})();
