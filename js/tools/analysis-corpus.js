/** Creates locale-aware corpus feature calculations with explicit lexicons. @param {object} options - Locale provider, functionWords and numberWords. @returns {object} Corpus and ranked frequency operations. */
export function createAnalysisCorpusAnalyzer(options) {
  /** Counts regex matches in plain text. @param {unknown} text - Text. @param {RegExp} regex - Pattern. @returns {number} Match count. */
  function countRegexMatches(text, regex) {
    const matches = String(text || "").match(regex);
    if (matches) { return matches.length; }
    return 0;
  }
  /** Ranks qualifying frequency entries. @param {Map} frequencyMap - Counts. @param {number} denominator - Share denominator. @param {number} limit - Maximum entries. @param {number} minimumCount - Cutoff. @returns {object[]} Ranked entries. */
  function getAnalysisTopEntriesFromMap(frequencyMap, denominator, limit = 10, minimumCount = 1) {
    const safeDenominator = Math.max(1, Number(denominator) || 1);
    return Array.from(frequencyMap.entries())
      .filter(([, count]) => (Number(count) || 0) >= minimumCount)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], options.locale()))
      .slice(0, limit)
      .map(([label, count]) => ({
        label,
        count,
        share: count / safeDenominator,
      }));
  }
  /** Calculates textual features with unchanged tokenization and denominator rules. @param {unknown[]} texts - Post texts. @returns {object} Corpus, frequency maps and metrics. */
  function createAnalysisCorpus(texts = []) {
    let normalizedInput = [];
    if (Array.isArray(texts)) { normalizedInput = texts; }
    const normalizedPosts = (normalizedInput)
      .map((text) => String(text || "").trim())
      .filter(Boolean);
    const joinedText = normalizedPosts.join("\n");
    const withoutUrls = joinedText.replace(/https?:\/\/\S+/giu, " ");
    const lowercase = withoutUrls.toLowerCase();
    const words = lowercase.match(/\p{L}+(?:['\u2019-]\p{L}+)*/gu) || [];
    const tokensWithNumbers = lowercase.match(/\p{L}+(?:['\u2019-]\p{L}+)*|\p{N}+/gu) || [];
    const sentences = withoutUrls
      .split(/[.!?]+/u)
      .map((entry) => entry.trim())
      .filter(Boolean);
    const characters = Array.from(withoutUrls);
    const letters = characters.filter((character) => /\p{L}/u.test(character));
    const uppercaseLetters = characters.filter((character) => /\p{Lu}/u.test(character));
    const emojiMatches = withoutUrls.match(/\p{Extended_Pictographic}/gu) || [];
    const wordFrequency = new Map();
    const trigramFrequency = new Map();
    const emojiFrequency = new Map();
    const bigramFrequency = new Map();
    const phraseFrequency = new Map();
    const postStartFrequency = new Map();
    const postEndFrequency = new Map();
    const punctuationFrequency = new Map();
    const functionWordFrequency = new Map();

    emojiMatches.forEach((emoji) => {
      emojiFrequency.set(emoji, (emojiFrequency.get(emoji) || 0) + 1);
    });

    for (const word of words) {
      if (word.length >= 2 && word.length <= 12) {
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
      }
      if (word.length >= 3) {
        for (let index = 0; index <= word.length - 3; index += 1) {
          const trigram = word.slice(index, index + 3);
          trigramFrequency.set(trigram, (trigramFrequency.get(trigram) || 0) + 1);
        }
      }
    }

    for (let index = 0; index < words.length - 1; index += 1) {
      const bigram = `${words[index]} ${words[index + 1]}`;
      bigramFrequency.set(bigram, (bigramFrequency.get(bigram) || 0) + 1);
    }

    for (let index = 0; index < words.length - 2; index += 1) {
      const phrase = `${words[index]} ${words[index + 1]} ${words[index + 2]}`;
      phraseFrequency.set(phrase, (phraseFrequency.get(phrase) || 0) + 1);
    }

    options.functionWords.forEach((word) => {
      const count = wordFrequency.get(word) || 0;
      if (count > 0) {
        functionWordFrequency.set(word, count);
      }
    });

    const punctuationDefinitions = [
      ["...", /\.\.\./g],
      ["?!", /\?!/g],
      ["!?", /!\?/g],
      ["!!", /!!+/g],
      ["??", /\?\?+/g],
      ["!", /!/g],
      ["?", /\?/g],
      [",", /,/g],
      [":", /:/g],
      [";", /;/g],
      ["()", /[()]/g],
      ["-", /[-\u2013\u2014]/g],
      ['"', /["\u201c\u201d\u201e]/g],
    ];
    punctuationDefinitions.forEach(([label, regex]) => {
      punctuationFrequency.set(label, countRegexMatches(joinedText, regex));
    });

    normalizedPosts.forEach((post) => {
      const postWords = post.toLowerCase().match(/\p{L}+(?:['\u2019-]\p{L}+)*/gu) || [];
      if (postWords.length > 0) {
        const start = postWords.slice(0, Math.min(2, postWords.length)).join(" ");
        const end = postWords.slice(Math.max(0, postWords.length - 2)).join(" ");
        postStartFrequency.set(start, (postStartFrequency.get(start) || 0) + 1);
        postEndFrequency.set(end, (postEndFrequency.get(end) || 0) + 1);
      }
    });

    const totalWords = Math.max(words.length, 1);
    const totalSentences = Math.max(sentences.length, 1);
    const totalLetters = Math.max(letters.length, 1);
    const uniqueWords = new Set(words);
    const totalPosts = Math.max(normalizedPosts.length, 1);
    const wordLengthBuckets = [
      { labelKey: "analysisWordLengthShort", count: words.filter((word) => word.length <= 3).length },
      { labelKey: "analysisWordLengthMedium", count: words.filter((word) => word.length >= 4 && word.length <= 6).length },
      { labelKey: "analysisWordLengthLong", count: words.filter((word) => word.length >= 7 && word.length <= 9).length },
      { labelKey: "analysisWordLengthVeryLong", count: words.filter((word) => word.length >= 10).length },
    ].map((entry) => ({
      ...entry,
      share: entry.count / totalWords,
    }));

    const postsWithLinks = normalizedPosts.filter((post) => /https?:\/\/\S+/iu.test(post)).length;
    const postsWithHashtags = normalizedPosts.filter((post) => /(^|\s)#[\p{L}\p{N}_]+/u.test(post)).length;
    const postsWithMentions = normalizedPosts.filter((post) => /(^|\s)@[a-z0-9._:-]+/iu.test(post)).length;
    const blankLinePosts = normalizedPosts.filter((post) => /\n\s*\n/u.test(post)).length;
    const oneSentencePosts = normalizedPosts.filter((post) => {
      const postSentences = post.split(/[.!?]+/u).map((entry) => entry.trim()).filter(Boolean);
      return postSentences.length <= 1;
    }).length;
    const questionEndingPosts = normalizedPosts.filter((post) => /\?\s*$/u.test(post)).length;
    const hashtagEndingPosts = normalizedPosts.filter((post) => /#[\p{L}\p{N}_]+\s*$/u.test(post)).length;
    const linkEndingPosts = normalizedPosts.filter((post) => /https?:\/\/\S+\s*$/iu.test(post)).length;

    const lineCounts = normalizedPosts.map((post) => Math.max(1, post.split(/\n/u).length));
    const paragraphCounts = normalizedPosts.map((post) => Math.max(1, post.split(/\n\s*\n/u).length));

    const digitsAsTokens = tokensWithNumbers.filter((token) => /^\p{N}+$/u.test(token)).length;
    const numberWords = words.filter((word) => options.numberWords.has(word)).length;
    const allCapsWords = (joinedText.match(/\b\p{Lu}{2,}\b/gu) || []).length;

    return {
      text: withoutUrls,
      words,
      wordCount: words.length,
      sentenceCount: sentences.length,
      letterCount: letters.length,
      emojiCount: emojiMatches.length,
      topWords: getAnalysisTopEntriesFromMap(wordFrequency, totalWords, 10, 2),
      topTrigrams: getAnalysisTopEntriesFromMap(trigramFrequency, totalWords, 12, 2),
      topBigrams: getAnalysisTopEntriesFromMap(bigramFrequency, totalWords, 10, 2),
      topPhrases: getAnalysisTopEntriesFromMap(phraseFrequency, totalWords, 10, 2),
      topEmojis: getAnalysisTopEntriesFromMap(emojiFrequency, totalPosts, 12, 1),
      postStarts: getAnalysisTopEntriesFromMap(postStartFrequency, totalPosts, 8, 1),
      postEnds: getAnalysisTopEntriesFromMap(postEndFrequency, totalPosts, 8, 1),
      functionWords: getAnalysisTopEntriesFromMap(functionWordFrequency, totalWords, 16, 1),
      punctuationProfile: getAnalysisTopEntriesFromMap(punctuationFrequency, totalPosts, 12, 1),
      wordLengthProfile: wordLengthBuckets,
      writingConventions: [
        { labelKey: "analysisConventionUppercaseWords", share: allCapsWords / totalWords },
        { labelKey: "analysisConventionSpaceBeforePunctuation", share: countRegexMatches(joinedText, /\s[,:;!?]/g) / totalPosts },
        { labelKey: "analysisConventionAmpersandUsage", share: countRegexMatches(joinedText, /&/g) / totalPosts },
        { labelKey: "analysisConventionDigitUsage", share: digitsAsTokens / Math.max(tokensWithNumbers.length, 1) },
        { labelKey: "analysisConventionNumberWords", share: numberWords / totalWords },
      ],
      linkBehavior: [
        { labelKey: "analysisBehaviorLinks", share: postsWithLinks / totalPosts },
        { labelKey: "analysisBehaviorHashtags", share: postsWithHashtags / totalPosts },
        { labelKey: "analysisBehaviorMentions", share: postsWithMentions / totalPosts },
        { labelKey: "analysisBehaviorLinkEnding", share: linkEndingPosts / totalPosts },
        { labelKey: "analysisBehaviorHashtagEnding", share: hashtagEndingPosts / totalPosts },
      ],
      structureProfile: [
        {
          labelKey: "analysisStructureLinesPerPost",
          value: lineCounts.reduce((sum, count) => sum + count, 0) / totalPosts,
          formatter: "number",
        },
        {
          labelKey: "analysisStructureParagraphsPerPost",
          value: paragraphCounts.reduce((sum, count) => sum + count, 0) / totalPosts,
          formatter: "number",
        },
        { labelKey: "analysisStructureBlankLines", value: blankLinePosts / totalPosts, formatter: "percent" },
        { labelKey: "analysisStructureOneSentence", value: oneSentencePosts / totalPosts, formatter: "percent" },
        { labelKey: "analysisStructureQuestionEnding", value: questionEndingPosts / totalPosts, formatter: "percent" },
      ],
      frequency: {
        words: wordFrequency,
        trigrams: trigramFrequency,
        bigrams: bigramFrequency,
        phrases: phraseFrequency,
        functionWords: functionWordFrequency,
      },
      metrics: {
        avgWordLength: words.reduce((sum, word) => sum + word.length, 0) / totalWords,
        avgSentenceLength: words.length / totalSentences,
        uniqueWordShare: uniqueWords.size / totalWords,
        uppercaseRate: uppercaseLetters.length / totalLetters,
        emojiRate: emojiMatches.length / totalWords,
        exclamationRate: ((withoutUrls.match(/!/g) || []).length) / totalWords,
        questionRate: ((withoutUrls.match(/\?/g) || []).length) / totalWords,
        commaRate: ((withoutUrls.match(/,/g) || []).length) / totalWords,
        shortWordShare: words.filter((word) => word.length <= 3).length / totalWords,
        longWordShare: words.filter((word) => word.length >= 8).length / totalWords,
      },
    };
  }
  return { create: createAnalysisCorpus, topEntries: getAnalysisTopEntriesFromMap };
}
