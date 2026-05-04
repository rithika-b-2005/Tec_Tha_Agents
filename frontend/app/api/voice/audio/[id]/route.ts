// Voice Agent — Serve stored ElevenLabs audio to Twilio
// Audio buffers are stored in-memory with 5-minute TTL

import { getAudio } from "@/lib/voice-store"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const buffer = getAudio(id)

  if (!buffer) {
    return new Response("Audio not found", { status: 404 })
  }

  // Convert Node.js Buffer to ArrayBuffer for Web API Response compatibility
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

  return new Response(arrayBuffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "no-cache",
    },
  })
}
