import type { LiveboardRoom } from "./durable-objects/liveboard-room";

export type Bindings = {
  DB: D1Database;
  LIVEBOARD_ROOM: DurableObjectNamespace<LiveboardRoom>;
  IMAGES_BUCKET: R2Bucket;
};

export type Question = {
  id: string;
  room_id: string;
  content: string;
  author: string;
  votes: number;
  is_answered: number;
  image_key: string | null;
  created_at: string;
};

export type Vote = {
  question_id: string;
  voter_id: string;
};

// WebSocket message types
export type WSMessage =
  | { type: "question:new"; question: Question }
  | { type: "question:voted"; questionId: string; votes: number }
  | { type: "question:answered"; questionId: string }
  | { type: "connected"; sessionId: string; connections: number }
  | { type: "error"; message: string };
