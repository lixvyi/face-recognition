#!/usr/bin/env python3
import base64
import contextlib
import json
import math
import os
import subprocess
import sys
import tempfile
import urllib.request
from io import BytesIO

import numpy as np

try:
    import cv2
except Exception:
    cv2 = None

try:
    import insightface
except Exception:
    insightface = None

try:
    import torch
    import torchaudio
except Exception:
    torch = None
    torchaudio = None

try:
    from speechbrain.inference.speaker import EncoderClassifier
except Exception:
    EncoderClassifier = None

import importlib.util

# 情绪模型（ViT-FER / WavLM SER）按需在各自函数里惰性导入，
# 避免拖慢每次身份识别 worker 的冷启动。这里只做“是否可用”的轻量探测。
def _module_available(name):
    try:
        return importlib.util.find_spec(name) is not None
    except Exception:
        return False

_FACE_APP = None
_VOICE_MODEL = None
_VIT_FER_MODEL = None
_VIT_FER_PROCESSOR = None
_SER_MODEL = None
_SER_EXTRACTOR = None
_PYANNOTE_PIPELINE = None
_YOLO_FACE = None

# 8 类情绪 → (valence, arousal) 环状模型坐标，范围 -1~1。
# 仅用于把离散情绪映射到连续二维信号，不作为心理诊断。
EMOTION_VA = {
    'happy': (0.80, 0.50),
    'happiness': (0.80, 0.50),
    'neutral': (0.00, 0.00),
    'sad': (-0.70, -0.40),
    'sadness': (-0.70, -0.40),
    'angry': (-0.60, 0.70),
    'anger': (-0.60, 0.70),
    'fear': (-0.60, 0.60),
    'fearful': (-0.60, 0.60),
    'disgust': (-0.60, 0.30),
    'surprise': (0.30, 0.70),
    'surprised': (0.30, 0.70),
    'contempt': (-0.40, 0.20),
    'calm': (0.30, -0.50),
    'excited': (0.60, 0.70),
    'frustrated': (-0.50, 0.40),
}

# 把模型原始标签统一成小写规范标签。
LABEL_CANON = {
    'anger': 'angry', 'ang': 'angry', 'angry': 'angry',
    'happiness': 'happy', 'hap': 'happy', 'happy': 'happy', 'joy': 'happy',
    'sadness': 'sad', 'sad': 'sad',
    'neutral': 'neutral', 'neu': 'neutral', 'calm': 'neutral',
    'fear': 'fear', 'fearful': 'fear',
    'disgust': 'disgust',
    'surprise': 'surprise', 'surprised': 'surprise',
    'contempt': 'contempt',
}

DEFAULT_FER_CLASSES = ['anger', 'contempt', 'disgust', 'fear', 'happiness', 'neutral', 'sadness', 'surprise']


def _softmax(values):
    arr = np.asarray(values, dtype=np.float64)
    arr = arr - np.max(arr)
    exp = np.exp(arr)
    total = exp.sum()
    if total <= 0:
        return np.full_like(exp, 1.0 / len(exp))
    return exp / total


def _scores_to_va(scores):
    """scores: dict canon_label -> prob。按概率加权得到 valence/arousal。"""
    valence = 0.0
    arousal = 0.0
    for label, prob in scores.items():
        va = EMOTION_VA.get(label)
        if va is None:
            continue
        valence += va[0] * prob
        arousal += va[1] * prob
    return round(float(valence), 4), round(float(arousal), 4)


def _json_response(payload):
    print(json.dumps(payload, ensure_ascii=False))


def _read_payload():
    return json.loads(sys.stdin.read() or '{}')


def _decode_data_url(data_url):
    if not data_url or ',' not in data_url:
        raise ValueError('invalid_data_url')
    _, raw = data_url.split(',', 1)
    return base64.b64decode(raw)


def _decode_data_url_with_mime(data_url):
    if not data_url or ',' not in data_url:
        raise ValueError('invalid_data_url')
    header, raw = data_url.split(',', 1)
    mime = header[5:].split(';', 1)[0] if header.startswith('data:') else ''
    return mime, base64.b64decode(raw)


def _audio_suffix(mime):
    if 'webm' in mime:
        return '.webm'
    if 'ogg' in mime or 'opus' in mime:
        return '.ogg'
    if 'mpeg' in mime or 'mp3' in mime:
        return '.mp3'
    if 'wav' in mime or 'wave' in mime:
        return '.wav'
    return '.audio'


def _write_temp_audio(raw, mime):
    """Windows 上 NamedTemporaryFile(delete=True) 会锁文件，ffmpeg/pyannote 无法读取。"""
    fd, path = tempfile.mkstemp(suffix=_audio_suffix(mime))
    try:
        os.write(fd, raw)
    finally:
        os.close(fd)
    return path


def _load_audio_via_ffmpeg(raw, mime):
    path = _write_temp_audio(raw, mime)
    try:
        completed = subprocess.run(
            ['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '1', '-ar', '16000', '-'],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    finally:
        with contextlib.suppress(OSError):
            os.unlink(path)
    samples = np.frombuffer(completed.stdout, dtype=np.float32)
    if samples.size == 0:
        raise ValueError('empty_audio')
    return samples


def _normalize(vec):
    arr = np.asarray(vec, dtype=np.float32)
    norm = np.linalg.norm(arr)
    if norm <= 1e-8:
        return arr.tolist()
    return (arr / norm).round(6).tolist()


def _pad_image(image, ratio=0.6):
    height, width = image.shape[:2]
    pad_x = int(width * ratio)
    pad_y = int(height * ratio)
    return cv2.copyMakeBorder(image, pad_y, pad_y, pad_x, pad_x, cv2.BORDER_CONSTANT, value=(127, 127, 127))


def _resize_min_edge(image, min_edge=224):
    height, width = image.shape[:2]
    longest = max(height, width)
    if longest >= min_edge:
        return image
    scale = min_edge / float(longest)
    return cv2.resize(image, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_LINEAR)


def _detect_faces(image):
    """MediaPipe 裁紧的人脸图常使 InsightFace 检测失败，需加边距/放大后重试。"""
    global _FACE_APP
    candidates = []
    seen = set()

    def add_candidate(img):
        key = (img.shape[0], img.shape[1])
        if key in seen:
            return
        seen.add(key)
        candidates.append(img)

    add_candidate(_resize_min_edge(image, 224))
    add_candidate(image)
    add_candidate(_pad_image(image, 0.45))
    add_candidate(_pad_image(image, 0.9))
    add_candidate(_pad_image(_resize_min_edge(image, 320), 0.35))

    for candidate in candidates:
        with contextlib.redirect_stdout(sys.stderr):
            faces = _FACE_APP.get(candidate)
        if faces:
            return faces, 'detect'
    return [], 'none'


def face_embedding(image_data_url):
    if insightface is None or cv2 is None:
        return {
            'ok': False,
            'provider': 'insightface_arcface',
            'error': 'missing_dependencies',
            'detail': 'Install opencv-python and insightface to enable real face identity embeddings.',
        }
    global _FACE_APP
    if _FACE_APP is None:
        model_name = os.environ.get('FACE_MODEL_NAME', 'buffalo_s')
        with contextlib.redirect_stdout(sys.stderr):
            _FACE_APP = insightface.app.FaceAnalysis(name=model_name, providers=['CPUExecutionProvider'])
            _FACE_APP.prepare(ctx_id=0, det_size=(640, 640))
    raw = _decode_data_url(image_data_url)
    image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        return {'ok': False, 'provider': 'insightface_arcface', 'error': 'decode_failed'}
    faces, mode = _detect_faces(image)
    if not faces:
        return {
            'ok': False,
            'provider': 'insightface_arcface',
            'error': 'no_face',
            'detail': 'InsightFace could not detect a face in the crop. Use a frontal face with more padding/light.',
        }
    face = max(faces, key=lambda item: (item.bbox[2] - item.bbox[0]) * (item.bbox[3] - item.bbox[1]))
    return {
        'ok': True,
        'provider': 'insightface_arcface',
        'embedding': _normalize(face.embedding),
        'bbox': [float(x) for x in face.bbox],
        'det_score': float(face.det_score),
        'detect_mode': mode,
    }


def faces_emotion_batch(payload):
    crops = payload.get('crops') or []
    if not crops:
        return {'ok': False, 'provider': 'vit_fer', 'error': 'no_crops', 'faces': []}
    faces = []
    for item in crops[:8]:
        face_id = item.get('faceId') or item.get('id')
        image = item.get('faceCrop') or item.get('image')
        result = face_emotion(image)
        result['faceId'] = face_id
        faces.append(result)
    return {
        'ok': any(item.get('ok') for item in faces),
        'provider': 'vit_fer',
        'faces': faces,
    }


def _detect_yolo_faces(image):
    mode = os.environ.get('FACE_DETECTOR', 'insightface').strip().lower()
    if mode not in ('yolo', 'both'):
        return []
    try:
        from ultralytics import YOLO
    except Exception:
        return []
    global _YOLO_FACE
    if _YOLO_FACE is None:
        model_path = os.environ.get('YOLO_FACE_MODEL', 'yolov8n-face.pt')
        with contextlib.redirect_stdout(sys.stderr):
            _YOLO_FACE = YOLO(model_path)
    height, width = image.shape[:2]
    with contextlib.redirect_stdout(sys.stderr):
        results = _YOLO_FACE(image, verbose=False)
    if not results:
        return []
    faces = []
    for box in results[0].boxes:
        conf = float(box.conf[0]) if hasattr(box, 'conf') else 0.0
        if conf < 0.35:
            continue
        x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
        bw = max(1.0, x2 - x1)
        bh = max(1.0, y2 - y1)
        faces.append({
            'faceIndex': len(faces),
            'bboxNorm': {
                'x': round(x1 / width, 4),
                'y': round(y1 / height, 4),
                'w': round(bw / width, 4),
                'h': round(bh / height, 4),
            },
            'detScore': conf,
            'provider': 'yolov8_face',
        })
    return faces[:8]


def face_detect_frame(image_data_url):
    """在全帧上检测多张人脸；可选 YOLOv8-face + InsightFace（FACE_DETECTOR=insightface|yolo|both）。"""
    if cv2 is None:
        return {'ok': False, 'provider': 'insightface_arcface', 'error': 'missing_dependencies'}
    raw = _decode_data_url(image_data_url)
    image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        return {'ok': False, 'provider': 'insightface_arcface', 'error': 'decode_failed'}
    height, width = image.shape[:2]
    mode = os.environ.get('FACE_DETECTOR', 'insightface').strip().lower()
    results = []
    providers = []

    if mode in ('yolo', 'both'):
        yolo_faces = _detect_yolo_faces(image)
        if yolo_faces:
            providers.append('yolov8_face')
            results.extend(yolo_faces)

    if mode in ('insightface', 'both') and insightface is not None:
        global _FACE_APP
        if _FACE_APP is None:
            model_name = os.environ.get('FACE_MODEL_NAME', 'buffalo_s')
            with contextlib.redirect_stdout(sys.stderr):
                _FACE_APP = insightface.app.FaceAnalysis(name=model_name, providers=['CPUExecutionProvider'])
                _FACE_APP.prepare(ctx_id=0, det_size=(640, 640))
        with contextlib.redirect_stdout(sys.stderr):
            faces = _FACE_APP.get(image)
        if faces:
            providers.append('insightface_arcface')
        for index, face in enumerate(faces[:8]):
            x1, y1, x2, y2 = face.bbox
            bw = max(1.0, float(x2 - x1))
            bh = max(1.0, float(y2 - y1))
            entry = {
                'faceIndex': len(results) + index,
                'embedding': _normalize(face.embedding),
                'bboxNorm': {
                    'x': round(float(x1 / width), 4),
                    'y': round(float(y1 / height), 4),
                    'w': round(float(bw / width), 4),
                    'h': round(float(bh / height), 4),
                },
                'detScore': float(face.det_score),
                'provider': 'insightface_arcface',
            }
            results.append(entry)

    if mode == 'both' and len(results) > 1:
        deduped = []
        for item in sorted(results, key=lambda x: x.get('detScore', 0), reverse=True):
            arr = [item['bboxNorm']['x'], item['bboxNorm']['y'], item['bboxNorm']['w'], item['bboxNorm']['h']]
            if any(
                abs(arr[0] - d['bboxNorm']['x']) < 0.04
                and abs(arr[1] - d['bboxNorm']['y']) < 0.04
                for d in deduped
            ):
                continue
            deduped.append(item)
        results = deduped[:8]

    provider = '+'.join(providers) if providers else 'none'
    return {
        'ok': True,
        'provider': provider,
        'faces': results,
        'count': len(results),
    }


def voice_embedding(audio_data_url):
    raw = _decode_data_url(audio_data_url)
    if torch is None or torchaudio is None or EncoderClassifier is None:
        return {
            'ok': False,
            'provider': 'speechbrain_ecapa',
            'error': 'missing_dependencies',
            'detail': 'Install torchaudio + speechbrain to enable real speaker embeddings.',
        }
    global _VOICE_MODEL
    if _VOICE_MODEL is None:
        source = os.environ.get('VOICE_MODEL_SOURCE', 'speechbrain/spkrec-ecapa-voxceleb')
        _VOICE_MODEL = EncoderClassifier.from_hparams(source=source, savedir=os.path.expanduser('~/.cache/speechbrain/spkrec-ecapa-voxceleb'))
    waveform, sample_rate = torchaudio.load(BytesIO(raw))
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)
    if sample_rate != 16000:
        waveform = torchaudio.functional.resample(waveform, sample_rate, 16000)
    embedding = _VOICE_MODEL.encode_batch(waveform).squeeze().detach().cpu().numpy()
    return {
        'ok': True,
        'provider': 'speechbrain_ecapa',
        'embedding': _normalize(embedding),
        'sample_rate': 16000,
    }


def face_emotion(image_data_url):
    """ViT-FER（transformers）对人脸 crop 做情绪分类 + valence/arousal。"""
    model_id = os.environ.get('EMOTION_FACE_MODEL', 'trpakov/vit-face-expression')
    if cv2 is None or torch is None:
        return {
            'ok': False,
            'provider': 'vit_fer',
            'error': 'missing_dependencies',
            'detail': 'pip install opencv-python torch transformers pillow 后可启用人脸情绪识别。',
        }
    try:
        from PIL import Image
        from transformers import ViTForImageClassification, ViTImageProcessor
    except Exception as exc:
        return {
            'ok': False,
            'provider': 'vit_fer',
            'error': 'missing_dependencies',
            'detail': f'pip install torch transformers pillow 后可启用 ViT-FER。({type(exc).__name__})',
        }
    global _VIT_FER_MODEL, _VIT_FER_PROCESSOR
    if _VIT_FER_MODEL is None:
        with contextlib.redirect_stdout(sys.stderr):
            _VIT_FER_PROCESSOR = ViTImageProcessor.from_pretrained(model_id)
            _VIT_FER_MODEL = ViTForImageClassification.from_pretrained(model_id)
            _VIT_FER_MODEL.eval()
    raw = _decode_data_url(image_data_url)
    image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        return {'ok': False, 'provider': 'vit_fer', 'error': 'decode_failed'}
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(rgb)
    with contextlib.redirect_stdout(sys.stderr):
        inputs = _VIT_FER_PROCESSOR(images=pil, return_tensors='pt')
        with torch.no_grad():
            logits = _VIT_FER_MODEL(**inputs).logits[0]
        probs = torch.softmax(logits, dim=-1).detach().cpu().numpy()
    id2label = _VIT_FER_MODEL.config.id2label
    scores = {}
    for idx, prob in enumerate(probs):
        name = str(id2label.get(idx, idx)).strip().lower()
        canon = LABEL_CANON.get(name, name)
        scores[canon] = round(scores.get(canon, 0.0) + float(prob), 4)
    top = max(scores, key=scores.get)
    valence, arousal = _scores_to_va(scores)
    return {
        'ok': True,
        'provider': 'vit_fer',
        'model': model_id,
        'emotion': top,
        'confidence': scores[top],
        'scores': scores,
        'valence': valence,
        'arousal': arousal,
    }


def voice_emotion(audio_data_url):
    """WavLM SER（transformers）对一段语音做情绪分类 + valence/arousal。"""
    model_id = os.environ.get('SER_MODEL', 'jihedjabnoun/wavlm-base-emotion')
    ser_provider = 'wavlm_ser'
    if torch is None or torchaudio is None:
        return {
            'ok': False,
            'provider': ser_provider,
            'error': 'missing_dependencies',
            'detail': 'pip install torch torchaudio 后可启用真实语音情绪识别。',
        }
    try:
        from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
    except Exception as exc:
        return {
            'ok': False,
            'provider': ser_provider,
            'error': 'missing_dependencies',
            'detail': f'pip install transformers 后可启用真实语音情绪识别。({type(exc).__name__})',
        }
    global _SER_MODEL, _SER_EXTRACTOR
    if _SER_MODEL is None:
        with contextlib.redirect_stdout(sys.stderr):
            _SER_EXTRACTOR = AutoFeatureExtractor.from_pretrained(model_id)
            _SER_MODEL = AutoModelForAudioClassification.from_pretrained(model_id)
            _SER_MODEL.eval()
    mime, raw = _decode_data_url_with_mime(audio_data_url)
    try:
        samples = _load_audio_via_ffmpeg(raw, mime)
    except Exception as exc:
        return {
            'ok': False,
            'provider': ser_provider,
            'error': 'audio_decode_failed',
            'detail': f'{type(exc).__name__}: {exc}. webm/opus 解码通常需要 ffmpeg。',
        }
    if samples.size < 16000 * 0.4:
        return {'ok': False, 'provider': ser_provider, 'error': 'audio_too_short'}
    if float(np.abs(samples).mean()) < 1e-4:
        return {'ok': False, 'provider': ser_provider, 'error': 'audio_silent'}
    with contextlib.redirect_stdout(sys.stderr):
        inputs = _SER_EXTRACTOR(samples, sampling_rate=16000, return_tensors='pt', padding=True)
        with torch.no_grad():
            logits = _SER_MODEL(**inputs).logits[0]
        probs = torch.softmax(logits, dim=-1).detach().cpu().numpy()
    id2label = _SER_MODEL.config.id2label
    scores = {}
    for idx, prob in enumerate(probs):
        name = str(id2label.get(idx, idx)).strip().lower()
        canon = LABEL_CANON.get(name, name)
        scores[canon] = round(scores.get(canon, 0.0) + float(prob), 4)
    top = max(scores, key=scores.get)
    valence, arousal = _scores_to_va(scores)
    return {
        'ok': True,
        'provider': ser_provider,
        'model': model_id,
        'emotion': top,
        'confidence': scores[top],
        'scores': scores,
        'valence': valence,
        'arousal': arousal,
    }


def emotion_probe():
    """快速汇报情绪模型依赖是否就绪，供 /api/health 使用（只查 spec，不真正导入）。"""
    token = os.environ.get('PYANNOTE_HF_TOKEN', '')
    pyannote_pkg = _module_available('pyannote.audio')
    pyannote_ready = bool(torch is not None and pyannote_pkg and token)
    if token and not pyannote_pkg:
        dia_detail = 'PYANNOTE_HF_TOKEN set but pyannote.audio not installed (pip install pyannote.audio)'
    elif pyannote_pkg and not token:
        dia_detail = 'pyannote.audio installed; set PYANNOTE_HF_TOKEN in .env'
    elif pyannote_ready:
        dia_detail = 'pyannote.audio ready'
    else:
        dia_detail = 'pyannote not configured (PYANNOTE_HF_TOKEN + pip install pyannote.audio)'
    ser_model = os.environ.get('SER_MODEL', 'jihedjabnoun/wavlm-base-emotion')
    yolo_ready = bool(_module_available('ultralytics') and os.environ.get('FACE_DETECTOR', 'insightface').lower() in ('yolo', 'both'))
    face_detector = os.environ.get('FACE_DETECTOR', 'insightface').strip().lower()
    face_model = os.environ.get('EMOTION_FACE_MODEL', 'trpakov/vit-face-expression')
    return {
        'ok': True,
        'faceEmotionReady': bool(cv2 is not None and torch is not None and _module_available('transformers')),
        'voiceEmotionReady': bool(torch is not None and torchaudio is not None and _module_available('transformers')),
        'diarizationReady': pyannote_ready,
        'diarizationDetail': dia_detail,
        'yoloFaceReady': yolo_ready,
        'faceDetectorMode': face_detector,
        'faceProvider': 'vit_fer',
        'voiceProvider': 'wavlm_ser',
        'serProviderLabel': 'WavLM · SER',
        'emotionFusion': 'mdat',
        'faceModel': face_model,
        'voiceModel': ser_model,
    }


def _get_pyannote_pipeline():
    global _PYANNOTE_PIPELINE
    if _PYANNOTE_PIPELINE is not None:
        return _PYANNOTE_PIPELINE
    token = os.environ.get('PYANNOTE_HF_TOKEN', '')
    if not token:
        return None
    try:
        from pyannote.audio import Pipeline
    except Exception:
        return None
    model_id = os.environ.get('PYANNOTE_MODEL', 'pyannote/speaker-diarization-3.1')
    with contextlib.redirect_stdout(sys.stderr):
        try:
            _PYANNOTE_PIPELINE = Pipeline.from_pretrained(model_id, use_auth_token=token)
        except TypeError:
            _PYANNOTE_PIPELINE = Pipeline.from_pretrained(model_id, token=token)
    return _PYANNOTE_PIPELINE


def _try_pyannote_diarization(raw, mime):
    pipeline = _get_pyannote_pipeline()
    if pipeline is None:
        return None
    # pyannote 4.x 在 Windows 上 torchcodec 常不可用；用 ffmpeg 解码后以 tensor 喂给 pipeline。
    samples = _load_audio_via_ffmpeg(raw, mime)
    waveform = torch.from_numpy(samples).unsqueeze(0)
    diarization = pipeline({'waveform': waveform, 'sample_rate': 16000})
    segments = []
    speakers = set()
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        speakers.add(speaker)
        segments.append({
            'startMs': int(turn.start * 1000),
            'endMs': int(turn.end * 1000),
            'durationMs': int((turn.end - turn.start) * 1000),
            'speaker': str(speaker),
            'provider': 'pyannote_3.1',
        })
    return {
        'segments': segments,
        'speakerCount': len(speakers),
        'provider': 'pyannote_3.1',
    }


def speech_diarization(audio_data_url):
    """任务2：仅 pyannote 3.1 说话人 diarization，无 energy VAD 降级。"""
    mime, raw = _decode_data_url_with_mime(audio_data_url)
    token = os.environ.get('PYANNOTE_HF_TOKEN', '')
    if not token:
        return {
            'ok': False,
            'provider': 'pyannote_3.1',
            'error': 'pyannote_not_configured',
            'detail': 'Set PYANNOTE_HF_TOKEN in .env and accept HuggingFace model terms.',
        }
    if not _module_available('pyannote.audio'):
        return {
            'ok': False,
            'provider': 'pyannote_3.1',
            'error': 'missing_dependencies',
            'detail': 'pip install pyannote.audio',
        }
    try:
        pyannote_result = _try_pyannote_diarization(raw, mime)
        if pyannote_result:
            return {'ok': True, **pyannote_result}
    except Exception as exc:
        return {
            'ok': False,
            'provider': 'pyannote_3.1',
            'error': 'pyannote_failed',
            'detail': f'{type(exc).__name__}: {exc}',
        }
    return {
        'ok': False,
        'provider': 'pyannote_3.1',
        'error': 'no_speech',
        'detail': 'pyannote returned no segments for this clip.',
    }


def face_embeddings_batch(payload):
    crops = payload.get('crops') or []
    if not crops:
        return {'ok': False, 'provider': 'insightface_arcface', 'error': 'no_crops'}
    faces = []
    for item in crops[:8]:
        face_id = item.get('faceId') or item.get('id')
        image = item.get('image') or item.get('faceCrop')
        result = face_embedding(image)
        result['faceId'] = face_id
        faces.append(result)
    ok_any = any(item.get('ok') for item in faces)
    return {
        'ok': ok_any,
        'provider': 'insightface_arcface',
        'faces': faces,
    }


def handle_payload(payload):
    task = payload.get('task')
    if task == 'face_embedding':
        return face_embedding(payload.get('image'))
    if task == 'face_embeddings_batch':
        return face_embeddings_batch(payload)
    if task == 'face_detect_frame':
        return face_detect_frame(payload.get('frame') or payload.get('image'))
    if task == 'voice_embedding':
        return voice_embedding(payload.get('audio'))
    if task == 'face_emotion':
        return face_emotion(payload.get('image'))
    if task == 'faces_emotion_batch':
        return faces_emotion_batch(payload)
    if task == 'voice_emotion':
        return voice_emotion(payload.get('audio'))
    if task == 'emotion_probe':
        return emotion_probe()
    if task == 'speech_diarization':
        return speech_diarization(payload.get('audio'))
    return {'ok': False, 'error': 'unknown_task'}


def main_jsonl():
    for line in sys.stdin:
        request_id = None
        try:
            payload = json.loads(line or '{}')
            request_id = payload.get('_id')
            result = handle_payload(payload)
        except Exception as exc:
            result = {'ok': False, 'error': type(exc).__name__, 'detail': str(exc)}
        if request_id is not None:
            result['_id'] = request_id
        _json_response(result)
        sys.stdout.flush()


def main():
    try:
        payload = _read_payload()
        _json_response(handle_payload(payload))
    except Exception as exc:
        _json_response({'ok': False, 'error': type(exc).__name__, 'detail': str(exc)})


if __name__ == '__main__':
    if '--jsonl' in sys.argv:
        main_jsonl()
    else:
        main()
