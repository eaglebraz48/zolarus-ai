'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import AssistantAvatar from '@/components/AssistantAvatar';
import { supabase } from '@/lib/supabase';
// Shared with /api/speak so the greeting it will accept is literally the one rendered here.
import { GREET_DEFAULT, GREET_WITH_NAME } from '@/lib/greetings';

type Msg = { role: 'bot' | 'user'; text: string };
type Lang = 'en' | 'pt' | 'es' | 'fr';

const ALLOWED: Lang[] = ['en', 'pt', 'es', 'fr'];

const PLACEHOLDER = {
  en: 'Ask about reminders, shop, compare prices…',
  pt: 'Pergunte sobre lembretes, loja, comparar preços…',
  es: 'Pregunta sobre recordatorios, tienda, comparar precios…',
  fr: 'Demandez rappels, boutique, comparer prix…',
};

const AFTER_NAME = {
 en: (name: string) => `Nice name, ${name}! If you want me to remember it next time, just save it in your profile.`,
  pt: (name: string) => `Lindo nome, ${name}! Se quiser que eu lembre na próxima vez, é só salvar no seu perfil.`,
  es: (name: string) => `¡Qué nombre bonito, ${name}! Si quieres que lo recuerde la próxima vez, sólo guárdalo en tu perfil.`,
  fr: (name: string) => `Très joli prénom, ${name} ! Si tu veux que je m’en souvienne, enregistre-le dans ton profil.`,
};

const SOFT_REDIRECT = {
  en: "Let me guide you. Try asking about reminders, shop, or comparing prices.",
  pt: 'Deixa que eu te guio. Pergunte sobre lembretes, loja ou comparar preços.',
  es: 'Déjame guiarte. Pregunta por recordatorios, tienda o comparar precios.',
  fr: 'Laisse-moi te guider. Parle de rappels, boutique ou comparer prix.',
};

const QUICK = {
  en: ['open reminders', 'go to shop', 'compare prices', 'why complete my profile?'],
  pt: ['abrir lembretes', 'ir à loja', 'comparar preços', 'por que completar meu perfil?'],
  es: ['abrir recordatorios', 'ir a la tienda', 'comparar precios', '¿por qué completar mi perfil?'],
  fr: ['ouvrir rappels', 'aller à la boutique', 'comparer prix', 'pourquoi compléter mon profil?'],
};

const TIPS_LABEL = { en: 'Tips', pt: 'Dicas', es: 'Ayuda', fr: 'Astuces' };
const HIDE_LABEL = { en: 'Hide', pt: 'Fechar', es: 'Ocultar', fr: 'Fermer' };


const VOICE_TEXT = {
  en: { start: 'Record', stop: 'Stop & send', cancel: 'Cancel', recording: 'Recording (30 seconds max)…', preparing: 'Waiting for microphone…', transcribing: 'Transcribing…', sending: 'Zola is replying…', on: 'AI voice on', off: 'AI voice off', replay: 'Play reply', stopAudio: 'Stop audio', unsupported: 'Recording is unavailable in this browser. You can still type.', micError: 'Could not access the microphone. Check permission or type instead.', transError: 'Could not transcribe the recording. Try again or type.', chatError: 'Connection issue. Your message is in the input so you can retry.', ttsError: 'Audio unavailable. Your text reply is still here.', playError: 'Tap Play reply to hear the response.', tooLarge: 'Recording is too large. Please record a shorter message.' },
  pt: { start: 'Gravar', stop: 'Parar e enviar', cancel: 'Cancelar', recording: 'Gravando (máximo de 30 segundos)…', preparing: 'Aguardando microfone…', transcribing: 'Transcrevendo…', sending: 'Zola está respondendo…', on: 'Voz de IA ligada', off: 'Voz de IA desligada', replay: 'Ouvir resposta', stopAudio: 'Parar áudio', unsupported: 'Gravação indisponível neste navegador. Você pode digitar.', micError: 'Não foi possível acessar o microfone. Confira a permissão ou digite.', transError: 'Não foi possível transcrever. Tente novamente ou digite.', chatError: 'Falha de conexão. Sua mensagem está no campo para tentar novamente.', ttsError: 'Áudio indisponível. A resposta em texto continua aqui.', playError: 'Toque em Ouvir resposta para escutar.', tooLarge: 'Gravação muito grande. Grave uma mensagem mais curta.' },
  es: { start: 'Grabar', stop: 'Parar y enviar', cancel: 'Cancelar', recording: 'Grabando (máximo 30 segundos)…', preparing: 'Esperando micrófono…', transcribing: 'Transcribiendo…', sending: 'Zola está respondiendo…', on: 'Voz de IA activada', off: 'Voz de IA desactivada', replay: 'Oír respuesta', stopAudio: 'Parar audio', unsupported: 'Grabación no disponible en este navegador. Puedes escribir.', micError: 'No se pudo acceder al micrófono. Revisa el permiso o escribe.', transError: 'No se pudo transcribir. Inténtalo de nuevo o escribe.', chatError: 'Error de conexión. Tu mensaje está en el campo para reintentar.', ttsError: 'Audio no disponible. La respuesta de texto sigue aquí.', playError: 'Pulsa Oír respuesta para escuchar.', tooLarge: 'Grabación demasiado grande. Graba un mensaje más corto.' },
  fr: { start: 'Enregistrer', stop: 'Arrêter et envoyer', cancel: 'Annuler', recording: 'Enregistrement (30 secondes maximum)…', preparing: 'En attente du micro…', transcribing: 'Transcription…', sending: 'Zola répond…', on: 'Voix IA activée', off: 'Voix IA désactivée', replay: 'Écouter la réponse', stopAudio: 'Arrêter le son', unsupported: 'Enregistrement indisponible dans ce navigateur. Vous pouvez écrire.', micError: 'Impossible d’accéder au micro. Vérifiez l’autorisation ou écrivez.', transError: 'Transcription impossible. Réessayez ou écrivez.', chatError: 'Erreur de connexion. Votre message est dans le champ pour réessayer.', ttsError: 'Audio indisponible. La réponse écrite reste disponible.', playError: 'Appuyez sur Écouter la réponse.', tooLarge: 'Enregistrement trop volumineux. Enregistrez un message plus court.' },
};

// Shared pill styling so the voice controls match the chips and Send button.
const VOICE_BTN_BASE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  minWidth: 0,
  height: 32,
  padding: '0 12px',
  border: '1px solid #cbd5e1',
  borderRadius: 999,
  background: '#fff',
  color: '#0f172a',
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1,
  cursor: 'pointer',
};

const VOICE_BTN_PRIMARY: CSSProperties = {
  ...VOICE_BTN_BASE,
  border: '1px solid #0f172a',
  background: '#0f172a',
  color: '#fff',
};

const VOICE_BTN_SUBTLE: CSSProperties = {
  ...VOICE_BTN_BASE,
  background: '#f8fafc',
  color: '#475569',
};

// Keeps long translated labels on one line inside the narrow widget.
const VOICE_BTN_LABEL: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const VOICE_DOT_LIGHT: CSSProperties = {
  flexShrink: 0,
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#f87171',
};

const VOICE_DOT_RECORDING: CSSProperties = {
  flexShrink: 0,
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#ef4444',
};

// A language change reloads the page, so the voice preference and the previous
// language both have to be read back from storage on mount.
const VOICE_PREF_KEY = 'zola_voice_on';
const LAST_LANG_KEY = 'zola_widget_lang';

export default function ChatWidget({ profileName }: { profileName?: string | null }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const router = useRouter();

  // --- FIX FINAL DO IDIOMA ---
  const raw = sp.get("lang")?.toLowerCase() as Lang | null;
  const lang: Lang = raw && ALLOWED.includes(raw) ? raw : "en";
  // ---------------------------

  const hideWidget = pathname === '/' || pathname === '/sign-in';

  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [greeted, setGreeted] = useState(false);
  const [askedName, setAskedName] = useState(false);
  const [tempName, setTempName] = useState<string | null>(null);
  const [showChips, setShowChips] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);

  const V = VOICE_TEXT[lang];
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'recording' | 'transcribing'>('idle');
  const [sending, setSending] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [notice, setNotice] = useState('');
  const [replyAudio, setReplyAudio] = useState<string | null>(null);
  const [greetingSettled, setGreetingSettled] = useState(false);
  const pendingGreetingSpeak = useRef(false);
  const greetingSpoken = useRef(false);
  const voiceEnabledRef = useRef(false);
  const sendingRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureVersion = useRef(0);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptionAbort = useRef<AbortController | null>(null);
  const chatAbort = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioVersion = useRef(0);
  const sendTextRef = useRef<(text: string) => Promise<void>>(async () => {});

  function stopPlayback() {
    audioVersion.current++;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
  }

  async function playReply(base64: string) {
    stopPlayback();
    const version = audioVersion.current;
    try {
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { if (version === audioVersion.current) stopPlayback(); };
      audio.onerror = () => {
        if (version === audioVersion.current) { stopPlayback(); setNotice(V.ttsError); }
      };
      await audio.play();
    } catch {
      if (version === audioVersion.current) { stopPlayback(); setNotice(V.playError); }
    }
  }

  function releaseMicrophone() {
    if (recordTimer.current) clearTimeout(recordTimer.current);
    recordTimer.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }

  function cancelCapture() {
    captureVersion.current++;
    transcriptionAbort.current?.abort();
    transcriptionAbort.current = null;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    releaseMicrophone();
    setPhase('idle');
  }

  function stopRecording() {
    if (recordTimer.current) clearTimeout(recordTimer.current);
    recordTimer.current = null;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  async function startRecording() {
    if (phase !== 'idle' || sendingRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setNotice(V.unsupported);
      return;
    }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      .find(type => MediaRecorder.isTypeSupported(type));
    if (!mime) { setNotice(V.unsupported); return; }
    cancelCapture();
    stopPlayback();
    setReplyAudio(null);
    setNotice('');
    setPhase('preparing');
    const version = captureVersion.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (version !== captureVersion.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64000 });
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      let bytes = 0;
      recorder.ondataavailable = event => {
        if (version !== captureVersion.current || !event.data.size) return;
        bytes += event.data.size;
        if (bytes > 2 * 1024 * 1024) { cancelCapture(); setNotice(V.tooLarge); return; }
        chunks.push(event.data);
      };
      recorder.onerror = () => {
        if (version === captureVersion.current) { cancelCapture(); setNotice(V.micError); }
      };
      recorder.onstop = async () => {
        releaseMicrophone();
        recorderRef.current = null;
        if (version !== captureVersion.current) return;
        setPhase('transcribing');
        const controller = new AbortController();
        transcriptionAbort.current = controller;
        try {
          const data = new FormData();
          data.append('audio', new Blob(chunks, { type: mime }), mime.includes('mp4') ? 'recording.mp4' : 'recording.webm');
          data.append('language', lang);
          const response = await fetch('/api/transcribe', { method: 'POST', body: data, signal: controller.signal });
          if (!response.ok) throw new Error('Transcription unavailable');
          const result = await response.json();
          if (typeof result.transcript !== 'string' || !result.transcript.trim()) throw new Error('Empty transcript');
          if (version !== captureVersion.current) return;
          setPhase('idle');
          await sendTextRef.current(result.transcript);
        } catch {
          if (version === captureVersion.current && !controller.signal.aborted) setNotice(V.transError);
        } finally {
          if (version === captureVersion.current) {
            transcriptionAbort.current = null;
            setPhase('idle');
          }
        }
      };
      recorder.start(250);
      setPhase('recording');
      recordTimer.current = setTimeout(stopRecording, 30000);
    } catch {
      if (version === captureVersion.current) { cancelCapture(); setNotice(V.micError); }
    }
  }

  useEffect(() => {
    return () => {
      cancelCapture();
      stopPlayback();
      chatAbort.current?.abort();
      sendingRef.current = false;
      setSending(false);
    };
    // Cleanup uses refs so outstanding media/requests cannot survive closing or language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hideWidget, lang]);

  useEffect(() => {
    return () => { cancelCapture(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);



  // LOAD NAME FROM PROFILE
  useEffect(() => {
    (async () => {
      try {
        if (profileName) return;

        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.full_name && profile.full_name.trim() !== "") {
          const first = profile.full_name.split(" ")[0];
          setMsgs([{ role: "bot", text: GREET_WITH_NAME[lang](first) }]);
          setGreeted(true);
        }
      } finally {
        // This effect can still replace the greeting with the named version, so
        // the spoken greeting waits until it settles.
        setGreetingSettled(true);
      }
    })();
  }, [lang, profileName]);

  // FALLBACK GREETING
  useEffect(() => {
    if (greeted) return;

    const trimmed = profileName?.trim() || "";
    if (trimmed) {
      const first = trimmed.split(" ")[0];
      setMsgs([{ role: "bot", text: GREET_WITH_NAME[lang](first) }]);
      setGreeted(true);
      return;
    }

    setMsgs([{ role: "bot", text: GREET_DEFAULT[lang] }]);
    setAskedName(true);
    setGreeted(true);
  }, [greeted, lang, profileName]);

  // Restore the saved voice preference and notice an explicit language change.
  // The header selector reloads the document, so this runs once per change.
  useEffect(() => {
    let voiceOn = false;
    let previousLang: string | null = null;
    try {
      voiceOn = localStorage.getItem(VOICE_PREF_KEY) === '1';
      previousLang = localStorage.getItem(LAST_LANG_KEY);
      localStorage.setItem(LAST_LANG_KEY, lang);
    } catch {}
    if (voiceOn) {
      voiceEnabledRef.current = true;
      setVoiceEnabled(true);
    }
    // Only when the language actually changed and the user had already turned AI
    // voice on. Never force-enables voice, never starts the microphone.
    if (voiceOn && previousLang && previousLang !== lang) pendingGreetingSpeak.current = true;
    // Mount only: changing the language reloads the document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Speaks the greeting that is actually on screen, through the existing TTS path.
  async function speakGreeting(text: string) {
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('Speech unavailable');
      const data = await res.json();
      if (data?.audio?.mimeType !== 'audio/mpeg' || typeof data.audio.base64 !== 'string') {
        throw new Error('Missing audio');
      }
      if (!voiceEnabledRef.current) return;
      // Keeping it as the current reply also exposes Play/Stop, which is the
      // fallback when the browser refuses to autoplay after the reload.
      setReplyAudio(data.audio.base64);
      void playReply(data.audio.base64);
    } catch {
      setNotice(V.ttsError);
    }
  }

  useEffect(() => {
    if (!pendingGreetingSpeak.current || greetingSpoken.current) return;
    // Hooks still run on pages that render no widget, and the spoken greeting
    // must never play without its visible counterpart on screen.
    if (hideWidget || !greetingSettled || !voiceEnabledRef.current) return;
    const greeting = msgs[0];
    if (!greeting || greeting.role !== 'bot') return;
    pendingGreetingSpeak.current = false;
    greetingSpoken.current = true;
    void speakGreeting(greeting.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs, greetingSettled]);

  // AUTO SCROLL
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [msgs]);

  const withLang = (p: string) => `${p}${p.includes('?') ? '&' : '?'}lang=${lang}`;
  const go = (p: string) => router.push(withLang(p));


  // Both typed messages and transcripts use this exact submission path.
  async function sendUser(value: string = input) {
    const text = value.trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setNotice('');
    stopPlayback();
    setReplyAudio(null);
    const playbackVersion = audioVersion.current;
    const wantsAudio = voiceEnabledRef.current;
    const controller = new AbortController();
    chatAbort.current = controller;
    setMsgs(m => [...m, { role: 'user', text }]);
    setInput('');
    setShowChips(false);

    // Keep name capture/navigation, but never short-circuit the shared server guardrails.
    if (askedName && !tempName) {
      if (text.split(/\s+/).length === 1 && text.length <= 12 && !text.includes('?')) setTempName(text);
      setAskedName(false);
    }
    const low = text.toLowerCase();
    const destination = ['reminder', 'lembrete', 'recordatorio', 'rappel'].some(w => low.includes(w)) ? '/reminders'
      : ['shop', 'loja', 'tienda', 'boutique'].some(w => low.includes(w)) ? '/shop'
      : low.includes('compare') ? '/compare'
      : ['profile', 'perfil', 'profil'].some(w => low.includes(w)) ? '/profile' : null;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            ...msgs.filter(m => m.text.trim()).slice(-99).map(m => ({
              role: m.role === 'bot' ? 'assistant' : 'user', content: m.text,
            })),
            { role: 'user', content: text },
          ],
          ...(wantsAudio ? { voiceOutput: true } : {}),
        }),
      });
      if (!res.ok) throw new Error('Chat unavailable');
      const data = await res.json();
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Missing reply');
      if (controller.signal.aborted) return;
      setMsgs(m => [...m, { role: 'bot', text: data.reply }]);
      if (data.voiceError) setNotice(V.ttsError);
      if (wantsAudio && voiceEnabledRef.current && playbackVersion === audioVersion.current &&
          data.audio?.mimeType === 'audio/mpeg' && typeof data.audio.base64 === 'string') {
        setReplyAudio(data.audio.base64);
        void playReply(data.audio.base64);
      }
      if (destination) go(destination);
    } catch {
      if (!controller.signal.aborted) {
        setInput(current => current || text);
        setNotice(V.chatError);
      }
    } finally {
      if (chatAbort.current === controller) {
        chatAbort.current = null;
        sendingRef.current = false;
        setSending(false);
      }
    }
  }
  sendTextRef.current = sendUser;

  // RENDER
  if (hideWidget) return null;

  if (!open)
    return (
      <button
        aria-label="Open Zolarus Assistant"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 50,
          width: 54,
          height: 54,
          border: 'none',
          borderRadius: '50%',
          background: '#0f172a',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        chat
      </button>
    );

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        width: 360,
        maxWidth: 'calc(100vw - 32px)',
        height: 420,
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        boxShadow: '0 16px 40px rgba(2,6,23,.18)',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 700,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AssistantAvatar size={40} />
          <span>Zolarus Assistant</span>
        </div>

    <button
  onClick={() => setOpen(false)}
  style={{
    border: 'none',
    background: 'transparent',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',        // 👈 PRETO VISÍVEL
    cursor: 'pointer',    // 👈 Deixa mais profissional
  }}
>
  ×
</button>
</div>

      {/* MESSAGES */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              gap: 8,
            }}
          >
            {m.role === 'bot' && <AssistantAvatar size={24} />}

            <div
              style={{
                background: m.role === 'user' ? '#0f172a' : '#e9eef5',
                color: m.role === 'user' ? '#fff' : '#0f172a',
                borderRadius: 10,
                padding: '8px 10px',
                maxWidth: '85%',
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* CHIPS */}
      {showChips ? (
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            padding: '8px 12px',
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
          }}
        >
          {QUICK[lang].map((s) => (
            <button
              key={s}
              disabled={sending || phase !== 'idle'}
              onClick={() => {
                void sendUser(s);
              }}
              style={{
                border: '1px solid #cbd5e1',
                background: '#fff',
                borderRadius: 20,
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer',
                color: '#0f172a',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              {s}
            </button>
          ))}

          <button
            onClick={() => setShowChips(false)}
            style={{
              marginLeft: 'auto',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              borderRadius: 20,
              padding: '6px 12px',
              fontSize: 12,
              color: '#0f172a',
              whiteSpace: 'nowrap',
            }}
          >
            {HIDE_LABEL[lang]}
          </button>
        </div>
      ) : (
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            padding: '6px 12px',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={() => setShowChips(true)}
            style={{
              border: 'none',
              background: '#16a34a',
              color: '#fff',
              borderRadius: 20,
              padding: '8px 14px',
              fontSize: 12,
              boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
              whiteSpace: 'nowrap',
            }}
          >
            {TIPS_LABEL[lang]}
          </button>
        </div>
      )}


      {/* Explicit recording and optional spoken replies; no microphone starts on mount. */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #e2e8f0', color: '#0f172a', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {phase === 'idle' ? (
            <button
              type="button"
              disabled={sending}
              onClick={() => void startRecording()}
              aria-label={V.start}
              title={V.start}
              style={{
                ...VOICE_BTN_PRIMARY,
                opacity: sending ? 0.5 : 1,
                cursor: sending ? 'not-allowed' : 'pointer',
              }}
            >
              <span aria-hidden="true">🎙</span>
              <span style={VOICE_BTN_LABEL}>{V.start}</span>
            </button>
          ) : (
            <>
              {phase === 'recording' && (
                <button type="button" onClick={stopRecording} title={V.stop} style={VOICE_BTN_PRIMARY}>
                  <span aria-hidden="true" style={VOICE_DOT_LIGHT} />
                  <span style={VOICE_BTN_LABEL}>{V.stop}</span>
                </button>
              )}
              <button type="button" onClick={cancelCapture} title={V.cancel} style={VOICE_BTN_SUBTLE}>
                <span style={VOICE_BTN_LABEL}>{V.cancel}</span>
              </button>
            </>
          )}

          <button
            type="button"
            aria-pressed={voiceEnabled}
            title={voiceEnabled ? V.on : V.off}
            onClick={() => {
              const enabled = !voiceEnabledRef.current;
              voiceEnabledRef.current = enabled;
              setVoiceEnabled(enabled);
              try { localStorage.setItem(VOICE_PREF_KEY, enabled ? '1' : '0'); } catch {}
              if (!enabled) { stopPlayback(); setReplyAudio(null); }
            }}
            style={{ ...(voiceEnabled ? VOICE_BTN_PRIMARY : VOICE_BTN_BASE), marginLeft: 'auto' }}
          >
            <span aria-hidden="true">{voiceEnabled ? '🔊' : '🔇'}</span>
            <span style={VOICE_BTN_LABEL}>{voiceEnabled ? V.on : V.off}</span>
          </button>
        </div>

        {replyAudio && voiceEnabled && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            <button
              type="button"
              onClick={() => void playReply(replyAudio)}
              title={V.replay}
              style={VOICE_BTN_BASE}
            >
              <span aria-hidden="true">▶</span>
              <span style={VOICE_BTN_LABEL}>{V.replay}</span>
            </button>
            <button type="button" onClick={stopPlayback} title={V.stopAudio} style={VOICE_BTN_SUBTLE}>
              <span aria-hidden="true">■</span>
              <span style={VOICE_BTN_LABEL}>{V.stopAudio}</span>
            </button>
          </div>
        )}

        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 6,
            minHeight: 16,
            fontSize: 11,
            lineHeight: '16px',
            color: '#64748b',
          }}
        >
          {phase === 'recording' && <span aria-hidden="true" style={VOICE_DOT_RECORDING} />}
          <span>{phase !== 'idle' ? V[phase] : sending ? V.sending : notice}</span>
        </div>
      </div>

      {/* INPUT BAR */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (phase === 'idle') void sendUser();
        }}
        style={{
          display: 'flex',
          gap: 8,
          padding: 12,
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <input
          value={input}
          maxLength={10000}
          onChange={(e) => setInput(e.target.value)}
          placeholder={PLACEHOLDER[lang]}
          aria-label="Ask Zolarus Assistant"
          style={{
            background: '#fff',
            color: '#0f172a',
            flex: 1,
            minWidth: 0,
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            padding: '10px 12px',
          }}
        />

        <button
          type="submit"
          disabled={sending || phase !== 'idle' || !input.trim()}
          style={{
            background: '#0f172a',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '10px 14px',
            fontWeight: 700,
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
