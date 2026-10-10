const http = require('http');
const fs = require('fs');
const path = require('path');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { GoogleGenAI, Type, Modality } = require('@google/genai');

const PORT = process.env.PORT || 8080;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'velocity-tracker-483022-t5';
const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'iberaza1@gmail.com').toLowerCase();
const MAX_BODY_BYTES = 2 * 1024 * 1024;

initializeApp({ credential: applicationDefault(), projectId: FIREBASE_PROJECT_ID });

const SYSTEM_INSTRUCTION = `Role: Senior Sports Data Scientist.
Objective: Analyze performance data for a high-level runner with a Physics background.

Scientific Models:
1. BANISTER IMPULSE-RESPONSE: Calculate TRIMP (Training Impulse) from distance and power.
2. WIDMARK MODEL: Analyze ethanol clearance vs. performance decay ( cardiac drift).
3. EFFICIENCY FACTOR (EF): Evaluate Pace/Watts as a measure of metabolic economy.

Output Requirements:
Return a valid JSON object with the following sections:
- THE KINEMATIC UPDATE: Summary of cumulative impulse and mechanical power output.
- THE BEER-PERFORMANCE MATRIX: Summary of how recent consumption is impacting pace variance (independent: beer, dependent: pace).
- THE ACTION PLAN: Data-backed recommendations for the next run.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary_metrics: {
      type: Type.OBJECT,
      properties: {
        rolling_avg_pace: { type: Type.NUMBER },
        correlation_coefficient: { type: Type.NUMBER },
        metabolic_tax_estimate: { type: Type.NUMBER },
        efficiency_factor: { type: Type.NUMBER },
        mechanical_output_avg: { type: Type.NUMBER }
      },
      required: ["rolling_avg_pace", "correlation_coefficient", "metabolic_tax_estimate", "efficiency_factor", "mechanical_output_avg"]
    },
    executive_summary: {
      type: Type.OBJECT,
      properties: {
        kinematic_update: { type: Type.STRING },
        beer_performance_matrix: { type: Type.STRING },
        action_plan: { type: Type.STRING }
      },
      required: ["kinematic_update", "beer_performance_matrix", "action_plan"]
    },
    status: { 
      type: Type.STRING, 
      enum: ['Peaking', 'Overtraining', 'Plateau', 'Improving', 'Recovery']
    },
    anomalies: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["summary_metrics", "executive_summary", "status", "anomalies"]
};

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (e) {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

// Verifies the Firebase ID token and only allows the verified owner account.
async function requireOwner(req) {
  const header = req.headers['authorization'] || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) throw Object.assign(new Error('Missing token'), { status: 401 });
  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(match[1]);
  } catch (e) {
    throw Object.assign(new Error('Invalid token'), { status: 401 });
  }
  if (!decoded.email_verified || (decoded.email || '').toLowerCase() !== OWNER_EMAIL) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  return decoded;
}

function getAi() {
  if (!process.env.GEMINI_API_KEY) {
    throw Object.assign(new Error('GEMINI_API_KEY not configured'), { status: 500 });
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

async function handleAnalyze(body) {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Execute biophysical audit: ${JSON.stringify(body.inputData || {})}`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 24000 },
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA
    }
  });
  return JSON.parse(response.text);
}

async function handleSpeech(body) {
  const distance = Number(body.distance) || 0;
  const pace = String(body.pace || '').slice(0, 32);
  const time = String(body.time || '').slice(0, 32);
  const ai = getAi();
  const prompt = `Report: ${distance.toFixed(2)} miles. Pace: ${pace}. Time: ${time}. Professional tone.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });
  const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audio) throw new Error('Audio generation failed');
  return { audio };
}

const API_ROUTES = {
  '/api/coach/analyze': handleAnalyze,
  '/api/coach/speech': handleSpeech
};

async function handleApi(req, res, handler) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
  try {
    await requireOwner(req);
    const body = await readBody(req);
    sendJson(res, 200, await handler(body));
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error('API error:', e);
    sendJson(res, status, { error: status >= 500 && !e.status ? 'Server error' : e.message });
  }
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const DIST_ROOT = path.resolve(__dirname, 'dist');
const INDEX_HTML = path.join(DIST_ROOT, 'index.html');

function cacheHeaderFor(filePath) {
  const rel = path.relative(DIST_ROOT, filePath).split(path.sep).join('/');
  if (rel === 'index.html' || rel === 'sw.js' || rel === 'manifest.json') return 'no-cache';
  if (rel.startsWith('assets/')) return 'public, max-age=31536000, immutable';
  return 'public, max-age=3600';
}

function sendNotFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

function sendFile(req, res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
      res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': cacheHeaderFor(filePath),
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(req.method === 'HEAD' ? undefined : content);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  if (urlPath.startsWith('/api/')) {
    const handler = API_ROUTES[urlPath];
    if (!handler) return sendJson(res, 404, { error: 'Not found' });
    handleApi(req, res, handler);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad request');
    return;
  }
  if (decoded.includes('\0')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad request');
    return;
  }

  const relPath = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const filePath = path.resolve(DIST_ROOT, relPath);
  if (filePath !== DIST_ROOT && !filePath.startsWith(DIST_ROOT + path.sep)) {
    return sendNotFound(res);
  }

  fs.stat(filePath, (statErr, stats) => {
    if (!statErr && stats.isFile()) {
      return sendFile(req, res, filePath);
    }
    // SPA fallback only for app routes (no file extension); missing files 404.
    if (path.extname(relPath)) return sendNotFound(res);
    sendFile(req, res, INDEX_HTML);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});