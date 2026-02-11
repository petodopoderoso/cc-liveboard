"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function HomePage() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = roomId.trim().toLowerCase().replace(/\s+/g, "-");
    if (slug) {
      router.push(`/${slug}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo / Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center">
            <Image
              src="/cloudflarecolombia.avif"
              alt="Cloudflare Colombia"
              width={160}
              height={160}
              className="rounded-2xl shadow-lg shadow-cf-orange/20"
              priority
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Cloudflare Colombia{" "}
            <span className="text-cf-orange">Live Board</span>
          </h1>
          <p className="text-cf-light/60">
            Haz preguntas, vota por las mejores, todo en tiempo real.
          </p>
        </div>

        {/* Join Form */}
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label
              htmlFor="room"
              className="block text-sm font-medium text-cf-light/80 mb-2"
            >
              Nombre de la sala
            </label>
            <input
              id="room"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="ej: cloudflare-colombia"
              className="w-full rounded-xl bg-cf-gray border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cf-orange/50 focus:border-cf-orange transition-all"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!roomId.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-cf-orange to-amber-500 px-4 py-3 font-semibold text-white shadow-lg shadow-cf-orange/20 hover:shadow-cf-orange/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            Unirse a la sala
          </button>
        </form>

        {/* Tech stack badge */}
        <div className="text-center space-y-3">
          <p className="text-xs text-cf-light/30 uppercase tracking-widest">
            Powered by
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              "Cloudflare Workers",
              "Hono",
              "D1",
              "R2",
              "Durable Objects",
              "Next.js",
              "OpenNext",
            ].map((tech) => (
              <span
                key={tech}
                className="inline-block rounded-full bg-cf-gray/50 border border-white/5 px-3 py-1 text-xs text-cf-light/50"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
