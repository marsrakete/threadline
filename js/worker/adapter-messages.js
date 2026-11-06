/** Existing shared worker transport/auth/storage messages. */
globalThis.ThreadlineAdapterMessages = Object.freeze({
  "insecure": "Insecure service URLs are not allowed. Please use HTTPS.",
  "requestFailed": "Bluesky request failed ({status}).",
  "open": "IndexedDB konnte nicht geoeffnet werden.",
  "read": "Gespeicherte Daten konnten nicht gelesen werden.",
  "write": "Gespeicherte Daten konnten nicht geschrieben werden.",
  "remove": "Gespeicherte Daten konnten nicht geloescht werden.",
  "didMissing": "DID fehlt.",
  "didFailed": "DID-Dokument konnte nicht geladen werden ({status}).",
  "didUnsupported": "Nicht unterstuetztes DID-Format: {did}",
  "didTimeout": "DID-Dokument timed out.",
  "missingCredentials": "Identifier and app password are required.",
  "muEmail": "Mu.social is a web client, not a login server. Use your handle or select the account's PDS.",
  "muResolve": "The account server for this Mu.social handle could not be resolved.",
  "noSession": "Keine gespeicherte Bluesky-Session gefunden.",
  "noPassword": "Die Session ist abgelaufen und es ist kein App-Passwort zum Erneuern gespeichert.",
  "renewFailed": "Session konnte nicht erneuert werden.",
  "refreshWarning": "refreshSession fehlgeschlagen, versuche createSession erneut",
  "connectTimeout": "The Bluesky connectivity check timed out.",
  "connectFailed": "Could not connect to Bluesky."
});
