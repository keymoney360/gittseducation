require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const { generalLimiter } = require("./src/middleware/security");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(generalLimiter);

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error("MONGODB_URI is missing. Copy .env.example to .env and configure it.");
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => { console.error("MongoDB connection failed:", err.message); process.exit(1); });

app.use(session({
  name: "gitts.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-me",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: mongoUri, collectionName: "sessions" }),
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads/covers", express.static(path.join(__dirname, "public", "uploads")));

app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/books", require("./src/routes/books"));
app.use("/api/orders", require("./src/routes/orders"));
app.use("/api/payments", require("./src/routes/payments"));
app.use("/api/dashboard", require("./src/routes/dashboard"));
app.use("/api/withdrawals", require("./src/routes/withdrawals"));
app.use("/api/admin", require("./src/routes/admin"));

app.get("/health", (_req, res) => res.json({ ok: true, app: "GITTS-Education" }));
app.get("*", (req, res) => {
  const page = req.path.startsWith("/admin") ? "admin.html" : "index.html";
  res.sendFile(path.join(__dirname, "public", page));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

app.listen(PORT, () => console.log(`GITTS-Education listening on ${PORT}`));
