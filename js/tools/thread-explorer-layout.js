/**
 * Calculates the point where an edge leaves a rectangular card.
 * @param {{x:number, y:number}} center - Card center.
 * @param {{width:number, height:number}} size - Card dimensions.
 * @param {{x:number, y:number}} target - Opposing card center.
 * @returns {{x:number, y:number}} Point on the card boundary.
 */
export function getThreadExplorerReplyClusterEdgeAnchor(center = {}, size = {}, target = {}) {
  const deltaX = Number(target.x) - Number(center.x);
  const deltaY = Number(target.y) - Number(center.y);
  const distance = Math.hypot(deltaX, deltaY);
  if (!distance) {
    return { x: Number(center.x) || 0, y: Number(center.y) || 0 };
  }

  const directionX = deltaX / distance;
  const directionY = deltaY / distance;
  const halfWidth = Math.max(1, Number(size.width) || 0) / 2;
  const halfHeight = Math.max(1, Number(size.height) || 0) / 2;
  let scaleX = Number.POSITIVE_INFINITY;
  let scaleY = Number.POSITIVE_INFINITY;
  if (Math.abs(directionX) > 0.0001) {
    scaleX = halfWidth / Math.abs(directionX);
  }
  if (Math.abs(directionY) > 0.0001) {
    scaleY = halfHeight / Math.abs(directionY);
  }
  const edgeDistance = Math.min(scaleX, scaleY);
  return {
    x: Number(center.x) + (directionX * edgeDistance),
    y: Number(center.y) + (directionY * edgeDistance),
  };
}

/**
 * Calculates a clamped zoom while keeping a viewport point over the same stage point.
 * @param {object} state - Current zoom, panX and panY.
 * @param {object} bounds - Viewport left and top coordinates.
 * @param {number} factor - Multiplicative zoom factor.
 * @param {number} clientX - Anchor client x coordinate.
 * @param {number} clientY - Anchor client y coordinate.
 * @returns {object|null} New viewport or null for invalid input.
 */
export function calculateThreadExplorerPointZoom(state, bounds, factor, clientX, clientY) {
  if (!state || !bounds) {
    return null;
  }
  const values = [state.zoom, state.panX, state.panY, bounds.left, bounds.top, factor, clientX, clientY];
  if (!values.every(Number.isFinite) || state.zoom <= 0) {
    return null;
  }
  const zoom = Math.min(2, Math.max(0.01, state.zoom * factor));
  const localX = clientX - bounds.left;
  const localY = clientY - bounds.top;
  return {
    zoom,
    panX: localX - ((localX - state.panX) / state.zoom) * zoom,
    panY: localY - ((localY - state.panY) / state.zoom) * zoom,
  };
}

/**
 * Calculates pan coordinates that reveal a measured card at a chosen viewport alignment.
 * @param {object} state - Current zoom, panX and panY.
 * @param {object} viewport - Viewport left/top and visible width/height.
 * @param {object} target - Measured card left/top/width/height.
 * @param {object} options - Optional block/inline alignment; center or default 24px inset.
 * @returns {object|null} Synchronized viewport state or null for invalid measurements.
 */
export function calculateThreadExplorerNodePan(state, viewport, target, options = {}) {
  if (!state || !viewport || !target) {
    return null;
  }
  const values = [state.zoom, state.panX, state.panY, viewport.left, viewport.top, viewport.width, viewport.height,
    target.left, target.top, target.width, target.height];
  if (!values.every(Number.isFinite)) {
    return null;
  }
  let desiredLeft = 24;
  let desiredTop = 24;
  if (options.inline === "center") {
    desiredLeft = (viewport.width - target.width) / 2;
  }
  if (options.block === "center") {
    desiredTop = (viewport.height - target.height) / 2;
  }
  return { zoom: state.zoom, panX: state.panX + (desiredLeft - (target.left - viewport.left)),
    panY: state.panY + (desiredTop - (target.top - viewport.top)) };
}

/**
 * Returns the rectangle occupied by a positioned cluster card.
 * @param {object} renderNode - Positioned render node.
 * @param {{width:number, height:number}} itemSize - Measured card size.
 * @returns {{left:number, top:number, right:number, bottom:number, width:number, height:number}} Card rectangle.
 */
export function getThreadExplorerReplyClusterNodeRect(renderNode = {}, itemSize = {}) {
  const width = Math.max(0, Number(itemSize.width) || 0);
  const height = Math.max(0, Number(itemSize.height) || 0);
  const centerX = Number(renderNode.position?.x) || 0;
  const centerY = Number(renderNode.position?.y) || 0;
  return {
    left: centerX - (width / 2),
    top: centerY - (height / 2),
    right: centerX + (width / 2),
    bottom: centerY + (height / 2),
    width,
    height,
  };
}

/**
 * Applies a center position to a rendered cluster item.
 * @param {HTMLElement|null} item - Cluster item element.
 * @param {number} centerX - Stage-space center X.
 * @param {number} centerY - Stage-space center Y.
 * @returns {void}
 */
export function setThreadExplorerReplyClusterItemPosition(item, centerX, centerY) {
  if (!item) {
    return;
  }
  item.style.setProperty("--thread-explorer-cluster-x", `${Math.round(centerX)}px`);
  item.style.setProperty("--thread-explorer-cluster-y", `${Math.round(centerY)}px`);
}

/**
 * Measures a rendered cluster item.
 * @param {HTMLElement|null} item - Cluster item element.
 * @returns {{width:number, height:number}} Measured CSS dimensions.
 */
export function getThreadExplorerReplyClusterItemSize(item) {
  if (!item) {
    return { width: 0, height: 0 };
  }
  return {
    width: Math.max(0, item.offsetWidth),
    height: Math.max(0, item.offsetHeight),
  };
}

/**
 * Updates a positioned render node and its DOM item.
 * @param {object|null} renderNode - Render node to move.
 * @param {number} nextX - New stage-space center X.
 * @param {number} nextY - New stage-space center Y.
 * @returns {void}
 */
export function setThreadExplorerReplyClusterNodePosition(renderNode, nextX, nextY) {
  if (!renderNode) {
    return;
  }
  renderNode.position = { x: nextX, y: nextY };
  setThreadExplorerReplyClusterItemPosition(renderNode.item, nextX, nextY);
}

/**
 * Calculates the total breadth of sibling subtrees including gaps.
 * @param {Array<object>} children - Child render nodes with subtreeWidth values.
 * @param {number} childGap - Gap between sibling subtrees.
 * @returns {number} Required sibling breadth.
 */
export function getThreadExplorerReplyClusterChildrenBreadth(children = [], childGap = 0) {
  if (!Array.isArray(children) || children.length === 0) {
    return 0;
  }
  let totalBreadth = 0;
  children.forEach((childNode, childIndex) => {
    totalBreadth += Number(childNode?.subtreeWidth) || 0;
    if (childIndex > 0) {
      totalBreadth += childGap;
    }
  });
  return totalBreadth;
}

/**
 * Calculates stable star angles for direct replies around a cluster root.
 * @param {Array<object>} directReplies - Direct reply subtrees.
 * @param {number} clusterRadius - Radius of the first reply ring.
 * @returns {number[]} Outward reply angles in radians.
 */
export function getThreadExplorerReplyClusterRootChildAngles(directReplies = [], clusterRadius = 1) {
  if (!Array.isArray(directReplies) || directReplies.length === 0) {
    return [];
  }
  if (directReplies.length === 1) {
    return [Math.PI / 2];
  }

  const arcPadding = 56;
  let totalAngularSpan = 0;
  directReplies.forEach((childNode) => {
    totalAngularSpan += ((Number(childNode?.subtreeWidth) || 0) + arcPadding) / Math.max(1, clusterRadius);
  });
  if (totalAngularSpan <= 0) {
    return [];
  }

  const normalizedSpan = Math.min(Math.PI * 2, totalAngularSpan);
  let currentAngle = (-Math.PI / 2) - (normalizedSpan / 2);
  const angles = [];
  directReplies.forEach((childNode) => {
    const childSpan = ((Number(childNode?.subtreeWidth) || 0) + arcPadding) / Math.max(1, clusterRadius);
    const centeredSpan = Math.min(childSpan, Math.PI * 2);
    angles.push(currentAngle + (centeredSpan / 2));
    currentAngle += centeredSpan;
  });
  return angles;
}

/**
 * Appends a curved SVG connection between two card-edge anchor points.
 * @param {SVGElement|null} svg - SVG layer receiving the edge.
 * @param {{x:number, y:number}} start - Edge start point.
 * @param {{x:number, y:number}} end - Edge end point.
 * @param {string} edgeClassName - Additional edge class.
 * @param {Function} createSvgNode - SVG element factory.
 * @returns {void} No return value.
 */
export function appendThreadExplorerReplyClusterEdge(svg, start, end, edgeClassName, createSvgNode) {
  if (!svg || typeof createSvgNode !== "function") {
    return;
  }
  const path = createSvgNode("path", {
    class: `thread-explorer-edge ${edgeClassName}`.trim(),
    d: `M ${start.x} ${start.y} C ${start.x} ${start.y + ((end.y - start.y) * 0.35)}, ${end.x} ${end.y - ((end.y - start.y) * 0.35)}, ${end.x} ${end.y}`,
  });
  svg.appendChild(path);
}

/**
 * Renders all visible parent-child edges in a positioned cluster layout.
 * @param {object|null} layoutState - Cluster state with positioned render nodes.
 * @param {object} options - SVG, measurement, anchor, and edge dependencies.
 * @param {Function} options.getItemSize - Measures a rendered card.
 * @param {Function} options.createSvgNode - SVG element factory.
 * @returns {void} No return value.
 */
export function renderThreadExplorerReplyClusterEdges(layoutState, options = {}) {
  if (!layoutState?.edgeLayer || !Array.isArray(layoutState.positionedItems)) {
    return;
  }
  layoutState.edgeLayer.replaceChildren();
  layoutState.positionedItems.forEach((renderNode) => {
    if (!Array.isArray(renderNode.children) || renderNode.children.length === 0) {
      return;
    }
    const parentSize = options.getItemSize(renderNode.item);
    renderNode.children.forEach((childNode) => {
      const childSize = options.getItemSize(childNode.item);
      const start = getThreadExplorerReplyClusterEdgeAnchor(renderNode.position, parentSize, childNode.position);
      const end = getThreadExplorerReplyClusterEdgeAnchor(childNode.position, childSize, renderNode.position);
      appendThreadExplorerReplyClusterEdge(
        layoutState.edgeLayer,
        start,
        end,
        "thread-explorer-edge-reply",
        options.createSvgNode,
      );
    });
  });
}

/**
 * Updates cluster dimensions, shifts cards inside the stage, and redraws edges.
 * @param {object|null} layoutState - Cluster render state.
 * @param {object} options - Measurement, positioning, and edge dependencies.
 * @param {Function} options.getItemSize - Measures a rendered card.
 * @param {Function} options.setItemPosition - Applies a card center position.
 * @param {Function} options.renderEdges - Redraws cluster edges after sizing.
 * @returns {void} No return value.
 */
export function applyThreadExplorerReplyClusterBounds(layoutState, options = {}) {
  if (!layoutState?.cluster || !Array.isArray(layoutState.positionedItems) || layoutState.positionedItems.length === 0) {
    return;
  }
  let minLeft = Number.POSITIVE_INFINITY;
  let minTop = Number.POSITIVE_INFINITY;
  let maxRight = Number.NEGATIVE_INFINITY;
  let maxBottom = Number.NEGATIVE_INFINITY;
  layoutState.positionedItems.forEach((renderNode) => {
    const itemSize = options.getItemSize(renderNode.item);
    minLeft = Math.min(minLeft, renderNode.position.x - (itemSize.width / 2));
    minTop = Math.min(minTop, renderNode.position.y - (itemSize.height / 2));
    maxRight = Math.max(maxRight, renderNode.position.x + (itemSize.width / 2));
    maxBottom = Math.max(maxBottom, renderNode.position.y + (itemSize.height / 2));
  });
  const shiftX = Math.max(0, 80 - minLeft);
  const shiftY = Math.max(0, 80 - minTop);
  if (shiftX || shiftY) {
    layoutState.positionedItems.forEach((renderNode) => {
      renderNode.position.x += shiftX;
      renderNode.position.y += shiftY;
      options.setItemPosition(renderNode.item, renderNode.position.x, renderNode.position.y);
    });
    maxRight += shiftX;
    maxBottom += shiftY;
  }
  const stageWidth = Math.max(1120, Math.ceil(maxRight + 80));
  const stageHeight = Math.max(860, Math.ceil(maxBottom + 80));
  layoutState.cluster.style.width = `${stageWidth}px`;
  layoutState.cluster.style.height = `${stageHeight}px`;
  layoutState.edgeLayer.setAttribute("width", String(stageWidth));
  layoutState.edgeLayer.setAttribute("height", String(stageHeight));
  layoutState.edgeLayer.setAttribute("viewBox", `0 0 ${stageWidth} ${stageHeight}`);
  options.renderEdges(layoutState);
}

/**
 * Measures a recursive cluster subtree and stores its required layout bounds.
 * @param {object|null} renderNode - Recursive cluster render node.
 * @param {Function} getItemSize - Measures a rendered card.
 * @returns {{width:number, height:number}} Required subtree dimensions.
 */
export function measureThreadExplorerReplyClusterSubtree(renderNode, getItemSize) {
  if (!renderNode || typeof getItemSize !== "function") {
    return { width: 0, height: 0 };
  }
  const itemSize = getItemSize(renderNode.item);
  renderNode.itemSize = itemSize;
  if (!Array.isArray(renderNode.children) || renderNode.children.length === 0) {
    renderNode.subtreeWidth = Math.max(220, itemSize.width);
    renderNode.subtreeHeight = Math.max(120, itemSize.height);
    return { width: renderNode.subtreeWidth, height: renderNode.subtreeHeight };
  }
  const childGap = 48;
  let totalChildWidth = 0;
  let maxChildHeight = 0;
  renderNode.children.forEach((childNode, childIndex) => {
    const childBounds = measureThreadExplorerReplyClusterSubtree(childNode, getItemSize);
    totalChildWidth += childBounds.width;
    if (childIndex > 0) {
      totalChildWidth += childGap;
    }
    maxChildHeight = Math.max(maxChildHeight, childBounds.height);
  });
  renderNode.subtreeWidth = Math.max(itemSize.width, totalChildWidth);
  renderNode.subtreeHeight = itemSize.height + 84 + maxChildHeight;
  return { width: renderNode.subtreeWidth, height: renderNode.subtreeHeight };
}

/**
 * Places a recursive branch outward from its parent while distributing siblings.
 * @param {object|null} renderNode - Recursive cluster render node.
 * @param {number} centerX - Branch center X.
 * @param {number} centerY - Branch center Y.
 * @param {number} angle - Outward angle in radians.
 * @param {Array<object>} positionedItems - Flat output list of positioned nodes.
 * @param {Function} setItemPosition - Applies the card's center position.
 * @returns {void} No return value.
 */
export function placeThreadExplorerReplyClusterSubtree(renderNode, centerX, centerY, angle, positionedItems, setItemPosition) {
  if (!renderNode || typeof setItemPosition !== "function") {
    return;
  }
  renderNode.position = { x: centerX, y: centerY };
  setItemPosition(renderNode.item, centerX, centerY);
  positionedItems.push(renderNode);
  if (!Array.isArray(renderNode.children) || renderNode.children.length === 0) {
    return;
  }
  const childGap = 48;
  const childrenBreadth = getThreadExplorerReplyClusterChildrenBreadth(renderNode.children, childGap);
  const radialX = Math.cos(angle);
  const radialY = Math.sin(angle);
  const tangentX = -Math.sin(angle);
  const tangentY = Math.cos(angle);
  let childOffset = -childrenBreadth / 2;
  const outwardDistance = (renderNode.itemSize.height / 2) + 84;
  renderNode.children.forEach((childNode) => {
    const childCenterOffset = childOffset + (childNode.subtreeWidth / 2);
    const childCenterDistance = outwardDistance + (childNode.itemSize.height / 2);
    const childCenterX = centerX + (tangentX * childCenterOffset) + (radialX * childCenterDistance);
    const childCenterY = centerY + (tangentY * childCenterOffset) + (radialY * childCenterDistance);
    placeThreadExplorerReplyClusterSubtree(childNode, childCenterX, childCenterY, angle, positionedItems, setItemPosition);
    childOffset += childNode.subtreeWidth + childGap;
  });
}

/**
 * Resolves overlapping cluster cards while keeping the root fixed.
 * @param {object|null} layoutState - Cluster state with positioned nodes.
 * @param {Function} setNodePosition - Updates a node and its rendered item.
 * @returns {void} No return value.
 */
export function resolveThreadExplorerReplyClusterOverlaps(layoutState, setNodePosition) {
  if (!layoutState?.rootRenderNode || !Array.isArray(layoutState.positionedItems) || layoutState.positionedItems.length < 2) {
    return;
  }
  const rootNode = layoutState.rootRenderNode;
  const collisionPadding = 24;
  const maxIterations = 18;
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let hasMoved = false;
    for (let indexA = 0; indexA < layoutState.positionedItems.length; indexA += 1) {
      const nodeA = layoutState.positionedItems[indexA];
      const rectA = getThreadExplorerReplyClusterNodeRect(nodeA, nodeA.itemSize);
      for (let indexB = indexA + 1; indexB < layoutState.positionedItems.length; indexB += 1) {
        const nodeB = layoutState.positionedItems[indexB];
        const rectB = getThreadExplorerReplyClusterNodeRect(nodeB, nodeB.itemSize);
        const overlapX = Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left);
        const overlapY = Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top);
        if (overlapX <= 0 || overlapY <= 0) {
          continue;
        }
        let deltaX = (Number(nodeB.position?.x) || 0) - (Number(nodeA.position?.x) || 0);
        let deltaY = (Number(nodeB.position?.y) || 0) - (Number(nodeA.position?.y) || 0);
        if (!deltaX && !deltaY) {
          deltaX = (Number(nodeB.position?.x) || 0) - (Number(rootNode.position?.x) || 0);
          deltaY = (Number(nodeB.position?.y) || 0) - (Number(rootNode.position?.y) || 0);
        }
        if (!deltaX && !deltaY) {
          deltaY = 1;
        }
        const distance = Math.hypot(deltaX, deltaY) || 1;
        const directionX = deltaX / distance;
        const directionY = deltaY / distance;
        const pushDistance = Math.max(overlapX, overlapY) + collisionPadding;
        if (nodeA === rootNode) {
          setNodePosition(nodeB, nodeB.position.x + (directionX * pushDistance), nodeB.position.y + (directionY * pushDistance));
        } else if (nodeB === rootNode) {
          setNodePosition(nodeA, nodeA.position.x - (directionX * pushDistance), nodeA.position.y - (directionY * pushDistance));
        } else {
          const halfPush = pushDistance / 2;
          setNodePosition(nodeA, nodeA.position.x - (directionX * halfPush), nodeA.position.y - (directionY * halfPush));
          setNodePosition(nodeB, nodeB.position.x + (directionX * halfPush), nodeB.position.y + (directionY * halfPush));
        }
        hasMoved = true;
      }
    }
    if (!hasMoved) {
      break;
    }
  }
}

/**
 * Performs the complete star/radial placement pass for a reply-cluster tree.
 * @param {object|null} layoutState - Cluster render state.
 * @param {object} options - DOM measurement and layout application callbacks.
 * @param {Function} options.getItemSize - Measures one rendered cluster card.
 * @param {Function} options.setItemPosition - Applies a card center position.
 * @param {Function} options.setNodePosition - Moves a node during overlap resolution.
 * @param {Function} options.applyBounds - Shifts nodes and updates stage bounds.
 * @returns {void} No return value.
 */
export function layoutThreadExplorerReplyCluster(layoutState, options = {}) {
  if (!layoutState?.rootRenderNode || typeof options.getItemSize !== "function") {
    return;
  }
  measureThreadExplorerReplyClusterSubtree(layoutState.rootRenderNode, options.getItemSize);
  layoutState.positionedItems = [];
  const rootNode = layoutState.rootRenderNode;
  const rootSize = rootNode.itemSize || options.getItemSize(rootNode.item);
  const rootCenterX = 720;
  const rootCenterY = 540;
  rootNode.position = { x: rootCenterX, y: rootCenterY };
  options.setItemPosition(rootNode.item, rootCenterX, rootCenterY);
  layoutState.positionedItems.push(rootNode);

  const directReplies = Array.isArray(rootNode.children) ? rootNode.children : [];
  if (directReplies.length > 0) {
    let maxChildWidth = 0;
    let totalBreadth = 0;
    directReplies.forEach((childNode) => {
      maxChildWidth = Math.max(maxChildWidth, childNode.itemSize?.width || 0);
      totalBreadth += childNode.subtreeWidth || 0;
    });
    const rootClearanceRadius = (Math.max(rootSize.width, rootSize.height) / 2) + (maxChildWidth / 2) + 120;
    const circumferenceRadius = totalBreadth / (Math.PI * 1.75);
    const clusterRadius = Math.max(320, rootClearanceRadius, circumferenceRadius);
    const directReplyAngles = getThreadExplorerReplyClusterRootChildAngles(directReplies, clusterRadius);
    directReplies.forEach((childNode, childIndex) => {
      const angle = directReplyAngles[childIndex];
      const childCenterX = rootCenterX + (Math.cos(angle) * clusterRadius);
      const childCenterY = rootCenterY + (Math.sin(angle) * clusterRadius);
      placeThreadExplorerReplyClusterSubtree(
        childNode,
        childCenterX,
        childCenterY,
        angle,
        layoutState.positionedItems,
        options.setItemPosition,
      );
    });
  }
  resolveThreadExplorerReplyClusterOverlaps(layoutState, options.setNodePosition);
  options.applyBounds(layoutState);
}

/**
 * Keeps the original thread root expanded in the reply-cluster state.
 * @param {string} rootUri - URI of the original thread root.
 * @param {Set<string>} expandedUris - Current expanded-node URI set.
 * @returns {boolean} True when a valid root URI was added or already present.
 */
export function ensureThreadExplorerReplyClusterRootExpanded(rootUri, expandedUris) {
  const normalizedUri = String(rootUri || "").trim();
  if (!normalizedUri || !(expandedUris instanceof Set)) {
    return false;
  }
  expandedUris.add(normalizedUri);
  return true;
}

/**
 * Applies cluster-specific role and position styling to a rendered post item.
 * @param {HTMLElement|null} item - Rendered post item.
 * @param {number} centerX - Item center X in stage coordinates.
 * @param {number} centerY - Item center Y in stage coordinates.
 * @param {string} role - Cluster role such as center or reply.
 * @returns {HTMLElement|null} The styled item, or null when no item was supplied.
 */
export function configureThreadExplorerReplyClusterItem(item, centerX, centerY, role) {
  if (!item) {
    return null;
  }
  item.classList.add("thread-explorer-cluster-node-item");
  item.classList.add(`is-cluster-${role}`);
  setThreadExplorerReplyClusterItemPosition(item, centerX, centerY);
  return item;
}

/**
 * Mounts an initialized cluster workspace into the thread stage.
 * @param {HTMLElement|null} stage - Thread Explorer stage.
 * @param {object|null} layoutState - Initialized cluster state.
 * @returns {boolean} True when the workspace was mounted.
 */
export function mountThreadExplorerReplyClusterWorkspace(stage, layoutState) {
  if (!stage || !layoutState?.cluster) {
    return false;
  }
  stage.classList.add("is-reply-cluster-mode");
  stage.appendChild(layoutState.cluster);
  return true;
}

/** Checks finite rectangle coordinates for viewport calculations.
 * @param {object|null} box - Stage or browser rectangle. @returns {boolean} True for finite dimensions.
 */
function hasFiniteThreadExplorerBox(box) {
  return Boolean(box) && [box.left, box.top, box.width, box.height].every(Number.isFinite);
}

/** Converts a rendered rectangle back into untransformed stage coordinates.
 * @param {object|null} rect - Rendered element rectangle.
 * @param {object|null} viewport - Browser viewport rectangle.
 * @param {object} state - Zoom, panX and panY values.
 * @returns {object|null} Stage rectangle, or null for hidden/invalid measurements.
 */
export function getThreadExplorerStageBoxFromRects(rect, viewport, state = {}) {
  if (!hasFiniteThreadExplorerBox(rect) || !hasFiniteThreadExplorerBox(viewport) || rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return transformThreadExplorerStageBox(rect, viewport, state);
}

/** Merges measured stage bounds without mutating either input.
 * @param {object|null} accumulatedBounds - Existing box.
 * @param {object|null} nextBounds - Additional box.
 * @returns {object|null} Combined finite rectangle, or null for absent/invalid boxes.
 */
export function mergeThreadExplorerStageBounds(accumulatedBounds, nextBounds) {
  if (!nextBounds) {
    return accumulatedBounds;
  }
  if (!hasFiniteThreadExplorerBox(nextBounds) || (accumulatedBounds && !hasFiniteThreadExplorerBox(accumulatedBounds))) {
    return null;
  }
  if (!accumulatedBounds) {
    return { left: nextBounds.left, top: nextBounds.top, width: nextBounds.width, height: nextBounds.height };
  }
  const left = Math.min(accumulatedBounds.left, nextBounds.left);
  const top = Math.min(accumulatedBounds.top, nextBounds.top);
  const right = Math.max(accumulatedBounds.left + accumulatedBounds.width, nextBounds.left + nextBounds.width);
  const bottom = Math.max(accumulatedBounds.top + accumulatedBounds.height, nextBounds.top + nextBounds.height);
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

/** Collects the complete finite extent of measured cards, ignoring absent measurements.
 * @param {Array<object|null>} boxes - Stage rectangles from the DOM adapter.
 * @returns {object|null} Content bounds, or null for empty/invalid input.
 */
export function getThreadExplorerContentBounds(boxes) {
  if (!Array.isArray(boxes)) {
    return null;
  }
  let bounds = null;
  for (const box of boxes) {
    if (!box) {
      continue;
    }
    if (!hasFiniteThreadExplorerBox(box)) {
      return null;
    }
    bounds = mergeThreadExplorerStageBounds(bounds, box);
  }
  if (!bounds) {
    return null;
  }
  return { ...bounds, width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) };
}

/** Calculates the existing padded, clamped fit without changing DOM or global state.
 * @param {object|null} bounds - Stage content bounds with positive dimensions.
 * @param {object|null} viewport - Client width and height in pixels.
 * @param {object} options - Optional minZoom/maxZoom, defaulting to 0.08 and 1.85.
 * @returns {{zoom: number, panX: number, panY: number}|null} Viewport transform, or null for invalid input.
 */
export function calculateThreadExplorerViewportFit(bounds, viewport, options = {}) {
  if (!hasFiniteThreadExplorerBox(bounds) || bounds.width <= 0 || bounds.height <= 0
    || !viewport || !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)) {
    return null;
  }
  const viewportWidth = Math.max(1, viewport.width);
  const viewportHeight = Math.max(1, viewport.height);
  const paddingX = Math.max(40, viewportWidth * 0.1);
  const paddingY = Math.max(40, viewportHeight * 0.12);
  const availableWidth = Math.max(1, viewportWidth - paddingX * 2);
  const availableHeight = Math.max(1, viewportHeight - paddingY * 2);
  let minimumZoom = Number(options?.minZoom);
  if (!Number.isFinite(minimumZoom)) {
    minimumZoom = 0.08;
  }
  let maximumZoom = Number(options?.maxZoom);
  if (!Number.isFinite(maximumZoom)) {
    maximumZoom = 1.85;
  }
  const fittedZoom = Math.min(availableWidth / bounds.width, availableHeight / bounds.height);
  const zoom = Math.min(maximumZoom, Math.max(minimumZoom, fittedZoom));
  return { zoom, panX: ((viewportWidth - bounds.width * zoom) / 2) - bounds.left * zoom,
    panY: ((viewportHeight - bounds.height * zoom) / 2) - bounds.top * zoom };
}

/**
 * Finds one rendered reply-cluster node inside the current cluster layout state.
 * @param {string} uri - AT URI of the wanted reply-cluster node.
 * @param {object|null} renderNode - Recursive reply-cluster render node.
 * @returns {object|null} Matching reply-cluster render node or null.
 */
export function findThreadExplorerReplyClusterRenderNode(uri, renderNode) {
  const normalizedUri = String(uri || "").trim();
  if (!normalizedUri || !renderNode) {
    return null;
  }

  if (String(renderNode?.node?.post?.uri || "").trim() === normalizedUri) {
    return renderNode;
  }

  let children = [];
  if (Array.isArray(renderNode.children)) {
    children = renderNode.children;
  }
  for (const childNode of children) {
    const matchingNode = findThreadExplorerReplyClusterRenderNode(normalizedUri, childNode);
    if (matchingNode) {
      return matchingNode;
    }
  }
  return null;
}

/**
 * Collects one stage-space bounds box for a rendered card and its direct replies in tree view.
 * @param {HTMLElement|null} item - Rendered Thread Explorer node item.
 * @param {object} options - Layout mode/root and card/box measurement adapters.
 * @returns {{left:number, top:number, width:number, height:number}|null} Combined bounds or null.
 */
function getThreadExplorerTreeCardNeighborhoodBounds(item, options) {
  if (!item) {
    return null;
  }

  let combinedBounds = null;
  const ownCard = options.getCard(item) || item;
  combinedBounds = mergeThreadExplorerStageBounds(combinedBounds, options.getBox(ownCard));

  const childCards = item.querySelectorAll(":scope > .thread-explorer-children > .thread-explorer-node-item > .thread-explorer-node > .thread-explorer-post-card");
  childCards.forEach((childCard) => {
    combinedBounds = mergeThreadExplorerStageBounds(combinedBounds, options.getBox(childCard));
  });
  return combinedBounds;
}

/**
 * Collects one stage-space bounds box for a rendered card and its direct replies in reply-cluster view.
 * @param {string} uri - AT URI of the clicked post card.
 * @param {object} options - Layout mode/root and card/box measurement adapters.
 * @returns {{left:number, top:number, width:number, height:number}|null} Combined bounds or null.
 */
function getThreadExplorerReplyClusterCardNeighborhoodBounds(uri, options) {
  const rootRenderNode = options.rootRenderNode || null;
  const targetNode = findThreadExplorerReplyClusterRenderNode(uri, rootRenderNode);
  if (!targetNode) {
    return null;
  }

  let combinedBounds = null;
  combinedBounds = mergeThreadExplorerStageBounds(combinedBounds, options.getBox(options.getCard(targetNode.item) || targetNode.item));
  let children = [];
  if (Array.isArray(targetNode.children)) {
    children = targetNode.children;
  }
  children.forEach((childNode) => {
    combinedBounds = mergeThreadExplorerStageBounds(combinedBounds, options.getBox(options.getCard(childNode.item) || childNode.item));
  });
  return combinedBounds;
}

/**
 * Collects one stage-space bounds box for the clicked post card and its immediate reply neighborhood.
 * @param {HTMLElement|null} item - Rendered Thread Explorer node item.
 * @param {object} options - Layout mode/root and card/box measurement adapters.
 * @returns {{left:number, top:number, width:number, height:number}|null} Combined bounds or null.
 */
export function getThreadExplorerCardNeighborhoodBounds(item, options) {
  const uri = String(item?.dataset?.uri || "").trim();
  if (!uri) {
    return null;
  }

  if (options.clusterMode) {
    return getThreadExplorerReplyClusterCardNeighborhoodBounds(uri, options);
  }
  return getThreadExplorerTreeCardNeighborhoodBounds(item, options);
}

/**
 * Returns direct rendered child node items for a Thread Explorer item.
 * @param {HTMLElement} item - Rendered Thread Explorer node item.
 * @returns {HTMLElement[]} Direct child node items.
 */
export function getRenderedThreadExplorerChildItems(item) {
  const childrenList = item.querySelector(":scope > .thread-explorer-children");
  if (!childrenList) {
    return [];
  }
  return Array.from(childrenList.children).filter((child) => child.classList.contains("thread-explorer-node-item"));
}

/**
 * Returns the visible post card for a rendered Thread Explorer item.
 * @param {HTMLElement} item - Rendered Thread Explorer node item.
 * @returns {HTMLElement|null} Direct post card element, or null.
 */
export function getRenderedThreadExplorerCard(item) {
  return item.querySelector(":scope > .thread-explorer-node > .thread-explorer-post-card");
}

/**
 * Adds all collapsible Thread Explorer node URIs to a target set.
 * @param {object|null} node - Tree node to inspect.
 * @param {Set<string>} targetSet - Set that receives post URIs for nodes with replies.
 * @returns {void}
 */
export function collectCollapsibleThreadExplorerUris(node, targetSet) {
  if (!node || !Array.isArray(node.replies) || node.replies.length === 0) {
    return;
  }
  if (node.post?.uri) {
    targetSet.add(node.post.uri);
  }
  node.replies.forEach((reply) => {
    collectCollapsibleThreadExplorerUris(reply, targetSet);
  });
}

/** Builds a curved edge between measured cards. @param {object} parentRect - Parent geometry. @param {object} childRect - Child geometry. @param {string} orientation - Horizontal or vertical. @returns {string} SVG path. */
export function buildThreadExplorerEdgePath(parentRect, childRect, orientation = "vertical") {
  if (orientation === "horizontal") {
    const startX = parentRect.right;
    const startY = parentRect.centerY;
    const endX = childRect.left;
    const endY = childRect.centerY;
    const distance = Math.max(72, Math.abs(endX - startX));
    const controlOffset = Math.max(48, distance * 0.42);
    return `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
  }

  const startX = parentRect.centerX;
  const startY = parentRect.bottom;
  const endX = childRect.centerX;
  const endY = childRect.top;
  const distance = Math.max(60, Math.abs(endY - startY));
  const controlOffset = Math.max(36, distance * 0.45);
  return `M ${startX} ${startY} C ${startX} ${startY + controlOffset}, ${endX} ${endY - controlOffset}, ${endX} ${endY}`;
}

/** Converts measured card geometry into stage coordinates, including zero-sized cards.
 * @param {object} rect - Native element rectangle. @param {object} stageRect - Native stage rectangle.
 * @param {number} zoom - Current zoom; nonpositive/invalid values fall back to one.
 * @returns {object|null} Full card rectangle and center, or null for absent measurements.
 */
export function getThreadExplorerMeasuredStageRect(rect, stageRect, zoom) {
  if (!rect || !stageRect) { return null; }
  const box = transformThreadExplorerStageBox(rect, stageRect, { zoom });
  return { ...box, right: box.left + box.width, bottom: box.top + box.height,
    centerX: box.left + box.width / 2, centerY: box.top + box.height / 2 };
}

/** Converts measured boxes with caller-owned validation. @param {object} rect - Card box. @param {object} viewport - Stage box. @param {object} state - Zoom and pan. @returns {object} Stage box. */
function transformThreadExplorerStageBox(rect, viewport, state) {
  let zoom = Number(state?.zoom) || 1;
  if (zoom <= 0) {
    zoom = 1;
  }
  const panX = Number(state?.panX) || 0;
  const panY = Number(state?.panY) || 0;
  return { left: (rect.left - viewport.left - panX) / zoom, top: (rect.top - viewport.top - panY) / zoom,
    width: rect.width / zoom, height: rect.height / zoom };
}

/** Adds every valid tree node to cluster expansion state. @param {object|null} node - Root node. @param {Set} expandedUris - Caller-owned set. @returns {void} Expanded tree state. */
export function expandReplyClusterTree(node, expandedUris) {
  if (!node || !node.post?.uri) {
    return;
  }

  expandedUris.add(String(node.post.uri).trim());
  const replies = Array.isArray(node.replies) ? node.replies : [];
  replies.forEach((reply) => {
    expandReplyClusterTree(reply, expandedUris);
  });
}
