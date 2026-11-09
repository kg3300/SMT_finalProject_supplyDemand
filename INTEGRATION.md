# Geometry integration review

This copy preserves Jae's original interface and economic demonstration. The independent spatial adapter listens to `simulation:update`; `geometry-model.js` holds pure geometry rules, `geometry-view.js` renders them, and `geometry.css` extends the frosted monochrome style. No external libraries or network requests are required. Open `index.html` or serve this folder locally.

## Scope

- Fictional 5 × 5 blocks, 500 original lots; not an observed NYC neighborhood.
- New policies: height cap (floors), lot coverage (%), adjacent lot merging (1–5 lots), maximum floor area ratio.
- Policies apply immediately and simultaneously. Vertical wires show membership, not sequential mathematical operations.
- Original economic policies and year timeline remain an illustrative, uncoupled demonstration. No economic-to-geometry relationship or construction schedule is asserted.
- Baseline comparison, rotate/zoom controls, parcel inspection, and spatial metrics are included.

## Assumptions

Each block is 100 × 80 m with twenty 10 × 40 m lots. Streets are 20 m wide, floors 3 m tall. Baseline is 12-floor cap, 70% coverage, no merging, FAR 8. Footprint dimensions scale by the square root of coverage. Floors are the smaller of height cap and FAR/coverage, multiplied by a deterministic illustrative build-out factor (0.45–0.95), rounded down with a minimum of one. Merging averages the constituent factors and preserves all land. Gross FAR excludes streets. Uncovered land is not necessarily public space.

## Verify

Run `node check.cjs`. In a browser, add/remove each spatial policy, vary its slider, compare baseline/scenario, rotate through four quadrants, resize the page, and check the economic timeline separately. The renderer selects visible X and Y box faces using their correct projected directions. It is an isometric canvas preview, not a Rhino export or a zoning validator.

## Next model work

Agree on empirically supported links between policy, units, feasibility, and development timing before coupling the two models. Keep Jae's upstream repository untouched until the team reviews an explicit pull request.
