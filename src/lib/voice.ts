import 'server-only';

// Only /api/chat calls this with its final server-generated reply.
// Audio-only respelling. The visible reply, prompts and stored text keep "Zolarus";
// only the string handed to the voice model is changed. The acute accent marks the
// intended stress (zo-LAH-rus), which the multilingual model reads as the second
// syllable in both English and Portuguese.
const SPOKEN_NAME = 'Zolárus';

function forSpeech(text: string): string {
  return text.replace(/\bZolarus\b/gi, (match) =>
    match[0] === match[0].toUpperCase() ? SPOKEN_NAME : SPOKEN_NAME.toLowerCase(),
  );
}

export async function synthesizeReply(text: string): Promise<Buffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('Speech unavailable.');
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/y7B0QJe0awwvH70C4Kzz', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: forSpeech(text), model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.55, similarity_boost: 0.85, speed: 1.15 } }),
    signal: AbortSignal.timeout(20000), cache: 'no-store', redirect: 'error',
  });
  if (!response.ok) throw new Error('Speech generation failed.');
  const audio = Buffer.from(await response.arrayBuffer());
  if (!audio.length) throw new Error('Empty speech response.');
  return audio;
}
