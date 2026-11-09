'use strict';

// Interface demonstration only. Replace demoModel with the team's empirical model.
const policyMetrics = [
  { id: 'interest', label: 'Interest rate', min: 3, max: 25, step: 0.5, value: 5, unit: '%' },
  { id: 'affordable', label: 'Affordable units', min: 0, max: 50, step: 1, value: 20, unit: '%' },
  { id: 'density', label: 'Density bonus', min: 0, max: 100, step: 5, value: 25, unit: '%' },
  { id: 'subsidy', label: 'Housing subsidy', min: 0, max: 50, step: 1, value: 10, unit: '%' },
  { id: 'height', label: 'Height limit', min: 3, max: 30, step: 1, value: 18, unit: ' floors' },
  { id: 'coverage', label: 'Lot coverage', min: 25, max: 90, step: 5, value: 50, unit: '%' },
  { id: 'lots', label: 'Lot merging', min: 1, max: 5, step: 1, value: 2, unit: ' lots' },
  { id: 'far', label: 'Maximum FAR', min: 1, max: 15, step: 0.5, value: 4, unit: '×' },
];
const $ = id => document.getElementById(id);
const timeline = $('timeline');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const baseCondition = Object.freeze({ housing: 1000, households: 1200 });
const state = { year: 0, playing: false, active: new Set(), values: Object.fromEntries(policyMetrics.map(p => [p.id, p.value])) };
const DURATION_SECONDS = 60;
let frame = null;
let lastTime = null;
let finishDrag = null;

// Animate the entire outline and its contents as one panel. Interrupted clicks
// reverse from the current height rather than queueing another animation.
function setupDisclosure(details) {
  const summary = details.querySelector('summary');
  let animation = null;
  let expanded = details.open;
  const synchronize = () => {
    details.classList.toggle('is-expanded', expanded);
    summary.setAttribute('aria-expanded', String(expanded));
  };
  synchronize();
  function snap() {
    if (animation) { animation.onfinish = null; animation.cancel(); animation = null; }
    details.open = expanded;
    details.style.height = '';
    details.style.overflow = '';
  }
  summary.addEventListener('click', event => {
    event.preventDefault();
    const start = details.getBoundingClientRect().height;
    if (animation) { animation.onfinish = null; animation.cancel(); }
    expanded = !expanded;
    synchronize();
    details.open = true;
    details.style.height = 'auto';
    const target = expanded ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + 2;
    if (!expanded && details.contains(document.activeElement) && document.activeElement !== summary) summary.focus();
    if (reducedMotion.matches) { snap(); return; }
    details.style.overflow = 'hidden';
    animation = details.animate([{ height: `${start}px` }, { height: `${target}px` }], {
      duration: expanded ? 300 : 240, easing: 'cubic-bezier(.22,.68,0,1)', fill: 'forwards',
    });
    animation.onfinish = snap;
  });
  window.addEventListener('resize', snap);
  reducedMotion.addEventListener('change', snap);
}

document.querySelectorAll('details').forEach(setupDisclosure);

function announce(message) { $('policy-status').textContent = message; }
function movePolicy(id, zone) {
  const card = $(`policy-${id}`);
  const active = zone === 'active';
  if (active) state.active.add(id); else state.active.delete(id);
  (active ? $('active-policies') : $('policy-grid')).append(card);
  card.classList.toggle('is-active', active);
  const button = card.querySelector('.policy-move');
  button.setAttribute('aria-pressed', String(active));
  button.setAttribute('aria-label', `${active ? 'Remove' : 'Add'} ${policyMetrics.find(p => p.id === id).label} ${active ? 'from' : 'to'} Policy Metrics. Drag to move.`);
  button.textContent = active ? '↙' : '↗';
  $('drop-hint').hidden = state.active.size > 0;
  announce(`${card.querySelector('label').textContent} ${active ? 'added to' : 'removed from'} the scenario.`);
  render();
}

policyMetrics.forEach(policy => {
  const card = document.createElement('div');
  card.id = `policy-${policy.id}`;
  card.className = 'policy-card';
  card.dataset.policyId = policy.id;
  const label = document.createElement('label');
  label.htmlFor = policy.id;
  label.textContent = policy.label;
  const move = document.createElement('button');
  move.type = 'button';
  move.className = 'policy-move';
  move.textContent = '↗';
  move.setAttribute('aria-label', `Add ${policy.label} to Policy Metrics. Drag to move.`);
  move.setAttribute('aria-pressed', 'false');
  move.setAttribute('aria-describedby', 'policy-status');
  const output = document.createElement('output');
  output.id = `${policy.id}-value`;
  output.htmlFor = policy.id;
  const input = document.createElement('input');
  Object.assign(input, { id: policy.id, type: 'range', min: policy.min, max: policy.max, step: policy.step, value: policy.value });
  const limits = document.createElement('div');
  limits.className = 'gradient-labels';
  [policy.min, policy.max].forEach(value => {
    const span = document.createElement('span');
    span.textContent = `${value}${policy.unit}`;
    limits.append(span);
  });
  card.append(label, move, output, input, limits);
  $('policy-grid').append(card);
  input.addEventListener('input', () => { state.values[policy.id] = Number(input.value); render(); });
  setupPolicyDrag(move, card, policy.id);
});
for (let index = policyMetrics.length; index < 14; index++) {
  const placeholder = document.createElement('div');
  placeholder.className = 'policy-card policy-placeholder';
  placeholder.setAttribute('aria-hidden', 'true');
  $('policy-grid').append(placeholder);
}

function setupPolicyDrag(handle, card, id) {
  let drag = null;
  let suppressClick = false;
  handle.addEventListener('click', event => {
    if (suppressClick) { suppressClick = false; return; }
    movePolicy(id, state.active.has(id) ? 'bank' : 'active');
    handle.focus({ preventScroll: true });
  });
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    suppressClick = false;
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, ghost: null, zone: null };
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;
    if (!drag.ghost) {
      setPlaying(false);
      drag.ghost = card.cloneNode(true);
      drag.ghost.removeAttribute('id');
      drag.ghost.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      drag.ghost.classList.add('drag-ghost');
      drag.ghost.setAttribute('aria-hidden', 'true');
      drag.ghost.inert = true;
      drag.ghost.style.width = `${card.getBoundingClientRect().width}px`;
      document.body.append(drag.ghost);
      card.classList.add('is-dragging');
      document.body.classList.add('policy-dragging');
      finishDrag = () => endDrag(false);
    }
    drag.ghost.style.left = `${event.clientX - drag.ghost.offsetWidth / 2}px`;
    drag.ghost.style.top = `${event.clientY - drag.ghost.offsetHeight / 2}px`;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-policy-zone]');
    document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    drag.zone = target?.dataset.policyZone ?? null;
    target?.classList.add('drop-target');
  });
  function endDrag(commit) {
    if (!drag) return;
    const current = drag;
    drag = null;
    if (current.ghost) {
      suppressClick = true;
      current.ghost.remove();
      card.classList.remove('is-dragging');
      document.body.classList.remove('policy-dragging');
      document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
      if (commit && current.zone) movePolicy(id, current.zone);
      else announce('Move cancelled. Policy remains in its original location.');
    }
    if (handle.hasPointerCapture(current.pointerId)) handle.releasePointerCapture(current.pointerId);
    finishDrag = null;
  }
  handle.addEventListener('pointerup', () => endDrag(true));
  handle.addEventListener('pointercancel', () => endDrag(false));
  handle.addEventListener('lostpointercapture', () => endDrag(false));
}

// Baselines depend only on the fixed baseCondition; only activated policies
// enter this synthetic scenario. The equations are NOT a validated forecast.
function demoModel(year) {
  const progress = year / 20;
  const policy = id => state.active.has(id) ? state.values[id] : 0;
  const baselineAccess = Math.min(100, baseCondition.housing / baseCondition.households * 100);
  const baselineValue = baseCondition.housing * 0.0141;
  const supplyChange = (policy('density') * .004 + policy('subsidy') * .003 - policy('interest') * .012) * progress;
  return {
    baselineAccess, baselineValue,
    access: Math.max(0, Math.min(100, baselineAccess * (1 + supplyChange) + policy('affordable') * .08 * progress)),
    value: Math.max(0, baselineValue * (1 + supplyChange - policy('affordable') * .002 * progress)),
  };
}
function render() {
  policyMetrics.forEach(policy => {
    $(`${policy.id}-value`).textContent = `${state.values[policy.id]}${policy.unit}`;
    $(policy.id).setAttribute('aria-valuetext', `${state.values[policy.id]}${policy.unit}`);
  });
  const result = demoModel(state.year);
  timeline.value = state.year;
  timeline.setAttribute('aria-valuetext', `${state.year.toFixed(1)} years`);
  $('play-track').style.setProperty('--progress', state.year / 20);
  $('time-label').textContent = `YEAR ${state.year.toFixed(1).padStart(4, '0')} / 20`;
  $('access-baseline').textContent = `${result.baselineAccess.toFixed(1)}%`;
  $('access-result').textContent = `${result.access.toFixed(1)}%`;
  $('value-baseline').textContent = `$${result.baselineValue.toFixed(1)}m`;
  $('value-result').textContent = `$${result.value.toFixed(1)}m`;
  // Adapter event for a future Rhino/Grasshopper renderer, without filling the canvas.
  document.dispatchEvent(new CustomEvent('simulation:update', { detail: {
    year: state.year, playing: state.playing, baseCondition,
    policies: Object.fromEntries([...state.active].map(id => [id, state.values[id]])), results: result,
  } }));
}
function setPlaying(value) {
  state.playing = value;
  $('play').classList.toggle('is-playing', value);
  $('play').setAttribute('aria-label', value ? 'Pause simulation' : 'Play simulation');
  $('play').setAttribute('aria-pressed', String(value));
  document.body.classList.toggle('is-playing', value);
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  lastTime = null;
  if (value) frame = requestAnimationFrame(advance);
}
function advance(now) {
  if (!state.playing) return;
  if (lastTime !== null) state.year = Math.min(20, state.year + Math.min(now - lastTime, 100) / 1000 * 20 / DURATION_SECONDS);
  lastTime = now;
  render();
  if (state.year >= 20) { setPlaying(false); render(); }
  else frame = requestAnimationFrame(advance);
}
function togglePlayback() {
  if (!state.playing && state.year >= 20) state.year = 0;
  setPlaying(!state.playing);
  render();
}

// The button is also the timeline thumb: a short press toggles playback;
// dragging scrubs instead and always leaves playback paused.
let playDrag = null;
$('play').addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  playDrag = { pointerId: event.pointerId, x: event.clientX, moved: false, wasPlaying: state.playing };
  $('play').setPointerCapture(event.pointerId);
  setPlaying(false);
});
$('play').addEventListener('pointermove', event => {
  if (!playDrag || playDrag.pointerId !== event.pointerId) return;
  if (Math.abs(event.clientX - playDrag.x) > 4) playDrag.moved = true;
  if (!playDrag.moved) return;
  const track = $('play-track').getBoundingClientRect();
  const radius = $('play').getBoundingClientRect().width / 2;
  state.year = Math.max(0, Math.min(20, (event.clientX - track.left - radius) / Math.max(1, track.width - radius * 2) * 20));
  render();
});
$('play').addEventListener('pointerup', event => {
  if (!playDrag || playDrag.pointerId !== event.pointerId) return;
  const current = playDrag;
  playDrag = null;
  $('play').releasePointerCapture(event.pointerId);
  if (!current.moved) {
    if (!current.wasPlaying && state.year >= 20) state.year = 0;
    setPlaying(!current.wasPlaying);
  }
  render();
});
function cancelPlayDrag() { playDrag = null; setPlaying(false); }
$('play').addEventListener('pointercancel', cancelPlayDrag);
$('play').addEventListener('lostpointercapture', () => { if (playDrag) cancelPlayDrag(); });
$('play').addEventListener('click', event => { if (event.detail === 0) togglePlayback(); });
timeline.addEventListener('pointerdown', () => setPlaying(false));
timeline.addEventListener('keydown', event => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)) setPlaying(false);
});
timeline.addEventListener('input', () => { setPlaying(false); state.year = Number(timeline.value); render(); });
$('reset').addEventListener('click', () => {
  finishDrag?.();
  setPlaying(false);
  state.year = 0;
  policyMetrics.forEach(policy => {
    state.values[policy.id] = policy.value;
    $(policy.id).value = policy.value;
    movePolicy(policy.id, 'bank');
  });
  announce('Scenario reset. Base condition unchanged.');
  render();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') finishDrag?.(); });
window.addEventListener('blur', () => { setPlaying(false); finishDrag?.(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { setPlaying(false); finishDrag?.(); } });
render();
