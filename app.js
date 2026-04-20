import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translations } from "./translations.js";

const MAX_POST_LENGTH = 300;
const CURRENT_VERSION_INFO = {
  appVersion: "0.1.9",
  cacheVersion: "v11",
  label: "Password field hint clarifying app password usage",
};
const statusText = document.querySelector("#status-text");
const loginForm = document.querySelector("#login-form");
const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const publishButton = document.querySelector("#publish-button");
const clearButton = document.querySelector("#clear-button");
const settingsButton = document.querySelector("#settings-button");
const helpButton = document.querySelector("#help-button");
const settingsDialog = document.querySelector("#settings-dialog");
const publishResultDialog = document.querySelector("#publish-result-dialog");
const helpDialog = document.querySelector("#help-dialog");
const languageSelect = document.querySelector("#language-select");
const checkUpdatesButton = document.querySelector("#check-updates-button");
const reloadAppButton = document.querySelector("#reload-app-button");
const updateStatus = document.querySelector("#update-status");
const publishResultText = document.querySelector("#publish-result-text");
const publishResultLink = document.querySelector("#publish-result-link");
const helpStatus = document.querySelector("#help-status");
const helpContent = document.querySelector("#help-content");
const tipText = document.querySelector("#tip-text");
const sourceText = document.querySelector("#source-text");
const counterToggle = document.querySelector("#counter-toggle");
const characterCount = document.querySelector("#character-count");
const segmentSummary = document.querySelector("#segment-summary");
const segmentsPane = document.querySelector("#segments-pane");
const segmentsList = document.querySelector("#segments-list");
const segmentTemplate = document.querySelector("#segment-template");
const identifierField = document.querySelector("#identifier");
const passwordField = document.querySelector("#password");

let activeSegments = [];
let currentLocale = DEFAULT_LOCALE;
let localePreference = "auto";
let authAccount = null;
let draftSaveTimer = null;
let serviceWorkerRegistration = null;
let updateInProgress = false;
let sessionCheckTimer = null;
let helpCache = {
  path: "",
  text: "",
};
let currentTipIndex = 0;

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    setStatus(t("statusNoSupport"));
    return;
  }

  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    await navigator.serviceWorker.ready;
    setStatus(t("statusCheckingSession"));
    await hydrateAppState();
    await verifySession({ silent: true });
    startSessionChecks();
    await checkForUpdates({
      showChecking: false,
      silentNoChange: true,
      silentError: true,
    });
  } catch (error) {
    console.error(error);
    setStatus(t("statusSwRegisterFailed", { message: error.message }), "error");
  }
}

async function sendToServiceWorker(type, payload = {}) {
  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active || navigator.serviceWorker.controller;

  if (!worker) {
    throw new Error("Kein aktiver Service Worker verfügbar.");
  }

  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeoutId = window.setTimeout(() => {
      reject(new Error(t("statusSwTimeout")));
    }, 15000);

    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeoutId);

      if (event.data?.ok) {
        resolve(event.data.result);
        return;
      }

      reject(new Error(event.data?.error || "Unbekannter Fehler im Service Worker."));
    };

    worker.postMessage({ type, payload }, [channel.port2]);
  });
}

function setStatus(message, tone = "neutral") {
  statusText.textContent = message;
  statusText.style.color = tone === "error" ? "var(--danger)" : "var(--text)";
}

function setBusy(button, isBusy, busyLabel, idleLabel) {
  button.disabled = isBusy;
  button.textContent = isBusy ? busyLabel : idleLabel;
}

function updateAuthButtons() {
  const isAuthenticated = Boolean(authAccount);
  loginButton.classList.toggle("ghost-button", isAuthenticated);
  loginButton.classList.toggle("is-muted", isAuthenticated);
}

function applyDisconnectedState(showStatus = true) {
  authAccount = null;
  logoutButton.hidden = true;
  updateAuthButtons();

  if (showStatus) {
    setStatus(t("statusConnectionLost"), "error");
  }
}

function updatePublishAvailability() {
  const baseText = sourceText.value.trim();
  const segments = activeSegments.length > 0 ? activeSegments : [baseText];
  const hasTooLongSegment = segments.some((entry) => entry.length > MAX_POST_LENGTH);
  const canPublish = Boolean(baseText) && !hasTooLongSegment;

  publishButton.disabled = !canPublish;
  publishButton.classList.toggle("is-danger", hasTooLongSegment);
}

function detectBrowserLocale() {
  const candidates = [navigator.language, ...(navigator.languages || [])]
    .filter(Boolean)
    .map((value) => value.toLowerCase().split("-")[0]);

  return candidates.find((value) => SUPPORTED_LOCALES.includes(value)) || DEFAULT_LOCALE;
}

function formatTemplate(template, values = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function getLocaleStrings(locale = currentLocale) {
  return translations[locale] || translations[DEFAULT_LOCALE];
}

function t(key, values = {}) {
  const localeStrings = getLocaleStrings();
  const fallbackStrings = getLocaleStrings(DEFAULT_LOCALE);
  const template = localeStrings[key] ?? fallbackStrings[key] ?? key;
  return typeof template === "string" ? formatTemplate(template, values) : template;
}

function applyTranslations() {
  document.documentElement.lang = currentLocale;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });

  identifierField.placeholder = "z. B. name.bsky.social";
  passwordField.placeholder = "xxxx-xxxx-xxxx-xxxx";
  sourceText.placeholder = t("sourcePlaceholder");
  loginButton.textContent = t("loginButton");
  logoutButton.textContent = t("logoutButton");
  publishButton.textContent = t("publishButton");
  clearButton.textContent = t("clearButton");
  settingsButton.textContent = t("settingsButton");
  helpButton.textContent = t("helpButton");
  checkUpdatesButton.textContent = t("checkUpdatesButton");
  reloadAppButton.textContent = t("reloadButton");
  publishResultLink.textContent = t("openPostLink");
  renderTip();

  const languageNames = t("languageNames");
  Array.from(languageSelect.options).forEach((option) => {
    option.textContent = languageNames[option.value] || option.value;
  });
  languageSelect.value = localePreference;

  renderSegments();
  updateStatusForAuth();
}

function pickRandomTipIndex() {
  const tips = t("tipsList");
  if (!Array.isArray(tips) || tips.length === 0) {
    return 0;
  }
  return Math.floor(Math.random() * tips.length);
}

function renderTip() {
  const tips = t("tipsList");
  if (!Array.isArray(tips) || tips.length === 0) {
    tipText.textContent = "";
    return;
  }

  const safeIndex = Math.min(currentTipIndex, tips.length - 1);
  tipText.textContent = tips[safeIndex];
}

function versionSignature(versionInfo) {
  return `${versionInfo?.appVersion || ""}|${versionInfo?.cacheVersion || ""}`;
}

function normalizeVersionInfo(versionInfo) {
  return {
    appVersion: versionInfo?.appVersion || "",
    cacheVersion: versionInfo?.cacheVersion || "",
    label: versionInfo?.label || "",
  };
}

function setUpdateStatus(message, showReload = false) {
  updateStatus.textContent = message;
  updateStatus.hidden = !message;
  reloadAppButton.hidden = !showReload;
}

async function fetchVersionInfo() {
  const response = await fetch("./version.json", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error("Version file unavailable");
  }
  return normalizeVersionInfo(await response.json());
}

async function performAppReload() {
  setUpdateStatus(t("updateApplying"), false);
  await serviceWorkerRegistration?.update().catch(() => {});
  window.location.reload();
}

async function checkForUpdates(options = {}) {
  const {
    showChecking = true,
    silentNoChange = false,
    silentError = false,
  } = options;

  if (updateInProgress) {
    return;
  }

  updateInProgress = true;
  checkUpdatesButton.disabled = true;

  if (showChecking) {
    setUpdateStatus(t("updateChecking"), false);
  }

  try {
    await serviceWorkerRegistration?.update();
    const remoteVersion = await fetchVersionInfo();

    if (!remoteVersion.appVersion || !remoteVersion.cacheVersion) {
      if (!silentError) {
        setUpdateStatus(t("updateVersionIncomplete"), false);
      }
      return;
    }

    if (versionSignature(remoteVersion) === versionSignature(CURRENT_VERSION_INFO)) {
      if (!silentNoChange) {
        setUpdateStatus(t("updateNoChange"), false);
      }
      return;
    }

    const remoteLabel = remoteVersion.label ? ` · ${remoteVersion.label}` : "";
    const message = `${t("updateAvailablePrefix")}: ${remoteVersion.appVersion} · ${remoteVersion.cacheVersion}${remoteLabel}. ${t("updateAvailableAction")}`;
    setUpdateStatus(message, true);
  } catch (error) {
    console.error(error);
    if (!silentError) {
      setUpdateStatus(t("updateFailed"), false);
    }
  } finally {
    updateInProgress = false;
    checkUpdatesButton.disabled = false;
  }
}

function updateStatusForAuth() {
  updateAuthButtons();

  if (authAccount) {
    setStatus(t("statusConnected", { account: authAccount }));
    return;
  }

  setStatus(t("statusNoAuth"));
}

async function verifySession(options = {}) {
  const { silent = false } = options;

  if (!authAccount) {
    return false;
  }

  try {
    const result = await sendToServiceWorker("VERIFY_SESSION");

    if (!result.authenticated) {
      applyDisconnectedState(!silent);
      return false;
    }

    authAccount = result.handle || result.identifier || authAccount;
    logoutButton.hidden = false;

    if (silent) {
      updateAuthButtons();
    } else {
      setStatus(t("statusConnected", { account: authAccount }));
    }

    return true;
  } catch (error) {
    console.error(error);
    applyDisconnectedState(!silent);
    return false;
  }
}

function startSessionChecks() {
  window.clearInterval(sessionCheckTimer);
  sessionCheckTimer = window.setInterval(() => {
    void verifySession({ silent: true });
  }, 5 * 60 * 1000);
}

function buildBlueskyPostUrl(handle, uri) {
  const parts = String(uri || "").split("/");
  const recordId = parts[parts.length - 1];

  if (!handle || !recordId) {
    return "";
  }

  return `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(recordId)}`;
}

function showPublishResult(result) {
  const postCount = result.posts?.length || 0;
  const handle = result.handle || authAccount;
  const firstPost = result.posts?.[0];
  const postUrl = buildBlueskyPostUrl(handle, firstPost?.uri);

  publishResultText.textContent = postCount > 1 ? t("publishResultMessageMany") : t("publishResultMessageOne");
  publishResultLink.href = postUrl || "#";
  publishResultLink.hidden = !postUrl;
  publishResultDialog.showModal();
}

function autoSizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function getHelpReadmePath() {
  return currentLocale === "de" ? "./README.de.md" : "./README.md";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return html;
}

function convertHtmlBlocks(markdown) {
  return markdown
    .replace(/<p\s+align="center">\s*<img\s+src="([^"]+)"\s+alt="([^"]*)"\s+width="([^"]+)"\s*>\s*<\/p>/gi, (_, src, alt, width) =>
      `<p class="help-centered"><img src="${src}" alt="${escapeHtml(alt)}" width="${width}"></p>`)
    .replace(/<p\s+align="center">\s*([\s\S]*?)\s*<\/p>/gi, (_, content) =>
      `<p class="help-centered">${renderInlineMarkdown(content.trim())}</p>`);
}

function renderMarkdownAsHtml(markdown) {
  const prepared = convertHtmlBlocks(markdown.replace(/\r\n/g, "\n"));
  const lines = prepared.split("\n");
  const html = [];
  let inList = false;
  let listTag = "";
  let inCode = false;
  let codeLines = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!inList) {
      return;
    }
    html.push(`</${listTag}>`);
    inList = false;
    listTag = "";
  };

  const flushCode = () => {
    if (!inCode) {
      return;
    }
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    inCode = false;
    codeLines = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      if (inCode) {
        flushCode();
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.trim().startsWith("<p class=\"help-centered\">")) {
      flushParagraph();
      flushList();
      html.push(line.trim());
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.*)$/);
    const unordered = line.match(/^-\s+(.*)$/);
    if (ordered || unordered) {
      flushParagraph();
      const nextTag = ordered ? "ol" : "ul";
      if (!inList || listTag !== nextTag) {
        flushList();
        inList = true;
        listTag = nextTag;
        html.push(`<${listTag}>`);
      }
      html.push(`<li>${renderInlineMarkdown((ordered || unordered)[1])}</li>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCode();

  return html.join("");
}

async function loadReadmeContent() {
  const path = getHelpReadmePath();

  if (helpCache.path === path && helpCache.text) {
    helpStatus.textContent = "";
    helpContent.innerHTML = renderMarkdownAsHtml(helpCache.text);
    return;
  }

  helpStatus.textContent = t("helpLoading");
  helpContent.innerHTML = "";

  try {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error("README unavailable");
    }

    const text = await response.text();
    helpCache = { path, text };
    helpStatus.textContent = "";
    helpContent.innerHTML = renderMarkdownAsHtml(text);
  } catch (error) {
    console.error(error);
    helpStatus.textContent = t("helpFailed");
    if (!(helpCache.path === path && helpCache.text)) {
      helpContent.innerHTML = "";
    }
  }
}

function reserveForCounters(segmentCount) {
  const digits = String(Math.max(segmentCount, 1)).length;
  return 2 * digits + 3;
}

function splitIntoSegments(text, withCounters) {
  const normalized = normalizeInput(text);

  if (!normalized) {
    return [];
  }

  if (!withCounters) {
    return greedySplit(normalized, () => MAX_POST_LENGTH);
  }

  let guess = Math.max(1, Math.ceil(normalized.length / MAX_POST_LENGTH));

  for (let index = 0; index < 12; index += 1) {
    const reserve = reserveForCounters(guess);
    const segments = greedySplit(normalized, () => MAX_POST_LENGTH - reserve);

    if (segments.length === guess) {
      return segments.map((segment, segmentIndex) => `${segment}\n${segmentIndex + 1}/${segments.length}`);
    }

    guess = segments.length;
  }

  const fallbackReserve = reserveForCounters(guess);
  const fallbackSegments = greedySplit(normalized, () => MAX_POST_LENGTH - fallbackReserve);
  return fallbackSegments.map((segment, segmentIndex) => `${segment}\n${segmentIndex + 1}/${fallbackSegments.length}`);
}

function normalizeInput(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tokenizeText(text) {
  return text.match(/\n|[^\s\n]+|[ \t]+/g) || [];
}

function greedySplit(text, limitFactory) {
  const tokens = tokenizeText(text);
  const segments = [];
  let current = "";

  for (const token of tokens) {
    const chunkIndex = segments.length;
    const limit = Math.max(1, limitFactory(chunkIndex));
    const nextValue = current + token;

    if (token === "\n") {
      if (nextValue.length <= limit) {
        current = nextValue;
      } else if (current) {
        segments.push(trimSegment(current));
        current = "";
      }
      continue;
    }

    if (/^[ \t]+$/.test(token)) {
      if (current && nextValue.length <= limit) {
        current = nextValue;
      }
      continue;
    }

    if (token.length > limit) {
      if (current) {
        segments.push(trimSegment(current));
        current = "";
      }

      let start = 0;
      while (start < token.length) {
        const sliceLimit = Math.max(1, limitFactory(segments.length));
        segments.push(token.slice(start, start + sliceLimit));
        start += sliceLimit;
      }
      continue;
    }

    if (nextValue.length <= limit) {
      current = nextValue;
      continue;
    }

    if (current) {
      segments.push(trimSegment(current));
    }
    current = token;
  }

  if (current) {
    segments.push(trimSegment(current));
  }

  return segments;
}

function trimSegment(segment) {
  return segment.replace(/[ \t]+\n/g, "\n").replace(/^[ \t]+|[ \t]+$/g, "").trimEnd();
}

function renderSegments() {
  const text = sourceText.value;
  const useCounters = counterToggle.checked;
  const shouldSplit = text.trim().length > MAX_POST_LENGTH;
  activeSegments = shouldSplit ? splitIntoSegments(text, useCounters) : [];

  characterCount.textContent = `${text.length} Zeichen`;
  characterCount.textContent = t("charCount", { count: text.length });

  if (!text.trim()) {
    segmentSummary.textContent = t("summarySingle");
  } else if (activeSegments.length > 0) {
    segmentSummary.textContent = t("summaryMultiple", { count: activeSegments.length });
  } else {
    segmentSummary.textContent = t("summarySingle");
  }

  segmentsPane.hidden = activeSegments.length === 0;
  segmentsList.innerHTML = "";

  activeSegments.forEach((segment, index) => {
    const fragment = segmentTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".segment-card");
    const indexLabel = fragment.querySelector(".segment-index");
    const lengthLabel = fragment.querySelector(".segment-length");
    const textarea = fragment.querySelector(".segment-text");

    card.style.animationDelay = `${index * 55}ms`;
    indexLabel.textContent = t("segmentPart", { index: index + 1 });
    lengthLabel.textContent = `${segment.length}/${MAX_POST_LENGTH}`;
    textarea.value = segment;
    textarea.addEventListener("input", () => {
      activeSegments[index] = textarea.value;
      lengthLabel.textContent = `${textarea.value.length}/${MAX_POST_LENGTH}`;
      if (textarea.value.length > MAX_POST_LENGTH) {
        lengthLabel.style.color = "var(--danger)";
      } else {
        lengthLabel.style.color = "var(--muted)";
      }
      autoSizeTextarea(textarea);
      updatePublishAvailability();
    });

    segmentsList.appendChild(fragment);
    autoSizeTextarea(segmentsList.lastElementChild.querySelector(".segment-text"));
  });

  updatePublishAvailability();
}

async function hydrateAppState() {
  try {
    const browserLocale = detectBrowserLocale();
    const state = await sendToServiceWorker("GET_APP_STATE", { browserLocale });
    localePreference = state.localePreference || "auto";
    currentLocale = localePreference === "auto"
      ? (browserLocale || DEFAULT_LOCALE)
      : state.locale || browserLocale || DEFAULT_LOCALE;
    identifierField.value = state.identifier || "";
    sourceText.value = state.draft || "";
    authAccount = state.handle || state.identifier || null;
    passwordField.value = "";
    logoutButton.hidden = !state.authenticated;
    applyTranslations();
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  }
}

function queueDraftSave() {
  window.clearTimeout(draftSaveTimer);
  draftSaveTimer = window.setTimeout(async () => {
    try {
      await sendToServiceWorker("SAVE_DRAFT", { draft: sourceText.value });
    } catch (error) {
      console.error(error);
      setStatus(error.message, "error");
    }
  }, 250);
}

async function persistLocale(locale) {
  localePreference = locale;
  currentLocale = locale === "auto" ? detectBrowserLocale() : locale;
  languageSelect.value = localePreference;
  applyTranslations();

  try {
    await sendToServiceWorker("SAVE_SETTINGS", { localePreference });
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    setBusy(loginButton, true, t("loginBusy"), t("loginButton"));
    const identifier = identifierField.value.trim();
    const appPassword = passwordField.value.trim();

    const result = await sendToServiceWorker("LOGIN", {
      identifier,
      appPassword,
    });

    passwordField.value = "";
    logoutButton.hidden = false;
    authAccount = result.handle || result.identifier;
    updateStatusForAuth();
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  } finally {
    setBusy(loginButton, false, t("loginBusy"), t("loginButton"));
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await sendToServiceWorker("LOGOUT");
    logoutButton.hidden = true;
    authAccount = null;
    setStatus(t("statusLoggedOut"));
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  }
});

publishButton.addEventListener("click", async () => {
  const baseText = sourceText.value.trim();

  if (!baseText) {
    setStatus(t("statusNeedText"), "error");
    return;
  }

  const segments = activeSegments.length > 0 ? activeSegments.map((entry) => entry.trim()) : [baseText];

  if (segments.some((entry) => !entry)) {
    setStatus(t("statusEmptySegments"), "error");
    return;
  }

  if (segments.some((entry) => entry.length > MAX_POST_LENGTH)) {
    setStatus(t("statusSegmentTooLong"), "error");
    return;
  }

  try {
    setBusy(publishButton, true, t("publishBusy"), t("publishButton"));
    const result = await sendToServiceWorker("PUBLISH_THREAD", { segments });
    setStatus(result.posts.length === 1 ? t("statusPublishedOne") : t("statusPublishedMany", { count: result.posts.length }));
    showPublishResult(result);
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  } finally {
    setBusy(publishButton, false, t("publishBusy"), t("publishButton"));
  }
});

sourceText.addEventListener("input", () => {
  renderSegments();
  queueDraftSave();
});
counterToggle.addEventListener("change", renderSegments);

clearButton.addEventListener("click", async () => {
  sourceText.value = "";
  activeSegments = [];
  renderSegments();

  try {
    await sendToServiceWorker("SAVE_DRAFT", { draft: "" });
    setStatus(t("clearConfirm"));
  } catch (error) {
    console.error(error);
    setStatus(error.message, "error");
  }
});

settingsButton.addEventListener("click", () => {
  setUpdateStatus("", false);
  settingsDialog.showModal();
});

helpButton.addEventListener("click", () => {
  helpDialog.showModal();
  void loadReadmeContent();
});

languageSelect.addEventListener("change", async () => {
  await persistLocale(languageSelect.value);
});

checkUpdatesButton.addEventListener("click", async () => {
  await checkForUpdates();
});

reloadAppButton.addEventListener("click", async () => {
  await performAppReload();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    void verifySession({ silent: true });
  }
});

window.addEventListener("focus", () => {
  void verifySession({ silent: true });
});

currentLocale = detectBrowserLocale();
localePreference = "auto";
currentTipIndex = pickRandomTipIndex();
languageSelect.value = localePreference;
applyTranslations();
setStatus(t("statusPreparing"));
registerServiceWorker();
renderSegments();
