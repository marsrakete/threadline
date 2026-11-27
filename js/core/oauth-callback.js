import { DEFAULT_LOCALE, translations } from "./app-translations.js";
import { createWorkerRequestClient } from "./app-storage.js";
import { finishOAuthNavigation } from "./app-oauth.js";

const browserLocale = navigator.language.split("-")[0].toLowerCase();
let language = DEFAULT_LOCALE;
if (Object.hasOwn(translations, browserLocale)) { language = browserLocale; }
document.documentElement.lang = language;
const status = document.querySelector("#oauth-status");
const back = document.querySelector("#oauth-return");
status.textContent = translations[language].oauthConnecting;
back.textContent = translations[language].oauthReturn;

/** Displays the localized outcome with a safe route back. @param {string} key - Translation key. @returns {void} Completion. */
function showError(key) {
  status.textContent = translations[language][key];
  back.hidden = false;
}

/** Registers or finds the worker before the callback is sent. @returns {Promise<ServiceWorkerRegistration>} Active worker registration. */
async function ready() {
  const base = new URL("../../", import.meta.url);
  await navigator.serviceWorker.register(new URL("sw.js", base), { scope: base.href }).catch(() => {});
  const timeout = AbortSignal.timeout(12_000);
  return new Promise((resolve, reject) => {
    timeout.addEventListener("abort", () => reject(timeout.reason), { once: true });
    navigator.serviceWorker.ready.then(resolve, reject);
  });
}

const request = createWorkerRequestClient({
  ready, controller: () => navigator.serviceWorker.controller, channel: () => new MessageChannel(),
  schedule: (...args) => setTimeout(...args), clearTimer: (id) => clearTimeout(id),
  translate: (key) => translations[language][key], abortError: () => new DOMException("Aborted", "AbortError"),
});
void finishOAuthNavigation({
  href: location.href, scrub: (path) => history.replaceState(null, "", path),
  request: request.request, navigate: (target) => location.replace(target), showError,
});
