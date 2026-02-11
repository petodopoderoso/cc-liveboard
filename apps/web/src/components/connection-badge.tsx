"use client";

type ConnectionBadgeProps = {
  connected: boolean;
  connections: number;
};

export function ConnectionBadge({ connected, connections }: ConnectionBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${
            connected
              ? "bg-cf-success animate-pulse"
              : "bg-cf-danger"
          }`}
        />
        <span className="text-xs text-white/40">
          {connected ? "En vivo" : "Reconectando..."}
        </span>
      </div>
      {connected && connections > 0 && (
        <span className="text-xs text-white/20">
          · {connections} conectado{connections !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
