# HRI Companion Demo 项目进度

更新时间：2026-05-31

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

### 6. 实例级关系图谱（已完成 2026-05-31，TASK_GUIDE）

已从 label-level 升级为 instance-level relationship memory（对应 Kimi 记忆分层中的「情景记忆 / 图记忆」）：

- 物体实例化：VLM 返回 `{id,label,visual_description,bbox_norm,state}`，前端按「类别 + bbox 空间位置 + 外观描述」做实例匹配，区分同类不同物体（两个杯子）。
- 图像证据：按 `bbox_norm` 从当前帧裁剪缩略图，写入物体节点。
- 人-物关系：`person_id → object_id`，类型 `seen_with / uses / frequently_uses / owns_confirmed / rejected`，强度弱/中/强 + 置信度。
- 交互事件链：`holding/picking_up/putting_down/using/touching/looking_at` 累积升级关系强度并记录事件。
- 用户纠正即时生效：这是我的 / 不是我的 / 我经常用 / 只是偶尔 / 改名 / 删除（按钮 + 对话「是/不是」均可）。
- 低频主动确认：中/强假设关系会触发一次低打扰的所属确认（`ask-ownership`，60s 节流）。
- 关系进入策略：使用电脑等强/已确认关系会让 `interruptibility=low` 时给出可解释的低打扰理由。
- 跨轮持久：`localStorage('hri-demo-scene-memory')`，刷新后图谱不丢失，旧数据自动迁移。
- 多用户区分：relations 按 `person_id` 分离，同一 `obj_x` 可对不同人有不同关系。

验收对照（TASK_GUIDE 测试 1-8 / 演示场景）：

- [x] 桌面物体形成稳定实例 ID + 图像证据（场景 1）
- [x] 拿起水杯出现 `person → obj` 关系与事件（场景 2 / 测试 1-2）
- [x] 同类两物体不混淆（测试 3）
- [x] 用户确认所属升级为 `owns_confirmed`（测试 4）
- [x] 用户否认后不再断言归属（`rejected`，测试 5）
- [x] 关系进入打断策略而非仅展示（测试 6）
- [x] 刷新/多轮后图谱持久（测试 7）
- [x] 两个用户分开、同物体不同关系（测试 8）

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
3. ~~scene memory 当前还不是实例级 object re-id~~ → 已升级实例级图谱；物体 re-id 目前用 bbox+描述启发式，未来可换视觉 embedding。
4. ~~前端关系图谱还需要产品化显化~~ → 已显化（缩略图 + 关系强弱 + 用户纠正按钮）。
5. 隐私控制面板可继续补齐（已有清空档案；导出/全量 purge 待做）。

## 重点下一步

方向 A 与实例级关系图谱完成后，建议任选其一推进：

```text
方向 B：稳定真实声纹识别（HANDOVER_README）
物体视觉 re-id（用 embedding 替换 bbox 启发式匹配）
四层记忆架构（UST/ST/WM/LT，向量库 + RAG + 遗忘 + 反思）
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
