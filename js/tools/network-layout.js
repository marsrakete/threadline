/** Owns stable relation slots and round/squircle ring geometry. @param {object} options - Current shape/maps, relation resolver and shared clamp. @returns {object} Slot, orbit, label and layout operations. */
export function createNetworkLayoutController(options) {
  /** Resolves orbit axes for the active shape. @param {number} radius - Ring radius. @returns {object} Axes and exponent. */
  function axes(radius) {
    if (options.getState().shape === "squircle") { return { radiusX: radius * 1.18, radiusY: radius * 0.88, exponent: 4.6 }; }
    return { radiusX: radius, radiusY: radius, exponent: 2 };
  }
  /** Calculates an orbit point. @param {number} x - Center X. @param {number} y - Center Y. @param {number} radius - Ring radius. @param {number} angle - Radians. @returns {object} Point coordinates. */
  function point(x, y, radius, angle) {
    const orbit = axes(radius); const cos = Math.cos(angle); const sin = Math.sin(angle);
    if (orbit.exponent <= 2.01) { return { x: x + cos * orbit.radiusX, y: y + sin * orbit.radiusY }; }
    const power = 2 / orbit.exponent;
    return { x: x + Math.sign(cos) * Math.pow(Math.abs(cos), power) * orbit.radiusX,
      y: y + Math.sign(sin) * Math.pow(Math.abs(sin), power) * orbit.radiusY };
  }
  /** Builds the existing 72-segment squircle SVG path. @param {number} x - Center X. @param {number} y - Center Y. @param {number} radius - Ring radius. @returns {string|null} SVG path; null for circular rendering. */
  function path(x, y, radius) {
    if (axes(radius).exponent <= 2.01) { return null; }
    const segments = [];
    for (let index = 0; index <= 72; index += 1) {
      const position = point(x, y, radius, -Math.PI / 2 + index / 72 * Math.PI * 2);
      let command = "L";
      if (index === 0) { command = "M"; }
      segments.push(`${command} ${position.x.toFixed(2)} ${position.y.toFixed(2)}`);
    }
    return `${segments.join(" ")} Z`;
  }
  /** Allocates a stable slot, replacing it only after relationship changes. @param {object} node - Profile. @returns {object|null} Relation and index. */
  function slot(node) {
    if (!node?.did) { return null; }
    const relation = options.relation(node); const state = options.getState(); const existing = state.slots.get(node.did);
    if (existing && existing.relation === relation) { return existing; }
    const value = { relation, index: state.counts[relation] || 0 };
    state.counts[relation] = value.index + 1; state.slots.set(node.did, value); return value;
  }
  /** Resolves selected, mutual and leading label candidates without duplicates. @param {object[]} nodes - Visible profiles. @param {string} selectedDid - Selection. @returns {string[]} Label DIDs. */
  function labels(nodes, selectedDid) {
    const candidates = [];
    if (selectedDid) { candidates.push(selectedDid); }
    for (const node of [...nodes.filter((entry) => options.relation(entry) === "mutual").slice(0, 3), ...nodes.slice(0, 2)]) {
      if (!candidates.includes(node.did)) { candidates.push(node.did); }
    }
    return candidates;
  }
  /** Computes ring/lane positions and optional focus-island dimensions. @param {object[]} nodes - Visible profiles. @param {string} selectedDid - Focus selection. @returns {object} Stage geometry and position map. */
  function layout(nodes, selectedDid = "") {
    const densityFactor = options.clamp((nodes.length - 90) / 220, 0, 1.35);
    const hasFocusIsland = Boolean(String(selectedDid || "").trim());
    const groups = { mutual: [], followers: [], following: [], other: [] };
    for (const node of nodes) { groups[options.relation(node)].push(node); }
    const laneSpacing = 32 + Math.round(8 * densityFactor); const ringGap = 92 + Math.round(12 * densityFactor);
    const config = { mutual: { radius: 176 + Math.round(10 * densityFactor), capacity: 24 },
      followers: { radius: 0, capacity: 30 }, following: { radius: 0, capacity: 36 }, other: { radius: 0, capacity: 42 } };
    let previous = null;
    for (const name of Object.keys(groups)) {
      const ring = config[name]; ring.lanes = Math.max(1, Math.ceil(groups[name].length / ring.capacity));
      if (previous) { ring.radius = previous.radius + (previous.lanes - 1) * laneSpacing + ringGap; }
      previous = ring;
    }
    const outer = config.other.radius + (config.other.lanes - 1) * laneSpacing;
    const width = Math.max(960, Math.round(outer * 2 + 320));
    let height = Math.max(880, Math.round(outer * 2 + 240)); let centerY = Math.round(height / 2); let focusCenterY = 0;
    if (hasFocusIsland) {
      height = Math.max(1040, Math.round(outer + 640)); centerY = 350 + Math.round(34 * densityFactor);
      focusCenterY = Math.min(height - 190, centerY + outer + 104 + Math.round(32 * densityFactor));
    }
    const centerX = width / 2; const positions = new Map();
    for (const [name, profiles] of Object.entries(groups)) {
      const ring = config[name];
      for (const node of profiles) {
        const value = slot(node); const index = value?.index || 0; const lane = Math.floor(index / ring.capacity);
        const angle = -Math.PI / 2 + index % ring.capacity / ring.capacity * Math.PI * 2 + lane * 0.12;
        positions.set(node.did, point(centerX, centerY, ring.radius + lane * laneSpacing, angle));
      }
    }
    return { width, height, centerX, centerY, densityFactor, ringRadii: { mutual: config.mutual.radius,
      followers: config.followers.radius, following: config.following.radius }, focusCenterY, hasFocusIsland, positions };
  }
  return { slot, point, path, labels, layout };
}
