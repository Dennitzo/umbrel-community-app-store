const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL, URLSearchParams } = require('url');

const PORT = Number(process.env.PORT) || 8080;
const SERVICE_NAME = process.env.SERVICE_NAME || 'simply_kaspa_indexer';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DOCKER_SOCKET = '/var/run/docker.sock';

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (parsedUrl.pathname === '/api/logs') {
      await handleLogRequest(parsedUrl.searchParams, res);
      return;
    }
    serveStaticFile(parsedUrl.pathname, res);
  } catch (err) {
    if (!res.writableEnded) {
      respondWithError(res, err);
    }
  }
});

server.listen(PORT, () => {
  console.log(`Kaspa Indexer UI listening on port ${PORT}`);
});

async function handleLogRequest(searchParams, res) {
  const rawLines = searchParams.get('lines') || '400';
  const lines = Number(rawLines);
  if (!Number.isFinite(lines) || lines < 0) {
    respondWithError(res, new Error('Invalid lines parameter'), 400);
    return;
  }

  const container = await findIndexerContainer();
  const logs = await fetchContainerLogs(container.Id, Math.min(Math.max(lines, 1), 5000));
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(logs);
}

async function findIndexerContainer() {
  const filterLabel = JSON.stringify({
    label: [`com.docker.compose.service=${SERVICE_NAME}`],
    status: ['running']
  });
  const filterName = JSON.stringify({ name: [SERVICE_NAME], status: ['running'] });

  const labelMatches = await listContainers(filterLabel);
  if (labelMatches.length > 0) {
    return labelMatches[0];
  }

  const nameMatches = await listContainers(filterName);
  if (nameMatches.length > 0) {
    return nameMatches[0];
  }

  throw new Error(`Container for service '${SERVICE_NAME}' is not running`);
}

async function listContainers(filterJson) {
  const encodedFilters = encodeURIComponent(filterJson);
  const body = await requestDocker(`/containers/json?filters=${encodedFilters}&size=0`);
  return JSON.parse(body.toString('utf8'));
}

async function fetchContainerLogs(containerId, tail) {
  const params = new URLSearchParams({
    stdout: '1',
    stderr: '1',
    timestamps: '1',
    tail: String(tail)
  });
  const raw = await requestDocker(`/containers/${containerId}/logs?${params.toString()}`);
  return demuxDockerLogs(raw);
}

function demuxDockerLogs(buffer) {
  if (!buffer || buffer.length === 0) {
    return '';
  }

  const chunks = [];
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const frameSize = buffer.readUInt32BE(offset + 4);
    const start = offset + 8;
    const end = start + frameSize;
    if (end > buffer.length) {
      break;
    }
    chunks.push(buffer.slice(start, end));
    offset = end;
  }

  if (chunks.length === 0) {
    return buffer.toString('utf8');
  }

  return Buffer.concat(chunks).toString('utf8');
}

function requestDocker(apiPath) {
  return new Promise((resolve, reject) => {
    const opts = {
      method: 'GET',
      socketPath: DOCKER_SOCKET,
      path: apiPath
    };
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        if (res.statusCode >= 400) {
          const message = body.length ? body.toString('utf8') : res.statusMessage;
          reject(new Error(`Docker API error (${res.statusCode}): ${message}`));
          return;
        }
        resolve(body);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function serveStaticFile(requestPath, res) {
  const normalizedPath = path.posix.normalize(requestPath === '/' ? '/index.html' : requestPath);
  const targetPath = path.join(PUBLIC_DIR, normalizedPath);

  if (!targetPath.startsWith(PUBLIC_DIR)) {
    respondWithError(res, new Error('Forbidden'), 403);
    return;
  }

  fs.stat(targetPath, (err, stats) => {
    if (err || !stats.isFile()) {
      respondWithError(res, new Error('Not found'), 404);
      return;
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = mimeType(ext);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    });
    const readStream = fs.createReadStream(targetPath);
    readStream.pipe(res);
    readStream.on('error', (streamErr) => {
      if (!res.writableEnded) {
        respondWithError(res, streamErr);
      }
    });
  });
}

function mimeType(ext) {
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function respondWithError(res, error, status = 500) {
  const message = error && error.message ? error.message : 'Internal server error';
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: message }));
}
