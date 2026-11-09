/**
 * Creates private archive-run state, cooperative waits and request retry policy.
 * @param {object} options - Explicit scheduling, service-error and message adapters.
 * @param {Function} options.delay - Resolves after the supplied milliseconds.
 * @param {Function} options.error - Creates an error from message and service code.
 * @param {object} options.messages - Existing archive-run text templates.
 * @returns {{start: Function, finish: Function, control: Function, wait: Function, sleep: Function, retry: Function, softPauseMs: Function, pauseFeed: Function}} Frozen run operations.
 */
globalThis.createThreadlineArchiveRunControl = function createThreadlineArchiveRunControl(options) {
  for (const name of ["delay", "error"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Archive run control requires " + name);
    }
  }
  for (const name of ["pausedTitle", "pausedStep", "cancelled", "exhausted", "readTitle", "waitStep", "waitCheckpoint",
    "rateLimit", "serverError", "networkError", "retryDetail", "feedDetail"]) {
    if (typeof options.messages?.[name] !== "string") {
      throw new TypeError("Archive run control requires message " + name);
    }
  }
  const messages = options.messages;
  const runs = new Map();

  /** Formats a controlled message template with literal values in one pass.
   * @param {string} template - Existing message. @param {object} values - Placeholder values.
   * @returns {string} Message with supplied values, without interpreting their contents.
   */
  function format(template, values) {
    return template.replace(/\{(\w+)\}/g, (placeholder, name) => {
      if (Object.hasOwn(values, name)) {
        return String(values[name]);
      }
      return placeholder;
    });
  }

  /** Starts or resets one run to its existing running state.
   * @param {string} runId - Run identity supplied by the archive workflow. @returns {void}
   */
  function start(runId) {
    runs.set(runId, { state: "running" });
  }

  /** Releases one run's control state when the archive workflow finishes.
   * @param {string} runId - Run identity. @returns {boolean} Whether a stored state was removed.
   */
  function finish(runId) {
    return runs.delete(runId);
  }

  /** Applies the existing pause/resume/cancel command contract.
   * @param {object} payload - runId and action; missing IDs are rejected, unknown actions retain state.
   * @returns {object} Existing ok/state response.
   */
  function control({ runId, action } = {}) {
    if (!runId) {
      return { ok: false };
    }
    const current = runs.get(runId) || { state: "running" };
    if (action === "pause") {
      current.state = "paused";
    } else if (action === "resume") {
      current.state = "running";
    } else if (action === "cancel") {
      current.state = "cancelled";
    }
    runs.set(runId, current);
    return { ok: true, state: current.state };
  }

  /** Waits while paused, notifying every 350 ms, or returns the current cooperative state.
   * @param {string} runId - Run identity; absent IDs run without notifications.
   * @param {Function} notifyProgress - Progress observer. @returns {Promise<string>} running or cancelled.
   */
  async function wait(runId, notifyProgress = () => {}) {
    if (!runId) {
      return "running";
    }
    while (true) {
      const state = runs.get(runId)?.state || "running";
      if (state === "cancelled") {
        return "cancelled";
      }
      if (state === "paused") {
        notifyProgress({ title: messages.pausedTitle, step: messages.pausedStep, state: "paused" });
        await options.delay(350);
        continue;
      }
      if (state === "running") {
        notifyProgress({ state: "running" });
      }
      return "running";
    }
  }

  /** Sleeps in at most one-second chunks, checking pause/cancel before each chunk.
   * @param {string} runId - Run identity. @param {number} durationMs - Requested duration, clamped at zero.
   * @param {Function} notifyProgress - Progress observer. @param {object} progress - Running progress fields.
   * @returns {Promise<string>} running or cancelled; cancellation during the last chunk is observed by the next caller check.
   */
  async function sleep(runId, durationMs, notifyProgress = () => {}, progress = {}) {
    let remainingMs = Math.max(0, Number(durationMs) || 0);
    while (remainingMs > 0) {
      const state = await wait(runId, notifyProgress);
      if (state === "cancelled") {
        return "cancelled";
      }
      const chunkMs = Math.min(1000, remainingMs);
      notifyProgress({ ...progress, state: "running" });
      await options.delay(chunkMs);
      remainingMs -= chunkMs;
    }
    return "running";
  }

  /** Runs a request with the existing bounded retry and cooperative backoff rules.
   * @param {Function} task - Async request repeated only for retryable failures.
   * @param {object} settings - Run/progress fields, checkpoint, and maxRetries (four by default).
   * @returns {Promise<unknown>} Request result; terminal request or service-control errors reject.
   */
  async function retry(task, {
    runId, notifyProgress = () => {}, title = messages.readTitle, percent = 0,
    baseDetail = "", checkpoint = "", maxRetries = 4,
  } = {}) {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const state = await wait(runId, notifyProgress);
      if (state === "cancelled") {
        throw options.error(messages.cancelled, "ARCHIVE_CANCELLED");
      }
      try {
        return await task();
      } catch (error) {
        const status = Number(error?.details?.status) || 0;
        const isRateLimited = status === 429;
        const isTemporaryServerIssue = status === 502 || status === 503 || status === 504;
        const isNetworkIssue = /fetch|network|timeout|tempor/i.test(String(error?.message || ""));
        const shouldRetry = attempt < maxRetries && (isRateLimited || isTemporaryServerIssue || isNetworkIssue);
        if (!shouldRetry) {
          throw error;
        }
        const retryAfterMs = Math.max(0, Number(error?.details?.retryAfterMs) || 0);
        const fallbackMs = Math.min(60_000, 30_000 + (attempt * 15_000));
        let waitMs = fallbackMs;
        if (retryAfterMs > 0) {
          waitMs = retryAfterMs;
        }
        const waitSeconds = Math.max(1, Math.ceil(waitMs / 1000));
        let reasonLabel = messages.networkError;
        if (isRateLimited) {
          reasonLabel = messages.rateLimit;
        } else if (status >= 500) {
          reasonLabel = format(messages.serverError, { status });
        }
        const waitState = await sleep(runId, waitMs, notifyProgress, {
          title, step: messages.waitStep, percent,
          detail: [baseDetail, format(messages.retryDetail, { reason: reasonLabel, seconds: waitSeconds })].filter(Boolean).join(" · "),
          checkpoint: checkpoint || messages.waitCheckpoint,
        });
        if (waitState === "cancelled") {
          throw options.error(messages.cancelled, "ARCHIVE_CANCELLED");
        }
      }
    }
    throw options.error(messages.exhausted, "ARCHIVE_RETRY_EXHAUSTED");
  }

  /** Returns the existing voluntary pause at 25- and 100-page boundaries.
   * @param {number} pageCount - Feed pages read. @param {boolean} archiveExpertMode - Skips voluntary pauses when truthy.
   * @returns {number} Zero, 3000 or 10000 milliseconds; the 100-page boundary has priority.
   */
  function softPauseMs(pageCount, archiveExpertMode = false) {
    if (archiveExpertMode) {
      return 0;
    }
    if (pageCount > 0 && pageCount % 100 === 0) {
      return 10_000;
    }
    if (pageCount > 0 && pageCount % 25 === 0) {
      return 3_000;
    }
    return 0;
  }

  /** Applies a voluntary feed pause through the same pause/cancel-aware sleeper.
   * @param {object} settings - Run/progress callback, page/record counts and expert-mode flag.
   * @returns {Promise<string>} running or cancelled.
   */
  async function pauseFeed({ runId, notifyProgress = () => {}, pageCount = 0, recordsCount = 0, archiveExpertMode = false }) {
    const pauseMs = softPauseMs(pageCount, archiveExpertMode);
    if (pauseMs <= 0) {
      return "running";
    }
    const waitSeconds = Math.max(1, Math.ceil(pauseMs / 1000));
    return await sleep(runId, pauseMs, notifyProgress, {
      title: messages.readTitle, step: messages.waitStep, percent: Math.min(45, 5 + (pageCount * 3)),
      detail: format(messages.feedDetail, { pages: pageCount, records: recordsCount, seconds: waitSeconds }),
      checkpoint: messages.waitCheckpoint,
    });
  }
  return Object.freeze({ start, finish, control, wait, sleep, retry, softPauseMs, pauseFeed });
};
