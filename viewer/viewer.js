const state = {
  posts: [],
  selectedUri: "",
  currentRootUri: "",
  search: "",
  onlyThreads: false,
  offset: 0,
  limit: 50,
  loading: false,
  threadItems: [],
  collapsed: new Set(),
  zoom: 100,
};

const els = {
  status: document.querySelector("#archive-status"),
  search: document.querySelector("#search-input"),
  onlyThreads: document.querySelector("#threads-only-input"),
  list: document.querySelector("#post-list"),
  loadMore: document.querySelector("#load-more-button"),
  map: document.querySelector("#thread-map"),
  mapViewport: document.querySelector("#thread-map-viewport"),
  mapTitle: document.querySelector("#map-title"),
  toRoot: document.querySelector("#to-root-button"),
  collapseAll: document.querySelector("#collapse-all-button"),
  expandAll: document.querySelector("#expand-all-button"),
  zoomOut: document.querySelector("#zoom-out-button"),
  zoomIn: document.querySelector("#zoom-in-button"),
  zoom: document.querySelector("#zoom-input"),
};

function api(path, params = {}) {
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      url.searchParams.set(key, value);
    }
  });
  return fetch(url).then(async (response) => {
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  });
}

function formatDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("de", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function authorName(post) {
  return post.authorDisplayName || (post.authorHandle ? `@${post.authorHandle}` : "Unbekannt");
}

function shortText(text, fallback = "Kein Text.") {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }
  return normalized.length > 190 ? `${normalized.slice(0, 187)}...` : normalized;
}

function assetUrl(path) {
  if (!path) {
    return "";
  }
  return `/asset?path=${encodeURIComponent(path)}`;
}

function childCount(post) {
  return Number(post.childCount || 0);
}

function threadSize(post) {
  return Number(post.threadSize || 1);
}

function textSpan(value) {
  const span = document.createElement("span");
  span.textContent = value;
  return span;
}

function renderPostList() {
  els.list.textContent = "";
  const fragment = document.createDocumentFragment();

  state.posts.forEach((post) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `post-list-item${post.uri === state.selectedUri ? " is-selected" : ""}`;
    button.dataset.uri = post.uri;

    const row = document.createElement("div");
    row.className = "post-list-title-row";
    const indicator = document.createElement("span");
    indicator.className = `thread-indicator${threadSize(post) > 1 ? "" : " is-empty"}`;
    indicator.textContent = threadSize(post) > 1 ? "+" : "";
    indicator.title = threadSize(post) > 1 ? `${threadSize(post)} Postings im Thread` : "Einzelposting";
    const title = document.createElement("strong");
    title.textContent = authorName(post);
    row.append(indicator, title);

    const meta = document.createElement("div");
    meta.className = "post-list-meta";
    meta.append(
      textSpan(formatDate(post.createdAt)),
      textSpan(threadSize(post) > 1 ? `${threadSize(post)} Posts` : "Einzelposting")
    );

    const text = document.createElement("p");
    text.className = "post-list-text";
    text.textContent = shortText(post.text);

    button.append(row, meta, text);
    button.addEventListener("click", () => selectPost(post.uri));
    fragment.append(button);
  });

  els.list.append(fragment);
}

async function loadSummary() {
  const data = await api("/api/summary");
  const stats = data.stats;
  els.status.textContent = `${stats.postCount} Postings, ${stats.threadCount} Threadgruppen`;
}

async function loadPosts({ reset = false } = {}) {
  if (state.loading) {
    return;
  }
  state.loading = true;
  els.loadMore.disabled = true;

  if (reset) {
    state.offset = 0;
    state.posts = [];
    els.list.textContent = "";
  }

  try {
    const data = await api("/api/posts", {
      q: state.search,
      onlyThreads: state.onlyThreads ? "1" : "",
      limit: state.limit,
      offset: state.offset,
    });
    state.posts = state.posts.concat(data.items);
    state.offset += data.items.length;
    renderPostList();
    els.loadMore.hidden = data.items.length < state.limit;
    if (!state.selectedUri && state.posts.length > 0) {
      await selectPost(state.posts[0].uri);
    }
  } catch (error) {
    showError(error.message);
  } finally {
    state.loading = false;
    els.loadMore.disabled = false;
  }
}

async function selectPost(uri, { keepViewport = false } = {}) {
  state.selectedUri = uri;
  renderPostList();
  try {
    const threadData = await api("/api/thread", { uri });
    state.threadItems = threadData.items;
    state.currentRootUri = threadData.rootUri || uri;
    els.mapTitle.textContent = `${threadData.items.length} Postings`;
    renderThreadMap(state.currentRootUri);
    if (!keepViewport) {
      scrollSelectedIntoView();
    }
  } catch (error) {
    showError(error.message);
  }
}

function renderPostCard(post) {
  const article = document.createElement("article");
  article.className = "post-card";

  const header = document.createElement("header");
  header.className = "post-card-header";
  const avatarPath = post.authorAvatarPath || "";
  if (avatarPath) {
    const img = document.createElement("img");
    img.className = "avatar";
    img.loading = "lazy";
    img.src = assetUrl(avatarPath);
    img.alt = authorName(post);
    header.append(img);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "avatar avatar-fallback";
    fallback.textContent = (authorName(post).trim()[0] || "?").toUpperCase();
    header.append(fallback);
  }

  const identity = document.createElement("div");
  const name = document.createElement("p");
  name.className = "author-name";
  name.textContent = authorName(post);
  const handle = document.createElement("p");
  handle.className = "author-handle";
  handle.textContent = post.authorHandle ? `@${post.authorHandle}` : post.authorDid;
  identity.append(name, handle);
  header.append(identity);

  const meta = document.createElement("div");
  meta.className = "post-card-meta";
  meta.append(textSpan(formatDate(post.createdAt)), textSpan(`${childCount(post)} Replies`));

  const text = document.createElement("div");
  text.className = "post-text";
  text.textContent = post.text || "Kein Text.";

  article.append(header, meta, renderMetrics(post), text, renderExternalCard(post), renderGallery(post), renderLinks(post));
  return article;
}

function renderMetrics(post) {
  const metrics = document.createElement("div");
  metrics.className = "metrics";
  const counts = post.counts || {};
  metrics.append(
    textSpan(`Likes ${Number(counts.likeCount || 0)}`),
    textSpan(`Replies ${Number(counts.replyCount || 0)}`),
    textSpan(`Reposts ${Number(counts.repostCount || 0)}`),
    textSpan(`Quotes ${Number(counts.quoteCount || 0)}`)
  );
  return metrics;
}

function renderGallery(post) {
  const gallery = document.createElement("div");
  gallery.className = "gallery";
  (Array.isArray(post.images) ? post.images : []).forEach((image) => {
    if (!image || !image.path) {
      return;
    }
    const figure = document.createElement("figure");
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = assetUrl(image.path);
    img.alt = image.alt || "";
    figure.append(img);
    if (image.alt) {
      const caption = document.createElement("figcaption");
      caption.textContent = `ALT: ${image.alt}`;
      figure.append(caption);
    }
    gallery.append(figure);
  });
  return gallery;
}

function renderExternalCard(post) {
  const card = post.externalCard;
  if (!card || !card.url) {
    return document.createDocumentFragment();
  }

  const link = document.createElement("a");
  link.className = "link-card";
  link.href = card.url;
  link.target = "_blank";
  link.rel = "noreferrer noopener";

  if (card.thumbPath) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = assetUrl(card.thumbPath);
    img.alt = "";
    link.append(img);
  }

  const copy = document.createElement("span");
  const title = document.createElement("strong");
  title.textContent = card.title || card.url;
  const description = document.createElement("span");
  description.textContent = card.description || "";
  const url = document.createElement("small");
  url.textContent = card.url;
  copy.append(title, description, url);
  link.append(copy);
  return link;
}

function renderLinks(post) {
  const links = document.createElement("div");
  links.className = "post-links";
  if (post.permalink) {
    const link = document.createElement("a");
    link.href = post.permalink;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = "Bluesky";
    links.append(link);
  }
  const uri = document.createElement("span");
  uri.className = "post-card-meta";
  uri.textContent = post.uri.replace(/^at:\/\//, "");
  links.append(uri);
  return links;
}

function buildTree(rootUri) {
  const byUri = new Map();
  const children = new Map();
  state.threadItems.forEach((post) => {
    byUri.set(post.uri, post);
    children.set(post.uri, []);
  });
  state.threadItems.forEach((post) => {
    const parent = post.thread?.parentUri || "";
    if (parent && children.has(parent) && post.uri !== parent) {
      children.get(parent).push(post);
    }
  });

  let root = byUri.get(rootUri);
  if (!root) {
    root = state.threadItems.find((post) => !post.thread?.parentUri) || state.threadItems[0];
  }
  return { root, children };
}

function renderThreadMap(rootUri) {
  els.map.textContent = "";
  applyZoom();
  if (!state.threadItems.length) {
    els.map.textContent = "Kein Thread geladen.";
    return;
  }
  const { root, children } = buildTree(rootUri);
  if (!root) {
    return;
  }
  const tree = document.createElement("ul");
  tree.className = "tree";
  tree.append(renderTreeNode(root, children));
  els.map.append(tree);
}

function renderTreeNode(post, children) {
  const li = document.createElement("li");
  if (state.collapsed.has(post.uri)) {
    li.classList.add("is-collapsed");
  }

  const node = document.createElement("div");
  node.className = `map-node${post.uri === state.selectedUri ? " is-selected" : ""}`;
  node.dataset.uri = post.uri;

  const ownChildren = children.get(post.uri) || [];
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = `node-toggle${ownChildren.length ? "" : " is-hidden"}`;
  toggle.textContent = state.collapsed.has(post.uri) ? "+" : "-";
  toggle.title = state.collapsed.has(post.uri) ? "Aufklappen" : "Einklappen";
  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (state.collapsed.has(post.uri)) {
      state.collapsed.delete(post.uri);
    } else {
      state.collapsed.add(post.uri);
    }
    renderThreadMap(state.currentRootUri);
  });

  const content = document.createElement("div");
  content.className = "node-content";
  content.tabIndex = 0;
  content.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      return;
    }
    selectPost(post.uri, { keepViewport: true });
  });
  content.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectPost(post.uri, { keepViewport: true });
    }
  });
  content.append(renderPostCard(post));
  node.append(toggle, content);
  li.append(node);

  if (ownChildren.length) {
    const ul = document.createElement("ul");
    ownChildren.forEach((child) => ul.append(renderTreeNode(child, children)));
    li.append(ul);
  }
  return li;
}

function showError(message) {
  els.map.textContent = "";
  const error = document.createElement("p");
  error.className = "error-text";
  error.textContent = message;
  els.map.append(error);
}

function setZoom(value) {
  state.zoom = Math.max(70, Math.min(140, value));
  els.zoom.value = String(state.zoom);
  applyZoom();
}

function applyZoom() {
  els.map.style.transform = `scale(${state.zoom / 100})`;
}

function rootPost() {
  return state.threadItems.find((post) => post.uri === state.currentRootUri) || state.threadItems[0] || null;
}

function scrollSelectedIntoView() {
  window.requestAnimationFrame(() => {
    const selected = els.map.querySelector(".map-node.is-selected");
    selected?.scrollIntoView({ block: "center", inline: "center" });
  });
}

function goToRoot() {
  const root = rootPost();
  if (!root) {
    return;
  }
  state.selectedUri = root.uri;
  renderPostList();
  state.collapsed.delete(root.uri);
  renderThreadMap(state.currentRootUri);
  window.requestAnimationFrame(() => {
    const rootNode = els.map.querySelector(`[data-uri="${CSS.escape(root.uri)}"]`);
    rootNode?.scrollIntoView({ block: "start", inline: "center" });
  });
}

let searchTimer = 0;
els.search.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    state.search = els.search.value.trim();
    loadPosts({ reset: true });
  }, 250);
});

els.onlyThreads.addEventListener("change", () => {
  state.onlyThreads = els.onlyThreads.checked;
  loadPosts({ reset: true });
});

els.loadMore.addEventListener("click", () => loadPosts());
els.toRoot.addEventListener("click", goToRoot);
els.collapseAll.addEventListener("click", () => {
  state.threadItems.forEach((post) => {
    if (childCount(post) > 0) {
      state.collapsed.add(post.uri);
    }
  });
  renderThreadMap(state.currentRootUri);
});
els.expandAll.addEventListener("click", () => {
  state.collapsed.clear();
  renderThreadMap(state.currentRootUri);
});
els.zoomOut.addEventListener("click", () => setZoom(state.zoom - 10));
els.zoomIn.addEventListener("click", () => setZoom(state.zoom + 10));
els.zoom.addEventListener("input", () => setZoom(Number(els.zoom.value || 100)));

loadSummary().catch((error) => showError(error.message));
loadPosts({ reset: true });
