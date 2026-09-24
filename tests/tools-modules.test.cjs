"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

test("account picker uses the shared dialog and returns the selected account", async () => {
  const pickerModule = await importProjectModule("js/tools/account-picker.js");
  const dialog = {
    open: false,
    showModal() {
      this.open = true;
    },
  };
  const input = {
    value: "",
    dispatchedEvents: [],
    focus() {},
    select() {},
    dispatchEvent(event) {
      this.dispatchedEvents.push(event.type);
      return true;
    },
  };
  const element = {
    textContent: "",
    dataset: {},
    replaceChildren() {},
  };
  let dialogContext = "mention";
  let clearedMentionTarget = 0;
  let resetSearchRequest = 0;
  let searchQuery = "";
  let selectedActor = null;
  let selectedValue = "";
  let closeCalls = 0;
  const picker = pickerModule.createAccountPickerController({
    dialog,
    eyebrow: element,
    title: element,
    note: element,
    status: element,
    results: element,
    input,
  }, {
    translate(key, values = {}) {
      if (key === "accountPickerDialogTitle") {
        return `Account: ${values.label}`;
      }
      return key;
    },
    getDialogContext() {
      return dialogContext;
    },
    setDialogContext(context) {
      dialogContext = context;
    },
    clearMentionTarget() {
      clearedMentionTarget += 1;
    },
    resetSearchRequest() {
      resetSearchRequest += 1;
    },
    runSearch(query) {
      searchQuery = query;
    },
    closeDialog() {
      closeCalls += 1;
    },
    autoOpenDelayMs: 100,
    minimumQueryLength: 2,
  });

  picker.open({
    label: "Account",
    initialQuery: "@alice.test",
    sourceInput: input,
    onSelect(actor, value) {
      selectedActor = actor;
      selectedValue = value;
    },
  });

  assert.equal(dialog.open, true);
  assert.equal(dialogContext, "account");
  assert.equal(input.value, "alice.test");
  assert.equal(searchQuery, "alice.test");
  assert.equal(clearedMentionTarget, 1);
  assert.equal(resetSearchRequest, 1);
  assert.equal(picker.select({ handle: "alice.test", did: "did:plc:alice" }), true);
  assert.deepEqual(selectedActor, { handle: "alice.test", did: "did:plc:alice" });
  assert.equal(selectedValue, "alice.test");
  assert.equal(closeCalls, 1);
  assert.equal(pickerModule.getAccountPickerSelectionValue({ did: "did:plc:alice" }), "did:plc:alice");
  assert.equal(pickerModule.getAccountPickerSelectionValue({}), "");
});

test("account picker binds saved-account item actions", async () => {
  const accountPicker = await importProjectModule("js/tools/account-picker.js");
  const elements = {
    accountButton: new EventTarget(),
    authActionButton: new EventTarget(),
    removeButton: new EventTarget(),
  };
  let calls = 0;
  const handler = () => { calls += 1; };
  const bound = accountPicker.bindAccountSwitcherItemEvents(elements, {
    accountClick: handler,
    authActionClick: handler,
    removeClick: handler,
  });
  assert.equal(bound, 3);
  elements.accountButton.dispatchEvent(new Event("click"));
  elements.authActionButton.dispatchEvent(new Event("click"));
  elements.removeButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 3);
});

test("DM archive helpers keep contact filtering, selection and loading contracts stable", async () => {
  const dmArchive = await importProjectModule("js/tools/dm-archive.js");
  const contacts = [
    { did: "did:plc:zoe", handle: "zoe.test", displayName: "Zoe" },
    { did: "did:plc:anna", handle: "anna.test", displayName: "Anna" },
  ];
  assert.deepEqual(dmArchive.getDmArchiveFilters(["did:plc:anna"], "2026-01-01", "2026-01-31"), {
    participantDid: "did:plc:anna",
    from: "2026-01-01",
    to: "2026-01-31",
  });
  assert.deepEqual(dmArchive.getDmVisibleContacts(contacts, "ann", "de").map((contact) => contact.did), ["did:plc:anna"]);
  assert.deepEqual(dmArchive.toggleDmSelectedParticipant([], "did:plc:anna"), ["did:plc:anna"]);
  assert.deepEqual(dmArchive.toggleDmSelectedParticipant(["did:plc:anna"], "did:plc:anna"), []);
  assert.deepEqual(dmArchive.retainDmSelectedParticipants(["did:plc:anna", "did:plc:missing"], contacts), ["did:plc:anna"]);
  assert.deepEqual(dmArchive.getDmArchiveOverview({
    manifest: { conversationCount: 2, messageCount: 5, participantCount: 3 },
  }), {
    conversationCount: 2,
    messageCount: 5,
    participantCount: 3,
  });
  assert.equal(dmArchive.getDmArchivePreviewConversations({ conversations: [{ id: "one" }, { id: "two" }] }, 1).length, 1);

  let state = { accessChecked: false };
  let renderCalls = 0;
  let lastProgress = null;
  const requests = [];
  const controller = dmArchive.createDmArchiveController({
    getState() {
      return state;
    },
    setState(nextState) {
      state = { ...state, ...nextState };
    },
    translate(key) {
      return key;
    },
    assertAccess() {},
    getAuthAccount() {
      return { did: "did:plc:self" };
    },
    getAuthAccountDid() {
      return "did:plc:self";
    },
    async sendRequest(type) {
      requests.push(type);
      return { ok: true };
    },
    setProgress(progress) {
      lastProgress = progress;
    },
    renderWorkspace() {
      renderCalls += 1;
    },
    async savePartnerCache() {},
  });
  await controller.checkAccess();
  assert.deepEqual(requests, ["CHECK_DM_ACCESS"]);
  assert.equal(state.accessChecked, true);
  assert.equal(renderCalls, 1);
  assert.equal(lastProgress.title, "dmCheckDoneTitle");

  state = {
    accessChecked: true,
    catalog: null,
    from: "2026-01-01",
    to: "2026-01-31",
    recentContacts: [],
    recentConversations: [],
    recentContactAssets: [],
    selectedParticipantDids: [],
  };
  const loadingRequests = [];
  let cacheSaves = 0;
  const loadingController = dmArchive.createDmArchiveController({
    getState() {
      return state;
    },
    setState(nextState) {
      state = { ...state, ...nextState };
    },
    translate(key) {
      return key;
    },
    assertAccess() {},
    getAuthAccount() {
      return { did: "did:plc:self" };
    },
    getAuthAccountDid() {
      return "did:plc:self";
    },
    async sendRequest(type) {
      loadingRequests.push(type);
      if (type === "LIST_DM_PARTNERS") {
        return {
          recentContacts: [{ did: "did:plc:anna", handle: "anna.test" }],
          conversations: [{ id: "conversation-one" }],
        };
      }
      if (type === "HYDRATE_DM_PARTNER_AVATARS") {
        return {
          recentContacts: [{ did: "did:plc:anna", handle: "anna.test", avatarPath: "dm-avatars/anna.png" }],
          conversations: [{ id: "conversation-one" }],
          assets: [{ path: "dm-avatars/anna.png" }],
        };
      }
      if (type === "EXPORT_DM_ARCHIVE") {
        return {
          manifest: { conversationCount: 1, messageCount: 2 },
          recentContacts: [{ did: "did:plc:anna", handle: "anna.test" }],
          conversations: [{ id: "conversation-one" }],
          assets: [{ path: "dm-avatars/anna.png" }, { path: "other/file.png" }],
        };
      }
      throw new Error(`Unexpected request: ${type}`);
    },
    setProgress() {},
    renderWorkspace() {},
    async savePartnerCache() {
      cacheSaves += 1;
    },
  });
  await loadingController.loadPartners();
  assert.deepEqual(loadingRequests, ["LIST_DM_PARTNERS", "HYDRATE_DM_PARTNER_AVATARS"]);
  assert.equal(state.recentContactAssets.length, 1);
  assert.equal(cacheSaves, 2);
  state.selectedParticipantDids = ["did:plc:anna"];
  await loadingController.loadArchive(async () => {
    throw new Error("The already checked access must not be checked again.");
  });
  assert.equal(loadingRequests.at(-1), "EXPORT_DM_ARCHIVE");
  assert.equal(state.catalog.manifest.messageCount, 2);
  assert.deepEqual(state.recentContactAssets, [{ path: "dm-avatars/anna.png" }]);
});

test("DM archive UI binds workspace controls through explicit callbacks", async () => {
  const dmArchive = await importProjectModule("js/tools/dm-archive.js");
  const controls = Array.from({ length: 9 }, () => new EventTarget());
  let calls = 0;
  const bound = dmArchive.bindDmArchiveEvents({
    contactSearchInput: controls[0],
    checkButton: controls[1],
    loadPartnersButton: controls[2],
    fromInput: controls[3],
    toInput: controls[4],
    loadButton: controls[5],
    exportJsonButton: controls[6],
    exportHtmlButton: controls[7],
    exportPdfButton: controls[8],
  }, {
    contactSearchInput: () => { calls += 1; },
    checkClick: () => { calls += 1; },
    loadPartnersClick: () => { calls += 1; },
    dateChange: () => { calls += 1; },
    loadClick: () => { calls += 1; },
    exportJsonClick: () => { calls += 1; },
    exportHtmlClick: () => { calls += 1; },
    exportPdfClick: () => { calls += 1; },
  });
  assert.equal(bound, 9);
  controls[0].dispatchEvent(new Event("input"));
  controls[1].dispatchEvent(new Event("click"));
  controls[2].dispatchEvent(new Event("click"));
  controls[3].dispatchEvent(new Event("change"));
  controls[4].dispatchEvent(new Event("change"));
  controls[5].dispatchEvent(new Event("click"));
  controls[6].dispatchEvent(new Event("click"));
  controls[7].dispatchEvent(new Event("click"));
  controls[8].dispatchEvent(new Event("click"));
  assert.equal(calls, 9);
});

test("DM archive export controller builds JSON, HTML and PDF downloads", async () => {
  const dmArchive = await importProjectModule("js/tools/dm-archive.js");
  const createdFiles = [];
  const sharedFiles = [];
  const exportController = dmArchive.createDmArchiveExportController({
    assertAccess() {},
    translate(key) {
      return key;
    },
    setProgress() {},
    createFile(parts, name, type) {
      const file = { parts, name, type };
      createdFiles.push(file);
      return file;
    },
    async shareOrDownloadFile(file, name) {
      sharedFiles.push({ file, name });
    },
    async ensureAvatarAssets() {},
    buildHtmlDocument() {
      return "<!doctype html>";
    },
    getFileBaseName() {
      return "threadline-dm-self-partner-2026-09-10";
    },
    collectMessages() {
      return [{ id: "message" }];
    },
    paginatePdfMessages() {
      return [[{ message: { id: "message" } }]];
    },
    async renderPdfPage() {
      return { width: 10, height: 10, bytes: new Uint8Array([1]), annotations: [] };
    },
    buildPdfFile() {
      return new Blob(["pdf"], { type: "application/pdf" });
    },
    getConversationTitle() {
      return "Partner";
    },
  });
  const catalog = {
    manifest: { messageCount: 1 },
    conversations: [{ id: "conversation" }],
    assets: [],
  };

  await exportController.exportJson(catalog);
  await exportController.exportHtml(catalog);
  await exportController.exportPdf(catalog);

  assert.equal(createdFiles.length, 3);
  assert.equal(createdFiles[0].type, "application/json");
  assert.equal(createdFiles[1].name, "threadline-dm-self-partner-2026-09-10.html");
  assert.equal(createdFiles[2].type, "application/pdf");
  assert.equal(sharedFiles.length, 3);
});

test("Thread Explorer helpers normalize actors, feeds, records and public links", async () => {
  const explorer = await importProjectModule("js/tools/thread-explorer.js");

  assert.equal(explorer.normalizeThreadExplorerAccountMode(" replies "), "replies");
  assert.equal(explorer.normalizeThreadExplorerAccountMode("unknown"), "posts");
  assert.equal(explorer.getThreadExplorerFeedUriFromSource("feed:at://generator"), "at://generator");
  assert.equal(explorer.getThreadExplorerSearchIdFromSource("search:abc"), "abc");
  assert.equal(explorer.normalizeThreadExplorerActorFocusMode("all"), "all");
  assert.deepEqual(explorer.createThreadExplorerActorStub("@alice.test", (value) => value.replace(/^@/, "")), {
    did: "",
    handle: "alice.test",
    displayName: "alice.test",
  });
  assert.equal(explorer.isThreadExplorerOwnActor({ handle: "Alice.test" }, "alice.test", "", (value) => value), true);
  assert.equal(explorer.isThreadExplorerOwnActor({ did: "did:plc:other" }, "", "did:plc:own", (value) => value), false);
  assert.equal(explorer.getThreadExplorerOwnActor([{ did: "did:plc:own", handle: "alice.test" }], "did:plc:own", ""), "alice.test");
  assert.equal(explorer.isThreadExplorerOwnAccountTarget("@Alice.test", "alice.test", "", (value) => value.replace(/^@/, "")), true);
  assert.equal(explorer.isThreadExplorerForeignAccountMode("other.test", "alice.test", "", (value) => value), true);
  assert.equal(explorer.isThreadExplorerForeignActorFocusMode(null, "alice.test", "", (value) => value), false);
  assert.equal(explorer.isThreadExplorerForeignActorFocusMode({ handle: "other.test" }, "alice.test", "", (value) => value), true);
  assert.equal(explorer.getThreadExplorerRequestedActor("other.test", "alice.test", "", (value) => value), "other.test");
  assert.equal(typeof explorer.renderThreadExplorerFeedPanel, "function");
  assert.equal(typeof explorer.renderThreadExplorerActorFocusPanel, "function");
  assert.equal(typeof explorer.renderThreadExplorerTreeEdges, "function");
  assert.equal(typeof explorer.createThreadExplorerFeedItemFragment, "function");
  assert.equal(typeof explorer.renderThreadExplorerPostGallery, "function");
  assert.equal(typeof explorer.applyThreadExplorerPostImagePreviewShape, "function");
  assert.equal(typeof explorer.syncThreadExplorerPostCardImageShape, "function");
  assert.equal(typeof explorer.createThreadExplorerPostImageFigure, "function");
  assert.equal(typeof explorer.renderThreadExplorerQuoteGallery, "function");
  assert.equal(typeof explorer.createThreadExplorerQuotePreviewImage, "function");
  assert.equal(typeof explorer.renderThreadExplorerQuotePostCard, "function");
  assert.equal(typeof explorer.renderThreadExplorerExternalLinkCard, "function");
  assert.equal(typeof explorer.hideThreadExplorerExternalCardImage, "function");
  const galleryChildren = [];
  const gallery = {
    dataset: {},
    hidden: false,
    replaceChildren() { galleryChildren.length = 0; },
    appendChild(child) { galleryChildren.push(child); },
  };
  explorer.renderThreadExplorerPostGallery(gallery, [{ alt: "one" }, { alt: "two" }], (image) => image);
  assert.equal(gallery.dataset.imageCount, "2");
  assert.equal(galleryChildren.length, 2);
  assert.equal(gallery.hidden, false);
  const makeClassList = () => {
    const names = new Set();
    return {
      names,
      add(...values) { values.forEach((value) => names.add(value)); },
      remove(...values) { values.forEach((value) => names.delete(value)); },
      contains(value) { return names.has(value); },
    };
  };
  const shapeFigure = { classList: makeClassList() };
  const shapeGallery = { dataset: { imageCount: "1" }, classList: makeClassList() };
  explorer.applyThreadExplorerPostImagePreviewShape({ naturalWidth: 400, naturalHeight: 800 }, shapeFigure, shapeGallery);
  assert.equal(shapeFigure.classList.contains("is-portrait"), true);
  assert.equal(shapeGallery.classList.contains("has-single-thread-image-portrait"), true);
  const shapeNode = { classList: makeClassList() };
  const shapeCard = { classList: makeClassList(), closest: () => shapeNode };
  explorer.syncThreadExplorerPostCardImageShape(shapeCard, shapeGallery);
  assert.equal(shapeCard.classList.contains("has-single-thread-image-portrait"), true);
  assert.equal(shapeNode.classList.contains("has-single-thread-image-portrait"), true);
  const figureEvents = new Map();
  const figureNodes = new Map([
    [".thread-explorer-image", { classList: makeClassList() }],
    [".thread-explorer-image-button", { addEventListener(type, handler) { figureEvents.set(type, handler); } }],
    ["img", { complete: false, addEventListener(type, handler) { figureEvents.set(`image-${type}`, handler); } }],
    ["figcaption", {}],
  ]);
  const figureImage = figureNodes.get("img");
  const figureCalls = [];
  const createdFigure = explorer.createThreadExplorerPostImageFigure({ alt: "Caption" }, 2, [{}, {}, {}], gallery, {
    cloneTemplate: () => ({ querySelector: (selector) => figureNodes.get(selector) }),
    getImageSources: () => ({ source: "full.jpg", thumb: "thumb.jpg" }),
    setImageSource: (target, source, thumb) => { target.src = source; target.thumb = thumb; },
    onLoad: (...args) => figureCalls.push(["load", ...args]),
    onError: (target) => figureCalls.push(["error", target]),
    openGallery: (...args) => figureCalls.push(["gallery", ...args]),
  });
  assert.equal(createdFigure, figureNodes.get(".thread-explorer-image"));
  assert.equal(figureImage.src, "full.jpg");
  assert.equal(figureImage.thumb, "thumb.jpg");
  assert.equal(figureNodes.get("figcaption").textContent, "Caption");
  figureEvents.get("click")();
  assert.equal(figureCalls.some((call) => call[0] === "gallery" && call[2] === 2), true);
  assert.equal(explorer.createThreadExplorerPostImageFigure({}, 0, [], gallery), null);
  explorer.renderThreadExplorerQuoteGallery(gallery, {
    images: [{}, {}],
    imagePreviewEntries: [{ source: "a" }],
  }, (entry) => entry);
  assert.equal(gallery.dataset.imageCount, "2");
  assert.equal(galleryChildren.length, 1);
  const quoteImageEvents = new Map();
  const quoteImage = {
    complete: false,
    addEventListener(type, handler, options) { quoteImageEvents.set(type, { handler, options }); },
  };
  const openedGallery = [];
  const createdQuoteImage = explorer.createThreadExplorerQuotePreviewImage(
    { source: "https://example.test/image.jpg", alt: "Test image", imageIndex: 1 },
    [{ src: "first" }, { src: "second" }],
    gallery,
    {
      createImage: () => quoteImage,
      setImageSource: (target, source) => { target.src = source; },
      openGallery: (images, index) => openedGallery.push({ images, index }),
    },
  );
  assert.equal(createdQuoteImage, quoteImage);
  assert.equal(quoteImage.src, "https://example.test/image.jpg");
  assert.equal(quoteImage.alt, "Test image");
  assert.equal(quoteImage.loading, "lazy");
  let preventedDefault = false;
  let stoppedPropagation = false;
  quoteImageEvents.get("click").handler({
    preventDefault() { preventedDefault = true; },
    stopPropagation() { stoppedPropagation = true; },
  });
  assert.equal(preventedDefault, true);
  assert.equal(stoppedPropagation, true);
  assert.equal(openedGallery[0].index, 1);
  assert.equal(explorer.createThreadExplorerQuotePreviewImage({}, [], null), null);

  const quoteNodes = new Map();
  const quoteCard = {
    hidden: false,
    setAttribute(name, value) { this[name] = value; },
    addEventListener(type, handler) { this[type] = handler; },
  };
  const quoteAvatar = {};
  const quoteAuthor = {};
  const quoteHandle = {};
  const quoteText = {};
  const quoteGallery = {};
  const quoteMeta = {};
  quoteNodes.set(".thread-explorer-quote-card", quoteCard);
  quoteNodes.set(".thread-explorer-quote-card-avatar", quoteAvatar);
  quoteNodes.set(".thread-explorer-quote-card-author", quoteAuthor);
  quoteNodes.set(".thread-explorer-quote-card-handle", quoteHandle);
  quoteNodes.set(".thread-explorer-quote-card-text", quoteText);
  quoteNodes.set(".thread-explorer-quote-card-gallery", quoteGallery);
  quoteNodes.set(".thread-explorer-quote-card-meta", quoteMeta);
  const quoteRenderCalls = [];
  explorer.renderThreadExplorerQuotePostCard({ quoteCard: { author: { handle: "alice.test" } } }, {
    querySelector(selector) { return quoteNodes.get(selector); },
  }, {
    buildDisplay: () => ({
      uri: "at://quoted-post",
      url: "https://bsky.app/profile/alice.test/post/quoted-post",
      authorLabel: "Alice",
      handleLabel: "@alice.test",
      text: "Quoted text",
      metaText: "Quoted date",
    }),
    markAvatar: (element, actor) => quoteRenderCalls.push(["mark", element, actor]),
    getAvatarUri: () => "https://example.test/avatar.jpg",
    getActorLabel: () => "Alice",
    setAvatar: (...args) => quoteRenderCalls.push(["avatar", ...args]),
    translate: () => "Open in Thread Explorer",
    renderImages: (...args) => quoteRenderCalls.push(["images", ...args]),
    renderExternalCard: (...args) => quoteRenderCalls.push(["external", ...args]),
    openPost: (uri) => quoteRenderCalls.push(["open", uri]),
  });
  assert.equal(quoteCard.hidden, false);
  assert.equal(quoteCard.href, "https://bsky.app/profile/alice.test/post/quoted-post");
  assert.equal(quoteCard.title, "Open in Thread Explorer");
  assert.equal(quoteAuthor.textContent, "Alice");
  assert.equal(quoteHandle.textContent, "@alice.test");
  assert.equal(quoteText.textContent, "Quoted text");
  assert.equal(quoteMeta.textContent, "Quoted date");
  quoteCard.click({ preventDefault() {} });
  assert.equal(quoteRenderCalls.some((call) => call[0] === "open" && call[1] === "at://quoted-post"), true);
  explorer.renderThreadExplorerQuotePostCard({ quoteCard: {} }, {
    querySelector(selector) { return quoteNodes.get(selector); },
  }, { buildDisplay: () => null });
  assert.equal(quoteCard.hidden, true);

  const classes = new Set();
  const card = {
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      toggle(name, force) {
        if (force) { classes.add(name); } else { classes.delete(name); }
      },
    },
  };
  const imageHandlers = new Map();
  const image = {
    dataset: {},
    removeEventListener(type) { imageHandlers.delete(type); },
    addEventListener(type, handler) { imageHandlers.set(type, handler); },
    removeAttribute() {},
  };
  const title = {};
  const description = {};
  const url = {};
  const fragmentNodes = new Map([
    [".card", card], [".image", image], [".title", title], [".description", description], [".url", url],
  ]);
  explorer.renderThreadExplorerExternalLinkCard({ url: "https://example.test", title: "Example", thumb: "" }, {
    querySelector(selector) { return fragmentNodes.get(selector); },
  }, {
    cardSelector: ".card", imageSelector: ".image", titleSelector: ".title", descriptionSelector: ".description", urlSelector: ".url",
    getFaviconUrl: () => "https://example.test/favicon.ico",
    setImageSource: (target, source) => { target.src = source; },
  });
  assert.equal(card.href, "https://example.test");
  assert.equal(image.src, "https://example.test/favicon.ico");
  assert.equal(classes.has("has-favicon-thumb"), true);
  const errorCardClasses = makeClassList();
  errorCardClasses.add("has-favicon-thumb");
  const failedImage = {
    hidden: false,
    removeAttribute(name) { this.removedAttribute = name; },
    closest: (selector) => selector === ".quote-link" ? { classList: errorCardClasses } : null,
  };
  let errorRefreshCount = 0;
  explorer.hideThreadExplorerExternalCardImage({ currentTarget: failedImage }, {
    cardSelector: ".quote-link",
    onError: () => { errorRefreshCount += 1; },
  });
  assert.equal(failedImage.hidden, true);
  assert.equal(failedImage.removedAttribute, "src");
  assert.equal(errorCardClasses.contains("has-no-thumb"), true);
  assert.equal(errorCardClasses.contains("has-favicon-thumb"), false);
  assert.equal(errorRefreshCount, 1);
  explorer.hideThreadExplorerExternalCardImage(null, { cardSelector: ".quote-link" });
  assert.deepEqual(
    explorer.getChronologicalThreadExplorerReplies([
      { post: { createdAt: "2026-01-02T00:00:00Z" } },
      { post: { createdAt: "2026-01-01T00:00:00Z" } },
    ]).map((item) => item.post.createdAt),
    ["2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z"],
  );
  assert.equal(
    explorer.prepareThreadExplorerRenderedNode(
      { post: { uri: "at://post", likeCount: 2 }, replies: [] },
      { getEngagementScore: () => 2, getEngagementTier: () => "quiet", getDisplayModel: () => ({}) },
    ).engagementTier,
    "quiet",
  );
  assert.equal(typeof explorer.getThreadExplorerRenderedNodeParts, "function");
  assert.equal(typeof explorer.appendThreadExplorerRenderedReplies, "function");
  assert.equal(typeof explorer.renderThreadExplorerTreePanel, "function");
  assert.equal(typeof explorer.configureThreadExplorerNodeToggle, "function");
  assert.equal(typeof explorer.applyThreadExplorerRenderedNodeState, "function");
  assert.equal(typeof explorer.renderThreadExplorerDeletedAnchor, "function");
  assert.equal(typeof explorer.renderThreadExplorerPostCardBasics, "function");
  assert.equal(typeof explorer.configureThreadExplorerActorFocusTriggers, "function");
  assert.equal(typeof explorer.bindThreadExplorerCardInteractions, "function");
  assert.equal(typeof explorer.createThreadExplorerRenderedItem, "function");
  assert.equal(typeof explorer.createThreadExplorerReplyClusterRenderNode, "function");
  assert.equal(typeof explorer.appendThreadExplorerReplyClusterNodes, "function");
  assert.equal(typeof explorer.createThreadExplorerReplyClusterWorkspace, "function");
  assert.equal(explorer.normalizeThreadExplorerSource("feed:at://did:plc:alice/app.bsky.feed.generator/feed", {
    isFeedUri: (value) => value.startsWith("at://"),
    hasSavedSearch: () => false,
  }), "feed:at://did:plc:alice/app.bsky.feed.generator/feed");
  assert.equal(explorer.normalizeThreadExplorerOrientation("horizontal", "horizontal"), "horizontal");
  assert.equal(explorer.normalizeThreadExplorerViewMode("reply-cluster", "reply-cluster"), "reply-cluster");
  const selectedSources = [];
  explorer.handleThreadExplorerFeedSelectChange({ currentTarget: { value: "feed:test" } }, {
    normalizeSource: (value) => value,
    setSource: (value) => selectedSources.push(value),
  });
  explorer.handleThreadExplorerSourceSelectChange({ currentTarget: { value: "followers" } }, {
    normalizeSource: (value) => value,
    setSource: (value) => selectedSources.push(value),
  });
  assert.deepEqual(selectedSources, ["feed:test", "followers"]);
  const scrollList = { scrollHeight: 1000, scrollTop: 700, clientHeight: 300 };
  const scrollCalls = [];
  explorer.handleThreadExplorerFeedScroll(scrollList, { hasMore: true, loading: false }, (options) => scrollCalls.push(options));
  explorer.handleThreadExplorerActorFocusScroll(scrollList, { hasMore: true, loading: false }, (options) => scrollCalls.push(options));
  assert.deepEqual(scrollCalls, [{ append: true }, { append: true }]);
  let selectedMode = "";
  const modeLoads = [];
  explorer.handleThreadExplorerActorModeChange({ currentTarget: { value: "replies" } }, {
    normalizeMode: (value) => value,
    setMode: (value) => { selectedMode = value; },
    loadFeed: (options) => modeLoads.push(options),
  });
  assert.equal(selectedMode, "replies");
  assert.deepEqual(modeLoads, [{ append: false }]);
  const zoomCalls = [];
  explorer.handleThreadExplorerZoomOutClick({
    cancelPendingZoomReset: () => zoomCalls.push("cancel"),
    getZoom: () => 1,
    setZoom: (value) => zoomCalls.push(value),
  });
  explorer.handleThreadExplorerZoomInClick({
    cancelPendingZoomReset: () => zoomCalls.push("cancel"),
    getZoom: () => 1,
    setZoom: (value) => zoomCalls.push(value),
  });
  explorer.handleThreadExplorerOrientationClick(() => zoomCalls.push("orientation"));
  assert.deepEqual(zoomCalls, ["cancel", 1 / 1.15, "cancel", 1.15, "orientation"]);
  const dialogCalls = [];
  explorer.handleThreadExplorerCountClick({ currentTarget: { dataset: { reactionType: "Likes", uri: "at://post", cid: "cid" } } }, (...args) => dialogCalls.push(args));
  explorer.handleThreadExplorerRepliesCountClick({ currentTarget: { dataset: { uri: "at://post" } } }, (...args) => dialogCalls.push(args));
  assert.deepEqual(dialogCalls, [["Likes", "at://post", "cid"], ["at://post"]]);
  const expandedUris = new Set(["at://open"]);
  const rerenders = [];
  explorer.toggleThreadExplorerReplyClusterNode("at://open", expandedUris, () => rerenders.push("render"));
  explorer.toggleThreadExplorerReplyClusterNode("at://new", expandedUris, () => rerenders.push("render"));
  assert.equal(expandedUris.has("at://open"), false);
  assert.equal(expandedUris.has("at://new"), true);
  assert.deepEqual(rerenders, ["render", "render"]);
  const wheelCalls = [];
  const wheelEvent = {
    deltaX: 2,
    deltaY: -3,
    clientX: 10,
    clientY: 20,
    altKey: false,
    shiftKey: false,
    preventDefault: () => wheelCalls.push("prevent"),
  };
  explorer.handleThreadExplorerWheel(wheelEvent, {
    scrollDelta: (...args) => wheelCalls.push(["scroll", ...args]),
    renderEdges: () => wheelCalls.push("edges"),
    zoomAtPoint: (...args) => wheelCalls.push(["zoom", ...args]),
  });
  assert.deepEqual(wheelCalls, ["prevent", ["zoom", 1.14, 10, 20]]);
  const dragState = { value: null };
  const dragCalls = [];
  const pointerEvent = {
    button: 0,
    pointerId: 4,
    clientX: 10,
    clientY: 20,
    timeStamp: 1,
    target: {},
    preventDefault: () => dragCalls.push("prevent"),
  };
  explorer.handleThreadExplorerPointerDown(pointerEvent, dragState, {
    isInteractiveTarget: () => false,
    cancelInertia: () => {},
    setPanArmed: () => {},
    getPanX: () => 0,
    getPanY: () => 0,
    capturePointer: () => dragCalls.push("capture"),
  });
  assert.equal(dragState.value.pointerId, 4);
  const velocityState = { lastSampleTime: 10, lastSampleX: 5, lastSampleY: 6, velocityX: 0, velocityY: 0 };
  explorer.updateThreadExplorerPanVelocity(velocityState, { timeStamp: 20, clientX: 25, clientY: 16 });
  assert.deepEqual(velocityState, { lastSampleTime: 20, lastSampleX: 25, lastSampleY: 16, velocityX: 2, velocityY: 1 });
  const panState = explorer.applyThreadExplorerPanDelta({ panX: 10, panY: 20 }, -3, 4);
  assert.deepEqual(panState, { panX: 7, panY: 24 });
  const inertiaState = { velocityX: 1, velocityY: 0 };
  assert.equal(explorer.advanceThreadExplorerPanInertia(inertiaState, 16.67, 0.9, 0.01), true);
  assert.equal(explorer.normalizeThreadExplorerActor("@@alice.bsky.social "), "alice.bsky.social");
  assert.equal(explorer.getThreadExplorerActorFocusId({ did: "did:plc:alice", handle: "alice.test" }), "did:plc:alice");
  assert.equal(explorer.getThreadExplorerActorFocusId({ handle: "alice.test" }), "alice.test");
  assert.equal(explorer.isThreadExplorerFeedUri("at://did:plc:alice/app.bsky.feed.generator/feed"), true);
  assert.equal(explorer.buildThreadExplorerFeedSource("at://did:plc:alice/app.bsky.feed.generator/feed"), "feed:at://did:plc:alice/app.bsky.feed.generator/feed");
  assert.equal(explorer.buildThreadExplorerFeedSource("https://example.test/feed"), "");
  assert.equal(explorer.getThreadExplorerPostRecordKey("at://did:plc:alice/app.bsky.feed.post/abc123"), "abc123");
  assert.equal(explorer.getThreadExplorerPostRecordKey("at://did:plc:alice/app.bsky.feed.like/abc123"), "");
  assert.equal(explorer.buildThreadExplorerPostWebUrl({
    author: { handle: "alice.test" },
    uri: "at://did:plc:alice/app.bsky.feed.post/abc123",
  }, "https://bsky.app/"), "https://bsky.app/profile/alice.test/post/abc123");
  assert.equal(explorer.getThreadExplorerPostImages({ images: [{ thumb: "https://example.test/a.jpg" }] }).length, 1);
  assert.deepEqual(explorer.getThreadExplorerImageSources({ fullsize: "full", thumb: "thumb" }), { source: "full", thumb: "thumb" });
  assert.deepEqual(explorer.getThreadExplorerImageSources({ thumb: "thumb" }), { source: "thumb", thumb: "thumb" });
  assert.deepEqual(explorer.normalizeThreadExplorerGalleryImage({ fullsize: "full", thumb: "thumb", alt: " Alt " }), { src: "full", thumb: "thumb", alt: "Alt" });
  assert.deepEqual(explorer.normalizeThreadExplorerGalleryImages([
    { fullsize: "full", thumb: "thumb" },
    {},
    { thumb: "second" },
  ]), [
    { src: "full", thumb: "thumb", alt: "" },
    { src: "second", thumb: "second", alt: "" },
  ]);
  assert.deepEqual(explorer.buildThreadExplorerGalleryState([
    {},
    { thumb: "first" },
    { fullsize: "second" },
  ], 99), {
    images: [
      { src: "first", thumb: "first", alt: "" },
      { src: "second", thumb: "second", alt: "" },
    ],
    index: 1,
  });
  assert.equal(explorer.buildThreadExplorerGalleryState([]), null);
  assert.deepEqual(explorer.normalizeThreadExplorerHydratedMedia({
    " full ": " data:image/png;base64,abc ",
    empty: "",
    invalid: null,
  }), [{ source: "full", dataUri: "data:image/png;base64,abc" }]);
  assert.equal(explorer.normalizeThreadExplorerGalleryImage({}), null);
  assert.equal(explorer.advanceThreadExplorerGalleryIndex(0, -1, 3), 2);
  assert.equal(explorer.advanceThreadExplorerGalleryIndex(2, 1, 3), 0);
  assert.deepEqual(explorer.getThreadExplorerGalleryFallbackDecision({ src: "full", thumb: "thumb" }), { source: "thumb", fallbackAttempted: true, shouldHide: false });
  assert.deepEqual(explorer.getThreadExplorerGalleryFallbackDecision({ src: "full", thumb: "thumb" }, true), { source: "", fallbackAttempted: true, shouldHide: true });
  assert.equal(explorer.getThreadExplorerFaviconUrl("https://example.test/path"), "https://example.test/favicon.ico");
  assert.equal(explorer.getThreadExplorerFaviconUrl("not a URL"), "");
});

test("Thread Explorer controller keeps view and cluster state together", async () => {
  const controllerModule = await importProjectModule("js/tools/thread-explorer-controller.js");
  const normalized = controllerModule.normalizeThreadExplorerControllerState({ source: "", zoom: "bad", expandedUris: ["at://open"] });
  assert.equal(normalized.source, "follows");
  assert.equal(normalized.zoom, 1);
  assert.equal(normalized.expandedUris.has("at://open"), true);
  const controller = controllerModule.createThreadExplorerController({ expandedUris: ["at://open"] });
  assert.equal(controller.isExpanded("at://open"), true);
  assert.equal(controller.toggleExpanded("at://open"), false);
  assert.equal(controller.toggleExpanded("at://new"), true);
  assert.equal(controller.setViewMode("reply-cluster"), "reply-cluster");
  assert.equal(controller.setOrientation("horizontal"), "horizontal");
});

test("Thread Explorer UI binds workspace controls through explicit handlers", async () => {
  const controller = await importProjectModule("js/tools/thread-explorer-controller.js");
  const controls = Array.from({ length: 11 }, () => new EventTarget());
  let calls = 0;
  const bound = controller.bindThreadExplorerWorkspaceEvents({
    launchButton: controls[0],
    urlButton: controls[1],
    searchesButton: controls[2],
    refreshButton: controls[3],
    sourceSelect: controls[4],
    accountInput: controls[5],
    useOwnAccountButton: controls[6],
    accountModeSelect: controls[7],
    feedSelect: controls[8],
  }, {
    launchClick: () => { calls += 1; },
    urlClick: () => { calls += 1; },
    searchesClick: () => { calls += 1; },
    refreshClick: () => { calls += 1; },
    sourceChange: () => { calls += 1; },
    accountInput: () => { calls += 1; },
    accountChange: () => { calls += 1; },
    accountKeydown: () => { calls += 1; },
    useOwnAccountClick: () => { calls += 1; },
    accountModeChange: () => { calls += 1; },
    feedChange: () => { calls += 1; },
  });
  assert.equal(bound, 11);
  controls[0].dispatchEvent(new Event("click"));
  controls[1].dispatchEvent(new Event("click"));
  controls[2].dispatchEvent(new Event("click"));
  controls[3].dispatchEvent(new Event("click"));
  controls[4].dispatchEvent(new Event("change"));
  controls[5].dispatchEvent(new Event("input"));
  controls[5].dispatchEvent(new Event("change"));
  controls[5].dispatchEvent(new Event("keydown"));
  controls[6].dispatchEvent(new Event("click"));
  controls[7].dispatchEvent(new Event("change"));
  controls[8].dispatchEvent(new Event("change"));
  assert.equal(calls, 11);
});

test("Thread Explorer UI binds dialog and gallery controls through explicit handlers", async () => {
  const controller = await importProjectModule("js/tools/thread-explorer-controller.js");
  const urlCloseTopButton = new EventTarget();
  const urlCloseButton = new EventTarget();
  const urlLoadButton = new EventTarget();
  const urlInput = new EventTarget();
  let calls = 0;
  const bound = controller.bindThreadExplorerDialogEvents({
    urlCloseTopButton,
    urlCloseButton,
    urlLoadButton,
    urlInput,
  }, {
    urlClose: () => { calls += 1; },
    urlLoad: () => { calls += 1; },
    urlKeydown: () => { calls += 1; },
  });
  assert.equal(bound, 4);
  urlCloseTopButton.dispatchEvent(new Event("click"));
  urlCloseButton.dispatchEvent(new Event("click"));
  urlLoadButton.dispatchEvent(new Event("click"));
  urlInput.dispatchEvent(new Event("keydown"));
  assert.equal(calls, 4);
});

test("Thread Explorer UI binds global viewport and keyboard events", async () => {
  const controller = await importProjectModule("js/tools/thread-explorer-controller.js");
  const windowTarget = new EventTarget();
  const viewportTarget = new EventTarget();
  let resizeCalls = 0;
  let keydownCalls = 0;
  const bound = controller.bindThreadExplorerGlobalEvents({
    window: windowTarget,
    visualViewport: viewportTarget,
  }, {
    resize: () => { resizeCalls += 1; },
    keydown: () => { keydownCalls += 1; },
  });
  assert.equal(bound, 3);
  windowTarget.dispatchEvent(new Event("resize"));
  viewportTarget.dispatchEvent(new Event("resize"));
  windowTarget.dispatchEvent(new Event("keydown"));
  assert.equal(resizeCalls, 2);
  assert.equal(keydownCalls, 1);
});

test("Thread Explorer UI binds fullscreen and snapshot controls", async () => {
  const controller = await importProjectModule("js/tools/thread-explorer-controller.js");
  const fullscreenCloseButton = new EventTarget();
  const snapshotProgressDialog = new EventTarget();
  const snapshotCancelButton = new EventTarget();
  let calls = 0;
  const bound = controller.bindThreadExplorerSnapshotEvents({
    fullscreenCloseButton,
    snapshotProgressDialog,
    snapshotCancelButton,
  }, {
    fullscreenClose: () => { calls += 1; },
    snapshotCancelEvent: () => { calls += 1; },
    snapshotCancel: () => { calls += 1; },
  });
  assert.equal(bound, 3);
  fullscreenCloseButton.dispatchEvent(new Event("click"));
  snapshotProgressDialog.dispatchEvent(new Event("cancel"));
  snapshotCancelButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 3);
});

test("Thread Explorer controller renders workspace in stable order", async () => {
  const controllerModule = await importProjectModule("js/tools/thread-explorer-controller.js");
  const calls = [];
  controllerModule.renderThreadExplorerWorkspace({
    applyFullscreen: () => calls.push("fullscreen"),
    applyOrientation: () => calls.push("orientation"),
    updateControls: () => calls.push("controls"),
    renderFeed: () => calls.push("feed"),
    renderTree: () => calls.push("tree"),
  });
  assert.deepEqual(calls, ["fullscreen", "orientation", "controls", "feed", "tree"]);
});

test("Thread Explorer controller runs feed pagination workflow", async () => {
  const controllerModule = await importProjectModule("js/tools/thread-explorer-controller.js");
  const state = { cursor: "", hasMore: true, items: [], loading: false };
  const calls = [];
  await controllerModule.loadThreadExplorerFeedWorkflow({
    authAccount: "alice",
    state,
    reset: true,
    clearSelection: false,
    isForeignAccount: () => false,
    accountMode: "posts",
    source: "follows",
    savedSearch: null,
    getRequestedActor: () => "",
    request: async () => ({ cursor: "next", items: [{ uri: "one" }] }),
    clearSelectionState: () => {},
    clearErrors: () => {},
    render: () => calls.push("render"),
    appendItems: (current, next) => current.concat(next),
    sortItems: (items) => items,
    restoreSelection: async () => {},
    setError: () => {},
    feedErrorMessage: "failed",
  });
  assert.equal(state.cursor, "next");
  assert.deepEqual(state.items, [{ uri: "one" }]);
  assert.deepEqual(calls, ["render", "render"]);
});

test("Thread Explorer controller runs Actor-Fokus workflow", async () => {
  const controllerModule = await importProjectModule("js/tools/thread-explorer-controller.js");
  const state = { items: [], cursor: "", hasMore: false, loading: false, error: "" };
  await controllerModule.loadThreadExplorerActorFocusWorkflow({
    authAccount: "alice",
    actor: {},
    actorId: "alice.test",
    mode: "posts",
    state,
    request: async () => ({ cursor: "next", items: [{ uri: "one" }] }),
    appendItems: (current, next) => current.concat(next),
    sortItems: (items) => items,
    render: () => {},
    errorMessage: "failed",
  });
  assert.equal(state.cursor, "next");
  assert.deepEqual(state.items, [{ uri: "one" }]);
});

test("Thread Explorer controller loads and selects a thread", async () => {
  const controllerModule = await importProjectModule("js/tools/thread-explorer-controller.js");
  const state = { selectedUri: "", loading: false, cardZoom: {}, tree: null, error: "" };
  const calls = [];
  await controllerModule.loadThreadExplorerThreadWorkflow("at://post", {
    state,
    persistSelection: (uri) => calls.push(["persist", uri]),
    clearMediaCache: () => calls.push("clear"),
    request: async () => ({ root: { post: { uri: "at://post" } } }),
    isClusterMode: () => false,
    resetClusterState: () => {},
    expandClusterTree: () => {},
    render: () => calls.push("render"),
    scheduleFocus: () => calls.push("focus"),
    errorMessage: "failed",
  });
  assert.equal(state.tree.post.uri, "at://post");
  assert.deepEqual(calls, [["persist", "at://post"], "clear", "render", "render", "focus"]);
});

test("Thread Explorer snapshot helpers build safe export data", async () => {
  const snapshot = await importProjectModule("js/tools/thread-explorer-snapshot.js");
  const sanitizePart = (value) => String(value).replace(/[^a-z0-9-]/gi, "-");

  assert.equal(snapshot.buildThreadExplorerSnapshotFileName({
    author: { handle: "@alice.test" },
    createdAt: "2026-09-12T10:00:00Z",
  }, "PNG", sanitizePart), "threadline-thread-alice-test-2026-09-12.png");
  assert.equal(snapshot.countThreadExplorerSnapshotMediaAssets({
    post: { images: [{}], externalCard: { thumb: "thumb" }, quoteCard: { images: [{}, {}] } },
    replies: [{ post: { externalCard: { thumb: "reply-thumb" } } }],
  }), 5);
  assert.equal(snapshot.getThreadExplorerSnapshotScale(1000, 1000, {
    devicePixelRatio: 2,
    maxDimension: 10000,
    maxPixels: 1000000,
  }), 1);
  assert.equal(snapshot.clampThreadExplorerSnapshotProgress(101), 100);
  assert.equal(snapshot.clampThreadExplorerSnapshotProgress(-1), 0);
  const pngCrcTable = snapshot.createThreadExplorerPngCrcTable();
  const pngChunk = snapshot.createThreadExplorerPngChunk("tEXt", new Uint8Array([65, 0, 66]), pngCrcTable);
  assert.equal(new TextDecoder().decode(pngChunk.slice(4, 8)), "tEXt");
  assert.equal(pngChunk.length, 15);
  assert.equal(new DataView(pngChunk.buffer).getUint32(11), snapshot.calculateThreadExplorerPngCrc("tEXt", new Uint8Array([65, 0, 66]), pngCrcTable));
  const pngHeader = snapshot.createThreadExplorerPngHeaderData(12, 34);
  assert.equal(new DataView(pngHeader.buffer).getUint32(0), 12);
  assert.equal(new DataView(pngHeader.buffer).getUint32(4), 34);
  const xmpPacket = snapshot.createThreadExplorerPngXmpPacket("Threadline <test & demo>", new Date("2026-09-18T00:00:00Z"));
  assert.match(xmpPacket, /Threadline &lt;test &amp; demo&gt;/);
  assert.equal(snapshot.escapeThreadExplorerPngXmpText("A & B"), "A &amp; B");
  const pngMetadataChunks = snapshot.createThreadExplorerPngMetadataChunks(pngCrcTable, "Threadline Test", new Date("2026-09-18T00:00:00Z"));
  assert.equal(pngMetadataChunks.length, 4);
  assert.equal(new TextDecoder().decode(pngMetadataChunks[0].slice(4, 8)), "tEXt");
  assert.equal(new TextDecoder().decode(pngMetadataChunks[3].slice(4, 8)), "iTXt");
  const measuredContext = { measureText: (value) => ({ width: value.length }) };
  assert.deepEqual(snapshot.wrapThreadExplorerSnapshotText(measuredContext, "one two three", 3, 2), ["one", "two..."]);
  assert.deepEqual(snapshot.wrapThreadExplorerSnapshotText(measuredContext, "  ", 10), []);
  const drawnText = [];
  assert.equal(snapshot.drawThreadExplorerSnapshotTextBlock({ fillText: (...args) => drawnText.push(args) }, ["a", "b"], 4, 10, 6), 22);
  assert.deepEqual(drawnText, [["a", 4, 10], ["b", 4, 16]]);
  const pathCalls = [];
  const canvasContext = {
    beginPath() { pathCalls.push("begin"); },
    moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() { pathCalls.push("close"); },
    save() {}, restore() {}, stroke() {},
  };
  snapshot.drawThreadExplorerSnapshotRoundRect(canvasContext, 0, 0, 20, 10, 4);
  snapshot.strokeThreadExplorerSnapshotRoundRect(canvasContext, 0, 0, 20, 10, 4, "black", 2);
  assert.deepEqual(pathCalls, ["begin", "close", "begin", "close"]);
  const countCard = { querySelector: () => ({ children: [{ textContent: " 1 Like " }, { textContent: " 2 Replies " }] }) };
  assert.equal(snapshot.getThreadExplorerSnapshotCountsText(countCard), "1 Like   2 Replies");

  const edgeCalls = [];
  const edgeContext = {
    save() {},
    restore() {},
    stroke(path) { edgeCalls.push(path.data); },
  };
  class FakePath2D {
    constructor(data) { this.data = data; }
  }
  snapshot.drawThreadExplorerSnapshotEdges(edgeContext, [
    { getAttribute: () => "M0 0 L1 1" },
    { getAttribute: () => "" },
  ], () => ({ stroke: "#123456", strokeWidth: "3" }), FakePath2D);
  assert.deepEqual(edgeCalls, ["M0 0 L1 1"]);
  const snapshotSteps = [];
  const snapshotBlob = new Blob(["canvas fallback"]);
  const renderResult = await snapshot.renderThreadExplorerSnapshot({
    root: { post: {} },
    text: (key) => key,
    hydrateAvatars: async () => snapshotSteps.push("avatars"),
    hydrateMedia: async () => snapshotSteps.push("media"),
    restoreAvatarCache: async () => snapshotSteps.push("avatar-cache"),
    renderTree: async () => snapshotSteps.push("tree"),
    cacheRenderedMedia: () => 2,
    applyMediaDataUris: async () => ({ embedded: 2, missing: 0, total: 2 }),
    waitForFrame: async () => snapshotSteps.push("frame"),
    getStage: () => ({ scrollWidth: 100, offsetWidth: 100, scrollHeight: 200, offsetHeight: 200, getBoundingClientRect: () => ({ width: 100, height: 200 }) }),
    shouldUseTiled: () => false,
    renderTiled: async () => assert.fail("unexpected tiled render"),
    renderForeignObject: async () => { throw new Error("foreignObject unavailable"); },
    renderCanvas: async () => snapshotBlob,
    onFallback: (renderer) => snapshotSteps.push(`fallback:${renderer}`),
  });
  assert.equal(renderResult, snapshotBlob);
  assert.deepEqual(snapshotSteps, ["avatars", "media", "avatar-cache", "tree", "frame", "fallback:foreignObject"]);
  const tileCalls = [];
  const tileContext = {
    fillRect() { tileCalls.push("fill"); },
    save() {},
    translate(x, y) { tileCalls.push(`translate:${x}:${y}`); },
    restore() {},
  };
  const renderedTile = snapshot.renderThreadExplorerSnapshotTile({
    x: 4,
    y: 6,
    width: 8,
    height: 10,
    cards: ["card"],
    createCanvas: () => ({ getContext: () => tileContext }),
    backgroundColor: "white",
    drawEdges: () => tileCalls.push("edges"),
    drawCard: (...args) => tileCalls.push(`card:${args[1]}`),
  });
  assert.ok(renderedTile);
  assert.deepEqual(tileCalls, ["fill", "translate:-4:-6", "edges", "card:card"]);

  const canvasSteps = [];
  const fallbackBlob = await snapshot.renderThreadExplorerCanvasSnapshot({
    stage: {
      getBoundingClientRect: () => ({ width: 30, height: 40 }),
      querySelectorAll: () => ["first", "second"],
    },
    width: 30,
    height: 40,
    mimeType: "image/png",
    text: (key) => key,
    createCanvas: () => ({ canvas: {}, context: {} }),
    drawEdges: () => canvasSteps.push("edges"),
    preloadAvatars: async () => new Map(),
    preloadMedia: async () => new Map(),
    drawCard: (_context, card) => canvasSteps.push(card),
    encodeCanvas: async () => snapshotBlob,
  });
  assert.equal(fallbackBlob, snapshotBlob);
  assert.deepEqual(canvasSteps, ["edges", "first", "second"]);
  const mediaSteps = [];
  snapshot.drawThreadExplorerSnapshotMediaImages({}, {
    querySelectorAll: () => [{ alt: "view", src: "media" }],
  }, {}, new Map(), 100, {
    isMediaImage: () => true,
    getStageRect: () => ({ left: 1, top: 2, width: 30, height: 20, bottom: 22 }),
    getDrawableImage: () => null,
    drawCoverImage: () => false,
    drawPlaceholder: () => mediaSteps.push("placeholder"),
    strokeRoundedRect: () => mediaSteps.push("stroke"),
    drawAltText: (_context, alt) => mediaSteps.push(`alt:${alt}`),
  });
  assert.deepEqual(mediaSteps, ["placeholder", "stroke", "alt:view"]);
  assert.equal(snapshot.getThreadExplorerSnapshotBackgroundColor({
    stage: { id: "stage" },
    tree: { id: "tree" },
    body: { id: "body" },
  }, (element) => {
    if (element.id === "stage") {
      return { backgroundColor: "rgba(0, 0, 0, 0)" };
    }
    if (element.id === "tree") {
      return { backgroundColor: "rgb(1, 2, 3)" };
    }
    return { backgroundColor: "white" };
  }), "rgb(1, 2, 3)");

  const tiledBlob = await snapshot.renderThreadExplorerTiledPngSnapshot({
    width: 1,
    height: 1,
    tileSize: 1,
    text: (key) => key,
    stage: { getBoundingClientRect: () => ({}), querySelectorAll: () => [] },
    preloadAvatars: async () => new Map(),
    preloadMedia: async () => new Map(),
    renderTile: () => ({ getContext: () => ({ getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 0]) }) }) }),
    crcTableFactory: () => new Uint32Array(),
    chunkFactory: () => new Uint8Array(),
    headerFactory: () => new Uint8Array(),
    metadataFactory: () => [],
    requestFrame: (callback) => callback(),
  });
  assert.equal(tiledBlob.type, "image/png");
  const minimalPng = new Uint8Array(34);
  minimalPng.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const pngWithMetadata = await snapshot.addThreadExplorerPngMetadata(new Blob([minimalPng]), {
    applicationLabel: "Threadline Test",
    metadataDate: new Date("2026-09-18T00:00:00Z"),
  });
  assert.equal(pngWithMetadata.type, "image/png");
  assert.equal(pngWithMetadata.size > minimalPng.length, true);
  const invalidPng = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
  assert.equal(await snapshot.addThreadExplorerPngMetadata(invalidPng), invalidPng);
  const avatarImage = { dataset: { avatarDid: " did:alice ", avatarUrl: " https://example.test/a.jpg " } };
  const avatarAsset = { did: "did:alice", url: "https://example.test/a.jpg", data: "avatar-data" };
  assert.equal(snapshot.getThreadExplorerSnapshotAvatarCacheKey(avatarImage), "did:alice|https://example.test/a.jpg");
  assert.equal(snapshot.getThreadExplorerSnapshotCachedAvatarUri(avatarImage, [avatarAsset], (asset) => `data:${asset.data}`), "data:avatar-data");
  const mediaImage = {
    hidden: false,
    classList: { contains: (name) => name === "thread-explorer-avatar" },
    closest: () => ({}) ,
    dataset: { snapshotSource: "full", snapshotThumb: "thumb" },
    currentSrc: "thumb",
    src: "blob:rendered",
  };
  assert.equal(snapshot.isThreadExplorerSnapshotMediaImage(mediaImage), false);
  mediaImage.classList.contains = () => false;
  assert.equal(snapshot.isThreadExplorerSnapshotMediaImage(mediaImage), true);
  assert.deepEqual(snapshot.getThreadExplorerSnapshotMediaImageKeys(mediaImage), ["full", "thumb", "blob:rendered"]);
  assert.equal(snapshot.getThreadExplorerSnapshotMediaImageKey(mediaImage), "full");
  const drawable = {};
  assert.equal(snapshot.getThreadExplorerSnapshotDrawableMediaImage(mediaImage, new Map([["thumb", drawable]])), drawable);
  const imageCache = new Map([["thumb", "data:cached"]]);
  assert.equal(snapshot.getThreadExplorerSnapshotMediaDataUri(["full", "thumb"], [new Map(), imageCache]), "data:cached");
  const targetImage = { dataset: {}, removeAttribute(name) { this.removed = name; } };
  snapshot.setThreadExplorerSnapshotCachedImageSource(targetImage, "full", "thumb", () => "data:cached");
  assert.equal(targetImage.dataset.snapshotSource, "full");
  assert.equal(targetImage.dataset.snapshotThumb, "thumb");
  assert.equal(targetImage.dataset.snapshotHydrated, "true");
  assert.equal(targetImage.src, "data:cached");
  snapshot.setThreadExplorerSnapshotCachedImageSource(targetImage, "", "", () => "");
  assert.equal(targetImage.removed, "src");
  const avatarLoads = [];
  const avatarCardA = { avatar: { key: "alice" } };
  const avatarCardB = { avatar: { key: "alice" } };
  const loadedAvatar = {};
  const preloadedAvatars = await snapshot.preloadThreadExplorerSnapshotAvatarImages([avatarCardA, avatarCardB], {
    getAvatar: (card) => card.avatar,
    getCacheKey: (avatar) => avatar.key,
    getCachedAvatarUri: () => "data:avatar",
    loadImage: async (source) => { avatarLoads.push(source); return loadedAvatar; },
  });
  assert.equal(avatarLoads.length, 1);
  assert.equal(preloadedAvatars.get("alice"), loadedAvatar);
  const mediaLoads = [];
  const firstMedia = { currentSrc: "https://example.test/full.jpg", src: "https://example.test/full.jpg" };
  const duplicateMedia = { currentSrc: "https://example.test/full.jpg", src: "https://example.test/full.jpg" };
  const mediaCard = { querySelectorAll: () => [firstMedia, duplicateMedia] };
  const loadedMedia = {};
  const preloadedMedia = await snapshot.preloadThreadExplorerSnapshotMediaImages([mediaCard], {
    getImages: (card) => card.querySelectorAll("img"),
    isMediaImage: () => true,
    getImageKeys: () => ["https://example.test/full.jpg", "https://example.test/thumb.jpg"],
    getCachedDataUri: () => "",
    encodeImage: () => "",
    canDrawImage: () => true,
    loadImage: async (source) => { mediaLoads.push(source); return loadedMedia; },
  });
  assert.equal(mediaLoads.length, 1);
  assert.equal(mediaLoads[0], "https://example.test/full.jpg");
  assert.equal(preloadedMedia.get("https://example.test/full.jpg"), loadedMedia);
  assert.equal(preloadedMedia.get("https://example.test/thumb.jpg"), loadedMedia);
  const snapshotMediaCache = new Map();
  const cachedRenderedImage = {
    complete: true,
    naturalWidth: 640,
    naturalHeight: 480,
    src: "https://example.test/rendered.jpg",
    dataset: {},
  };
  assert.equal(snapshot.cacheThreadExplorerSnapshotMediaImage(cachedRenderedImage, {
    isMediaImage: () => true,
    getImageKeys: () => ["full", "thumb"],
    encodeImage: () => "data:rendered-image",
    cache: snapshotMediaCache,
  }), true);
  assert.equal(snapshotMediaCache.get("full"), "data:rendered-image");
  assert.equal(snapshotMediaCache.get("thumb"), "data:rendered-image");
  const visibleImage = { src: "https://example.test/visible.jpg", dataset: {} };
  const visibleApplied = snapshot.applyThreadExplorerSnapshotMediaCache([visibleImage], {
    isMediaImage: () => true,
    getImageKeys: () => ["visible"],
    getCachedDataUri: () => "data:visible",
  });
  assert.equal(visibleApplied, 1);
  assert.equal(visibleImage.src, "data:visible");
  assert.equal(visibleImage.dataset.snapshotHydrated, "true");
  const loadedStage = { querySelectorAll: () => [cachedRenderedImage, { hidden: true }] };
  assert.equal(snapshot.cacheLoadedThreadExplorerSnapshotMediaImages(loadedStage, {
    isMediaImage: (image) => image === cachedRenderedImage,
    cacheImage: () => {},
  }), 1);
  const sourceCloneImage = { index: 0 };
  const sourceStage = { querySelectorAll: () => [sourceCloneImage] };
  const clonedImage = {
    attributes: {},
    classList: { added: [], add(value) { this.added.push(value); } },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
  const clonedStage = { querySelectorAll: () => [clonedImage] };
  snapshot.inlineThreadExplorerSnapshotImages(sourceStage, clonedStage, {
    getCachedAvatarUri: () => "",
    getHydratedMediaUri: () => "",
    encodeImage: () => "",
    fallbackAvatarUri: "data:fallback-avatar",
  });
  assert.equal(clonedImage.attributes.src, "data:fallback-avatar");
  assert.deepEqual(clonedImage.classList.added, ["is-snapshot-fallback-image"]);
  const hydratedImage = { media: true, src: "remote", dataset: { snapshotSource: "remote" } };
  const missingImage = { media: true, src: "remote-missing", dataset: {} };
  const progressUpdates = [];
  const storedHydratedUris = [];
  const hydrationCounts = await snapshot.applyThreadExplorerSnapshotMediaDataUris([hydratedImage, missingImage], {
    isMediaImage: (image) => image.media,
    getHydratedMediaUri: (image) => image === hydratedImage ? "data:hydrated" : "",
    getImageKeys: (image) => [image.dataset.snapshotSource || image.src],
    storeDataUri: (keys, uri) => storedHydratedUris.push([keys, uri]),
    throwIfAborted: () => {},
    buildProgress: ({ index, total, embedded, skipped }) => ({ index, total, embedded, skipped }),
    onProgress: async (progress) => progressUpdates.push(progress),
  });
  assert.deepEqual(hydrationCounts, { total: 2, embedded: 1, missing: 1 });
  assert.equal(hydratedImage.src, "data:hydrated");
  assert.equal(hydratedImage.dataset.snapshotHydrated, "true");
  assert.deepEqual(storedHydratedUris, [[ ["remote"], "data:hydrated" ]]);
  assert.deepEqual(progressUpdates, [
    { index: 0, total: 2, embedded: 1, skipped: 0 },
    { index: 1, total: 2, embedded: 1, skipped: 1 },
  ]);
  await assert.rejects(snapshot.applyThreadExplorerSnapshotMediaDataUris([hydratedImage], {
    isMediaImage: () => true,
    throwIfAborted: () => { throw Object.assign(new Error("Cancelled"), { name: "AbortError" }); },
  }), { name: "AbortError" });
  const controller = new AbortController();
  controller.abort();
  assert.throws(() => snapshot.throwIfThreadExplorerSnapshotAborted(controller.signal), { name: "AbortError" });
});

test("network helpers calculate visible relations and capped scores", async () => {
  const network = await importProjectModule("js/tools/network.js");

  assert.equal(network.getNetworkRelationType({ followingViewer: true, followedByViewer: true }), "mutual");
  assert.equal(network.getNetworkRelationType({ followedByViewer: true }), "followers");
  assert.equal(network.getNetworkRelationType({ followingViewer: true }), "following");
  assert.equal(network.getNetworkRelationType({}), "other");
  assert.deepEqual(network.getNetworkScoreBreakdown({
    followingViewer: true,
    followedByViewer: true,
    followersCount: 1000,
    postsCount: 400,
  }), {
    relationScore: 120,
    followersScore: 80,
    postsScore: 40,
    total: 240,
  });
  assert.equal(network.getNetworkNodeScore({ followersCount: 5, postsCount: 10 }), 37);
});

test("network UI binds viewport controls and calculates stage center", async () => {
  const networkUi = await importProjectModule("js/tools/network-ui.js");
  const listeners = {};
  const stage = {
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 100 }),
  };
  const button = (name) => ({ addEventListener: (type, handler) => { listeners[name] = handler; } });
  const calls = [];
  networkUi.bindNetworkViewportControls({ stage, zoomIn: button("in") }, {
    zoomAtPoint: (...args) => calls.push(args),
  });
  listeners.in();
  assert.deepEqual(calls, [[1.24, 110, 70]]);
});

test("network UI binds workspace filters and loading actions", async () => {
  const networkUi = await importProjectModule("js/tools/network-ui.js");
  const listeners = {};
  const target = (name) => ({
    value: "",
    dataset: { networkFilter: name },
    addEventListener: (type, handler) => { listeners[`${name}:${type}`] = handler; },
  });
  let calls = 0;
  const bound = networkUi.bindNetworkWorkspaceEvents({
    filterButtons: [target("followers")],
    searchInput: target("search"),
    loadButton: target("load"),
  }, {
    filterClick: () => { calls += 1; },
    searchInput: () => { calls += 1; },
    load: () => { calls += 1; },
  });
  assert.equal(bound, 3);
  listeners["followers:click"]({ currentTarget: target("followers") });
  listeners["search:input"]();
  listeners["load:click"]();
  assert.equal(calls, 3);
});

test("network UI binds stage mode controls through explicit callbacks", async () => {
  const networkUi = await importProjectModule("js/tools/network-ui.js");
  const enterButton = new EventTarget();
  const exitButton = new EventTarget();
  const focusButton = new EventTarget();
  const listsButton = new EventTarget();
  let calls = 0;
  const bound = networkUi.bindNetworkStageModeEvents({
    enterButton,
    exitButton,
    focusButton,
    listsButton,
  }, {
    enterClick: () => { calls += 1; },
    exitClick: () => { calls += 1; },
    focusClick: () => { calls += 1; },
    listsClick: () => { calls += 1; },
  });
  assert.equal(bound, 4);
  enterButton.dispatchEvent(new Event("click"));
  exitButton.dispatchEvent(new Event("click"));
  focusButton.dispatchEvent(new Event("click"));
  listsButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 4);
});

test("network UI binds insight groups and focus controls", async () => {
  const networkUi = await importProjectModule("js/tools/network-ui.js");
  const groupButton = new EventTarget();
  const focusToggleButton = new EventTarget();
  let calls = 0;
  const bound = networkUi.bindNetworkInsightEvents({
    groupButtons: [groupButton],
    focusToggleButton,
  }, {
    groupClick: () => { calls += 1; },
    focusToggleClick: () => { calls += 1; },
  });
  assert.equal(bound, 2);
  groupButton.dispatchEvent(new Event("click"));
  focusToggleButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 2);
});

test("network UI binds stage pointer interactions", async () => {
  const networkUi = await importProjectModule("js/tools/network-ui.js");
  const stage = new EventTarget();
  let calls = 0;
  const bound = networkUi.bindNetworkStageInteractionEvents({ stage }, {
    wheel: () => { calls += 1; },
    pointerDown: () => { calls += 1; },
    pointerMove: () => { calls += 1; },
    pointerUp: () => { calls += 1; },
  });
  assert.equal(bound, 6);
  stage.dispatchEvent(new Event("wheel"));
  stage.dispatchEvent(new Event("pointerdown"));
  stage.dispatchEvent(new Event("pointermove"));
  stage.dispatchEvent(new Event("pointerup"));
  stage.dispatchEvent(new Event("pointercancel"));
  stage.dispatchEvent(new Event("pointerleave"));
  assert.equal(calls, 6);
});

test("network UI binds lifecycle and results scroll events", async () => {
  const networkUi = await importProjectModule("js/tools/network-ui.js");
  const documentTarget = new EventTarget();
  const results = new EventTarget();
  let calls = 0;
  const bound = networkUi.bindNetworkLifecycleEvents({ document: documentTarget, results }, {
    fullscreenChange: () => { calls += 1; },
    keydown: () => { calls += 1; },
    resultsScroll: () => { calls += 1; },
  });
  assert.equal(bound, 3);
  documentTarget.dispatchEvent(new Event("fullscreenchange"));
  documentTarget.dispatchEvent(new Event("keydown"));
  results.dispatchEvent(new Event("scroll"));
  assert.equal(calls, 3);
});

test("Thread Explorer layout helpers calculate card geometry", async () => {
  const layout = await importProjectModule("js/tools/thread-explorer-layout.js");
  const expandedUris = new Set();
  assert.equal(layout.ensureThreadExplorerReplyClusterRootExpanded("at://root", expandedUris), true);
  assert.equal(expandedUris.has("at://root"), true);
  assert.equal(layout.ensureThreadExplorerReplyClusterRootExpanded("", expandedUris), false);
  assert.deepEqual(layout.getThreadExplorerReplyClusterEdgeAnchor({ x: 0, y: 0 }, { width: 100, height: 60 }, { x: 200, y: 0 }), { x: 50, y: 0 });
  assert.deepEqual(layout.getThreadExplorerReplyClusterNodeRect({ position: { x: 100, y: 80 } }, { width: 40, height: 20 }), {
    left: 80, top: 70, right: 120, bottom: 90, width: 40, height: 20,
  });
  const item = { offsetWidth: 120, offsetHeight: 80, style: { values: {}, setProperty(name, value) { this.values[name] = value; } } };
  assert.deepEqual(layout.getThreadExplorerReplyClusterItemSize(item), { width: 120, height: 80 });
  layout.setThreadExplorerReplyClusterItemPosition(item, 12.4, 18.6);
  assert.equal(item.style.values["--thread-explorer-cluster-x"], "12px");
  assert.equal(layout.getThreadExplorerReplyClusterChildrenBreadth([{ subtreeWidth: 100 }, { subtreeWidth: 120 }], 20), 240);
  assert.equal(layout.getThreadExplorerReplyClusterRootChildAngles([{ subtreeWidth: 100 }], 300).length, 1);
  assert.equal(layout.getThreadExplorerReplyClusterRootChildAngles([{ subtreeWidth: 100 }, { subtreeWidth: 100 }], 300).length, 2);
  const measuredRoot = { item: {}, children: [{ item: {}, children: [] }] };
  const measured = layout.measureThreadExplorerReplyClusterSubtree(measuredRoot, () => ({ width: 100, height: 60 }));
  assert.deepEqual(measured, { width: 220, height: 264 });
  const positioned = [];
  layout.placeThreadExplorerReplyClusterSubtree(measuredRoot, 100, 100, 0, positioned, () => {});
  assert.equal(positioned.length, 2);
  const starRoot = { item: {}, children: [{ item: {}, children: [] }] };
  const starState = { rootRenderNode: starRoot, positionedItems: [] };
  let boundsApplied = false;
  layout.layoutThreadExplorerReplyCluster(starState, {
    getItemSize: () => ({ width: 100, height: 60 }),
    setItemPosition: () => {},
    setNodePosition: (node, x, y) => { node.position = { x, y }; },
    applyBounds: () => { boundsApplied = true; },
  });
  assert.equal(starState.positionedItems.length, 2);
  assert.equal(starRoot.position.x, 720);
  assert.equal(starRoot.position.y, 540);
  assert.equal(boundsApplied, true);
  const edgeLayer = { children: [], replaceChildren() { this.children = []; }, appendChild(node) { this.children.push(node); } };
  const svgNode = (tag, attrs) => ({ tag, attrs });
  layout.renderThreadExplorerReplyClusterEdges({
    edgeLayer,
    positionedItems: [{
      item: {},
      position: { x: 100, y: 100 },
      children: [{ item: {}, position: { x: 300, y: 100 }, children: [] }],
    }],
  }, { getItemSize: () => ({ width: 80, height: 40 }), createSvgNode: svgNode });
  assert.equal(edgeLayer.children.length, 1);
  const layoutState = {
    cluster: { style: {} },
    edgeLayer: { setAttribute(name, value) { this[name] = value; } },
    positionedItems: [{ item: {}, position: { x: 20, y: 20 } }],
  };
  let didRenderEdges = false;
  layout.applyThreadExplorerReplyClusterBounds(layoutState, {
    getItemSize: () => ({ width: 100, height: 60 }),
    setItemPosition: () => {},
    renderEdges: () => { didRenderEdges = true; },
  });
  assert.equal(layoutState.cluster.style.width, "1120px");
  assert.equal(layoutState.positionedItems[0].position.x, 130);
  assert.equal(didRenderEdges, true);
});

test("Thread Explorer card hydration delegates rendering and finalization", async () => {
  const hydration = await importProjectModule("js/tools/thread-explorer-hydration.js");
  const card = { dataset: {}, calls: [] };
  const post = { uri: "at://post" };
  const options = {
    getDisplayModel: () => ({ ready: true }),
    renderAvatar: () => card.calls.push("avatar"),
    renderMedia: () => card.calls.push("media"),
    renderEmbeds: () => card.calls.push("embeds"),
    finalize: () => card.calls.push("finalize"),
  };
  assert.equal(hydration.hydrateThreadExplorerCard(card, post, options), true);
  assert.deepEqual(card.calls, ["avatar", "media", "embeds", "finalize"]);
  assert.equal(hydration.hydrateThreadExplorerCard(card, post, options), false);

  const calls = [];
  const avatar = {};
  const gallery = {};
  const renderCard = {
    querySelector(selector) {
      if (selector === ".thread-explorer-avatar") {
        return avatar;
      }
      if (selector === ".thread-explorer-post-gallery") {
        return gallery;
      }
      return null;
    },
  };
  const author = { handle: "alice.test" };
  hydration.renderThreadExplorerCardAvatar(renderCard, { author }, {
    markAvatar: (image, actor) => calls.push(["mark-avatar", image, actor]),
    getAvatarUri: (actor) => `avatar:${actor.handle}`,
    getActorLabel: (actor) => actor.handle,
    setAvatar: (...args) => calls.push(["set-avatar", ...args]),
  });
  hydration.renderThreadExplorerCardMedia(renderCard, post, {
    renderImages: (...args) => calls.push(["images", ...args]),
    syncShape: (...args) => calls.push(["shape", ...args]),
  });
  hydration.renderThreadExplorerCardEmbeds(renderCard, post, { externalCardDisplay: { url: "https://example.test" } }, {
    renderExternalCard: (...args) => calls.push(["external", ...args]),
    renderQuoteCard: (...args) => calls.push(["quote", ...args]),
  });
  assert.equal(calls[0][0], "mark-avatar");
  assert.deepEqual(calls[1], ["set-avatar", avatar, "avatar:alice.test", "alice.test"]);
  assert.deepEqual(calls[2], ["images", post, gallery]);
  assert.deepEqual(calls[3], ["shape", renderCard, gallery]);
  assert.deepEqual(calls[4], ["external", post, { url: "https://example.test" }, renderCard]);
  assert.deepEqual(calls[5], ["quote", post, renderCard]);

  assert.equal(hydration.getThreadExplorerActorAvatarUri({ avatarDataUri: " data:cached ", avatar: "remote" }), "data:cached");
  assert.equal(hydration.getThreadExplorerActorAvatarUri({ avatar: " remote " }), "remote");
  const avatarAssets = [{ did: "did:alice", url: "https://example.test/alice.jpg", blob: "alice-blob" }];
  const cachedActor = { did: "did:alice", avatar: "https://example.test/alice.jpg" };
  assert.equal(hydration.findThreadExplorerActorAvatarAsset(cachedActor, avatarAssets), avatarAssets[0]);
  assert.equal(hydration.findThreadExplorerActorAvatarAsset({ did: "did:missing", avatar: "url" }, avatarAssets), null);
  assert.equal(hydration.applyThreadExplorerActorAvatarFromCache(cachedActor, avatarAssets, (asset) => `data:${asset.blob}`), true);
  assert.equal(cachedActor.avatarDataUri, "data:alice-blob");
  const avatarImage = { dataset: {} };
  hydration.markThreadExplorerAvatarImage(avatarImage, cachedActor);
  assert.deepEqual(avatarImage.dataset, { avatarDid: "did:alice", avatarUrl: "https://example.test/alice.jpg" });
  const nestedTree = {
    post: {
      author: { did: "did:alice" },
      quoteCard: { author: { did: "did:bob" } },
    },
    replies: [{ post: { author: { did: "did:carol" } }, replies: [] }],
  };
  hydration.applyThreadExplorerAvatarHydration(nestedTree, {
    "did:alice": { dataUri: "data:alice" },
    "did:bob": { dataUri: "data:bob" },
    "did:carol": { dataUri: "data:carol" },
  });
  assert.equal(nestedTree.post.author.avatarDataUri, "data:alice");
  assert.equal(nestedTree.post.quoteCard.author.avatarDataUri, "data:bob");
  assert.equal(nestedTree.replies[0].post.author.avatarDataUri, "data:carol");
  const localCacheTree = { post: { author: { did: "did:alice", avatar: "https://example.test/alice.jpg" } }, replies: [] };
  hydration.applyThreadExplorerAvatarCacheToTree(localCacheTree, avatarAssets, (asset) => `data:${asset.blob}`);
  assert.equal(localCacheTree.post.author.avatarDataUri, "data:alice-blob");
});

test("Thread Explorer media hydration delegates transport and media results", async () => {
  const mediaHydration = await importProjectModule("js/tools/thread-explorer-media-hydration.js");
  const calls = [];
  const result = await mediaHydration.hydrateThreadExplorerMedia({ post: { uri: "at://root" } }, {
    request: async (root, options) => {
      calls.push([root.post.uri, options.timeoutMs]);
      options.onProgress({ phase: "thread_explorer_media", current: 1 });
      return { media: { image: "data:image/png;base64,abc" } };
    },
    onProgress: (progress) => calls.push(progress.phase),
    onMedia: (media) => calls.push(Object.keys(media).length),
  });
  assert.equal(result.media.image, "data:image/png;base64,abc");
  assert.deepEqual(calls, [["at://root", 420000], "thread_explorer_media", 1]);
});

test("Thread Explorer rendering helpers delegate shared presentation", async () => {
  const rendering = await importProjectModule("js/tools/thread-explorer-rendering.js");
  const post = { text: "hello" };
  assert.equal(rendering.getThreadExplorerActorLabel({}, "unknown", (actor, fallback) => fallback), "unknown");
  assert.equal(rendering.getThreadExplorerPreviewText(post, "empty", 20, () => "preview"), "preview");
  assert.equal(rendering.formatThreadExplorerDate("date", "de", (value, locale) => `${locale}:${value}`), "de:date");
  assert.equal(rendering.countThreadExplorerPosts({ post: {}, replies: [{ post: {} }, { post: { isDeletedThreadAnchor: true } }] }), 2);
  const list = { replaceChildren() {}, appendChild() {} };
  const status = { textContent: "" };
  rendering.renderThreadExplorerReactionActors([], {
    list,
    status,
    template: {},
    translate: (key) => key,
    formatCount: (count) => String(count),
    cloneTemplate: () => ({ querySelector: () => ({}) }),
    setAvatar: () => {},
  });
  assert.equal(status.textContent, "threadExplorerReactionsEmpty");
});

test("analysis and archive helpers produce clean identifiers and filenames", async () => {
  const analysis = await importProjectModule("js/tools/analysis.js");
  const archive = await importProjectModule("js/tools/archive.js");
  const exportDate = new Date("2026-09-09T12:00:00.000Z");

  assert.equal(analysis.normalizeAnalysisActor("@@alice.test "), "alice.test");
  assert.equal(archive.formatArchiveDatePart("2026-01-02T09:00:00Z", exportDate), "2026-01-02");
  assert.equal(archive.formatArchiveDatePart("", exportDate), "2026-09-09");
  assert.equal(archive.buildArchiveMediaFileBaseName("@@alice test!", "fallback", exportDate), "threadline-media-alice-test--2026-09-09");
  assert.equal(archive.buildArchiveMediaPartFileName("threadline-media-alice-2026-09-09", 1, 12), "threadline-media-alice-2026-09-09-part-002-of-012.zip");
});

test("archive UI binds preference controls through explicit callbacks", async () => {
  const archive = await importProjectModule("js/tools/archive.js");
  const scope = new EventTarget();
  const sourceInput = new EventTarget();
  const fromInput = new EventTarget();
  let calls = 0;

  const bound = archive.bindArchivePreferenceEvents({
    scope,
    sourceInput,
    fromInput,
  }, {
    scopeChange: () => {
      calls += 1;
    },
    sourceInput: () => {
      calls += 1;
    },
    fromChange: () => {
      calls += 1;
    },
  });

  assert.equal(bound, 3);
  scope.dispatchEvent(new Event("change"));
  sourceInput.dispatchEvent(new Event("input"));
  fromInput.dispatchEvent(new Event("change"));
  assert.equal(calls, 3);
});

test("archive UI binds loading and reset actions through explicit callbacks", async () => {
  const archive = await importProjectModule("js/tools/archive.js");
  const nextWaveButton = new EventTarget();
  const threadUrlInput = new EventTarget();
  const loadThreadUrlButton = new EventTarget();
  const importButton = new EventTarget();
  const resetButton = new EventTarget();
  const pauseButton = new EventTarget();
  const resumeButton = new EventTarget();
  const cancelButton = new EventTarget();
  let calls = 0;

  const bound = archive.bindArchiveActionEvents({
    nextWaveButton,
    threadUrlInput,
    loadThreadUrlButton,
    importButton,
    resetButton,
    pauseButton,
    resumeButton,
    cancelButton,
  }, {
    nextWaveClick: () => {
      calls += 1;
    },
    threadUrlKeydown: () => {
      calls += 1;
    },
    loadThreadUrlClick: () => {
      calls += 1;
    },
    importClick: () => {
      calls += 1;
    },
    resetClick: () => {
      calls += 1;
    },
    pauseClick: () => {
      calls += 1;
    },
    resumeClick: () => {
      calls += 1;
    },
    cancelClick: () => {
      calls += 1;
    },
  });

  assert.equal(bound, 8);
  nextWaveButton.dispatchEvent(new Event("click"));
  threadUrlInput.dispatchEvent(new Event("keydown"));
  loadThreadUrlButton.dispatchEvent(new Event("click"));
  importButton.dispatchEvent(new Event("click"));
  resetButton.dispatchEvent(new Event("click"));
  pauseButton.dispatchEvent(new Event("click"));
  resumeButton.dispatchEvent(new Event("click"));
  cancelButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 8);
});

test("tools layout keeps the intended workspace order", async () => {
  const layout = await importProjectModule("js/tools/tools-layout.js");
  const searchElement = { id: "search" };
  const entries = layout.getToolsWorkspaceEntries({ search: searchElement });

  assert.deepEqual(layout.TOOL_WORKSPACE_IDS, ["archive", "search", "network", "threadExplorer", "analysis", "dm"]);
  assert.equal(entries[1][0], "search");
  assert.equal(entries[1][1], searchElement);
  assert.equal(entries[0][1], undefined);
});

test("tools page binds analysis and DM navigation", async () => {
  const toolsPage = await importProjectModule("js/tools/tools-layout.js");
  const analysisButton = new EventTarget();
  const dmButton = new EventTarget();
  let calls = 0;
  const bound = toolsPage.bindToolsWorkspaceNavigationEvents({ analysisButton, dmButton }, {
    analysisClick: () => { calls += 1; },
    dmClick: () => { calls += 1; },
  });
  assert.equal(bound, 2);
  analysisButton.dispatchEvent(new Event("click"));
  dmButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 2);
});

test("search result cards expose an explicit renderer contract", async () => {
  const searchResults = await importProjectModule("js/tools/search-results.js");
  const renderer = searchResults.createSearchResultCardRenderer({
    nodeTemplate: null,
    getDisplayModel: () => ({}),
  });

  assert.equal(typeof renderer, "function");
  assert.equal(renderer({}), null);
});

test("search UI binds filters and actions through explicit callbacks", async () => {
  const search = await importProjectModule("js/tools/search.js");
  const modeSelect = new EventTarget();
  const queryInput = new EventTarget();
  const runButton = new EventTarget();
  const clearButton = new EventTarget();
  let calls = 0;
  const bound = search.bindSearchWorkspaceEvents({
    modeSelect,
    queryInput,
    runButton,
    clearButton,
  }, {
    modeChange: () => { calls += 1; },
    summaryInput: () => { calls += 1; },
    runClick: () => { calls += 1; },
    clearClick: () => { calls += 1; },
  });
  assert.equal(bound, 4);
  modeSelect.dispatchEvent(new Event("change"));
  queryInput.dispatchEvent(new Event("input"));
  runButton.dispatchEvent(new Event("click"));
  clearButton.dispatchEvent(new Event("click"));
  assert.equal(calls, 4);
});

test("search UI binds dialog and saved-search controls", async () => {
  const search = await importProjectModule("js/tools/search.js");
  const hashtagCloseTop = new EventTarget();
  const savedSearchAddButton = new EventTarget();
  const savedSearchUrlInput = new EventTarget();
  let calls = 0;
  const bound = search.bindSearchDialogEvents({
    hashtagCloseTop,
    savedSearchAddButton,
    savedSearchUrlInput,
  }, {
    hashtagClose: () => { calls += 1; },
    savedSearchAdd: () => { calls += 1; },
    savedSearchKeydown: () => { calls += 1; },
  });
  assert.equal(bound, 3);
  hashtagCloseTop.dispatchEvent(new Event("click"));
  savedSearchAddButton.dispatchEvent(new Event("click"));
  savedSearchUrlInput.dispatchEvent(new Event("keydown"));
  assert.equal(calls, 3);
});
