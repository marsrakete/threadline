/** Creates encrypted OAuth stores without changing the legacy account database. @param {object} options - IndexedDB, WebCrypto and SDK key adapters. @returns {object} OAuth SDK state and session stores. */
globalThis.createThreadlineOAuthStorage = function createThreadlineOAuthStorage({ indexedDB, keyRange, crypto, Key, now }) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let databasePromise;
  let sealingKeyPromise;

  /** Opens the independent OAuth store. @returns {Promise<IDBDatabase>} Open database. */
  function open() {
    if (!databasePromise) {
      databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open("threadline-oauth", 1);
        request.onupgradeneeded = () => {
          const database = request.result;
          database.createObjectStore("keys");
          database.createObjectStore("sessions");
          database.createObjectStore("states").createIndex("expiresAt", "expiresAt");
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }).catch((error) => {
        databasePromise = undefined;
        throw error;
      });
    }
    return databasePromise;
  }

  /** Runs one operation and waits for transaction commit. @param {string} table - Store name. @param {string} mode - Transaction mode. @param {Function} run - Operation returning its IndexedDB request. @returns {Promise<unknown>} Request result. */
  async function transaction(table, mode, run) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(table, mode);
      const request = run(transaction.objectStore(table));
      transaction.oncomplete = () => resolve(request?.result);
      transaction.onabort = () => reject(transaction.error || new Error("OAuth storage transaction aborted"));
    });
  }

  /** Reuses the locally stored sealing key or sets it atomically. @returns {Promise<CryptoKey>} Non-exportable AES key. */
  function sealingKey() {
    if (!sealingKeyPromise) {
      sealingKeyPromise = (async () => {
        const existing = await transaction("keys", "readonly", (store) => store.get("seal"));
        if (existing) { return existing; }
        const generated = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
        const added = await transaction("keys", "readwrite", (store) => store.add(generated, "seal")).catch((error) => {
          if (error.name !== "ConstraintError") { throw error; }
        });
        if (added) { return generated; }
        return transaction("keys", "readonly", (store) => store.get("seal"));
      })().catch((error) => {
        sealingKeyPromise = undefined;
        throw error;
      });
    }
    return sealingKeyPromise;
  }

  /** Constructs an SDK store with encrypted JSON and a structured-cloned signing key. @param {string} table - Store name. @returns {object} SDK get/set/del interface. */
  function createStore(table) {
    /** Supplies authenticated data binding a record to its table and key. @param {string} key - Record ID. @param {Uint8Array} iv - AES nonce. @returns {object} AES-GCM arguments. */
    function encryption(key, iv) {
      return { name: "AES-GCM", iv, additionalData: encoder.encode(table + ":" + key) };
    }
    /** Deletes a record. @param {string} key - Record ID. @returns {Promise<void>} Commit. */
    async function del(key) {
      await transaction(table, "readwrite", (store) => store.delete(key));
    }
    /** Reads and checks the expiry of a stored record. @param {string} key - Record ID. @returns {Promise<object|undefined>} SDK data. */
    async function get(key) {
      const record = await transaction(table, "readonly", (store) => store.get(key));
      if (!record) { return undefined; }
      if (record.expiresAt && record.expiresAt <= now()) {
        await del(key);
        return undefined;
      }
      const clear = await crypto.subtle.decrypt(encryption(key, record.iv), await sealingKey(), record.sealed);
      const dpopKey = await Key.fromKeypair(record.keyPair, record.keyId);
      return { ...JSON.parse(decoder.decode(clear)), dpopKey };
    }
    /** Saves an SDK record with a ten-minute authorization-state lifetime. @param {string} key - Record ID. @param {object} value - SDK data. @returns {Promise<void>} Commit. */
    async function set(key, value) {
      const { dpopKey, ...data } = value;
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const sealed = await crypto.subtle.encrypt(encryption(key, iv), await sealingKey(), encoder.encode(JSON.stringify(data)));
      const record = { iv, sealed, keyId: dpopKey.kid, keyPair: dpopKey.cryptoKeyPair };
      if (table === "states") { record.expiresAt = now() + 600_000; }
      await transaction(table, "readwrite", (store) => {
        if (table === "states") {
          const expired = store.index("expiresAt").getAllKeys(keyRange.upperBound(now()));
          expired.onsuccess = () => {
            for (const expiredKey of expired.result) { store.delete(expiredKey); }
          };
        }
        return store.put(record, key);
      });
    }
    return Object.freeze({ get, set, del });
  }

  return Object.freeze({ stateStore: createStore("states"), sessionStore: createStore("sessions") });
};
