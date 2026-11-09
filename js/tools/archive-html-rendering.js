/**
 * Creates template-based HTML export rendering without application state or delivery.
 * @param {object} options - Models, template loader/parser, copy, timestamps and link/card adapters.
 * @param {object} options.models - Document and card display models.
 * @param {Function} options.loadTemplates - Cached shell, fragments and client loader.
 * @param {Function} options.parse - Inert HTML-to-document parser.
 * @param {Function} options.t - Current-locale translation.
 * @param {Function} options.timestamp - Existing visible timestamp formatter.
 * @param {Function} options.linkRuns - Existing rich-text resolver.
 * @param {Function} options.depths - Shared parent-depth calculation.
 * @param {Function} options.escape - Plain-text escaping for shell slots.
 * @param {Function} options.escapeAttribute - Attribute escaping for shell slots.
 * @returns {{build: Function}} Asynchronous standalone-document builder.
 */
export function createArchiveHtmlRenderer(options) {
  if (!options || typeof options.loadTemplates !== "function" || typeof options.parse !== "function"
    || typeof options.t !== "function" || typeof options.timestamp !== "function"
    || typeof options.linkRuns !== "function" || typeof options.depths !== "function"
    || typeof options.escape !== "function" || typeof options.escapeAttribute !== "function"
    || typeof options.models?.document !== "function" || typeof options.models?.cardDisplay !== "function") {
    throw new TypeError("Archive HTML renderer requires templates, DOM, content and model adapters.");
  }
  let templates = null;
  const t = options.t;
  /**
   * Clones one controlled fragment.
   * @param {string} id - Template identifier.
   * @returns {Element} Independent root element.
   */
  function clone(id) {
    const template = templates.getElementById(`archive-html-${id}-template`);
    if (!template?.content?.firstElementChild) {
      throw new Error(`Missing archive HTML template: ${id}`);
    }
    return template.content.firstElementChild.cloneNode(true);
  }
  /**
   * Serializes generated DOM without build-only slot attributes.
   * @param {Element[]} nodes - Generated roots.
   * @returns {string} Escaped markup.
   */
  function markup(nodes) {
    const host = templates.createElement("div");
    for (const node of nodes) {
      host.append(node);
    }
    host.querySelectorAll("[data-slot], [data-metric]").forEach((node) => {
      node.removeAttribute("data-slot");
      node.removeAttribute("data-metric");
    });
    return host.innerHTML;
  }
  /**
   * Fills a reusable external link.
   * @param {string} url - Target.
   * @param {string} text - Visible label.
   * @returns {Element} Link element.
   */
  function link(url, text) {
    const node = clone("link");
    node.setAttribute("href", url);
    node.textContent = text;
    return node;
  }
  /**
   * Appends literal text and intentional line breaks.
   * @param {Element} target - Text host.
   * @param {*} text - Plain text.
   * @returns {void}
   */
  function textLines(target, text) {
    String(text || "").split("\n").forEach((part, index) => {
      if (index > 0) {
        target.append(clone("break"));
      }
      target.append(templates.createTextNode(part));
    });
  }
  /**
   * Renders authoritative rich text as text nodes and links.
   * @param {Element} host - Text host.
   * @param {object} post - Archive post.
   * @returns {void}
   */
  function richText(host, post) {
    options.linkRuns(post.text, post.facets || []).forEach((run) => {
      if (run.url) {
        const node = clone("rich-link");
        node.setAttribute("href", run.url);
        textLines(node, run.text);
        host.append(node);
      } else {
        textLines(host, run.text);
      }
    });
  }
  /**
   * Creates embedded or deferred post images.
   * @param {object} post - Post.
   * @param {Map} assets - Asset data URLs.
   * @param {object} settings - Export options.
   * @returns {Element[]} Image figures.
   */
  function images(post, assets, settings) {
    const result = [];
    for (const image of post.images || []) {
      let uri = "";
      if (settings.embedPostImages !== false) {
        uri = assets.get(image.path) || "";
      }
      let node;
      if (!uri && settings.embedPostImages === false) {
        const remote = String(image.remoteUrl || "").trim();
        if (!remote) {
          continue;
        }
        node = clone("lazy-image");
        node.setAttribute("data-archive-image-remote", remote);
        node.setAttribute("data-archive-image-alt", image.alt || "");
        node.querySelector("button").textContent = t("archiveHtmlLoadImage");
        const target = node.querySelector("a");
        target.setAttribute("href", remote);
        target.textContent = t("archiveHtmlOpenImage");
      } else {
        if (!uri) {
          continue;
        }
        node = clone("image");
        node.querySelector("img").setAttribute("src", uri);
        node.querySelector("img").setAttribute("alt", image.alt || "");
      }
      const caption = node.querySelector("figcaption");
      if (image.alt) {
        caption.textContent = `${t("archivePdfAltPrefix")} ${image.alt}`;
      } else {
        caption.remove();
      }
      result.push(node);
    }
    return result;
  }
  /**
   * Creates an optional edit-details button.
   * @param {object} post - Archive post.
   * @returns {Element|null} Edit marker.
   */
  function edit(post) {
    const info = post.editInfo;
    if (!info?.isEdited) {
      return null;
    }
    const node = clone("edit");
    node.setAttribute("data-edit-created", info.createdAt || post.createdAt || "");
    node.setAttribute("data-edit-updated", info.updatedAt || "");
    node.setAttribute("data-edit-original", info.originalText || "");
    node.setAttribute("data-edit-current", info.text || post.text || "");
    node.setAttribute("title", t("archiveHtmlEditDetailsButton"));
    node.textContent = t("archiveHtmlEditedBadge");
    return node;
  }
  /**
   * Renders a stored external card.
   * @param {object} card - Card data.
   * @param {Map} assets - Asset data URLs.
   * @returns {Element} Card link.
   */
  function externalCard(card, assets) {
    const display = options.models.cardDisplay(card);
    const node = clone("card");
    node.className = display.className;
    node.setAttribute("href", card.url);
    let thumb = "";
    if (card.thumbPath) {
      thumb = assets.get(card.thumbPath) || "";
    }
    thumb = thumb || String(card.thumb || "").trim();
    if (thumb) {
      const image = clone("thumb");
      image.setAttribute("src", thumb);
      node.prepend(image);
    } else if (card.thumbLoadFailed === true) {
      const failed = clone("thumb-fallback");
      failed.textContent = t("archiveLinkCardThumbFailed");
      node.prepend(failed);
    }
    node.querySelector("strong").textContent = card.title || card.url;
    const description = node.querySelector('[data-slot="description"]');
    if (card.description) {
      description.textContent = card.description;
    } else {
      description.remove();
    }
    node.querySelector("small").textContent = display.footer;
    return node;
  }
  /**
   * Renders one post with existing selectors and interaction data.
   * @param {object} post - Post.
   * @param {object} group - Thread model.
   * @param {number} groupIndex - Zero-based group.
   * @param {number} postIndex - Zero-based post.
   * @param {Map} depths - Parent depths.
   * @param {object} model - Document model.
   * @param {Map} assets - Asset URLs.
   * @param {object} settings - Export settings.
   * @returns {Element} Post card.
   */
  function renderPost(post, group, groupIndex, postIndex, depths, model, assets, settings) {
    const node = clone("post");
    const depth = depths.get(post.uri) || 0;
    node.setAttribute("data-created", Date.parse(post.createdAt || 0) || 0);
    node.setAttribute("data-has-images", Boolean((post.images || []).length));
    node.setAttribute("data-depth", depth);
    node.style.setProperty("--thread-depth", depth);
    node.setAttribute("data-search", [post.text || "", post.permalink || "", post.uri || "", post.authorHandle || model.handle,
      post.authorDisplayName || "", options.linkRuns(post.text || "", post.facets || []).map((run) => run.url || "").filter(Boolean).join(" ")
    ].join(" ").replace(/\s+/g, " ").trim().toLowerCase());
    let display = "";
    if (post.authorDisplayName && post.authorDisplayName !== post.authorHandle) {
      display = post.authorDisplayName;
    }
    let avatar = "";
    if (post.authorAvatarPath) {
      avatar = assets.get(post.authorAvatarPath) || "";
    }
    avatar = avatar || post.authorAvatar || "";
    if (avatar) {
      const image = clone("avatar");
      image.setAttribute("src", avatar);
      image.setAttribute("alt", display || post.authorHandle || model.handle);
      node.querySelector(".archive-html-author").prepend(image);
    }
    let kicker = `#${groupIndex + 1}`;
    if (group.isThread) {
      kicker += `.${postIndex + 1}`;
    }
    node.querySelector(".archive-html-kicker").textContent = kicker;
    node.querySelector("h2").textContent = display || `@${post.authorHandle || model.handle}`;
    node.querySelector(".archive-html-author-handle").textContent = `@${post.authorHandle || model.handle}`;
    const time = node.querySelector("time");
    time.setAttribute("datetime", post.createdAt || "");
    time.textContent = options.timestamp(post.createdAt);
    const marker = edit(post);
    if (marker) {
      time.before(marker);
    }
    node.querySelectorAll("[data-metric]").forEach((metric) => {
      metric.append(templates.createTextNode(post.counts?.[metric.getAttribute("data-metric")] || 0));
    });
    let card = null;
    if (post.externalCard?.url) {
      card = post.externalCard;
    }
    const body = node.querySelector(".archive-html-text");
    if (post.text) {
      richText(body, post);
    } else if (!card) {
      const empty = clone("empty");
      empty.textContent = t("archiveHtmlNoText");
      body.append(empty);
    }
    if (card) {
      body.after(externalCard(card, assets));
    }
    const figures = images(post, assets, settings);
    const gallery = node.querySelector(".archive-html-gallery");
    if (figures.length > 0) {
      gallery.append(...figures);
    } else {
      gallery.remove();
    }
    if (post.permalink) {
      node.querySelector(".archive-html-footer").prepend(link(post.permalink, t("archiveHtmlOpenPost")));
    }
    node.querySelector(".archive-html-uri").textContent = String(post.uri || "").replace(/^at:\/\//, "");
    return node;
  }
  /**
   * Renders a thread or single-post group.
   * @param {object} group - Group model.
   * @param {number} index - Group index.
   * @param {object} model - Document model.
   * @param {Map} assets - Asset URLs.
   * @param {object} settings - Export settings.
   * @returns {Element} Collapsible entry.
   */
  function renderGroup(group, index, model, assets, settings) {
    let template = "single";
    let label = t("archiveHtmlSingleSummary");
    let dates = options.timestamp(group.posts[0]?.createdAt);
    if (group.isThread) {
      template = "thread";
      label = t("archiveHtmlThreadSummary", { count: group.posts.length, images: group.imageCount });
      dates += ` – ${options.timestamp(group.posts[group.posts.length - 1]?.createdAt)}`;
    }
    const node = clone(template);
    node.querySelector("summary strong").textContent = label;
    node.querySelector('[data-slot="dates"]').textContent = dates;
    if (group.isThread) {
      node.querySelector('[data-slot="count"]').textContent = `${t("archiveSummaryPosts")}: ${group.posts.length}`;
    }
    const depths = options.depths(group.posts);
    group.posts.forEach((post, postIndex) => node.querySelector(".archive-html-entry-body")
      .append(renderPost(post, group, index, postIndex, depths, model, assets, settings)));
    return node;
  }
  /**
   * Renders the link index including its empty state.
   * @param {object[]} entries - Explicit link facets.
   * @returns {Element} Index details.
   */
  function renderLinks(entries) {
    const node = clone("links");
    node.querySelector("strong").textContent = t("archiveHtmlLinksSummary", { count: entries.length });
    node.querySelector('[data-slot="count"]').textContent = entries.length;
    const list = node.querySelector(".archive-html-links-list");
    const empty = node.querySelector(".archive-html-hashtags-empty");
    if (entries.length === 0) {
      list.remove();
      empty.textContent = t("archiveHtmlLinksEmpty");
    } else {
      empty.remove();
      for (const entry of entries) {
        const row = clone("link-row");
        let postLink;
        if (entry.postPermalink) {
          postLink = link(entry.postPermalink, t("archiveHtmlLinksPostLabel"));
        } else {
          postLink = clone("passive-link");
          postLink.textContent = t("archiveHtmlLinksPostLabel");
        }
        row.prepend(postLink);
        const target = row.querySelector(".archive-html-links-target");
        target.setAttribute("href", entry.url);
        target.textContent = entry.displayUrl;
        list.append(row);
      }
    }
    return node;
  }
  /**
   * Creates one metadata item.
   * @param {string} key - Translation key.
   * @param {*} value - Display value.
   * @returns {Element} Metadata block.
   */
  function meta(key, value) {
    const node = clone("meta");
    node.querySelector("span").setAttribute("data-i18n-key", key);
    node.querySelector("span").textContent = t(key);
    node.querySelector("strong").textContent = value;
    return node;
  }
  /**
   * Creates an optional document warning.
   * @param {string} id - Warning ID.
   * @param {string} text - Warning copy.
   * @returns {string} Serialized warning or empty text.
   */
  function warning(id, text) {
    if (!text) {
      return "";
    }
    const node = clone("warning");
    node.id = id;
    node.textContent = text;
    if (id === "archive-filter-copy") {
      node.setAttribute("data-i18n-key", "archiveHtmlFilterSummary");
    }
    return markup([node]);
  }
  /**
   * Builds a standalone document from controlled templates.
   * @param {object} catalog - Catalog.
   * @param {Map} assets - Asset data URLs.
   * @param {object} settings - Image/export settings.
   * @returns {Promise<string>} Standalone HTML.
   */
  async function build(catalog, assets, settings = {}) {
    const model = options.models.document(catalog);
    const bundle = await options.loadTemplates();
    if (!templates) {
      templates = options.parse(bundle.fragments);
    }
    const groups = model.groups.map((group, index) => renderGroup(group, index, model, assets, settings));
    const items = [meta("archiveSummaryPosts", catalog.posts.length), meta("archiveSummaryImages", catalog.summary?.imageCount || 0)];
    if (model.skippedImageCount > 0) {
      items.push(meta("archiveSkippedImagesLabel", model.skippedImageCount));
    }
    const range = meta("archiveHtmlArchiveRangeLabel", t("archiveHtmlArchiveRangeValue", {
      from: options.timestamp(catalog.summary?.from), to: options.timestamp(catalog.summary?.to),
    }));
    const rangeText = range.querySelector("strong");
    rangeText.id = "archive-range-copy";
    rangeText.setAttribute("data-range-from", catalog.summary?.from || "");
    rangeText.setAttribute("data-range-to", catalog.summary?.to || "");
    items.push(range);
    let tags;
    if (model.tags.length > 0) {
      tags = clone("tags");
      for (const tag of model.tags) {
        const button = clone("tag");
        button.setAttribute("data-archive-hashtag", tag.value.toLowerCase());
        button.textContent = tag.value;
        tags.append(button);
      }
    } else {
      tags = clone("no-tags");
      tags.textContent = t("archiveHtmlHashtagsEmpty");
    }
    let skipped = "";
    if (model.skippedImageCount > 0) {
      skipped = t("archiveSkippedImagesNotice", { skipped: model.skippedImageCount });
    }
    const replacements = { documentTitle: options.escape(model.title), pageTitle: options.escape(model.title),
      heroKicker: options.escape(t("archiveHeaderEyebrow")), generatedCopy: options.escape(t("archiveHtmlGenerated", { exportedAt: options.timestamp(model.exportedAtIso) })),
      skippedCopyMarkup: warning("archive-skipped-copy", skipped), filterCopyMarkup: warning("archive-filter-copy", model.filterSummary),
      metaItemsMarkup: markup(items), fromValue: options.escapeAttribute(model.fromValue), toValue: options.escapeAttribute(model.toValue),
      hashtagsMarkup: markup([tags]), linksMarkup: markup([renderLinks(model.links)]), groupsMarkup: markup(groups),
      lightboxTitle: options.escape(model.title), bootstrapJson: JSON.stringify(model.bootstrap).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"),
      clientScript: String(bundle.clientScript || "").replace(/<\/script/gi, "<\\/script"),
    };
    const labels = { searchLabel: "archiveHtmlSearchLabel", fromLabel: "archiveFromLabel", toLabel: "archiveToLabel",
      onlyImagesLabel: "archiveHtmlOnlyImages", onlyThreadsLabel: "archiveHtmlOnlyThreads", resetFiltersLabel: "archiveHtmlResetFilters",
      indentThreadsLabel: "archiveHtmlIndentThreads", toggleAllLabel: "archiveHtmlToggleAllOpen", toggleThreadsLabel: "archiveHtmlExpandThreads",
      toggleSinglesLabel: "archiveHtmlExpandSingles", hashtagsLabel: "archiveHtmlHashtagsLabel", lightboxCloseLabel: "closeButton",
      editDialogTitle: "archiveHtmlEditDialogTitle", editDialogNote: "archiveHtmlEditDialogNote", editOriginalLabel: "archiveHtmlEditOriginal", editCurrentLabel: "archiveHtmlEditCurrent" };
    for (const [name, key] of Object.entries(labels)) {
      replacements[name] = options.escape(t(key));
    }
    replacements.searchPlaceholder = options.escapeAttribute(t("archiveHtmlSearchLabel"));
    return String(bundle.shell).replace(/\{\{(\w+)\}\}/g, (token, key) => {
      if (Object.prototype.hasOwnProperty.call(replacements, key)) {
        return String(replacements[key]);
      }
      return token;
    });
  }
  return { build };
}
