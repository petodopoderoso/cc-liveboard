import { Hono } from "hono";
import type { Bindings } from "../types";

const images = new Hono<{ Bindings: Bindings }>();

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/**
 * POST /api/images
 * Upload an image to R2. Accepts multipart/form-data with a "file" field.
 * Returns the R2 key to reference when creating a question.
 */
images.post("/", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return c.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
      400
    );
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: "File too large. Max 5MB" }, 400);
  }

  // Generate a unique key with extension
  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const key = `${crypto.randomUUID()}.${ext}`;

  // Upload to R2
  await c.env.IMAGES_BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  return c.json({ key }, 201);
});

/**
 * GET /api/images/:key
 * Serve an image from R2 with proper caching headers.
 */
images.get("/:key", async (c) => {
  const key = c.req.param("key");

  const object = await c.env.IMAGES_BUCKET.get(key);
  if (!object) {
    return c.notFound();
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType ?? "application/octet-stream"
  );
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag);

  return new Response(object.body, { headers });
});

export default images;
