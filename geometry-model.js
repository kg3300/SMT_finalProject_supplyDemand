/* Pure spatial model. All dimensions and build-out factors are illustrative. */
(function (root) {
  'use strict';
  const baseline = Object.freeze({ height: 12, coverage: 70, lots: 1, far: 8 });
  function build(policies = {}) {
    const s = { ...baseline, ...policies };
    const merge = Math.max(1, Math.min(5, Math.round(s.lots)));
    const coverage = Math.max(.25, Math.min(.9, s.coverage / 100));
    const cap = Math.max(3, Math.min(30, s.height));
    const far = Math.max(1, Math.min(15, s.far));
    const buildings = [];
    for (let by = 0; by < 5; by++) for (let bx = 0; bx < 5; bx++) {
      for (let row = 0; row < 2; row++) for (let col = 0; col < 10; col += merge) {
        const count = Math.min(merge, 10 - col);
        let factor = 0;
        for (let j = 0; j < count; j++) factor += .45 + ((bx * 71 + by * 113 + row * 37 + (col + j) * 19) % 101) / 200;
        factor /= count;
        const floors = Math.max(1, Math.floor(Math.min(cap, far / coverage) * factor));
        const k = Math.sqrt(coverage), land = count * 400;
        buildings.push({ id: `${bx + 1}${by + 1}-${row + 1}-${col + 1}`,
          x: bx * 120 + col * 10 + count * 10 * (1 - k) / 2,
          y: by * 100 + row * 40 + 40 * (1 - k) / 2,
          w: count * 10 * k, d: 40 * k, h: floors * 3, floors,
          land, footprint: land * coverage, count });
      }
    }
    return buildings;
  }
  function measure(buildings) {
    const land = buildings.reduce((sum, b) => sum + b.land, 0);
    const footprint = buildings.reduce((sum, b) => sum + b.footprint, 0);
    const area = buildings.reduce((sum, b) => sum + b.footprint * b.floors, 0);
    return { parcels: buildings.length, land, area, far: area / land, open: 100 * (1 - footprint / land) };
  }
  const api = { baseline, build, measure };
  if (typeof module !== 'undefined') module.exports = api;
  else root.SpatialModel = api;
})(globalThis);
