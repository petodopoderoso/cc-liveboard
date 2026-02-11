import { Hono } from "hono";
import type { Bindings, Question } from "../types";

const questions = new Hono<{ Bindings: Bindings }>();

/**
 * GET /api/rooms/:roomId/questions
 * List all questions for a room, sorted by votes (descending)
 */
questions.get("/:roomId/questions", async (c) => {
  const roomId = c.req.param("roomId");

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM questions WHERE room_id = ? ORDER BY votes DESC, created_at ASC"
  )
    .bind(roomId)
    .all<Question>();

  return c.json({ questions: results ?? [] });
});

/**
 * POST /api/rooms/:roomId/questions
 * Create a new question and broadcast it to the room
 */
questions.post("/:roomId/questions", async (c) => {
  const roomId = c.req.param("roomId");
  const body = await c.req.json<{
    content: string;
    author?: string;
    imageKey?: string;
  }>();

  if (!body.content?.trim()) {
    return c.json({ error: "Content is required" }, 400);
  }

  const id = crypto.randomUUID();
  const author = body.author?.trim() || "Anónimo";
  const content = body.content.trim();
  const imageKey = body.imageKey ?? null;

  await c.env.DB.prepare(
    "INSERT INTO questions (id, room_id, content, author, image_key) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(id, roomId, content, author, imageKey)
    .run();

  // Fetch the created question
  const question = await c.env.DB.prepare(
    "SELECT * FROM questions WHERE id = ?"
  )
    .bind(id)
    .first<Question>();

  // Broadcast to all connected clients in the room
  const doId = c.env.LIVEBOARD_ROOM.idFromName(roomId);
  const stub = c.env.LIVEBOARD_ROOM.get(doId);
  await stub.broadcast(
    JSON.stringify({ type: "question:new", question })
  );

  return c.json({ question }, 201);
});

/**
 * POST /api/rooms/:roomId/questions/:questionId/vote
 * Vote on a question (requires a voterId to prevent double voting)
 */
questions.post("/:roomId/questions/:questionId/vote", async (c) => {
  const roomId = c.req.param("roomId");
  const questionId = c.req.param("questionId");
  const body = await c.req.json<{ voterId: string }>();

  if (!body.voterId) {
    return c.json({ error: "voterId is required" }, 400);
  }

  // Check if already voted
  const existingVote = await c.env.DB.prepare(
    "SELECT 1 FROM votes WHERE question_id = ? AND voter_id = ?"
  )
    .bind(questionId, body.voterId)
    .first();

  if (existingVote) {
    // Remove vote (toggle behavior)
    await c.env.DB.batch([
      c.env.DB.prepare(
        "DELETE FROM votes WHERE question_id = ? AND voter_id = ?"
      ).bind(questionId, body.voterId),
      c.env.DB.prepare(
        "UPDATE questions SET votes = votes - 1 WHERE id = ? AND room_id = ?"
      ).bind(questionId, roomId),
    ]);
  } else {
    // Add vote
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO votes (question_id, voter_id) VALUES (?, ?)"
      ).bind(questionId, body.voterId),
      c.env.DB.prepare(
        "UPDATE questions SET votes = votes + 1 WHERE id = ? AND room_id = ?"
      ).bind(questionId, roomId),
    ]);
  }

  // Get updated vote count
  const question = await c.env.DB.prepare(
    "SELECT votes FROM questions WHERE id = ?"
  )
    .bind(questionId)
    .first<{ votes: number }>();

  // Broadcast vote update
  const doId = c.env.LIVEBOARD_ROOM.idFromName(roomId);
  const stub = c.env.LIVEBOARD_ROOM.get(doId);
  await stub.broadcast(
    JSON.stringify({
      type: "question:voted",
      questionId,
      votes: question?.votes ?? 0,
    })
  );

  return c.json({
    questionId,
    votes: question?.votes ?? 0,
    voted: !existingVote,
  });
});

/**
 * PATCH /api/rooms/:roomId/questions/:questionId/answer
 * Mark a question as answered (speaker/admin action)
 */
questions.patch("/:roomId/questions/:questionId/answer", async (c) => {
  const roomId = c.req.param("roomId");
  const questionId = c.req.param("questionId");

  await c.env.DB.prepare(
    "UPDATE questions SET is_answered = 1 WHERE id = ? AND room_id = ?"
  )
    .bind(questionId, roomId)
    .run();

  // Broadcast answered status
  const doId = c.env.LIVEBOARD_ROOM.idFromName(roomId);
  const stub = c.env.LIVEBOARD_ROOM.get(doId);
  await stub.broadcast(
    JSON.stringify({ type: "question:answered", questionId })
  );

  return c.json({ questionId, answered: true });
});

export default questions;
