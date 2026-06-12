import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { homedir } from 'node:os';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const root = process.cwd();
const pythonCacheDir = join(root, '.python-cache');
await loadEnvFile(join(root, '.env'));
const port = Number(process.env.PORT || 8173);
const codexConfig = await loadCodexProvider();
const apiKey = resolveApiKey(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || await loadCodexApiKey());
const model = process.env.LLM_MODEL || process.env.OPENAI_MODEL || codexConfig.model || 'gpt-4.1-mini';
const baseUrl = normalizeBaseUrl(process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || codexConfig.baseUrl || 'https://api.openai.com/v1');
const wireApi = process.env.LLM_WIRE_API || process.env.OPENAI_WIRE_API || codexConfig.wireApi || 'responses';
const maxTokens = Number(process.env.LLM_MAX_TOKENS || process.env.OPENAI_MAX_TOKENS || 512);
const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 600000);
const maxRequestBytes = Number(process.env.MAX_REQUEST_BYTES || 12 * 1024 * 1024);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
  '.md': 'text/markdown; charset=utf-8',
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === 'POST' && url.pathname === '/api/chat') {
      await handleChat(request, response);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/vision') {
      await handleVision(request, response);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/identity/enroll') {
      await handleIdentityEnroll(request, response);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/identity/voice/enroll') {
      await handleVoiceEnroll(request, response);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/identity/face/match') {
      await handleFaceMatch(request, response);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/identity/face/match-multi') {
      await handleFaceMatchMulti(request, response);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/identity/face/detect-frame') {
      await handleFaceDetectFrame(request, response);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/emotion/face') {
      await handleEmotionFace(request, response);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/emotion/faces') {
      await handleEmotionFaces(request, response);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/emotion/voice') {
      await handleEmotionVoice(request, response);
      return;
    }
    if (request.method === 'POST' && url.pathname === '/api/audio/diarize') {
      await handleSpeechDiarize(request, response);
      return;
    }
    if (request.method === 'GET' && url.pathname === '/favicon.ico') {
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, {
        ok: true,
        python: pythonRuntime.bin,
        pythonPath: pythonRuntime.executable,
        insightfaceReady: pythonRuntime.insightfaceReady,
        insightfaceDetail: pythonRuntime.detail,
        faceEmotionReady: emotionRuntime.faceEmotionReady,
        voiceEmotionReady: emotionRuntime.voiceEmotionReady,
        emotionFaceModel: emotionRuntime.faceModel,
        emotionVoiceModel: emotionRuntime.voiceModel,
        emotionProbed: emotionRuntime.probed,
        diarizationReady: emotionRuntime.diarizationReady,
        diarizationDetail: emotionRuntime.diarizationDetail,
        yoloFaceReady: emotionRuntime.yoloFaceReady,
        faceDetectorMode: emotionRuntime.faceDetectorMode,
        persistentWorkerReady: emotionRuntime.persistentWorkerReady,
        emotionFusion: emotionRuntime.emotionFusion,
        serProviderLabel: emotionRuntime.serProviderLabel,
        faceProvider: emotionRuntime.faceProvider,
        voiceProvider: emotionRuntime.voiceProvider,
        llmConfigured: Boolean(apiKey),
        llmModel: model,
        llmBaseUrl: baseUrl,
        llmWireApi: wireApi,
        port,
      });
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendJson(response, 405, { error: 'method_not_allowed' });
      return;
    }
    await serveStatic(url.pathname, response, request.method === 'HEAD');
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.statusCode === 413 ? 'request_body_too_large' : 'server_error', detail: error.message });
  }
});

async function handleChat(request, response) {
  const body = await readBody(request);
  const payload = JSON.parse(body || '{}');
  const text = String(payload.text || '').slice(0, 1200);
  const snapshot = payload.snapshot || {};
  const messages = Array.isArray(payload.messages) ? payload.messages.slice(-10) : [];

  if (!apiKey) {
    sendJson(response, 200, {
      reply: localFallback(text, snapshot),
      source: 'local_fallback',
    });
    return;
  }

  const llmResponse = await fetch(apiUrl(wireApi), {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildLlmPayload(text, snapshot, messages)),
  });

  if (!llmResponse.ok) {
    const detail = await llmResponse.text();
    sendJson(response, 200, {
      reply: localFallback(text, snapshot),
      source: 'local_fallback_after_llm_error',
      detail: detail.slice(0, 300),
    });
    return;
  }

  const data = await llmResponse.json();
  const reply = extractResponseText(data) || localFallback(text, snapshot);
  sendJson(response, 200, {
    reply,
    memory: extractMemoryCandidate(text),
    source: 'llm',
  });
}

async function handleVoiceEnroll(request, response) {
  const body = await readBody(request);
  const payload = JSON.parse(body || '{}');
  const worker = await runWorker({ task: 'voice_embedding', audio: payload.audio || '' });
  sendJson(response, 200, worker);
}

async function handleIdentityEnroll(request, response) {
  const body = await readBody(request);
  const payload = JSON.parse(body || '{}');
  const faceCrop = String(payload.faceCrop || payload.image || '');
  const descriptor = Array.isArray(payload.descriptor) ? payload.descriptor.map(Number) : [];
  if (!faceCrop.startsWith('data:image/')) {
    sendJson(response, 200, {
      ok: false,
      provider: 'insightface_arcface',
      error: 'no_face_crop',
      detail: 'Send a MediaPipe face crop as faceCrop (data URL), not a full-frame image.',
      fallbackEmbedding: descriptor.length ? normalizeVector(descriptor) : null,
    });
    return;
  }
  const worker = await runWorker({ task: 'face_embedding', image: faceCrop });
  if (worker.ok) {
    sendJson(response, 200, worker);
    return;
  }
  sendJson(response, 200, {
    ok: false,
    provider: worker.provider || 'insightface_arcface',
    error: worker.error || 'identity_model_not_ready',
    detail: worker.detail || 'Real face identity model is not ready.',
    fallbackEmbedding: descriptor.length ? normalizeVector(descriptor) : null,
  });
}

async function handleFaceMatch(request, response) {
  const body = await readBody(request);
  const payload = JSON.parse(body || '{}');
  const faceCrop = String(payload.faceCrop || '');
  const threshold = Number(payload.threshold || process.env.FACE_MATCH_THRESHOLD || 0.45);
  if (!faceCrop.startsWith('data:image/')) {
    sendJson(response, 200, {
      ok: false,
      provider: 'insightface_arcface',
      error: 'no_face_crop',
      detail: 'faceCrop must be a data:image/ URL from MediaPipe bbox crop.',
      matches: [],
    });
    return;
  }
  const worker = await runWorker({ task: 'face_embedding', image: faceCrop });
  if (!worker.ok) {
    sendJson(response, 200, {
      ok: false,
      provider: worker.provider || 'insightface_arcface',
      error: worker.error || 'no_face',
      detail: worker.detail || '',
      matches: [],
    });
    return;
  }
  const query = worker.embedding || [];
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const matches = candidates
    .map(candidate => {
      const embeddings = Array.isArray(candidate.embeddings) ? candidate.embeddings : [];
      let bestScore = 0;
      let bestSampleIndex = -1;
      embeddings.forEach((embedding, index) => {
        const score = cosineSimilarity(query, embedding);
        if (score > bestScore) {
          bestScore = score;
          bestSampleIndex = index;
        }
      });
      if (!embeddings.length) return null;
      return {
        personId: String(candidate.personId || ''),
        name: String(candidate.name || ''),
        score: Number(bestScore.toFixed(4)),
        bestSampleIndex,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const top = matches[0];
  sendJson(response, 200, {
    ok: true,
    provider: worker.provider || 'insightface_arcface',
    detScore: worker.det_score,
    threshold,
    matched: Boolean(top && top.score >= threshold),
    matches,
  });
}

function rankFaceCandidates(query, candidates, threshold) {
  const matches = candidates
    .map(candidate => {
      const embeddings = Array.isArray(candidate.embeddings) ? candidate.embeddings : [];
      let bestScore = 0;
      let bestSampleIndex = -1;
      embeddings.forEach((embedding, index) => {
        const score = cosineSimilarity(query, embedding);
        if (score > bestScore) {
          bestScore = score;
          bestSampleIndex = index;
        }
      });
      if (!embeddings.length) return null;
      return {
        personId: String(candidate.personId || ''),
        name: String(candidate.name || ''),
        score: Number(bestScore.toFixed(4)),
        bestSampleIndex,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const top = matches[0];
  return {
    matches,
    matched: Boolean(top && top.score >= threshold),
    personId: top?.personId || '',
    score: top?.score || 0,
  };
}

async function handleFaceMatchMulti(request, response) {
  const body = await readBody(request);
  const payload = JSON.parse(body || '{}');
  const threshold = Number(payload.threshold || process.env.FACE_MATCH_THRESHOLD || 0.45);
  const crops = Array.isArray(payload.crops) ? payload.crops : [];
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  if (!crops.length) {
    sendJson(response, 200, {
      ok: false,
      provider: 'insightface_arcface',
      error: 'no_crops',
      results: [],
    });
    return;
  }
  const worker = await runWorker({
    task: 'face_embeddings_batch',
    crops: crops.map(item => ({
      faceId: String(item.faceId || item.id || ''),
      faceCrop: String(item.faceCrop || item.image || ''),
    })).filter(item => item.faceCrop.startsWith('data:image/')),
  });
  if (!worker.ok) {
    sendJson(response, 200, {
      ok: false,
      provider: worker.provider || 'insightface_arcface',
      error: worker.error || 'batch_failed',
      detail: worker.detail || '',
      results: [],
    });
    return;
  }
  const results = (worker.faces || []).map(face => {
    if (!face.ok) {
      return {
        faceId: face.faceId,
        ok: false,
        error: face.error || 'no_face',
        matched: false,
        personId: '',
        score: 0,
        matches: [],
      };
    }
    const ranked = rankFaceCandidates(face.embedding || [], candidates, threshold);
    return {
      faceId: face.faceId,
      ok: true,
      detScore: face.det_score,
      matched: ranked.matched,
      personId: ranked.personId,
      score: ranked.score,
      matches: ranked.matches,
    };
  });
  sendJson(response, 200, {
    ok: true,
    provider: worker.provider || 'insightface_arcface',
    threshold,
    results,
  });
}

async function handleFaceDetectFrame(request, response) {
  const body = await readBody(request);
  const payload = JSON.parse(body || '{}');
  const frame = String(payload.frame || payload.image || '');
  if (!frame.startsWith('data:image/')) {
    sendJson(response, 200, {
      ok: false,
      provider: 'insightface_arcface',
      error: 'no_frame',
      faces: [],
    });
    return;
  }
  const worker = await runWorker({ task: 'face_detect_frame', frame });
  sendJson(response, 200, worker);
}

async function handleEmotionFace(request, response) {
  const body = await readBody(request);
  const payload = JSON.parse(body || '{}');
  const faceCrop = String(payload.faceCrop || payload.image || '');
  if (!faceCrop.startsWith('data:image/')) {
    sendJson(response, 200, {
      ok: false,
      provider: 'vit_fer',
      error: 'no_face_crop',
      detail: 'Send a MediaPipe face crop as faceCrop (data URL).',
    });
    return;
  }
  const worker = await runWorker({ task: 'face_emotion', image: faceCrop });
  sendJson(response, 200, worker);
}

async function handleEmotionFaces(request, response) {
  const body = await readBody(request);
  const payload = JSON.parse(body || '{}');
  const crops = Array.isArray(payload.crops) ? payload.crops : [];
  if (!crops.length) {
    sendJson(response, 200, { ok: false, provider: 'vit_fer', error: 'no_crops', faces: [] });
    return;
  }
  const worker = await runWorker({
    task: 'faces_emotion_batch',
    crops: crops.map(item => ({
      faceId: String(item.faceId || item.id || ''),
      faceCrop: String(item.faceCrop || item.image || ''),
    })).filter(item => item.faceCrop.startsWith('data:image/')),
  });
  sendJson(response, 200, worker);
}

async function handleEmotionVoice(request, response) {
  const body = await readBody(request);
  const payload = JSON.parse(body || '{}');
  const audio = String(payload.audio || '');
  if (!audio.startsWith('data:')) {
    sendJson(response, 200, { ok: false, provider: 'wavlm_ser', error: 'no_audio', detail: 'Send a recorded clip as a data URL.' });
    return;
  }
  const worker = await runWorker({ task: 'voice_emotion', audio });
  sendJson(response, 200, worker);
}

async function handleSpeechDiarize(request, response) {
  const body = await readBody(request);
  const payload = JSON.parse(body || '{}');
  const audio = String(payload.audio || '');
  if (!audio.startsWith('data:')) {
    sendJson(response, 200, { ok: false, provider: 'pyannote_3.1', error: 'no_audio', detail: 'Send a recorded clip as a data URL.' });
    return;
  }
  const worker = await runWorker({ task: 'speech_diarization', audio });
  sendJson(response, 200, worker);
}

function cosineSimilarity(a, b) {
  const left = Array.isArray(a) ? a.map(Number) : [];
  const right = Array.isArray(b) ? b.map(Number) : [];
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  left.forEach((value, index) => {
    dot += value * right[index];
    normA += value * value;
    normB += right[index] * right[index];
  });
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 1e-8 ? dot / denom : 0;
}

const pythonRuntime = await detectPythonRuntime();

// 情绪模型依赖较重(尤其 transformers)，不在启动时阻塞。后台探测一次，结果缓存给 /api/health。
const emotionRuntime = {
  probed: false,
  faceEmotionReady: false,
  voiceEmotionReady: false,
  diarizationReady: false,
  diarizationDetail: 'probing',
  yoloFaceReady: false,
  faceDetectorMode: process.env.FACE_DETECTOR || 'insightface',
  persistentWorkerReady: false,
  faceModel: process.env.EMOTION_FACE_MODEL || 'trpakov/vit-face-expression',
  voiceModel: process.env.SER_MODEL || 'jihedjabnoun/wavlm-base-emotion',
  faceProvider: 'vit_fer',
  voiceProvider: 'wavlm_ser',
  serProviderLabel: 'WavLM · SER',
  emotionFusion: 'mdat',
};

async function probeEmotionRuntime() {
  if (!pythonRuntime.bin) return;
  const result = await runWorker({ task: 'emotion_probe' });
  if (result && result.ok) {
    emotionRuntime.faceEmotionReady = Boolean(result.faceEmotionReady);
    emotionRuntime.voiceEmotionReady = Boolean(result.voiceEmotionReady);
    emotionRuntime.diarizationReady = Boolean(result.diarizationReady);
    if (result.diarizationDetail) emotionRuntime.diarizationDetail = result.diarizationDetail;
    emotionRuntime.yoloFaceReady = Boolean(result.yoloFaceReady);
    if (result.faceDetectorMode) emotionRuntime.faceDetectorMode = result.faceDetectorMode;
    if (result.emotionFusion) emotionRuntime.emotionFusion = result.emotionFusion;
    if (result.faceProvider) emotionRuntime.faceProvider = result.faceProvider;
    if (result.voiceProvider) emotionRuntime.voiceProvider = result.voiceProvider;
    if (result.serProviderLabel) emotionRuntime.serProviderLabel = result.serProviderLabel;
    if (result.faceModel) emotionRuntime.faceModel = result.faceModel;
    if (result.voiceModel) emotionRuntime.voiceModel = result.voiceModel;
  }
  emotionRuntime.persistentWorkerReady = Boolean(persistentWorker?.child && !persistentWorker.child.killed);
  emotionRuntime.probed = true;
}

function pythonCandidates() {
  const fromEnv = process.env.PYTHON_BIN ? [process.env.PYTHON_BIN] : [];
  if (process.platform === 'win32') {
    return [...new Set([...fromEnv, 'python', 'py', 'python3'])];
  }
  return [...new Set([...fromEnv, 'python3', 'python'])];
}

function probePython(bin) {
  return new Promise(resolve => {
    const child = spawn(bin, ['-c', 'import cv2, insightface; print("ok")'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ ok: false, detail: 'probe_timeout' });
    }, 15000);
    child.on('error', error => {
      clearTimeout(timer);
      resolve({ ok: false, detail: error.message });
    });
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0 && stdout.includes('ok')) {
        resolve({ ok: true, detail: stderr.slice(0, 240) });
        return;
      }
      resolve({ ok: false, detail: stderr.slice(0, 500) || stdout.slice(0, 200) || `exit_${code}` });
    });
  });
}

async function detectPythonRuntime() {
  for (const bin of pythonCandidates()) {
    const probe = await probePython(bin);
    if (!probe.ok) continue;
    const executable = await resolvePythonExecutablePath(bin);
    return {
      bin,
      executable,
      insightfaceReady: true,
      detail: probe.detail || 'insightface import ok',
    };
  }
  const fallbackBin = pythonCandidates()[0] || 'python';
  return {
    bin: fallbackBin,
    executable: '',
    insightfaceReady: false,
    detail: 'No Python with insightface+cv2 found. Run: python -m pip install insightface opencv-python onnxruntime',
  };
}

function resolvePythonExecutablePath(bin) {
  return new Promise(resolve => {
    const child = spawn(bin, ['-c', 'import sys; print(sys.executable)'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    child.on('error', () => resolve(''));
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.on('close', () => resolve(stdout.trim()));
  });
}

function runIdentityWorker(payload) {
  return new Promise(resolve => {
    const bin = pythonRuntime.bin;
    const child = spawn(bin, ['identity_worker.py'], {
      cwd: root,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FACE_MODEL_NAME: process.env.FACE_MODEL_NAME || 'buffalo_s',
        PYTHONNOUSERSITE: process.env.PYTHONNOUSERSITE || '1',
        PYTHONPYCACHEPREFIX: process.env.PYTHONPYCACHEPREFIX || pythonCacheDir,
      },
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ ok: false, error: 'identity_worker_timeout', detail: stderr.slice(0, 500), python: bin });
    }, Number(process.env.IDENTITY_TIMEOUT_MS || 180000));
    child.on('error', error => {
      clearTimeout(timer);
      resolve({
        ok: false,
        error: 'python_spawn_failed',
        detail: `${bin}: ${error.message}`,
        python: bin,
      });
    });
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', () => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(stdout || '{}');
        resolve({ ...parsed, python: bin, stderr: stderr.slice(0, 240) });
      } catch {
        resolve({
          ok: false,
          error: 'identity_worker_parse_failed',
          detail: stderr.slice(0, 500) || stdout.slice(0, 500),
          python: bin,
        });
      }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

let persistentWorker = null;
let persistentWorkerNextId = 1;
const persistentWorkerPending = new Map();

function identityWorkerEnv() {
  return {
    ...process.env,
    FACE_MODEL_NAME: process.env.FACE_MODEL_NAME || 'buffalo_s',
    PYTHONNOUSERSITE: process.env.PYTHONNOUSERSITE || '1',
    PYTHONPYCACHEPREFIX: process.env.PYTHONPYCACHEPREFIX || pythonCacheDir,
  };
}

function startPersistentWorker() {
  if (persistentWorker?.child && !persistentWorker.child.killed) return persistentWorker;
  const bin = pythonRuntime.bin;
  const child = spawn(bin, ['identity_worker.py', '--jsonl'], {
    cwd: root,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: identityWorkerEnv(),
  });
  persistentWorker = { child, buffer: '', stderr: '' };
  child.stdout.on('data', chunk => {
    persistentWorker.buffer += chunk.toString();
    const lines = persistentWorker.buffer.split('\n');
    persistentWorker.buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      let parsed;
      try { parsed = JSON.parse(line); } catch { continue; }
      const id = parsed._id;
      const pending = persistentWorkerPending.get(id);
      if (!pending) continue;
      clearTimeout(pending.timer);
      persistentWorkerPending.delete(id);
      delete parsed._id;
      pending.resolve({ ...parsed, python: bin, stderr: persistentWorker.stderr.slice(-240) });
    }
  });
  child.stderr.on('data', chunk => { persistentWorker.stderr += chunk.toString(); });
  child.on('close', () => {
    for (const pending of persistentWorkerPending.values()) {
      clearTimeout(pending.timer);
      pending.resolve({ ok: false, error: 'persistent_worker_exited', detail: persistentWorker?.stderr?.slice(-500) || '', python: bin });
    }
    persistentWorkerPending.clear();
    persistentWorker = null;
    emotionRuntime.persistentWorkerReady = false;
  });
  emotionRuntime.persistentWorkerReady = true;
  return persistentWorker;
}

function runPersistentWorker(payload) {
  return new Promise(resolve => {
    const worker = startPersistentWorker();
    const id = persistentWorkerNextId++;
    const timeoutMs = payload.task === 'emotion_probe'
      ? Number(process.env.IDENTITY_TIMEOUT_MS || 180000)
      : Number(process.env.EMOTION_TIMEOUT_MS || 90000);
    const timer = setTimeout(() => {
      persistentWorkerPending.delete(id);
      resolve({ ok: false, error: 'persistent_worker_timeout', detail: worker.stderr.slice(-500), python: pythonRuntime.bin });
    }, timeoutMs);
    persistentWorkerPending.set(id, { resolve, timer });
    worker.child.stdin.write(`${JSON.stringify({ ...payload, _id: id })}\n`);
  });
}

function runWorker(payload) {
  if (process.env.USE_PERSISTENT_WORKER === '0') {
    return runIdentityWorker(payload);
  }
  return runPersistentWorker(payload).then(result => {
    if (result.error === 'persistent_worker_exited' || result.error === 'persistent_worker_timeout') {
      return runIdentityWorker(payload);
    }
    return result;
  });
}

function runPersistentEmotionWorker(payload) {
  return runPersistentWorker(payload);
}

function normalizeVector(values) {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map(value => Number((value / norm).toFixed(6)));
}

async function handleVision(request, response) {
  const body = await readBody(request);
  const payload = JSON.parse(body || '{}');
  const frames = normalizeVisionFrames(payload);
  const snapshot = payload.snapshot || {};
  const sceneMemory = payload.sceneMemory || snapshot.sceneMemory || {};
  const debug = { model, wireApi, frameCount: frames.length, baseUrl };

  if (!apiKey || !frames.length) {
    sendJson(response, 200, { scene: localVisionFallback(snapshot), debug: { ...debug, reason: 'missing_key_or_frames' } });
    return;
  }

  const visionResponse = await fetch(apiUrl(wireApi), {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildVisionPayload(frames, snapshot, sceneMemory)),
  });

  if (!visionResponse.ok) {
    const detail = await visionResponse.text();
    const vlmError = parseVlmApiError(detail, visionResponse.status);
    sendJson(response, 200, {
      scene: { ...localVisionFallback(snapshot), source: 'local_after_vlm_error', error: vlmError.message, vlmError },
      debug: { ...debug, vlmErrorCode: vlmError.code },
    });
    return;
  }

  const data = await visionResponse.json();
  const text = extractResponseText(data);
  sendJson(response, 200, { scene: parseSceneJson(text, snapshot), debug: { ...debug, rawTextPrefix: text.slice(0, 240) } });
}

function apiUrl(endpoint) {
  const path = String(endpoint || 'responses').replace(/^\/+/, '');
  return `${baseUrl}/${path}`;
}

function usesChatCompletions() {
  return wireApi === 'chat/completions' || wireApi === 'chat/completions/';
}

function extractResponseText(data) {
  if (typeof data.output_text === 'string') return data.output_text.trim();
  if (typeof data.content === 'string') return data.content.trim();
  if (Array.isArray(data.content)) {
    return data.content.map(part => part.text || '').join('').trim();
  }
  if (typeof data.message?.content === 'string') return data.message.content.trim();
  if (Array.isArray(data.message?.content)) {
    return data.message.content.map(part => part.text || '').join('').trim();
  }
  if (typeof data.choices?.[0]?.message?.content === 'string') return data.choices[0].message.content.trim();
  return (data.output || [])
    .flatMap(item => item.content || [])
    .map(part => part.text || '')
    .join('')
    .trim();
}

function buildLlmPayload(text, snapshot, messages) {
  const systemPrompt = [
    '你是一个 embodied relationship agent 的 demo 后端。',
    '目标：低侵入、体贴、可解释、有边界。',
    '不要声称诊断情绪或心理疾病。只基于互动状态、用户话语和关系记忆给陪伴式回应。',
    'interactionSnapshot.affect 是多模态情绪信号(面部+语音融合的 valence/arousal 与离散标签)，只能当作语气线索来温和调整回应；绝对不要把标签念出来或断言“你现在很伤心/很生气”。',
    '回复中文，1-3 句，具体、温和、给用户选择权。',
    'interactionSnapshot.sceneMemory 是实例级关系图谱：可引用 objects（物体实例）和 relations（人-物关系）。',
    'relations 里 status=confirmed 表示用户已确认所属，可以放心引用；status=rejected 表示用户否认，绝不要再说这东西属于他。',
    '如果当前正在确认某物体所属（snapshot.pendingOwnership），用一句自然的话求证，不要追问细节。',
    '如果用户正在使用电脑等且 interruptibility 低，倾向低打扰、简短回应。',
    '如果用户表达强烈风险或自伤意图，建议联系身边可信的人或当地紧急服务。',
  ].join('\n');
  const userContent = JSON.stringify({
    userText: text,
    interactionSnapshot: snapshot,
    recentMessages: messages,
  });

  if (wireApi === 'messages') {
    return {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    };
  }

  if (usesChatCompletions()) {
    return {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    };
  }

  return {
    model,
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    text: { format: { type: 'text' } },
    temperature: 0.7,
    max_output_tokens: maxTokens,
  };
}

function normalizeVisionFrames(payload) {
  if (Array.isArray(payload.frames)) {
    return payload.frames
      .map(frame => typeof frame === 'string' ? { image: frame } : frame)
      .filter(frame => String(frame.image || '').startsWith('data:image/'))
      .slice(-3);
  }
  const image = String(payload.image || '');
  return image.startsWith('data:image/') ? [{ image }] : [];
}

function buildVisionPayload(frames, snapshot, sceneMemory) {
  const instruction = [
    '你是 HRI 机器人实时场景理解模块，负责维护实例级关系图谱。',
    '你会收到最近约 6-8 秒内按时间顺序采样的 3 张图片，以及传感器 snapshot 和已有 SCENE_MEMORY。',
    '只根据这些图片、snapshot 和 SCENE_MEMORY，输出严格 JSON，不要 Markdown，不要解释。',
    '不要诊断情绪。只描述人在这段时间里做了什么、可见物体实例、人-物交互、动作变化、是否适合打断。',
    '【实例级要求】objects 必须是数组，每个元素是对象：{id, label, visual_description, frame_index, bbox_norm, state}。',
    '- id：如果 SCENE_MEMORY.objects 里已有同一个具体物体（看外观/位置判断，不只看类别），复用其 id（如 obj_3）；否则填 null 表示新实例。',
    '- label：物体类别英文小写，如 cup / mug / laptop / phone。',
    '- 特别关注人的手里、脸旁、桌面前景的小物体，即使很小也要尝试识别；包括 comb / hair comb / brush / pen / pencil / toothbrush / remote control / keys / glasses / earbuds / small tool / accessory。',
    '- 如果手部附近有细长、有齿、有柄、黑色/白色小工具，请优先考虑 comb / hair comb / brush，而不是忽略。',
    '- 如果物体不在常见 COCO 类别里，也要用最具体的开放类别 label，例如看到梳子就写 comb，不要退化成 object。',
    '- visual_description：颜色+材质+特征，用于区分同类不同实例，如 "white ceramic mug with handle"。',
    '- frame_index：这个 bbox 所在图片序号，只能是 1/2/3；必须选择你实际看见该物体且 bbox 最准确的那一帧。',
    '- bbox_norm：必须是 [x, y, w, h]，不是 [x1,y1,x2,y2]；取值 0~1，相对 frame_index 对应整帧，用于裁剪缩略图与位置匹配。尽量给准确框。',
    '- state：present 或 gone。',
    '同一类别但外观不同的两个物体（例如白色马克杯和透明玻璃杯）必须是两个不同元素、不同 id。',
    '【交互要求】interactions 必须是数组，每个元素是对象：{object, action, description}。',
    '- object：对应 objects 里的 id 或 label。',
    '- action 只能是：holding / picking_up / putting_down / using / touching / looking_at / near。',
    '- description：简短中文或英文，说明这次交互。',
    '只有真实发生的人-物交互才写入 interactions；只是出现在画面里不算交互。',
    '【所属判断】不要直接断言所有权。除非多次交互，否则只能视为 possibly uses。SCENE_MEMORY.relations 里 status=confirmed 的可当作已确认，status=rejected 的绝对不要再断言属于该用户。',
    'interruptibility 只能是 low / medium / high。robot_action 只能是 observe / soft_checkin / wait / encourage_break。',
    '顶层 JSON 字段：person_activity, objects, interactions, action_change, interruptibility, reason, robot_action。',
  ].join('\n');
  const frameTimes = frames.map((frame, index) => `frame_${index + 1}_time=${frame.time || 'unknown'}`).join('\n');
  const frameContent = frames.map(frame => toMessagesImageContent(frame.image));

  if (wireApi === 'messages') {
    return {
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `${instruction}\n${frameTimes}\nSNAPSHOT=${JSON.stringify(snapshot)}\nSCENE_MEMORY=${JSON.stringify(sceneMemory)}` },
            ...frameContent,
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: Math.min(maxTokens, 1200),
    };
  }

  if (usesChatCompletions()) {
    return {
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `${instruction}\n${frameTimes}\nSNAPSHOT=${JSON.stringify(snapshot)}\nSCENE_MEMORY=${JSON.stringify(sceneMemory)}` },
            ...frames.map(frame => toOpenAIImageUrlContent(frame.image)),
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: Math.min(maxTokens, 1200),
    };
  }

  return {
    model,
    input: [
      { role: 'system', content: instruction },
      {
        role: 'user',
        content: [
          { type: 'input_text', text: JSON.stringify({ snapshot }) },
          ...frames.flatMap((frame, index) => [
            { type: 'input_text', text: `frame_${index + 1}_time=${frame.time || 'unknown'}` },
            { type: 'input_image', image_url: frame.image },
          ]),
        ],
      },
    ],
    temperature: 0.2,
    max_output_tokens: Math.min(maxTokens, 1200),
  };
}

function toMessagesImageContent(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { type: 'text', text: '[invalid image omitted]' };
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: match[1],
      data: match[2],
    },
  };
}

// OpenAI / AIHubMix chat.completions 视觉格式（见 docs.aihubmix.com vision API）
function toOpenAIImageUrlContent(dataUrl) {
  return {
    type: 'image_url',
    image_url: { url: String(dataUrl), detail: 'low' },
  };
}

function parseVlmApiError(detail, status) {
  let parsed = null;
  try {
    const outer = JSON.parse(detail);
    parsed = outer?.error?.error || outer?.error || outer;
  } catch {
    parsed = null;
  }
  const message = String(parsed?.message || detail || `HTTP ${status}`).slice(0, 400);
  const type = String(parsed?.type || parsed?.code || '').toLowerCase();
  const lower = message.toLowerCase();
  let code = 'vlm_api_error';
  let hint = '检查 .env 里的 LLM_API_KEY、LLM_MODEL、LLM_BASE_URL 是否正确。';
  if (lower.includes('quota') || lower.includes('billing') || type.includes('insufficient_quota')) {
    code = 'openai_quota_exceeded';
    hint = 'OpenAI 账户余额/配额用尽。请到 platform.openai.com → Billing 充值或绑定支付方式，或换一个有额度的 API Key。';
  } else if (status === 401 || lower.includes('invalid api key') || lower.includes('incorrect api key')) {
    code = 'invalid_api_key';
    hint = 'API Key 无效或已作废。请在 OpenAI 后台新建 Key 并更新 .env 中的 LLM_API_KEY，然后重启 start.ps1。';
  } else if (status === 429 || lower.includes('rate limit')) {
    code = 'rate_limited';
    hint = '请求过于频繁，稍等 1 分钟后会自动重试。';
  }
  return { code, message, hint, httpStatus: status };
}

function parseSceneJson(text, snapshot) {
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return normalizeScene({ ...parsed, source: 'vlm' });
  } catch {
    return { ...localVisionFallback(snapshot), source: 'local_after_parse_error', raw: text.slice(0, 400) };
  }
}

const INTERACTION_ACTIONS = ['holding', 'picking_up', 'putting_down', 'using', 'touching', 'looking_at', 'near'];

function clamp01(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(1, Math.max(0, num));
}

function normalizeBboxNorm(bbox) {
  if (!Array.isArray(bbox) || bbox.length < 4) return null;
  const x = clamp01(bbox[0]);
  const y = clamp01(bbox[1]);
  let w = clamp01(bbox[2]);
  let h = clamp01(bbox[3]);
  if (bbox[2] > bbox[0] && bbox[3] > bbox[1] && (bbox[2] > 0.65 || bbox[3] > 0.65 || bbox[2] + x > 1.05 || bbox[3] + y > 1.05)) {
    w = clamp01(bbox[2] - bbox[0]);
    h = clamp01(bbox[3] - bbox[1]);
  }
  if (w <= 0 || h <= 0) return null;
  return [Number(x.toFixed(4)), Number(y.toFixed(4)), Number(Math.min(w, 1 - x).toFixed(4)), Number(Math.min(h, 1 - y).toFixed(4))];
}

function normalizeSceneObject(object) {
  if (typeof object === 'string') {
    return { id: null, label: object.trim().toLowerCase(), visual_description: '', bbox_norm: null, state: 'present' };
  }
  if (!object || typeof object !== 'object') return null;
  const label = String(object.label || object.name || '').trim().toLowerCase();
  if (!label) return null;
  return {
    id: object.id ? String(object.id) : null,
    label,
    visual_description: String(object.visual_description || object.description || '').slice(0, 120),
    bbox_norm: normalizeBboxNorm(object.bbox_norm || object.bbox),
    frame_index: Math.min(3, Math.max(1, Number(object.frame_index || object.frame || object.frameIndex || 3) || 3)),
    state: object.state === 'gone' ? 'gone' : 'present',
  };
}

function normalizeSceneInteraction(interaction) {
  if (typeof interaction === 'string') {
    return { object: '', action: 'near', description: interaction.slice(0, 160) };
  }
  if (!interaction || typeof interaction !== 'object') return null;
  const action = INTERACTION_ACTIONS.includes(interaction.action) ? interaction.action : 'near';
  return {
    object: String(interaction.object || interaction.target || '').slice(0, 60),
    action,
    description: String(interaction.description || interaction.summary || '').slice(0, 160),
  };
}

function normalizeScene(scene) {
  return {
    person_activity: String(scene.person_activity || 'unknown'),
    objects: Array.isArray(scene.objects) ? scene.objects.map(normalizeSceneObject).filter(Boolean).slice(0, 12) : [],
    interactions: Array.isArray(scene.interactions) ? scene.interactions.map(normalizeSceneInteraction).filter(Boolean).slice(0, 10) : [],
    action_change: String(scene.action_change || ''),
    interruptibility: ['low', 'medium', 'high'].includes(scene.interruptibility) ? scene.interruptibility : 'medium',
    reason: String(scene.reason || ''),
    robot_action: ['observe', 'soft_checkin', 'wait', 'encourage_break'].includes(scene.robot_action) ? scene.robot_action : 'observe',
    source: scene.source || 'vlm',
  };
}

function localVisionFallback(snapshot) {
  const signals = snapshot.signals || {};
  const lowInterrupt = snapshot.interactionState === 'needs_quiet' || snapshot.quietNeed > 65;
  return normalizeScene({
    person_activity: signals.facePresent ? 'person facing camera or nearby' : 'person presence uncertain',
    objects: [],
    interactions: [],
    interruptibility: lowInterrupt ? 'low' : 'medium',
    reason: lowInterrupt ? 'local signals indicate quiet need or low readiness' : 'VLM unavailable; using local signals only',
    robot_action: lowInterrupt ? 'wait' : 'observe',
    source: 'local_fallback',
  });
}

function extractMemoryCandidate(text) {
  if (!/我(不喜欢|喜欢|希望|需要|讨厌|习惯)|以后|记住/.test(text)) return '';
  return text.length > 80 ? text.slice(0, 80) : text;
}

function localFallback(text, snapshot) {
  const state = snapshot.interactionState || 'observing';
  if (/安静|别问|别说|不要/.test(text) || state === 'needs_quiet') {
    return '好，我会降低主动性。你不用解释，我先安静陪着；如果你需要我，再叫我就好。';
  }
  if (/累|烦|压力|难受|焦虑|崩/.test(text) || state === 'low_energy') {
    return '我听到了。先不追问原因，你可以只选一个：我陪你安静十分钟，或者帮你把眼前的事拆成一步。';
  }
  if (state === 'high_arousal') {
    return '我先不展开长聊。现在信号更像高唤醒状态，我们可以先做 30 秒慢呼吸，再决定要不要继续说。';
  }
  return `我在。当前我只把你判断为 ${state}，不是诊断情绪；如果我误会了，你可以直接纠正我。`;
}

async function serveStatic(pathname, response, headOnly) {
  const safePath = normalize(decodeURIComponent(pathname)).replace(/^\.\.(\/|\\|$)/, '');
  const trimmed = safePath.replace(/^[\\/]+/, '');
  const isRoot = !trimmed || trimmed === '.' || safePath === '/' || safePath === '\\';
  const filePath = join(root, isRoot ? 'index.html' : trimmed);
  try {
    await access(filePath, constants.R_OK);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  const content = await readFile(filePath);
  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
    'Content-Length': content.length,
  });
  if (!headOnly) response.end(content);
  else response.end();
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > maxRequestBytes) {
        const error = new Error(`request_body_too_large:${body.length}`);
        error.statusCode = 413;
        reject(error);
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

server.listen(port, '127.0.0.1', () => {
  console.log(`HRI demo server listening at http://127.0.0.1:${port}/`);
  if (apiKey) {
    console.log(`VLM/LLM enabled: ${model} @ ${baseUrl}/${wireApi}`);
  } else {
    console.log('VLM/LLM NOT configured — scene understanding will NOT detect objects.');
    console.log('Fix: edit .env — set LLM_API_KEY + a vision-capable model (e.g. gpt-4o), restart start.ps1');
  }
  if (pythonRuntime.insightfaceReady) {
    console.log(`InsightFace ready via "${pythonRuntime.bin}" (${pythonRuntime.executable || 'path unknown'})`);
  } else {
    console.log(`InsightFace NOT ready: ${pythonRuntime.detail}`);
    console.log('Fix: in the same terminal, run: python -m pip install insightface opencv-python onnxruntime');
  }
  probeEmotionRuntime()
    .then(() => {
      console.log(`Emotion models — face(ViT-FER): ${emotionRuntime.faceEmotionReady ? 'ready' : 'NOT ready'} · voice(WavLM SER): ${emotionRuntime.voiceEmotionReady ? 'ready' : 'NOT ready'} (${emotionRuntime.serProviderLabel}) · fusion(MDAT)`);
      console.log(`Diarization — ${emotionRuntime.diarizationReady ? 'pyannote 3.1 ready' : emotionRuntime.diarizationDetail || 'pyannote not configured'}`);
      console.log(`Python worker — ${emotionRuntime.persistentWorkerReady ? 'persistent JSONL ready' : 'spawn-per-request fallback'}`);
      if (!emotionRuntime.faceEmotionReady || !emotionRuntime.voiceEmotionReady) {
        console.log('Fix (optional): see .env.example INSTALL block — pip install torch torchaudio transformers pillow opencv-python');
      }
    })
    .catch(() => {});
});

async function loadEnvFile(path) {
  try {
    const text = await readFile(path, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // no .env file
  }
}

function resolveApiKey(raw) {
  const key = String(raw || '').trim();
  if (!key) return '';
  if (/^(sk-your-key|sk-your-openai-key|your-key|changeme|placeholder)$/i.test(key)) return '';
  if (key === 'sk-...') return '';
  return key;
}

async function loadCodexApiKey() {
  try {
    const authPath = join(homedir(), '.codex', 'auth.json');
    const auth = JSON.parse(await readFile(authPath, 'utf8'));
    return auth.OPENAI_API_KEY || '';
  } catch {
    return '';
  }
}

async function loadCodexProvider() {
  try {
    const configPath = join(homedir(), '.codex', 'config.toml');
    const config = await readFile(configPath, 'utf8');
    return {
      model: readTomlString(config, 'model'),
      baseUrl: readTomlString(config, 'base_url'),
      wireApi: readTomlString(config, 'wire_api'),
    };
  } catch {
    return {};
  }
}

function readTomlString(config, key) {
  const match = config.match(new RegExp(`(?:^|\\n)\\s*${key}\\s*=\\s*["']([^"']+)["']`));
  return match ? match[1] : '';
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '');
}
