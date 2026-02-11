import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings } from "./types";
import questions from "./routes/questions";
import images from "./routes/images";

// Re-export the Durable Object class so Wrangler can find it
export { LiveboardRoom } from "./durable-objects/liveboard-room";

const app = new Hono<{ Bindings: Bindings }>();

// --- Middleware ---
app.use(
  "*",
  cors({
    origin: "*", // In production, restrict to your frontend domain
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

// --- Health check ---
app.get("/", (c) => {
  return c.json({
    name: "Cloudflare Colombia Live Board API",
    version: "1.0.0",
    services: ["Cloudflare Workers", "Hono", "D1", "Durable Objects", "R2"],
    status: "🟢 running",
  });
});

// --- REST API routes ---
app.route("/api/rooms", questions);
app.route("/api/images", images);

// --- WebSocket upgrade route ---
app.get("/ws/:roomId", async (c) => {
  const roomId = c.req.param("roomId");
  const upgradeHeader = c.req.header("Upgrade");

  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return c.text("Expected WebSocket upgrade", 426);
  }

  // Route to the Durable Object for this room
  const doId = c.env.LIVEBOARD_ROOM.idFromName(roomId);
  const stub = c.env.LIVEBOARD_ROOM.get(doId);

  // Forward the upgrade request to the Durable Object
  return stub.fetch(c.req.raw);
});

// --- Room info ---
app.get("/api/rooms/:roomId", async (c) => {
  const roomId = c.req.param("roomId");

  const doId = c.env.LIVEBOARD_ROOM.idFromName(roomId);
  const stub = c.env.LIVEBOARD_ROOM.get(doId);
  const connections = await stub.getConnectionCount();

  const questionCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM questions WHERE room_id = ?"
  )
    .bind(roomId)
    .first<{ count: number }>();

  return c.json({
    roomId,
    connections,
    questionCount: questionCount?.count ?? 0,
  });
});

export default app;
