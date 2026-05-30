# HRI 陪伴机器人 Demo 实习生交接文档

本文档面向后续接手这个项目的实习生。目标是帮助你们理解当前 demo 已经做到哪里、为什么这样设计、还能继续探索哪些方向，以及每个方向应该如何验收。

这个项目不是一个普通聊天机器人页面。它的目标是验证：一个长期在场的具身 AI 陪伴体，是否可以通过摄像头、麦克风、VLM、身份识别、关系记忆和主动策略，形成“懂人、懂场景、懂时机”的产品体验。

## 1. 项目目标

我们要做的是一个 embodied relationship agent：

```text
一个长期在场的陪伴智能体，能理解面前是谁、他正在做什么、哪些物品和他有关、什么时候不该打扰、什么时候可以低侵入地回应。
```

核心产品判断：

```text
在场感 + 感知能力 + 时机判断 + 关系记忆 > 单纯聊天能力
```

这个 demo 给投资人看的时候，要让对方相信三件事：

1. 它真的在感知用户和环境。
2. 它能持续记住人、物品、偏好和最近发生的事。
3. 它会用这些记忆决定什么时候说、怎么说、什么时候保持安静。

## 2. 当前项目状态

先读：

```text
PROJECT_PROGRESS.md
```

那份文档记录了当前进度、已实现模块、风险和后续建议。

当前 demo 已经具备：

- 中心视频舞台式前端页面
- 摄像头自检
- MediaPipe 人脸追踪和 blendshape 显示
- 互动状态推断
- 三帧 VLM 场景理解
- 持续场景记忆图
- 关系记忆
- 显式身份选择
- 人脸身份识别后端路线：InsightFace / ArcFace
- 声纹身份识别后端路线：SpeechBrain ECAPA
- 基于 SenseAudio-compatible messages API 的 LLM 对话
- 主动性策略层

## 3. 运行方式

进入项目根目录：

```bash
cd /Users/xiaoxiaobo/Documents/HRI
```

启动服务：

```bash
LLM_PROVIDER=openai-compatible \
LLM_BASE_URL=https://api.senseaudio.cn/v1 \
LLM_MODEL=senseaudio-s2 \
LLM_WIRE_API=messages \
LLM_MAX_TOKENS=16384 \
LLM_TIMEOUT_MS=600000 \
MAX_REQUEST_BYTES=12582912 \
FACE_MODEL_NAME=buffalo_s \
IDENTITY_TIMEOUT_MS=180000 \
node server.mjs
```

打开：

```text
http://localhost:8173/
```

每次改前端后，浏览器要强制刷新：

```text
Cmd + Shift + R
```

## 4. 关键文件说明

```text
index.html            页面结构
styles.css            页面视觉设计和布局
app.js                前端感知、身份、记忆、对话、策略逻辑
server.mjs            Node 后端，负责 LLM / VLM / identity API
identity_worker.py    Python 身份识别 worker，负责人脸和声纹 embedding
README.md             基础运行说明
PROJECT_PROGRESS.md   当前项目进度总览
HANDOVER_README.md    本交接文档
vendor/mediapipe/     本地 MediaPipe 资源
```

## 5. 当前技术架构

```text
浏览器端
  摄像头 / 麦克风
  -> MediaPipe 人脸追踪
  -> 音频能量和声纹录音
  -> VLM 抽帧
  -> localStorage 本地记忆
  -> UI 可视化

Node 后端
  /api/chat
  /api/vision
  /api/identity/enroll
  /api/identity/voice/enroll

Python worker
  InsightFace / ArcFace 人脸 embedding
  SpeechBrain ECAPA 声纹 embedding

模型端
  SenseAudio-compatible messages endpoint
```

## 6. 调试基础

### 6.1 摄像头

先点页面里的：

```text
只测试摄像头
```

如果“只测试摄像头”都失败，不要先查 MediaPipe。优先检查：

- 浏览器摄像头权限
- macOS 系统摄像头权限
- 摄像头是否被 Zoom、微信、其他浏览器占用
- 当前页面是否是 `http://localhost:8173/`

如果“只测试摄像头”成功，但“启动感知 demo”失败，再查：

- MediaPipe WASM
- FaceLandmarker 模型
- 麦克风权限
- 浏览器对 WASM / GPU 的限制

### 6.2 人脸追踪

看视频区域左下角的 `Face HUD`。

好状态：

```text
Face tracked · 478 landmarks · ...
```

坏状态：

```text
Face model failed: ...
Face model: ready · no face detected
ready=false
present=false
landmarks=0
```

绑定人脸需要：

```text
ready=true · present=true · landmarks≈478 · descriptor=true
```

如果没有满足这个状态，绑定人脸一定会失败。

### 6.3 VLM 场景理解

当前逻辑是：

```text
每 3 秒抽 1 帧
累计 3 帧
大约每 9-10 秒送给 VLM 做一次场景理解
```

好状态：

```text
source vlm · 3 frames
```

坏状态：

```text
source local_fallback
local_after_vlm_error
request_body_too_large
Failed to fetch
```

如果遇到 `Failed to fetch`，先查：

- `server.mjs` 是否还在运行
- `MAX_REQUEST_BYTES` 是否足够大
- 场景理解面板显示的 payload 大小
- `/api/vision` 空请求是否能返回 JSON

### 6.4 身份识别

当前身份识别有三路信号：

1. 显式身份选择
2. 人脸 embedding
3. 声纹 embedding

显式身份优先级最高，因为它最合规、最可靠。

不要把 fallback 当成真实身份识别。

如果真实模型没准备好，UI 必须显示：

```text
真实人脸识别未就绪
真实声纹识别未就绪
```

## 7. 重要设计原则

### 7.1 不要说机器人在诊断情绪

应该说：

```text
互动状态
readiness
arousal
energy
quiet need
face signals
```

不要说：

```text
你很伤心
你抑郁了
你生气了
```

原因：表情、声音和姿态只能作为互动线索，不能作为心理诊断。

### 7.2 记忆必须可见、可编辑、可删除

好的设计：

```text
我记得你压力大时不喜欢被追问原因。
```

坏的设计：

```text
系统偷偷保存敏感推断，用户看不到也删不掉。
```

### 7.3 人和物的所属关系只能作为弱证据

如果机器人看到用户旁边有一个杯子，不要直接说：

```text
这是你的杯子。
```

应该说：

```text
这个杯子多次和你一起出现。
你可能经常使用这个杯子。
```

当前场景记忆里用的是：

```text
possibly_owns_or_uses
```

也就是“可能拥有或使用”。

### 7.4 主动性要低侵入

一个好的陪伴机器人不应该频繁打断用户。

推荐顺序：

```text
观察 -> 等待 -> 轻量 check-in -> 短回应 -> 退出
```

## 8. 实习生可选项目方向

每次只选一个方向做，不要同时改很多东西。

### 方向 A：稳定真实人脸身份识别

当前问题：

人脸身份识别接口已经接上 InsightFace / ArcFace 路线，但绑定质量取决于 face crop 和模型运行状态。

任务：

- 用 MediaPipe bbox 裁剪真实人脸，而不是直接截整张视频图。
- 把 face crop 发给 `/api/identity/enroll`。
- UI 显示 provider：`insightface_arcface` 或 fallback。
- 每个人保存多张人脸样本。
- 增加 `/api/identity/face/match`。
- UI 显示 top-3 候选人和分数。

验收标准：

- 清晰正脸绑定时，返回 `provider=insightface_arcface`。
- 同一个人再次出现时能稳定匹配。
- crop 不好时返回 `no_face`，UI 有明确提示。
- 系统不会把 fallback 伪装成真实身份识别。

### 方向 B：稳定真实声纹识别

当前问题：

声纹接口已经接入 SpeechBrain ECAPA 路线，但模型下载和运行还需要稳定。

任务：

- 确保 SpeechBrain ECAPA 模型能稳定下载并缓存。
- 前端录 3-5 秒用户声音。
- 发给 `/api/identity/voice/enroll`。
- 增加 `/api/identity/voice/match`。
- 每个人保存多个声纹样本。
- UI 显示声纹 provider 和分数。

验收标准：

- 用户可以成功绑定声纹。
- 用户再次说话时能得到稳定候选人。
- 静音或噪音音频会被拒绝。
- UI 清楚区分 `speechbrain_ecapa` 和 fallback。

### 方向 C：改进场景记忆图

当前问题：

现在 scene memory 主要靠物体 label 合并，不是真正的 object re-id。

任务：

- 让 VLM 尽量返回物体 bbox。
- 存储物体位置历史。
- 区分“同名物体”和“同一个物体实例”。
- 给人物-物体关系加置信度。
- 增加物体消失、重新出现事件。
- 在 UI 里显示物体时间线。

验收标准：

- 同一个杯子、电脑、手机跨多轮保持稳定 ID。
- 新物体会创建新 ID。
- 人物-物体关系显示弱、中、强置信度。
- 场景记忆图能被非技术观众理解。

### 方向 D：做投资人演示模式

当前问题：

系统能力很多，但投资人需要一个 90 秒能看懂的故事。

任务：

- 增加 `Demo Mode` 按钮。
- 设计一个脚本流程：
  1. 启动摄像头
  2. 识别人物
  3. 理解场景
  4. 生成物体记忆
  5. 判断不该打扰
  6. 用户开口
  7. 机器人结合记忆回应
- 每一步高亮相关面板。
- 给每一步加一句短解释。

验收标准：

- 观众 90 秒内能理解产品价值。
- 不需要读完所有面板。
- 中心视频始终是视觉主角。

### 方向 E：增加隐私和控制面板

当前问题：

系统会在 localStorage 里保存身份、记忆和场景数据，需要用户控制入口。

任务：

- 增加隐私控制面板。
- 增加按钮：
  - 暂停摄像头
  - 暂停麦克风
  - 删除人物档案
  - 删除场景记忆
  - 删除关系记忆
  - 导出记忆 JSON
- 显示最近一次发给 VLM / LLM 的 payload 摘要。

验收标准：

- 用户能一键清空所有本地记忆。
- 用户能看到最近模型请求的大致内容。
- 摄像头和麦克风状态明显可见。

### 方向 F：改进主动性策略

当前问题：

主动策略还是比较简单的规则系统。

任务：

- 增加 policy state machine。
- 状态包括：
  - observing
  - cooldown
  - soft check-in
  - conversation
  - quiet mode
  - boundary-sensitive mode
- 增加 reason trace。
- 增加每个人的主动性偏好。
- 让反馈按钮影响后续策略。

验收标准：

- 机器人不会连续频繁打扰。
- 用户反馈会改变未来行为。
- 每一次主动行为都有清楚原因。

### 方向 G：继续打磨投资人前端

当前问题：

页面已经改成中心视频舞台，但仍然信息密度较高。

任务：

- 优化视觉层级。
- 增加 focus mode / advanced mode。
- 默认隐藏低层 telemetry。
- 强化 VLM 理解、身份、记忆和主动回应之间的视觉联系。
- 状态变化时增加适度动效。

验收标准：

- 不解释也能看懂主故事。
- 视频、VLM、身份、记忆、回应之间关系清晰。
- 笔记本屏幕上不需要大量滚动。

## 9. 开发规则

### 9.1 一次只验证一个主要改动

错误做法：

```text
同时改 UI、身份识别、VLM prompt、scene memory。
```

正确做法：

```text
这次只改 face crop 质量，然后验证人脸绑定是否更稳。
```

### 9.2 所有失败都要可见

模型可能失败，就必须显示失败原因。

例子：

```text
model_not_loaded
no_face
audio_too_short
vlm_parse_failed
request_body_too_large
```

### 9.3 fallback 必须明确标注

好的做法：

```text
provider=spectral_fallback
provider=mediapipe_descriptor_adapter
```

坏的做法：

```text
把 fallback 假装成真实人脸识别或真实声纹识别。
```

### 9.4 注意隐私

不要偷偷上传图像、音频或身份信息。

如果要发给模型 endpoint，UI 或日志里必须能看到。

## 10. 验收清单

### 基础应用

```text
[ ] 页面能打开 http://localhost:8173
[ ] 只测试摄像头可用
[ ] 启动感知 demo 可用
[ ] 没有 JS 语法错误
```

### 人脸

```text
[ ] Face HUD 进入 tracked 状态
[ ] landmarks 数量非 0
[ ] blendshape 列表更新
[ ] 绑定人脸有明确成功或失败信息
```

### VLM

```text
[ ] 成功采样 3 帧
[ ] /api/vision 返回 source=vlm 或明确错误
[ ] 场景理解面板更新
[ ] 场景记忆图更新
```

### 身份

```text
[ ] 显式身份选择可用
[ ] 人脸绑定返回 provider 信息
[ ] 声纹绑定返回 provider 信息
[ ] 三路融合分数更新
```

### 记忆

```text
[ ] 可以新增关系记忆
[ ] 不同人物切换时记忆不同
[ ] scene memory 跨 VLM 调用持续存在
[ ] 删除或重置行为可用，或者至少有文档说明
```

### 对话

```text
[ ] 文本对话可用
[ ] LLM 回复带上下文
[ ] LLM 失败时 fallback 有标注
[ ] TTS 可以开关
```

## 11. 常见失败模式

### 摄像头打开了，但绑定人脸失败

检查：

```text
Face enrollment debug
Face HUD
MediaPipe model status
光线、距离、人脸大小
```

绑定需要：

```text
ready=true · present=true · landmarks≈478 · descriptor=true
```

### VLM 出现 Failed to fetch

检查：

```text
server 是否还在运行
MAX_REQUEST_BYTES 是否足够大
scene status 显示的 payload size
/api/vision 空请求是否可用
```

### VLM 读不到图片

当前 SenseAudio messages endpoint 使用 Anthropic 风格 base64 图片格式，不是 OpenAI `image_url`。

正确格式：

```json
{
  "type": "image",
  "source": {
    "type": "base64",
    "media_type": "image/jpeg",
    "data": "..."
  }
}
```

### InsightFace 日志污染 JSON

InsightFace 默认会往 stdout 打日志。现在 worker 已经把日志重定向到 stderr。如果未来 JSON 又解析失败，优先检查 stdout 是否被日志污染。

### 声纹模型下载失败

SpeechBrain 需要从 HuggingFace 下载模型。网络或 SSL 会导致失败。模型没缓存成功前，不要说真实声纹识别已经 ready。

## 12. 不要做什么

不要：

- 宣称机器人能做医学情绪诊断
- 宣称当前身份识别达到 FaceID 级别
- 隐藏上传图像、音频或身份数据
- 把 fallback 伪装成真实识别
- 一次提交很多无关改动
- 系统稳定前删除 debug 面板

## 13. 最终产品故事

实习生所有改动都应该朝这个故事收敛：

```text
机器人看到 Alex 回到桌前。
它通过显式身份、人脸和声纹证据识别 Alex。
它记得 Alex 累的时候不喜欢被追问原因。
它看到电脑、手机和杯子，并知道这些物品过去多次和 Alex 一起出现。
它观察到 Alex 正在专注工作，interruptibility 很低。
它选择不打扰。
当 Alex 主动开口时，它用很短的方式回应，并结合 Alex 的关系记忆。
如果它判断错了，Alex 可以纠正或删除记忆。
```

这才是这个 demo 要证明的核心能力。
