# 版本与回滚

## 当前最新（默认 `main`）

- **分支**：`main`
- **标签**：`v2-relationship-graph-vlm`
- **内容**：人脸身份（InsightFace）+ 实例级关系图谱 + VLM 场景理解

```powershell
git clone https://github.com/lixvyi/face-recognition.git
cd face-recognition
copy .env.example .env   # 填入 LLM_API_KEY
.\start.ps1
```

网页：https://github.com/lixvyi/face-recognition

---

## 原始上传版（可单独拉取、可回滚）

- **分支**：`legacy/original-upload`（永久指向最初网页上传）
- **标签**：`v1-original-upload`
- **内容**：仅最初 GitHub 上传快照（无关系图谱 / VLM 后续改动）

```powershell
git clone -b legacy/original-upload https://github.com/lixvyi/face-recognition.git
```

或任意分支上回滚到旧版：

```powershell
git checkout v1-original-upload
# 或
git checkout legacy/original-upload
```

---

## 开发分支

- `feature/relationship-graph-vlm`：关系图谱功能开发线（已合并进 `main`，保留作历史参考）

---

## 标签一览

| 标签 | 说明 |
| --- | --- |
| `v1-original-upload` | 最初网页上传版 |
| `v2-relationship-graph-vlm` | 合并后的完整 demo |
