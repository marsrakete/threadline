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
  assert.equal(explorer.getThreadExplorerFaviconUrl("https://example.test/path"), "https://example.test/favicon.ico");
  assert.equal(explorer.getThreadExplorerFaviconUrl("not a URL"), "");
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

test("tools layout keeps the intended workspace order", async () => {
  const layout = await importProjectModule("js/tools/tools-layout.js");
  const searchElement = { id: "search" };
  const entries = layout.getToolsWorkspaceEntries({ search: searchElement });

  assert.deepEqual(layout.TOOL_WORKSPACE_IDS, ["archive", "search", "network", "threadExplorer", "analysis", "dm"]);
  assert.equal(entries[1][0], "search");
  assert.equal(entries[1][1], searchElement);
  assert.equal(entries[0][1], undefined);
});
