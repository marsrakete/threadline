import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translations } from "./app-translations.js";

/**
 * Returns the translation table for the requested locale or the default locale fallback.
 * @param {string} locale - Requested locale code such as `de`, `en`, or `fr`.
 * @returns {Record<string, string>} Translation object for the requested locale.
 */
function getTranslationsForLocale(locale) {
  const normalizedLocale = String(locale || "").trim();
  if (translations[normalizedLocale]) {
    return translations[normalizedLocale];
  }

  return translations[DEFAULT_LOCALE];
}

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getTranslationsForLocale,
  translations,
};


/** Creates application translation rendering over an explicit live binding snapshot.
 * @param {object} options - bindings callback supplying DOM controls, translation and domain refresh actions.
 * @returns {object} Render API.
 */
export function createApplicationTranslationRenderer(options) {
  if (typeof options?.bindings !== "function") { throw new TypeError("Translation renderer requires bindings"); }
  /** Refreshes translated controls and domain views in their established order. @returns {void} Updates the current page. */
  function applyTranslations() {
    const { document, currentLocale, updatePrivacyPageLanguageLinks, syncArchiveTransientNoticeFromCatalog, ensureArchiveWorkspaceLayout, t, restoreSearchStatusFromResultState, applyTranslatedTitle, identifierField, passwordField, customServerField, linkCardEndpointInput, linkCardUrlInput, sourceText, hashtagInput, networkSearchInput, renderSearchHashtagSummary, networkAccountInput, archiveThreadUrlInput, postEditCheckUrlInput, renderSearchLanguageSummary, replyTargetUrlInput, threadExplorerUrlInput, savedSearchUrlInput, archiveMediaActorInput, analysisWorkspaceController, loginButton, loginDialogCancelButton, loginDialogCloseTop, addAccountButton, publishButton, getPublishButtonLabel, clearButton, settingsButton, loadThreadButton, helpButton, installButton, saveThreadButton, resetColumnWidthsButton, updateAppearanceModeControls, archiveButton, networkButton, dmButton, networkLoadButton, networkLoading, networkResetButton, archiveNextWaveButton, archiveLoadThreadUrlButton, archiveCheckPostEditButton, archiveSavedSearchesButton, renderArchiveSavedSearchNote, postEditCheckSubmitButton, archiveExportZipButton, archiveExportMediaZipButton, archiveExportHtmlButton, archiveExportHtmlCompactButton, archiveExportPdfButton, archiveActionsExportHtmlButton, archiveActionsExportHtmlCompactButton, archiveProgressExportHtmlCompactButton, renderArchiveZipHtmlScriptHelp, updateArchiveHtmlExportButtons, archiveActionsExportPdfButton, archiveImportButton, updateAuthButtons, renderAccountSwitcher, archiveResetButton, dmLoadButton, dmExportJsonButton, dmExportHtmlButton, dmExportPdfButton, dmCheckButton, dmLoadPartnersButton, dmContactSearchInput, archivePauseButton, archiveResumeButton, archiveCancelButton, renderArchiveProgressHeartbeat, renderArchiveBackgroundNotice, renderVersionLabel, checkUpdatesButton, reloadAppButton, exportSettingsButton, importSettingsButton, shareAppButton, shareQrImage, shareUrl, APP_SHARE_URL, clearHistoryButton, hashtagEditSaveButton, hashtagEditCancelButton, hashtagEditCancelTop, altTextSaveButton, altTextCancelButton, altTextCloseTop, imageEditorSaveButton, imageEditorCancelButton, imageEditorCloseTop, imageFlipHorizontalButton, imageFlipVerticalButton, imageRotateLeftButton, imageResetButton, imageFitDimensionsButton, confirmDialogConfirmButton, confirmDialogCancelButton, publishResultLink, historyButton, composerUnlockButton, composerPostedDismissButton, applySidebarState, altTextPreviewCanvas, hashtagAddButton, nextTipButton, hideTipsButton, postSettingsButton, replyTargetButton, postLanguagesSearch, hashtagPlacementSelect, archiveScopeSelect, archiveContentModeSelect, archiveImageSizeSelect, renderTip, renderHashtagCloud, renderHistoryList, updateTipsVisibility, altTextRequiredToggle, altTextRequired, publishWarning, updateComposerLockState, renderNetworkWorkspace, renderDmWorkspace, languageSelect, localePreference, renderPostLanguageSummary, renderPostInteractionControls, renderPostLanguageDialog, renderReplyTargetCard, renderSegments, renderAnalysisWorkspace, updateStatusForAuth, renderArchiveWorkspace, applyTheme, applyCompactMode } = options.bindings();
    document.documentElement.lang = currentLocale;
    updatePrivacyPageLanguageLinks();
    syncArchiveTransientNoticeFromCatalog();
    ensureArchiveWorkspaceLayout();

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      element.textContent = t(key);
    });
    restoreSearchStatusFromResultState();

    document.querySelectorAll("[data-i18n-title]").forEach((element) => {
      applyTranslatedTitle(element, element.dataset.i18nTitle);
    });

    identifierField.placeholder = "z. B. name.bsky.social";
    passwordField.placeholder = "xxxx-xxxx-xxxx-xxxx";
    customServerField.placeholder = "https://example.com";
    if (linkCardEndpointInput) {
      linkCardEndpointInput.placeholder = "https://example.com/wp-json/threadline/v1/link-card";
    }
    if (linkCardUrlInput) {
      linkCardUrlInput.placeholder = t("linkCardUrlPlaceholder");
    }
    sourceText.placeholder = t("sourcePlaceholder");
    hashtagInput.placeholder = t("hashtagInputPlaceholder");
    if (networkSearchInput) {
      networkSearchInput.placeholder = t("networkSearchPlaceholder");
    }
    document.querySelectorAll(".help-trigger").forEach((element) => {
      element.setAttribute("aria-label", t("contextHelpButtonLabel"));
      element.setAttribute("title", t("contextHelpButtonLabel"));
    });
    renderSearchHashtagSummary();
    if (networkAccountInput) {
      networkAccountInput.placeholder = t("networkAccountInputPlaceholder");
    }
    if (archiveThreadUrlInput) {
      archiveThreadUrlInput.placeholder = t("archiveThreadUrlPlaceholder");
    }
    if (postEditCheckUrlInput) {
      postEditCheckUrlInput.placeholder = t("archiveThreadUrlPlaceholder");
    }
    renderSearchLanguageSummary();
    if (replyTargetUrlInput) {
      replyTargetUrlInput.placeholder = t("archiveThreadUrlPlaceholder");
    }
    if (threadExplorerUrlInput) {
      threadExplorerUrlInput.placeholder = t("threadExplorerUrlPlaceholder");
    }
    if (savedSearchUrlInput) {
      savedSearchUrlInput.placeholder = t("savedSearchUrlPlaceholder");
    }
    if (archiveMediaActorInput) {
      archiveMediaActorInput.placeholder = t("archiveMediaActorPlaceholder");
    }
    analysisWorkspaceController.translate();
    loginButton.textContent = t("loginButton");
    loginDialogCancelButton.textContent = t("cancelButton");
    loginDialogCloseTop.textContent = t("closeButton");
    addAccountButton.textContent = t("addAccountButton");
    publishButton.textContent = getPublishButtonLabel();
    clearButton.textContent = t("clearButton");
    settingsButton.textContent = t("settingsButton");
    loadThreadButton.textContent = t("loadThreadButton");
    helpButton.textContent = t("helpButton");
    installButton.textContent = t("installButton");
    saveThreadButton.textContent = t("saveThreadButton");
    resetColumnWidthsButton.textContent = t("resetColumnWidthsButton");
    updateAppearanceModeControls();
    archiveButton.textContent = t("archiveLaunchButton");
    networkButton.textContent = t("networkLaunchButton");
    dmButton.textContent = t("dmLaunchButton");
    networkLoadButton.textContent = networkLoading ? t("networkLoadingButton") : t("networkLoadButton");
    networkResetButton.textContent = t("networkResetButton");
    archiveNextWaveButton.textContent = t("archiveNextWaveButton");
    if (archiveLoadThreadUrlButton) {
      archiveLoadThreadUrlButton.textContent = t("archiveLoadThreadUrlButton");
    }
    if (archiveCheckPostEditButton) {
      archiveCheckPostEditButton.textContent = t("postEditCheckOpenButton");
    }
    if (archiveSavedSearchesButton) {
      archiveSavedSearchesButton.textContent = t("savedSearchesButton");
    }
    renderArchiveSavedSearchNote();
    if (postEditCheckSubmitButton) {
      postEditCheckSubmitButton.textContent = t("postEditCheckButton");
    }
    archiveExportZipButton.textContent = t("archiveExportZipButton");
    if (archiveExportMediaZipButton) {
      archiveExportMediaZipButton.textContent = t("archiveExportMediaZipButton");
    }
    archiveExportHtmlButton.textContent = t("archiveExportHtmlButton");
    if (archiveExportHtmlCompactButton) {
      archiveExportHtmlCompactButton.textContent = t("archiveExportHtmlCompactButton");
    }
    archiveExportPdfButton.textContent = t("archiveExportPdfButton");
    if (archiveActionsExportHtmlButton) {
      archiveActionsExportHtmlButton.textContent = t("archiveExportHtmlButton");
    }
    if (archiveActionsExportHtmlCompactButton) {
      archiveActionsExportHtmlCompactButton.textContent = t("archiveExportHtmlCompactButton");
    }
    if (archiveProgressExportHtmlCompactButton) {
      archiveProgressExportHtmlCompactButton.textContent = t("archiveExportHtmlCompactButton");
    }
    renderArchiveZipHtmlScriptHelp();
    updateArchiveHtmlExportButtons();
    if (archiveActionsExportPdfButton) {
      archiveActionsExportPdfButton.textContent = t("archiveExportPdfButton");
    }
    archiveImportButton.textContent = t("archiveImportButton");
    updateAuthButtons();
    renderAccountSwitcher();
    archiveResetButton.textContent = t("archiveResetButton");
    dmLoadButton.textContent = t("dmLoadButton");
    dmExportJsonButton.textContent = t("dmExportJsonButton");
    if (dmExportHtmlButton) {
      dmExportHtmlButton.textContent = t("dmExportHtmlButton");
    }
    if (dmExportPdfButton) {
      dmExportPdfButton.textContent = t("dmExportPdfButton");
    }
    dmCheckButton.textContent = t("dmCheckButton");
    dmLoadPartnersButton.textContent = t("dmLoadPartnersButton");
    if (dmContactSearchInput) {
      dmContactSearchInput.placeholder = t("dmContactSearchPlaceholder");
    }
    archivePauseButton.textContent = t("archivePauseButton");
    archiveResumeButton.textContent = t("archiveResumeButton");
    archiveCancelButton.textContent = t("archiveCancelButton");
    renderArchiveProgressHeartbeat();
    renderArchiveBackgroundNotice();
    renderVersionLabel();
    checkUpdatesButton.textContent = t("checkUpdatesButton");
    reloadAppButton.textContent = t("reloadButton");
    exportSettingsButton.textContent = t("exportSettingsButton");
    importSettingsButton.textContent = t("importSettingsButton");
    if (shareAppButton) {
      shareAppButton.textContent = t("shareButton");
    }
    if (shareQrImage) {
      shareQrImage.alt = t("shareQrAlt");
    }
    if (shareUrl) {
      shareUrl.textContent = APP_SHARE_URL;
    }
    clearHistoryButton.textContent = t("clearHistoryButton");
    hashtagEditSaveButton.textContent = t("saveButton");
    hashtagEditCancelButton.textContent = t("cancelButton");
    hashtagEditCancelTop.textContent = t("closeButton");
    altTextSaveButton.textContent = t("saveButton");
    altTextCancelButton.textContent = t("cancelButton");
    altTextCloseTop.textContent = t("closeButton");
    imageEditorSaveButton.textContent = t("saveButton");
    imageEditorCancelButton.textContent = t("cancelButton");
    imageEditorCloseTop.textContent = t("closeButton");
    imageFlipHorizontalButton.textContent = t("flipHorizontalButton");
    imageFlipVerticalButton.textContent = t("flipVerticalButton");
    imageRotateLeftButton.textContent = t("rotateLeftButton");
    imageResetButton.textContent = t("resetImageButton");
    imageFitDimensionsButton.textContent = t("fitImageDimensionsButton");
    confirmDialogConfirmButton.textContent = t("confirmYes");
    confirmDialogCancelButton.textContent = t("confirmNo");
    publishResultLink.textContent = t("openPostLink");
    historyButton.textContent = t("historyButton");
    composerUnlockButton.textContent = t("composerUnlockButton");
    if (composerPostedDismissButton) {
      composerPostedDismissButton.textContent = t("composerPostedDismissButton");
    }
    applySidebarState();
    altTextPreviewCanvas.setAttribute("aria-label", t("altPreviewLabel"));
    hashtagAddButton.textContent = t("addHashtagButton");
    nextTipButton.textContent = t("nextTipButton");
    hideTipsButton.textContent = t("hideTipsButton");
    postSettingsButton.textContent = t("postSettingsButton");
    if (replyTargetButton) {
      replyTargetButton.textContent = t("replyTargetButton");
    }
    postLanguagesSearch.placeholder = t("postLanguagesSearchPlaceholder");
    Array.from(hashtagPlacementSelect.options).forEach((option) => {
      if (option.value === "last") {
        option.textContent = t("hashtagPlacementLast");
      } else if (option.value === "all-top") {
        option.textContent = t("hashtagPlacementAllTop");
      } else if (option.value === "all-bottom") {
        option.textContent = t("hashtagPlacementAllBottom");
      } else {
        option.textContent = t("hashtagPlacementFirst");
      }
    });
    Array.from(archiveScopeSelect.options).forEach((option) => {
      if (option.value === "year") {
        option.textContent = t("archiveScopeYear");
      } else if (option.value === "range") {
        option.textContent = t("archiveScopeRange");
      } else {
        option.textContent = t("archiveScopeAll");
      }
    });
    Array.from(archiveContentModeSelect.options).forEach((option) => {
      if (option.value === "full") {
        option.textContent = t("archiveContentModeFull");
      } else if (option.value === "thread_roots") {
        option.textContent = t("archiveContentModeThreadRoots");
      } else if (option.value === "threads") {
        option.textContent = t("archiveContentModeThreads");
      } else {
        option.textContent = t("archiveContentModePosts");
      }
    });
    Array.from(archiveImageSizeSelect.options).forEach((option) => {
      if (option.value === "small") {
        option.textContent = t("archiveImageSizeSmall");
      } else if (option.value === "large") {
        option.textContent = t("archiveImageSizeLarge");
      } else {
        option.textContent = t("archiveImageSizeMedium");
      }
    });
    renderTip();
    renderHashtagCloud();
    renderHistoryList();
    updateTipsVisibility();
    altTextRequiredToggle.checked = altTextRequired;
    publishWarning.textContent = t("publishAltTextWarning");
    updateComposerLockState();
    renderNetworkWorkspace();
    renderDmWorkspace();

    const languageNames = t("languageNames");
    Array.from(languageSelect.options).forEach((option) => {
      option.textContent = languageNames[option.value] || option.value;
    });
    languageSelect.value = localePreference;
    renderPostLanguageSummary();
    renderPostInteractionControls();
    renderPostLanguageDialog();
    applySidebarState();

    renderReplyTargetCard();
    renderSegments();
    renderAnalysisWorkspace();
    updateStatusForAuth();
    renderArchiveWorkspace();
    applyTheme();
    applyCompactMode();
  }
  return { render: applyTranslations };
}
