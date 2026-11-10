/** Resolves existing relation/selection styling for a network node. @param {object} node - Profile. @param {string} selectedDid - Selection. @param {Function} relation - Relation resolver. @returns {object} Radius, fill and selection flag. */
export function getNetworkStageNodeStyle(node, selectedDid, relation) {
  const type = relation(node); const selected = node.did === selectedDid;
  let radius = 15; let color = "#bac6d6";
  if (type === "mutual") { radius = 18; color = "#5ce7cf"; }
  else if (type === "followers") { color = "#69a9ff"; }
  else if (type === "following") { color = "#f8c26c"; }
  if (selected) { radius = 22; }
  return { radius, color, selected };
}

/** Binds accessible SVG selection/hover while blocking stage drag on nodes. @param {SVGElement} element - Node group. @param {string} did - Profile DID. @param {object} options - Hover getter/setter and selection callbacks. @param {object|null} settings - Optional preview selection options. @returns {SVGElement} Bound group. */
export function bindNetworkSvgNode(element, did, options, settings = null) {
  /** Stops pointer drag propagation. @param {Event} event - Node pointer event. @returns {void} */
  function stop(event) { event.stopPropagation(); }
  /** Activates hover/focus metadata. @returns {void} */
  function hover() { options.hover(did); }
  /** Clears hover only if this node still owns it. @returns {void} */
  function leave() { if (options.hovered() === did) { options.hover(""); } }
  /** Selects this node with optional preview context. @param {Event} event - Activation event. @returns {void} */
  function select(event) {
    event.stopPropagation();
    if (settings) { options.select(did, settings); } else { options.select(did); }
  }
  /** Supports Enter and Space activation without page scrolling. @param {KeyboardEvent} event - Keyboard input. @returns {void} */
  function keydown(event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(event); } }
  element.addEventListener("pointerdown", stop); element.addEventListener("mouseenter", hover); element.addEventListener("mouseleave", leave);
  element.addEventListener("focus", hover); element.addEventListener("blur", leave); element.addEventListener("click", select); element.addEventListener("keydown", keydown);
  return element;
}

/**
 * Renders the complete network SVG scene through namespace-correct templates.
 * @param {object} elements - SVG stage, empty note and scene/focus/node/preview/primitive templates.
 * @param {object} options - State, geometry, profile labels, translation and selection/hover adapters.
 * @returns {object} Render operation.
 */
export function createNetworkStageRenderer(elements, options) {
  /** Clones a required SVG structure. @param {string} key - Template key. @returns {SVGElement} Cloned SVG wrapper. */
  function clone(key) {
    const fragment = options.cloneTemplate(elements.templates[key]); const svg = fragment?.querySelector("svg");
    if (!svg) { throw new Error(`Missing network SVG template: ${key}`); }
    return svg;
  }
  /** Sets dynamic SVG attributes without introducing markup. @param {SVGElement} element - SVG node. @param {object} values - Attribute values. @returns {SVGElement} Node. */
  function attrs(element, values) { for (const [key, value] of Object.entries(values)) { if (value !== null && value !== undefined) { element.setAttribute(key, String(value)); } } return element; }
  /** Clones a primitive shape prototype. @param {string} tag - Circle, path, line or text. @param {object} values - Attributes. @returns {SVGElement} Shape. */
  function shape(tag, values) {
    const prototype = elements.templates.primitive?.content.querySelector(tag);
    if (!prototype) { throw new Error(`Missing network SVG primitive: ${tag}`); }
    return attrs(prototype.cloneNode(true), values);
  }
  /** Sets a cloned group field's position and text. @param {SVGElement} group - Group. @param {string} field - Field marker. @param {object} values - Attributes. @param {string} value - Plain text. @returns {void} */
  function text(group, field, values, value) { const element = group.querySelector(`[data-network-field="${field}"]`); attrs(element, values); element.textContent = value; }
  /** Binds node controls to current hover state and explicit selection actions. @param {SVGElement} group - Group. @param {string} did - Profile DID. @param {object|null} settings - Preview selection options. @returns {void} */
  function bind(group, did, settings = null) { bindNetworkSvgNode(group, did, { hovered: () => options.getState().hoveredDid, hover: options.hover, select: options.select }, settings); }
  /** Renders the focus island, centre, common links and preview nodes. @param {object} layout - Geometry. @param {string} did - Focus DID. @param {Set<string>} common - Common mutuals. @returns {SVGGElement} Focus layer. */
  function focus(layout, did, common) {
    const wrapper = clone("focus"); const layer = wrapper.firstElementChild; const x = layout.centerX; const y = layout.focusCenterY;
    const profile = options.known(did); const fallback = options.getState().nodes.get(did);
    for (const circle of layer.querySelectorAll("[data-network-focus-ring]")) { attrs(circle, { cx: x, cy: y }); }
    const shield = layer.querySelector('[data-network-focus-ring="shield"]');
    for (const type of ["pointerdown", "click", "dblclick"]) { shield.addEventListener(type, (event) => event.stopPropagation()); }
    attrs(layer.querySelector('[data-network-field="bridge"]'), { x1: x, y1: layout.centerY + 56, x2: x, y2: y - 108 });
    text(layer, "hint", { x, y: y - 126 }, options.t("networkFocusEyebrow"));
    const center = layer.querySelector(".network-node-button-focus-center");
    attrs(center, { "aria-label": `${profile?.displayName || profile?.handle || did} \u00b7 ${options.t("networkFocusEyebrow")}` }); bind(center, did);
    const title = center.querySelector("title");
    if (profile) { title.textContent = options.label(profile); } else { title.remove(); }
    attrs(center.querySelector("circle"), { cx: x, cy: y });
    text(center, "initials", { x, y: y + 5 }, options.initials(profile || fallback || { handle: "?" }));
    text(center, "handle", { x, y: y + 54 }, `@${profile?.handle || fallback?.handle || "user"}`);
    const commonLayer = layer.querySelector(".network-common-mutual-layer");
    if (!common.size) { commonLayer.remove(); }
    else { for (const target of common) { const point = layout.positions.get(target); if (point) { commonLayer.append(shape("line", {
      x1: x, y1: y, x2: point.x, y2: point.y, stroke: "rgba(92, 231, 207, 0.72)", "stroke-width": 2.2, "stroke-dasharray": "5 6" })); } } }
    const previews = options.previews(did);
    previews.forEach((entry, index) => {
      const angle = -Math.PI / 2 + index / Math.max(1, previews.length) * Math.PI * 2;
      const point = { x: x + Math.cos(angle) * 76, y: y + Math.sin(angle) * 76 }; const group = clone("preview").firstElementChild;
      let color = "#f8c26c"; let key = "networkPreviewFollowingTitle";
      if (entry.previewRelation === "followers") { color = "#69a9ff"; key = "networkPreviewFollowersTitle"; }
      attrs(group, { "aria-label": `${entry.displayName || entry.handle || entry.did} \u00b7 ${options.t(key)}` });
      bind(group, entry.did, { previewTab: entry.previewRelation, loadDetails: true });
      attrs(group.querySelector("line"), { x1: x, y1: y, x2: point.x, y2: point.y }); attrs(group.querySelector("circle"), { cx: point.x, cy: point.y, fill: color });
      text(group, "initials", { x: point.x, y: point.y + 4 }, options.initials(entry)); group.querySelector("title").textContent = options.label(entry); layer.append(group);
    });
    return layer;
  }
  /** Renders the scene in its original paint order and updates empty/hover state. @returns {void} */
  function render() {
    for (const node of options.allNodes()) { options.slot(node); }
    const visible = options.visibleNodes(); const state = options.getState();
    if (!visible.some((node) => node.did === state.hoveredDid)) { options.hover(""); } else if (state.hoveredDid) { options.hover(state.hoveredDid); }
    const selected = state.selectedDid || options.preferred(visible); const layout = options.layout(visible, selected);
    layout.contentBounds = options.contentBounds(layout, visible, selected); const viewport = options.viewport(layout); const common = options.common(selected);
    const hasData = visible.length > 0 || Boolean(state.viewer?.did || state.authDid); elements.empty.hidden = hasData;
    attrs(elements.stage, { viewBox: `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}` });
    const scene = clone("scene"); const background = scene.querySelector('[data-network-layer="background"]'); const glow = background.querySelector("circle");
    attrs(glow, { cx: layout.centerX, cy: layout.centerY });
    for (const [radius, color] of [[layout.ringRadii.mutual, "rgba(62, 160, 221, 0.24)"], [layout.ringRadii.followers, "rgba(62, 160, 221, 0.18)"], [layout.ringRadii.following, "rgba(62, 160, 221, 0.12)"]]) {
      const path = options.orbitPath(layout.centerX, layout.centerY, radius); let orbit;
      if (path) { orbit = shape("path", { d: path }); } else { orbit = shape("circle", { cx: layout.centerX, cy: layout.centerY, r: radius }); }
      attrs(orbit, { fill: "none", stroke: color, "stroke-width": 1.5 }); background.insertBefore(orbit, glow);
    }
    const viewer = scene.querySelector('[data-network-layer="viewer"]'); attrs(viewer.querySelector("circle"), { cx: layout.centerX, cy: layout.centerY });
    let viewerText = options.initials(state.viewer || { handle: "?" });
    if (state.accountDid === state.authDid) { viewerText = options.t("networkViewerInitials"); }
    text(viewer, "initials", { x: layout.centerX, y: layout.centerY + 7 }, viewerText);
    text(viewer, "handle", { x: layout.centerX, y: layout.centerY + 76 }, `@${state.viewer?.handle || state.authAccount || "account"}`);
    const edges = scene.querySelector('[data-network-layer="edges"]'); const nodes = scene.querySelector('[data-network-layer="nodes"]'); const labels = options.labels(visible, selected);
    for (const node of visible) {
      const point = layout.positions.get(node.did); if (!point) { continue; }
      const style = getNetworkStageNodeStyle(node, selected, options.relation); let stroke = "rgba(111, 154, 220, 0.26)"; let width = 1.1;
      if (style.selected) { stroke = "rgba(98, 229, 205, 0.95)"; width = 2.2; }
      edges.append(shape("line", { x1: layout.centerX, y1: layout.centerY, x2: point.x, y2: point.y, stroke, "stroke-width": width }));
      const group = clone("node").firstElementChild; attrs(group, { "aria-label": `${node.displayName || node.handle || node.did} \u00b7 ${options.relationLabel(node)}` }); bind(group, node.did);
      group.querySelector("title").textContent = options.label(node);
      let halo = style.radius; let haloFill = "rgba(255, 255, 255, 0.04)"; let circleStroke = "rgba(255, 255, 255, 0.38)"; let circleWidth = 1.4; let fontSize = 12;
      if (style.selected) { halo += 5; haloFill = "rgba(255, 255, 255, 0.16)"; circleStroke = "#ffffff"; circleWidth = 2.4; fontSize = 14; }
      attrs(group.querySelector('[data-network-field="halo"]'), { cx: point.x, cy: point.y, r: halo, fill: haloFill });
      for (const ring of group.querySelectorAll("[data-network-common-ring]")) {
        if (!common.has(node.did)) { ring.remove(); } else { attrs(ring, { cx: point.x, cy: point.y, r: style.radius + Number(ring.dataset.networkCommonRing) }); }
      }
      attrs(group.querySelector('[data-network-field="circle"]'), { cx: point.x, cy: point.y, r: style.radius, fill: style.color, stroke: circleStroke, "stroke-width": circleWidth });
      text(group, "initials", { x: point.x, y: point.y + 5, "font-size": fontSize }, options.initials(node));
      const label = group.querySelector('[data-network-field="handle"]');
      if (labels.includes(node.did)) { attrs(label, { x: point.x, y: point.y + style.radius + 22 }); label.textContent = `@${node.handle || "user"}`; } else { label.remove(); }
      nodes.append(group);
    }
    if (selected) { scene.append(focus(layout, selected, common)); }
    if (!hasData) { const hint = shape("text", { x: layout.centerX, y: layout.centerY - 12, "text-anchor": "middle", class: "network-stage-hint" }); hint.textContent = options.t("networkEmpty"); scene.append(hint); }
    elements.stage.replaceChildren(...scene.children);
  }
  return { render };
}
