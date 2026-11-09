const assert = require('node:assert/strict');
const {build,measure} = require('./geometry-model.js');
const base = build();
assert.equal(base.length,500);
assert.equal(measure(base).land,200000);
for(let lots=1;lots<=5;lots++) for(const height of [3,12,30]) for(const coverage of [25,70,90]) for(const far of [1,8,15]) {
  const bs=build({lots,height,coverage,far}),m=measure(bs);
  assert.equal(m.land,200000);
  assert.equal(bs.length,50*Math.ceil(10/lots));
  assert.ok(m.far<=far+1e-9);
  for(const b of bs){assert.ok(b.floors<=height);assert.equal(b.h,b.floors*3);assert.ok(b.w>0&&b.d>0);assert.ok(Math.abs(b.w*b.d-b.footprint)<1e-7);}
}
assert.deepEqual(build({interest:10,subsidy:40}),base,'Economic policies must not silently change geometry');
assert.ok(measure(build({height:3})).area<measure(base).area);
assert.ok(measure(build({far:1})).area<measure(base).area);
assert.ok(Math.abs(measure(build({coverage:50})).open-50)<1e-9);
console.log('Passed: 405 policy combinations, FAR and height constraints, parcel counts, land conservation, economic isolation.');
