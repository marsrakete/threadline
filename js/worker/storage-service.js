/** Creates the shared IndexedDB/auth store adapter without changing database schema.
 * @param {object} options - indexedDB getter, database/store names/version, auth key/normalizer and messages.
 * @returns {object} Frozen open/read/write/readAuth/writeAuth/clearAuth API.
 */
globalThis.createThreadlineStorageService = function createThreadlineStorageService(options) {
  for (const name of ["indexedDB", "normalizeAuth", "webCrypto"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Worker storage requires " + name);
    }
  }
  const { messages } = options;
  const encoder = new TextEncoder();
  const AUTH_ENCRYPTION_FORMAT = "threadline-auth-v1";
  let encryptionKeyPromise = null;
  /** Creates an auth storage error with a UI-localizable code. @param {string} code - Error identifier. @param {string} message - Fallback message. @returns {Error} Error carrying its public code. */
  function authStorageError(code, message) {
    const error = new Error(message);
    error.details = { code };
    return error;
  }
  /** Opens the database and creates missing existing stores on upgrade. @returns {Promise<IDBDatabase>} Database. */
  function open() {
    return new Promise((resolve, reject) => {
      const request = options.indexedDB().open(options.databaseName, options.databaseVersion);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(options.storeName)) {
          database.createObjectStore(options.storeName);
        }
        if (!database.objectStoreNames.contains(options.imageStoreName)) {
          database.createObjectStore(options.imageStoreName, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(messages.open));
    });
  }
  /** Runs one store request against an already opened database.
   * @param {IDBDatabase} database - Database. @param {string} operation - get/put/delete.
   * @param {string} key - Store key. @param {unknown} value - Write value.
   * @returns {Promise<unknown>} Existing request success value; errors retain request identity.
   */
  function request(database, operation, key, value) {
    return new Promise((resolve, reject) => {
      let mode = "readwrite";
      if (operation === "get") {
        mode = "readonly";
      }
      const transaction = database.transaction(options.storeName, mode);
      const store = transaction.objectStore(options.storeName);
      let action, fallback = messages.write;
      if (operation === "get") {
        action = store.get(key);
        fallback = messages.read;
      } else if (operation === "delete") {
        action = store.delete(key);
        fallback = messages.remove;
      } else {
        action = store.put(value, key);
      }
      action.onsuccess = () => {
        if (operation === "get") {
          resolve(action.result);
        } else if (operation === "delete") {
          resolve();
        } else {
          resolve(value);
        }
      };
      action.onerror = () => reject(action.error || new Error(fallback));
    });
  }
  /** Loads or creates a non-exportable AES-GCM key held by IndexedDB as a CryptoKey. @param {IDBDatabase} database - Open database. @param {boolean} create - Whether a missing key should be created. @returns {Promise<CryptoKey>} Key. */
  async function getAuthEncryptionKey(database, create) {
    const keyName = options.authEncryptionKey || `${options.authKey}-encryption-key`;
    const readExistingKey = async () => {
      const key = await request(database, "get", keyName);
      if (key) {
        if (key.type !== "secret" || key.extractable !== false || key.algorithm?.name !== "AES-GCM") {
          throw authStorageError("AUTH_STORAGE_DECRYPT_FAILED", messages.authEncryptionFailed);
        }
        return key;
      }
      return null;
    };
    const existingKey = await readExistingKey();
    if (existingKey) {
      return existingKey;
    }
    if (!create) {
      throw authStorageError("AUTH_STORAGE_DECRYPT_FAILED", messages.authEncryptionFailed);
    }
    if (!encryptionKeyPromise) {
      encryptionKeyPromise = (async () => {
        const webCrypto = options.webCrypto();
        if (!webCrypto?.subtle || typeof webCrypto.getRandomValues !== "function") {
          throw authStorageError("AUTH_STORAGE_ENCRYPTION_UNAVAILABLE", messages.authEncryptionUnavailable);
        }
        const key = await webCrypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
        await request(database, "put", keyName, key);
        return await readExistingKey() || key;
      })().catch((error) => {
        encryptionKeyPromise = null;
        throw error;
      });
    }
    return encryptionKeyPromise;
  }
  /** Encrypts normalized account credentials before they reach IndexedDB. @param {IDBDatabase} database - Open database. @param {object} value - Normalized auth. @returns {Promise<object>} Encrypted envelope. */
  async function encryptAuth(database, value) {
    const webCrypto = options.webCrypto();
    if (!webCrypto?.subtle || typeof webCrypto.getRandomValues !== "function") {
      throw authStorageError("AUTH_STORAGE_ENCRYPTION_UNAVAILABLE", messages.authEncryptionUnavailable);
    }
    const key = await getAuthEncryptionKey(database, true);
    const iv = webCrypto.getRandomValues(new Uint8Array(12));
    const algorithm = { name: "AES-GCM", iv, additionalData: encoder.encode(AUTH_ENCRYPTION_FORMAT) };
    const plaintext = encoder.encode(JSON.stringify(value));
    const ciphertext = await webCrypto.subtle.encrypt(algorithm, key, plaintext);
    return { format: AUTH_ENCRYPTION_FORMAT, iv, ciphertext };
  }
  /** Decrypts a stored auth envelope while rejecting missing or damaged keys. @param {IDBDatabase} database - Open database. @param {object} envelope - Encrypted auth. @returns {Promise<object>} Auth data. */
  async function decryptAuth(database, envelope) {
    try {
      if (envelope?.format !== AUTH_ENCRYPTION_FORMAT || !(envelope.iv instanceof Uint8Array)
        || Object.prototype.toString.call(envelope.ciphertext) !== "[object ArrayBuffer]") {
        throw authStorageError("AUTH_STORAGE_DECRYPT_FAILED", messages.authEncryptionFailed);
      }
      const webCrypto = options.webCrypto();
      if (!webCrypto?.subtle) {
        throw authStorageError("AUTH_STORAGE_ENCRYPTION_UNAVAILABLE", messages.authEncryptionUnavailable);
      }
      const key = await getAuthEncryptionKey(database, false);
      const algorithm = { name: "AES-GCM", iv: envelope.iv, additionalData: encoder.encode(AUTH_ENCRYPTION_FORMAT) };
      const plaintext = await webCrypto.subtle.decrypt(algorithm, key, envelope.ciphertext);
      return JSON.parse(new TextDecoder().decode(plaintext));
    } catch (error) {
      if (error?.details?.code === "AUTH_STORAGE_ENCRYPTION_UNAVAILABLE") {
        throw error;
      }
      const failure = authStorageError("AUTH_STORAGE_DECRYPT_FAILED", messages.authEncryptionFailed);
      failure.cause = error;
      throw failure;
    }
  }
  /** Reads a general value, converting only nullish results to null. @param {string} key - Key. @returns {Promise<unknown>} Value/null. */
  async function read(key) {
    const database = await open();
    return (await request(database, "get", key)) ?? null;
  }
  /** Writes a general value. @param {string} key - Key. @param {unknown} value - Value. @returns {Promise<unknown>} Original value. */
  async function write(key, value) {
    const database = await open();
    return request(database, "put", key, value);
  }
  /** Reads and normalizes stored auth. @returns {Promise<object>} Auth state. */
  async function readAuth() {
    const database = await open();
    const raw = await request(database, "get", options.authKey);
    if (!raw) {
      return options.normalizeAuth(null);
    }
    if (raw.format === AUTH_ENCRYPTION_FORMAT) {
      return await decryptAuth(database, raw);
    }
    const normalized = options.normalizeAuth(raw);
    await request(database, "put", options.authKey, await encryptAuth(database, normalized));
    return normalized;
  }
  /** Opens before normalization, then writes normalized auth. @param {unknown} value - Auth input. @returns {Promise<object>} Stored auth state. */
  async function writeAuth(value) {
    const database = await open();
    const normalized = options.normalizeAuth(value);
    await request(database, "put", options.authKey, await encryptAuth(database, normalized));
    return normalized;
  }
  /** Deletes the existing auth key. @returns {Promise<void>} Completes on delete success. */
  async function clearAuth() {
    const database = await open();
    await request(database, "delete", options.authKey);
    await request(database, "delete", options.authEncryptionKey || `${options.authKey}-encryption-key`);
    encryptionKeyPromise = null;
  }
  return Object.freeze({ open, read, write, readAuth, writeAuth, clearAuth });
};
