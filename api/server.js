const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 Firebase 서비스 계정 키 JSON 파싱
const raw = process.env.FIREBASE_KEY_JSON;
const serviceAccount = JSON.parse(raw);
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// 📌 글 등록
app.post("/submitPost", async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: "입력 누락" });

  try {
    const ref = await db.collection("posts").add({
      title,
      content,
      timestamp: Date.now()
    });
    res.status(200).json({ success: true, id: ref.id });
  } catch (err) {
    console.error("🔥 글 저장 오류:", err);
    res.status(500).json({ error: "글 저장 실패" });
  }
});

// 📌 전체 글 목록
app.get("/posts", async (req, res) => {
  try {
    const snapshot = await db.collection("posts").orderBy("timestamp", "desc").get();
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(posts);
  } catch (err) {
    console.error("🔥 글 목록 불러오기 실패:", err);
    res.status(500).json({ error: "글 목록 실패" });
  }
});

// 📌 특정 글 상세 조회
app.get("/post/:id", async (req, res) => {
  try {
    const doc = await db.collection("posts").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "글 없음" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error("🔥 글 조회 실패:", err);
    res.status(500).json({ error: "글 조회 오류" });
  }
});

// 💬 댓글 목록 조회
app.get("/post/:id/comments", async (req, res) => {
  try {
    const snapshot = await db.collection("posts").doc(req.params.id).collection("comments").orderBy("timestamp").get();
    const comments = snapshot.docs.map(doc => doc.data());
    res.json(comments);
  } catch (err) {
    console.error("🔥 댓글 조회 실패:", err);
    res.status(500).json({ error: "댓글 조회 오류" });
  }
});

// 💬 댓글 등록
app.post("/post/:id/comment", async (req, res) => {
  const text = req.body.text;
  if (!text) return res.status(400).json({ error: "댓글 내용 없음" });

  try {
    await db.collection("posts").doc(req.params.id).collection("comments").add({
      text,
      timestamp: Date.now()
    });
    res.json({ success: true });
  } catch (err) {
    console.error("🔥 댓글 저장 실패:", err);
    res.status(500).json({ error: "댓글 저장 오류" });
  }
});

// ✅ 서버 상태 확인
app.get("/", (req, res) => {
  res.send("✅ 클린서치 Render 서버 작동 중");
});

// 🚀 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 서버가 ${PORT}번 포트에서 실행 중`);
});
