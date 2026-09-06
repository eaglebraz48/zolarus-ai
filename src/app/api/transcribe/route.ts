import { NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';

export const runtime = 'nodejs';
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_AUDIO_BYTES + 64 * 1024;
const AUDIO_TYPES: Record<string, string> = {
  'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/mpeg': 'mp3',
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/x-m4a': 'm4a',
};

export async function POST(req: Request) {
  if (!req.headers.get('content-type')?.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected an audio upload.' }, { status: 415 });
  }
  // Bound actual bytes, including requests without Content-Length.
  const reader = req.body?.getReader();
  if (!reader) return NextResponse.json({ error: 'Missing audio.' }, { status: 400 });
  let form: FormData;
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: 'Audio is too large.' }, { status: 413 });
      }
      chunks.push(value);
    }
    form = await new Response(new Uint8Array(Buffer.concat(chunks)), {
      headers: { 'Content-Type': req.headers.get('content-type')! },
    }).formData();
  } catch {
    return NextResponse.json({ error: 'Invalid audio upload.' }, { status: 400 });
  } finally {
    reader.releaseLock();
  }
  const audio = form.get('audio');
  const language = form.get('language');
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ error: 'Missing audio.' }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: 'Audio is too large.' }, { status: 413 });
  const mime = audio.type.split(';')[0].toLowerCase();
  const extension = Object.hasOwn(AUDIO_TYPES, mime) ? AUDIO_TYPES[mime] : undefined;
  if (!extension) return NextResponse.json({ error: 'Unsupported audio type.' }, { status: 415 });
  if (language !== null && (typeof language !== 'string' || !['en', 'pt', 'es', 'fr'].includes(language))) {
    return NextResponse.json({ error: 'Unsupported language.' }, { status: 400 });
  }
  // Check the container header as well as the declared MIME type.
  const bytes = new Uint8Array(await audio.arrayBuffer());
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  const validHeader = extension === 'webm' ? bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
    : extension === 'mp4' || extension === 'm4a' ? ascii(4, 8) === 'ftyp'
    : extension === 'wav' ? ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE'
    : ascii(0, 3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  if (!validHeader) return NextResponse.json({ error: 'Invalid audio file.' }, { status: 415 });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: 'Transcription unavailable.' }, { status: 503 });
  try {
    const client = new OpenAI({ apiKey: key, timeout: 25000, maxRetries: 0 });
    const result = await client.audio.transcriptions.create({
      file: await toFile(bytes, 'recording.' + extension, { type: mime }),
      model: 'gpt-4o-mini-transcribe',
      ...(language ? { language } : {}),
    });
    return NextResponse.json({ transcript: result.text }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    console.error('Zolarus transcription failed.');
    return NextResponse.json({ error: 'Transcription failed. Please try typing.' }, { status: 502 });
  }
}
