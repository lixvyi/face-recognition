const elements = {
  startButton: document.querySelector('#startButton'),
  cameraOnlyButton: document.querySelector('#cameraOnlyButton'),
  quietButton: document.querySelector('#quietButton'),
  video: document.querySelector('#video'),
  canvas: document.querySelector('#analysisCanvas'),
  faceOverlay: document.querySelector('#faceOverlay'),
  faceHud: document.querySelector('#faceHud'),
  privacyBadge: document.querySelector('#privacyBadge'),
  cameraDebug: document.querySelector('#cameraDebug'),
  robot: document.querySelector('#robot'),
  robotStatus: document.querySelector('#robotStatus'),
  presenceMeter: document.querySelector('#presenceMeter'),
  voiceMeter: document.querySelector('#voiceMeter'),
  motionMeter: document.querySelector('#motionMeter'),
  lightMeter: document.querySelector('#lightMeter'),
  gazeMeter: document.querySelector('#gazeMeter'),
  postureMeter: document.querySelector('#postureMeter'),
  smileMeter: document.querySelector('#smileMeter'),
  browMeter: document.querySelector('#browMeter'),
  eyeMeter: document.querySelector('#eyeMeter'),
  mouthMeter: document.querySelector('#mouthMeter'),
  presenceText: document.querySelector('#presenceText'),
  voiceText: document.querySelector('#voiceText'),
  motionText: document.querySelector('#motionText'),
  lightText: document.querySelector('#lightText'),
  gazeText: document.querySelector('#gazeText'),
  postureText: document.querySelector('#postureText'),
  smileText: document.querySelector('#smileText'),
  browText: document.querySelector('#browText'),
  eyeText: document.querySelector('#eyeText'),
  mouthText: document.querySelector('#mouthText'),
  stateCore: document.querySelector('#stateCore'),
  stateList: document.querySelector('#stateList'),
  intervention: document.querySelector('#intervention'),
  memoryForm: document.querySelector('#memoryForm'),
  memoryInput: document.querySelector('#memoryInput'),
  memoryList: document.querySelector('#memoryList'),
  timeline: document.querySelector('#timeline'),
  conversation: document.querySelector('#conversation'),
  listenButton: document.querySelector('#listenButton'),
  chatInput: document.querySelector('#chatInput'),
  sendButton: document.querySelector('#sendButton'),
  speakToggle: document.querySelector('#speakToggle'),
  asrStatus: document.querySelector('#asrStatus'),
  activePerson: document.querySelector('#activePerson'),
  personStrategy: document.querySelector('#personStrategy'),
  identityFusion: document.querySelector('#identityFusion'),
  faceEnrollDebug: document.querySelector('#faceEnrollDebug'),
  faceMatchCandidates: document.querySelector('#faceMatchCandidates'),
  personForm: document.querySelector('#personForm'),
  personNameInput: document.querySelector('#personNameInput'),
  personList: document.querySelector('#personList'),
  enrollVoiceButton: document.querySelector('#enrollVoiceButton'),
  blendshapeList: document.querySelector('#blendshapeList'),
  sceneStatus: document.querySelector('#sceneStatus'),
  sceneSummary: document.querySelector('#sceneSummary'),
  sceneMemory: document.querySelector('#sceneMemory'),
  serverStatus: document.querySelector('#serverStatus'),
  clearPeopleButton: document.querySelector('#clearPeopleButton'),
};

const state = {
  started: false,
  quietUntil: 0,
  lastFrame: null,
  light: 0,
  motion: 0,
  voice: 0,
  presence: 0,
  gaze: 0,
  posture: 0,
  smile: 0,
  brow: 0,
  eye: 0,
  mouth: 0,
  facePresent: false,
  headYaw: 0,
  headPitch: 0,
  faceLandmarker: null,
  faceModelReady: false,
  faceModelError: '',
  lastFaceAt: 0,
  faceDescriptor: null,
  faceBlendshapes: [],
  faceLandmarkCount: 0,
  lastFaceLandmarks: null,
  lastFaceBboxNorm: null,
  lastFaceCropQuality: 'unknown',
  lastFaceCropReason: '',
  lastFaceMatchAt: 0,
  faceMatchInFlight: false,
  faceMatchThreshold: 0.45,
  enrollBusy: false,
  serverOnline: false,
  insightfaceReady: false,
  llmConfigured: false,
  identityPython: '',
  visionPausedUntil: 0,
  activePersonId: '',
  activePersonScore: 0,
  explicitPersonId: '',
  faceMatch: { personId: '', score: 0, provider: '', candidates: [] },
  voiceMatch: { personId: '', score: 0 },
  voiceDescriptor: null,
  audioStream: null,
  people: JSON.parse(localStorage.getItem('hri-demo-people') || '[]'),
  scene: JSON.parse(localStorage.getItem('hri-demo-scene') || 'null') || null,
  sceneMemory: JSON.parse(localStorage.getItem('hri-demo-scene-memory') || 'null') || {
    objects: [],
    relations: [],
    events: [],
    counters: { object: 0, relation: 0, event: 0 },
  },
  pendingOwnership: null,
  sceneBusy: false,
  sceneFrames: [],
  lastSceneAt: 0,
  readiness: 35,
  arousal: 20,
  energy: 45,
  quietNeed: 20,
  interactionState: 'observing',
  confidence: 0.35,
  intervention: 'observe',
  lastInterventionAt: 0,
  memories: JSON.parse(localStorage.getItem('hri-demo-memories') || '[]'),
  feedback: JSON.parse(localStorage.getItem('hri-demo-feedback') || '{"good":0,"bad":0,"silent":0}'),
  events: JSON.parse(localStorage.getItem('hri-demo-events') || '[]'),
  messages: JSON.parse(localStorage.getItem('hri-demo-messages') || '[]'),
  speakReplies: JSON.parse(localStorage.getItem('hri-demo-speak') || 'true'),
  recognition: null,
  listening: false,
  baseline: JSON.parse(localStorage.getItem('hri-demo-baseline') || 'null') || {
    samples: 0,
    voice: 12,
    motion: 12,
    light: 45,
    gaze: 35,
    posture: 50,
    smile: 8,
    brow: 8,
    eye: 65,
    mouth: 5,
  },
};

const defaultMemories = [
  '偏好低打扰：先用短句或安静陪伴，不直接追问。',
  '当用户疲惫时，先给选择权：“要不要我陪你安静一会儿？”',
  '主动行为必须解释触发原因，并允许撤销。',
  '系统只判断互动状态，不宣称读懂真实情绪。',
];

if (!state.memories.length) {
  state.memories = defaultMemories;
  persistMemories();
}

migratePeople();
migrateGraph();

// ---- 实例级关系图谱（episodic / 图记忆）----
// 关系强度与置信度模型：弱(seen_with) -> 中(uses) -> 强(frequently_uses)，并支持用户确认/否认。
const RELATION_STRENGTHS = { weak: 0.3, medium: 0.6, strong: 0.85 };
const INTERACTION_LABELS = {
  holding: '拿着',
  picking_up: '拿起',
  putting_down: '放下',
  using: '使用',
  touching: '触碰',
  looking_at: '注视',
  near: '靠近',
};
const CONTACT_ACTIONS = ['holding', 'picking_up', 'putting_down', 'using', 'touching'];

function migrateGraph() {
  const mem = state.sceneMemory;
  mem.objects = Array.isArray(mem.objects) ? mem.objects : [];
  mem.relations = Array.isArray(mem.relations) ? mem.relations : [];
  mem.events = Array.isArray(mem.events) ? mem.events : [];
  mem.counters = mem.counters || { object: 0, relation: 0, event: 0 };
  mem.objects.forEach(object => {
    if (typeof object.visualDescription !== 'string') object.visualDescription = '';
    if (!('bboxNorm' in object)) object.bboxNorm = null;
    if (!('thumbnail' in object)) object.thumbnail = '';
    if (!object.status) object.status = 'present';
    if (typeof object.seenCount !== 'number') object.seenCount = 1;
  });
  mem.relations.forEach(relation => {
    if (!relation.personId && relation.sourceId) relation.personId = relation.sourceId;
    if (!relation.objectId && relation.targetId) relation.objectId = relation.targetId;
    if (!relation.personName) relation.personName = '未知用户';
    if (!relation.status) relation.status = 'hypothesis';
    if (!relation.strength) relation.strength = 'weak';
    if (typeof relation.interactionCount !== 'number') relation.interactionCount = 0;
    if (typeof relation.contactCount !== 'number') relation.contactCount = 0;
    if (typeof relation.lastAskedAt !== 'number') relation.lastAskedAt = 0;
    if (!Array.isArray(relation.evidence)) relation.evidence = [];
  });
}

function persistGraph() {
  localStorage.setItem('hri-demo-scene-memory', JSON.stringify(state.sceneMemory));
}

function bboxCenter(bbox) {
  return [bbox[0] + bbox[2] / 2, bbox[1] + bbox[3] / 2];
}

function bboxCenterDistance(a, b) {
  const [ax, ay] = bboxCenter(a);
  const [bx, by] = bboxCenter(b);
  return Math.hypot(ax - bx, ay - by);
}

function descriptionSimilarity(a, b) {
  const ta = new Set(String(a || '').toLowerCase().split(/[^a-z0-9\u4e00-\u9fa5]+/).filter(Boolean));
  const tb = new Set(String(b || '').toLowerCase().split(/[^a-z0-9\u4e00-\u9fa5]+/).filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  ta.forEach(token => { if (tb.has(token)) shared += 1; });
  return shared / Math.max(ta.size, tb.size);
}

// 实例匹配：先用 VLM 复用的 id，再用同类别 + 空间位置 + 外观描述判断是否同一实例。
function matchSceneObjectInstance(input) {
  const objects = state.sceneMemory.objects;
  if (input.id) {
    const byId = objects.find(item => item.id === input.id);
    if (byId) return byId;
  }
  const normalized = normalizeLabel(input.label);
  const sameLabel = objects.filter(item => item.normalized === normalized);
  if (!sameLabel.length) return null;
  if (sameLabel.length === 1 && !input.bboxNorm) return sameLabel[0];
  let best = null;
  let bestScore = 0;
  sameLabel.forEach(candidate => {
    let score = 0.35;
    if (input.bboxNorm && candidate.bboxNorm) {
      const distance = bboxCenterDistance(input.bboxNorm, candidate.bboxNorm);
      score += Math.max(0, 0.45 * (1 - distance / 0.35));
    }
    score += 0.2 * descriptionSimilarity(input.visualDescription, candidate.visualDescription);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });
  return bestScore >= 0.55 ? best : null;
}

// 从当前视频帧按归一化 bbox 裁剪一张缩略图作为图像证据。
function captureRegionThumbnail(bboxNorm, maxEdge = 96) {
  if (!bboxNorm || !state.started) return '';
  const vw = elements.video.videoWidth;
  const vh = elements.video.videoHeight;
  if (!vw || !vh) return '';
  const sx = Math.round(bboxNorm[0] * vw);
  const sy = Math.round(bboxNorm[1] * vh);
  const sw = Math.max(8, Math.round(bboxNorm[2] * vw));
  const sh = Math.max(8, Math.round(bboxNorm[3] * vh));
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  try {
    canvas.getContext('2d').drawImage(elements.video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.5);
  } catch {
    return '';
  }
}

function newSampleId() {
  return crypto.randomUUID ? crypto.randomUUID() : `sample_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function migratePeople() {
  let changed = false;
  state.people = state.people.map(person => {
    const next = { ...person };
    if (!Array.isArray(next.faceEmbeddings)) {
      next.faceEmbeddings = [];
      changed = true;
    }
    if (!next.faceEmbeddings.length && Array.isArray(next.faceDescriptor) && next.faceDescriptor.length) {
      next.faceEmbeddings.push({
        id: newSampleId(),
        embedding: next.faceDescriptor,
        provider: next.faceProvider || 'mediapipe_descriptor_adapter',
        capturedAt: new Date().toISOString(),
      });
      changed = true;
    }
    next.samples = next.faceEmbeddings.length;
    if (!next.faceProvider && next.faceEmbeddings.length) {
      next.faceProvider = next.faceEmbeddings[next.faceEmbeddings.length - 1].provider;
    }
    return next;
  });
  if (changed) persistPeople();
}

function computeFaceBboxNorm(landmarks, padding = 0.18) {
  if (!landmarks?.length) return null;
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  landmarks.forEach(point => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });
  const width = maxX - minX;
  const height = maxY - minY;
  if (width < 0.02 || height < 0.02) return null;
  const padX = width * padding;
  const padY = height * padding;
  let x = minX - padX;
  let y = minY - padY;
  let w = width + padX * 2;
  let h = height + padY * 2;
  x = Math.max(0, x);
  y = Math.max(0, y);
  w = Math.min(1 - x, w);
  h = Math.min(1 - y, h);
  if (w < 0.02 || h < 0.02) return null;
  return { x, y, w, h };
}

function assessFaceCropQuality(bboxNorm) {
  if (!bboxNorm) return { quality: 'no_face', reason: 'no_landmarks' };
  const area = bboxNorm.w * bboxNorm.h;
  if (area < 0.0064) return { quality: 'poor', reason: 'face_too_small' };
  if (area > 0.4225) return { quality: 'poor', reason: 'face_too_large' };
  if (Math.abs(state.headYaw) > 35) return { quality: 'poor', reason: 'yaw_too_high' };
  if (Math.abs(state.headPitch) > 30) return { quality: 'poor', reason: 'pitch_too_high' };
  if (state.faceLandmarkCount < 400) return { quality: 'poor', reason: 'insufficient_landmarks' };
  return { quality: 'good', reason: 'ok' };
}

function trimFaceEmbeddings(person) {
  const insight = person.faceEmbeddings.filter(sample => sample.provider === 'insightface_arcface');
  const fallback = person.faceEmbeddings.filter(sample => sample.provider !== 'insightface_arcface');
  const trimmedInsight = insight.slice(-8);
  const trimmedFallback = fallback.slice(-2);
  person.faceEmbeddings = [...trimmedInsight, ...trimmedFallback];
  person.samples = person.faceEmbeddings.length;
}

function pushFaceEmbedding(person, sample) {
  if (!person.faceEmbeddings) person.faceEmbeddings = [];
  person.faceEmbeddings.push({
    id: newSampleId(),
    embedding: sample.embedding,
    provider: sample.provider,
    capturedAt: sample.capturedAt || new Date().toISOString(),
    detScore: sample.detScore,
    bboxNorm: sample.bboxNorm || state.lastFaceBboxNorm,
    thumbnailDataUrl: sample.thumbnailDataUrl || null,
  });
  trimFaceEmbeddings(person);
  person.faceProvider = sample.provider;
  person.faceDescriptor = sample.embedding;
  person.samples = person.faceEmbeddings.length;
}

function buildFaceMatchCandidatesPayload() {
  return state.people
    .map(person => ({
      personId: person.id,
      name: person.name,
      embeddings: (person.faceEmbeddings || [])
        .filter(sample => sample.provider === 'insightface_arcface')
        .map(sample => sample.embedding)
        .filter(embedding => Array.isArray(embedding) && embedding.length),
    }))
    .filter(person => person.embeddings.length);
}

function hasInsightFaceSamples() {
  return state.people.some(person => (person.faceEmbeddings || []).some(sample => sample.provider === 'insightface_arcface'));
}

function describeIdentityError(data) {
  const error = data?.error || 'not_ready';
  const hints = {
    missing_dependencies: '请在运行 node server.mjs 的终端执行：python -m pip install insightface opencv-python onnxruntime',
    no_face: 'InsightFace 在裁剪图上未检测到脸，请正对摄像头、靠近一些再绑定',
    identity_worker_timeout: 'InsightFace 首次加载超时（模型下载可能较慢），保持 node 终端不关，等 1–2 分钟后重试',
    identity_worker_parse_failed: 'Python worker 输出异常，请看 node 终端窗口里的报错',
    python_spawn_failed: `无法启动 Python：${data?.detail || ''}`,
    no_face_crop: '未收到人脸裁剪图，请确认 crop=good 后再绑定',
  };
  return hints[error] || data?.detail || error;
}

async function pingServer() {
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    if (!response.ok) throw new Error(`health ${response.status}`);
    const data = await response.json();
    state.serverOnline = true;
    state.insightfaceReady = Boolean(data.insightfaceReady);
    state.llmConfigured = Boolean(data.llmConfigured);
    state.identityPython = data.python || '';
    renderServerStatus(data);
    return data;
  } catch (error) {
    state.serverOnline = false;
    state.insightfaceReady = false;
    renderServerStatus({ ok: false, detail: error.message });
    return null;
  }
}

function renderServerStatus(health) {
  if (!elements.serverStatus) return;
  if (!health?.ok) {
    elements.serverStatus.textContent = '后端未连接：请先运行 .\\start.ps1，再打开本页';
    elements.serverStatus.className = 'server-status bad';
    return;
  }
  const parts = [];
  if (health.llmConfigured) {
    parts.push(`VLM 已配置 (${health.llmModel || 'model'})`);
  } else {
    parts.push('VLM 未配置：编辑 .env 设置 LLM_API_KEY 后重启 start.ps1');
  }
  if (health.insightfaceReady) {
    parts.push(`InsightFace 就绪 (${health.python || 'python'})`);
  } else {
    parts.push(`InsightFace 未就绪：${health.insightfaceDetail || '见终端'}`);
  }
  elements.serverStatus.textContent = `后端已连接 · ${parts.join(' · ')}`;
  elements.serverStatus.className = health.llmConfigured && health.insightfaceReady
    ? 'server-status good'
    : (health.llmConfigured || health.insightfaceReady ? 'server-status warn' : 'server-status bad');
}

function clearAllPeople() {
  state.people = [];
  state.activePersonId = '';
  state.explicitPersonId = '';
  state.faceMatch = { personId: '', score: 0, provider: '', candidates: [] };
  persistPeople();
  renderPeople();
  renderMemories();
  addEvent('关系档案清空', '已删除所有本地人物档案，可重新绑定 InsightFace 样本。');
}

function formatFaceProviderLabel(provider) {
  if (provider === 'insightface_arcface') return 'insightface';
  if (provider === 'mediapipe_descriptor_adapter') return 'mediapipe_fallback';
  return provider || 'unknown';
}

function renderFaceMatchCandidates() {
  if (!elements.faceMatchCandidates) return;
  const candidates = state.faceMatch.candidates || [];
  if (!candidates.length) {
    elements.faceMatchCandidates.innerHTML = '<p class="face-match-empty">暂无候选人 · 先绑定人脸或等待稳定正脸</p>';
    return;
  }
  const provider = formatFaceProviderLabel(state.faceMatch.provider || 'insightface_arcface');
  const detLabel = state.faceMatch.detScore != null ? ` · det ${Math.round(state.faceMatch.detScore * 100)}%` : '';
  elements.faceMatchCandidates.innerHTML = [
    `<p class="face-match-provider">${escapeHtml(provider)} top-3${escapeHtml(detLabel)}</p>`,
    ...candidates.map((item, index) => `
    <div class="face-match-row ${index === 0 ? 'top' : ''}">
      <span>#${index + 1}</span>
      <strong>${escapeHtml(item.name || item.personId)}</strong>
      <span>${Math.round(item.score * 100)}%</span>
    </div>
  `),
  ].join('');
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function nowLabel() {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
}

function addEvent(title, detail) {
  state.events.unshift({ title, detail, time: nowLabel() });
  state.events = state.events.slice(0, 9);
  localStorage.setItem('hri-demo-events', JSON.stringify(state.events));
  renderTimeline();
}

function persistMemories() {
  localStorage.setItem('hri-demo-memories', JSON.stringify(state.memories));
}

function persistPeople() {
  localStorage.setItem('hri-demo-people', JSON.stringify(state.people));
}

function activePerson() {
  return state.people.find(person => person.id === state.activePersonId) || null;
}

function activeMemories() {
  const person = activePerson();
  return person ? person.memories : state.memories;
}

function persistActiveMemories() {
  if (activePerson()) persistPeople();
  else persistMemories();
}

function renderMemories() {
  const memories = activeMemories();
  elements.memoryList.innerHTML = memories.map((memory, index) => `
    <div>
      <span>${escapeHtml(memory)}</span>
      <button type="button" data-delete-memory="${index}">删除</button>
    </div>
  `).join('');
}

function formatActivePersonLabel() {
  const person = activePerson();
  if (person) {
    return `${person.name} · ${Math.round(state.activePersonScore * 100)}% match`;
  }
  const top = state.faceMatch.candidates?.[0];
  if (top?.name && top.score >= state.faceMatchThreshold * 0.85) {
    return `可能是 ${top.name} · ${Math.round(top.score * 100)}%（点击「我是这个人」确认）`;
  }
  if (top?.name) {
    return `弱匹配 ${top.name} · ${Math.round(top.score * 100)}%（未自动认定）`;
  }
  return '未知用户';
}

function renderPeople() {
  const person = activePerson();
  const faceProvider = formatFaceProviderLabel(state.faceMatch.provider);
  const faceScore = state.faceMatch.personId ? Math.round(state.faceMatch.score * 100) : Math.round((state.faceMatch.score || 0) * 100);
  elements.activePerson.textContent = formatActivePersonLabel();
  elements.identityFusion.textContent = [
    `explicit ${state.explicitPersonId ? '1.00' : '0.00'}`,
    `face(${faceProvider}${state.faceMatch.personId ? ` ${faceScore}` : faceScore ? ` ${faceScore}` : ''})`,
    `voice ${state.voiceMatch.personId ? Math.round(state.voiceMatch.score * 100) : Math.round((state.voiceMatch.score || 0) * 100)}`,
  ].join(' · ');
  elements.faceEnrollDebug.textContent = faceEnrollmentStatus();
  elements.personStrategy.textContent = person
    ? `${person.name} 的独立记忆 ${person.memories.length} 条，策略：${person.strategy || '低打扰、先确认边界'}`
    : '未绑定关系档案时，只使用通用低打扰策略。';
  elements.personList.innerHTML = state.people.map(item => {
    const insightSamples = (item.faceEmbeddings || []).filter(sample => sample.provider === 'insightface_arcface');
    const insightCount = insightSamples.length;
    const lastDet = insightSamples.length ? insightSamples[insightSamples.length - 1].detScore : null;
    const providerLabel = formatFaceProviderLabel(item.faceProvider);
    const detText = lastDet != null ? ` · 最近 det ${Math.round(lastDet * 100)}%` : '';
    return `
    <div class="${item.id === state.activePersonId ? 'active' : ''}">
      <strong>${escapeHtml(item.name)}</strong>
      <p>${item.memories.length} 条记忆 · ${item.samples || 0} 张人脸（insightface ${insightCount}）· ${item.voiceSamples || 0} 次声纹 · ${escapeHtml(providerLabel)}${detText}</p>
      <button type="button" data-select-person="${item.id}">${item.id === state.explicitPersonId ? '取消显式身份' : '我是这个人'}</button>
      <button type="button" data-delete-person="${item.id}">删除档案</button>
    </div>
  `;
  }).join('') || '<div><strong>暂无档案</strong><p>启动摄像头后输入名字，点击“绑定当前人脸”。</p></div>';
  renderFaceMatchCandidates();
}

function faceEnrollmentStatus() {
  const lastSeenAgo = state.lastFaceAt ? `${Math.round((Date.now() - state.lastFaceAt) / 1000)}s ago` : 'never';
  if (state.faceModelError) return `failed · ${state.faceModelError.slice(0, 90)}`;
  const bbox = state.lastFaceBboxNorm
    ? `bbox=${Math.round(state.lastFaceBboxNorm.w * 100)}%×${Math.round(state.lastFaceBboxNorm.h * 100)}%`
    : 'bbox=none';
  return [
    `ready=${state.faceModelReady}`,
    `present=${state.facePresent}`,
    `landmarks=${state.faceLandmarkCount}`,
    `crop=${state.lastFaceCropQuality}`,
    state.lastFaceCropReason ? `reason=${state.lastFaceCropReason}` : '',
    bbox,
    `yaw=${Math.round(state.headYaw)} pitch=${Math.round(state.headPitch)}`,
    `lastFace=${lastSeenAgo}`,
  ].filter(Boolean).join(' · ');
}

function renderTimeline() {
  elements.timeline.innerHTML = state.events.map(event => `
    <div class="timeline-item">
      <time>${event.time} · ${escapeHtml(event.title)}</time>
      <p>${escapeHtml(event.detail)}</p>
    </div>
  `).join('') || '<div class="timeline-item"><time>等待事件</time><p>启动感知后，这里会记录状态变化、主动介入原因和用户反馈。</p></div>';
}

function renderConversation() {
  elements.conversation.innerHTML = state.messages.map(message => `
    <div class="message ${message.role === 'user' ? 'user' : 'robot'}">
      <small>${message.role === 'user' ? '你' : '机器人'} · ${escapeHtml(message.time)}</small>
      <div>${escapeHtml(message.content)}</div>
    </div>
  `).join('') || `
    <div class="message robot">
      <small>机器人 · ready</small>
      <div>我会先听你说，再结合当前互动状态和关系记忆回复。你也可以直接输入文字。</div>
    </div>
  `;
  elements.conversation.scrollTop = elements.conversation.scrollHeight;
  elements.speakToggle.textContent = `语音回复：${state.speakReplies ? '开' : '关'}`;
}

function persistMessages() {
  state.messages = state.messages.slice(-16);
  localStorage.setItem('hri-demo-messages', JSON.stringify(state.messages));
}

function addMessage(role, content) {
  state.messages.push({ role, content, time: nowLabel() });
  persistMessages();
  renderConversation();
}

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

async function startSensing() {
  if (state.started) return;
  const health = await pingServer();
  if (!health?.ok) {
    setCameraDebug('后端未启动：请先在项目目录运行 .\\start.ps1', 'bad');
    addEvent('后端未连接', '浏览器无法访问 /api/health。请先运行 start.ps1 再点「启动感知 demo」。');
    return;
  }
  if (!health.llmConfigured) {
    addEvent('VLM 未配置', '关系图谱需要 VLM 识别物体。请编辑 .env 填入 LLM_API_KEY 后重启 start.ps1。');
  }
  if (!health.insightfaceReady) {
    addEvent('InsightFace 未就绪', health.insightfaceDetail || '请看 node 终端里的 Python 提示');
  }
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('当前浏览器不支持 navigator.mediaDevices.getUserMedia');
    }

    setCameraDebug('正在请求摄像头权限...', '');
    const videoStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    elements.video.srcObject = videoStream;
    await elements.video.play();

    let audioReady = false;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      setupAudio(audioStream);
      audioReady = true;
    } catch (audioError) {
      addEvent('麦克风未启用', `摄像头已开启，但麦克风不可用：${audioError.name || audioError.message}`);
    }

    state.started = true;
    const videoTrack = videoStream.getVideoTracks()[0];
    const settings = videoTrack?.getSettings?.() || {};
    elements.privacyBadge.textContent = `${audioReady ? 'camera/mic' : 'camera'} on · local signals only`;
    elements.privacyBadge.classList.remove('muted');
    setCameraDebug(`摄像头已开启：${videoTrack?.label || 'camera'} · ${settings.width || '?'}x${settings.height || '?'}${audioReady ? ' · mic on' : ' · mic off'}`, 'good');
    elements.robotStatus.textContent = '观察中：默认低打扰';
    addEvent('权限开启', `摄像头${audioReady ? '/麦克风' : ''}只用于本地信号抽取，demo 不上传原始媒体。`);
    setTimeout(loadFaceLandmarker, 300);
    requestAnimationFrame(analyzeVideo);
    setInterval(updateReasoning, 1200);
    setInterval(sampleSceneFrame, 3000);
  } catch (error) {
    const message = explainCameraError(error);
    setCameraDebug(message, 'bad');
    addEvent('摄像头未启用', message);
    elements.robotStatus.textContent = '未获得摄像头权限：展示策略模拟';
  }
}

async function startCameraOnly() {
  if (state.started) return;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前浏览器不支持 getUserMedia');
    setCameraDebug('正在只请求摄像头权限，不加载 MediaPipe/麦克风...', '');
    const videoStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    elements.video.srcObject = videoStream;
    await elements.video.play();
    state.started = true;
    elements.privacyBadge.textContent = 'camera on · model disabled';
    elements.privacyBadge.classList.remove('muted');
    const videoTrack = videoStream.getVideoTracks()[0];
    const settings = videoTrack?.getSettings?.() || {};
    setCameraDebug(`摄像头自检成功：${videoTrack?.label || 'camera'} · ${settings.width || '?'}x${settings.height || '?'}`, 'good');
    addEvent('摄像头自检成功', '仅摄像头模式已开启，未加载 MediaPipe 和麦克风。');
    requestAnimationFrame(analyzeVideo);
  } catch (error) {
    const message = explainCameraError(error);
    setCameraDebug(message, 'bad');
    addEvent('摄像头自检失败', message);
  }
}

function sampleSceneFrame() {
  if (!state.started || elements.video.readyState < 2) return;
  const frame = captureVideoFrame();
  state.sceneFrames.push({ image: frame, time: new Date().toISOString() });
  state.sceneFrames = state.sceneFrames.slice(-3);
  elements.sceneStatus.textContent = `已采样 ${state.sceneFrames.length}/3 帧，${state.sceneFrames.length === 3 ? '准备送入 VLM' : '继续观察中'}...`;
  if (state.sceneFrames.length === 3) updateSceneUnderstanding();
}

async function updateSceneUnderstanding() {
  if (!state.started || state.sceneBusy || state.sceneFrames.length < 3) return;
  if (!state.serverOnline) {
    const health = await pingServer();
    if (!health?.ok) {
      elements.sceneStatus.textContent = '场景理解已暂停：后端未连接。请运行 .\\start.ps1 后刷新页面。';
      state.visionPausedUntil = Date.now() + 15000;
      return;
    }
  }
  if (!state.llmConfigured) {
    elements.sceneStatus.textContent = 'VLM 未配置：无法识别桌面物体。请编辑项目目录下的 .env，填入 LLM_API_KEY，然后 Ctrl+C 重启 start.ps1。';
    state.sceneFrames = [];
    return;
  }
  if (Date.now() < state.visionPausedUntil) return;
  state.sceneBusy = true;
  const frames = [...state.sceneFrames];
  elements.sceneStatus.textContent = `VLM 正在理解最近 ${frames.length} 帧 / 约 9 秒窗口...`;
  try {
    const payload = JSON.stringify({
      frames,
      snapshot: buildInteractionSnapshot(),
      sceneMemory: compactSceneMemory(),
    });
    elements.sceneStatus.textContent = `VLM 正在理解最近 ${frames.length} 帧 / payload ${Math.round(payload.length / 1024)}KB...`;
    const response = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    if (!response.ok) throw new Error(`vision endpoint ${response.status}`);
    const data = await response.json();
    state.scene = data.scene;
    if (data.debug) state.scene.debug = data.debug;
    if (data.scene?.vlmError?.code === 'openai_quota_exceeded') {
      state.visionPausedUntil = Date.now() + 120000;
    } else if (data.scene?.vlmError?.code === 'rate_limited') {
      state.visionPausedUntil = Date.now() + 60000;
    }
    state.lastSceneAt = Date.now();
    mergeSceneMemory(state.scene);
    localStorage.setItem('hri-demo-scene', JSON.stringify(state.scene));
    renderScene();
  } catch (error) {
    const refused = /Failed to fetch|NetworkError|CONNECTION_REFUSED/i.test(error.message);
    if (refused) {
      state.serverOnline = false;
      state.visionPausedUntil = Date.now() + 20000;
      elements.sceneStatus.textContent = '场景理解已暂停：无法连接后端。请确认 node server.mjs 正在运行。';
      renderServerStatus({ ok: false });
      return;
    }
    elements.sceneStatus.textContent = `场景理解失败：${error.message}。如果 payload 超过数百 KB，已降低分辨率；可继续等待下一轮。`;
  } finally {
    state.sceneBusy = false;
  }
}

function mergeSceneMemory(scene) {
  const person = activePerson();
  const ownerId = person?.id || 'unknown_person';
  const ownerName = person?.name || '未知用户';
  const now = new Date().toISOString();
  const objects = Array.isArray(scene.objects) ? scene.objects.map(normalizeSceneObjectInput).filter(Boolean) : [];
  const interactions = Array.isArray(scene.interactions) ? scene.interactions.map(normalizeSceneInteractionInput).filter(Boolean) : [];

  const byLabel = new Map();
  objects.forEach(input => {
    const object = upsertSceneObject(input, now);
    byLabel.set(object.normalized, object);
    byLabel.set(object.id, object);
    if (ownerId !== 'unknown_person') {
      // 只是同框出现 -> 弱关系（seen_with），不直接断言所属。
      bumpRelation(ownerId, ownerName, object, 'appearance', `与 ${ownerName} 同时出现`, now);
    }
  });

  interactions.forEach(interaction => {
    const object = byLabel.get(normalizeLabel(interaction.object)) || byLabel.get(interaction.object) || findObjectMentionedInText(interaction.object || interaction.description);
    if (!object) return;
    const label = INTERACTION_LABELS[interaction.action] || interaction.action;
    const summary = `${ownerName} ${label} ${object.label}`;
    bumpRelation(ownerId, ownerName, object, interaction.action, interaction.description || summary, now);
    addSceneEvent('interaction', summary, { personId: ownerId, objectId: object.id, action: interaction.action }, now);
  });

  if (scene.action_change) {
    addSceneEvent('action_change', scene.action_change, { personId: ownerId }, now);
  }

  state.sceneMemory.objects = state.sceneMemory.objects.slice(-40);
  state.sceneMemory.relations = state.sceneMemory.relations.slice(-60);
  state.sceneMemory.events = state.sceneMemory.events.slice(-30);
  persistGraph();
  renderSceneMemory();
}

function normalizeLabel(label) {
  return String(label || '').trim().toLowerCase().replace(/[\s_]+/g, ' ');
}

function normalizeSceneObjectInput(value) {
  if (typeof value === 'string') {
    const label = value.trim();
    return label ? { id: null, label, visualDescription: '', bboxNorm: null, state: 'present' } : null;
  }
  if (value && typeof value === 'object') {
    const label = String(value.label || value.name || '').trim();
    if (!label) return null;
    return {
      id: value.id ? String(value.id) : null,
      label,
      visualDescription: String(value.visual_description || value.visualDescription || ''),
      bboxNorm: Array.isArray(value.bbox_norm) ? value.bbox_norm : (Array.isArray(value.bboxNorm) ? value.bboxNorm : null),
      state: value.state === 'gone' ? 'gone' : 'present',
    };
  }
  return null;
}

function normalizeSceneInteractionInput(value) {
  if (typeof value === 'string') return { object: '', action: 'near', description: value };
  if (value && typeof value === 'object') {
    return {
      object: String(value.object || value.target || ''),
      action: String(value.action || 'near'),
      description: String(value.description || value.summary || ''),
    };
  }
  return null;
}

function upsertSceneObject(input, now) {
  let object = matchSceneObjectInstance(input);
  if (!object) {
    state.sceneMemory.counters.object += 1;
    object = {
      id: input.id || `obj_${state.sceneMemory.counters.object}`,
      label: input.label,
      normalized: normalizeLabel(input.label),
      visualDescription: input.visualDescription || '',
      bboxNorm: input.bboxNorm || null,
      thumbnail: '',
      firstSeen: now,
      lastSeen: now,
      seenCount: 0,
      status: input.state || 'present',
    };
    state.sceneMemory.objects.push(object);
  }
  object.label = input.label;
  object.lastSeen = now;
  object.seenCount += 1;
  object.status = input.state || 'present';
  if (input.visualDescription) object.visualDescription = input.visualDescription;
  if (input.bboxNorm) object.bboxNorm = input.bboxNorm;
  if (!object.thumbnail && object.bboxNorm) {
    object.thumbnail = captureRegionThumbnail(object.bboxNorm);
  }
  return object;
}

// 累积一次观察到的人-物关系，并根据交互类型升级强度与置信度。
function bumpRelation(personId, personName, object, action, evidence, now) {
  let relation = state.sceneMemory.relations.find(item => item.personId === personId && item.objectId === object.id);
  if (!relation) {
    state.sceneMemory.counters.relation += 1;
    relation = {
      id: `rel_${state.sceneMemory.counters.relation}`,
      personId,
      personName,
      objectId: object.id,
      objectLabel: object.label,
      type: 'seen_with',
      strength: 'weak',
      status: 'hypothesis',
      count: 0,
      interactionCount: 0,
      contactCount: 0,
      lastAskedAt: 0,
      evidence: [],
      firstSeen: now,
      lastSeen: now,
    };
    state.sceneMemory.relations.push(relation);
  }
  relation.personName = personName;
  relation.objectLabel = object.label;
  relation.lastSeen = now;
  relation.count += 1;
  if (action !== 'appearance') {
    relation.interactionCount += 1;
    if (CONTACT_ACTIONS.includes(action)) relation.contactCount += 1;
  }
  relation.evidence.unshift(`${nowLabel()} · ${evidence}`);
  relation.evidence = relation.evidence.slice(0, 4);
  recomputeRelation(relation);
  return relation;
}

// 关系强度规则：用户确认/否认优先；否则按接触次数与共现次数推断弱/中/强。
function recomputeRelation(relation) {
  if (relation.status === 'confirmed') {
    relation.type = 'owns_confirmed';
    relation.strength = 'strong';
    relation.confidence = 0.99;
    return;
  }
  if (relation.status === 'rejected') {
    relation.type = 'rejected';
    relation.strength = 'weak';
    relation.confidence = 0.05;
    return;
  }
  if (relation.contactCount >= 3 || relation.interactionCount >= 5) {
    relation.type = 'frequently_uses';
    relation.strength = 'strong';
  } else if (relation.contactCount >= 1 || relation.count >= 3) {
    relation.type = 'uses';
    relation.strength = 'medium';
  } else {
    relation.type = 'seen_with';
    relation.strength = 'weak';
  }
  relation.confidence = RELATION_STRENGTHS[relation.strength];
}

function findObjectMentionedInText(text) {
  const normalized = normalizeLabel(text);
  if (!normalized) return null;
  return state.sceneMemory.objects.find(object => normalized.includes(object.normalized) || object.normalized.includes(normalized));
}

function addSceneEvent(type, summary, refs, now) {
  const last = state.sceneMemory.events[0];
  if (last && last.type === type && last.summary === summary) {
    last.lastSeen = now;
    last.count = (last.count || 1) + 1;
    return;
  }
  state.sceneMemory.counters.event += 1;
  state.sceneMemory.events.unshift({
    id: `evt_${state.sceneMemory.counters.event}`,
    type,
    summary,
    refs,
    firstSeen: now,
    lastSeen: now,
    count: 1,
  });
}

const RELATION_TYPE_LABELS = {
  seen_with: '同框出现',
  uses: '在使用',
  frequently_uses: '经常使用',
  owns_confirmed: '已确认所属',
  rejected: '已否认所属',
};
const STRENGTH_LABELS = { weak: '弱', medium: '中', strong: '强' };

function relationStatusBadge(relation) {
  if (relation.status === 'confirmed') return '<span class="rel-badge confirmed">已确认</span>';
  if (relation.status === 'rejected') return '<span class="rel-badge rejected">已否认</span>';
  return `<span class="rel-badge ${relation.strength}">${STRENGTH_LABELS[relation.strength] || ''}·假设</span>`;
}

// 描述某个人物节点当前的身份证据（显式/人脸/声纹/未确认）。
function describePersonEvidence(personId) {
  if (personId === 'unknown_person') return '未确认身份';
  const parts = [];
  if (state.explicitPersonId === personId) parts.push('显式选择');
  if (state.faceMatch.personId === personId && state.faceMatch.score > 0) parts.push(`人脸 ${Math.round(state.faceMatch.score * 100)}%`);
  if (state.voiceMatch.personId === personId && state.voiceMatch.score > 0) parts.push(`声纹 ${Math.round(state.voiceMatch.score * 100)}%`);
  const person = state.people.find(item => item.id === personId);
  if (!parts.length && person) parts.push(person.samples ? '已建档·未在场' : '已建档');
  return parts.join(' · ') || '未确认';
}

function personAvatarInitial(name) {
  const trimmed = String(name || '?').trim();
  return escapeHtml(trimmed ? trimmed.slice(0, 1).toUpperCase() : '?');
}

// 汇总关系图谱里出现的人物实例（含当前活跃人物），形成 person 节点。
function collectPersonNodes() {
  const map = new Map();
  const add = (id, name) => {
    if (!id) return;
    if (!map.has(id)) map.set(id, { id, name: name || '未知用户', relationCount: 0 });
    else if (name && map.get(id).name === '未知用户') map.get(id).name = name;
  };
  const active = activePerson();
  if (active) add(active.id, active.name);
  state.sceneMemory.relations.forEach(relation => add(relation.personId, relation.personName));
  state.sceneMemory.relations.forEach(relation => {
    if (map.has(relation.personId)) map.get(relation.personId).relationCount += 1;
  });
  return [...map.values()];
}

function renderSceneMemory() {
  const objects = state.sceneMemory.objects.slice(-12).reverse();
  const relations = [...state.sceneMemory.relations]
    .filter(relation => relation.personId !== 'unknown_person' || relation.status !== 'hypothesis' || relation.count > 1)
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 10);
  const events = state.sceneMemory.events.slice(0, 6);

  const objectCards = objects.map(object => `
    <div class="graph-object" data-object="${object.id}">
      ${object.thumbnail ? `<img src="${object.thumbnail}" alt="${escapeHtml(object.label)}" />` : '<div class="graph-object-noimg">无图像</div>'}
      <div class="graph-object-body">
        <strong>${escapeHtml(object.id)} · ${escapeHtml(object.label)}</strong>
        <span>${escapeHtml(object.visualDescription || '暂无外观描述')}</span>
        <span class="graph-object-meta">×${object.seenCount} · ${object.status === 'gone' ? '已离开' : '在场'}</span>
        <div class="graph-actions">
          <button type="button" data-obj-rename="${object.id}">改名</button>
          <button type="button" data-obj-delete="${object.id}">删除</button>
        </div>
      </div>
    </div>
  `).join('') || '<p class="graph-empty">还没有稳定物体实例。等待 VLM 观察桌面物体。</p>';

  const relationRows = relations.map(relation => `
    <div class="graph-relation ${relation.status}" data-relation="${relation.id}">
      <div class="graph-relation-head">
        <strong>${escapeHtml(relation.personName)} → ${escapeHtml(relation.objectLabel)} <small>(${escapeHtml(relation.objectId)})</small></strong>
        ${relationStatusBadge(relation)}
      </div>
      <div class="graph-relation-meta">${RELATION_TYPE_LABELS[relation.type] || relation.type} · 共现×${relation.count} · 接触×${relation.contactCount} · 置信 ${Math.round((relation.confidence || 0) * 100)}%</div>
      <div class="graph-relation-evidence">${(relation.evidence || []).slice(0, 2).map(escapeHtml).join('<br>') || '暂无证据'}</div>
      <div class="graph-actions">
        <button type="button" data-rel-confirm="${relation.id}">这是我的</button>
        <button type="button" data-rel-reject="${relation.id}">不是我的</button>
        <button type="button" data-rel-frequent="${relation.id}">我经常用</button>
        <button type="button" data-rel-occasional="${relation.id}">只是偶尔</button>
        <button type="button" data-rel-delete="${relation.id}">删除</button>
      </div>
    </div>
  `).join('') || '<p class="graph-empty">还没有人-物关系。被识别的用户与物体多次同框/交互后会出现。</p>';

  const eventRows = events.map(event => `<li><span>${escapeHtml(event.summary)}</span><small>${event.count > 1 ? `×${event.count}` : ''}</small></li>`).join('') || '<li class="graph-empty">暂无事件</li>';

  const pending = state.pendingOwnership ? `<div class="graph-pending">待确认：${escapeHtml(state.pendingOwnership.question || '这个物体是你的吗？')}</div>` : '';

  const personNodes = collectPersonNodes();
  const personCards = personNodes.map(node => `
    <div class="graph-person ${node.id === state.activePersonId ? 'active' : ''}">
      <div class="graph-person-avatar">${personAvatarInitial(node.name)}</div>
      <div class="graph-person-body">
        <strong>${escapeHtml(node.name)} <small>(${escapeHtml(node.id)})</small></strong>
        <span>${escapeHtml(describePersonEvidence(node.id))}</span>
        <span class="graph-object-meta">关系 ×${node.relationCount}${node.id === state.activePersonId ? ' · 当前在场' : ''}</span>
      </div>
    </div>
  `).join('') || '<p class="graph-empty">还没有人物节点。绑定/识别用户后会出现。</p>';

  elements.sceneMemory.innerHTML = `
    ${pending}
    <div class="graph-section"><label>人物实例</label><div class="graph-persons">${personCards}</div></div>
    <div class="graph-section"><label>物体实例（图像证据）</label><div class="graph-objects">${objectCards}</div></div>
    <div class="graph-section"><label>人-物关系图</label><div class="graph-relations">${relationRows}</div></div>
    <div class="graph-section"><label>最近交互事件</label><ul class="graph-events">${eventRows}</ul></div>
  `;
}

function describeVlmError(raw) {
  const text = String(raw || '');
  if (/quota|billing|insufficient_quota/i.test(text)) {
    return 'OpenAI 配额用尽：请到 platform.openai.com 充值或换有效 Key';
  }
  if (/invalid api key|incorrect api key|401/i.test(text)) {
    return 'API Key 无效，请更新 .env 后重启 start.ps1';
  }
  return text.slice(0, 120);
}

function captureVideoFrame() {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = Math.round(384 * (elements.video.videoHeight || 9) / (elements.video.videoWidth || 16));
  const context = canvas.getContext('2d');
  context.drawImage(elements.video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.45);
}

function renderScene() {
  if (!state.scene) {
    elements.sceneStatus.textContent = state.started ? '等待第一次 VLM 场景理解' : '等待摄像头启动';
    elements.sceneSummary.innerHTML = '';
    return;
  }
  const scene = state.scene;
  const vlmErr = scene.vlmError;
  const errNote = vlmErr
    ? ` · ${vlmErr.hint || vlmErr.message}`
    : (scene.error ? ` · ${describeVlmError(scene.error)}` : '');
  elements.sceneStatus.textContent = `最近更新：${nowLabel()} · source ${scene.source || 'vlm'} · ${scene.debug?.frameCount || 0} frames${errNote}`;
  if (vlmErr?.code === 'openai_quota_exceeded') {
    elements.sceneStatus.className = 'scene-status bad';
  } else if (scene.source === 'vlm') {
    elements.sceneStatus.className = 'scene-status';
  }
  const objectLabels = (scene.objects || []).map(item => typeof item === 'string' ? item : (item.label || item.id || '')).filter(Boolean);
  const interactionLabels = (scene.interactions || []).map(item => {
    if (typeof item === 'string') return item;
    const action = INTERACTION_LABELS[item.action] || item.action || '';
    return [action, item.object, item.description].filter(Boolean).join(' ');
  }).filter(Boolean);
  const rows = [
    ['人在做什么', scene.person_activity || 'unknown'],
    ['物体', objectLabels.join(' · ') || 'none'],
    ['人-物交互', interactionLabels.join(' · ') || 'none'],
    ['动作变化', scene.action_change || 'unknown'],
    ['打断时机', `${scene.interruptibility || 'unknown'} · ${scene.reason || ''}`],
    ['建议动作', scene.robot_action || 'observe'],
    ['VLM 调试', scene.debug ? `wire ${scene.debug.wireApi} · model ${scene.debug.model} · ${scene.debug.frameCount} frames` : 'none'],
  ];
  elements.sceneSummary.innerHTML = rows.map(([label, value]) => `
    <div><label>${label}</label><strong>${escapeHtml(String(value))}</strong></div>
  `).join('');
}

function setCameraDebug(message, tone) {
  elements.cameraDebug.textContent = message;
  elements.cameraDebug.className = `camera-debug ${tone || ''}`.trim();
}

function explainCameraError(error) {
  const name = error?.name || 'UnknownError';
  const detail = error?.message || '';
  const hints = {
    NotAllowedError: '浏览器拒绝了摄像头权限。请在地址栏权限设置里允许 Camera，然后刷新页面。',
    NotFoundError: '系统没有找到可用摄像头。请确认摄像头未被其他 App 独占。',
    NotReadableError: '摄像头存在但无法读取，常见原因是被 Zoom/微信/其他浏览器占用。',
    OverconstrainedError: '摄像头不满足请求参数，已建议刷新后重试。',
    SecurityError: '当前页面安全上下文不允许摄像头。请使用 http://localhost:8173 或 http://127.0.0.1:8173。',
  };
  return `${hints[name] || '无法打开摄像头。'} (${name}${detail ? `: ${detail}` : ''})`;
}

async function loadFaceLandmarker() {
  if (state.faceLandmarker || state.faceModelReady) return;
  try {
    const vision = await importVisionBundle();
    const resolver = await createVisionResolver(vision);
    state.faceLandmarker = await vision.FaceLandmarker.createFromOptions(resolver, {
      baseOptions: {
        modelAssetPath: await resolveFaceModelPath(),
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
    state.faceModelReady = true;
    elements.faceHud.textContent = 'Face model: ready · waiting for face';
    addEvent('Face model ready', 'MediaPipe Face Landmarker 已加载：开始读取 landmarks、blendshapes 和头部姿态。');
  } catch (error) {
    state.faceModelError = error.message;
    elements.faceHud.textContent = `Face model failed: ${error.message}`;
    addEvent('Face model failed', `无法加载 MediaPipe，降级为粗略视频线索：${error.message}`);
  }
}

async function resolveFaceModelPath() {
  const paths = [
    '/vendor/mediapipe/models/face_landmarker.task',
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
  ];
  for (const path of paths) {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      if (response.ok) return path;
    } catch {
      // Try next path.
    }
  }
  return paths[1];
}

async function importVisionBundle() {
  const urls = [
    '/vendor/mediapipe/tasks-vision/vision_bundle.mjs',
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs',
    'https://unpkg.com/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs',
  ];
  let lastError;
  for (const url of urls) {
    try {
      return await import(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('No MediaPipe bundle URL worked');
}

async function createVisionResolver(vision) {
  const localWasmReady = await isLocalWasmReady();
  const wasmUrls = [
    ...(localWasmReady ? ['/vendor/mediapipe/tasks-vision/wasm'] : []),
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm',
    'https://unpkg.com/@mediapipe/tasks-vision@0.10.21/wasm',
  ];
  let lastError;
  for (const url of wasmUrls) {
    try {
      return await vision.FilesetResolver.forVisionTasks(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('No MediaPipe WASM URL worked');
}

async function isLocalWasmReady() {
  try {
    const response = await fetch('/vendor/mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm', { method: 'HEAD' });
    const size = Number(response.headers.get('content-length') || 0);
    return response.ok && size > 8_000_000;
  } catch {
    return false;
  }
}

function setupAudio(stream) {
  state.audioStream = stream;
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
  const samples = new Uint8Array(analyser.frequencyBinCount);

  function tick() {
    analyser.getByteFrequencyData(samples);
    const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    state.voice = clamp(average * 1.6);
    state.voiceDescriptor = buildVoiceDescriptor(samples);
    matchVoicePerson();
    requestAnimationFrame(tick);
  }
  tick();
}

function buildVoiceDescriptor(samples) {
  const bands = 12;
  const bandSize = Math.floor(samples.length / bands);
  const descriptor = [];
  for (let band = 0; band < bands; band += 1) {
    const start = band * bandSize;
    const end = band === bands - 1 ? samples.length : start + bandSize;
    let sum = 0;
    for (let index = start; index < end; index += 1) sum += samples[index];
    descriptor.push(Number((sum / Math.max(1, end - start) / 255).toFixed(4)));
  }
  const total = descriptor.reduce((sum, value) => sum + value, 0) || 1;
  return descriptor.map(value => Number((value / total).toFixed(4)));
}

function analyzeVideo() {
  const context = elements.canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(elements.video, 0, 0, elements.canvas.width, elements.canvas.height);
  const frame = context.getImageData(0, 0, elements.canvas.width, elements.canvas.height).data;
  let brightness = 0;
  let diff = 0;

  for (let index = 0; index < frame.length; index += 16) {
    const current = (frame[index] + frame[index + 1] + frame[index + 2]) / 3;
    brightness += current;
    if (state.lastFrame) {
      const previous = (state.lastFrame[index] + state.lastFrame[index + 1] + state.lastFrame[index + 2]) / 3;
      diff += Math.abs(current - previous);
    }
  }

  const sampleCount = frame.length / 16;
  state.light = clamp((brightness / sampleCount / 255) * 100);
  state.motion = clamp((diff / sampleCount) * 2.5);
  state.presence = clamp(state.light > 8 ? 58 + state.motion * 0.28 + state.voice * 0.18 : 0);
  inferFaceAndPostureFallback(frame);
  detectFaceSignals();
  updateBaseline();
  state.lastFrame = new Uint8ClampedArray(frame);
  requestAnimationFrame(analyzeVideo);
}

function inferFaceAndPostureFallback(frame) {
  const width = elements.canvas.width;
  const height = elements.canvas.height;
  let centerBrightness = 0;
  let edgeBrightness = 0;
  let centerCount = 0;
  let edgeCount = 0;
  let upperBrightness = 0;
  let lowerBrightness = 0;

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const index = (y * width + x) * 4;
      const value = (frame[index] + frame[index + 1] + frame[index + 2]) / 3;
      const centered = x > width * 0.28 && x < width * 0.72 && y > height * 0.12 && y < height * 0.72;
      if (centered) {
        centerBrightness += value;
        centerCount += 1;
      } else {
        edgeBrightness += value;
        edgeCount += 1;
      }
      if (y < height * 0.48) upperBrightness += value;
      if (y > height * 0.58) lowerBrightness += value;
    }
  }

  const center = centerBrightness / Math.max(1, centerCount);
  const edge = edgeBrightness / Math.max(1, edgeCount);
  const verticalBalance = upperBrightness / Math.max(1, lowerBrightness);
  state.gaze = clamp(42 + (center - edge) * 0.42 + state.presence * 0.18);
  state.posture = clamp(62 - state.motion * 0.55 + (verticalBalance - 1) * 16);
}

function detectFaceSignals() {
  if (!state.faceLandmarker || elements.video.readyState < 2) {
    drawFaceOverlay(null);
    return;
  }

  const result = state.faceLandmarker.detectForVideo(elements.video, performance.now());
  const landmarks = result.faceLandmarks?.[0];
  const blendshapes = result.faceBlendshapes?.[0]?.categories || [];
  state.faceBlendshapes = blendshapes;
  state.facePresent = Boolean(landmarks);
  state.faceLandmarkCount = landmarks?.length || 0;

  if (!landmarks) {
    state.lastFaceLandmarks = null;
    state.lastFaceBboxNorm = null;
    state.lastFaceCropQuality = 'no_face';
    state.lastFaceCropReason = 'no_landmarks';
    if (Date.now() - state.lastFaceAt > 2000) {
      state.gaze = clamp(state.gaze * 0.88);
      state.smile = clamp(state.smile * 0.88);
      state.brow = clamp(state.brow * 0.88);
      state.eye = clamp(state.eye * 0.9);
      state.mouth = clamp(state.mouth * 0.88);
    }
    drawFaceOverlay(null);
    renderBlendshapes();
    matchActivePersonLocalFallback();
    return;
  }

  state.lastFaceAt = Date.now();
  const score = name => blendshapes.find(item => item.categoryName === name)?.score || 0;
  const smile = (score('mouthSmileLeft') + score('mouthSmileRight')) / 2;
  const brow = (score('browDownLeft') + score('browDownRight') + score('browInnerUp')) / 3;
  const blink = (score('eyeBlinkLeft') + score('eyeBlinkRight')) / 2;
  const jawOpen = score('jawOpen');
  const eyeLookAway = score('eyeLookOutLeft') + score('eyeLookOutRight') + score('eyeLookDownLeft') + score('eyeLookDownRight');

  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const forehead = landmarks[10];
  const chin = landmarks[152];
  const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
  const faceWidth = Math.max(0.001, Math.abs(rightCheek.x - leftCheek.x));
  const faceHeight = Math.max(0.001, Math.abs(chin.y - forehead.y));

  state.headYaw = clamp(((nose.x - faceCenterX) / faceWidth) * 100, -100, 100);
  state.headPitch = clamp(((nose.y - (forehead.y + chin.y) / 2) / faceHeight) * 100, -100, 100);
  state.gaze = clamp(100 - Math.abs(state.headYaw) * 1.4 - Math.max(0, eyeLookAway * 45));
  state.posture = clamp(82 - Math.abs(state.headPitch) * 0.7 - state.motion * 0.25);
  state.smile = clamp(smile * 100);
  state.brow = clamp(brow * 100);
  state.eye = clamp((1 - blink) * 100);
  state.mouth = clamp(jawOpen * 100);
  state.faceDescriptor = buildFaceDescriptor(landmarks, blendshapes);
  state.lastFaceLandmarks = landmarks;
  state.lastFaceBboxNorm = computeFaceBboxNorm(landmarks);
  const cropQuality = assessFaceCropQuality(state.lastFaceBboxNorm);
  state.lastFaceCropQuality = cropQuality.quality;
  state.lastFaceCropReason = cropQuality.reason;
  matchActivePerson();

  drawFaceOverlay(landmarks);
  renderBlendshapes();
}

function buildFaceDescriptor(landmarks, blendshapes) {
  const score = name => blendshapes.find(item => item.categoryName === name)?.score || 0;
  const pairs = [
    [33, 263],
    [61, 291],
    [10, 152],
    [234, 454],
    [1, 152],
    [13, 14],
    [159, 145],
    [386, 374],
  ];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const scale = Math.max(0.001, distance(leftCheek, rightCheek));
  const geometry = pairs.map(([a, b]) => distance(landmarks[a], landmarks[b]) / scale);
  const expression = [
    score('mouthSmileLeft'),
    score('mouthSmileRight'),
    score('browDownLeft'),
    score('browDownRight'),
    score('eyeBlinkLeft'),
    score('eyeBlinkRight'),
    score('jawOpen'),
  ];
  return [...geometry, ...expression].map(value => Number(value.toFixed(4)));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
}

function descriptorSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  const mse = a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0) / a.length;
  return clamp(1 - Math.sqrt(mse) * 2.4, 0, 1);
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  a.forEach((value, index) => {
    dot += value * b[index];
    normA += value * value;
    normB += b[index] * b[index];
  });
  return clamp(dot / Math.max(0.0001, Math.sqrt(normA) * Math.sqrt(normB)), 0, 1);
}

function matchActivePersonLocalFallback() {
  if (!state.faceDescriptor || !state.people.length) {
    state.faceMatch = { personId: '', score: 0, provider: 'mediapipe_descriptor_adapter', candidates: [] };
    resolveActiveIdentity();
    renderPeople();
    return;
  }
  const ranked = state.people
    .map(person => {
      const scores = (person.faceEmbeddings || [])
        .filter(sample => sample.provider === 'mediapipe_descriptor_adapter')
        .map(sample => Math.max(
          descriptorSimilarity(state.faceDescriptor, sample.embedding),
          cosineSimilarity(state.faceDescriptor, sample.embedding),
        ));
      if (!scores.length && person.faceDescriptor) {
        scores.push(Math.max(
          descriptorSimilarity(state.faceDescriptor, person.faceDescriptor),
          cosineSimilarity(state.faceDescriptor, person.faceDescriptor),
        ));
      }
      const score = scores.length ? Math.max(...scores) : 0;
      return { person, score };
    })
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const threshold = 0.72;
  state.faceMatch = {
    personId: best?.score > threshold ? best.person.id : '',
    score: best?.score || 0,
    provider: 'mediapipe_descriptor_adapter',
    candidates: ranked.slice(0, 3).map(item => ({
      personId: item.person.id,
      name: item.person.name,
      score: item.score,
    })),
  };
  resolveActiveIdentity();
  renderPeople();
}

async function matchActivePerson() {
  if (!state.people.length) {
    state.faceMatch = { personId: '', score: 0, provider: '', candidates: [] };
    resolveActiveIdentity();
    renderPeople();
    return;
  }

  const now = Date.now();
  if (now - state.lastFaceMatchAt < 2000) {
    resolveActiveIdentity();
    return;
  }

  if (!state.facePresent || state.lastFaceCropQuality !== 'good') {
    matchActivePersonLocalFallback();
    return;
  }

  const faceCrop = captureFaceCrop({ forEnroll: true });
  if (!faceCrop) {
    matchActivePersonLocalFallback();
    return;
  }

  if (!hasInsightFaceSamples()) {
    matchActivePersonLocalFallback();
    return;
  }
  const candidates = buildFaceMatchCandidatesPayload();
  if (!candidates.length) {
    matchActivePersonLocalFallback();
    return;
  }

  if (state.faceMatchInFlight) return;
  state.faceMatchInFlight = true;
  state.lastFaceMatchAt = now;
  try {
    const response = await fetch('/api/identity/face/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        faceCrop,
        candidates,
        threshold: state.faceMatchThreshold,
      }),
    });
    const data = await response.json();
    const matches = Array.isArray(data.matches) ? data.matches : [];
    const top = matches[0];
    const threshold = Number(data.threshold || state.faceMatchThreshold);
    const matched = Boolean(data.matched && top) || Boolean(top && top.score >= threshold);
    state.faceMatch = {
      personId: matched && top ? top.personId : '',
      score: top?.score || 0,
      provider: data.ok ? (data.provider || 'insightface_arcface') : 'mediapipe_descriptor_adapter',
      detScore: data.detScore,
      candidates: matches,
    };
    if (!data.ok) {
      addEvent('人脸匹配降级', `${data.provider || 'insightface'}: ${data.error || 'not_ready'} · ${data.detail || ''}`);
      matchActivePersonLocalFallback();
      return;
    }
  } catch (error) {
    addEvent('人脸匹配失败', `使用 MediaPipe fallback：${error.message}`);
    matchActivePersonLocalFallback();
    return;
  } finally {
    state.faceMatchInFlight = false;
  }
  resolveActiveIdentity();
  renderPeople();
}

function matchVoicePerson() {
  if (!state.voiceDescriptor || !state.people.length || state.voice < 8) {
    state.voiceMatch = { personId: '', score: 0 };
    resolveActiveIdentity();
    return;
  }
  const candidates = state.people.filter(person => person.voiceDescriptor);
  if (!candidates.length) return;
  const best = candidates
    .map(person => ({ person, score: cosineSimilarity(state.voiceDescriptor, person.voiceDescriptor) }))
    .sort((a, b) => b.score - a.score)[0];
  state.voiceMatch = best?.score > 0.88 ? { personId: best.person.id, score: best.score } : { personId: '', score: best?.score || 0 };
  resolveActiveIdentity();
}

function resolveActiveIdentity() {
  const scores = new Map();
  if (state.explicitPersonId) scores.set(state.explicitPersonId, 1.2);
  if (state.faceMatch.personId) {
    scores.set(state.faceMatch.personId, (scores.get(state.faceMatch.personId) || 0) + state.faceMatch.score * 0.55);
  }
  if (state.voiceMatch.personId) {
    scores.set(state.voiceMatch.personId, (scores.get(state.voiceMatch.personId) || 0) + state.voiceMatch.score * 0.35);
  }
  const best = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];
  let nextId = best && best[1] > 0.45 ? best[0] : '';
  // InsightFace 已过阈值时，不应因融合权重(×0.55)低于 0.45 而清空已绑定用户
  if (!nextId && state.faceMatch.personId && state.faceMatch.score >= state.faceMatchThreshold) {
    nextId = state.faceMatch.personId;
  }
  if (nextId !== state.activePersonId) {
    state.activePersonId = nextId;
    state.activePersonScore = best?.[1] || 0;
    renderMemories();
    renderPeople();
    const person = activePerson();
    if (person) addEvent('关系档案识别', `识别为 ${person.name}，融合分数 ${Math.round(state.activePersonScore * 100)}%。`);
  } else {
    state.activePersonScore = best?.[1] || 0;
    renderPeople();
  }
}

function drawFaceOverlay(landmarks) {
  const canvas = elements.faceOverlay;
  const context = canvas.getContext('2d');
  const rect = elements.video.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawSceneObjectOverlays(context, canvas.width, canvas.height);

  if (!landmarks) {
    const objCount = recentSceneObjects().length;
    elements.faceHud.textContent = state.faceModelReady
      ? (objCount ? `Face model: ready · no face · ${objCount} object(s) from VLM` : 'Face model: ready · no face detected')
      : 'Face model: loading...';
    return;
  }

  const left = Math.min(...landmarks.map(point => point.x)) * canvas.width;
  const right = Math.max(...landmarks.map(point => point.x)) * canvas.width;
  const top = Math.min(...landmarks.map(point => point.y)) * canvas.height;
  const bottom = Math.max(...landmarks.map(point => point.y)) * canvas.height;

  context.save();
  context.shadowColor = 'rgba(123, 223, 242, 0.9)';
  context.shadowBlur = 16;
  context.strokeStyle = 'rgba(123, 223, 242, 0.95)';
  context.lineWidth = 4;
  context.strokeRect(left, top, right - left, bottom - top);
  context.restore();

  context.fillStyle = 'rgba(255, 189, 102, 0.95)';
  for (let index = 0; index < landmarks.length; index += 6) {
    const point = landmarks[index];
    context.beginPath();
    context.arc(point.x * canvas.width, point.y * canvas.height, 1.7, 0, Math.PI * 2);
    context.fill();
  }

  const featurePoints = [10, 33, 61, 133, 152, 159, 263, 291, 362, 386, 454, 468, 473];
  context.fillStyle = 'rgba(162, 245, 191, 0.98)';
  featurePoints.forEach(index => {
    const point = landmarks[index];
    if (!point) return;
    context.beginPath();
    context.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2);
    context.fill();
  });

  const label = [
    `bbox ${Math.round(right - left)}x${Math.round(bottom - top)}`,
    `yaw ${Math.round(state.headYaw)}`,
    `pitch ${Math.round(state.headPitch)}`,
    `smile ${Math.round(state.smile)}`,
    `brow ${Math.round(state.brow)}`,
    `eye ${Math.round(state.eye)}`,
    `mouth ${Math.round(state.mouth)}`,
  ].join(' · ');
  context.font = '700 13px Inter, sans-serif';
  context.fillStyle = 'rgba(15, 16, 22, 0.82)';
  context.fillRect(left, Math.max(0, top - 32), Math.min(canvas.width - left, 520), 26);
  context.fillStyle = '#7bdff2';
  context.fillText(label, left + 10, Math.max(18, top - 13));
  const objCount = recentSceneObjects().length;
  elements.faceHud.textContent = `Face tracked · ${landmarks.length} landmarks · ${state.faceBlendshapes.length} blendshape fields · ${label}${objCount ? ` · VLM objects ${objCount}` : ''}`;
}

// VLM 返回的物体 bbox 画在视频上（橙色框）；人脸框仍是 MediaPipe 实时绘制。
function recentSceneObjects() {
  const cutoff = Date.now() - 45000;
  return state.sceneMemory.objects.filter(object =>
    object.status !== 'gone'
    && object.bboxNorm
    && new Date(object.lastSeen).getTime() >= cutoff
  );
}

function drawSceneObjectOverlays(context, width, height) {
  recentSceneObjects().forEach(object => {
    const [x, y, w, h] = object.bboxNorm;
    const left = x * width;
    const top = y * height;
    const boxW = w * width;
    const boxH = h * height;
    context.save();
    context.strokeStyle = 'rgba(255, 189, 102, 0.95)';
    context.lineWidth = 3;
    context.setLineDash([8, 4]);
    context.strokeRect(left, top, boxW, boxH);
    context.setLineDash([]);
    context.font = '700 12px Inter, sans-serif';
    context.fillStyle = 'rgba(15, 16, 22, 0.82)';
    const tag = `${object.id} · ${object.label}`;
    context.fillRect(left, Math.max(0, top - 22), Math.min(width - left, tag.length * 7 + 16), 20);
    context.fillStyle = '#ffbd66';
    context.fillText(tag, left + 6, Math.max(14, top - 7));
    context.restore();
  });
}

function renderBlendshapes() {
  if (!state.faceBlendshapes.length) {
    elements.blendshapeList.innerHTML = '<div class="blendshape-row"><span class="blendshape-name">waiting_for_face</span><div class="blendshape-bar"><span style="width:0%"></span></div><span class="blendshape-score">0.00</span></div>';
    return;
  }
  const rows = [...state.faceBlendshapes]
    .sort((a, b) => b.score - a.score)
    .slice(0, 18)
    .map(item => {
      const score = clamp(item.score * 100);
      return `
        <div class="blendshape-row">
          <span class="blendshape-name">${escapeHtml(item.categoryName)}</span>
          <div class="blendshape-bar"><span style="width:${score}%"></span></div>
          <span class="blendshape-score">${item.score.toFixed(2)}</span>
        </div>
      `;
    }).join('');
  elements.blendshapeList.innerHTML = rows;
}

function updateBaseline() {
  if (!state.started || state.presence < 35) return;
  const alpha = state.baseline.samples < 180 ? 0.035 : 0.006;
  ['voice', 'motion', 'light', 'gaze', 'posture', 'smile', 'brow', 'eye', 'mouth'].forEach(key => {
    state.baseline[key] = state.baseline[key] * (1 - alpha) + state[key] * alpha;
  });
  state.baseline.samples += 1;
  if (state.baseline.samples % 45 === 0) {
    localStorage.setItem('hri-demo-baseline', JSON.stringify(state.baseline));
  }
}

function deltaFromBaseline(key) {
  return state[key] - state.baseline[key];
}

function inferInteractionState() {
  const voiceDelta = deltaFromBaseline('voice');
  const motionDelta = deltaFromBaseline('motion');
  const gazeDelta = deltaFromBaseline('gaze');
  const postureDelta = deltaFromBaseline('posture');
  const smileDelta = deltaFromBaseline('smile');
  const browDelta = deltaFromBaseline('brow');
  const eyeDelta = deltaFromBaseline('eye');
  const quietOverride = Date.now() < state.quietUntil || state.feedback.silent > 1;
  const interruptibility = state.scene?.interruptibility || '';
  const focusedScene = interruptibility === 'low';
  const openScene = interruptibility === 'high';

  state.arousal = clamp(28 + state.voice * 0.38 + state.motion * 0.46 + state.brow * 0.24 + state.mouth * 0.16 + Math.max(0, voiceDelta) * 0.62 + Math.max(0, motionDelta) * 0.55);
  state.energy = clamp(50 + voiceDelta * 0.32 + motionDelta * 0.38 + postureDelta * 0.28 + eyeDelta * 0.18 + (state.light - state.baseline.light) * 0.1);
  state.quietNeed = clamp((quietOverride ? 72 : 16) + (focusedScene ? 18 : 0) + Math.max(0, -voiceDelta) * 0.72 + Math.max(0, -motionDelta) * 0.62 + Math.max(0, -postureDelta) * 0.32 + Math.max(0, state.brow - state.baseline.brow) * 0.18 - Math.max(0, gazeDelta) * 0.22 - Math.max(0, smileDelta) * 0.18);
  state.readiness = clamp(28 + (openScene ? 12 : 0) + state.gaze * 0.3 + state.smile * 0.24 + state.voice * 0.18 + state.presence * 0.16 - state.quietNeed * 0.32 - state.feedback.bad * 8 + state.feedback.good * 5);

  if (quietOverride || state.quietNeed > 70) return ['needs_quiet', 0.76];
  if (state.arousal > 72) return ['high_arousal', 0.7];
  if (state.energy < 34 && state.presence > 40) return ['low_energy', 0.66];
  if (state.readiness > 62) return ['socially_open', 0.64];
  if (state.feedback.bad > state.feedback.good + 1) return ['boundary_sensitive', 0.71];
  return ['observing', 0.52];
}

function chooseIntervention() {
  const quietMode = Date.now() < state.quietUntil || state.feedback.silent > 1;
  const recentlyIntervened = Date.now() - state.lastInterventionAt < 18000;
  const privacyPenalty = state.feedback.bad * 0.15;
  const acceptanceBoost = state.feedback.good * 0.08;
  const score = state.confidence + acceptanceBoost - privacyPenalty;
  if (state.scene?.interruptibility === 'low' && !quietMode) {
    const work = currentWorkContext();
    const relationNote = work ? `关系图谱：${work.personName} 与 ${work.objectLabel} 是${RELATION_TYPE_LABELS[work.type] || '使用'}关系，` : '';
    return {
      key: 'scene-hold',
      title: '场景显示不宜打断',
      body: `${relationNote}我看到的场景是：${state.scene.person_activity || '用户正在专注'}。当前 interruptibility 低、不适合打断。原因：${state.scene.reason || '更适合保持安静'}。`,
      robot: 'attentive',
    };
  }

  if (quietMode) {
    return {
      key: 'quiet',
      title: '安静陪伴，不开口',
      body: '用户显式选择了安静或多次反馈“别主动找我”。机器人只保留低亮度在场感。',
      robot: 'quiet',
    };
  }

  if (recentlyIntervened) {
    return {
      key: 'observe',
      title: '刚刚介入过，进入冷却',
      body: '主动性需要节制。短时间内不连续打断，除非出现明显风险信号。',
      robot: 'attentive',
    };
  }

  const ownership = pickOwnershipQuestion();
  if (ownership && state.interactionState !== 'high_arousal') {
    return {
      key: 'ask-ownership',
      title: '低频确认物品所属',
      body: `我注意到你${ownership.contactCount >= 1 ? '多次用到' : '身边常出现'} ${ownership.objectLabel}。它是你常用 / 属于你的东西吗？你可以回答“是 / 不是”，或点关系图里的按钮。`,
      robot: 'listening',
      relationId: ownership.id,
      objectId: ownership.objectId,
      personId: ownership.personId,
      question: `${ownership.objectLabel} 是你的吗？`,
    };
  }

  if ((state.interactionState === 'low_energy' || state.interactionState === 'needs_quiet') && score > 0.54) {
    return {
      key: 'soft-checkin',
      title: '低侵入 check-in',
      body: `我注意到你比自己的平时基线更安静、动作更少${state.light < 30 ? '，环境也偏暗' : ''}。要不要我先陪你安静十分钟？`,
      robot: 'caring',
    };
  }

  if (state.interactionState === 'high_arousal' && score > 0.58) {
    return {
      key: 'grounding',
      title: '短促降噪建议',
      body: '我观察到声音能量和动作幅度都高于你的平时基线。要不要我把节奏放慢，陪你做 30 秒呼吸？',
      robot: 'listening',
    };
  }

  if (state.interactionState === 'socially_open' && state.memories.length > 3) {
    return {
      key: 'memory-use',
      title: '使用关系记忆轻触达',
      body: `你现在看起来更愿意互动。我记得：${state.memories[state.memories.length - 1]}。现在要不要按这个偏好来？`,
      robot: 'listening',
    };
  }

  return {
    key: 'observe',
    title: '观察中，不打扰',
    body: '还没有足够明确的时机。保持在场，等待用户先开口或出现更稳定的状态变化。',
    robot: 'attentive',
  };
}

function updateReasoning() {
  const [interactionState, confidence] = inferInteractionState();
  const priorState = state.interactionState;
  state.interactionState = interactionState;
  state.confidence = confidence;
  const intervention = chooseIntervention();
  const interventionChanged = intervention.key !== state.intervention;

  if (interventionChanged) {
    state.intervention = intervention.key;
    if (intervention.key !== 'observe') {
      state.lastInterventionAt = Date.now();
      addEvent('主动策略切换', `${intervention.title}：${intervention.body}`);
    }
    if (intervention.key === 'ask-ownership') {
      const relation = state.sceneMemory.relations.find(item => item.id === intervention.relationId);
      if (relation) relation.lastAskedAt = Date.now();
      state.pendingOwnership = {
        relationId: intervention.relationId,
        objectId: intervention.objectId,
        personId: intervention.personId,
        question: intervention.question,
      };
      persistGraph();
      renderSceneMemory();
    }
  }

  if (priorState !== interactionState) {
    addEvent('互动状态更新', `从 ${priorState} 调整为 ${interactionState}，置信度 ${Math.round(confidence * 100)}%。`);
  }

  renderSignals();
  renderState(intervention);
}

function renderSignals() {
  const values = [
    ['presence', state.presence],
    ['voice', state.voice],
    ['motion', state.motion],
    ['light', state.light],
    ['gaze', state.gaze],
    ['posture', state.posture],
    ['smile', state.smile],
    ['brow', state.brow],
    ['eye', state.eye],
    ['mouth', state.mouth],
  ];
  values.forEach(([name, value]) => {
    elements[`${name}Meter`].value = value;
    elements[`${name}Text`].textContent = name === 'presence'
      ? value > 45 ? '人在场' : '不确定'
      : `${Math.round(value)}%`;
  });
}

function renderState(intervention) {
  elements.stateCore.textContent = state.interactionState.replace('_', ' ');
  elements.stateCore.style.background = state.interactionState === 'low_energy' || state.interactionState === 'needs_quiet'
    ? 'linear-gradient(135deg, #b69cff, #7bdff2)'
    : state.interactionState === 'high_arousal'
      ? 'linear-gradient(135deg, #ff7a90, #ffbd66)'
      : 'linear-gradient(135deg, #a2f5bf, #7bdff2)';

  elements.stateList.innerHTML = [
    ['互动状态', `${state.interactionState} · ${Math.round(state.confidence * 100)}% confidence`],
    ['Readiness / Arousal', `${Math.round(state.readiness)} / ${Math.round(state.arousal)}`],
    ['Energy / Quiet need', `${Math.round(state.energy)} / ${Math.round(state.quietNeed)}`],
    ['Face tracking', state.faceModelReady ? `${state.facePresent ? 'face present' : 'no face'} · yaw ${Math.round(state.headYaw)} · pitch ${Math.round(state.headPitch)}` : `loading/fallback${state.faceModelError ? ' · failed' : ''}`],
    ['个人基线', `${state.baseline.samples} samples · voice ${Math.round(state.baseline.voice)} · smile ${Math.round(state.baseline.smile)}`],
    ['边界条件', Date.now() < state.quietUntil ? '用户要求安静中' : '可被用户撤销'],
  ].map(([label, value]) => `<div><label>${label}</label><strong>${value}</strong></div>`).join('');

  elements.intervention.innerHTML = `
    <small>当前策略 · ${intervention.key}</small>
    <h3>${intervention.title}</h3>
    <p>${intervention.body}</p>
  `;

  elements.robot.className = `robot ${intervention.robot}`;
  elements.robotStatus.textContent = intervention.key === 'observe' ? '在场但不打扰' : intervention.title;
}

elements.startButton.addEventListener('click', startSensing);
elements.cameraOnlyButton.addEventListener('click', startCameraOnly);

elements.quietButton.addEventListener('click', () => {
  state.quietUntil = Date.now() + 10 * 60 * 1000;
  state.feedback.silent += 1;
  localStorage.setItem('hri-demo-feedback', JSON.stringify(state.feedback));
  addEvent('用户设置边界', '用户选择安静 10 分钟，主动策略降级为静默陪伴。');
  updateReasoning();
});

elements.memoryForm.addEventListener('submit', event => {
  event.preventDefault();
  const memory = elements.memoryInput.value.trim();
  if (!memory) return;
  activeMemories().push(memory);
  elements.memoryInput.value = '';
  persistActiveMemories();
  renderMemories();
  renderPeople();
  addEvent('关系记忆新增', `${activePerson()?.name || '通用档案'}：${memory}`);
  updateReasoning();
});

elements.memoryList.addEventListener('click', event => {
  const index = event.target.dataset.deleteMemory;
  if (index === undefined) return;
  const [removed] = activeMemories().splice(Number(index), 1);
  persistActiveMemories();
  renderMemories();
  renderPeople();
  addEvent('关系记忆删除', removed);
});

elements.personForm.addEventListener('submit', event => {
  event.preventDefault();
  enrollCurrentFace();
});

function setEnrollButtonBusy(busy) {
  const submit = elements.personForm?.querySelector('button[type="submit"]');
  if (!submit) return;
  submit.disabled = busy;
  submit.textContent = busy ? '正在提取 InsightFace…' : '绑定当前人脸';
}

async function enrollCurrentFace() {
  const name = elements.personNameInput.value.trim();
  if (!name) return;
  if (!state.facePresent || !state.faceDescriptor) {
    addEvent('绑定失败', `当前没有稳定检测到人脸：${faceEnrollmentStatus()}`);
    return;
  }
  if (state.lastFaceCropQuality !== 'good') {
    addEvent('绑定失败', `人脸裁剪质量不足：${state.lastFaceCropQuality} · ${state.lastFaceCropReason || faceEnrollmentStatus()}`);
    return;
  }
  if (state.enrollBusy) return;
  state.enrollBusy = true;
  setEnrollButtonBusy(true);
  const faceCrop = captureFaceCrop({ forEnroll: true });
  if (!faceCrop) {
    addEvent('绑定失败', `无法从 MediaPipe bbox 裁剪人脸：${faceEnrollmentStatus()}`);
    state.enrollBusy = false;
    setEnrollButtonBusy(false);
    return;
  }
  let identityEmbedding = null;
  let identityProvider = 'mediapipe_descriptor_adapter';
  let detScore = null;
  try {
    const response = await fetch('/api/identity/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, faceCrop, descriptor: state.faceDescriptor }),
    });
    const data = await response.json();
    if (data.ok && data.embedding) {
      identityEmbedding = data.embedding;
      identityProvider = data.provider || 'insightface_arcface';
      detScore = data.det_score;
      addEvent('InsightFace 绑定', `${identityProvider} · det=${detScore ?? 'n/a'}`);
    } else {
      const reason = describeIdentityError(data);
      addEvent('InsightFace 绑定失败', `${data.error || 'not_ready'} · ${reason}${data.python ? ` · python=${data.python}` : ''}`);
      if (data.fallbackEmbedding && !state.insightfaceReady) {
        identityEmbedding = data.fallbackEmbedding;
        identityProvider = 'mediapipe_descriptor_adapter';
        addEvent('已保存 fallback 样本', 'InsightFace 未就绪，仅保存 MediaPipe descriptor（界面会标明 mediapipe_fallback）。');
      } else if (data.fallbackEmbedding && state.insightfaceReady) {
        addEvent('未使用 fallback', 'InsightFace 已就绪但本次检测失败，请调整正脸/光照后重试，未写入降级样本。');
      }
    }
  } catch (error) {
    addEvent('身份后端降级', `后端 identity adapter 不可用，使用前端 MediaPipe descriptor：${error.message}`);
    identityEmbedding = normalizeLocalDescriptor(state.faceDescriptor);
    identityProvider = 'mediapipe_descriptor_adapter';
  } finally {
    state.enrollBusy = false;
    setEnrollButtonBusy(false);
  }
  if (!identityEmbedding) {
    addEvent('绑定失败', '没有可用 face embedding。请正对摄像头、稍靠近，并确认 node 终端显示 InsightFace ready。');
    return;
  }
  const sample = {
    embedding: identityEmbedding,
    provider: identityProvider,
    detScore,
    bboxNorm: state.lastFaceBboxNorm,
    thumbnailDataUrl: faceCrop,
  };
  const existing = state.people.find(person => person.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    if (!existing.faceEmbeddings) existing.faceEmbeddings = [];
    pushFaceEmbedding(existing, sample);
    state.activePersonId = existing.id;
    state.explicitPersonId = existing.id;
    state.activePersonScore = 1;
    addEvent('关系档案更新', `已更新 ${existing.name} · ${formatFaceProviderLabel(identityProvider)} · 共 ${existing.samples} 张人脸样本。已设为当前显式身份。`);
  } else {
    const person = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name,
      faceEmbeddings: [],
      faceDescriptor: identityEmbedding,
      faceProvider: identityProvider,
      samples: 0,
      voiceDescriptor: null,
      voiceSamples: 0,
      memories: [
        '第一次建立关系档案：需要先确认边界，不要假装已经很熟。',
      ],
      strategy: '先轻量确认，再逐步个性化',
      baseline: { ...state.baseline, samples: 0 },
    };
    pushFaceEmbedding(person, sample);
    state.people.push(person);
    state.activePersonId = person.id;
    state.explicitPersonId = person.id;
    state.activePersonScore = 1;
    addEvent('关系档案创建', `已为 ${name} 创建档案 · ${formatFaceProviderLabel(identityProvider)}。已设为当前显式身份。`);
  }
  elements.personNameInput.value = '';
  persistPeople();
  renderPeople();
  renderMemories();
}

function expandBboxNorm(bbox, extraPad = 0.35) {
  const padX = bbox.w * extraPad;
  const padY = bbox.h * extraPad;
  let x = Math.max(0, bbox.x - padX);
  let y = Math.max(0, bbox.y - padY);
  let w = Math.min(1 - x, bbox.w + padX * 2);
  let h = Math.min(1 - y, bbox.h + padY * 2);
  return { x, y, w, h };
}

function normalizeLocalDescriptor(descriptor) {
  if (!Array.isArray(descriptor) || !descriptor.length) return null;
  const norm = Math.hypot(...descriptor) || 1;
  return descriptor.map(value => Number((value / norm).toFixed(6)));
}

function captureFaceCrop(options = {}) {
  const forEnroll = Boolean(options.forEnroll);
  const video = elements.video;
  const baseBbox = state.lastFaceBboxNorm;
  if (!video?.videoWidth || !video?.videoHeight || !baseBbox) return null;
  const bbox = forEnroll ? expandBboxNorm(baseBbox, 0.38) : baseBbox;
  const sx = Math.round(bbox.x * video.videoWidth);
  const sy = Math.round(bbox.y * video.videoHeight);
  const sw = Math.round(bbox.w * video.videoWidth);
  const sh = Math.round(bbox.h * video.videoHeight);
  if (sw < 32 || sh < 32) return null;
  const maxEdge = forEnroll ? 384 : 256;
  const scale = maxEdge / Math.max(sw, sh);
  const outW = Math.max(32, Math.round(sw * scale));
  const outH = Math.max(32, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const context = canvas.getContext('2d');
  context.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);
  return canvas.toDataURL('image/jpeg', 0.85);
}

elements.personList.addEventListener('click', event => {
  const deleteButton = event.target.closest('[data-delete-person]');
  if (deleteButton) {
    const id = deleteButton.dataset.deletePerson;
    const person = state.people.find(item => item.id === id);
    state.people = state.people.filter(item => item.id !== id);
    if (state.activePersonId === id) state.activePersonId = '';
    if (state.explicitPersonId === id) state.explicitPersonId = '';
    persistPeople();
    renderPeople();
    renderMemories();
    addEvent('关系档案删除', person ? person.name : id);
    return;
  }
  const selectButton = event.target.closest('[data-select-person]');
  if (selectButton) {
    const selectedId = selectButton.dataset.selectPerson;
    state.explicitPersonId = state.explicitPersonId === selectedId ? '' : selectedId;
    resolveActiveIdentity();
    renderPeople();
    addEvent('显式身份选择', state.explicitPersonId ? `用户选择身份：${activePerson()?.name || selectedId}` : '用户取消显式身份。');
  }
});

if (elements.clearPeopleButton) {
  elements.clearPeopleButton.addEventListener('click', () => {
    if (!state.people.length) {
      addEvent('关系档案清空', '当前没有人物档案。');
      return;
    }
    clearAllPeople();
  });
}

if (elements.sceneMemory) {
  elements.sceneMemory.addEventListener('click', event => {
    const button = event.target.closest('button[data-rel-confirm], button[data-rel-reject], button[data-rel-frequent], button[data-rel-occasional], button[data-rel-delete], button[data-obj-rename], button[data-obj-delete]');
    if (!button) return;
    const { relConfirm, relReject, relFrequent, relOccasional, relDelete, objRename, objDelete } = button.dataset;
    if (relConfirm) return applyRelationCorrection(relConfirm, 'confirm');
    if (relReject) return applyRelationCorrection(relReject, 'reject');
    if (relFrequent) return applyRelationCorrection(relFrequent, 'frequent');
    if (relOccasional) return applyRelationCorrection(relOccasional, 'occasional');
    if (relDelete) return deleteRelation(relDelete);
    if (objRename) return renameSceneObject(objRename);
    if (objDelete) return deleteSceneObject(objDelete);
  });
}

// 用户对关系图谱的纠正必须真正生效（确认/否认/经常/偶尔）。
function applyRelationCorrection(relationId, kind) {
  const relation = state.sceneMemory.relations.find(item => item.id === relationId);
  if (!relation) return;
  if (kind === 'confirm') {
    relation.status = 'confirmed';
    relation.contactCount = Math.max(relation.contactCount, 3);
  } else if (kind === 'reject') {
    relation.status = 'rejected';
  } else if (kind === 'frequent') {
    relation.status = 'hypothesis';
    relation.contactCount = Math.max(relation.contactCount, 3);
  } else if (kind === 'occasional') {
    relation.status = 'hypothesis';
    relation.contactCount = 0;
    relation.interactionCount = Math.min(relation.interactionCount, 1);
  }
  recomputeRelation(relation);
  if (state.pendingOwnership?.relationId === relationId) state.pendingOwnership = null;
  persistGraph();
  renderSceneMemory();
  addEvent('关系图谱修正', `${relation.personName} → ${relation.objectLabel}：${RELATION_TYPE_LABELS[relation.type] || relation.type}`);
}

function deleteRelation(relationId) {
  const relation = state.sceneMemory.relations.find(item => item.id === relationId);
  state.sceneMemory.relations = state.sceneMemory.relations.filter(item => item.id !== relationId);
  if (state.pendingOwnership?.relationId === relationId) state.pendingOwnership = null;
  persistGraph();
  renderSceneMemory();
  if (relation) addEvent('关系删除', `${relation.personName} → ${relation.objectLabel}`);
}

function renameSceneObject(objectId) {
  const object = state.sceneMemory.objects.find(item => item.id === objectId);
  if (!object) return;
  const next = window.prompt('为该物体实例命名（例如：我的水杯）', object.label);
  if (next === null) return;
  const label = next.trim();
  if (!label) return;
  object.label = label;
  object.normalized = normalizeLabel(label);
  state.sceneMemory.relations.forEach(relation => {
    if (relation.objectId === objectId) relation.objectLabel = label;
  });
  persistGraph();
  renderSceneMemory();
  addEvent('物体改名', `${objectId} → ${label}`);
}

function deleteSceneObject(objectId) {
  const object = state.sceneMemory.objects.find(item => item.id === objectId);
  state.sceneMemory.objects = state.sceneMemory.objects.filter(item => item.id !== objectId);
  state.sceneMemory.relations = state.sceneMemory.relations.filter(item => item.objectId !== objectId);
  if (state.pendingOwnership?.objectId === objectId) state.pendingOwnership = null;
  persistGraph();
  renderSceneMemory();
  if (object) addEvent('物体删除', `${objectId} · ${object.label}`);
}

// 当存在待确认所属问题时，解析用户“是/不是”的口头回答并落到关系图谱。
function handleOwnershipReply(text) {
  if (!state.pendingOwnership) return false;
  const yes = /^(是|对|嗯|没错|是我的|对的|yes|yeah|yep)/i.test(text) || /(是我的|我的|我常用|经常用|我自己)/.test(text);
  const no = /^(不|没|不是|否|no|nope)/i.test(text) || /(不是我的|不是我|别人的|不属于|只是偶尔|偶然)/.test(text);
  if (!yes && !no) return false;
  applyRelationCorrection(state.pendingOwnership.relationId, yes ? 'confirm' : 'reject');
  return true;
}

// 找到“正在工作 / 使用电脑”这类会影响打断策略的关系，让策略可解释。
function currentWorkContext() {
  const person = activePerson();
  if (!person) return null;
  return state.sceneMemory.relations.find(relation =>
    relation.personId === person.id
    && relation.status !== 'rejected'
    && (relation.strength === 'strong' || relation.status === 'confirmed')
    && /laptop|computer|desktop|monitor|电脑|笔记本|显示器/.test(normalizeLabel(relation.objectLabel))
  ) || null;
}

// 适时（低频）挑选一个值得向用户确认所属权的关系。
function pickOwnershipQuestion() {
  if (state.pendingOwnership) return null;
  const now = Date.now();
  return state.sceneMemory.relations.find(relation =>
    relation.personId !== 'unknown_person'
    && relation.status === 'hypothesis'
    && (relation.strength === 'medium' || relation.strength === 'strong')
    && relation.interactionCount >= 2
    && now - (relation.lastAskedAt || 0) > 60000
  ) || null;
}

elements.enrollVoiceButton.addEventListener('click', async () => {
  const person = activePerson();
  if (!person) {
    addEvent('声纹绑定失败', '请先创建或显式选择一个人物档案。');
    return;
  }
  if (!state.audioStream) {
    addEvent('声纹绑定失败', '麦克风未启用。请使用“启动感知 demo”，不是“只测试摄像头”。');
    return;
  }
  addEvent('声纹采集中', '请连续说话 3 秒，系统会提取 speaker embedding。');
  const audio = await recordVoiceSample();
  let voiceEmbedding = null;
  try {
    const response = await fetch('/api/identity/voice/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio }),
    });
    const data = await response.json();
    if (data.ok && data.embedding) {
      voiceEmbedding = data.embedding;
      person.voiceProvider = data.provider || 'speechbrain_ecapa';
    } else {
      addEvent('真实声纹识别未就绪', `${data.provider || 'voice'}: ${data.error || 'not_ready'} · ${data.detail || ''}`);
      voiceEmbedding = state.voiceDescriptor;
      person.voiceProvider = 'spectral_fallback';
    }
  } catch (error) {
    addEvent('声纹后端降级', `后端 voice adapter 不可用，使用频谱 fallback：${error.message}`);
    voiceEmbedding = state.voiceDescriptor;
    person.voiceProvider = 'spectral_fallback';
  }
  if (!voiceEmbedding) {
    addEvent('声纹绑定失败', '没有可用 voice embedding。请确认麦克风权限并重试。');
    return;
  }
  person.voiceDescriptor = person.voiceDescriptor
    ? mergeDescriptor(person.voiceDescriptor, voiceEmbedding, person.voiceSamples || 1)
    : voiceEmbedding;
  person.voiceSamples = (person.voiceSamples || 0) + 1;
  persistPeople();
  renderPeople();
  addEvent('声纹绑定成功', `已为 ${person.name} 更新声纹样本：${person.voiceProvider || 'unknown'}。`);
});

function recordVoiceSample() {
  return new Promise((resolve, reject) => {
    const recorder = new MediaRecorder(state.audioStream);
    const chunks = [];
    recorder.ondataavailable = event => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = event => reject(event.error || new Error('media_recorder_error'));
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('file_reader_error'));
      reader.readAsDataURL(blob);
    };
    recorder.start();
    setTimeout(() => recorder.stop(), 3000);
  });
}

function mergeDescriptor(oldDescriptor, newDescriptor, oldSamples) {
  if (!oldDescriptor || oldDescriptor.length !== newDescriptor.length) return newDescriptor;
  return oldDescriptor.map((value, index) => Number(((value * oldSamples + newDescriptor[index]) / (oldSamples + 1)).toFixed(4)));
}

document.querySelectorAll('[data-feedback]').forEach(button => {
  button.addEventListener('click', () => {
    const feedback = button.dataset.feedback;
    state.feedback[feedback] += 1;
    localStorage.setItem('hri-demo-feedback', JSON.stringify(state.feedback));
    const labels = { good: '用户认为这次体贴', bad: '用户认为这次太打扰', silent: '用户要求减少主动性' };
    addEvent('用户反馈', labels[feedback]);
    updateReasoning();
  });
});

renderMemories();
renderPeople();
renderTimeline();
renderSignals();
renderBlendshapes();
renderScene();
renderSceneMemory();
renderState(chooseIntervention());

function buildInteractionSnapshot() {
  const person = activePerson();
  return {
    person: person ? {
      id: person.id,
      name: person.name,
      strategy: person.strategy,
      memories: person.memories.slice(-8),
      matchScore: Math.round(state.activePersonScore * 100),
      identityEvidence: {
        explicit: state.explicitPersonId === person.id,
        faceScore: state.faceMatch.personId === person.id ? Math.round(state.faceMatch.score * 100) : 0,
        faceProvider: state.faceMatch.provider || '',
        voiceScore: state.voiceMatch.personId === person.id ? Math.round(state.voiceMatch.score * 100) : 0,
      },
    } : null,
    interactionState: state.interactionState,
    confidence: Math.round(state.confidence * 100),
    readiness: Math.round(state.readiness),
    arousal: Math.round(state.arousal),
    energy: Math.round(state.energy),
    quietNeed: Math.round(state.quietNeed),
    signals: {
      presence: Math.round(state.presence),
      voice: Math.round(state.voice),
      motion: Math.round(state.motion),
      light: Math.round(state.light),
      gaze: Math.round(state.gaze),
      posture: Math.round(state.posture),
      smile: Math.round(state.smile),
      brow: Math.round(state.brow),
      eye: Math.round(state.eye),
      mouth: Math.round(state.mouth),
      facePresent: state.facePresent,
      headYaw: Math.round(state.headYaw),
      headPitch: Math.round(state.headPitch),
      voiceIdentityScore: Math.round(state.voiceMatch.score * 100),
    },
    memories: activeMemories().slice(-8),
    feedback: state.feedback,
    scene: state.scene,
    sceneMemory: compactSceneMemory(),
    pendingOwnership: state.pendingOwnership,
  };
}

function compactSceneMemory() {
  const person = activePerson();
  return {
    activePerson: person ? { id: person.id, name: person.name } : null,
    objects: state.sceneMemory.objects.slice(-16).map(object => ({
      id: object.id,
      label: object.label,
      visual_description: object.visualDescription,
      bbox_norm: object.bboxNorm,
      seenCount: object.seenCount,
      status: object.status,
    })),
    relations: state.sceneMemory.relations.slice(-20).map(relation => ({
      id: relation.id,
      personId: relation.personId,
      personName: relation.personName,
      objectId: relation.objectId,
      objectLabel: relation.objectLabel,
      type: relation.type,
      strength: relation.strength,
      status: relation.status,
      count: relation.count,
      interactionCount: relation.interactionCount,
      evidence: relation.evidence.slice(0, 2),
    })),
    recentEvents: state.sceneMemory.events.slice(0, 8).map(event => ({
      id: event.id,
      type: event.type,
      summary: event.summary,
      refs: event.refs,
      count: event.count,
    })),
  };
}

async function sendUserMessage(rawText) {
  const text = rawText.trim();
  if (!text) return;
  addMessage('user', text);
  elements.chatInput.value = '';
  elements.robot.className = 'robot listening';
  elements.robotStatus.textContent = '正在理解你的话';

  if (handleOwnershipReply(text)) {
    const ack = '好的，我已经更新了关系图谱。';
    addMessage('assistant', ack);
    elements.robot.className = 'robot caring';
    elements.robotStatus.textContent = '已更新关系图谱';
    speak(ack);
    return;
  }

  const reply = await getCompanionReply(text);
  addMessage('assistant', reply);
  elements.robot.className = 'robot caring';
  elements.robotStatus.textContent = '已回复，等待你的反馈';
  speak(reply);
}

async function getCompanionReply(text) {
  const snapshot = buildInteractionSnapshot();
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, snapshot, messages: state.messages.slice(-10) }),
    });
    if (!response.ok) throw new Error(`LLM endpoint ${response.status}`);
    const data = await response.json();
    if (data.memory) {
      state.memories.push(data.memory);
      persistMemories();
      renderMemories();
      addEvent('对话提取记忆', data.memory);
    }
    return data.reply || localCompanionReply(text, snapshot);
  } catch (error) {
    return localCompanionReply(text, snapshot);
  }
}

function localCompanionReply(text, snapshot) {
  const name = snapshot.person?.name;
  const prefix = name ? `${name}，` : '';
  const lower = text.toLowerCase();
  const asksQuiet = /安静|别说|不要|停|quiet|silent/.test(lower);
  const tired = /累|困|疲惫|压力|烦|难受|崩|焦虑|tired|stress|sad/.test(lower);
  const happy = /开心|不错|很好|兴奋|happy|great/.test(lower);

  if (asksQuiet || snapshot.interactionState === 'needs_quiet') {
    return `${prefix}好，我会把主动性降到最低。你不用解释，我就在这里，之后只用很短的方式回应你。`;
  }

  if (tired || snapshot.energy < 38) {
    return `${prefix}我不会追问原因。就按你的偏好来：先安静一点。你可以只回答一个字：要我陪你安静十分钟，还是帮你把今天拆成一件很小的事？`;
  }

  if (snapshot.arousal > 72) {
    return `${prefix}我感觉现在节奏偏高，所以我先不展开长聊。我们做一个很短的降噪：吸气四秒，停一秒，呼气六秒。做完你再决定要不要说。`;
  }

  if (happy || snapshot.readiness > 62) {
    return `${prefix}我收到。你现在比较愿意互动，我会多接一点话，但不抢节奏。你想让我陪你复盘今天，还是一起想一个接下来 20 分钟的小计划？`;
  }

  return `${prefix}我先轻轻回应：我听到了。当前我对你的互动状态判断是 ${snapshot.interactionState}，置信度 ${snapshot.confidence}%。如果我判断错了，你可以直接说“你误会了”，我会记住。`;
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    elements.asrStatus.textContent = '当前浏览器不支持 Web Speech ASR。可以用文字输入；Chrome 通常支持更好。';
    elements.listenButton.disabled = true;
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'zh-CN';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    state.listening = true;
    elements.listenButton.textContent = '正在听，点我停止';
    elements.asrStatus.textContent = '正在听你说话...';
    elements.robot.className = 'robot listening';
  };

  recognition.onresult = event => {
    let transcript = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      transcript += event.results[index][0].transcript;
      if (event.results[index].isFinal) {
        elements.chatInput.value = transcript;
      }
    }
    elements.asrStatus.textContent = `识别中：${transcript}`;
  };

  recognition.onend = () => {
    state.listening = false;
    elements.listenButton.textContent = '开始听我说';
    elements.asrStatus.textContent = elements.chatInput.value ? '识别完成，已填入输入框。' : 'ASR 已结束，没有识别到完整语句。';
    if (elements.chatInput.value.trim()) sendUserMessage(elements.chatInput.value);
  };

  recognition.onerror = event => {
    state.listening = false;
    elements.listenButton.textContent = '开始听我说';
    elements.asrStatus.textContent = `ASR 错误：${event.error}。可改用文字输入。`;
  };

  state.recognition = recognition;
}

async function inspectMediaDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    setCameraDebug('当前浏览器无法枚举媒体设备；请尝试 Chrome 或 Safari 权限设置。', 'bad');
    return;
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === 'videoinput').length;
    const microphones = devices.filter(device => device.kind === 'audioinput').length;
    setCameraDebug(`检测到 ${cameras} 个摄像头、${microphones} 个麦克风。点击“启动感知 demo”请求权限。`, cameras ? '' : 'bad');
  } catch (error) {
    setCameraDebug(`无法枚举媒体设备：${error.name || error.message}`, 'bad');
  }
}

function speak(text) {
  if (!state.speakReplies || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.92;
  utterance.pitch = 0.95;
  window.speechSynthesis.speak(utterance);
}

elements.listenButton.addEventListener('click', () => {
  if (!state.recognition) return;
  if (state.listening) {
    state.recognition.stop();
  } else {
    elements.chatInput.value = '';
    state.recognition.start();
  }
});

elements.sendButton.addEventListener('click', () => sendUserMessage(elements.chatInput.value));

elements.chatInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') sendUserMessage(elements.chatInput.value);
});

elements.speakToggle.addEventListener('click', () => {
  state.speakReplies = !state.speakReplies;
  localStorage.setItem('hri-demo-speak', JSON.stringify(state.speakReplies));
  renderConversation();
});

setupSpeechRecognition();
inspectMediaDevices();
pingServer();
setInterval(pingServer, 15000);
renderPeople();
renderConversation();
