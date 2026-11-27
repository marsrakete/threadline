import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = new URL("../", import.meta.url);
const site = new URL(process.argv[2] || "https://marsrakete.github.io/threadline/");
if (site.protocol !== "https:" || site.username || site.password || site.port || site.search || site.hash || !site.pathname.endsWith("/")) {
  throw new Error("Expected the HTTPS application base URL with a trailing slash.");
}

const appViewMethods = [
  "actor.getPreferences", "actor.getProfile", "actor.getProfiles", "actor.searchActorsTypeahead",
  "feed.getAuthorFeed", "feed.getFeed", "feed.getFeedGenerator", "feed.getLikes", "feed.getPosts",
  "feed.getPostThread", "feed.getQuotes", "feed.getRepostedBy", "feed.getTimeline", "feed.searchPosts",
  "graph.getBlocks", "graph.getFollowers", "graph.getFollows", "graph.getMutes", "notification.listNotifications",
];
const rpc = "rpc?" + appViewMethods.map((method) => "lxm=app.bsky." + method).join("&") + "&aud=did:web:api.bsky.app%23bsky_appview";
const scope = [
  "atproto",
  rpc,
  "repo?collection=app.bsky.feed.post&collection=app.bsky.feed.threadgate&collection=app.bsky.feed.postgate&action=create&action=delete",
  "repo:app.bsky.feed.like?action=create&action=delete",
  "blob:image/*",
  "rpc?lxm=chat.bsky.convo.getMessages&lxm=chat.bsky.convo.listConvos&aud=did:web:api.bsky.chat%23bsky_chat",
].join(" ");
const metadata = {
  client_id: new URL("oauth-client-metadata.json", site).href,
  client_name: "Threadline",
  client_uri: site.href,
  logo_uri: new URL("icons/icon.svg", site).href,
  policy_uri: new URL("datenschutz.html", site).href,
  redirect_uris: [new URL("oauth-callback.html", site).href],
  scope,
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  token_endpoint_auth_method: "none",
  application_type: "web",
  dpop_bound_access_tokens: true,
};
await mkdir(new URL("js/vendor/", root), { recursive: true });
const { metafile } = await build({
  absWorkingDir: fileURLToPath(root),
  entryPoints: [fileURLToPath(new URL("js/atproto/oauth-sdk-entry.js", root))],
  outfile: fileURLToPath(new URL("js/vendor/atproto-oauth.js", root)),
  bundle: true,
  minify: true,
  metafile: true,
  legalComments: "eof",
  format: "iife",
  target: "safari17",
  banner: { js: "/** Loads the bundled SDK lazily. @returns {void} Initializes Worker SDK globals. */\nglobalThis.loadThreadlineOAuthSdk = function loadThreadlineOAuthSdk() {" },
  footer: { js: "};" },
});
const packages = new Set();
for (const filename of Object.keys(metafile.inputs)) {
  const match = filename.match(/^node_modules\/((?:@[^/]+\/)?[^/]+)/);
  if (match) { packages.add(match[1]); }
}
const licenses = new Map();
for (const name of [...packages].sort()) {
  const directory = new URL("node_modules/" + name + "/", root);
  const manifest = JSON.parse(await readFile(new URL("package.json", directory), "utf8"));
  const licenseFile = (await readdir(directory)).find((file) => /^licen[cs]e(?:\.|$)/i.test(file));
  if (!licenseFile) { throw new Error("Missing license for bundled package " + name); }
  const license = (await readFile(new URL(licenseFile, directory), "utf8")).replace(/\r\n/g, "\n").trim();
  const names = licenses.get(license) || [];
  names.push(name + " " + manifest.version);
  licenses.set(license, names);
}
const notices = [...licenses].map(([license, names]) => names.join(", ") + "\n\n" + license);
await writeFile(new URL("js/vendor/atproto-oauth.LICENSE.txt", root), notices.join("\n\n---\n\n") + "\n");
await writeFile(new URL("oauth-client-metadata.json", root), JSON.stringify(metadata, null, 2) + "\n");
