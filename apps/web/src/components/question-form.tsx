"use client";

import { useState, useRef, useCallback } from "react";
import { uploadImage } from "@/lib/api";

type QuestionFormProps = {
  onSubmit: (content: string, author?: string, imageKey?: string) => Promise<void>;
};

type ImageState = {
  file: File;
  preview: string;
  uploading: boolean;
  key: string | null;
  error: string | null;
};

export function QuestionForm({ onSubmit }: QuestionFormProps) {
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [image, setImage] = useState<ImageState | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Upload image to R2 immediately
  const startUpload = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);
    setImage({ file, preview, uploading: true, key: null, error: null });

    try {
      const key = await uploadImage(file);
      setImage((prev) =>
        prev ? { ...prev, uploading: false, key } : null
      );
    } catch (err) {
      setImage((prev) =>
        prev
          ? { ...prev, uploading: false, error: (err as Error).message }
          : null
      );
    }
  }, []);

  // Handle Ctrl+V paste with image from clipboard
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            startUpload(file);
          }
          return;
        }
      }
    },
    [startUpload]
  );

  const removeImage = useCallback(() => {
    if (image?.preview) {
      URL.revokeObjectURL(image.preview);
    }
    setImage(null);
  }, [image]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    // Wait if image is still uploading
    if (image?.uploading) return;

    setSubmitting(true);
    try {
      await onSubmit(
        content.trim(),
        author.trim() || undefined,
        image?.key ?? undefined
      );
      setContent("");
      if (image?.preview) {
        URL.revokeObjectURL(image.preview);
      }
      setImage(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            placeholder="Escribe tu pregunta..."
            rows={3}
            className="w-full rounded-xl bg-cf-gray border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cf-orange/50 focus:border-cf-orange transition-all resize-none"
            maxLength={500}
          />
        </div>

        {/* Image preview */}
        {image && (
          <div className="relative mt-2 rounded-lg overflow-hidden border border-white/10 bg-cf-gray/30">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.preview}
                alt="Preview"
                className="max-h-48 w-full object-contain bg-black/20"
              />

              {/* Upload status overlay */}
              {image.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="flex items-center gap-2 bg-cf-dark/90 rounded-lg px-3 py-2">
                    <div className="w-4 h-4 border-2 border-cf-orange border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-white/70">
                      Subiendo a R2...
                    </span>
                  </div>
                </div>
              )}

              {/* Upload complete badge */}
              {image.key && !image.uploading && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-cf-success/90 rounded-md px-2 py-0.5">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  <span className="text-[10px] text-white font-medium">
                    R2
                  </span>
                </div>
              )}

              {/* Error badge */}
              {image.error && (
                <div className="absolute top-2 left-2 bg-cf-danger/90 rounded-md px-2 py-0.5">
                  <span className="text-[10px] text-white">
                    {image.error}
                  </span>
                </div>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 rounded-full bg-black/60 p-1 hover:bg-black/80 transition-colors"
              >
                <svg
                  className="w-4 h-4 text-white/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-1">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Tu nombre (opcional)"
            className="rounded-lg bg-cf-gray/50 border border-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-cf-orange/30 transition-all w-48"
            maxLength={50}
          />
          <span className="text-xs text-white/20 self-end">
            {content.length}/500
          </span>
        </div>
      </div>
      <button
        type="submit"
        disabled={!content.trim() || submitting || !!image?.uploading}
        className="w-full rounded-xl bg-gradient-to-r from-cf-orange to-amber-500 px-4 py-2.5 font-semibold text-white shadow-lg shadow-cf-orange/20 hover:shadow-cf-orange/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
      >
        {submitting
          ? "Enviando..."
          : image?.uploading
            ? "Subiendo imagen..."
            : "Enviar pregunta"}
      </button>
    </form>
  );
}
