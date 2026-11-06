/** Existing German worker messages; kept separate from DM collection and transport. */
globalThis.ThreadlineDmMessages = Object.freeze({
  selectPartner: "Bitte zuerst genau einen DM-Partner auswählen.",
  archiveTitle: "Direct Messages werden geladen",
  conversationRead: "Unterhaltung {index}/{count} wird gelesen",
  messagesCollected: "{count} Nachrichten lokal gesammelt",
  archiveAssemble: "DM-Archiv wird zusammengestellt …",
  archiveSummary: "{conversations} Konversationen · {messages} Nachrichten",
  partnersTitle: "DM-Partner werden geladen",
  listRead: "Konversationsliste wird gelesen …",
  partnersFound: "{count} DM-Partner gefunden",
  listMore: "Weitere Konversationsseiten werden geladen …",
  listAvatars: "Partnerliste geladen. Avatar-Bilder werden jetzt gesichert …",
  listComplete: "Partnerliste vollständig geladen.",
  avatarRead: "Avatar-Bilder werden geladen ({index}/{count})",
  partnersComplete: "Partnerliste vollständig geladen",
  partnersReady: "{count} DM-Partner stehen lokal bereit.",
  avatarsSave: "Avatar-Bilder werden gesichert …",
  avatarsPrepare: "{count} Bilder werden vorbereitet",
});

/** Formats an existing DM worker message without interpreting replacement contents.
 * @param {string} key - Message key; unknown keys are rejected.
 * @param {object} values - Literal placeholder values.
 * @returns {string} Existing German message with supplied placeholders replaced once.
 */
globalThis.formatThreadlineDmMessage = function formatThreadlineDmMessage(key, values = {}) {
  if (!Object.hasOwn(globalThis.ThreadlineDmMessages, key)) {
    throw new TypeError("Unknown DM message key: " + key);
  }
  return globalThis.ThreadlineDmMessages[key].replace(/\{(\w+)\}/g, (placeholder, name) => {
    if (Object.hasOwn(values, name)) {
      return String(values[name]);
    }
    return placeholder;
  });
};
