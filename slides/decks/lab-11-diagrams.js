(function () {
  'use strict';
  const P = window.DeckViz.palette;
  const light = color => color === P.orange ? P.orangeLight : color === P.blue ? P.blueLight : color === P.red ? P.redLight : P.greenLight;
  const text = (d, k, x, y, value, size = 26, color = P.ink) => d.text(k, x, y, value, size, color);
  const arrow = (d, k, x1, y1, x2, y2, color = P.green) => d.arrow(k, x1, y1, x2, y2, color, 3);
  function dashed(d, k, x1, y1, x2, y2, color = P.muted) {
    d.line(k, x1, y1, x2, y2, color, 3, '7 7');
    const a = Math.atan2(y2 - y1, x2 - x1), l = 12;
    d.path(k + '-head', `M ${x2 - l * Math.cos(a - .45)} ${y2 - l * Math.sin(a - .45)} L ${x2} ${y2} L ${x2 - l * Math.cos(a + .45)} ${y2 - l * Math.sin(a + .45)}`, 'none', color, 3);
  }
  function box(d, k, x, y, w, h, title, lines = [], color = P.green, active = true) {
    d.rect(k, x, y, w, h, active ? light(color) : P.white, active ? color : P.line, 10, 2);
    d.text(k + '-title', x + w / 2, y + 32, title, 28, active ? color : P.ink, 'middle', 650);
    lines.forEach((line, i) => text(d, k + '-line-' + i, x + w / 2, y + 72 + i * 34, line, 26));
  }
  function code(d, k, x, y, value, size = 26) {
    d.add(k, 'text', {x, y, fill: P.ink, 'font-size': size, 'text-anchor': 'middle', 'dominant-baseline': 'middle', style: 'font-family:ui-monospace, SFMono-Regular, Menlo, monospace;white-space:pre', 'xml:space': 'preserve'}, value);
  }
  const note = (d, value) => text(d, 'diagram-note', 640, 613, value, 24, P.muted);

  function tasks(d, s) {
    if (s === 0) {
      text(d, 'serial-label', 640, 215, 'Serial loop: finish one call before starting the next', 30);
      ['Image A', 'Image B', 'Image C'].forEach((name, i) => {
        box(d, 'serial-' + i, 65 + i * 405, 310, 340, 145, name, ['Artificial wait: 1 second'], P.orange);
        if (i < 2) arrow(d, 'serial-next-' + i, 415 + i * 405, 382, 460 + i * 405, 382, P.orange);
      });
      text(d, 'serial-count', 640, 525, 'Three of eight images shown', 28, P.muted);
    } else {
      box(d, 'submit', 55, 330, 330, 180, 'Driver', ['Submit all 8 tasks', 'Keep the ObjectRefs'], P.orange);
      ['Image A', 'Image B', 'Image C'].forEach((name, i) => {
        const y = 195 + i * 130;
        box(d, 'task-' + i, 505, y, 300, 105, name, ['Independent task'], P.blue);
        arrow(d, 'submit-' + i, 395, 365 + i * 35, 495, y + 53, P.orange);
        if (s === 2) arrow(d, 'result-' + i, 815, y + 53, 905, 365 + i * 35);
      });
      if (s === 2) box(d, 'collect', 915, 330, 310, 180, 'ray.get(result_refs)', ['All 8 image results', 'In reference order'], P.green);
      else text(d, 'waiting-label', 1015, 380, 'Tasks can overlap', 26, P.green);
    }
    note(d, s === 0 ? 'The sleep demonstrates waiting. It does not measure CPU scaling.' : 'Available resources limit how many tasks overlap.');
  }

  function objectRef(d, s) {
    text(d, 'pixel-label', 640, 205, 'One RGB pixel: [0, 64, 255] → [255, 191, 0]', 28);
    box(d, 'driver', 65, 270, 465, 230, 'Driver', [], P.orange);
    code(d, 'reference', 298, 350, 'ref: ObjectRef R');
    text(d, 'driver-action', 298, 405, s === 0 ? 'Submit with .remote()' : s === 1 ? 'Can continue other work' : 'result = ray.get(ref)', 26);
    text(d, 'driver-state', 298, 455, s === 2 ? 'result holds the image' : 'ref is not the image', 26);
    box(d, 'ray-result', 750, 270, 465, 230, 'Result R', [], s === 0 ? P.blue : P.green);
    text(d, 'result-state', 983, 350, s === 0 ? 'Pending' : s === 1 ? 'Worker processes the image' : 'Completed image', 28);
    if (s === 2) code(d, 'pixel-result', 983, 405, '[255, 191, 0]');
    else text(d, 'result-info', 983, 405, s === 0 ? 'Task submitted' : 'Result becomes ready', 26);
    text(d, 'result-managed', 983, 455, 'Ray manages the result', 26);
    dashed(d, 'identifies', 540, 340, 740, 340);
    text(d, 'ref-label', 640, 305, 'Identifies R', 26, P.muted);
    if (s === 2) {
      arrow(d, 'value', 740, 440, 540, 440);
      text(d, 'value-label', 640, 480, 'Image value', 26, P.green);
    }
    text(d, 'ref-summary', 640, 555, s === 2 ? 'ray.get waits if needed. ref stays an ObjectRef.' : 'The same reference identifies the pending or ready result.', 28);
    note(d, 'Dashed arrow: reference · Green arrow: returned value');
  }

  function global(d, s) {
    text(d, 'image-count', 640, 205, '4 images × 100 pixels = 400 expected pixels', 30);
    d.rect('driver-memory', 65, 250, 445, 260, P.orangeLight, P.orange, 10, 2);
    d.rect('worker-memory', 770, 250, 445, 260, P.blueLight, P.blue, 10, 2);
    d.text('driver-title', 288, 285, 'Driver memory', 30, P.orange, 'middle', 650);
    d.text('worker-title', 993, 285, 'Worker memory', 30, P.blue, 'middle', 650);
    code(d, 'driver-variable', 288, 335, 'total_pixels_processed');
    code(d, 'worker-variable', 993, 335, 'total_pixels_processed');
    code(d, 'driver-value', 288, 390, '= 0', 38);
    code(d, 'worker-value', 993, 390, s === 0 ? '= 0' : '+= 100', 38);
    text(d, 'driver-copy', 288, 465, 'Main script reads this copy', 26);
    text(d, 'worker-copy', 993, 465, s === 0 ? 'A different copy' : 'Only this copy changes', 26);
    if (s >= 1) {
      arrow(d, 'image-input', 520, 350, 760, 350, P.orange);
      text(d, 'input-label', 640, 315, 'Image input', 26, P.orange);
    }
    if (s === 2) {
      arrow(d, 'image-return', 760, 430, 520, 430);
      text(d, 'return-label', 640, 470, 'Processed image', 26, P.green);
      d.rect('result-panel', 65, 540, 1150, 55, P.orangeLight, P.orange, 10, 2);
      text(d, 'result-text', 640, 568, '4 image results received · driver count: 0 · expected: 400', 28);
      note(d, 'The function returns images. Worker counts are not returned or merged.');
    } else {
      text(d, 'separate-memory', 640, 560, 'Same name. Separate memory.', 32, P.ink);
      note(d, 'One worker copy is illustrated. Ray can reuse worker processes.');
    }
  }

  function actor(d, s) {
    if (s === 0) {
      box(d, 'actor-driver', 75, 280, 470, 225, 'Driver', ['counter =', 'PixelCounter.remote()'], P.blue);
      arrow(d, 'create-actor', 560, 390, 720, 390, P.orange);
      text(d, 'create-label', 640, 350, 'Create actor', 26, P.orange);
      box(d, 'counter', 735, 280, 470, 225, 'PixelCounter actor', ['Owns total_pixels', 'Starts at 0'], P.green);
      text(d, 'eight-tasks', 640, 555, 'All 8 image tasks use the same actor', 30);
    } else if (s === 1) {
      ['Image A', 'Image B', 'Image H'].forEach((name, i) => {
        const y = 195 + i * 130;
        box(d, 'image-' + i, 80, y, 345, 110, name, ['Submit +100 pixels'], P.blue);
        arrow(d, 'add-' + i, 435, y + 55, 735, 325 + i * 35, P.orange);
      });
      text(d, 'ellipsis', 253, 445, '⋮', 30, P.muted);
      box(d, 'counter', 745, 285, 460, 210, 'One PixelCounter actor', ['8 updates, one total', '0 → 100 → … → 800'], P.green);
      text(d, 'serial-updates', 975, 550, 'One method runs at a time', 26, P.muted);
    } else {
      box(d, 'task-order', 65, 195, 580, 300, 'Inside each image task', ['Count 100 pixels', 'Submit actor add(100)', 'ray.get waits for the update', 'Invert and return the image'], P.blue);
      box(d, 'counter', 785, 245, 425, 200, 'PixelCounter actor', ['All 8 updates complete', 'total_pixels = 800'], P.green);
      arrow(d, 'task-add', 655, 305, 775, 305, P.orange);
      arrow(d, 'update-done', 775, 400, 655, 400);
      d.rect('driver-read', 65, 535, 1145, 60, P.orangeLight, P.orange, 10, 2);
      text(d, 'driver-read-text', 638, 565, 'Driver: wait for all tasks → read actor → 800 pixels', 28);
    }
    if (s < 2) note(d, 'An actor owns shared mutable state. Each task waits for its update.');
  }

  function cluster(d, s) {
    box(d, 'driver', 55, 310, 300, 155, 'Driver', ['Submits tasks'], P.orange);
    d.rect('cluster-boundary', 425, 195, 795, 395, P.white, P.line, 14, 2);
    text(d, 'cluster-label', 820, 225, 'Ray cluster', 30);
    box(d, 'head', 635, 260, 380, 115, 'Head node', ['Cluster management'], P.orange);
    arrow(d, 'submit-to-cluster', 365, 385, 415, 385, P.orange);
    if (s >= 1) {
      box(d, 'worker-a', 460, 420, 330, 120, 'Worker node A', ['Tasks and actors'], P.blue);
      box(d, 'worker-b', 855, 420, 330, 120, 'Worker node B', ['Tasks and actors'], P.blue);
      dashed(d, 'manage-a', 715, 385, 625, 410);
      dashed(d, 'manage-b', 935, 385, 1020, 410);
    } else text(d, 'worker-next', 820, 465, 'Worker resources run the work', 28, P.muted);
    if (s === 2) text(d, 'capacity', 820, 565, '8 → 80 task slots: more capacity', 28, P.green);
    note(d, s === 2 ? 'Illustrative capacity, not measured speedup.' : 'Logical roles. Arrows are not data-transfer routes.');
  }

  function localCloud(d, s) {
    box(d, 'program', 65, 195, 460, 160, 'stage2_actor.py', ['Driver, task, and actor', 'Same Python logic'], P.blue);
    box(d, 'local', 755, 195, 460, 160, 'Local machine', ['ray.init()', 'Local tasks and actor'], P.green);
    arrow(d, 'local-run', 535, 270, 745, 270);
    text(d, 'local-run-label', 640, 230, 'Run locally', 26, P.green);
    if (s >= 1) {
      box(d, 'yaml', 65, 425, 460, 160, 'my-cluster.yaml', ['AWS region and node types', 'Worker count'], P.orange);
      box(d, 'cloud', 755, 425, 460, 160, 'Cloud cluster', ['Connect to existing Ray', '1 head + 10 workers'], P.green);
      arrow(d, 'launch', 535, 525, 745, 525, P.orange);
      text(d, 'launch-label', 640, 562, 'ray up', 26, P.orange);
    }
    if (s === 2) {
      arrow(d, 'submit-program', 535, 340, 745, 440, P.blue);
      text(d, 'submit-label', 640, 320, 'ray submit', 26, P.blue);
    }
    note(d, s === 0 ? 'Python defines the work. Cluster settings select its execution environment.' : s === 1 ? 'Workers need the code, compatible packages, and access to input data.' : 'ray down my-cluster.yaml shuts down the cluster.');
  }

  function memory(d, s) {
    if (s === 0) {
      text(d, 'problem', 640, 220, 'Problem: load every image before submitting tasks', 30);
      box(d, 'storage', 55, 315, 310, 170, 'S3: 500 GB', ['Image files', 'In storage'], P.blue);
      box(d, 'driver', 545, 315, 390, 170, 'Driver: 16 GB RAM', ['Decoded images', 'One Python list'], P.orange);
      arrow(d, 'load-all', 375, 400, 535, 400, P.orange);
      text(d, 'load-label', 455, 350, 'Load all', 26, P.orange);
      box(d, 'oom', 995, 335, 230, 130, 'Out of memory', ['Before tasks start'], P.red);
      arrow(d, 'fails', 945, 400, 985, 400, P.red);
      text(d, 'worker-limit', 640, 550, 'More workers do not enlarge the driver’s RAM', 28, P.red);
      note(d, 'Stored file size differs from decoded array memory.');
      return;
    }
    box(d, 'head', 450, 185, 420, 105, 'Head node', ['Driver coordinates'], P.orange);
    box(d, 'storage', 55, 365, 260, 155, 'S3: 500 GB', ['Image files', 'In storage'], P.blue);
    [0, 1, 2].forEach(i => {
      const y = 325 + i * 95;
      d.rect('worker-' + i, 450, y, 340, 75, P.greenLight, P.green, 10, 2);
      text(d, 'worker-label-' + i, 620, y + 25, 'Worker ' + (i === 2 ? '…' : i + 1), 27, P.green);
      text(d, 'worker-work-' + i, 620, y + 55, 'Read → process', 26);
      arrow(d, 'data-in-' + i, 325, 400 + i * 30, 440, y + 38);
      dashed(d, 'control-' + i, 825, 300, 800, y + 25, P.orange);
      if (s === 2) arrow(d, 'data-out-' + i, 800, y + 55, 940, 400 + i * 30);
    });
    text(d, 'block-label', 370, 345, 'Blocks', 26, P.green);
    box(d, 'output', 950, 365, 275, 155, 'Output storage', s === 2 ? ['Write files', 'No full driver list'] : ['Write after', 'Processing blocks'], P.blue, s === 2);
    note(d, 'Solid: data · Dashed: control · Blocks and concurrent work must fit worker memory');
  }

  function data(d, s) {
    const stages = [
      ['Read image files', ['Produce blocks'], P.blue],
      ['map(process_image)', ['Ordinary Python function'], P.orange],
      ['Write output', ['write_parquet()'], P.green]
    ];
    stages.forEach(([title, lines, color], i) => {
      box(d, 'pipeline-' + i, 55 + i * 420, 205, 330, 125, title, lines, color, i <= s);
      if (i < 2) arrow(d, 'pipeline-next-' + i, 395 + i * 420, 268, 465 + i * 420, 268, i < s ? P.green : P.line);
    });
    box(d, 'input-row', 70, 405, 440, 175, 'Input row', ['path: "0.png"', 'image: [0, 64, 255]'], P.blue);
    if (s >= 1) {
      box(d, 'output-row', 770, 405, 440, 175, 'Output row', ['original_id: "0.png"', 'processed_image:', '[255, 191, 0]'], P.green);
      arrow(d, 'transform-row', 520, 490, 760, 490, P.orange);
      code(d, 'transform-code', 640, 450, '255 - image');
      text(d, 'path-kept', 640, 540, 'Keep the path', 26, P.muted);
    }
    note(d, s === 2 ? 'Write blocks to storage. original_id preserves each image’s source path.' : 'One RGB pixel shown. Shortened path. include_paths=True supplies the path.');
  }

  function plan(d, s) {
    text(d, 'microdb-title', 335, 200, 'MicroDB · Lab 5', 30, P.blue);
    text(d, 'ray-title', 945, 200, 'Ray Data · Lab 11', 30, P.green);
    d.line('plan-divider', 640, 235, 640, 585, P.line, 2);
    if (s < 2) {
      box(d, 'scan-tree', 65, 250, 540, 275, 'plan_query(data)', ['ProjectScan[name]', '↓', 'SelectScan[gpa > 35]', '↓', 'TableScan[students]'], P.blue);
      text(d, 'scan-direction', 335, 560, 'Root calls its child scan', 26, P.muted);
      if (s === 0) {
        box(d, 'logical-plan', 685, 250, 530, 275, 'Logical plan', ['read_images(...).map(...)', 'ReadImage', '↓', 'Map(process_image)'], P.green);
      } else {
        box(d, 'logical-plan', 685, 250, 530, 110, 'Logical operators', ['ReadImage → Map(process_image)'], P.green);
        arrow(d, 'optimize', 950, 370, 950, 420, P.orange);
        text(d, 'optimize-label', 1095, 397, 'Optimize', 26, P.orange);
        box(d, 'physical-plan', 685, 430, 530, 115, 'Physical operators', ['May combine read and map'], P.orange);
      }
      note(d, s === 0 ? 'Both plans describe connected operations before row processing.' : 'explain() displays plans. Operator names and fusion can vary.');
    } else {
      box(d, 'pull', 65, 250, 540, 175, 'Initialize, then pull rows', ['before_first()', 'next() → get_val()'], P.blue);
      arrow(d, 'row-flow', 335, 435, 335, 480, P.blue);
      box(d, 'rows', 65, 490, 540, 95, 'Matching rows', ['One row per successful next()'], P.blue);
      box(d, 'consume', 685, 250, 530, 95, 'write_parquet(...)', ['Starts execution'], P.orange);
      arrow(d, 'schedule', 950, 355, 950, 385, P.green);
      box(d, 'blocks', 685, 395, 530, 95, 'Worker tasks process blocks', ['Follow data dependencies'], P.green);
      arrow(d, 'write', 950, 500, 950, 525, P.green);
      d.rect('stored-output', 685, 535, 530, 50, P.blueLight, P.blue, 10, 2);
      text(d, 'stored-output-text', 950, 560, 'Write output blocks to storage', 26, P.blue);
      note(d, 'MicroDB pulls rows locally. Ray Data schedules blocks across workers.');
    }
  }

  window.Lab11Diagrams = {tasks, objectRef, global, actor, cluster, localCloud, memory, data, plan};
})();
