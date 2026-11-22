const composerField = document.querySelector("#post-text");
const characterCount = document.querySelector("#character-count");
const paragraphCount = document.querySelector("#paragraph-count");
const previewCopy = document.querySelector("#post-preview-copy");
const colorSchemeToggle = document.querySelector("#color-scheme-toggle");
const designToggle = document.querySelector("#design-toggle");

/**
 * Updates the visual prototype's character count and post preview from the text field.
 * @returns {void}
 */
function updateComposerPreview() {
  const text = composerField.value.trim();
  const paragraphs = text === "" ? [] : text.split(/\n\s*\n/);
  const characterTotal = Array.from(composerField.value).length;

  characterCount.textContent = `${characterTotal} ZEICHEN`;
  paragraphCount.textContent = `${paragraphs.length} ${paragraphs.length === 1 ? "ABSATZ" : "ABSÄTZE"}`;

  previewCopy.replaceChildren();

  if (paragraphs.length === 0) {
    const emptyPreview = document.createElement("p");
    emptyPreview.textContent = "Dein Post erscheint hier.";
    emptyPreview.classList.add("is-empty");
    previewCopy.append(emptyPreview);
    return;
  }

  for (const paragraph of paragraphs) {
    const previewParagraph = document.createElement("p");
    previewParagraph.textContent = paragraph;
    previewCopy.append(previewParagraph);
  }
}

/**
 * Switches between the ArtCraft-inspired palette and Threadline's existing palette.
 * @returns {void}
 */
function toggleColorScheme() {
  const currentScheme = document.body.dataset.colorScheme;
  const nextScheme = currentScheme === "threadline" ? "artcraft" : "threadline";

  document.body.dataset.colorScheme = nextScheme;
  colorSchemeToggle.textContent = nextScheme === "threadline" ? "ARTCRAFT-FARBEN" : "THREADLINE-FARBEN";
  colorSchemeToggle.setAttribute("aria-pressed", String(nextScheme === "threadline"));
}

/**
 * Switches the prototype between the existing Threadline layout and the ArtCraft-inspired layout.
 * @returns {void}
 */
function toggleDesign() {
  const nextDesign = document.body.dataset.design === "threadline" ? "artcraft" : "threadline";
  const matchingColorScheme = nextDesign === "threadline" ? "threadline" : "artcraft";

  document.body.dataset.design = nextDesign;
  document.body.dataset.colorScheme = matchingColorScheme;
  designToggle.textContent = nextDesign === "threadline" ? "NEUES DESIGN" : "ALTES DESIGN";
  designToggle.setAttribute("aria-pressed", String(nextDesign === "threadline"));
  colorSchemeToggle.textContent = matchingColorScheme === "threadline" ? "ARTCRAFT-FARBEN" : "THREADLINE-FARBEN";
  colorSchemeToggle.setAttribute("aria-pressed", String(matchingColorScheme === "threadline"));
}

composerField.addEventListener("input", updateComposerPreview);
colorSchemeToggle.addEventListener("click", toggleColorScheme);
designToggle.addEventListener("click", toggleDesign);
updateComposerPreview();
