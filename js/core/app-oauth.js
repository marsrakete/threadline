/** Sets up the OAuth entry point without changing the app-password form. @param {object} elements - Login controls. @param {object} options - Worker, draft, navigation and translation adapters. @returns {object} Login dialog adapter. */
export function createOAuthLoginController(elements, options) {
  const { form, handle, dm, button, passwordDetails } = elements;
  form.hidden = !options.available;

  /** Resets the method controls when the shared account dialog opens. @param {object} settings - Account or explicit login preference. @returns {void} Completion. */
  function configure(settings) {
    const account = settings.account;
    handle.value = account?.handle || "";
    dm.checked = false;
    passwordDetails.open = !options.available || Boolean(settings.mode === "repair" && account?.authMethod !== "oauth");
  }

  /** Starts OAuth from the user gesture and commits any pending draft before navigating. @param {SubmitEvent} event - Form event. @returns {Promise<void>} Redirect preparation. */
  async function submit(event) {
    event.preventDefault();
    button.disabled = true;
    options.note(options.t("oauthConnecting"));
    try {
      await options.flushDraft();
      const target = await options.request("OAUTH_BEGIN", {
        handle: handle.value.trim().replace(/^@/, ""),
        workspace: options.workspace,
        dm: dm.checked,
      }, { timeoutMs: 40_000 });
      const url = new URL(target);
      if (url.protocol !== "https:") { throw new Error("Invalid OAuth redirect"); }
      options.navigate(url.href);
    } catch (error) {
      let key = "oauthStartFailed";
      if (error?.details?.code === "OAUTH_BAD_HANDLE") { key = "oauthBadHandle"; }
      options.note(options.t(key), "error");
      button.disabled = false;
    }
  }

  /** Restores the form after the user navigates back from the provider. @returns {void} Completion. */
  function reset() {
    button.disabled = false;
    options.note("");
  }

  if (options.available) {
    form.addEventListener("submit", submit);
    options.onPageShow(reset);
  }
  /** Indicates whether the OAuth field should receive initial focus. @returns {boolean} Whether OAuth is the initial method. */
  function shouldFocus() { return !form.hidden && !passwordDetails.open; }
  /** Focuses the OAuth handle field. @returns {void} Completion. */
  function focus() { handle.focus(); }
  return Object.freeze({ configure, focus, shouldFocus });
}

/** Clears sensitive URL data before requesting OAuth callback completion. @param {object} options - Current URL, worker and navigation adapters. @returns {Promise<void>} Redirect or localized error presentation. */
export async function finishOAuthNavigation(options) {
  const url = new URL(options.href);
  const fragment = url.hash.slice(1);
  options.scrub(url.pathname);
  if (!fragment) {
    options.showError("oauthCallbackFailed");
    return;
  }
  try {
    const result = await options.request("OAUTH_FINISH", { fragment }, { timeoutMs: 60_000 });
    let destination = "./";
    if (result.workspace === "tools") { destination = "./tools.html"; }
    options.navigate(destination);
  } catch (error) {
    if (error?.details?.code === "OAUTH_CANCELLED") {
      options.showError("oauthCancelled");
    } else {
      options.showError("oauthCallbackFailed");
    }
  }
}
