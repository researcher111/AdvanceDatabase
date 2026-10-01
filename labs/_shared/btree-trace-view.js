/* Native SVG view of the tree snapshot attached to each teaching-code frame.
 * No Python runtime or student TODO implementations are involved. */
(function () {
  'use strict';
  const ns = 'http://www.w3.org/2000/svg';
  const html = (tag, cls, text) => {
    const node = document.createElement(tag);
    node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const svgNode = (tag, attrs = {}, text) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key,value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    return node;
  };
  window.CourseBTreeTrace = {
    create(host, prefix) {
      const figure = html('figure', 'trace-tree');
      const label = html('p', 'trace-label', 'Tree at this step');
      const viewport = html('div', 'trace-tree-viewport');
      viewport.tabIndex = 0;
      viewport.setAttribute('role', 'region');
      viewport.setAttribute('aria-label', 'Tree diagram; scroll horizontally on a small screen');
      const caption = html('figcaption', 'trace-tree-result');
      const legend = html('p', 'trace-tree-legend', 'Orange: current operation or chosen route. Green: matching entries. Dashed arrow: candidate child.');
      const hint = html('p', 'trace-tree-scroll-hint', 'Scroll sideways in the diagram to see the whole tree.');
      figure.append(label, hint, viewport, caption, legend);
      host.append(figure);
      return {
        render(view, frame, example) {
          figure.hidden = !view;
          if (!view) return;
          const svg = svgNode('svg', {viewBox:'0 0 720 480', role:'img', 'aria-labelledby':prefix+'-tree-title '+prefix+'-tree-desc'});
          svg.append(svgNode('title', {id:prefix+'-tree-title'}, example.title+' — '+frame.label));
          const description = view.nodes.map(n => n.label+': ['+n.keys.join(', ')+']').join('. ')+'. '+
            view.links.map(l => l.from+'.next = '+(l.to || 'None')).join('. ')+'. '+view.result;
          svg.append(svgNode('desc', {id:prefix+'-tree-desc'}, description));
          const defs = svgNode('defs');
          for (const [name,color] of [['route','#b5502d'],['link','#30785b'],['quiet','#92a298']]) {
            const marker = svgNode('marker', {id:prefix+'-'+name, viewBox:'0 0 10 10', refX:9, refY:5, markerWidth:7, markerHeight:7, orient:'auto-start-reverse'});
            marker.append(svgNode('path', {d:'M 1 1 L 9 5 L 1 9', fill:'none', stroke:color, 'stroke-width':1.5}));
            defs.append(marker);
          }
          svg.append(defs);
          const text = (x,y,value,cls='') => svg.append(svgNode('text', {x,y, class:cls, 'text-anchor':'middle'}, value));
          const layout = new Map(view.nodes.map(n => {
            const leaf = view.links.some(l => l.from === n.id);
            const width = leaf ? (view.compact ? 204 : 300) : Math.max(100,n.keys.length*80);
            return [n.id, {...n, leaf, width, height:leaf ? 112 : 56}];
          }));
          text(360,22,view.chosen ? 'Selected child 2 · pointer not followed yet' : view.path?.length ? 'path = ['+view.path.join(', ')+']' : (view.compact ? 'Choose a child; the keys stay in place.' : 'Leaf entries: keys above RID lists. Root keys only route.'), 'trace-tree-context');
          if (!layout.has('root')) text(360,99,'Leaf split · ORDER = 4', 'trace-tree-heading');
          for (const edge of view.edges) {
            const from = layout.get(edge.from), to = layout.get(edge.to);
            const selected = view.chosen === edge.to || (view.path?.includes(edge.from) && view.path?.includes(edge.to));
            const candidate = view.candidate === edge.to;
            const cls = 'trace-tree-child'+(selected ? ' is-active' : '')+(candidate ? ' is-candidate' : '');
            svg.append(svgNode('path', {d:`M ${from.x} ${from.y+from.height} L ${to.x} ${to.y-4}`, class:cls,
              'data-edge':edge.from+':'+edge.to, 'marker-end':`url(#${prefix}-${selected||candidate ? 'route' : 'quiet'})`}));
            const x = (from.x+to.x)/2, y = 170, width = edge.label.length*9.8+16;
            svg.append(svgNode('rect', {x:x-width/2, y:y-20, width, height:28, rx:4, class:'trace-tree-edge-label'}));
            text(x,y,edge.label, 'trace-tree-rule'+(selected||candidate ? ' is-active' : ''));
          }
          for (const link of view.links) {
            const from = layout.get(link.from), active = view.activeLink === link.from;
            if (!link.to) {
              text(from.x,from.y+from.height+23,'next = None','trace-tree-next-label'+(active ? ' is-active' : ''));
              continue;
            }
            const to = layout.get(link.to), x1 = from.x+from.width/2-24, x2 = to.x-to.width/2+24;
            svg.append(svgNode('path', {d:`M ${x1} ${from.y+from.height} V 385 H ${x2} V ${to.y+to.height+3}`,
              class:'trace-tree-next'+(active ? ' is-active' : ''), 'data-link':link.from+':'+link.to,
              'marker-end':`url(#${prefix}-${active ? 'route' : 'link'})`}));
            text((x1+x2)/2,410,'next','trace-tree-next-label'+(active ? ' is-active' : ''));
          }
          for (const n of layout.values()) {
            const active = view.active?.includes(n.id), overflow = view.overflow?.includes(n.id);
            const g = svgNode('g', {'data-node':n.id, class:'trace-tree-node'+(active ? ' is-active' : '')+(overflow ? ' is-overflow' : '')});
            const labelWidth = n.label.length*10.5+16;
            g.append(svgNode('rect', {x:n.x-labelWidth/2,y:n.y-35,width:labelWidth,height:27,rx:3,class:'trace-tree-edge-label'}));
            g.append(svgNode('text', {x:n.x,y:n.y-15,'text-anchor':'middle',class:'trace-tree-node-label'}, n.label));
            g.append(svgNode('rect', {x:n.x-n.width/2,y:n.y,width:n.width,height:n.height,rx:7,class:'trace-tree-box'}));
            const cell = n.width/n.keys.length;
            n.keys.forEach((key,i) => {
              const id = n.id+':'+key, x = n.x-n.width/2+i*cell;
              const marked = view.marked?.includes(id), rejected = view.rejected?.includes(id);
              const entry = svgNode('g', {'data-entry':id, class:'trace-tree-entry'+(marked ? ' is-marked' : '')+(rejected ? ' is-rejected' : '')});
              entry.append(svgNode('rect', {x:x+3,y:n.y+4,width:cell-6,height:n.height-8,rx:4}));
              entry.append(svgNode('text', {x:x+cell/2,y:n.y+(n.leaf ? 34 : 37),'text-anchor':'middle',class:'trace-tree-key'},key));
              if (n.rids) {
                const rids = n.rids[i];
                rids.forEach((rid,j) => entry.append(svgNode('text', {x:x+cell/2,y:n.y+66+j*23,'text-anchor':'middle',class:'trace-tree-rid'}, Array.isArray(rid) ? '('+rid.join(', ')+')' : '['+rid+']')));
              } else if (n.leaf) {
                entry.append(svgNode('text', {x:x+cell/2,y:n.y+78,'text-anchor':'middle',class:'trace-tree-rid'}, 'key'));
              }
              if (rejected) entry.append(svgNode('text', {x:x+cell/2,y:n.y+99,'text-anchor':'middle',class:'trace-tree-stop'},'stop'));
              g.append(entry);
            });
            if (view.boundary?.node === n.id) {
              const x = n.x-n.width/2+cell*view.boundary.index;
              g.append(svgNode('path', {d:`M ${x} ${n.y-4} V ${n.y+n.height+4}`, class:'trace-tree-slice'}));
              g.append(svgNode('text', {x,y:n.y+n.height+48,'text-anchor':'middle',class:'trace-tree-next-label is-active'},'mid = 2'));
            }
            svg.append(g);
          }
          if (view.heap) {
            const source = [...layout.values()].find(n => n.rids && n.keys.includes(view.heap.key));
            const x = source.x-source.width/2+(source.keys.indexOf(view.heap.key)+.5)*source.width/source.keys.length;
            svg.append(svgNode('path', {d:`M ${x} ${source.y+source.height} V 422`,class:'trace-tree-fetch','data-fetch-key':view.heap.key,'marker-end':`url(#${prefix}-route)`}));
            svg.append(svgNode('rect', {x:85,y:425,width:440,height:42,rx:6,class:'trace-tree-heap'}));
            text(305,453,`Heap ${view.heap.rid} → ${view.heap.name}, gpa ${view.heap.key}`, 'trace-tree-heap-text');
          }
          viewport.replaceChildren(svg);
          caption.textContent = view.result;
        }
      };
    }
  };
})();
