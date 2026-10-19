const path = require('node:path');
const { readFile } = require('node:fs/promises');

function compiledBase(html) {
  const source = html.match(/<script\b[^>]*\bsrc=["']([^"']*\/assets\/[^"']+)["']/i)?.[1];
  if (!source?.startsWith('/')) {
    throw new Error('Cannot infer the compiled Beijing base. Set TRANSIT_PREVIEW_BASE explicitly.');
  }
  return source.slice(0, source.lastIndexOf('/assets/') + 1);
}

async function startServer() {
  const { createServer, preview } = await import('vite');
  const production = process.env.TRANSIT_PREVIEW_DIR;
  let server;
  if (production) {
    const outDir = path.resolve(production);
    // Read the artifact, not the current build environment: Pages builds can be checked locally.
    const base = process.env.TRANSIT_PREVIEW_BASE || compiledBase(await readFile(path.join(outDir, 'beijing.html'), 'utf8'));
    server = await preview({ base, build: { outDir }, preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  } else {
    server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
    await server.listen();
  }
  const url = `${server.resolvedUrls.local[0]}beijing.html`;
  console.log(`Serving Beijing ${production ? 'production' : 'development'}: ${url}`);
  return {
    url,
    close: () => production ? new Promise(resolve => server.httpServer.close(resolve)) : server.close(),
  };
}

module.exports = { compiledBase, startServer };
