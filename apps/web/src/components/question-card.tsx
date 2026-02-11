"use client";

import { useState } from "react";
import type { Question } from "@/lib/api";
import { getImageUrl } from "@/lib/api";

type QuestionCardProps = {
  question: Question;
  onVote: (questionId: string) => void;
  onAnswer?: (questionId: string) => void;
  isAdmin?: boolean;
};

export function QuestionCard({
  question,
  onVote,
  onAnswer,
  isAdmin,
}: QuestionCardProps) {
  const isAnswered = question.is_answered === 1;
  const timeAgo = getTimeAgo(question.created_at);

  return (
    <div
      className={`group relative rounded-xl border p-4 transition-all ${
        isAnswered
          ? "bg-cf-success/5 border-cf-success/20 opacity-60"
          : "bg-cf-gray/50 border-white/5 hover:border-cf-orange/20 hover:bg-cf-gray/70"
      }`}
    >
      <div className="flex gap-3">
        {/* Vote button */}
        <button
          onClick={() => onVote(question.id)}
          disabled={isAnswered}
          className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-all ${
            isAnswered
              ? "text-cf-success/40 cursor-default"
              : "text-white/40 hover:text-cf-orange hover:bg-cf-orange/10 active:scale-95"
          }`}
          title="Votar"
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
              d="M4.5 15.75l7.5-7.5 7.5 7.5"
            />
          </svg>
          <span className="text-sm font-bold tabular-nums">
            {question.votes}
          </span>
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm leading-relaxed ${
              isAnswered ? "text-white/40 line-through" : "text-white/90"
            }`}
          >
            {question.content}
          </p>

          {/* Image attachment from R2 */}
          {question.image_key && (
            <QuestionImage imageKey={question.image_key} />
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-white/30">{question.author}</span>
            <span className="text-xs text-white/10">·</span>
            <span className="text-xs text-white/20">{timeAgo}</span>
            {question.image_key && (
              <>
                <span className="text-xs text-white/10">·</span>
                <span className="text-xs text-cf-orange/50 font-medium">
                  R2
                </span>
              </>
            )}
            {isAnswered && (
              <>
                <span className="text-xs text-white/10">·</span>
                <span className="text-xs text-cf-success/60 font-medium">
                  Respondida
                </span>
              </>
            )}
          </div>
        </div>

        {/* Admin: Mark as answered */}
        {isAdmin && !isAnswered && (
          <button
            onClick={() => onAnswer?.(question.id)}
            className="opacity-0 group-hover:opacity-100 self-start rounded-lg px-2 py-1.5 text-xs text-white/30 hover:text-cf-success hover:bg-cf-success/10 transition-all"
            title="Marcar como respondida"
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
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionImage({ imageKey }: { imageKey: string }) {
  const [expanded, setExpanded] = useState(false);
  const src = getImageUrl(imageKey);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="block rounded-lg overflow-hidden border border-white/5 hover:border-cf-orange/20 transition-all"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Adjunto"
          className={`object-contain bg-black/20 transition-all ${
            expanded ? "max-h-96 w-full" : "max-h-32 max-w-xs"
          }`}
          loading="lazy"
        />
      </button>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr + "Z").getTime(); // Assume UTC
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}
