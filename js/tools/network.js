/**
 * Determines the relationship of one network node to the viewed account.
 * @param {object} node - Network profile with following and follower flags.
 * @returns {string} One of mutual, followers, following, or other.
 */
export function getNetworkRelationType(node) {
  if (node?.followingViewer && node?.followedByViewer) {
    return "mutual";
  }
  if (node?.followedByViewer) {
    return "followers";
  }
  if (node?.followingViewer) {
    return "following";
  }
  return "other";
}

/**
 * Builds the transparent score components for one network profile.
 * @param {object} node - Network profile with relation and count fields.
 * @returns {{relationScore: number, followersScore: number, postsScore: number, total: number}} Score components.
 */
export function getNetworkScoreBreakdown(node) {
  const relation = getNetworkRelationType(node);
  let relationScore = 30;
  if (relation === "mutual") {
    relationScore = 120;
  } else if (relation === "followers") {
    relationScore = 80;
  } else if (relation === "following") {
    relationScore = 70;
  }

  const followersScore = Math.min(80, Number(node?.followersCount) || 0);
  const postsScore = Math.min(40, Math.floor((Number(node?.postsCount) || 0) / 5));
  return {
    relationScore,
    followersScore,
    postsScore,
    total: relationScore + followersScore + postsScore,
  };
}

/**
 * Returns the combined network score for one profile.
 * @param {object} node - Network profile to score.
 * @returns {number} Combined relationship, follower, and posting score.
 */
export function getNetworkNodeScore(node) {
  return getNetworkScoreBreakdown(node).total;
}
