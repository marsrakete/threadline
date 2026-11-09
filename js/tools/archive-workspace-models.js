/**
 * Creates localized presentation models for archive run state.
 * @param {object} dependencies - Translation and locale adapters.
 * @param {Function} dependencies.t - Resolves localized labels with values.
 * @param {Function} dependencies.locale - Reads the current display locale.
 * @returns {object} wave, active, time, status, hint, notice, controls and summary models.
 */
export function createArchiveWorkspaceModels(dependencies) {
  for (const name of ["t", "locale"]) {
    if (!dependencies || typeof dependencies[name] !== "function") {
      throw new TypeError(`Archive workspace requires ${name}.`);
    }
  }
  const t = dependencies.t;

  /** Reads the current wave. @param {object} state - Session state. @returns {number} Current wave or one. */
  function wave(state) {
    if (state.session?.waveIndex) {
      return state.session.waveIndex;
    }
    return 1;
  }

  /** Tests for an active run. @param {object} state - Run state. @returns {boolean} Running or paused. */
  function active(state) {
    return state.runState === "running" || state.runState === "paused";
  }

  /** Formats a heartbeat. @param {string} timestamp - ISO timestamp. @returns {string} Local time or empty text. */
  function time(timestamp) {
    if (!timestamp) {
      return "";
    }
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    return new Intl.DateTimeFormat(dependencies.locale(), {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(parsed);
  }

  /** Builds the run status text. @param {object} state - Session, progress, checkpoint and notice. @returns {string} Localized status. */
  function status(state) {
    if (state.notice) {
      return state.notice;
    }
    const job = state.job;
    const working = Boolean(job && (String(job.step || "").trim() || String(job.detail || "").trim()) && Number(job.percent) > 0 && Number(job.percent) < 100);
    if (!state.session && state.runState === "idle" && !state.checkpoint && !working) {
      return t("archiveRunStatusIdle");
    }
    const checkpoint = state.checkpoint || state.preview?.meta || job?.detail || job?.step || "";
    if (!state.session && state.runState === "idle" && working) {
      return checkpoint || t("archiveRunStatusNoCheckpoint");
    }
    const values = {
      wave: wave(state),
      checkpoint: checkpoint || t("archiveRunStatusNoCheckpoint")
    };
    if (state.runState === "paused") {
      return t("archiveRunStatusPaused", values);
    }
    if (state.runState === "running") {
      return t("archiveRunStatusRunning", values);
    }
    if (state.session?.status === "cancelled" || state.runState === "cancelled") {
      return t("archiveRunStatusCancelled", values);
    }
    return t("archiveRunStatusReady", values);
  }

  /** Builds the start hint. @param {object} state - Run and session state. @returns {string} Localized start/resume hint. */
  function hint(state) {
    if (state.runState === "paused") {
      return t("archiveStartHintPaused", {
        wave: wave(state)
      });
    }
    if (state.session?.status === "paused" || state.session?.hasMore || state.session?.nextCursor) {
      return t("archiveStartHintIncomplete", {
        wave: wave(state)
      });
    }
    if (state.session?.exportedPosts) {
      return t("archiveStartHintRestart", {
        wave: 1
      });
    }
    return t("archiveStartHintFresh");
  }

  /** Builds a loaded-catalog notice. @param {object|null} catalog - Posts, summary and thread import metadata. @returns {string} Localized notice or empty. */
  function notice(catalog) {
    if (!catalog) {
      return "";
    }
    const values = {
      posts: catalog.posts.length,
      images: catalog.summary.imageCount,
      skipped: catalog.summary.skippedImageCount || 0
    };
    const mode = catalog.manifest?.threadImport?.entryMode;
    if (mode === "reply") {
      return t("archiveThreadUrlImportedReplyNotice", values);
    }
    if (mode === "root") {
      return t("archiveThreadUrlImportedRootNotice", values);
    }
    return t("archiveImportedNotice", values);
  }

  /** Derives pause/resume/cancel availability. @param {object} state - Run ID/state, session and media flag. @returns {object} Control availability. */
  function controls(state) {
    return {
      pause: state.runState === "running" && Boolean(state.runId),
      resume: state.runState === "paused" || state.session?.status === "paused",
      cancel: Boolean(state.runId) && active(state) || state.mediaRunning
    };
  }

  /** Builds summary counts. @param {object} state - Catalog, session and PDF options. @returns {object} Post/image/estimated band counts. */
  function summary(state) {
    const posts = state.catalog?.posts?.length || state.session?.exportedPosts || 0;
    const images = state.catalog?.summary?.imageCount || state.session?.exportedImages || 0;
    const size = Math.max(100, Math.min(1000, Number(state.pdfOptions.bandSize) || 200));
    let bands = 0;
    if (posts > 0) {
      bands = Math.ceil(posts / size);
    }
    return {
      posts,
      images,
      bands
    };
  }
  return {
    wave,
    active,
    time,
    status,
    hint,
    notice,
    controls,
    summary
  };
}
