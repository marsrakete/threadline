/**
 * Normalizes persisted desktop layout dimensions and migrates legacy defaults.
 * @param {number|string|null} rawSidebarWidth - Stored sidebar width.
 * @param {number|string|null} rawComposerWidth - Stored composer width.
 * @param {number|string|null} rawLayoutVersion - Stored layout schema version.
 * @param {object} options - Defaults, limits, legacy signatures and clamp callback.
 * @returns {object} Normalized desktop layout state.
 */
export function normalizeStoredDesktopLayout(rawSidebarWidth, rawComposerWidth, rawLayoutVersion, options = {}) {
  const parsedSidebarWidth = Number.isFinite(Number(rawSidebarWidth)) ? Number(rawSidebarWidth) : null;
  const parsedComposerWidth = Number.isFinite(Number(rawComposerWidth)) ? Number(rawComposerWidth) : null;
  const parsedLayoutVersion = Number.isFinite(Number(rawLayoutVersion)) ? Number(rawLayoutVersion) : null;
  const sidebarValue = parsedSidebarWidth == null ? "" : parsedSidebarWidth;
  const composerValue = parsedComposerWidth == null ? "" : parsedComposerWidth;
  const signature = `${sidebarValue}|${composerValue}`;
  const shouldMigrate = parsedLayoutVersion == null && options.legacySignatures?.has(signature);
  if (shouldMigrate) {
    return {
      sidebarWidthDesktop: options.defaultSidebarWidth,
      composerWidthDesktop: options.defaultComposerWidth,
      desktopLayoutVersion: options.layoutVersion,
    };
  }
  return {
    sidebarWidthDesktop: options.clamp(parsedSidebarWidth, options.minSidebarWidth, options.maxSidebarWidth, options.defaultSidebarWidth),
    composerWidthDesktop: options.clamp(parsedComposerWidth, options.minComposerWidth, options.maxComposerWidth, options.defaultComposerWidth),
    desktopLayoutVersion: parsedLayoutVersion == null ? options.layoutVersion : parsedLayoutVersion,
  };
}
