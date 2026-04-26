import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import path from "path"
import fs from "fs"

const REPLICATE_KEY = process.env.REPLICATE_API_TOKEN || ""
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || ""
const GROQ_KEY = process.env.GROQ_API_KEY || ""

// Replicate zeroscope-v2-xl — update version if outdated at https://replicate.com/anotherjesse/zeroscope-v2-xl
const REPLICATE_VERSION = "9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351"

function ensureDir() {
  const dir = path.join(process.cwd(), "public", "videos")
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

async function generateScript(topic: string): Promise<{ prompt: string; voiceText: string }> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
      temperature: 0.7,
      messages: [
        { role: "system", content: "You are a video director and copywriter. Respond ONLY with valid JSON, no markdown." },
        {
          role: "user",
          content:
            `Create a video generation prompt and voiceover script for: "${topic}"\n\n` +
            `Return ONLY valid JSON:\n` +
            `{"prompt": "detailed cinematic AI video prompt under 80 words, describe visuals, lighting, movement", "voiceText": "punchy voiceover script under 40 words that complements the visuals"}`,
        },
      ],
    }),
  })
  const data = await res.json()
  const raw = (data?.choices?.[0]?.message?.content || "{}") as string
  const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) return { prompt: topic, voiceText: topic }
  try {
    const sanitized = match[0].replace(/"([^"]*)"/g, (_, inner) => JSON.stringify(inner))
    return JSON.parse(sanitized)
  } catch {
    return { prompt: topic, voiceText: topic }
  }
}

async function startVideoGeneration(prompt: string, style: string, duration: number): Promise<string> {
  const numFrames = 16 // minimum frames — faster generation on free tier
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "respond-async",
    },
    body: JSON.stringify({
      version: REPLICATE_VERSION,
      input: {
        prompt: `${style} style, ${prompt}`,
        num_frames: numFrames,
        fps: 8,
        width: 576,
        height: 320,
        num_inference_steps: 25,
        guidance_scale: 17.5,
      },
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(`Replicate: ${data.error}`)
  return data.id as string
}

async function pollReplicate(predictionId: string): Promise<string> {
  for (let i = 0; i < 225; i++) {
    await new Promise((r) => setTimeout(r, 4000))
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Token ${REPLICATE_KEY}` },
    })
    const data = await res.json()
    if (data.status === "succeeded") {
      const out = data.output
      return Array.isArray(out) ? out[0] : out
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error || "Video generation failed on Replicate")
    }
  }
  throw new Error("Video generation timed out after 15 minutes")
}

async function generateVoice(text: string, voiceId: string): Promise<Buffer> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })
  if (!res.ok) throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

async function mergeWithFFmpeg(videoUrl: string, audioPath: string, outputPath: string): Promise<void> {
  // Download video from Replicate
  const videoRes = await fetch(videoUrl)
  if (!videoRes.ok) throw new Error("Failed to download video from Replicate")
  const rawVideoPath = outputPath.replace("final-", "raw-")
  fs.writeFileSync(rawVideoPath, Buffer.from(await videoRes.arrayBuffer()))

  const { spawn } = await import("child_process")
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-y",
      "-i", rawVideoPath,
      "-i", audioPath,
      "-c:v", "copy",
      "-c:a", "aac",
      "-shortest",
      outputPath,
    ])
    let stderr = ""
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString() })
    proc.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg exited ${code}: ${stderr.slice(-300)}`))
    })
    proc.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") reject(new Error("ffmpeg not found — install it: winget install FFmpeg"))
      else reject(err)
    })
  })

  try { fs.unlinkSync(rawVideoPath) } catch {}
}

async function runVideoJob(projectId: string, topic: string, style: string, duration: number, voiceId: string) {
  const dir = ensureDir()

  try {
    // Step 1: AI writes script
    await prisma.videoProject.update({ where: { id: projectId }, data: { status: "scripting" } })
    const script = await generateScript(topic)
    const prompt = script.prompt || topic
    const voiceText = script.voiceText || topic
    await prisma.videoProject.update({ where: { id: projectId }, data: { prompt, voiceText } })

    // Step 2: Start video generation
    await prisma.videoProject.update({ where: { id: projectId }, data: { status: "generating_video" } })
    const predId = await startVideoGeneration(prompt, style, duration)
    await prisma.videoProject.update({ where: { id: projectId }, data: { replicateId: predId } })

    // Step 3: Poll until video ready
    await prisma.videoProject.update({ where: { id: projectId }, data: { status: "processing_video" } })
    const videoUrl = await pollReplicate(predId)
    await prisma.videoProject.update({ where: { id: projectId }, data: { videoUrl } })

    // Step 4: Generate voiceover
    await prisma.videoProject.update({ where: { id: projectId }, data: { status: "generating_voice" } })
    const audioBuffer = await generateVoice(voiceText, voiceId)
    const audioPath = path.join(dir, `audio-${projectId}.mp3`)
    fs.writeFileSync(audioPath, audioBuffer)
    await prisma.videoProject.update({ where: { id: projectId }, data: { audioPath } })

    // Step 5: Merge video + audio
    await prisma.videoProject.update({ where: { id: projectId }, data: { status: "merging" } })
    const finalAbsPath = path.join(dir, `final-${projectId}.mp4`)
    try {
      await mergeWithFFmpeg(videoUrl, audioPath, finalAbsPath)
      await prisma.videoProject.update({
        where: { id: projectId },
        data: { status: "done", finalPath: `/videos/final-${projectId}.mp4` },
      })
    } catch (mergeErr) {
      // FFmpeg not available — serve video without audio
      const rawVideoPath = path.join(dir, `raw-${projectId}.mp4`)
      if (!fs.existsSync(rawVideoPath)) {
        const videoRes = await fetch(videoUrl)
        fs.writeFileSync(rawVideoPath, Buffer.from(await videoRes.arrayBuffer()))
      }
      await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          status: "done",
          finalPath: `/videos/raw-${projectId}.mp4`,
          error: `Audio merge skipped: ${mergeErr instanceof Error ? mergeErr.message : String(mergeErr)}`,
        },
      })
    }

    console.log(`[video] ${projectId} done`)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error(`[video] ${projectId} failed:`, error)
    await prisma.videoProject.update({ where: { id: projectId }, data: { status: "failed", error } })
  }
}

export async function POST(request: Request) {
  const { topic, style, duration, voiceId } = await request.json()

  if (!topic?.trim()) return NextResponse.json({ error: "topic is required" }, { status: 400 })
  if (!REPLICATE_KEY) return NextResponse.json({ error: "REPLICATE_API_TOKEN not set in .env" }, { status: 500 })
  if (!ELEVENLABS_KEY) return NextResponse.json({ error: "ELEVENLABS_API_KEY not set in .env" }, { status: 500 })

  const project = await prisma.videoProject.create({
    data: {
      topic: topic.trim(),
      prompt: topic.trim(),
      style: style || "cinematic",
      duration: duration || 3,
      voiceId: voiceId || "21m00Tcm4TlvDq8ikWAM",
      status: "queued",
    },
  })

  runVideoJob(project.id, topic.trim(), style || "cinematic", duration || 3, voiceId || "21m00Tcm4TlvDq8ikWAM")
    .catch(console.error)

  return NextResponse.json({ projectId: project.id })
}
