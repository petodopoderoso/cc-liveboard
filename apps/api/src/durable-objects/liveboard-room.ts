import { DurableObject } from "cloudflare:workers";
import type { Bindings } from "../types";

/**
 * LiveboardRoom Durable Object
 *
 * Manages WebSocket connections for a liveboard room using the
 * WebSocket Hibernation API (recommended for free tier — reduces duration charges).
 *
 * Each room is identified by a name (e.g., "cloudflare-colombia-2026").
 * All attendees in the same room share the same DO instance.
 */
export class LiveboardRoom extends DurableObject<Bindings> {
  private sessions: Map<WebSocket, { id: string }>;

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    this.sessions = new Map();

    // Restore hibernated WebSocket sessions
    this.ctx.getWebSockets().forEach((ws) => {
      const attachment = ws.deserializeAttachment();
      if (attachment) {
        this.sessions.set(ws, { ...attachment });
      }
    });

    // Auto ping/pong without waking the DO
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong")
    );
  }

  /**
   * Handles WebSocket upgrade requests from the Worker
   */
  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept with hibernation support
    this.ctx.acceptWebSocket(server);

    const id = crypto.randomUUID();
    server.serializeAttachment({ id });
    this.sessions.set(server, { id });

    // Notify the new client
    server.send(
      JSON.stringify({
        type: "connected",
        sessionId: id,
        connections: this.sessions.size,
      })
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * RPC method: broadcast a message to all connected WebSockets.
   * Called from the Hono API routes after DB mutations.
   */
  async broadcast(message: string): Promise<void> {
    this.sessions.forEach((_attachment, ws) => {
      try {
        ws.send(message);
      } catch {
        // Client disconnected, will be cleaned up in webSocketClose
      }
    });
  }

  /**
   * Get current connection count
   */
  async getConnectionCount(): Promise<number> {
    return this.sessions.size;
  }

  // --- WebSocket Hibernation event handlers ---

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    // We handle most logic via REST API + broadcast RPC.
    // This handler is for future client-to-server messages if needed.
    const session = this.sessions.get(ws);
    if (!session) return;

    try {
      const data = JSON.parse(message as string);

      if (data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch {
      // Ignore malformed messages
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    _wasClean: boolean
  ) {
    ws.close(code, reason);
    this.sessions.delete(ws);
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error("WebSocket error:", error);
    this.sessions.delete(ws);
  }
}
