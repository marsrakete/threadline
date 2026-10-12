"use strict";

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const port = Number(process.env.THREADLINE_TEST_PORT || 4173);

/**
 * Returns the HTTP content type for one static project file.
 * @param {string} filePath - Absolute path to the requested file.
 * @returns {string} HTTP content type including UTF-8 where appropriate.
 */
function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html") {
    return "text/html; charset=utf-8";
  }
  if (extension === ".js" || extension === ".cjs") {
    return "text/javascript; charset=utf-8";
  }
  if (extension === ".css") {
    return "text/css; charset=utf-8";
  }
  if (extension === ".json" || extension === ".webmanifest") {
    return "application/json; charset=utf-8";
  }
  if (extension === ".svg") {
    return "image/svg+xml";
  }
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }
  return "application/octet-stream";
}

/**
 * Resolves one request path inside the project without allowing directory traversal.
 * @param {string} pathname - URL pathname from the incoming request.
 * @returns {string} Absolute project path, or an empty string for invalid paths.
 */
function resolveProjectFile(pathname) {
  let normalizedPathname = pathname;
  if (normalizedPathname === "/") {
    normalizedPathname = "/index.html";
  }

  const filePath = path.resolve(projectRoot, `.${normalizedPathname}`);
  if (filePath === projectRoot || !filePath.startsWith(`${projectRoot}${path.sep}`)) {
    return "";
  }

  return filePath;
}

/**
 * Serves one project file for the browser smoke tests.
 * @param {http.IncomingMessage} request - Incoming HTTP request.
 * @param {http.ServerResponse} response - HTTP response to populate.
 * @returns {void}
 */
function serveProjectFile(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const filePath = resolveProjectFile(decodeURIComponent(requestUrl.pathname));
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "content-type": getContentType(filePath) });
  fs.createReadStream(filePath).pipe(response);
}

http.createServer(serveProjectFile).listen(port, "127.0.0.1");
