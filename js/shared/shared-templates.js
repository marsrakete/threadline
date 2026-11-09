/**
 * Clones the content of one reusable HTML template element.
 * @param {HTMLTemplateElement|null|undefined} template - Template element to clone.
 * @returns {DocumentFragment|null} Cloned template content, or null when it is unavailable.
 */
export function cloneTemplateContent(template) {
  if (!template || !template.content || typeof template.content.cloneNode !== "function") {
    return null;
  }
  return template.content.cloneNode(true);
}

/**
 * Looks up and clones a reusable HTML template by DOM ID.
 * @param {string} templateId - DOM ID of the template element.
 * @param {Document|null|undefined} documentRef - Document used for the template lookup.
 * @returns {DocumentFragment|null} Cloned template content, or null when the template is missing.
 */
export function cloneTemplate(templateId, documentRef = document) {
  if (!documentRef || typeof documentRef.getElementById !== "function") {
    return null;
  }
  const template = documentRef.getElementById(String(templateId || ""));
  if (!template) {
    console.warn(`Template not found: ${templateId}`);
    return null;
  }
  return cloneTemplateContent(template);
}
