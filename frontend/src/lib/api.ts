import type { Generation, MusicRequest } from "../types";

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public readonly details?: string) {
    super(message);
  }
}

export async function generateMusic(payload: MusicRequest): Promise<Generation> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new ApiError(
      "Unable to reach the music server.",
      error instanceof Error ? error.message : undefined,
    );
  }

  if (!response.ok) {
    let details = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string | { message?: string; details?: string } };
      if (typeof body.detail === "string") details = body.detail;
      if (typeof body.detail === "object") details = body.detail.details ?? body.detail.message ?? details;
    } catch {
      // Keep the safe HTTP status detail.
    }
    throw new ApiError("Music generation failed.", details);
  }

  const result = (await response.json()) as Generation;
  if (result.audioUrl.startsWith("/") && API_URL) {
    result.audioUrl = `${API_URL}${result.audioUrl}`;
  }
  return result;
}

