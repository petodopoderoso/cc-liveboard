// API client configuration
// In development, the Hono API runs on :8787
// In production, replace with your deployed worker URL

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8787";

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

export type WSMessage =
  | { type: "question:new"; question: Question }
  | { type: "question:voted"; questionId: string; votes: number }
  | { type: "question:answered"; questionId: string }
  | { type: "connected"; sessionId: string; connections: number }
  | { type: "pong" }
  | { type: "error"; message: string };

// --- REST API ---

export async function fetchQuestions(roomId: string): Promise<Question[]> {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}/questions`);
  const data = await res.json();
  return data.questions;
}

export async function createQuestion(
  roomId: string,
  content: string,
  author?: string,
  imageKey?: string
): Promise<Question> {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, author, imageKey }),
  });
  const data = await res.json();
  return data.question;
}

export async function voteQuestion(
  roomId: string,
  questionId: string,
  voterId: string
): Promise<{ votes: number; voted: boolean }> {
  const res = await fetch(
    `${API_BASE}/api/rooms/${roomId}/questions/${questionId}/vote`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId }),
    }
  );
  return res.json();
}

export async function markAnswered(
  roomId: string,
  questionId: string
): Promise<void> {
  await fetch(
    `${API_BASE}/api/rooms/${roomId}/questions/${questionId}/answer`,
    { method: "PATCH" }
  );
}

export async function fetchRoomInfo(
  roomId: string
): Promise<{ roomId: string; connections: number; questionCount: number }> {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}`);
  return res.json();
}

// --- Images (R2) ---

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/images`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error ?? "Upload failed");
  }

  const data = await res.json();
  return data.key;
}

export function getImageUrl(key: string): string {
  return `${API_BASE}/api/images/${key}`;
}

// --- WebSocket ---

export function connectWebSocket(
  roomId: string,
  onMessage: (msg: WSMessage) => void,
  onOpen?: () => void,
  onClose?: () => void
): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/${roomId}`);

  ws.onopen = () => {
    onOpen?.();
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as WSMessage;
      onMessage(msg);
    } catch {
      // Ignore non-JSON messages (e.g., "pong")
    }
  };

  ws.onclose = () => {
    onClose?.();
  };

  return ws;
}
