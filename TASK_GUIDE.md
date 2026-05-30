# 实习任务指南：实例级关系图谱显化

## 一、任务一句话描述

你要完成的是让机器人从“看见场景”升级到：

```text
我知道这个具体水杯和这个具体用户之间发生了什么交互，
并且这个关系会影响我之后怎么陪伴你。
```

重点不是识别物体类别，而是区分**具体物体实例**和**具体人物实例**，并在前端页面上清楚展示它们之间的关系。

---

## 二、当前系统已经具备什么

你可以直接基于这些已有能力继续开发：

### 1. 摄像头和视频流

- `启动感知 demo` 可以打开摄像头和麦克风。
- `只测试摄像头` 可以单独验证摄像头权限。

### 2. MediaPipe 人脸追踪

- 能检测脸是否存在。
- 能输出 478 个 face landmarks。
- 能输出 blendshapes（smile / brow / eye / mouth）。
- 能估计 head yaw / pitch。

### 3. VLM 场景理解

- 每 3 秒抽一帧，累计 3 帧后约每 9-10 秒送一次给 VLM。
- VLM 返回结构化 JSON：

```json
{
  "person_activity": "...",
  "objects": ["..."],
  "interactions": ["..."],
  "action_change": "...",
  "interruptibility": "low | medium | high",
  "reason": "...",
  "robot_action": "observe | soft_checkin | wait | encourage_break"
}
```

### 4. 现有 scene memory

`app.js` 里已经有：

```js
state.sceneMemory = {
  objects: [],
  relations: [],
  events: [],
  counters: { object: 0, relation: 0, event: 0 }
}
```

目前只是简单按 label 合并，没有真正区分实例。

### 5. 人物档案

用户可以输入名字并绑定人脸/声纹。不同人有独立记忆。

### 6. LLM 对话

后端 `/api/chat` 已接入 SenseAudio-compatible messages API，有 key 时走真实模型，没有时 fallback。

---

## 三、你需要做什么

### 核心目标

把当前的 `sceneMemory` 升级成 **实例级关系图谱**，并在前端页面清晰展示。

具体来说：

#### 1. 物体必须是实例级，不是类别级

错误做法：

```text
看到 cup，就认为是同一个 cup。
```

正确做法：

```text
看到 cup，只说明类别是 cup。
需要判断它是不是之前见过的 obj_3。
如果不是，创建新的 obj_id。
```

示例：

```text
obj_1 = 白色马克杯
obj_2 = 透明玻璃杯
obj_3 = 黑色保温杯
```

它们都可能被 VLM 叫做：

```text
cup / mug / water bottle
```

但系统要尽量区分它们是不同实例。

#### 2. 每个物体都要有图像证据

每个 object node 不能只有文字 label。

必须有：

```text
object_id
object_label
object_thumbnail（截图或缩略图）
visual_description（外观描述）
first_seen_at
last_seen_at
seen_count
```

例如：

```text
obj_7
label: mug
thumbnail: 白色杯子截图
visual_description: white ceramic mug with handle
seen_count: 8
```

前端必须显示这个 object 的图像或截图。

原因：

```text
如果只显示“水杯”，用户无法知道系统说的是哪个水杯。
```

#### 3. 人也必须是实例级

系统不能只说：

```text
user
```

而要区分：

```text
person_1 = Alex
person_2 = Bob
unknown_person_3
```

每个人物节点至少要有：

```text
person_id
display_name
face_thumbnail 或 avatar
identity_evidence（显式选择 / 人脸匹配 / 声纹匹配 / 未确认）
relationship_memory
```

如果系统不确定是谁，就显示：

```text
unknown_person
```

不要强行猜。

#### 4. 关系连接的是 person_id -> object_id

关系不能是：

```text
User -> cup
```

而应该是：

```text
person_1 -> obj_2
```

这样系统才知道：

```text
Alex 使用的是那个白色马克杯，不是另一个杯子。
```

#### 5. 关系来自交互行为，不只是出现频率

系统需要识别类似事件：

```text
用户拿起水杯
用户放下水杯
用户看向电脑
用户使用手机
用户靠近某个物体
用户远离某个物体
用户长时间面对电脑
用户把手伸向某个物体
```

这些事件应该进入关系记忆，并影响关系强度。

#### 6. 关系要有强弱或置信度

关系不能只有 yes/no。

应该有：

```text
weak     看见一次物体在桌上
medium   手接触物体 / 多次出现在附近
strong   多次拿起 / 长期使用
confirmed 用户明确确认
rejected   用户明确否认
```

前端需要能看出关系是弱、中、强，还是用户确认过的。

#### 7. 系统要适时询问用户确认所属权

当满足条件时，机器人可以低频询问：

```text
同一个物体多次和同一个用户交互
关系置信度中等但未确认
用户当前 interruptibility 不低
用户没有处于 quiet mode
最近没有问过类似问题
```

例子：

```text
“我注意到你经常用这个白色杯子，它是你常用的吗？”
```

不应该在用户专注工作时突然问。

#### 8. 用户纠正必须生效

前端每个物体/关系至少要支持：

```text
这是我的
这不是我的
我经常使用
只是偶然出现
删除
改名
```

用户操作后：

- 确认：关系变成 confirmed。
- 否认：关系变成 rejected。
- 删除：关系从图谱中移除。

后续 LLM/VLM prompt 会使用 confirmed/rejected 状态。

#### 9. 前端必须清楚展示关系图谱

你需要在页面上做出一个清晰的关系图谱或关系记忆面板。

它至少要展示：

```text
人物节点
物体节点
人物-物体关系
最近交互事件
关系证据
关系置信度或强弱程度
关系确认状态
```

观众应该能一眼看懂：

```text
这个机器人正在建立关于人、物、行为的长期记忆。
```

---

## 四、关键文件

你主要会修改这些文件：

```text
index.html            增加或改造关系图谱面板结构
styles.css            关系图谱面板视觉设计
app.js                关系图谱数据结构和渲染逻辑
server.mjs            如果需要调整 VLM prompt 或新增 API
identity_worker.py    一般不需要改
README.md             更新运行说明
TASK_GUIDE.md         本任务指南
```

---

## 五、验收测试

你必须通过以下所有测试才算完成任务。

### 测试 1：同类别多物体区分

场景：

```text
桌面上放两个杯子：
白色马克杯
透明玻璃杯
```

要求：

```text
前端不能只显示一个 cup。
应该显示 obj_1 和 obj_2。
每个都有自己的图像证据。
```

通过标准：

```text
用户能从 UI 上看出系统区分了两个具体杯子。
```

---

### 测试 2：人-物交互记录

场景：

```text
用户拿起白色马克杯，然后放下。
```

要求：

```text
前端出现 person_1 -> obj_1 的关系。
关系事件里能看到“拿起”或“使用”相关记录。
关系强度比单纯“水杯出现”更高。
```

通过标准：

```text
图谱不是只显示水杯出现次数，而是显示用户和水杯发生过交互。
```

---

### 测试 3：重复交互增强关系

场景：

```text
用户多次拿起同一个白色马克杯。
```

要求：

```text
person_1 -> obj_1 的关系强度提升。
关系证据数量增加。
```

通过标准：

```text
第一次可能是 weak / medium。
多次之后应变成 strong 或 frequently_uses。
```

---

### 测试 4：用户确认所属权

场景：

```text
用户回答：“是，这是我的杯子。”
```

要求：

```text
关系变成 confirmed。
后续机器人可以说：“你的白色杯子”。
```

通过标准：

```text
确认状态在前端可见。
后续回应会使用确认后的标签。
```

---

### 测试 5：用户否认所属权

场景：

```text
用户回答：“不是我的。”
```

要求：

```text
关系变成 rejected。
后续机器人不能再说：“你的杯子”。
```

通过标准：

```text
否认状态在前端可见。
后续策略不再使用错误关系。
```

---

### 测试 6：关系影响机器人回应

场景：

```text
用户正在电脑前工作。
系统已知道电脑和用户存在工作关系。
```

要求：

```text
机器人策略应倾向于低打扰。
前端能显示原因：
用户正在使用电脑 / 当前 interruptibility 低 / 不适合打断。
```

通过标准：

```text
关系图谱中的关系会进入策略判断，而不是只作为装饰展示。
```

---

### 测试 7：跨轮记忆持久

场景：

```text
刷新页面或等待多轮 VLM 更新。
```

要求：

```text
已有物体和关系不丢失。
localStorage 或其他本地存储里能恢复关系图谱。
```

通过标准：

```text
刷新后仍能看到之前的 User -> 水杯、User -> 电脑 等关系。
```

---

### 测试 8：两个用户区分

场景：

```text
两个不同用户轮流出现在摄像头前。
```

要求：

```text
person_1 和 person_2 分开。
同一个 obj_1 可以和不同 person 有不同关系。
```

例如：

```text
person_1 -> obj_1: owns_confirmed
person_2 -> obj_1: seen_with
```

通过标准：

```text
系统不会把 A 的物品错误归给 B。
```

---

## 六、功能展示时至少要演示的场景

最终你做功能展示时，至少要演示以下内容。

### 场景 1：桌面物体记忆

展示：

```text
摄像头看到桌面上的水杯、手机、电脑。
前端出现对应物体节点。
每个物体有稳定 ID 和图像证据。
```

必须说明：

```text
这些不是一次性识别结果，而是会进入长期 scene memory。
```

---

### 场景 2：拿起水杯

展示：

```text
用户拿起水杯。
关系图中出现 person_1 -> obj_1。
事件记录出现“拿起 / 使用 / 交互”。
```

必须说明：

```text
关系来自交互行为，不只是来自出现频率。
```

---

### 场景 3：重复交互增强关系

展示：

```text
用户多次拿起同一个水杯。
关系强度提升。
证据数量增加。
```

必须说明：

```text
系统会随着长期观察逐渐增强关系置信度。
```

---

### 场景 4：系统询问确认

展示：

```text
在合适时机，机器人问：
“这个白色杯子是你常用的吗？”
```

必须说明：

```text
系统会选择合适时机询问，而不是每次都问。
```

---

### 场景 5：用户确认所属权

展示：

```text
用户回答：“是，这是我的杯子。”
关系变成 confirmed。
后续机器人说：“你的白色杯子”。
```

必须说明：

```text
确认状态在前端可见，并影响后续回应。
```

---

### 场景 6：用户否认所属权

展示：

```text
用户点击“不是我的”或回答“不是我的”。
关系变成 rejected。
后续机器人不再说“你的杯子”。
```

必须说明：

```text
用户拥有最终控制权。
机器人不是监控，而是可纠正的关系记忆系统。
```

---

### 场景 7：关系影响机器人策略

展示：

```text
系统知道用户正在使用电脑。
机器人选择不打扰或只轻量回应。
```

必须说明：

```text
关系图谱不是静态展示，而是会影响主动性策略。
```

---

## 七、开发规则

### 1. 一次只做一个主要改动

错误做法：

```text
同时改 UI、身份识别、VLM prompt、scene memory。
```

正确做法：

```text
这次只做 instance-level object tracking，然后测试多杯子区分是否成功。
```

### 2. 所有失败都要可见

模型可能失败，就必须显示失败原因。

例子：

```text
model_not_loaded
no_face
audio_too_short
vlm_parse_failed
request_body_too_large
```

### 3. 不要隐藏 fallback

如果用了 fallback，必须标注为 fallback。

好的做法：

```text
provider=spectral_fallback
provider=mediapipe_descriptor_adapter
```

坏的做法：

```text
把 fallback 假装成真实人脸识别或真实声纹识别。
```

### 4. 注意隐私

不要偷偷上传图像、音频或身份信息。

如果要发给模型 endpoint，UI 或日志里必须能看到。

### 5. 不要宣称情绪诊断

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

---

## 八、最终验收清单

这个任务完成时，必须满足：

```text
[ ] 前端能显示多个同类别物体实例
[ ] 每个物体实例有稳定 obj_id
[ ] 每个物体实例有图像证据
[ ] 前端能显示多个用户实例
[ ] 关系连接的是 person_id -> object_id，不是 person -> label
[ ] 关系能表达 holds / uses / owns_confirmed / rejected 等状态
[ ] 关系有置信度
[ ] 系统能根据重复交互提升置信度
[ ] 系统能在合适时机询问用户确认所属权
[ ] 用户确认后，关系状态变为 confirmed
[ ] 用户否认后，关系状态变为 rejected
[ ] 后续 LLM/VLM prompt 会使用 confirmed/rejected 状态
[ ] 前端能清楚展示这些变化
[ ] 刷新页面后关系仍能恢复
```

---

## 九、项目运行方式

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

---

## 十、参考文档

先读这些：

```text
HANDOVER_README.md    项目交接文档
PROJECT_PROGRESS.md   当前项目进度总览
```

再跑 demo 看代码。

---

## 十一、VLM 调用参考示例

本项目使用的是 SenseAudio-compatible `messages` 接口。

配置示例：

```bash
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://api.senseaudio.cn/v1
LLM_MODEL=senseaudio-s2
LLM_WIRE_API=messages
```

注意：这个接口读图时使用的是 Anthropic 风格的 base64 图片格式，不是 OpenAI 的 `image_url` 格式。

正确图片格式：

```json
{
  "type": "image",
  "source": {
    "type": "base64",
    "media_type": "image/png",
    "data": "..."
  }
}
```

最小 Node.js 调用示例：

```js
const fs = require("node:fs");

const apiKey = process.env.LLM_API_KEY;
const baseUrl = "https://api.senseaudio.cn/v1";
const model = "senseaudio-s2";
const wireApi = "messages";

const b64 = fs.readFileSync("test.png").toString("base64");

const body = {
  model,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "请用严格 JSON 描述这张图片里有什么，字段包括 objects, colors, layout。不要输出 Markdown。"
        },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: b64
          }
        }
      ]
    }
  ],
  max_tokens: 512,
  temperature: 0.1
};

const response = await fetch(`${baseUrl}/${wireApi}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(body)
});

const text = await response.text();
console.log(response.status);
console.log(text);
```

本地已经测试通过：

测试图内容：

```text
白色背景
左侧红色矩形
右侧蓝色圆形
顶部文字：VLM TEST: RED RECTANGLE + BLUE CIRCLE
```

模型可以正确返回：

```json
{
  "objects": [
    {
      "type": "text",
      "content": "VLM TEST: RED RECTANGLE + BLUE CIRCLE",
      "position": "top-left"
    },
    {
      "type": "rectangle",
      "color": "red",
      "position": "left"
    },
    {
      "type": "circle",
      "color": "blue",
      "position": "right"
    }
  ],
  "colors": ["white", "black", "red", "blue"],
  "layout": {
    "background": "white",
    "relative_positions": "the red rectangle is to the left of the blue circle"
  }
}
```

如果实习生要修改 `/api/vision`，必须保持这个图片格式，否则模型可能会说“没有收到图片”。

---

## 十二、总结

你要做的不是：

```text
识别用户旁边有一个水杯。
```

而是：

```text
识别这个具体水杯 obj_2，多次和 Alex 发生交互，
在合适时机询问 Alex 是否属于他，
并把用户确认后的关系写入长期记忆。
```

这才是 embodied relationship memory。
