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
 * Updates the active palette and labels the button with the palette it switches to.
 * @param {string} scheme The palette to activate.
 * @returns {void}
 */
function setColorScheme(scheme) {
  const usesThreadlineColors = scheme === "threadline";
  document.body.dataset.colorScheme = scheme;
  if (usesThreadlineColors) {
    colorSchemeToggle.textContent = "Gedeckte Farben";
  } else {
    colorSchemeToggle.textContent = "THREADLINE-FARBEN";
  }
  colorSchemeToggle.setAttribute("aria-pressed", String(usesThreadlineColors));
}

/**
 * Switches between muted colors and Threadline's existing palette.
 * @returns {void}
 */
function toggleColorScheme() {
  if (document.body.dataset.colorScheme === "threadline") {
    setColorScheme("muted");
  } else {
    setColorScheme("threadline");
  }
}

/**
 * Switches the prototype layout and applies the matching palette.
 * @returns {void}
 */
function toggleDesign() {
  let nextDesign = "threadline";
  let matchingScheme = "threadline";
  if (document.body.dataset.design === "threadline") {
    nextDesign = "editorial";
    matchingScheme = "muted";
    designToggle.textContent = "ALTES DESIGN";
  } else {
    designToggle.textContent = "NEUES DESIGN";
  }

  document.body.dataset.design = nextDesign;
  designToggle.setAttribute("aria-pressed", String(nextDesign === "threadline"));
  setColorScheme(matchingScheme);
}

composerField.addEventListener("input", updateComposerPreview);
colorSchemeToggle.addEventListener("click", toggleColorScheme);
designToggle.addEventListener("click", toggleDesign);
updateComposerPreview();
