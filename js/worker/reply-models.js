/** Creates pure reply-mode, mention and threadgate eligibility models.
 * @param {object} options - Existing worker messages.
 * @returns {object} Frozen mode/mentions/eligibility API.
 */
globalThis.createThreadlineReplyModels = function createThreadlineReplyModels(options) {
  const { messages } = options;
  /** Normalizes the reply mode. @param {unknown} mode - Requested mode. @returns {string} Model result. */
  function normalizeReplyTargetMode(mode) {
    if (mode === "thread") { return "thread"; }
    return "post";
  }

  /** Checks whether a record explicitly mentions an account. @param {object} record - Post record. @param {string} did - Account DID. @returns {boolean} Model result. */
  function recordMentionsDid(record, did) {
    return Array.isArray(record?.facets) && record.facets.some((facet) =>
      Array.isArray(facet?.features) && facet.features.some((feature) =>
        feature?.$type === "app.bsky.richtext.facet#mention" && feature.did === did,
      )
    );
  }

  /** Applies the existing follower/following/mention/list gate rules. @param {object} postView - Post and threadgate. @param {string} authDid - Active account DID. @returns {object} Model result. */
  function evaluateReplyEligibility(postView, authDid) {
    let allowRules = null;
    if (Array.isArray(postView?.threadgate?.record?.allow)) { allowRules = postView.threadgate.record.allow; }
    if (!allowRules) {
      return { status: "allowed", hint: "" };
    }
    if (allowRules.length === 0) {
      return { status: "blocked", hint: messages.replyDisabled };
    }

    let viewer = {};
    if (postView?.author?.viewer && typeof postView.author.viewer === "object") { viewer = postView.author.viewer; }
    let matched = false;
    let hasUnknownRules = false;

    for (const rule of allowRules) {
      const type = String(rule?.$type || "");
      if (type === "app.bsky.feed.threadgate#followerRule" && viewer.following) {
        matched = true;
        break;
      }
      if (type === "app.bsky.feed.threadgate#followingRule" && viewer.followedBy) {
        matched = true;
        break;
      }
      if (type === "app.bsky.feed.threadgate#mentionRule" && recordMentionsDid(postView?.record || {}, authDid)) {
        matched = true;
        break;
      }
      if (type === "app.bsky.feed.threadgate#listRule") {
        hasUnknownRules = true;
      }
    }

    if (matched) {
      return { status: "allowed", hint: "" };
    }
    if (hasUnknownRules) {
      return {
        status: "unknown",
        hint: messages.replyListsUnknown,
      };
    }
    return {
      status: "blocked",
      hint: messages.replyBlocked,
    };
  }

  return Object.freeze({ mode: normalizeReplyTargetMode, mentions: recordMentionsDid, eligibility: evaluateReplyEligibility });
};
