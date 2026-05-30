#!/usr/bin/env python3
import base64
import contextlib
import json
import math
import os
import sys
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
    from speechbrain.inference.speaker import EncoderClassifier
except Exception:
    torch = None
    torchaudio = None
    EncoderClassifier = None

_FACE_APP = None
_VOICE_MODEL = None


def _json_response(payload):
    print(json.dumps(payload, ensure_ascii=False))


def _read_payload():
    return json.loads(sys.stdin.read() or '{}')


def _decode_data_url(data_url):
    if not data_url or ',' not in data_url:
        raise ValueError('invalid_data_url')
    _, raw = data_url.split(',', 1)
    return base64.b64decode(raw)


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


def main():
    try:
        payload = _read_payload()
        task = payload.get('task')
        if task == 'face_embedding':
            _json_response(face_embedding(payload.get('image')))
        elif task == 'voice_embedding':
            _json_response(voice_embedding(payload.get('audio')))
        else:
            _json_response({'ok': False, 'error': 'unknown_task'})
    except Exception as exc:
        _json_response({'ok': False, 'error': type(exc).__name__, 'detail': str(exc)})


if __name__ == '__main__':
    main()
