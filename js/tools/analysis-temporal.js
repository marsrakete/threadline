/** Creates UTC temporal calculations with explicit labels, buckets and clock. @param {object} options - Locale/now providers, gapBuckets, weekdayAnchors/fallbacks and shares. @returns {object} Profile, histogram and comparison operations. */
export function createAnalysisTemporalAnalyzer(options) {
  /** Formats a UTC hour label. @param {number} hour - UTC hour. @returns {string} Hour text. */
  function formatUtcHourLabel(hour) {
    return `${String(hour).padStart(2, "0")}:00`;
  }

  /** Formats a UTC weekday with the existing fallback. @param {number} index - Monday-based index. @returns {string} Weekday label. */
  function getWeekdayLabel(index) {
    const mondayAnchors = options.weekdayAnchors;
    try {
      return new Intl.DateTimeFormat(options.locale(), {
        weekday: "short",
        timeZone: "UTC",
      }).format(new Date(mondayAnchors[index] || mondayAnchors[0]));
    } catch {
      return options.weekdayFallbacks[index] || "";
    }
  }

  /** Ranks positive histogram labels. @param {number[]} values - Counts. @param {Function} labelFactory - Label resolver. @param {number} limit - Count limit. @returns {string[]} Labels. */
  function getTopLabelsFromHistogram(values = [], labelFactory = (index) => String(index), limit = 3) {
    return values
      .map((count, index) => ({
        index,
        count: Number(count) || 0,
      }))
      .filter((entry) => entry.count > 0)
      .sort((left, right) => right.count - left.count || left.index - right.index)
      .slice(0, limit)
      .map((entry) => labelFactory(entry.index));
  }

  /** Selects strongest labels in chronological order. @param {number[]} values - Counts. @param {Function} labelFactory - Label resolver. @param {number} limit - Count limit. @returns {string[]} Labels. */
  function getTopChronologicalLabelsFromHistogram(values = [], labelFactory = (index) => String(index), limit = 3) {
    return values
      .map((count, index) => ({
        index,
        count: Number(count) || 0,
      }))
      .filter((entry) => entry.count > 0)
      .sort((left, right) => right.count - left.count || left.index - right.index)
      .slice(0, limit)
      .sort((left, right) => left.index - right.index)
      .map((entry) => labelFactory(entry.index));
  }

  /** Selects chronological top labels with shares. @param {number[]} values - Counts. @param {Function} labelFactory - Label resolver. @param {number} limit - Count limit. @returns {object[]} Labels/shares. */
  function getTopChronologicalEntriesFromHistogram(values = [], labelFactory = (index) => String(index), limit = 3) {
    const total = values.reduce((sum, value) => sum + (Number(value) || 0), 0);
    return values
      .map((count, index) => ({
        index,
        count: Number(count) || 0,
        share: histogramShare(count, total),
      }))
      .filter((entry) => entry.count > 0)
      .sort((left, right) => right.count - left.count || left.index - right.index)
      .slice(0, limit)
      .sort((left, right) => left.index - right.index)
      .map((entry) => ({
        label: labelFactory(entry.index),
        share: entry.share,
      }));
  }

  /** Calculates UTC midnight. @param {number} timestamp - Epoch milliseconds. @returns {number} Day start. */
  function startOfUtcDay(timestamp) {
    const date = new Date(timestamp);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  /** Calculates UTC posting rhythm and 30 recent days. @param {object[]} posts - createdAt records. @returns {object} Temporal profile. */
  function createAnalysisTemporalProfile(posts = []) {
    let input = [];
    if (Array.isArray(posts)) { input = posts; }
    const timestamps = input
      .map((post) => Date.parse(String(post?.createdAt || "").trim()))
      .filter((timestamp) => Number.isFinite(timestamp))
      .sort((left, right) => left - right);
    const hourCounts = Array.from({ length: 24 }, () => 0);
    const weekdayCounts = Array.from({ length: 7 }, () => 0);
    const gapCounts = options.gapBuckets.map(() => 0);
    const heatmap = Array.from({ length: 12 }, () => Array.from({ length: 7 }, () => 0));

    timestamps.forEach((timestamp) => {
      const date = new Date(timestamp);
      const hour = date.getUTCHours();
      hourCounts[hour] += 1;
      const weekdayIndex = (date.getUTCDay() + 6) % 7;
      weekdayCounts[weekdayIndex] += 1;
      heatmap[Math.floor(hour / 2)][weekdayIndex] += 1;
    });

    const gapsMinutes = [];
    for (let index = 1; index < timestamps.length; index += 1) {
      const diffMinutes = Math.max(0, (timestamps[index] - timestamps[index - 1]) / 60000);
      gapsMinutes.push(diffMinutes);
      const bucketIndex = options.gapBuckets.findIndex((bucket) => diffMinutes <= bucket.maxMinutes);
      gapCounts[Math.max(0, bucketIndex)] += 1;
    }

    const totalPosts = Math.max(timestamps.length, 1);
    let medianGapMinutes = Number.NaN;
    if (gapsMinutes.length) { medianGapMinutes = gapsMinutes.slice().sort((left, right) => left - right)[Math.floor(gapsMinutes.length / 2)]; }
    const latestTimestamp = timestamps[timestamps.length - 1] || options.now();
    const dayBuckets = new Map();
    timestamps.forEach((timestamp) => {
      const dayKey = startOfUtcDay(timestamp);
      if (!dayBuckets.has(dayKey)) {
        dayBuckets.set(dayKey, []);
      }
      dayBuckets.get(dayKey).push(new Date(timestamp).getUTCHours() + (new Date(timestamp).getUTCMinutes() / 60));
    });
    const recentDays = [];
    const latestDay = startOfUtcDay(latestTimestamp);
    for (let offset = 29; offset >= 0; offset -= 1) {
      const dayStart = latestDay - (offset * 86400000);
      const date = new Date(dayStart);
      recentDays.push({
        key: dayStart,
        label: `${String(date.getUTCDate()).padStart(2, "0")}.${String(date.getUTCMonth() + 1).padStart(2, "0")}.`,
        weekdayLabel: getWeekdayLabel((date.getUTCDay() + 6) % 7),
        hours: (dayBuckets.get(dayStart) || []).slice().sort((left, right) => left - right),
      });
    }

    return {
      timestamps,
      hourCounts,
      hourShares: options.shares(hourCounts),
      weekdayCounts,
      weekdayShares: options.shares(weekdayCounts),
      gapCounts,
      gapShares: options.shares(gapCounts),
      gapProfile: options.gapBuckets.map((bucket, index) => ({
        labelKey: bucket.labelKey,
        share: gapCounts[index] / Math.max(gapsMinutes.length, 1),
      })),
      medianGapMinutes,
      topHours: getTopChronologicalLabelsFromHistogram(hourCounts, (hour) => formatUtcHourLabel(hour), 3),
      topWeekdays: getTopChronologicalLabelsFromHistogram(weekdayCounts, (weekday) => getWeekdayLabel(weekday), 3),
      topHourEntries: getTopChronologicalEntriesFromHistogram(hourCounts, (hour) => formatUtcHourLabel(hour), 3),
      topWeekdayEntries: getTopChronologicalEntriesFromHistogram(weekdayCounts, (weekday) => getWeekdayLabel(weekday), 3),
      activeHourCount: hourCounts.filter((count) => count > 0).length,
      totalPosts,
      heatmap,
      recentDays,
    };
  }

  /** Compares sorted timestamps within an inclusive minute window. @param {number[]} leftTimestamps - Sorted left timestamps. @param {number[]} rightTimestamps - Sorted right timestamps. @param {number} windowMinutes - Inclusive tolerance. @returns {number} Symmetric proximity. */
  function computeAnalysisTemporalProximityScore(leftTimestamps = [], rightTimestamps = [], windowMinutes = 5) {
    let left = [];
    if (Array.isArray(leftTimestamps)) { left = leftTimestamps; }
    let right = [];
    if (Array.isArray(rightTimestamps)) { right = rightTimestamps; }
    if (!left.length || !right.length) {
      return 0;
    }
    const windowMs = windowMinutes * 60000;
    const countMatches = (source, target) => {
      let matches = 0;
      let pointer = 0;
      source.forEach((timestamp) => {
        while (pointer < target.length && target[pointer] < timestamp - windowMs) {
          pointer += 1;
        }
        let before = Number.POSITIVE_INFINITY;
        if (pointer > 0) { before = Math.abs(target[pointer - 1] - timestamp); }
        let current = Number.POSITIVE_INFINITY;
        if (pointer < target.length) { current = Math.abs(target[pointer] - timestamp); }
        if (Math.min(before, current) <= windowMs) {
          matches += 1;
        }
      });
      return matches / source.length;
    };
    return (countMatches(left, right) + countMatches(right, left)) / 2;
  }

  /** Calculates nearest-match UTC heatmap from sorted timestamps. @param {number[]} leftTimestamps - Sorted left timestamps. @param {number[]} rightTimestamps - Sorted right timestamps. @param {number} windowMinutes - Inclusive tolerance. @returns {number[][]} Twelve by seven overlap grid. */
  function computeAnalysisTemporalOverlapHeatmap(leftTimestamps = [], rightTimestamps = [], windowMinutes = 10) {
    const heatmap = Array.from({ length: 12 }, () => Array.from({ length: 7 }, () => 0));
    let left = [];
    if (Array.isArray(leftTimestamps)) { left = leftTimestamps; }
    let right = [];
    if (Array.isArray(rightTimestamps)) { right = rightTimestamps; }
    if (!left.length || !right.length) {
      return heatmap;
    }
    const windowMs = windowMinutes * 60000;
    let pointer = 0;
    left.forEach((timestamp) => {
      while (pointer < right.length && right[pointer] < timestamp - windowMs) {
        pointer += 1;
      }
      const candidateIndexes = [pointer - 1, pointer, pointer + 1];
      let bestTimestamp = null;
      let bestDiff = Number.POSITIVE_INFINITY;
      candidateIndexes.forEach((index) => {
        if (index < 0 || index >= right.length) {
          return;
        }
        const diff = Math.abs(right[index] - timestamp);
        if (diff <= windowMs && diff < bestDiff) {
          bestDiff = diff;
          bestTimestamp = Math.round((right[index] + timestamp) / 2);
        }
      });
      if (bestTimestamp !== null) {
        const date = new Date(bestTimestamp);
        const weekdayIndex = (date.getUTCDay() + 6) % 7;
        const bucketIndex = Math.floor(date.getUTCHours() / 2);
        heatmap[bucketIndex][weekdayIndex] += 1;
      }
    });
    return heatmap;
  }

  /** Calculates a histogram share. @param {number} count - Count. @param {number} total - Total. @returns {number} Share. */
  function histogramShare(count, total) { if (total) { return (Number(count) || 0) / total; } return 0; }
  return { profile: createAnalysisTemporalProfile, hourLabel: formatUtcHourLabel, weekdayLabel: getWeekdayLabel, topLabels: getTopLabelsFromHistogram, topChronologicalLabels: getTopChronologicalLabelsFromHistogram, topChronologicalEntries: getTopChronologicalEntriesFromHistogram, proximity: computeAnalysisTemporalProximityScore, overlapHeatmap: computeAnalysisTemporalOverlapHeatmap };
}
