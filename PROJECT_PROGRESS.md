# HRI Companion Demo 项目进度

更新时间：2026-05-30

## 当前定位

本项目是一个具身陪伴机器人 demo，目标不是做普通聊天框，而是验证：

```text
摄像头/麦克风感知 + VLM 场景理解 + 身份识别 + 关系记忆 + 主动策略
```

能否形成一个“长期在场、理解人和环境、知道什么时候该说话”的关系型智能体。

## 已实现模块

### 1. 投资人演示前端

- 中心视频舞台布局。
- 左右围绕身份、关系记忆、VLM 场景理解、场景记忆图、主动策略等面板。
- 页面视觉已从工程仪表盘调整为 investor demo 叙事结构。

### 2. 摄像头和麦克风

- 支持完整感知启动。
- 支持“只测试摄像头”，用于排查权限问题。
- 摄像头状态、错误原因会在 UI 上显示。

### 3. MediaPipe 人脸追踪

- 本地 vendored MediaPipe JS/WASM/model。
- FaceLandmarker 输出 bbox、landmarks、blendshapes。
- UI 显示 Face HUD 和实时人脸字段。

### 4. 互动状态推断

当前不做医学情绪诊断，而是输出：

- readiness
- arousal
- energy
- quiet need
- interaction state

状态用于判断机器人是否应该主动介入。

### 5. VLM 场景理解

- 每 3 秒抽 1 帧。
- 累计 3 帧后约 9-10 秒送一次 VLM。
- 使用 SenseAudio-compatible `messages` 接口。
- 图片格式使用 Anthropic 风格 base64 image part。
- 输出结构化场景 JSON：活动、物体、交互、动作变化、打断时机、建议动作。

### 6. 持续场景记忆

当前已有基础 scene memory：

- objects
- relations
- events
- object/relation/event counters

但目前仍偏 label-level，后续重点是升级为 instance-level relationship memory。

### 7. 身份和关系档案

当前有三路身份信号：

- 显式身份选择
- 人脸识别路线：InsightFace / ArcFace（**方向 A 已完成**）
- 声纹识别路线：SpeechBrain ECAPA

#### 方向 A：稳定真实人脸身份识别（已完成 2026-05-30）

- MediaPipe bbox 裁剪真实人脸（绑定时扩大边距，非整帧）。
- `POST /api/identity/enroll` + `POST /api/identity/face/match`。
- 启动时自动探测 Python/InsightFace；`/api/health` 与页面状态条。
- 每人多张 `faceEmbeddings`（InsightFace + 可选 fallback，UI 标明 provider）。
- Face match top-3 候选人；三路融合显示 `face(insightface …)`。
- 一键清空人物档案；Windows 根路径 `/` 可访问。
- 一键启动：`start.ps1`。

验收对照（HANDOVER 方向 A）：

- [x] 清晰正脸绑定 `provider=insightface_arcface`
- [x] 同一人再次出现可匹配（ArcFace cosine + top-3）
- [x] crop/检测失败时有明确时间线提示（含 `no_face`）
- [x] fallback 不伪装为真实识别（`mediapipe_fallback` 标签）

### 8. LLM 陪伴对话

- `/api/chat` 接入 SenseAudio-compatible messages API。
- 前端支持文本输入、ASR、TTS。
- 对话上下文包含人物、记忆、场景、状态、关系等信息。

## 当前主要风险

1. ~~真实人脸识别仍需稳定 face crop 和 InsightFace runtime~~ → 方向 A 已落地；极端侧脸/暗光仍可能 `no_face`。
2. 真实声纹识别依赖 SpeechBrain 模型下载和音频采样质量（方向 B）。
3. scene memory 当前还不是实例级 object re-id。
4. 前端关系图谱还需要产品化显化。
5. 隐私控制面板可继续补齐（已有清空档案；导出/全量 purge 待做）。

## 重点下一步

方向 A 完成后，建议任选其一推进：

```text
方向 B：稳定真实声纹识别（HANDOVER_README）
实例级关系图谱显化（TASK_GUIDE.md）
四层记忆架构（UST/ST/WM/LT）
```

项目交接说明见：

```text
HANDOVER_README.md
```

## 运行方式（Windows 推荐）

```powershell
cd D:\Onana\hri-companion-demo-main
.\start.ps1
```

浏览器打开：

```text
http://127.0.0.1:8173/
```

首次 InsightFace 会下载 `buffalo_s` 模型，绑定时请保持 node 终端不关。

手动启动（可选）：

```powershell
$env:FACE_MODEL_NAME="buffalo_s"
$env:PYTHON_BIN="python"
$env:IDENTITY_TIMEOUT_MS="180000"
node server.mjs
```
