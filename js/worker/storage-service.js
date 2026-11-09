/** Creates the shared IndexedDB/auth store adapter without changing database schema.
 * @param {object} options - indexedDB getter, database/store names/version, auth key/normalizer and messages.
 * @returns {object} Frozen open/read/write/readAuth/writeAuth/clearAuth API.
 */
globalThis.createThreadlineStorageService = function createThreadlineStorageService(options) {
  for (const name of ["indexedDB", "normalizeAuth"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError("Worker storage requires " + name);
    }
  }
  const { messages } = options;
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
    return options.normalizeAuth(raw || null);
  }
  /** Opens before normalization, then writes normalized auth. @param {unknown} value - Auth input. @returns {Promise<object>} Stored auth state. */
  async function writeAuth(value) {
    const database = await open();
    const normalized = options.normalizeAuth(value);
    return request(database, "put", options.authKey, normalized);
  }
  /** Deletes the existing auth key. @returns {Promise<void>} Completes on delete success. */
  async function clearAuth() {
    const database = await open();
    await request(database, "delete", options.authKey);
  }
  return Object.freeze({ open, read, write, readAuth, writeAuth, clearAuth });
};
