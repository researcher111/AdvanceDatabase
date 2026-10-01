'use strict';
// Semantic checks: traces must preserve keys/RIDs and show actual pointer changes.
const assert=require('node:assert/strict');
const {examples,fixtures}=require('../labs/_shared/teaching-traces.js');
const ids=['btree-search','btree-child-index','btree-descend','btree-split','btree-range'];
for(const id of ids)for(const frame of examples[id].frames){
  const v=frame.tree;assert(v&&v.result,`${id}: ${frame.label} has a tree state`);
  const nodes=new Map(v.nodes.map(n=>[n.id,n]));
  assert.equal(nodes.size,v.nodes.length);
  for(const n of nodes.values()){
    assert.deepEqual(n.keys,[...n.keys].sort((a,b)=>a-b));
    if(n.rids)assert.equal(n.rids.length,n.keys.length,'key and RID positions match');
  }
  for(const e of [...v.edges,...v.links]){
    assert(nodes.has(e.from));if(e.to)assert(nodes.has(e.to));
  }
  for(const id of [...v.active,...v.path])assert(nodes.has(id));
  for(const id of [...v.marked,...(v.rejected||[])]){
    const [name,key]=id.split(':');assert(nodes.get(name).keys.includes(Number(key)));
  }
}
const node=(frame,id)=>frame.tree.nodes.find(n=>n.id===id);
for(const id of ['btree-search','btree-range','btree-descend'])for(const f of examples[id].frames){
  assert.deepEqual(node(f,'root').keys,[fixtures.tree.separator]);
  ['left','right'].forEach((name,i)=>{
    assert.deepEqual(node(f,name).keys,fixtures.tree.leaves[i].keys);
    assert.deepEqual(node(f,name).rids,fixtures.tree.leaves[i].rids);
  });
}
const search=examples['btree-search'].frames;
assert.equal(search.filter(f=>f.tree.heap).length,1,'RID return is distinct from fetching a row');
assert.deepEqual(search.at(-1).tree.heap,{rid:'(0, 4)',name:'eli',key:36});
const split=examples['btree-split'].frames;
assert.deepEqual(node(split[0],'left').keys,[1,2,3,4]);
assert.deepEqual(node(split[1],'left').keys,[1,2,3,4,5]);
assert.deepEqual(split[2].tree.overflow,['left']);
assert.deepEqual(split[3].tree.boundary,{node:'left',index:2});
// Slicing first copies, then the original leaf is trimmed on the following line.
assert.deepEqual(node(split[4],'left').keys,[1,2,3,4,5]);
assert.deepEqual(node(split[4],'right').keys,[3,4,5]);
assert.deepEqual(node(split[5],'left').keys,[1,2]);
assert.equal(split[6].tree.links.find(l=>l.from==='left').to,null);
assert.equal(split[7].tree.links.find(l=>l.from==='left').to,'right');
assert.equal(split[7].tree.edges.length,0,'leaf link exists before the new root');
const final=split.at(-1);assert.deepEqual(node(final,'root').keys,[3]);
assert.deepEqual(final.tree.edges.map(e=>[e.from,e.to]),[['root','left'],['root','right']]);
assert.deepEqual(['left','right'].flatMap(id=>node(final,id).keys),[1,2,3,4,5]);
assert.deepEqual(['left','right'].flatMap(id=>node(final,id).rids),[['a'],['b'],['c'],['d'],['e']]);
assert(node(final,'right').keys.includes(node(final,'root').keys[0]),'leaf separator is copied, not removed');
const route=examples['btree-child-index'].frames;
assert.deepEqual(route.map(f=>f.tree.candidate||f.tree.chosen),['left','left','middle','middle','right','right','right']);
assert.equal(route.at(-1).rows[0][1],'2');
assert.deepEqual(route.at(-1).tree.path,[],'choosing a child is not following it');
const descend=examples['btree-descend'].frames;
assert.deepEqual(descend[3].tree.path,['root'],'choose child before append');
assert.deepEqual(descend[4].tree.path,['root','right'],'append grows the path');
assert.equal(descend[6].rows[1][1],'0 + 2 = 2');
const range=examples['btree-range'].frames;
assert.deepEqual(range.at(-1).tree.marked,['left:31','left:34','right:36','right:37']);
assert.deepEqual(range.at(-1).tree.rejected,['right:39']);
assert.equal(range[2].tree.activeLink,'left');
assert.equal(range.at(-1).tree.marked.flatMap(id=>{
  const [name,key]=id.split(':');const n=node(range.at(-1),name);return n.rids[n.keys.indexOf(Number(key))];
}).length,5,'four matching keys return five RIDs');
console.log(`${ids.length} code/tree examples: routing, path growth, RID fetch, split assignments, and range semantics pass.`);
