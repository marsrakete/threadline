export const POST_LANGUAGE_CODES = [
  "af", "am", "ar", "as", "az", "be", "bg", "bn", "bho", "br", "bs", "ca",
  "ceb", "ckb", "co", "cs", "cy", "da", "de", "el", "en", "eo", "es", "et",
  "eu", "fa", "fi", "fr", "fy", "ga", "gd", "gl", "gu", "ha", "he", "hi",
  "hr", "hu", "hy", "id", "ig", "is", "it", "ja", "jv", "ka", "kk", "km",
  "kn", "ko", "ku", "la", "lb", "lo", "lt", "lv", "mi", "mk", "ml", "mn",
  "mr", "ms", "mt", "my", "ne", "nl", "no", "or", "pa", "pl", "ps", "pt",
  "ro", "ru", "sa", "si", "sk", "sl", "so", "sq", "sr", "su", "sv", "sw",
  "ta", "te", "th", "tl", "tr", "ug", "uk", "ur", "uz", "vi", "xh", "yi",
  "yo", "zh", "zu",
];

const POST_LANGUAGE_CODE_SET = new Set(POST_LANGUAGE_CODES);

const EXTRA_LANGUAGE_NAMES = {
  de: {
    bho: "Bhodschpuri",
    ceb: "Cebuano",
    ckb: "Sorani-Kurdisch",
    co: "Korsisch",
    fy: "Westfriesisch",
    gd: "Schottisch-Gaelisch",
    ig: "Igbo",
    jv: "Javanisch",
    lb: "Luxemburgisch",
    mi: "Maori",
    or: "Oriya",
    sa: "Sanskrit",
    su: "Sundanesisch",
    tl: "Tagalog",
    ug: "Uigurisch",
    yi: "Jiddisch",
    yo: "Yoruba",
    zu: "Zulu",
  },
  en: {
    bho: "Bhojpuri",
    ceb: "Cebuano",
    ckb: "Sorani Kurdish",
    co: "Corsican",
    fy: "West Frisian",
    gd: "Scottish Gaelic",
    ig: "Igbo",
    jv: "Javanese",
    lb: "Luxembourgish",
    mi: "Maori",
    or: "Odia",
    sa: "Sanskrit",
    su: "Sundanese",
    tl: "Tagalog",
    ug: "Uyghur",
    yi: "Yiddish",
    yo: "Yoruba",
    zu: "Zulu",
  },
  fr: {
    bho: "Bhojpuri",
    ceb: "Cebuano",
    ckb: "Kurde sorani",
    co: "Corse",
    fy: "Frison occidental",
    gd: "Gaelique ecossais",
    ig: "Igbo",
    jv: "Javanais",
    lb: "Luxembourgeois",
    mi: "Maori",
    or: "Odia",
    sa: "Sanskrit",
    su: "Soundanais",
    tl: "Tagalog",
    ug: "Ouighour",
    yi: "Yiddish",
    yo: "Yoruba",
    zu: "Zoulou",
  },
};

const displayNameCache = new Map();

function getDisplayLocale(locale = "en") {
  const primary = String(locale || "en").toLowerCase().split("-")[0];
  if (primary === "de" || primary === "fr") {
    return primary;
  }
  return "en";
}

function normalizeForSearch(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function canonicalizeLanguageTag(tag) {
  const raw = String(tag || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const locale = new Intl.Locale(raw);
    return locale.language || locale.toString();
  } catch {
    return raw.toLowerCase();
  }
}

export function normalizePostLanguageTags(tags, max = 3) {
  const values = Array.isArray(tags) ? tags : [tags];
  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    const tag = canonicalizeLanguageTag(value);
    if (!tag || !POST_LANGUAGE_CODE_SET.has(tag) || seen.has(tag)) {
      continue;
    }
    seen.add(tag);
    normalized.push(tag);
    if (normalized.length >= max) {
      break;
    }
  }

  return normalized;
}

export function inferDefaultPostLanguages(appLocale = "en") {
  const primary = canonicalizeLanguageTag(appLocale);
  if (primary && POST_LANGUAGE_CODE_SET.has(primary)) {
    return [primary];
  }
  return ["en"];
}

export function resolveThreadIntroLocale(postLanguages, fallbackLocale = "en") {
  const primary = normalizePostLanguageTags(postLanguages, 1)[0];
  if (primary === "de" || primary === "en" || primary === "fr") {
    return primary;
  }
  return getDisplayLocale(fallbackLocale);
}

export function getPostLanguageDisplayName(tag, locale = "en") {
  const normalizedTag = canonicalizeLanguageTag(tag);
  const displayLocale = getDisplayLocale(locale);
  const cacheKey = `${displayLocale}:${normalizedTag}`;
  if (displayNameCache.has(cacheKey)) {
    return displayNameCache.get(cacheKey);
  }

  let label = "";
  try {
    label = new Intl.DisplayNames([displayLocale], { type: "language" }).of(normalizedTag) || "";
  } catch {
    label = "";
  }

  if (!label || label.toLowerCase() === normalizedTag.toLowerCase()) {
    label = EXTRA_LANGUAGE_NAMES[displayLocale]?.[normalizedTag]
      || EXTRA_LANGUAGE_NAMES.en[normalizedTag]
      || normalizedTag;
  }

  displayNameCache.set(cacheKey, label);
  return label;
}

export function getPostLanguageOptions(locale = "en", searchTerm = "") {
  const search = normalizeForSearch(searchTerm);

  return POST_LANGUAGE_CODES
    .map((code) => ({
      code,
      name: getPostLanguageDisplayName(code, locale),
    }))
    .filter((entry) => {
      if (!search) {
        return true;
      }
      return normalizeForSearch(entry.name).includes(search) || entry.code.includes(search);
    })
    .sort((left, right) => left.name.localeCompare(right.name, locale));
}
