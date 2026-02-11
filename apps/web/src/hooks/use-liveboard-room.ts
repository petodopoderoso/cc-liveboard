"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  type Question,
  type WSMessage,
  fetchQuestions,
  connectWebSocket,
  createQuestion,
  voteQuestion,
  markAnswered,
} from "@/lib/api";

// Generate or retrieve a persistent voter ID
function getVoterId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("cc-liveboard-voter-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("cc-liveboard-voter-id", id);
  }
  return id;
}

export function useLiveboardRoom(roomId: string) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [connected, setConnected] = useState(false);
  const [connections, setConnections] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voterId = useRef(getVoterId());

  // Sort questions: unanswered first (by votes desc), then answered
  const sortQuestions = useCallback((qs: Question[]) => {
    return [...qs].sort((a, b) => {
      if (a.is_answered !== b.is_answered) return a.is_answered - b.is_answered;
      if (b.votes !== a.votes) return b.votes - a.votes;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (msg: WSMessage) => {
      switch (msg.type) {
        case "connected":
          setSessionId(msg.sessionId);
          setConnections(msg.connections);
          break;

        case "question:new":
          setQuestions((prev) =>
            sortQuestions([...prev, msg.question])
          );
          break;

        case "question:voted":
          setQuestions((prev) =>
            sortQuestions(
              prev.map((q) =>
                q.id === msg.questionId ? { ...q, votes: msg.votes } : q
              )
            )
          );
          break;

        case "question:answered":
          setQuestions((prev) =>
            sortQuestions(
              prev.map((q) =>
                q.id === msg.questionId ? { ...q, is_answered: 1 } : q
              )
            )
          );
          break;
      }
    },
    [sortQuestions]
  );

  // Connect WebSocket with auto-reconnect
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    wsRef.current = connectWebSocket(
      roomId,
      handleMessage,
      () => setConnected(true),
      () => {
        setConnected(false);
        // Auto-reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      }
    );
  }, [roomId, handleMessage]);

  // Initial load + WebSocket connection
  useEffect(() => {
    // Fetch existing questions
    fetchQuestions(roomId).then((qs) => {
      setQuestions(sortQuestions(qs));
    });

    // Connect WebSocket
    connect();

    return () => {
      wsRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [roomId, connect, sortQuestions]);

  // --- Actions ---

  const submitQuestion = useCallback(
    async (content: string, author?: string, imageKey?: string) => {
      await createQuestion(roomId, content, author, imageKey);
    },
    [roomId]
  );

  const vote = useCallback(
    async (questionId: string) => {
      await voteQuestion(roomId, questionId, voterId.current);
    },
    [roomId]
  );

  const answer = useCallback(
    async (questionId: string) => {
      await markAnswered(roomId, questionId);
    },
    [roomId]
  );

  return {
    questions,
    connected,
    connections,
    sessionId,
    submitQuestion,
    vote,
    answer,
  };
}
