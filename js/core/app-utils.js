/**
 * Clamps one numeric value into the given inclusive range.
 * @param {number} value - Raw numeric value.
 * @param {number} min - Lowest allowed value.
 * @param {number} max - Highest allowed value.
 * @returns {number} Clamped numeric value.
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Writes plain text into one element.
 * @param {HTMLElement|null} element - Target element.
 * @param {string} text - Plain text value.
 * @returns {void}
 */
function setSafeText(element, text) {
  if (!element) {
    return;
  }

  element.textContent = text;
}

/**
 * Writes trusted HTML into one element.
 * @param {HTMLElement|null} element - Target element.
 * @param {string} html - Trusted HTML string.
 * @returns {void}
 */
function setSafeHtml(element, html) {
  if (!element) {
    return;
  }

  element.innerHTML = html;
}

/**
 * Sets one attribute on an element when both element and value are present.
 * @param {HTMLElement|null} element - Target element.
 * @param {string} name - Attribute name.
 * @param {string|number|boolean} value - Attribute value.
 * @returns {void}
 */
function setAttr(element, name, value) {
  if (!element || value === undefined || value === null) {
    return;
  }

  element.setAttribute(name, String(value));
}

export {
  clamp,
  setAttr,
  setSafeHtml,
  setSafeText,
};

export { cloneTemplate } from "../shared/shared-templates.js";
