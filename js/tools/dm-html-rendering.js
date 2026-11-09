/**
 * Creates a standalone DM HTML renderer with explicit models and browser adapters.
 * @param {object} options - Models, translations, asset resolver, clock, rich text,
 * timestamps, URL labels, fetch and inert HTML parser adapters.
 * @returns {{build: Function}} Asynchronous document builder.
 */
export function createDmHtmlRenderer(options) {
  for (const name of ["t", "locale", "account", "now", "assetUri", "timestamp", "shorten", "links", "fetch", "parse", "error"]) {
    if (typeof options?.[name] !== "function") {
      throw new TypeError(`DM HTML renderer requires ${name}.`);
    }
  }
  for (const name of ["partner", "messages", "range", "card", "i18n"]) {
    if (typeof options.models?.[name] !== "function") {
      throw new TypeError(`DM HTML renderer requires model ${name}.`);
    }
  }
  let templatePromise = null;
  /** Loads and caches static sources; failed requests can be retried.
   * @returns {Promise<object>} Shell, styles, client script and inert fragments.
   */
  async function load() {
    if (!templatePromise) {
      templatePromise = Promise.all(["shell.html", "fragments.html", "client.js", "css"].map(async (suffix) => {
        let path = `./templates/dm-html-${suffix}`;
        if (suffix === "css") {
          path = "./templates/dm-html.css";
        }
        const response = await options.fetch(path);
        if (!response.ok) {
          throw new Error(options.error(response.status));
        }
        return response.text();
      })).then(([shell, fragments, client, styles]) => {
        return { shell, fragments: options.parse(fragments), client, styles };
      }).catch((error) => {
        templatePromise = null;
        throw error;
      });
    }
    return templatePromise;
  }
  /** Builds one self-contained document with literal text and controlled templates.
   * @param {object|null} catalog - DM catalog including local assets.
   * @returns {Promise<string>} HTML with embedded styles, search script and images.
   */
  async function build(catalog) {
    const sources = await load();
    const document = sources.fragments;
    /** Clones one inert fragment. @param {string} id - Fragment name. @returns {Element} Independent root. */
    function clone(id) {
      const template = document.getElementById(`dm-html-${id}-template`);
      if (!template?.content?.firstElementChild) {
        throw new Error(`Missing DM HTML template: ${id}`);
      }
      return template.content.firstElementChild.cloneNode(true);
    }
    /** Appends plain text with intentional line breaks.
     * @param {Element} host - Text container. @param {*} value - Plain text. @returns {void}
     */
    function textLines(host, value) {
      String(value || "").split("\n").forEach((line, index) => {
        if (index > 0) {
          host.append(clone("break"));
        }
        host.append(document.createTextNode(line));
      });
    }
    /** Creates a local image from a template.
     * @param {string} uri - Image URI. @param {string} name - Accessible name.
     * @param {string} className - Visual role. @returns {Element} Image.
     */
    function image(uri, name, className) {
      const node = clone("avatar");
      node.setAttribute("src", uri);
      node.setAttribute("alt", name);
      node.className = className;
      return node;
    }
    const models = options.models;
    const partner = models.partner(catalog);
    const messages = models.messages(catalog);
    const range = models.range(catalog);
    const assets = new Map((catalog?.assets || []).map((asset) => [asset.path, options.assetUri(asset)]));
    const ownHandle = catalog?.manifest?.account?.handle || options.account() || "";
    const title = `${options.t("dmHeaderTitle")} · ${partner?.displayName || `@${partner?.handle || ""}`}`.trim();
    const root = clone("body");
    /** Fills a text slot. @param {string} name - Slot. @param {*} value - Literal copy. @returns {void} */
    function slot(name, value) {
      root.querySelector(`[data-slot="${name}"]`).textContent = value;
    }
    slot("eyebrow", options.t("dmHeaderEyebrow"));
    slot("title", title);
    slot("generated", options.t("dmHtmlGenerated", { date: options.timestamp(catalog?.manifest?.exportedAt || options.now().toISOString()) }));
    let partnerLabel = `${options.t("dmPartnerLabel")}: ${partner?.displayName || ""}`;
    if (partner?.handle) {
      partnerLabel += ` · @${partner.handle}`;
    }
    slot("partner", partnerLabel);
    if (assets.get(partner?.avatarPath)) {
      root.querySelector(".dm-html-partner").prepend(image(assets.get(partner.avatarPath), partner.displayName || partner.handle || "", "dm-html-avatar"));
    }
    let from = "…";
    let to = "…";
    if (range.from) {
      from = options.timestamp(range.from);
    }
    if (range.to) {
      to = options.timestamp(range.to);
    }
    slot("range", options.t("dmArchiveRangeValue", { from, to }));
    for (const [key, field] of [["Conversations", "conversationCount"], ["Messages", "messageCount"], ["Participants", "participantCount"]]) {
      const metric = clone("metric");
      metric.querySelector("span").textContent = options.t(`dmSummary${key}Label`);
      metric.querySelector("strong").textContent = Number(catalog?.manifest?.[field]) || 0;
      root.querySelector(".dm-html-meta").append(metric);
    }
    slot("search", options.t("dmHtmlSearchLabel"));
    root.querySelector("#dm-search").setAttribute("placeholder", options.t("dmHtmlSearchLabel"));
    root.querySelector("#dm-reset").textContent = options.t("dmHtmlResetFilters");
    root.querySelector("#dm-status").textContent = options.t("dmHtmlVisibleStatus", { visible: messages.length, total: messages.length });
    for (const message of messages) {
      const node = clone("message");
      if (message.senderDid === catalog?.manifest?.account?.did) {
        node.classList.add("is-own");
      } else {
        node.classList.add("is-other");
      }
      const name = message.senderDisplayName || message.senderHandle || message.senderDid || ownHandle;
      let handle = "";
      if (message.senderHandle) {
        handle = `@${message.senderHandle}`;
        const label = clone("handle");
        label.textContent = handle;
        node.querySelector('[data-slot="author"]').append(label);
      }
      node.querySelector("strong").textContent = name;
      if (assets.get(message.senderAvatarPath)) {
        node.querySelector(".dm-html-message-author").prepend(image(assets.get(message.senderAvatarPath), name, "dm-html-message-avatar"));
      }
      node.querySelector("time").setAttribute("datetime", message.sentAt || "");
      node.querySelector("time").textContent = options.timestamp(message.sentAt);
      const runs = options.links(message.text || "", message.facets || []);
      if (message.text) {
        const text = clone("text");
        for (const run of runs) {
          if (run.url) {
            const link = clone("link");
            link.setAttribute("href", run.url);
            textLines(link, run.text);
            text.append(link);
          } else {
            textLines(text, run.text);
          }
        }
        node.append(text);
      }
      const card = models.card(message);
      if (card) {
        const link = clone("card");
        link.setAttribute("href", card.url);
        const thumb = assets.get(card.thumbPath) || String(card.thumb || "").trim();
        if (thumb) {
          link.classList.add("has-thumbnail");
          link.prepend(image(thumb, "", "dm-html-link-card-thumb"));
        }
        link.querySelector("strong").textContent = card.title || card.url;
        link.querySelector("small").textContent = options.shorten(card.url);
        if (card.description) {
          const description = clone("description");
          description.textContent = card.description;
          link.querySelector("small").before(description);
        }
        node.append(link);
      } else if (!message.text) {
        const empty = clone("empty");
        empty.textContent = options.t("dmHtmlNoText");
        node.append(empty);
      }
      node.dataset.search = [name, handle, message.text || "", runs.map((run) => run.url || "").filter(Boolean).join(" "), card?.title || "", card?.description || "", card?.url || ""].join(" ").replace(/\s+/g, " ").trim().toLowerCase();
      root.querySelector("#dm-feed").append(node);
    }
    root.querySelectorAll("[data-slot]").forEach((node) => node.removeAttribute("data-slot"));
    const escaped = document.createElement("span");
    escaped.textContent = title;
    const locale = String(options.locale() || "en").replace(/[^a-zA-Z-]/g, "");
    const bootstrap = JSON.stringify({ locale, i18n: models.i18n() }).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    const slots = { locale, title: escaped.innerHTML, styles: sources.styles, bodyMarkup: root.outerHTML, bootstrapJson: bootstrap, clientScript: sources.client };
    return sources.shell.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (Object.hasOwn(slots, key)) {
        return slots[key];
      }
      throw new Error(`Unknown DM HTML shell slot: ${key}`);
    });
  }
  return { build };
}
