# 多模态情绪信号（Emotion）接入说明

本次在原 HRI 陪伴机器人 demo 上新增了 **实时多模态情绪信号**：面部 FER + 语音 SER 融合成 valence-arousal，喂给主动性策略层，并在前端新增一个会动的「多模态情绪信号」面板（编号 11）。

> 重要：严格沿用项目原则——只输出**情绪信号（线索）**，不做心理诊断。UI 与 LLM prompt 都明确标注「情绪信号，非心理诊断」，机器人不会把情绪标签念给用户。

---

## 1. 用了哪些模型（对应你给的清单）

| 模态 | 采用 | 对应清单 | 说明 |
| --- | --- | --- | --- |
| 面部 | **HSEmotion / EfficientNet**（AffectNet 8 类，可选多任务版输出 valence/arousal） | **#11 Savchenko（EfficientNet 多任务）** | 有现成 onnx 预训练权重、纯 onnxruntime、可离线，最贴合「轻量 FER + 直接复用」。`#9 EfficientFace`、`#10 A-MobileNet` 没有开箱即用的 pip 权重，已用同档定位的 HSEmotion 顶上；想换成它们只需在 worker 的 `face_emotion` 里替换推理调用即可。 |
| 语音 | **自监督/蒸馏 HuBERT 系 SER**（默认 `superb/hubert-large-superb-er`） | **#6 Distilled HuBERT for Mobile SER**（思路同源），可平滑过渡到 **#1 LIGHT-SERNET** | 走 transformers 的 `AutoModelForAudioClassification`，换 `SER_MODEL` 即可切到蒸馏/更轻的权重；与原项目「wav2vec/HuBERT 微调」描述一致。 |

落地方式：复用现有的 **Python worker（identity_worker.py）+ Node 后端（server.mjs）+ 前端（app.js）** 三层架构，新增 `face_emotion` / `voice_emotion` 两个 worker task 和 `/api/emotion/face`、`/api/emotion/voice` 两个接口。

---

## 2. 安装依赖（在跑 `node server.mjs` 的同一个 Python 环境里）

```bash
# 面部情绪（轻量，纯 onnx）
python -m pip install hsemotion-onnx onnxruntime opencv-python

# 语音情绪（首次会从 HuggingFace 下载权重）
python -m pip install torch torchaudio transformers
```

- 不装也能跑：模型未就绪时，前端**自动降级**为 blendshape（面部）/能量（语音）启发式，并在面板上明确标注 `fallback` / `模型未就绪`，绝不冒充真实识别。
- webm/opus 语音解码通常需要系统装 `ffmpeg`（macOS：`brew install ffmpeg`）。否则语音情绪会回 `audio_decode_failed`，面部情绪不受影响。
- `/api/health` 会返回 `faceEmotionReady` / `voiceEmotionReady`，前端面板与启动日志都会显示是否就绪。

可选环境变量（见 `.env.example`）：`EMOTION_FACE_MODEL`、`SER_MODEL`。

---

## 3. 能做出什么「fancy」效果

新面板（编号 11「多模态情绪信号」）包含：

1. **融合情绪环**：中央圆环，颜色=主导情绪、弧长=置信度、环宽=唤醒度，带平滑过渡动画。
2. **Valence-Arousal 实时平面**：二维情绪坐标上一个会动的光点 + 拖尾轨迹，四象限标注（愉悦/紧张/低落/兴奋），学术感强。
3. **双模态分解**：面部 FER 与语音 SER 各自的 provider、情绪、置信度条，并用 `real / fallback / 模型未就绪` 徽章区分真假。
4. **情绪时间线**：valence、arousal 最近约 1 分钟的滚动曲线，体现「长期在场、持续感知」。
5. **接入主动性策略**：融合后的 valence/arousal 会真实改写 `arousal / energy / quietNeed / readiness`，并在面板写出可解释的 reason（例如「情绪信号『低落』→ quiet need 上调」）。情绪也进入对话 snapshot.affect，让 LLM 只用作语气线索。

这几项里，**融合环 + V-A 平面 + 接入策略** 三个组合在演示时最抓眼球也最有说服力。

---

## 4. 验收时建议演示的链路

1. 启动感知 demo → 面板从「采集中」点亮为带颜色的融合环。
2. 微笑 → 面部 FER 走向 happy，光点移到右侧（高 valence），环变绿。
3. 皱眉/说话能量上升 → arousal 升高，光点上移，时间线起伏。
4. 切到「语音情绪采样：开」，说一句话 → 语音 SER 行出现 `real` 徽章与情绪。
5. 指出底部 reason：情绪如何改变了 interruptibility / 主动策略——强调这是**信号驱动策略**，不是诊断。
6. 关掉依赖或断网 → 面板自动标注 `fallback`，说明系统对失败是透明的。

---

## 5. 改了哪些文件

- `identity_worker.py`：新增 `face_emotion` / `voice_emotion` / `emotion_probe`（情绪模型惰性导入，不拖慢身份识别）。
- `server.mjs`：新增 `/api/emotion/face`、`/api/emotion/voice`，`/api/health` 增加情绪就绪字段，LLM prompt 增加 affect 使用规则。
- `app.js`：情绪采集（节流的面部/语音上传 + 两路 fallback）、加权融合、历史轨迹、策略接入、面板渲染、语音采样开关。
- `index.html` / `styles.css`：新增编号 11「多模态情绪信号」面板及样式。

---

## 6. 注意事项 / 已知限制

- worker 仍是「每次请求 spawn 一个 Python 进程」的架构，情绪调用节流到面部约 2.5s、语音约 6s。要更丝滑/上量产，建议改成常驻 worker（进程池或 FastAPI 常驻服务）。本次未改架构以遵守「一次只验证一个主要改动」。
- 语音情绪默认开启自动采样，但**可见、可一键关闭**，开启时会在时间线写事件，符合「不偷偷上传音频」的隐私原则。
- 因当前沙箱磁盘不足，未能在此环境跑 `node --check` / `py_compile` 自动语法校验；已逐段人工核对。首次本地启动请看 node 终端的 `Emotion models — face/voice ready` 日志确认。
