const elements = {
  startButton: document.querySelector('#startButton'),
  cameraOnlyButton: document.querySelector('#cameraOnlyButton'),
  quietButton: document.querySelector('#quietButton'),
  video: document.querySelector('#video'),
  canvas: document.querySelector('#analysisCanvas'),
  faceOverlay: document.querySelector('#faceOverlay'),
  faceHud: document.querySelector('#faceHud'),
  objectHud: document.querySelector('#objectHud'),
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
  emotionStatus: document.querySelector('#emotionStatus'),
  emoRingArc: document.querySelector('#emoRingArc'),
  emoRingLabel: document.querySelector('#emoRingLabel'),
  emoRingEmoji: document.querySelector('#emoRingEmoji'),
  emoRingConf: document.querySelector('#emoRingConf'),
  emoVADot: document.querySelector('#emoVADot'),
  emoVAHalo: document.querySelector('#emoVAHalo'),
  emoVATrail: document.querySelector('#emoVATrail'),
  emoTLValence: document.querySelector('#emoTLValence'),
  emoTLArousal: document.querySelector('#emoTLArousal'),
  emoTLValenceArea: document.querySelector('#emoTLValenceArea'),
  emoTLArousalArea: document.querySelector('#emoTLArousalArea'),
  emoAura: document.querySelector('#emoAura'),
  emoFaceRow: document.querySelector('#emoFaceRow'),
  emoMultiFaceList: document.querySelector('#emoMultiFaceList'),
  emoVoiceRow: document.querySelector('#emoVoiceRow'),
  voiceEmotionToggle: document.querySelector('#voiceEmotionToggle'),
  ssdOverlayToggle: document.querySelector('#ssdOverlayToggle'),
  ifOverlayToggle: document.querySelector('#ifOverlayToggle'),
  diarizationStatus: document.querySelector('#diarizationStatus'),
  diarizationSegments: document.querySelector('#diarizationSegments'),
};

const APP_CACHE_VERSION = 'gesture-scissors-3';
const MAX_FACES = 4;
// MediaPipe Pose 33 关键点骨架连线（BlazePose topology）
const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
];
const FACE_COLORS = ['#7bdff2', '#ffbd66', '#a2f5bf', '#c792ff'];
// COCO-SSD 类别 → VLM 开放词汇别名（用于 bbox 交叉验证）
const COCO_VLM_ALIASES = {
  cup: ['cup', 'mug', 'glass', '马克杯', '杯子'],
  bottle: ['bottle', 'water bottle', '瓶子'],
  'cell phone': ['phone', 'cell phone', 'mobile', '手机'],
  laptop: ['laptop', 'computer', 'notebook', '电脑', '笔记本'],
  book: ['book', '书'],
  keyboard: ['keyboard', '键盘'],
  mouse: ['mouse', '鼠标'],
  chair: ['chair', '椅子'],
  tv: ['tv', 'television', 'monitor', '屏幕'],
  remote: ['remote', 'remote control', '遥控器'],
  scissors: ['scissors', 'comb', 'hair comb', 'brush', '梳子'],
  toothbrush: ['toothbrush', '牙刷'],
  handbag: ['bag', 'handbag', 'backpack', '包'],
  clock: ['clock', 'watch', '钟', '表'],
  vase: ['vase', '花瓶'],
  bowl: ['bowl', '碗'],
  sandwich: ['sandwich', 'food'],
  orange: ['orange', 'fruit'],
  banana: ['banana', 'fruit'],
  person: ['person', '人'],
};
const storedCacheVersion = localStorage.getItem('hri-demo-cache-version');
if (storedCacheVersion !== APP_CACHE_VERSION) {
  [
    'hri-demo-scene',
    'hri-demo-scene-memory',
    'hri-demo-baseline',
    'hri-demo-open-vocab-detector',
  ].forEach(key => localStorage.removeItem(key));
  localStorage.setItem('hri-demo-cache-version', APP_CACHE_VERSION);
}

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
  poseLandmarker: null,
  poseModelReady: false,
  poseModelError: '',
  poseLandmarks: null,
  trackedFaces: [],
  primaryFaceId: '',
  faceTracks: [],
  faceTrackPool: [],
  vlmCropStats: { accepted: 0, rejected: 0, lastAt: 0 },
  handLandmarker: null,
  handModelReady: false,
  handLandmarks: [],
  gestures: [],
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
  multiFaceMatches: {},
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
  sceneFramesForThumbnail: [],
  lastSceneAt: 0,
  ssd: { model: null, ready: false, loading: false, detections: [], lastAt: 0 },
  readiness: 35,
  arousal: 20,
  energy: 45,
  quietNeed: 20,
  interactionState: 'observing',
  confidence: 0.35,
  // 多模态情绪信号（非心理诊断）：面部 FER + 语音 SER + 加权融合。
  emotion: {
    faceReady: false,
    voiceReady: false,
    voiceSampling: JSON.parse(localStorage.getItem('hri-demo-voice-emotion') || 'true'),
    face: { emotion: '', scores: {}, valence: 0, arousal: 0, confidence: 0, provider: '', model: '', at: 0, error: '' },
    voice: { emotion: '', scores: {}, valence: 0, arousal: 0, confidence: 0, provider: '', model: '', at: 0, error: '' },
    fused: { emotion: 'neutral', scores: {}, valence: 0, arousal: 0, confidence: 0 },
    history: [],
    policyNote: '',
    faceInFlight: false,
    voiceInFlight: false,
    lastFaceAt: 0,
    lastVoiceAt: 0,
    faces: {},
    faceEmotionIndex: 0,
    fusionNote: '',
  },
  diarization: {
    provider: 'pyannote_3.1',
    segments: [],
    active: false,
    speakerEstimate: 0,
    lastAt: 0,
    busy: false,
    ready: false,
  },
  debug: {
    ssdOverlay: JSON.parse(localStorage.getItem('hri-demo-ssd-overlay') ?? 'true'),
    insightfaceOverlay: JSON.parse(localStorage.getItem('hri-demo-if-overlay') ?? 'true'),
  },
  insightfaceDetections: [],
  lastInsightfaceDetectAt: 0,
  insightfaceDetectInFlight: false,
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
    if (!object.bboxQuality) object.bboxQuality = assessObjectBboxQuality(object.bboxNorm);
    if (!object.thumbnailMeta) object.thumbnailMeta = null;
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

// —— VLM 物体 bbox 裁剪：格式归一化 + 多帧候选 + 质量评分 ——
function clamp01(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(1, Math.max(0, num));
}

function normalizeObjectBboxNorm(bbox) {
  if (!bbox) return null;
  const arr = Array.isArray(bbox) ? bbox.map(Number) : [bbox.x, bbox.y, bbox.w, bbox.h].map(Number);
  if (arr.length < 4 || arr.some(v => !Number.isFinite(v))) return null;
  let x = clamp01(arr[0]);
  let y = clamp01(arr[1]);
  let w = clamp01(arr[2]);
  let h = clamp01(arr[3]);
  // 兼容 [x1,y1,x2,y2]：当 w/h 像右下角坐标时转为 xywh
  if (arr[2] > arr[0] && arr[3] > arr[1] && (x + w > 1.01 || y + h > 1.01 || w > 0.92 || h > 0.92)) {
    w = clamp01(arr[2] - arr[0]);
    h = clamp01(arr[3] - arr[1]);
  }
  if (w <= 0.002 || h <= 0.002) return null;
  w = Math.min(w, 1 - x);
  h = Math.min(h, 1 - y);
  return [Number(x.toFixed(4)), Number(y.toFixed(4)), Number(w.toFixed(4)), Number(h.toFixed(4))];
}

function assessObjectBboxQuality(bboxNorm) {
  if (!bboxNorm) return { quality: 'missing', score: 0, reason: 'no_bbox' };
  const [, , w, h] = bboxNorm;
  const area = w * h;
  if (area < 0.0008) return { quality: 'poor', score: 0.15, reason: 'bbox_too_small' };
  if (area > 0.65) return { quality: 'poor', score: 0.2, reason: 'bbox_too_large' };
  if (w / Math.max(h, 0.001) > 8 || h / Math.max(w, 0.001) > 8) {
    return { quality: 'uncertain', score: 0.35, reason: 'bbox_extreme_aspect' };
  }
  const score = area < 0.004 ? 0.48 : area < 0.35 ? 0.86 : 0.62;
  return { quality: score >= 0.7 ? 'good' : 'uncertain', score, reason: 'ok' };
}

function expandObjectBboxNorm(bboxNorm, ratio = 0.12) {
  const [x, y, w, h] = bboxNorm;
  const padX = w * ratio;
  const padY = h * ratio;
  const nx = Math.max(0, x - padX);
  const ny = Math.max(0, y - padY);
  return [
    Number(nx.toFixed(4)),
    Number(ny.toFixed(4)),
    Number(Math.min(w + padX * 2, 1 - nx).toFixed(4)),
    Number(Math.min(h + padY * 2, 1 - ny).toFixed(4)),
  ];
}

function bboxIoU(a, b) {
  if (!a || !b || a.length < 4 || b.length < 4) return 0;
  const ax2 = a[0] + a[2];
  const ay2 = a[1] + a[3];
  const bx2 = b[0] + b[2];
  const by2 = b[1] + b[3];
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a[0], b[0]));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a[1], b[1]));
  const inter = ix * iy;
  const union = a[2] * a[3] + b[2] * b[3] - inter;
  return union > 0 ? inter / union : 0;
}

function blendBboxes(a, b, alpha = 0.5) {
  return [
    Number((a[0] * (1 - alpha) + b[0] * alpha).toFixed(4)),
    Number((a[1] * (1 - alpha) + b[1] * alpha).toFixed(4)),
    Number((a[2] * (1 - alpha) + b[2] * alpha).toFixed(4)),
    Number((a[3] * (1 - alpha) + b[3] * alpha).toFixed(4)),
  ];
}

function labelsMatchVlmAndSsd(vlmLabel, ssdClass) {
  const norm = normalizeLabel(vlmLabel);
  const ssdNorm = normalizeLabel(ssdClass);
  if (norm === ssdNorm || norm.includes(ssdNorm) || ssdNorm.includes(norm)) return true;
  const aliases = COCO_VLM_ALIASES[ssdClass] || [];
  return aliases.some(alias => {
    const a = normalizeLabel(alias);
    return norm.includes(a) || a.includes(norm);
  });
}

function vlmLabelHasCocoAlias(label) {
  const norm = String(label || '').trim().toLowerCase();
  if (!norm) return false;
  return Object.values(COCO_VLM_ALIASES).some(aliases =>
    aliases.some(alias => norm.includes(alias) || alias.includes(norm))
  );
}

function refineBboxWithSsd(bboxNorm, label, ssdDetections) {
  if (!bboxNorm || !ssdDetections?.length) {
    return { bboxNorm, validation: 'unmatched', ssdMatch: null };
  }
  let best = null;
  ssdDetections.forEach(det => {
    if (!labelsMatchVlmAndSsd(label, det.class)) return;
    const iou = bboxIoU(bboxNorm, det.bboxNorm);
    if (!best || iou > best.iou) best = { ...det, iou };
  });
  if (!best || best.iou < 0.1) {
    return { bboxNorm, validation: 'unmatched', ssdMatch: best };
  }
  const refined = best.iou >= 0.25 ? best.bboxNorm : blendBboxes(bboxNorm, best.bboxNorm, 0.45);
  return {
    bboxNorm: normalizeObjectBboxNorm(refined) || bboxNorm,
    validation: best.iou >= 0.25 ? 'confirmed' : 'uncertain',
    ssdMatch: { class: best.class, score: Number(best.score.toFixed(3)), iou: Number(best.iou.toFixed(3)) },
  };
}

async function detectObjectsOnImage(img) {
  if (!state.ssd?.model || !img?.width) return [];
  try {
    const predictions = await state.ssd.model.detect(img);
    return predictions
      .filter(item => item.score >= 0.32)
      .map(item => ({
        class: item.class,
        score: item.score,
        bboxNorm: normalizeObjectBboxNorm([
          item.bbox[0] / img.width,
          item.bbox[1] / img.height,
          item.bbox[2] / img.width,
          item.bbox[3] / img.height,
        ]),
      }))
      .filter(item => item.bboxNorm);
  } catch {
    return [];
  }
}

function bboxNormToArray(bbox) {
  if (!bbox) return null;
  if (Array.isArray(bbox)) return normalizeObjectBboxNorm(bbox);
  if (bbox.w != null) return normalizeObjectBboxNorm([bbox.x, bbox.y, bbox.w, bbox.h]);
  return null;
}

function bboxNormFromArray(arr) {
  if (!arr) return null;
  return { x: arr[0], y: arr[1], w: arr[2], h: arr[3] };
}

function assessFaceCropQualityFromBbox(bboxNorm) {
  const arr = bboxNormToArray(bboxNorm);
  if (!arr) return { quality: 'no_face', reason: 'no_bbox' };
  const area = arr[2] * arr[3];
  if (area < 0.0064) return { quality: 'poor', reason: 'face_too_small' };
  if (area > 0.4225) return { quality: 'poor', reason: 'face_too_large' };
  return { quality: area < 0.02 ? 'ok' : 'good', reason: 'insightface_bbox' };
}

function mergeInsightFaceIntoTracks(trackedFaces, ifDetections) {
  if (!ifDetections?.length) {
    return trackedFaces.map(face => ({ ...face, source: face.source || 'mediapipe' }));
  }
  const merged = trackedFaces.map(face => ({ ...face, source: 'mediapipe' }));
  const usedIf = new Set();
  merged.forEach(face => {
    const arr = bboxNormToArray(face.bboxNorm);
    if (!arr) return;
    let bestIou = 0;
    let bestIdx = -1;
    ifDetections.forEach((det, idx) => {
      const iou = bboxIoU(arr, bboxNormToArray(det.bboxNorm));
      if (iou > bestIou) {
        bestIou = iou;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0 && bestIou >= 0.18) {
      usedIf.add(bestIdx);
      face.source = 'fused';
      face.ifDetScore = ifDetections[bestIdx].detScore;
      if (bestIou >= 0.32) {
        face.bboxNorm = bboxNormFromArray(bboxNormToArray(ifDetections[bestIdx].bboxNorm));
        const q = assessFaceCropQualityFromBbox(face.bboxNorm);
        face.cropQuality = q.quality;
        face.cropReason = q.reason;
      }
    }
  });
  ifDetections.forEach((det, idx) => {
    if (usedIf.has(idx)) return;
    const arr = bboxNormToArray(det.bboxNorm);
    if (!arr) return;
    const q = assessFaceCropQualityFromBbox(arr);
    merged.push({
      id: `if_sup_${idx}`,
      index: merged.length,
      landmarks: null,
      blendshapes: [],
      bboxNorm: bboxNormFromArray(arr),
      cropQuality: q.quality,
      cropReason: q.reason,
      source: 'insightface',
      ifDetScore: det.detScore,
    });
  });
  return merged.slice(0, MAX_FACES);
}

function faceBoxPixels(face, canvas) {
  if (face.landmarks?.length) {
    return {
      left: Math.min(...face.landmarks.map(point => point.x)) * canvas.width,
      right: Math.max(...face.landmarks.map(point => point.x)) * canvas.width,
      top: Math.min(...face.landmarks.map(point => point.y)) * canvas.height,
      bottom: Math.max(...face.landmarks.map(point => point.y)) * canvas.height,
    };
  }
  const arr = bboxNormToArray(face.bboxNorm);
  if (!arr) return null;
  return {
    left: arr[0] * canvas.width,
    top: arr[1] * canvas.height,
    right: (arr[0] + arr[2]) * canvas.width,
    bottom: (arr[1] + arr[3]) * canvas.height,
  };
}

async function loadCocoSsd() {
  if (state.ssd?.ready || state.ssd?.loading) return;
  state.ssd = { ...state.ssd, loading: true };
  try {
    if (typeof cocoSsd === 'undefined') throw new Error('coco-ssd script not loaded');
    const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    state.ssd = { model, ready: true, loading: false, detections: [], lastAt: 0 };
    addEvent('SSD ready', 'COCO-SSD 已加载，用于校验/修正 VLM 物体 bbox。');
  } catch (error) {
    state.ssd = { model: null, ready: false, loading: false, error: error.message, detections: [], lastAt: 0 };
    addEvent('SSD 未加载', error.message);
  }
}

async function sampleSsdOnVideo() {
  if (!state.ssd?.ready || !state.started || elements.video.readyState < 2) return;
  if (Date.now() - (state.ssd.lastAt || 0) < 2500) return;
  try {
    const predictions = await state.ssd.model.detect(elements.video);
    const vw = elements.video.videoWidth || 1;
    const vh = elements.video.videoHeight || 1;
    state.ssd.detections = predictions
      .filter(item => item.score >= 0.4)
      .slice(0, 12)
      .map(item => ({
        class: item.class,
        score: item.score,
        bboxNorm: normalizeObjectBboxNorm([
          item.bbox[0] / vw,
          item.bbox[1] / vh,
          item.bbox[2] / vw,
          item.bbox[3] / vh,
        ]),
      }))
      .filter(item => item.bboxNorm);
    state.ssd.lastAt = Date.now();
  } catch {
    // non-blocking
  }
}

function scoreCropCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  if (width < 4 || height < 4) return 0;
  const data = ctx.getImageData(0, 0, width, height).data;
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < data.length; i += 16) {
    const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
    sum += v;
    sumSq += v * v;
  }
  const n = data.length / 16;
  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean * mean);
  if (variance < 120) return 0.12;
  if (mean < 8 || mean > 248) return 0.18;
  let score = Math.min(1, variance / 1800);
  if (width * height < 400) score *= 0.72;
  return Number(score.toFixed(4));
}

async function pickBestObjectThumbnail(object, frames) {
  const baseBbox = normalizeObjectBboxNorm(object.bboxNorm);
  if (!baseBbox || !frames?.length) {
    return {
      thumbnail: '',
      bboxNorm: baseBbox,
      frameIndex: object.frameIndex || 3,
      meta: null,
      bboxQuality: assessObjectBboxQuality(baseBbox),
    };
  }
  const preferredIndex = Math.min(frames.length, Math.max(1, object.frameIndex || 3)) - 1;
  const indices = [...new Set([preferredIndex, 0, 1, 2].filter(i => i >= 0 && i < frames.length))];
  const variants = [
    { bbox: baseBbox, label: 'raw' },
    { bbox: expandObjectBboxNorm(baseBbox, 0.1), label: 'pad10' },
    { bbox: expandObjectBboxNorm(baseBbox, 0.18), label: 'pad18' },
  ];
  let best = {
    score: 0,
    thumbnail: '',
    bboxNorm: baseBbox,
    frameIndex: preferredIndex + 1,
    meta: null,
  };
  for (const frameIdx of indices) {
    const frame = frames[frameIdx];
    if (!frame?.image) continue;
    let img;
    try {
      img = await loadImageElement(frame.image);
    } catch {
      continue;
    }
    for (const variant of variants) {
      const quality = assessObjectBboxQuality(variant.bbox);
      if (quality.score < 0.12) continue;
      const ssdDetections = await detectObjectsOnImage(img);
      const refined = refineBboxWithSsd(variant.bbox, object.label, ssdDetections);
      if (state.ssd?.ready && vlmLabelHasCocoAlias(object.label) && refined.validation !== 'confirmed') {
        continue;
      }
      const bbox = refined.bboxNorm;
      const thumb = cropImage(img, bbox, 120);
      if (!thumb) continue;
      let cropScore = 0.38;
      try {
        const tempImg = await loadImageElement(thumb);
        const canvas = document.createElement('canvas');
        canvas.width = tempImg.width;
        canvas.height = tempImg.height;
        canvas.getContext('2d').drawImage(tempImg, 0, 0);
        cropScore = scoreCropCanvas(canvas);
      } catch {
        cropScore = 0.35;
      }
      const frameBonus = frameIdx === preferredIndex ? 0.08 : 0;
      const ssdBonus = refined.validation === 'confirmed' ? 0.12 : refined.validation === 'uncertain' ? 0.04 : 0;
      const total = cropScore * 0.62 + quality.score * 0.24 + frameBonus + ssdBonus;
      if (total > best.score) {
        best = {
          score: total,
          thumbnail: thumb,
          bboxNorm: bbox,
          frameIndex: frameIdx + 1,
          meta: {
            score: Number(total.toFixed(4)),
            cropScore,
            bboxQuality: quality,
            variant: variant.label,
            frameIndex: frameIdx + 1,
            ssd: refined.ssdMatch,
            validation: refined.validation,
          },
        };
      }
    }
  }
  return {
    thumbnail: best.thumbnail,
    bboxNorm: best.bboxNorm,
    frameIndex: best.frameIndex,
    meta: best.meta,
    bboxQuality: best.meta?.bboxQuality || assessObjectBboxQuality(baseBbox),
  };
}

// 从发送给 VLM 的帧按归一化 bbox 裁剪缩略图（同步降级路径）。
function captureRegionThumbnail(bboxNorm, maxEdge = 96) {
  if (!bboxNorm || !state.started) return '';
  const normalized = normalizeObjectBboxNorm(bboxNorm);
  if (!normalized) return '';
  const frames = state.sceneFramesForThumbnail || [];
  if (frames.length > 0) {
    const lastFrame = frames[frames.length - 1];
    if (lastFrame?.image) {
      return captureFromImageDataUrlSync(lastFrame.image, normalized, maxEdge);
    }
  }
  const vw = elements.video.videoWidth;
  const vh = elements.video.videoHeight;
  if (!vw || !vh) return '';
  return cropImageFromVideo(normalized, maxEdge);
}

function cropImageFromVideo(bboxNorm, maxEdge = 96) {
  const vw = elements.video.videoWidth;
  const vh = elements.video.videoHeight;
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

// 同步从 data URL 图像中裁剪指定区域（使用 OffscreenCanvas 或同步解析）
function captureFromImageDataUrlSync(imageDataUrl, bboxNorm, maxEdge = 96) {
  try {
    // 解码 base64 图像数据
    const match = imageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return '';
    
    const mimeType = match[1];
    const base64Data = match[2];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // 创建 image blob 并同步处理
    const blob = new Blob([binaryData], { type: `image/${mimeType}` });
    const url = URL.createObjectURL(blob);
    
    // 使用同步方式加载图片（通过创建一个隐藏的 img 元素）
    const img = document.createElement('img');
    img.src = url;
    
    // 尝试同步等待图片加载（对于已缓存的数据 URL 应该很快）
    if (img.complete) {
      URL.revokeObjectURL(url);
      return cropImage(img, bboxNorm, maxEdge);
    }
    
    // 如果图片还没加载完成，返回空（稍后会在异步回调中补全）
    URL.revokeObjectURL(url);
    return '';
  } catch {
    return '';
  }
}

// 从 img 元素裁剪指定区域（bbox 为 [x,y,w,h] 归一化坐标）
function cropImage(img, bboxNorm, maxEdge = 96) {
  const normalized = normalizeObjectBboxNorm(bboxNorm);
  if (!normalized) return '';
  const sx = Math.round(normalized[0] * img.width);
  const sy = Math.round(normalized[1] * img.height);
  const sw = Math.max(8, Math.round(normalized[2] * img.width));
  const sh = Math.max(8, Math.round(normalized[3] * img.height));
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.5);
}

function loadImageElement(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function captureRegionThumbnailFromFrame(imageDataUrl, bboxNorm, maxEdge = 120) {
  if (!imageDataUrl || !bboxNorm) return '';
  try {
    const img = await loadImageElement(imageDataUrl);
    return cropImage(img, bboxNorm, maxEdge);
  } catch {
    return '';
  }
}

async function attachSceneObjectThumbnails(objects, frames) {
  let accepted = 0;
  let rejected = 0;
  const result = await Promise.all(objects.map(async object => {
    const normalizedBbox = normalizeObjectBboxNorm(object.bboxNorm);
    const prepared = { ...object, bboxNorm: normalizedBbox };
    const picked = await pickBestObjectThumbnail(prepared, frames);
    const cocoGated = state.ssd?.ready && vlmLabelHasCocoAlias(prepared.label);
    const minScore = cocoGated ? 0.28 : 0.22;
    const ok = (picked.meta?.score || 0) >= minScore
      && (!cocoGated || picked.meta?.validation === 'confirmed');
    if (ok) accepted += 1;
    else rejected += 1;
    return {
      ...prepared,
      bboxNorm: picked.bboxNorm || normalizedBbox,
      frameIndex: picked.frameIndex || prepared.frameIndex || 3,
      thumbnail: ok ? picked.thumbnail : '',
      thumbnailMeta: picked.meta,
      bboxQuality: picked.bboxQuality || assessObjectBboxQuality(normalizedBbox),
    };
  }));
  if (accepted || rejected) {
    state.vlmCropStats = {
      accepted: (state.vlmCropStats?.accepted || 0) + accepted,
      rejected: (state.vlmCropStats?.rejected || 0) + rejected,
      lastAt: Date.now(),
    };
  }
  return result;
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
    state.emotion.faceReady = Boolean(data.faceEmotionReady);
    state.emotion.voiceReady = Boolean(data.voiceEmotionReady);
    state.emotion.faceModel = data.emotionFaceModel || '';
    state.emotion.voiceModel = data.emotionVoiceModel || '';
    state.diarization.ready = Boolean(data.diarizationReady);
    state.diarization.backendDetail = data.diarizationDetail || '';
    if (data.emotionFusion) state.emotion.fusion = data.emotionFusion;
    if (data.serProviderLabel) state.emotion.serProviderLabel = data.serProviderLabel;
    state.yoloFaceReady = Boolean(data.yoloFaceReady);
    state.faceDetectorMode = data.faceDetectorMode || 'insightface';
    state.persistentWorkerReady = Boolean(data.persistentWorkerReady);
    renderServerStatus(data);
    renderDiarization();
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
  if (health.diarizationReady) {
    parts.push('pyannote 3.1 就绪');
  } else {
    parts.push(`音轨：${health.diarizationDetail || 'pyannote 未配置'}`);
  }
  if (health.yoloFaceReady) {
    parts.push(`YOLO-face 就绪 (${health.faceDetectorMode || 'both'})`);
  } else if (health.faceDetectorMode && health.faceDetectorMode !== 'insightface') {
    parts.push(`人脸检测 ${health.faceDetectorMode}（YOLO 未就绪）`);
  }
  if (health.persistentWorkerReady) {
    parts.push('Python 常驻 worker');
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
    setTimeout(() => {
      loadFaceLandmarker();
      loadPoseLandmarker();
      loadHandLandmarker();
      loadCocoSsd();
    }, 300);
    renderObjectHud();
    requestAnimationFrame(analyzeVideo);
    setInterval(updateReasoning, 1200);
    setInterval(sampleSceneFrame, 2200);
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
  renderObjectHud();
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
    // 保存发送给 VLM 的帧，用于后续裁剪缩略图（避免帧不匹配问题）
    state.sceneFramesForThumbnail = frames;
    await mergeSceneMemory(state.scene, frames);
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
    renderObjectHud();
  }
}

async function mergeSceneMemory(scene, frames = state.sceneFramesForThumbnail) {
  const person = activePerson();
  const ownerId = person?.id || 'unknown_person';
  const ownerName = person?.name || '未知用户';
  const now = new Date().toISOString();
  const objectsRaw = Array.isArray(scene.objects) ? scene.objects.map(normalizeSceneObjectInput).filter(Boolean) : [];
  const objects = await attachSceneObjectThumbnails(objectsRaw, frames);
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
  renderObjectHud();
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
      bboxNorm: normalizeObjectBboxNorm(value.bbox_norm || value.bboxNorm),
      frameIndex: Math.min(3, Math.max(1, Number(value.frame_index || value.frameIndex || value.frame || 3) || 3)),
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
      frameIndex: input.frameIndex || 3,
      thumbnail: '',
      thumbnailMeta: input.thumbnailMeta || null,
      bboxQuality: input.bboxQuality || assessObjectBboxQuality(input.bboxNorm),
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
  if (input.bboxNorm) object.bboxNorm = normalizeObjectBboxNorm(input.bboxNorm) || input.bboxNorm;
  if (input.frameIndex) object.frameIndex = input.frameIndex;
  if (input.bboxQuality) object.bboxQuality = input.bboxQuality;
  if (input.thumbnail && input.thumbnailMeta) {
    const prevScore = object.thumbnailMeta?.score || 0;
    const newScore = input.thumbnailMeta.score || 0;
    if (!object.thumbnail || newScore >= prevScore) {
      object.thumbnail = input.thumbnail;
      object.thumbnailMeta = input.thumbnailMeta;
    }
  } else if (input.thumbnail && !object.thumbnail) {
    object.thumbnail = input.thumbnail;
  }
  if (!object.thumbnail && object.bboxNorm && (object.bboxQuality?.score || 0) >= 0.5) {
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
        <span class="graph-object-meta">×${object.seenCount} · frame ${object.frameIndex || 3} · bbox ${object.bboxQuality?.quality || 'unknown'}${object.thumbnailMeta ? ` · crop ${object.thumbnailMeta.score}` : ''} · ${object.status === 'gone' ? '已离开' : '在场'}</span>
        ${object.thumbnailMeta ? `<span class="graph-object-debug">裁剪: f${object.thumbnailMeta.frameIndex} ${object.thumbnailMeta.variant}${object.thumbnailMeta.validation ? ` · SSD ${object.thumbnailMeta.validation}` : ''}${object.thumbnailMeta.ssd ? ` · ${object.thumbnailMeta.ssd.class} IoU ${object.thumbnailMeta.ssd.iou}` : ''}</span>` : (object.bboxQuality?.quality === 'poor' ? '<span class="graph-object-debug warn">bbox 不可信，未保存缩略图</span>' : '')}
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
  canvas.width = 640;
  canvas.height = Math.round(640 * (elements.video.videoHeight || 9) / (elements.video.videoWidth || 16));
  const context = canvas.getContext('2d');
  context.drawImage(elements.video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.68);
}

function renderScene() {
  if (!state.scene) {
    elements.sceneStatus.textContent = state.started ? '等待第一次 VLM 场景理解' : '等待摄像头启动';
    elements.sceneSummary.innerHTML = '';
    renderObjectHud();
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
  renderObjectHud();
}

function renderObjectHud() {
  if (!elements.objectHud) return;
  const objects = recentSceneObjects().slice(0, 6);
  if (!state.started) {
    elements.objectHud.innerHTML = '<strong>VLM 物体</strong><span>等待摄像头启动</span>';
    return;
  }
  if (state.sceneBusy) {
    elements.objectHud.innerHTML = '<strong>VLM 物体</strong><span>正在理解当前画面...</span>';
    return;
  }
  if (!objects.length) {
    const ssdTag = state.ssd?.ready ? ' · SSD 就绪' : (state.ssd?.loading ? ' · SSD 加载中' : '');
    elements.objectHud.innerHTML = `<strong>VLM 物体</strong><span>等待低频识别结果${ssdTag}</span>`;
    return;
  }
  const cropTag = state.vlmCropStats?.rejected
    ? ` · SSD拒 ${state.vlmCropStats.rejected}/${(state.vlmCropStats.accepted || 0) + state.vlmCropStats.rejected}`
    : (state.ssd?.ready ? ' · SSD grounding' : '');
  elements.objectHud.innerHTML = `
    <strong>VLM 物体 · ${objects.length}${state.ssd?.ready ? ' · SSD on' : ''}${cropTag}</strong>
    <ul>${objects.map(object => `
      <li>
        ${object.thumbnail ? `<img src="${object.thumbnail}" alt="${escapeHtml(object.label)}" />` : '<i></i>'}
        <span>${escapeHtml(object.label)}${object.thumbnailMeta?.validation ? ` · ${object.thumbnailMeta.validation}` : ''}</span>
      </li>
    `).join('')}</ul>
  `;
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
      numFaces: MAX_FACES,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
    state.faceModelReady = true;
    elements.faceHud.textContent = 'Face model: ready · waiting for face';
    addEvent('Face model ready', `MediaPipe Face Landmarker 已加载：最多 ${MAX_FACES} 张脸 + blendshapes/头部姿态。`);
  } catch (error) {
    state.faceModelError = error.message;
    elements.faceHud.textContent = `Face model failed: ${error.message}`;
    addEvent('Face model failed', `无法加载 MediaPipe Face，降级为粗略视频线索：${error.message}`);
  }
}

async function loadPoseLandmarker() {
  if (state.poseLandmarker || state.poseModelReady) return;
  try {
    const vision = await importVisionBundle();
    const resolver = await createVisionResolver(vision);
    state.poseLandmarker = await vision.PoseLandmarker.createFromOptions(resolver, {
      baseOptions: {
        modelAssetPath: await resolvePoseModelPath(),
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
    state.poseModelReady = true;
    addEvent('Pose model ready', 'MediaPipe Pose 已加载：镜头中将显示躯干骨架。');
  } catch (error) {
    state.poseModelError = error.message;
    addEvent('Pose model failed', `无法加载 Pose Landmarker：${error.message}`);
  }
}

async function resolvePoseModelPath() {
  const paths = [
    '/vendor/mediapipe/models/pose_landmarker_lite.task',
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
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

async function loadHandLandmarker() {
  if (state.handLandmarker || state.handModelReady) return;
  const vision = await importVisionBundle();
  const resolver = await createVisionResolver(vision);
  const modelPath = await resolveHandModelPath();
  const handOptions = {
    baseOptions: { modelAssetPath: modelPath, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.35,
    minHandPresenceConfidence: 0.35,
    minTrackingConfidence: 0.35,
  };
  for (const delegate of ['GPU', 'CPU']) {
    try {
      handOptions.baseOptions.delegate = delegate;
      state.handLandmarker = await vision.HandLandmarker.createFromOptions(resolver, handOptions);
      state.handModelReady = true;
      addEvent('Hand model ready', `MediaPipe Hands 已加载（${delegate}）：可识别 👍 / ✌️ / OK 手势。`);
      return;
    } catch {
      // try CPU fallback
    }
  }
  addEvent('Hand model failed', '无法加载 Hand Landmarker。');
}

async function resolveHandModelPath() {
  const paths = [
    '/vendor/mediapipe/models/hand_landmarker.task',
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
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
  if (!state.emotion._voiceTimer) {
    state.emotion._voiceTimer = setInterval(updateVoiceEmotion, 6000);
  }
  if (!state.diarization._timer) {
    state.diarization._timer = setInterval(updatePyannoteDiarization, 10000);
  }
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
  sampleSsdOnVideo();
  supplementInsightFaceDetections();

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
  if (elements.video.readyState < 2) {
    drawPerceptionOverlay([], null);
    return;
  }

  let poseLandmarks = null;
  if (state.poseLandmarker) {
    try {
      const poseResult = state.poseLandmarker.detectForVideo(elements.video, performance.now());
      poseLandmarks = poseResult.landmarks?.[0] || null;
    } catch {
      poseLandmarks = null;
    }
  }
  state.poseLandmarks = poseLandmarks;

  if (state.handLandmarker) {
    try {
      const handResult = state.handLandmarker.detectForVideo(elements.video, performance.now());
      state.handLandmarks = handResult.landmarks || [];
      state.gestures = state.handLandmarks.map((landmarks, index) => {
        const gesture = detectHandGesture(landmarks);
        return gesture ? { ...gesture, handIndex: index, landmarks } : null;
      }).filter(Boolean);
    } catch {
      state.handLandmarks = [];
      state.gestures = [];
    }
  }

  if (!state.faceLandmarker) {
    drawPerceptionOverlay([], poseLandmarks);
    return;
  }

  const result = state.faceLandmarker.detectForVideo(elements.video, performance.now());
  const rawFaces = (result.faceLandmarks || []).slice(0, MAX_FACES).map((landmarks, index) => {
    const bboxNorm = computeFaceBboxNorm(landmarks);
    return {
      landmarks,
      blendshapes: result.faceBlendshapes?.[index]?.categories || [],
      centerX: landmarks.reduce((sum, point) => sum + point.x, 0) / landmarks.length,
      area: bboxNorm ? bboxNorm.w * bboxNorm.h : 0,
    };
  }).sort((a, b) => a.centerX - b.centerX);

  state.trackedFaces = assignMultiFaceTracks(
    mergeInsightFaceIntoTracks(
      rawFaces.map((face, index) => {
        const bboxNorm = computeFaceBboxNorm(face.landmarks);
        const cropQuality = assessFaceCropQuality(bboxNorm);
        return {
          id: `face_${index}`,
          index,
          landmarks: face.landmarks,
          blendshapes: face.blendshapes,
          bboxNorm,
          cropQuality: cropQuality.quality,
          cropReason: cropQuality.reason,
        };
      }),
      state.insightfaceDetections,
    ),
  );

  const primary = [...state.trackedFaces].sort((a, b) => {
    const areaA = (a.bboxNorm?.w || 0) * (a.bboxNorm?.h || 0);
    const areaB = (b.bboxNorm?.w || 0) * (b.bboxNorm?.h || 0);
    return areaB - areaA;
  })[0] || null;

  state.facePresent = Boolean(primary);
  state.primaryFaceId = primary?.id || '';
  state.faceLandmarkCount = primary?.landmarks?.length || 0;

  if (!primary) {
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
    drawPerceptionOverlay([], poseLandmarks);
    renderBlendshapes();
    matchActivePersonLocalFallback();
    return;
  }

  state.lastFaceAt = Date.now();
  applyPrimaryFaceMetrics(primary);
  matchAllTrackedFaces();
  updateMultiFaceEmotion();

  drawPerceptionOverlay(state.trackedFaces, poseLandmarks, state.gestures);
  renderBlendshapes();
}

function faceCenterNorm(face) {
  if (face.landmarks?.length) {
    return {
      cx: face.landmarks.reduce((sum, point) => sum + point.x, 0) / face.landmarks.length,
      cy: face.landmarks.reduce((sum, point) => sum + point.y, 0) / face.landmarks.length,
    };
  }
  const arr = bboxNormToArray(face.bboxNorm);
  if (!arr) return { cx: 0.5, cy: 0.5 };
  return { cx: arr[0] + arr[2] / 2, cy: arr[1] + arr[3] / 2 };
}

function assignMultiFaceTracks(faces) {
  const prev = state.faceTrackPool || [];
  const used = new Set();
  const TRACK_IOU = 0.12;
  const MAX_LOST = 12;

  const next = faces.map(face => {
    const { cx, cy } = faceCenterNorm(face);
    const arr = bboxNormToArray(face.bboxNorm);
    let best = null;
    let bestScore = 0;
    prev.forEach(track => {
      if (used.has(track.id)) return;
      let score = 0;
      if (arr && track.bbox) {
        const iou = bboxIoU(arr, track.bbox);
        if (iou >= TRACK_IOU) score = iou + (track.hits || 0) * 0.02;
      }
      const dist = Math.hypot(track.cx - cx, track.cy - cy);
      if (dist < 0.16) score = Math.max(score, 0.18 - dist * 0.7 + (track.hits || 0) * 0.015);
      if (score > bestScore) {
        bestScore = score;
        best = track;
      }
    });
    const trackId = bestScore >= TRACK_IOU && best
      ? best.id
      : `track_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 6)}`;
    used.add(trackId);
    const hits = best && trackId === best.id ? (best.hits || 0) + 1 : 1;
    return { ...face, trackId, cx, cy, trackHits: hits, trackLost: 0 };
  });

  const pool = next.map(item => ({
    id: item.trackId,
    cx: item.cx,
    cy: item.cy,
    bbox: bboxNormToArray(item.bboxNorm),
    hits: item.trackHits,
    lost: 0,
  }));
  prev.forEach(track => {
    if (used.has(track.id)) return;
    const lost = (track.lost || 0) + 1;
    if (lost <= MAX_LOST) pool.push({ ...track, lost });
  });
  state.faceTrackPool = pool.slice(0, MAX_FACES * 3);
  state.faceTracks = next.map(item => ({ id: item.trackId, cx: item.cx, cy: item.cy, bbox: bboxNormToArray(item.bboxNorm) }));
  return next;
}

function handDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
}

function isFingerExtended(landmarks, tipIdx, pipIdx, mcpIdx, wrist) {
  const tip = landmarks[tipIdx];
  const pip = landmarks[pipIdx];
  const mcp = landmarks[mcpIdx];
  const tipWrist = handDistance(tip, wrist);
  const pipWrist = handDistance(pip, wrist);
  const tipMcp = handDistance(tip, mcp);
  const pipMcp = handDistance(pip, mcp);
  if (tipWrist > pipWrist * 1.03) return true;
  if (tipMcp > pipMcp * 0.9 && tipWrist >= pipWrist * 0.96) return true;
  if (Math.abs(tip.y - pip.y) > 0.012 && tipMcp > pipMcp * 0.72) return true;
  return false;
}

function isFingerCurled(landmarks, tipIdx, pipIdx, mcpIdx, wrist) {
  if (!isFingerExtended(landmarks, tipIdx, pipIdx, mcpIdx, wrist)) return true;
  const tip = landmarks[tipIdx];
  const pip = landmarks[pipIdx];
  const mcp = landmarks[mcpIdx];
  return handDistance(tip, pip) < handDistance(pip, mcp) * 0.68;
}

const HAND_BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

function detectScissorsGesture(landmarks, wrist) {
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const thumbTip = landmarks[4];
  const palmCenter = landmarks[9];

  if (handDistance(thumbTip, indexTip) < 0.045) return null;

  const tipSpread = handDistance(indexTip, middleTip);
  const pipSpread = handDistance(landmarks[6], landmarks[10]);
  const spread = Math.max(tipSpread, pipSpread * 0.85);
  if (spread < 0.006) return null;

  const reach = {
    index: handDistance(indexTip, wrist),
    middle: handDistance(middleTip, wrist),
    ring: handDistance(ringTip, wrist),
    pinky: handDistance(pinkyTip, wrist),
    thumb: handDistance(thumbTip, wrist),
  };
  const maxV = Math.max(reach.index, reach.middle);
  const minCurled = Math.min(reach.ring, reach.pinky);
  if (reach.index < reach.ring * 1.008 || reach.middle < reach.ring * 1.008) return null;
  if (reach.ring > maxV * 0.9 || reach.pinky > maxV * 0.9) return null;
  if (reach.thumb > maxV * 1.06 && reach.index < reach.thumb * 0.9) return null;

  const idxFromPalm = handDistance(indexTip, palmCenter);
  const midFromPalm = handDistance(middleTip, palmCenter);
  const ringFromPalm = handDistance(ringTip, palmCenter);
  const palmV = idxFromPalm > ringFromPalm * 1.05 && midFromPalm > ringFromPalm * 1.05;

  const zIdx = indexTip.z ?? 0;
  const zMid = middleTip.z ?? 0;
  const zRing = ringTip.z ?? 0;
  const palmFacing = zIdx < zRing + 0.025 && zMid < zRing + 0.025;

  const classic = isFingerExtended(landmarks, 8, 6, 5, wrist)
    && isFingerExtended(landmarks, 12, 10, 9, wrist)
    && isFingerCurled(landmarks, 16, 14, 13, wrist)
    && isFingerCurled(landmarks, 20, 18, 17, wrist);

  const palmMode = palmFacing && palmV && spread > 0.005;
  const reachMode = (maxV - minCurled) > 0.012 && spread > 0.008 && palmV;

  if (!classic && !palmMode && !reachMode) return null;

  const conf = Math.min(0.95, 0.6 + spread * 2.4 + (palmFacing ? 0.12 : 0) + (maxV - minCurled) * 0.4);
  return { name: '✌️', confidence: Number(conf.toFixed(2)) };
}

function detectHandGesture(landmarks) {
  if (!landmarks?.length || landmarks.length < 21) return null;
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];

  const okDist = handDistance(thumbTip, indexTip);
  if (okDist < 0.045) {
    return { name: 'OK', confidence: Number((1 - okDist / 0.045).toFixed(2)) };
  }

  const scissors = detectScissorsGesture(landmarks, wrist);
  if (scissors) return scissors;

  const thumbExtended = handDistance(thumbTip, wrist) > handDistance(landmarks[3], wrist) * 1.08;
  const fingerDefs = [[8, 6, 5], [12, 10, 9], [16, 14, 13], [20, 18, 17]];
  const othersCurled = fingerDefs.every(([tip, pip, mcp]) => isFingerCurled(landmarks, tip, pip, mcp, wrist));
  if (thumbExtended && othersCurled) {
    return { name: '👍', confidence: 0.84 };
  }

  return null;
}

function applyPrimaryFaceMetrics(face) {
  if (!face.landmarks?.length) {
    applyPrimaryFaceMetricsFromBbox(face);
    return;
  }
  const { landmarks, blendshapes } = face;
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
  state.faceBlendshapes = blendshapes;
  state.faceDescriptor = buildFaceDescriptor(landmarks, blendshapes);
  state.lastFaceLandmarks = landmarks;
  state.lastFaceBboxNorm = face.bboxNorm;
  state.lastFaceCropQuality = face.cropQuality;
  state.lastFaceCropReason = face.cropReason;
}

function applyPrimaryFaceMetricsFromBbox(face) {
  state.faceBlendshapes = [];
  state.lastFaceLandmarks = null;
  state.lastFaceBboxNorm = face.bboxNorm;
  state.lastFaceCropQuality = face.cropQuality;
  state.lastFaceCropReason = face.cropReason;
  state.gaze = clamp(state.gaze * 0.92);
  state.smile = clamp(state.smile * 0.9);
  state.brow = clamp(state.brow * 0.9);
  state.eye = clamp(state.eye * 0.94);
  state.mouth = clamp(state.mouth * 0.9);
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

async function matchAllTrackedFaces() {
  if (!state.people.length) {
    state.faceMatch = { personId: '', score: 0, provider: '', candidates: [] };
    state.multiFaceMatches = {};
    resolveActiveIdentity();
    renderPeople();
    return;
  }

  const now = Date.now();
  if (now - state.lastFaceMatchAt < 2000) {
    resolveActiveIdentity();
    return;
  }

  const goodFaces = state.trackedFaces.filter(face => {
    if (face.cropQuality === 'good' || face.cropQuality === 'ok') return true;
    return face.source === 'insightface' && (face.ifDetScore || 0) >= 0.5;
  });
  if (!goodFaces.length) {
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

  const crops = goodFaces.map(face => ({
    faceId: face.trackId || face.id,
    faceCrop: captureFaceCropFromBbox(face.bboxNorm, { forEnroll: true }),
  })).filter(item => item.faceCrop);

  if (!crops.length) {
    state.faceMatchInFlight = false;
    matchActivePersonLocalFallback();
    return;
  }

  try {
    const response = await fetch('/api/identity/face/match-multi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        crops,
        candidates,
        threshold: state.faceMatchThreshold,
      }),
    });
    const data = await response.json();
    if (!data.ok) {
      addEvent('多人脸匹配降级', `${data.error || 'not_ready'} · ${data.detail || ''}`);
      matchActivePersonLocalFallback();
      return;
    }
    const results = Array.isArray(data.results) ? data.results : [];
    state.multiFaceMatches = {};
    results.forEach(item => {
      if (!item.faceId) return;
      state.multiFaceMatches[item.faceId] = {
        personId: item.matched ? item.personId : '',
        score: item.score || 0,
        provider: data.provider || 'insightface_arcface',
        candidates: item.matches || [],
      };
    });
    const primary = state.trackedFaces.find(face => face.id === state.primaryFaceId);
    const primaryKey = primary?.trackId || primary?.id;
    const primaryMatch = primaryKey ? state.multiFaceMatches[primaryKey] : null;
    state.faceMatch = {
      personId: primaryMatch?.personId || '',
      score: primaryMatch?.score || 0,
      provider: data.provider || 'insightface_arcface',
      detScore: data.detScore,
      candidates: primaryMatch?.candidates || [],
    };
  } catch (error) {
    addEvent('多人脸匹配失败', `使用 MediaPipe fallback：${error.message}`);
    matchActivePersonLocalFallback();
    return;
  } finally {
    state.faceMatchInFlight = false;
  }
  resolveActiveIdentity();
  renderPeople();
}

async function matchActivePerson() {
  return matchAllTrackedFaces();
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

function drawPerceptionOverlay(faces, poseLandmarks, gestures = []) {
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

  if (poseLandmarks?.length) {
    drawPoseSkeleton(context, canvas, poseLandmarks);
  }
  if (state.handLandmarks?.length) {
    drawHandSkeleton(context, canvas, state.handLandmarks);
  }
  if (gestures?.length) {
    drawGestureLabels(context, canvas, gestures);
  }
  if (state.debug?.ssdOverlay && state.ssd?.detections?.length) {
    drawSsdOverlay(context, canvas, state.ssd.detections);
  }
  if (state.debug?.insightfaceOverlay && state.insightfaceDetections?.length) {
    drawInsightfaceOverlay(context, canvas, state.insightfaceDetections);
  }

  if (!faces?.length) {
    const objCount = recentSceneObjects().length;
    const poseTag = state.poseModelReady ? ' · pose on' : '';
    const handTag = state.gestures.length ? ` · ${state.gestures.map(g => g.name).join('/')}` : '';
    const diaTag = state.diarization.segments.length
      ? ` · pyannote ${state.diarization.segments.length} seg`
      : '';
    elements.faceHud.textContent = state.faceModelReady
      ? (objCount ? `Face: no face · ${objCount} VLM object(s)${poseTag}${handTag}${diaTag}` : `Face: ready · no face${poseTag}${handTag}${diaTag}`)
      : 'Face model: loading...';
    return;
  }

  faces.forEach((face, index) => {
    drawSingleFaceOverlay(context, canvas, face, index, face.id === state.primaryFaceId);
  });

  const objCount = recentSceneObjects().length;
  const primary = faces.find(item => item.id === state.primaryFaceId) || faces[0];
  const emoTag = state.emotion.faces[primary?.id]?.emotion || state.emotion.faces[primary?.trackId]?.emotion || '';
  const gestureTag = state.gestures.length ? state.gestures.map(g => g.name).join('/') : '';
  elements.faceHud.textContent = [
    `${faces.length} face(s) tracked`,
    primary ? `primary ${Math.round(state.smile)}% smile` : '',
    emoTag ? `emo ${emoTag}` : '',
    gestureTag ? `gesture ${gestureTag}` : '',
    state.poseModelReady ? 'pose on' : '',
    objCount ? `VLM ${objCount}` : '',
  ].filter(Boolean).join(' · ');
}

function drawSsdOverlay(context, canvas, detections) {
  context.save();
  context.setLineDash([6, 4]);
  context.lineWidth = 2;
  context.font = '600 11px Inter, sans-serif';
  detections.forEach(det => {
    if (!det.bboxNorm) return;
    const [x, y, w, h] = det.bboxNorm;
    const left = x * canvas.width;
    const top = y * canvas.height;
    const width = w * canvas.width;
    const height = h * canvas.height;
    context.strokeStyle = 'rgba(162, 245, 191, 0.85)';
    context.strokeRect(left, top, width, height);
    const label = `${det.class} ${Math.round((det.score || 0) * 100)}%`;
    context.fillStyle = 'rgba(162, 245, 191, 0.88)';
    context.fillRect(left, Math.max(0, top - 16), context.measureText(label).width + 10, 14);
    context.fillStyle = '#0f1016';
    context.fillText(label, left + 4, Math.max(10, top - 4));
  });
  context.restore();
}

function drawInsightfaceOverlay(context, canvas, detections) {
  context.save();
  context.setLineDash([4, 3]);
  context.lineWidth = 2;
  context.strokeStyle = 'rgba(199, 146, 255, 0.9)';
  context.font = '600 11px Inter, sans-serif';
  detections.forEach((det, index) => {
    const bbox = det.bboxNorm;
    if (!bbox) return;
    const x = bbox.x ?? bbox[0];
    const y = bbox.y ?? bbox[1];
    const w = bbox.w ?? bbox[2];
    const h = bbox.h ?? bbox[3];
    const left = x * canvas.width;
    const top = y * canvas.height;
    context.strokeRect(left, top, w * canvas.width, h * canvas.height);
    const label = `IF${index + 1} ${Math.round((det.detScore || 0) * 100)}%`;
    context.fillStyle = 'rgba(199, 146, 255, 0.88)';
    context.fillRect(left, top + h * canvas.height + 2, context.measureText(label).width + 10, 14);
    context.fillStyle = '#0f1016';
    context.fillText(label, left + 4, top + h * canvas.height + 12);
  });
  context.restore();
}

function drawHandSkeleton(context, canvas, hands) {
  context.save();
  context.lineWidth = 2;
  context.strokeStyle = 'rgba(255, 214, 102, 0.75)';
  context.fillStyle = 'rgba(255, 214, 102, 0.95)';
  hands.forEach(landmarks => {
    if (!landmarks?.length) return;
    HAND_BONES.forEach(([a, b]) => {
      const p1 = landmarks[a];
      const p2 = landmarks[b];
      if (!p1 || !p2) return;
      context.beginPath();
      context.moveTo(p1.x * canvas.width, p1.y * canvas.height);
      context.lineTo(p2.x * canvas.width, p2.y * canvas.height);
      context.stroke();
    });
    landmarks.forEach(pt => {
      if (!pt) return;
      context.beginPath();
      context.arc(pt.x * canvas.width, pt.y * canvas.height, 3, 0, Math.PI * 2);
      context.fill();
    });
  });
  context.restore();
}

function drawGestureLabels(context, canvas, gestures) {
  gestures.forEach((gesture, index) => {
    const wrist = gesture.landmarks?.[0];
    if (!wrist) return;
    const x = wrist.x * canvas.width;
    const y = Math.max(24, wrist.y * canvas.height - 20 - index * 22);
    const label = `${gesture.name} ${Math.round(gesture.confidence * 100)}%`;
    context.font = '700 14px Inter, sans-serif';
    const width = context.measureText(label).width + 14;
    context.fillStyle = 'rgba(199, 146, 255, 0.92)';
    context.fillRect(x - 6, y - 16, width, 22);
    context.fillStyle = '#0f1016';
    context.fillText(label, x, y);
  });
}

function drawPoseSkeleton(context, canvas, landmarks) {
  const visible = point => (point.visibility == null || point.visibility > 0.5) && (point.presence == null || point.presence > 0.5);
  const px = point => point.x * canvas.width;
  const py = point => point.y * canvas.height;

  context.save();
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.strokeStyle = 'rgba(255, 189, 102, 0.88)';
  context.shadowColor = 'rgba(255, 189, 102, 0.55)';
  context.shadowBlur = 10;
  POSE_CONNECTIONS.forEach(([start, end]) => {
    const a = landmarks[start];
    const b = landmarks[end];
    if (!a || !b || !visible(a) || !visible(b)) return;
    context.beginPath();
    context.moveTo(px(a), py(a));
    context.lineTo(px(b), py(b));
    context.stroke();
  });
  context.restore();

  context.fillStyle = 'rgba(255, 189, 102, 0.95)';
  landmarks.forEach((point, index) => {
    if (!visible(point)) return;
    const radius = [11, 12, 23, 24].includes(index) ? 5 : 3.5;
    context.beginPath();
    context.arc(px(point), py(point), radius, 0, Math.PI * 2);
    context.fill();
  });
}

function drawSingleFaceOverlay(context, canvas, face, index, isPrimary) {
  const { blendshapes, id } = face;
  const color = FACE_COLORS[index % FACE_COLORS.length];
  const box = faceBoxPixels(face, canvas);
  if (!box) return;
  const { left, right, top, bottom } = box;

  context.save();
  if (face.source === 'insightface') context.setLineDash([5, 4]);
  else if (face.source === 'fused') context.setLineDash([2, 2]);
  context.shadowColor = `${color}cc`;
  context.shadowBlur = isPrimary ? 16 : 8;
  context.strokeStyle = isPrimary ? color : `${color}cc`;
  context.lineWidth = isPrimary ? 4 : 2.5;
  context.strokeRect(left, top, right - left, bottom - top);
  context.restore();

  const srcTag = face.source === 'fused' ? '·IF+MP' : (face.source === 'insightface' ? '·IF' : '');
  const faceEmotion = state.emotion.faces[id] || state.emotion.faces[face.trackId];
  const trackMatch = face.trackId ? state.multiFaceMatches[face.trackId] : null;
  const matchedPerson = trackMatch?.personId
    ? state.people.find(person => person.id === trackMatch.personId)
    : null;
  const person = isPrimary ? activePerson() : matchedPerson;
  const personName = person?.name || (isPrimary ? '未知用户' : `T${String(face.trackId || index).slice(-4)}`);
  const identityScore = isPrimary && state.faceMatch.score > 0
    ? `(${Math.round(state.faceMatch.score * 100)}%)`
    : (trackMatch?.score ? `(${Math.round(trackMatch.score * 100)}%)` : (isPrimary && state.explicitPersonId ? '(显式)' : ''));

  const speaking = isPrimary && state.voice > 18;
  if (speaking) {
    context.save();
    context.strokeStyle = 'rgba(255, 189, 102, 0.82)';
    context.lineWidth = 2.5;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const radius = Math.max(right - left, bottom - top) / 2 + 10;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  context.font = '700 13px Inter, sans-serif';
  const emoLabel = faceEmotion?.emotion ? ` · ${faceEmotion.emotion}` : '';
  const micTag = speaking ? ' 🎤' : '';
  const identityTag = `${personName}${identityScore}${emoLabel}${micTag}${srcTag}`;
  const tagWidth = context.measureText(identityTag).width + 16;
  context.fillStyle = isPrimary ? 'rgba(162, 245, 191, 0.95)' : `${color}88`;
  context.fillRect(left - 4, Math.max(0, top - 44), Math.min(canvas.width - left + 8, tagWidth), 22);
  context.fillStyle = '#0f1016';
  context.fillText(identityTag, left + 4, Math.max(16, top - 26));

  if (isPrimary && blendshapes?.length) {
    const score = name => blendshapes.find(item => item.categoryName === name)?.score || 0;
    const smile = Math.round(((score('mouthSmileLeft') + score('mouthSmileRight')) / 2) * 100);
    const label = `bbox ${Math.round(right - left)}x${Math.round(bottom - top)} · smile ${smile}`;
    context.fillStyle = 'rgba(15, 16, 22, 0.82)';
    context.fillRect(left, Math.max(20, top - 22), Math.min(canvas.width - left, 260), 20);
    context.fillStyle = color;
    context.fillText(label, left + 8, Math.max(35, top - 8));
  }
}

// VLM 返回的物体不画在视频上；只用于关系库缩略图和悬浮物体列表。
function recentSceneObjects() {
  const cutoff = Date.now() - 45000;
  return state.sceneMemory.objects.filter(object =>
    object.status !== 'gone'
    && object.bboxNorm
    && new Date(object.lastSeen).getTime() >= cutoff
  );
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

  // 多模态情绪信号微调（仅在置信且新鲜时参与，且只是“线索”，不是诊断）。
  const fused = state.emotion.fused;
  const emoActive = state.emotion.fused.confidence > 0.25 && emotionIsFresh();
  if (emoActive) {
    const emoValence = clampNum(fused.valence, -1, 1);
    const emoArousal = clampNum(fused.arousal, -1, 1);
    state.arousal = clamp(state.arousal + emoArousal * 16);
    state.energy = clamp(state.energy + emoValence * 8 + Math.max(0, emoArousal) * 4);
    state.quietNeed = clamp(state.quietNeed + Math.max(0, -emoValence) * 12 + Math.max(0, -emoArousal) * 8);
    state.readiness = clamp(state.readiness + Math.max(0, emoValence) * 10);
    const zh = EMOTION_LABEL_ZH[fused.emotion] || fused.emotion;
    const drivers = [];
    if (emoArousal > 0.15) drivers.push('arousal 上调');
    if (emoValence < -0.15) drivers.push('quiet need 上调');
    if (emoValence > 0.2) drivers.push('readiness 上调');
    state.emotion.policyNote = `情绪信号「${zh}」(val ${emoValence.toFixed(2)} / aro ${emoArousal.toFixed(2)}, 置信 ${Math.round(fused.confidence * 100)}%)${drivers.length ? '：' + drivers.join('、') : '：未显著改变策略'}`;
  } else {
    state.emotion.policyNote = '情绪信号置信不足或已过期，未参与策略。';
  }

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

  sampleEmotionHistory();
  renderSignals();
  renderState(intervention);
  renderEmotion();
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
    if (name === 'presence') {
      elements[`${name}Text`].textContent = value > 45 ? '人在场' : '不确定';
      return;
    }
    if (name === 'voice') {
      const segCount = state.diarization.segments.length;
      const speakers = state.diarization.speakerEstimate || (segCount ? 1 : 0);
      const diaTag = segCount ? ` · ${segCount}段/${speakers || '?'}人` : '';
      elements[`${name}Text`].textContent = `${Math.round(value)}%${diaTag}`;
      return;
    }
    elements[`${name}Text`].textContent = `${Math.round(value)}%`;
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
    ['Face tracking', state.faceModelReady
      ? `${state.trackedFaces.length || (state.facePresent ? 1 : 0)} face(s) · pose ${state.poseModelReady ? 'on' : 'off'} · yaw ${Math.round(state.headYaw)}`
      : `loading/fallback${state.faceModelError ? ' · failed' : ''}`],
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
  return captureFaceCropFromBbox(state.lastFaceBboxNorm, options);
}

function captureFaceCropFromBbox(baseBbox, options = {}) {
  const forEnroll = Boolean(options.forEnroll);
  const video = elements.video;
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
    const options = MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')
      ? { mimeType: 'audio/webm;codecs=opus' }
      : undefined;
    const recorder = new MediaRecorder(state.audioStream, options);
    const chunks = [];
    let settled = false;
    const timeout = setTimeout(() => {
      try { if (recorder.state !== 'inactive') recorder.stop(); } catch {}
      if (!settled) {
        settled = true;
        reject(new Error('media_recorder_timeout'));
      }
    }, 5000);
    const finish = (handler, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      handler(value);
    };
    recorder.ondataavailable = event => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = event => finish(reject, event.error || new Error('media_recorder_error'));
    recorder.onstop = () => {
      if (!chunks.length) {
        finish(reject, new Error('empty_audio_sample'));
        return;
      }
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const reader = new FileReader();
      reader.onload = () => finish(resolve, reader.result);
      reader.onerror = () => finish(reject, reader.error || new Error('file_reader_error'));
      reader.readAsDataURL(blob);
    };
    recorder.start();
    setTimeout(() => {
      try { if (recorder.state !== 'inactive') recorder.stop(); } catch {}
    }, 3000);
  });
}

function fetchJsonWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .then(response => response.json())
    .finally(() => clearTimeout(timeout));
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
renderDiarization();

if (elements.ssdOverlayToggle) {
  elements.ssdOverlayToggle.checked = Boolean(state.debug.ssdOverlay);
  elements.ssdOverlayToggle.addEventListener('change', () => {
    state.debug.ssdOverlay = elements.ssdOverlayToggle.checked;
    localStorage.setItem('hri-demo-ssd-overlay', JSON.stringify(state.debug.ssdOverlay));
  });
}
if (elements.ifOverlayToggle) {
  elements.ifOverlayToggle.checked = Boolean(state.debug.insightfaceOverlay);
  elements.ifOverlayToggle.addEventListener('change', () => {
    state.debug.insightfaceOverlay = elements.ifOverlayToggle.checked;
    localStorage.setItem('hri-demo-if-overlay', JSON.stringify(state.debug.insightfaceOverlay));
  });
}

// ===================== 多模态情绪信号（非心理诊断） =====================
// 面部 ViT-FER + 语音 WavLM SER，经 MDAT 融合到 valence-arousal。
// 仅作为陪伴语气和主动性的参考线索，绝不作为心理诊断。

const EMOTION_VA = {
  happy: [0.80, 0.50], neutral: [0.0, 0.0], sad: [-0.70, -0.40], angry: [-0.60, 0.70],
  fear: [-0.60, 0.60], disgust: [-0.60, 0.30], surprise: [0.30, 0.70], contempt: [-0.40, 0.20],
};
const EMOTION_EMOJI = {
  happy: '😊', neutral: '😐', sad: '😔', angry: '😠', fear: '😨', disgust: '😖', surprise: '😲', contempt: '😒',
};
const EMOTION_LABEL_ZH = {
  happy: '愉悦', neutral: '平静', sad: '低落', angry: '紧绷', fear: '紧张', disgust: '厌恶', surprise: '惊讶', contempt: '轻蔑',
};
const EMOTION_COLOR = {
  happy: '#a2f5bf', neutral: '#bfb4aa', sad: '#7bdff2', angry: '#ff7a90',
  fear: '#b69cff', disgust: '#9ad6b0', surprise: '#ffbd66', contempt: '#d7a0ff',
};
const EMOTION_CANON = {
  anger: 'angry', ang: 'angry', angry: 'angry', happiness: 'happy', hap: 'happy', happy: 'happy', joy: 'happy',
  sadness: 'sad', sad: 'sad', neutral: 'neutral', neu: 'neutral', calm: 'neutral', fear: 'fear', fearful: 'fear',
  disgust: 'disgust', surprise: 'surprise', surprised: 'surprise', contempt: 'contempt',
};

function canonEmotion(label) {
  const key = String(label || '').trim().toLowerCase();
  return EMOTION_CANON[key] || key || 'neutral';
}

function normScores(scores) {
  const out = {};
  let total = 0;
  Object.entries(scores || {}).forEach(([label, value]) => {
    const canon = canonEmotion(label);
    const num = Number(value) || 0;
    out[canon] = (out[canon] || 0) + num;
    total += num;
  });
  if (total > 0) Object.keys(out).forEach(key => { out[key] = Number((out[key] / total).toFixed(4)); });
  return out;
}

function topEmotion(scores) {
  let best = 'neutral';
  let bestValue = -Infinity;
  Object.entries(scores || {}).forEach(([label, value]) => {
    if (value > bestValue) { bestValue = value; best = label; }
  });
  return best;
}

function scoresToVA(scores) {
  let valence = 0;
  let arousal = 0;
  Object.entries(scores || {}).forEach(([label, prob]) => {
    const va = EMOTION_VA[label];
    if (!va) return;
    valence += va[0] * prob;
    arousal += va[1] * prob;
  });
  return [Number(valence.toFixed(4)), Number(arousal.toFixed(4))];
}

function smoothEmotionScores(prevScores, newScores, alpha = 0.38) {
  const keys = new Set([...Object.keys(prevScores || {}), ...Object.keys(newScores || {})]);
  const blended = {};
  keys.forEach(key => {
    blended[key] = (prevScores?.[key] || 0) * (1 - alpha) + (newScores[key] || 0) * alpha;
  });
  return normScores(blended);
}

function storeFaceEmotion(faceId, incoming) {
  const prev = state.emotion.faces[faceId];
  const isReal = incoming.provider && !String(incoming.provider).endsWith('fallback');
  let scores = normScores(incoming.scores || {});
  if (prev?.scores && isReal) {
    scores = smoothEmotionScores(prev.scores, scores);
  }
  const emotion = canonEmotion(incoming.emotion || topEmotion(scores));
  const [valence, arousal] = incoming.valence != null && incoming.arousal != null
    ? [Number(incoming.valence), Number(incoming.arousal)]
    : scoresToVA(scores);
  const smoothedValence = prev && isReal ? Number(((prev.valence || 0) * 0.55 + valence * 0.45).toFixed(4)) : valence;
  const smoothedArousal = prev && isReal ? Number(((prev.arousal || 0) * 0.55 + arousal * 0.45).toFixed(4)) : arousal;
  state.emotion.faces[faceId] = {
    emotion,
    scores,
    valence: smoothedValence,
    arousal: smoothedArousal,
    confidence: Number(incoming.confidence) || scores[topEmotion(scores)] || 0,
    provider: incoming.provider || 'vit_fer',
    model: incoming.model || '',
    at: incoming.at || Date.now(),
    error: incoming.error || '',
  };
}

// —— 面部情绪：ViT-FER（后端）；模型未就绪时不伪造情绪分数。
function markFaceEmotionError(faceId, error, now = Date.now()) {
  state.emotion.faces[faceId] = {
    emotion: '', scores: {}, valence: 0, arousal: 0, confidence: 0,
    provider: 'vit_fer', model: '', at: now, error: error || 'not_ready',
  };
}

function updateMultiFaceEmotion() {
  const faces = state.trackedFaces.filter(face => {
    if (face.cropQuality === 'good' || face.cropQuality === 'ok') return true;
    return face.source === 'insightface' && (face.ifDetScore || 0) >= 0.5;
  });
  if (!faces.length) return;
  const now = Date.now();
  const interval = faces.length > 1 ? 2100 : 950;
  if (now - state.emotion.lastFaceAt < interval) return;
  if (state.emotion.faceInFlight) return;

  const crops = faces.map(face => ({
    faceId: face.trackId || face.id,
    faceCrop: captureFaceCropFromBbox(face.bboxNorm, { forEnroll: true }),
  })).filter(item => item.faceCrop);

  if (state.emotion.faceReady && state.serverOnline && crops.length >= 2) {
    state.emotion.faceInFlight = true;
    state.emotion.lastFaceAt = now;
    fetchJsonWithTimeout('/api/emotion/faces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crops }),
    }, 25000)
      .then(data => {
        const results = Array.isArray(data.faces) ? data.faces : [];
        results.forEach(item => {
          if (!item.ok || !item.scores || !item.faceId) return;
          storeFaceEmotion(item.faceId, {
            scores: item.scores,
            valence: item.valence,
            arousal: item.arousal,
            emotion: item.emotion,
            confidence: item.confidence,
            provider: item.provider || 'vit_fer',
            model: item.model || '',
            at: Date.now(),
            error: '',
          });
        });
        syncPrimaryFaceEmotionToPanel();
        fuseEmotion();
      })
      .catch(error => {
        faces.forEach(face => markFaceEmotionError(
          face.trackId || face.id,
          error?.name === 'AbortError' ? 'FER timeout' : (error?.message || 'fetch_failed'),
          now,
        ));
        syncPrimaryFaceEmotionToPanel();
        fuseEmotion();
      })
      .finally(() => { state.emotion.faceInFlight = false; });
    return;
  }

  const index = state.emotion.faceEmotionIndex % faces.length;
  state.emotion.faceEmotionIndex += 1;
  const target = faces[index];
  const faceCrop = crops.find(item => item.faceId === (target.trackId || target.id))?.faceCrop
    || captureFaceCropFromBbox(target.bboxNorm, { forEnroll: true });
  if (!faceCrop) {
    markFaceEmotionError(target.trackId || target.id, 'crop_failed', now);
    syncPrimaryFaceEmotionToPanel();
    fuseEmotion();
    return;
  }

  if (state.emotion.faceReady && state.serverOnline) {
    state.emotion.faceInFlight = true;
    state.emotion.lastFaceAt = now;
    fetchJsonWithTimeout('/api/emotion/face', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faceCrop, faceId: target.id }),
    }, 15000)
      .then(data => {
        if (data.ok && data.scores) {
          storeFaceEmotion(target.trackId || target.id, {
            scores: data.scores,
            valence: data.valence,
            arousal: data.arousal,
            emotion: data.emotion,
            confidence: data.confidence,
            provider: data.provider || 'vit_fer',
            model: data.model || '',
            at: Date.now(),
            error: '',
          });
        } else {
          markFaceEmotionError(target.trackId || target.id, data.error || 'not_ready', now);
        }
        syncPrimaryFaceEmotionToPanel();
        fuseEmotion();
      })
      .catch(error => {
        markFaceEmotionError(
          target.trackId || target.id,
          error?.name === 'AbortError' ? 'FER timeout' : (error?.message || 'fetch_failed'),
          now,
        );
        syncPrimaryFaceEmotionToPanel();
        fuseEmotion();
      })
      .finally(() => { state.emotion.faceInFlight = false; });
    return;
  }

  state.emotion.lastFaceAt = now;
  if (!state.emotion.faceReady || !state.serverOnline) {
    faces.forEach(face => markFaceEmotionError(face.trackId || face.id, 'model_not_ready', now));
    syncPrimaryFaceEmotionToPanel();
    fuseEmotion();
  }
}

function syncPrimaryFaceEmotionToPanel() {
  const primary = state.trackedFaces.find(face => face.id === state.primaryFaceId);
  const primaryEmotion = primary
    ? (state.emotion.faces[primary.trackId] || state.emotion.faces[primary.id])
    : null;
  if (primaryEmotion) {
    state.emotion.face = { ...primaryEmotion };
  }
}

function markVoiceEmotionError(error, now = Date.now()) {
  state.emotion.voice = {
    emotion: '', scores: {}, valence: 0, arousal: 0, confidence: 0,
    provider: 'wavlm_ser', model: '', at: now, error: error || 'not_ready',
  };
  fuseEmotion();
}

function updateFaceEmotion() {
  updateMultiFaceEmotion();
}

// —— 语音情绪：WavLM SER（后端）；失败时不伪造情绪分数。
function updateVoiceEmotion() {
  if (!state.emotion.voiceSampling || !state.audioStream) return;
  const now = Date.now();
  if (state.emotion.voiceInFlight && now - state.emotion.lastVoiceAt > 8000) {
    state.emotion.voiceInFlight = false;
    markVoiceEmotionError('SER timeout', now);
  }
  if (now - state.emotion.lastVoiceAt < 6000) return;
  if (state.emotion.voiceReady && state.serverOnline) {
    if (state.emotion.voiceInFlight) return;
    state.emotion.voiceInFlight = true;
    state.emotion.lastVoiceAt = now;
    state.emotion.voice = { ...state.emotion.voice, at: now, error: 'SER sampling...' };
    fuseEmotion();
    recordVoiceSample()
      .then(audio => fetchJsonWithTimeout('/api/emotion/voice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio }),
      }, 60000))
      .then(data => {
        if (data.ok && data.scores) {
          const scores = normScores(data.scores);
          const [valence, arousal] = data.valence != null && data.arousal != null
            ? [Number(data.valence), Number(data.arousal)]
            : scoresToVA(scores);
          state.emotion.voice = {
            emotion: canonEmotion(data.emotion || topEmotion(scores)),
            scores, valence, arousal,
            confidence: Number(data.confidence) || scores[topEmotion(scores)] || 0,
            provider: data.provider || 'wavlm_ser', model: data.model || '', at: Date.now(), error: '',
          };
          fuseEmotion();
        } else {
          const err = [data.error || 'not_ready', data.detail || data.stderr].filter(Boolean).join(': ');
          markVoiceEmotionError(err);
        }
      })
      .catch(error => {
        markVoiceEmotionError(error?.name === 'AbortError' ? 'SER timeout' : (error?.message || 'fetch_failed'));
      })
      .finally(() => { state.emotion.voiceInFlight = false; });
    return;
  }
  state.emotion.lastVoiceAt = now;
  markVoiceEmotionError('model_not_ready', now);
}

function diarizationSpeakerClass(speaker) {
  const key = String(speaker || 'S1');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash + key.charCodeAt(i) * (i + 1)) % 997;
  return `dia-spk-${hash % 6}`;
}

// 任务2：pyannote 3.1 说话人 diarization（无 energy VAD）。
function renderDiarization() {
  if (!elements.diarizationStatus && !elements.diarizationSegments) return;
  const dia = state.diarization;
  const providerLabel = dia.ready ? 'pyannote 3.1' : 'pyannote 未就绪';
  const speakerText = dia.speakerEstimate > 0 ? `${dia.speakerEstimate} 人` : '—';
  const segCount = dia.segments.length;
  const primaryTrack = state.trackedFaces.find(face => face.id === state.primaryFaceId);
  const faceLink = state.voice > 18 && primaryTrack
    ? `语音活动 · 主脸 T${String(primaryTrack.trackId || primaryTrack.id).slice(-4)}`
    : '';
  const multiHint = dia.speakerEstimate > 1 && state.trackedFaces.length > 1
    ? `${dia.speakerEstimate} 说话人 · ${state.trackedFaces.length} 张脸`
    : '';
  if (elements.diarizationStatus) {
    elements.diarizationStatus.textContent = [
      providerLabel,
      dia.ready ? (dia.busy ? '分析中…' : '等待语音片段') : (dia.backendDetail || '配置 PYANNOTE_HF_TOKEN'),
      `段数 ${segCount}`,
      `说话人 ${speakerText}`,
      faceLink,
      multiHint,
    ].filter(Boolean).join(' · ');
  }
  if (elements.diarizationSegments) {
    if (!segCount) {
      elements.diarizationSegments.innerHTML = `<p class="dia-empty">${dia.ready ? '等待 pyannote 分析结果…' : 'pyannote 未配置，见 .env.example 统一安装'}</p>`;
      return;
    }
    const windowMs = 30000;
    const recent = dia.segments.slice(-10);
    elements.diarizationSegments.innerHTML = recent.map(seg => {
      const dur = seg.durationMs || Math.max(0, (seg.endMs || 0) - (seg.startMs || 0));
      const width = Math.min(100, Math.max(8, (dur / windowMs) * 100));
      const speaker = escapeHtml(String(seg.speaker || 'S?'));
      const spkClass = diarizationSpeakerClass(seg.speaker);
      return `
        <div class="dia-seg ${spkClass}" title="${speaker} · ${dur}ms · pyannote">
          <span class="dia-speaker">${speaker}</span>
          <i style="width:${width}%"></i>
          <em>${Math.round(dur / 100) / 10}s</em>
        </div>
      `;
    }).join('');
  }
}

async function updatePyannoteDiarization() {
  if (!state.audioStream || !state.serverOnline || state.diarization.busy) return;
  if (!state.diarization.ready) {
    renderDiarization();
    return;
  }
  if (state.voice < 12) return;
  state.diarization.busy = true;
  try {
    const audio = await recordVoiceSample();
    if (!audio) return;
    const data = await fetchJsonWithTimeout('/api/audio/diarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio }),
    }, 60000);
    if (data.ok) {
      state.diarization.provider = 'pyannote_3.1';
      state.diarization.speakerEstimate = Number(data.speakerCount || data.speaker_count || 0);
      if (Array.isArray(data.segments) && data.segments.length) {
        state.diarization.segments = data.segments.slice(-12);
      }
      state.diarization.lastAt = Date.now();
    } else {
      addEvent('pyannote 未就绪', data.detail || data.error || 'diarization_failed');
    }
    renderDiarization();
  } catch {
    // non-blocking
  } finally {
    state.diarization.busy = false;
  }
}

async function supplementInsightFaceDetections() {
  if (!state.insightfaceReady || !state.serverOnline || !state.started) return;
  const now = Date.now();
  const interval = state.debug?.insightfaceOverlay ? 4000 : 5000;
  if (now - state.lastInsightfaceDetectAt < interval || state.insightfaceDetectInFlight) return;
  if (elements.video.readyState < 2) return;
  state.insightfaceDetectInFlight = true;
  state.lastInsightfaceDetectAt = now;
  try {
    const frame = captureVideoFrame();
    const data = await fetchJsonWithTimeout('/api/identity/face/detect-frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame }),
    }, 20000);
    if (data.ok && Array.isArray(data.faces)) {
      state.insightfaceDetections = data.faces.map(face => ({
        bboxNorm: face.bboxNorm,
        detScore: face.detScore,
        faceIndex: face.faceIndex,
      }));
    }
  } catch {
    // non-blocking
  } finally {
    state.insightfaceDetectInFlight = false;
  }
}

// 任务1：多人脸 FER 聚合后参与 MDAT。
function aggregateMultiFaceEmotion(now) {
  const entries = Object.values(state.emotion.faces).filter(item =>
    item.at && now - item.at < 10000 && Object.keys(item.scores || {}).length
  );
  if (!entries.length) return null;
  if (entries.length === 1) return entries[0];
  const scores = {};
  let totalW = 0;
  let valence = 0;
  let arousal = 0;
  entries.forEach(item => {
    const w = 0.35 + 0.65 * (item.confidence || 0);
    totalW += w;
    valence += (item.valence || 0) * w;
    arousal += (item.arousal || 0) * w;
    Object.entries(item.scores).forEach(([label, prob]) => {
      scores[label] = (scores[label] || 0) + prob * w;
    });
  });
  if (totalW <= 0) return entries[0];
  Object.keys(scores).forEach(key => { scores[key] = Number((scores[key] / totalW).toFixed(4)); });
  return {
    emotion: topEmotion(scores),
    scores,
    valence: Number((valence / totalW).toFixed(4)),
    arousal: Number((arousal / totalW).toFixed(4)),
    confidence: Math.max(...entries.map(item => item.confidence || 0)),
    provider: entries[0].provider,
    model: entries[0].model,
    at: Math.max(...entries.map(item => item.at)),
    multiFaceCount: entries.length,
  };
}

function fuseMdatScores(faceScores, voiceScores, wFace, wVoice) {
  const labels = new Set([
    ...Object.keys(faceScores || {}),
    ...Object.keys(voiceScores || {}),
  ]);
  if (!labels.size) return { neutral: 1 };
  let agreement = 0;
  labels.forEach(label => {
    agreement += (faceScores?.[label] || 0) * (voiceScores?.[label] || 0);
  });
  const raw = {};
  labels.forEach(label => {
    const f = faceScores?.[label] || 0;
    const v = voiceScores?.[label] || 0;
    raw[label] = wFace * f + wVoice * v + 0.55 * f * v * (1 + agreement);
  });
  return normScores(raw);
}

function fuseEmotion() {
  const emotion = state.emotion;
  const now = Date.now();
  const aggregatedFace = aggregateMultiFaceEmotion(now);
  const face = aggregatedFace || emotion.face;
  const voice = emotion.voice;
  const faceFresh = face.at && now - face.at < 8000 && Object.keys(face.scores || {}).length;
  const voiceFresh = voice.at && now - voice.at < 14000 && Object.keys(voice.scores || {}).length;
  let wFace = faceFresh ? 0.58 * (0.35 + 0.65 * (face.confidence || 0)) : 0;
  let wVoice = voiceFresh ? 0.42 * (0.35 + 0.65 * (voice.confidence || 0)) : 0;

  emotion.fusionNote = aggregatedFace?.multiFaceCount > 1
    ? `MDAT · ${aggregatedFace.multiFaceCount} 脸聚合后融合`
    : 'MDAT 跨模态融合';

  let fusedScores = { neutral: 1 };
  if (wFace + wVoice > 0) {
    fusedScores = fuseMdatScores(face.scores || {}, voice.scores || {}, wFace, wVoice);
  }

  const vaWeight = wFace + wVoice;
  let valence = 0;
  let arousal = 0;
  if (vaWeight > 0) {
    valence = (wFace * (face.valence || 0) + wVoice * (voice.valence || 0)) / vaWeight;
    arousal = (wFace * (face.arousal || 0) + wVoice * (voice.arousal || 0)) / vaWeight;
  }
  const top = topEmotion(fusedScores);
  emotion.fused = {
    emotion: top,
    scores: fusedScores,
    valence: Number(valence.toFixed(3)),
    arousal: Number(arousal.toFixed(3)),
    confidence: Number((fusedScores[top] || 0).toFixed(3)),
    fusion: 'mdat',
  };
  if (aggregatedFace) emotion.face = { ...aggregatedFace };
  renderEmotion();
}

// 在 1.2s 推理节拍里采样一次，保证时间线/轨迹连续。
function sampleEmotionHistory() {
  const fused = state.emotion.fused;
  state.emotion.history.push({ t: Date.now(), v: fused.valence, a: fused.arousal, emotion: fused.emotion, c: fused.confidence });
  if (state.emotion.history.length > 150) state.emotion.history.shift();
}

function emotionIsFresh() {
  const now = Date.now();
  return (state.emotion.face.at && now - state.emotion.face.at < 10000)
    || (state.emotion.voice.at && now - state.emotion.voice.at < 16000);
}

function renderEmotion() {
  const emotion = state.emotion;
  const fused = emotion.fused;
  const fresh = emotionIsFresh();
  const color = EMOTION_COLOR[fused.emotion] || '#bfb4aa';
  const arousalNorm = clamp01((fused.arousal + 1) / 2);

  // 把融合情绪广播成全局 CSS 变量：颜色 / 光晕强度 / 脉冲速度（唤醒度越高越快）。
  const root = document.documentElement;
  root.style.setProperty('--emo-color', color);
  root.style.setProperty('--emo-glow', fresh ? (0.22 + 0.5 * arousalNorm).toFixed(2) : '0');
  root.style.setProperty('--emo-pulse', fresh ? `${(2.8 - arousalNorm * 1.7).toFixed(2)}s` : '4s');

  // 融合环
  if (elements.emoRingArc) {
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const conf = fresh ? clamp01(fused.confidence) : 0;
    const arcLength = conf * circumference;
    elements.emoRingArc.setAttribute('stroke', color);
    elements.emoRingArc.setAttribute('stroke-width', String(6 + arousalNorm * 7));
    elements.emoRingArc.setAttribute('stroke-dasharray', `${arcLength.toFixed(2)} ${(circumference - arcLength).toFixed(2)}`);
    if (elements.emoRingEmoji) elements.emoRingEmoji.textContent = fresh ? (EMOTION_EMOJI[fused.emotion] || '🙂') : '⏳';
    if (elements.emoRingLabel) elements.emoRingLabel.textContent = fresh ? (EMOTION_LABEL_ZH[fused.emotion] || fused.emotion) : '采集中';
    if (elements.emoRingConf) elements.emoRingConf.textContent = fresh ? `${Math.round(conf * 100)}%` : '—';
  }

  // valence-arousal 平面（viewBox 0 0 200 200，中心 100,100，单位 80px）
  if (elements.emoVADot) {
    const x = 100 + clampNum(fused.valence, -1, 1) * 80;
    const y = 100 - clampNum(fused.arousal, -1, 1) * 80;
    elements.emoVADot.setAttribute('cx', x.toFixed(1));
    elements.emoVADot.setAttribute('cy', y.toFixed(1));
    elements.emoVADot.setAttribute('fill', color);
    elements.emoVADot.setAttribute('opacity', fresh ? '1' : '0.3');
    if (elements.emoVAHalo) {
      elements.emoVAHalo.setAttribute('cx', x.toFixed(1));
      elements.emoVAHalo.setAttribute('cy', y.toFixed(1));
      elements.emoVAHalo.setAttribute('fill', color);
      elements.emoVAHalo.setAttribute('opacity', fresh ? (0.16 + 0.24 * arousalNorm).toFixed(2) : '0');
    }
  }
  if (elements.emoVATrail) {
    // 彗星拖尾：越新的点越靠后；用渐隐的紫色轨迹。
    const points = emotion.history.slice(-26).map(item => `${(100 + clampNum(item.v, -1, 1) * 80).toFixed(1)},${(100 - clampNum(item.a, -1, 1) * 80).toFixed(1)}`).join(' ');
    elements.emoVATrail.setAttribute('points', points);
  }

  // 时间线（viewBox 0 0 240 60，中线 30，幅度 24），曲线 + 渐变填充。
  const history = emotion.history.slice(-60);
  if (elements.emoTLValence && elements.emoTLArousal) {
    const n = history.length;
    const seriesPoints = key => history.map((item, index) => {
      const px = n > 1 ? (index / (n - 1)) * 240 : 0;
      const py = 30 - clampNum(item[key], -1, 1) * 24;
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    });
    const valPts = seriesPoints('v');
    const aroPts = seriesPoints('a');
    elements.emoTLValence.setAttribute('points', valPts.join(' '));
    elements.emoTLArousal.setAttribute('points', aroPts.join(' '));
    const lastX = n > 1 ? 240 : 0;
    const areaFor = pts => pts.length ? `0,30 ${pts.join(' ')} ${lastX},30` : '';
    if (elements.emoTLValenceArea) elements.emoTLValenceArea.setAttribute('points', areaFor(valPts));
    if (elements.emoTLArousalArea) elements.emoTLArousalArea.setAttribute('points', areaFor(aroPts));
  }

  // 双模态行
  if (elements.emoFaceRow) {
    const multiCount = Object.keys(emotion.faces).length;
    const multiNote = multiCount > 1 ? ` · ${multiCount} 脸` : '';
    elements.emoFaceRow.innerHTML = modalityRowHtml(`面部 FER${multiNote}`, emotion.face, emotion.faceReady);
  }
  if (elements.emoVoiceRow) elements.emoVoiceRow.innerHTML = modalityRowHtml('语音 SER', emotion.voice, emotion.voiceReady);
  renderMultiFaceEmotionList();

  if (elements.emotionStatus) {
    const parts = [];
    parts.push(`融合：${fresh ? (EMOTION_LABEL_ZH[fused.emotion] || fused.emotion) : '采集中'} · val ${fused.valence} · aro ${fused.arousal}`);
    if (emotion.fusionNote) parts.push(emotion.fusionNote);
    parts.push('MDAT');
    parts.push(emotion.policyNote || '情绪信号尚未参与策略');
    elements.emotionStatus.textContent = parts.join(' — ');
  }
}

function clampNum(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(max, Math.max(min, num));
}

function providerLabelEmotion(provider) {
  const map = {
    vit_fer: 'ViT-FER',
    wavlm_ser: 'WavLM · SER',
  };
  return map[provider] || provider || '未运行';
}

function emotionScoresHtml(scores) {
  const order = ['neutral', 'happy', 'sad', 'angry', 'fear', 'surprise', 'disgust', 'contempt'];
  const entries = order
    .filter(label => scores && scores[label] != null)
    .map(label => [label, Number(scores[label]) || 0]);
  if (!entries.length) return '';
  return `<div class="emo-score-grid">${entries.map(([label, value]) => `
    <div class="emo-score-row">
      <span>${escapeHtml(EMOTION_LABEL_ZH[label] || label)}</span>
      <i><b style="width:${Math.round(value * 100)}%"></b></i>
      <em>${Math.round(value * 100)}%</em>
    </div>
  `).join('')}</div>`;
}

function renderMultiFaceEmotionList() {
  if (!elements.emoMultiFaceList) return;
  const tracked = state.trackedFaces.filter(face => face.trackId || face.id);
  if (tracked.length < 2) {
    elements.emoMultiFaceList.innerHTML = '';
    return;
  }
  const now = Date.now();
  const rows = tracked.map(face => {
    const key = face.trackId || face.id;
    const emo = state.emotion.faces[key];
    const match = state.multiFaceMatches[key];
    const person = match?.personId ? state.people.find(item => item.id === match.personId) : null;
    const name = person?.name || `T${String(key).slice(-4)}`;
    const fresh = emo?.at && now - emo.at < 12000;
    const hasError = Boolean(emo?.error);
    const badge = !emo ? '—' : (hasError ? '未就绪' : 'real');
    const label = fresh && emo?.emotion ? (EMOTION_LABEL_ZH[emo.emotion] || emo.emotion) : '采集中';
    const conf = fresh ? Math.round((emo.confidence || 0) * 100) : 0;
    const src = face.source === 'fused' ? 'IF+MP' : (face.source === 'insightface' ? 'IF' : 'MP');
    return `
      <div class="emo-multi-row">
        <span class="emo-multi-name">${escapeHtml(name)}</span>
        <span class="emo-multi-src">${src}</span>
        <span class="emo-multi-emo">${escapeHtml(label)}</span>
        <span class="emo-multi-conf">${conf ? `${conf}%` : '—'}</span>
        <span class="emo-multi-badge ${hasError ? 'warn' : 'ok'}">${badge}</span>
      </div>
    `;
  }).join('');
  elements.emoMultiFaceList.innerHTML = `
    <p class="emo-multi-title">多人脸 FER（按 track）</p>
    ${rows}
  `;
}

function modalityRowHtml(title, modality, ready) {
  const fresh = modality.at && Date.now() - modality.at < 16000 && !modality.error && modality.emotion;
  const isSampling = /sampling\.\.\.$/.test(modality.error || '');
  const emotionLabel = modality.emotion ? (EMOTION_LABEL_ZH[modality.emotion] || modality.emotion) : '—';
  const conf = Math.round((modality.confidence || 0) * 100);
  const errNote = modality.error && !isSampling ? ` · ${escapeHtml(modality.error)}` : '';
  const badge = !ready
    ? '<span class="emo-badge warn">模型未就绪</span>'
    : (modality.error && !isSampling
      ? '<span class="emo-badge warn">未就绪</span>'
      : '<span class="emo-badge ok">real</span>');
  return `
    <div class="emo-modality-head">
      <strong>${title}</strong>
      ${badge}
    </div>
    <div class="emo-modality-body">
      <span class="emo-modality-emotion">${fresh ? escapeHtml(emotionLabel) : '采集中'}</span>
      <div class="emo-bar"><i style="width:${fresh ? conf : 0}%"></i></div>
      <span class="emo-modality-conf">${fresh ? conf + '%' : '—'}</span>
    </div>
    <p class="emo-modality-meta">${escapeHtml(providerLabelEmotion(modality.provider))}${escapeHtml(modality.model ? ' · ' + modality.model : '')}${errNote}</p>
    ${emotionScoresHtml(modality.scores)}
  `;
}

if (elements.voiceEmotionToggle) {
  const syncVoiceToggle = () => {
    elements.voiceEmotionToggle.textContent = `语音情绪采样：${state.emotion.voiceSampling ? '开' : '关'}`;
    elements.voiceEmotionToggle.classList.toggle('ghost', !state.emotion.voiceSampling);
  };
  syncVoiceToggle();
  elements.voiceEmotionToggle.addEventListener('click', () => {
    state.emotion.voiceSampling = !state.emotion.voiceSampling;
    localStorage.setItem('hri-demo-voice-emotion', JSON.stringify(state.emotion.voiceSampling));
    syncVoiceToggle();
    addEvent('语音情绪采样', state.emotion.voiceSampling
      ? '已开启：说话时会上传约 3 秒音频做情绪识别，结果与 provider 在面板可见。'
      : '已关闭：不再采集语音情绪。');
  });
}

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
    affect: emotionIsFresh() ? {
      emotion: state.emotion.fused.emotion,
      emotionZh: EMOTION_LABEL_ZH[state.emotion.fused.emotion] || state.emotion.fused.emotion,
      valence: state.emotion.fused.valence,
      arousal: state.emotion.fused.arousal,
      confidence: Math.round(state.emotion.fused.confidence * 100),
      face: { emotion: state.emotion.face.emotion, provider: state.emotion.face.provider, confidence: Math.round((state.emotion.face.confidence || 0) * 100) },
      voice: { emotion: state.emotion.voice.emotion, provider: state.emotion.voice.provider, confidence: Math.round((state.emotion.voice.confidence || 0) * 100) },
      note: state.emotion.policyNote,
    } : null,
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
renderEmotion();
