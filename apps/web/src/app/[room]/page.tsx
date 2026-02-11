"use client";

import { use, useState } from "react";
import { useLiveboardRoom } from "@/hooks/use-liveboard-room";
import { QuestionForm } from "@/components/question-form";
import { QuestionCard } from "@/components/question-card";
import { ConnectionBadge } from "@/components/connection-badge";
import Link from "next/link";

type PageProps = {
  params: Promise<{ room: string }>;
};

export default function RoomPage({ params }: PageProps) {
  const { room } = use(params);
  const [isAdmin, setIsAdmin] = useState(false);
  const {
    questions,
    connected,
    connections,
    submitQuestion,
    vote,
    answer,
  } = useLiveboardRoom(room);

  const unanswered = questions.filter((q) => !q.is_answered);
  const answered = questions.filter((q) => q.is_answered === 1);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-cf-darker/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-white/30 hover:text-white/60 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="text-cf-orange">#</span>
                {room}
              </h1>
              <ConnectionBadge connected={connected} connections={connections} />
            </div>
          </div>

          <button
            onClick={() => setIsAdmin(!isAdmin)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              isAdmin
                ? "bg-cf-orange/20 text-cf-orange border border-cf-orange/30"
                : "bg-cf-gray/50 text-white/30 border border-white/5 hover:text-white/50"
            }`}
          >
            {isAdmin ? "Speaker" : "Modo speaker"}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Question Form */}
        <QuestionForm onSubmit={submitQuestion} />

        {/* Questions List */}
        <div className="space-y-3">
          {unanswered.length === 0 && answered.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <div className="text-4xl">
                <svg
                  className="w-12 h-12 mx-auto text-white/10"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                  />
                </svg>
              </div>
              <p className="text-white/30 text-sm">
                No hay preguntas todavia. Se el primero en preguntar.
              </p>
            </div>
          )}

          {/* Unanswered questions */}
          {unanswered.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              onVote={vote}
              onAnswer={answer}
              isAdmin={isAdmin}
            />
          ))}

          {/* Answered separator */}
          {answered.length > 0 && (
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-xs text-white/20">
                Respondidas ({answered.length})
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
          )}

          {/* Answered questions */}
          {answered.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              onVote={vote}
              isAdmin={false}
            />
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center py-8 space-y-2">
          <p className="text-xs text-white/15">
            Cloudflare Colombia Live Board 2026
          </p>
          <div className="flex justify-center gap-1">
            {["Workers", "Hono", "D1", "R2", "Durable Objects", "Next.js", "OpenNext"].map(
              (t) => (
                <span
                  key={t}
                  className="text-[10px] text-white/10 bg-white/[0.02] rounded px-1.5 py-0.5"
                >
                  {t}
                </span>
              )
            )}
          </div>
        </footer>
      </div>
    </main>
  );
}
