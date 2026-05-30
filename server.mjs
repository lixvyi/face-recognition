import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { homedir } from 'node:os';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const root = process.cwd();
const port = Number(process.env.PORT || 8173);
const codexConfig = await loadCodexProvider();
const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || await loadCodexApiKey();
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

  const llmResponse = await fetch(`${baseUrl}/${wireApi}`, {
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
  const worker = await runIdentityWorker({ task: 'voice_embedding', audio: payload.audio || '' });
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
  const worker = await runIdentityWorker({ task: 'face_embedding', image: faceCrop });
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
  const worker = await runIdentityWorker({ task: 'face_embedding', image: faceCrop });
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
      env: { ...process.env, FACE_MODEL_NAME: process.env.FACE_MODEL_NAME || 'buffalo_s' },
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

  const visionResponse = await fetch(`${baseUrl}/${wireApi}`, {
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
    sendJson(response, 200, { scene: { ...localVisionFallback(snapshot), source: 'local_after_vlm_error', error: detail.slice(0, 240) }, debug });
    return;
  }

  const data = await visionResponse.json();
  const text = extractResponseText(data);
  sendJson(response, 200, { scene: parseSceneJson(text, snapshot), debug: { ...debug, rawTextPrefix: text.slice(0, 240) } });
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
    '回复中文，1-3 句，具体、温和、给用户选择权。',
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
    '你是 HRI 机器人实时场景理解模块。',
    '你会收到最近约 9-10 秒内按时间顺序采样的 3 张图片，以及传感器 snapshot。',
    '只根据这些图片和 snapshot，输出严格 JSON，不要 Markdown。',
    '不要诊断情绪。描述人在这段时间里做了什么、可见物体、人-物交互、动作变化、是否适合打断。',
    '如果 SCENE_MEMORY 里已有相同/相近物体或人物，请在 objects/interactions/reason 中复用已有 stable id，例如 obj_3、rel_2，不要每轮当成全新物体。',
    '如果看到某个物体可能属于当前人物，只能说 possibly uses/possibly owns，除非多次出现。',
    'interruptibility 只能是 low / medium / high。robot_action 只能是 observe / soft_checkin / wait / encourage_break。',
    'JSON 字段：person_activity, objects, interactions, action_change, interruptibility, reason, robot_action。objects 可以是字符串，也可以是 {id,label}。',
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

function parseSceneJson(text, snapshot) {
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return normalizeScene({ ...parsed, source: 'vlm' });
  } catch {
    return { ...localVisionFallback(snapshot), source: 'local_after_parse_error', raw: text.slice(0, 400) };
  }
}

function normalizeScene(scene) {
  return {
    person_activity: String(scene.person_activity || 'unknown'),
    objects: Array.isArray(scene.objects) ? scene.objects.map(object => typeof object === 'string' ? object : (object.label || object.name || object.id || JSON.stringify(object))).slice(0, 12) : [],
    interactions: Array.isArray(scene.interactions) ? scene.interactions.map(String).slice(0, 8) : [],
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
  console.log(apiKey ? `LLM enabled with ${model} at ${baseUrl}/${wireApi}` : 'OPENAI_API_KEY not set; using local fallback replies.');
  if (pythonRuntime.insightfaceReady) {
    console.log(`InsightFace ready via "${pythonRuntime.bin}" (${pythonRuntime.executable || 'path unknown'})`);
  } else {
    console.log(`InsightFace NOT ready: ${pythonRuntime.detail}`);
    console.log('Fix: in the same terminal, run: python -m pip install insightface opencv-python onnxruntime');
  }
});

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
