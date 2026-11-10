/**
 * Creates a shared stored-ZIP codec without UI, storage or account dependencies.
 * @param {object} options - Required byte-encoding, clock and error-text adapters.
 * @param {(value: string) => Uint8Array} options.encode - UTF-8 filename encoder.
 * @param {() => Date} options.now - Current modification timestamp.
 * @param {() => string} options.invalidArchive - Localized import error text.
 * @param {() => string} options.closedWriter - Localized closed-writer error text.
 * @returns {{build: Function, parse: Function, createWriter: Function}} Buffered builder, reader and incremental writer factory.
 */
export function createStoredZipCodec(options) {
  if (!options || typeof options.encode !== "function" || typeof options.now !== "function"
    || typeof options.invalidArchive !== "function" || typeof options.closedWriter !== "function") {
    throw new TypeError("Stored ZIP codec requires encoding, clock and error-text adapters.");
  }
  const utf8Bytes = options.encode;
  const now = options.now;

  /**
   * Creates the standard ZIP CRC-32 lookup table.
   * @returns {Uint32Array} Lookup table for all byte values.
   */
  function makeCrcTable() {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let shift = 0; shift < 8; shift += 1) {
        if (value & 1) {
          value = 0xedb88320 ^ (value >>> 1);
        } else {
          value = value >>> 1;
        }
      }
      table[index] = value >>> 0;
    }
    return table;
  }

  const CRC_TABLE = makeCrcTable();

  /**
   * Computes a ZIP CRC-32 checksum.
   * @param {Uint8Array} bytes - Uncompressed file bytes.
   * @returns {number} Unsigned checksum.
   */
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const value of bytes) {
      crc = CRC_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  /**
   * Encodes a timestamp as ZIP DOS date and time fields using UTC.
   * @param {Date} date - Modification timestamp.
   * @returns {{time: number, date: number}} Packed DOS fields.
   */
  function dosDateTime(date) {
    const year = Math.max(1980, date.getUTCFullYear());
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = Math.floor(date.getUTCSeconds() / 2);
    return {
      time: (hours << 11) | (minutes << 5) | seconds,
      date: ((year - 1980) << 9) | (month << 5) | day,
    };
  }

  /**
   * Joins byte chunks in their original order.
   * @param {Uint8Array[]} chunks - Header and file chunks to combine.
   * @returns {Uint8Array} Combined bytes.
   */
  function concatUint8Arrays(chunks) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return merged;
  }

  /**
   * Builds one uncompressed ZIP with UTF-8 filenames and a central directory.
   * @param {{name: string, data: Uint8Array|ArrayBuffer}[]} entries - Ordered file entries.
   * @returns {Uint8Array} Complete ZIP bytes, including an empty archive when no entries exist.
   */
  function buildStoredZip(entries) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of entries) {
      const nameBytes = utf8Bytes(entry.name);
      let dataBytes = entry.data;
      if (!(dataBytes instanceof Uint8Array)) {
        dataBytes = new Uint8Array(entry.data);
      }
      const crc = crc32(dataBytes);
      const { time, date } = dosDateTime(now());

      const localHeader = new Uint8Array(30 + nameBytes.length);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, time, true);
      localView.setUint16(12, date, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, dataBytes.length, true);
      localView.setUint32(22, dataBytes.length, true);
      localView.setUint16(26, nameBytes.length, true);
      localView.setUint16(28, 0, true);
      localHeader.set(nameBytes, 30);
      localParts.push(localHeader, dataBytes);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, time, true);
      centralView.setUint16(14, date, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, dataBytes.length, true);
      centralView.setUint32(24, dataBytes.length, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      centralHeader.set(nameBytes, 46);
      centralParts.push(centralHeader);

      offset += localHeader.length + dataBytes.length;
    }

    const centralDirectory = concatUint8Arrays(centralParts);
    const localDirectory = concatUint8Arrays(localParts);
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, entries.length, true);
    endView.setUint16(10, entries.length, true);
    endView.setUint32(12, centralDirectory.length, true);
    endView.setUint32(16, localDirectory.length, true);
    endView.setUint16(20, 0, true);

    return concatUint8Arrays([localDirectory, centralDirectory, endRecord]);
  }

  /** Writes an uncompressed ZIP incrementally while retaining only its directory headers. */
  class StreamingZipWriter {
    /**
     * Initializes an incremental writer for an existing output stream.
     * @param {{write: Function, close: Function}} writable - Awaitable byte sink.
     * @returns {StreamingZipWriter} Writer with an empty central directory.
     */
    constructor(writable) {
      this.writable = writable;
      this.centralParts = [];
      this.offset = 0;
      this.entryCount = 0;
      this.closed = false;
    }

    /**
     * Writes one local header and file payload, then records its directory entry.
     * @param {string} name - UTF-8 path within the archive.
     * @param {Uint8Array|ArrayBuffer} bytes - File payload.
     * @param {Date} modifiedAt - Modification timestamp; defaults to the injected clock.
     * @returns {Promise<void>} Resolves after both writes; rejects if closed or writing fails.
     */
    async addFile(name, bytes, modifiedAt = now()) {
      if (this.closed) {
        throw new Error(options.closedWriter());
      }

      const nameBytes = utf8Bytes(name);
      let dataBytes = bytes;
      if (!(dataBytes instanceof Uint8Array)) {
        dataBytes = new Uint8Array(bytes || []);
      }
      const crc = crc32(dataBytes);
      const { time, date } = dosDateTime(modifiedAt);

      const localHeader = new Uint8Array(30 + nameBytes.length);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, time, true);
      localView.setUint16(12, date, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, dataBytes.length, true);
      localView.setUint32(22, dataBytes.length, true);
      localView.setUint16(26, nameBytes.length, true);
      localView.setUint16(28, 0, true);
      localHeader.set(nameBytes, 30);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, time, true);
      centralView.setUint16(14, date, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, dataBytes.length, true);
      centralView.setUint32(24, dataBytes.length, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, this.offset, true);
      centralHeader.set(nameBytes, 46);

      await this.writable.write(localHeader);
      await this.writable.write(dataBytes);
      this.centralParts.push(centralHeader);
      this.offset += localHeader.length + dataBytes.length;
      this.entryCount += 1;
    }

    /**
     * Writes the central directory and end record, then closes the output once.
     * @returns {Promise<void>} Completion; repeated calls after success do nothing.
     */
    async close() {
      if (this.closed) {
        return;
      }

      const centralDirectory = concatUint8Arrays(this.centralParts);
      const endRecord = new Uint8Array(22);
      const endView = new DataView(endRecord.buffer);
      endView.setUint32(0, 0x06054b50, true);
      endView.setUint16(4, 0, true);
      endView.setUint16(6, 0, true);
      endView.setUint16(8, this.entryCount, true);
      endView.setUint16(10, this.entryCount, true);
      endView.setUint32(12, centralDirectory.length, true);
      endView.setUint32(16, this.offset, true);
      endView.setUint16(20, 0, true);

      await this.writable.write(centralDirectory);
      await this.writable.write(endRecord);
      await this.writable.close();
      this.closed = true;
    }
  }

  /**
   * Reads supported local ZIP records until the directory or end record.
   * @param {Uint8Array|ArrayBuffer} bytes - Uncompressed ZIP data, optionally a byte subview.
   * @returns {Map<string, Uint8Array>} Files keyed by decoded path; later duplicates replace earlier ones.
   * @throws {Error} Localized error for unsupported signatures or compression methods.
   */
  function parseStoredZip(bytes) {
    let buffer = bytes;
    if (!(buffer instanceof Uint8Array)) {
      buffer = new Uint8Array(bytes);
    }
    const entries = new Map();
    let offset = 0;

    while (offset + 30 <= buffer.length) {
      const view = new DataView(buffer.buffer, buffer.byteOffset + offset);
      const signature = view.getUint32(0, true);
      if (signature === 0x02014b50 || signature === 0x06054b50) {
        break;
      }
      if (signature !== 0x04034b50) {
        throw new Error(options.invalidArchive());
      }

      const compression = view.getUint16(8, true);
      if (compression !== 0) {
        throw new Error(options.invalidArchive());
      }

      const fileNameLength = view.getUint16(26, true);
      const extraLength = view.getUint16(28, true);
      const compressedSize = view.getUint32(18, true);
      const nameStart = offset + 30;
      const dataStart = nameStart + fileNameLength + extraLength;
      const name = new TextDecoder().decode(buffer.slice(nameStart, nameStart + fileNameLength));
      const data = buffer.slice(dataStart, dataStart + compressedSize);
      entries.set(name, data);
      offset = dataStart + compressedSize;
    }

    return entries;
  }

  /**
   * Creates an incremental ZIP writer for a caller-owned output stream.
   * @param {{write: Function, close: Function}} writable - Awaitable byte sink.
   * @returns {StreamingZipWriter} Open writer supporting addFile and close.
   */
  function createWriter(writable) {
    return new StreamingZipWriter(writable);
  }
  return { build: buildStoredZip, parse: parseStoredZip, createWriter };
}
