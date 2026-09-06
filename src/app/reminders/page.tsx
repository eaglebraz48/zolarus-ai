'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Lang = 'en' | 'pt' | 'es' | 'fr';
const LANGS: Lang[] = ['en', 'pt', 'es', 'fr'];
const isLang = (v: string | null): v is Lang => !!v && LANGS.includes(v as Lang);

type Row = {
  id: string;
  user_id: string;
  title: string | null;
  who_for: string | null;
  remind_at: string;
  created_at: string;
  email: string | null;
};

/* -------------------------------------------------- */
/* TRANSLATIONS */
/* -------------------------------------------------- */

const L = {
  en: {
    title: "Reminders",
    formTitle: "New reminder",
    reminderTitle: "Occasion or event...",
    whoFor: "Who is this for?",
    date: "Date",
    time: "Time",
    create: "Save reminder",
    creating: "Saving…",
    listTitle: "Your reminders",
    none: "No reminders yet.",
    statusScheduled: "scheduled",
    delete: "Delete",
    deleting: "Deleting…",
    required: "Please enter all fields.",
    saved: "Reminder saved.",
    deleted: "Reminder deleted.",
    back: "Back to Dashboard",
    banner: "To create reminders, please sign in with your email.",
    signinBtn: "Sign in",
    signInExplain: "Sign in so Zola can save this reminder and notify you.",
    readyTitle: "Your reminder is ready",
  },
  pt: {
    title: "Lembretes",
    formTitle: "Novo lembrete",
    reminderTitle: "Ocasião ou evento...",
    whoFor: "Para quem é?",
    date: "Data",
    time: "Hora",
    create: "Salvar lembrete",
    creating: "Salvando…",
    listTitle: "Seus lembretes",
    none: "Nenhum lembrete ainda.",
    statusScheduled: "agendado",
    delete: "Excluir",
    deleting: "Excluindo…",
    required: "Preencha todos os campos.",
    saved: "Lembrete salvo.",
    deleted: "Lembrete excluído.",
    back: "Voltar ao Painel",
    banner: "Para criar lembretes, faça login com seu email.",
    signinBtn: "Entrar",
    signInExplain: "Faça login para que a Zola possa salvar este lembrete e avisar você.",
    readyTitle: "Seu lembrete está pronto",
  },
  es: {
    title: "Recordatorios",
    formTitle: "Nuevo recordatorio",
    reminderTitle: "Ocasión o evento...",
    whoFor: "¿Para quién es?",
    date: "Fecha",
    time: "Hora",
    create: "Guardar recordatorio",
    creating: "Guardando…",
    listTitle: "Tus recordatorios",
    none: "Aún no hay recordatorios.",
    statusScheduled: "programado",
    delete: "Eliminar",
    deleting: "Eliminando…",
    required: "Por favor completa todos los campos.",
    saved: "Recordatorio guardado.",
    deleted: "Recordatorio eliminado.",
    back: "Volver al Panel",
    banner: "Para crear recordatorios, inicia sesión con tu correo.",
    signinBtn: "Iniciar sesión",
    signInExplain: "Inicia sesión para que Zola pueda guardar este recordatorio y avisarte.",
    readyTitle: "Tu recordatorio está listo",
  },
  fr: {
    title: "Rappels",
    formTitle: "Nouveau rappel",
    reminderTitle: "Occasion ou événement...",
    whoFor: "Pour qui ?",
    date: "Date",
    time: "Heure",
    create: "Enregistrer le rappel",
    creating: "Enregistrement…",
    listTitle: "Vos rappels",
    none: "Aucun rappel pour l'instant.",
    statusScheduled: "planifié",
    delete: "Supprimer",
    deleting: "Suppression…",
    required: "Veuillez remplir tous les champs.",
    saved: "Rappel enregistré.",
    deleted: "Rappel supprimé.",
    back: "Retour au Tableau de bord",
    banner: "Pour créer des rappels, connectez-vous avec votre e-mail.",
    signinBtn: "Se connecter",
    signInExplain: "Connectez-vous pour que Zola puisse enregistrer ce rappel et vous prévenir.",
    readyTitle: "Votre rappel est prêt",
  }
};

/* -------------------------------------------------- */

export default function RemindersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RemindersContent />
    </Suspense>
  );
}

/* -------------------------------------------------- */

function RemindersContent() {
  const sp = useSearchParams();
  const lang = isLang(sp.get("lang")) ? (sp.get("lang") as Lang) : "en";
  const t = L[lang];

  const [userId, setUserId] = React.useState<string | null>(null);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [guestMode, setGuestMode] = React.useState(false);

  const [rows, setRows] = React.useState<Row[]>([]);
  const [title, setTitle] = React.useState("");
  const [whoFor, setWhoFor] = React.useState("");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [flash, setFlash] = React.useState<string | null>(null);
  const [pendingSignIn, setPendingSignIn] = React.useState(false);

  const DRAFT_KEY = "zolarus_pending_reminder";

  const autoSaveInFlight = React.useRef(false);
  const savedDraft = React.useRef<string | null>(null);

  /* LOAD REMINDERS & RETRY GUEST DRAFT WHEN AUTH IS READY */
  React.useEffect(() => {
    let active = true;
    let currentUserId: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function loadReminders(me: { id: string; email?: string }) {
      if (!active || autoSaveInFlight.current) return;
      autoSaveInFlight.current = true;
      const isCurrentUser = () => active && currentUserId === me.id;

      try {
        const { data: r, error: loadError } = await supabase
          .from("reminders")
          .select("*")
          .eq("user_id", me.id)
          .order("remind_at", { ascending: true });

        if (!isCurrentUser()) return;
        if (!loadError) setRows((r as Row[]) || []);
        else console.error("Could not load reminders.");

        const draftRaw = localStorage.getItem(DRAFT_KEY);
        if (!draftRaw || savedDraft.current === draftRaw) return;
        const draft = JSON.parse(draftRaw) as {
          title: string;
          whoFor: string;
          remind_at: string;
        };

        const { data: saved, error } = await supabase
          .from("reminders")
          .insert([
            {
              user_id: me.id,
              email: me.email || null,
              title: draft.title,
              who_for: draft.whoFor,
              remind_at: draft.remind_at,
            },
          ])
          .select("*")
          .single();

        if (error || !saved) {
          console.error("Guest reminder auto-save failed; draft retained. Retry on the next authenticated session event or reload.");
          return;
        }

        // Remember success even if browser storage cleanup fails.
        savedDraft.current = draftRaw;
        if (isCurrentUser()) {
          setRows((prev) => prev.some((row) => row.id === saved.id) ? prev : [...prev, saved as Row]);
          setPendingSignIn(false);
          setFlash(t.saved);
          setTimeout(() => { if (isCurrentUser()) setFlash(null); }, 2000);
        }
        try {
          // Do not clear a newer draft written while this insert was pending.
          if (localStorage.getItem(DRAFT_KEY) === draftRaw) localStorage.removeItem(DRAFT_KEY);
        } catch {
          console.error("Guest reminder saved, but local draft cleanup failed.");
        }
      } catch {
        console.error("Guest reminder auto-save could not complete; draft retained. Check storage availability and draft format, then reload to retry.");
      } finally {
        autoSaveInFlight.current = false;
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const me = session?.user;
      currentUserId = me?.id || null;
      setUserId(currentUserId);
      setUserEmail(me?.email || null);
      setGuestMode(!me);
      clearTimeout(timer);
      if (me) {
        // INITIAL_SESSION covers existing sessions; later events cover delayed sign-in.
        // Keep Supabase queries outside the auth callback's session lock.
        timer = setTimeout(() => { void loadReminders(me); }, 0);
      }
    });

    return () => {
      active = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const withLang = (href: string) => {
    const p = new URLSearchParams(sp as any);
    p.set("lang", lang);
    return `${href}?${p.toString()}`;
  };

  const formatLocal = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  /* CREATE REMINDER */
  async function createReminder() {
    if (!title.trim() || !whoFor.trim() || !date || !time) {
      setFlash(t.required);
      return;
    }

    const iso = new Date(`${date}T${time}:00`).toISOString();

    // Guests can fill out the reminder, but saving/notifying requires an account.
    if (guestMode) {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ title: title.trim(), whoFor: whoFor.trim(), remind_at: iso })
        );
      } catch {
        // storage unavailable — still show the sign-in prompt
      }
      setPendingSignIn(true);
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("reminders")
      .insert([
        {
          user_id: userId,
          email: userEmail,
          title: title.trim(),
          who_for: whoFor.trim(),
          remind_at: iso,
        }
      ])
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      setFlash(error.message);
      return;
    }

    setRows((prev) => [...prev, data as Row]);
    setTitle("");
    setWhoFor("");
    setDate("");
    setTime("");

    setFlash(t.saved);
    setTimeout(() => setFlash(null), 2000);
  }

  /* DELETE REMINDER */
  async function deleteReminder(id: string) {
    setDeletingId(id);

    await supabase.from("reminders").delete().eq("id", id);

    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);

    setFlash(t.deleted);
    setTimeout(() => setFlash(null), 2000);
  }

  /* -------------------------------------------------- */

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>

      <h1 style={{ fontWeight: 800, fontSize: "2rem", marginBottom: 12 }}>{t.title}</h1>

      {/* FORM */}
      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 16,
          background: "#fff",
          marginBottom: 20,
        }}
      >
        <div style={{ fontWeight: 700 }}>{t.formTitle}</div>

        <div className="mt-2.5 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.reminderTitle}
            style={inputStyle}
          />

          {/* Who For */}
          <input
            value={whoFor}
            onChange={(e) => setWhoFor(e.target.value)}
            placeholder={t.whoFor}
            style={inputStyle}
          />

          <div className="min-w-0">
            <label htmlFor="reminder-date" className="mb-1 block text-sm text-gray-700">
              {t.date}
            </label>
            <input
              id="reminder-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div className="min-w-0">
            <label htmlFor="reminder-time" className="mb-1 block text-sm text-gray-700">
              {t.time}
            </label>
            <input
              id="reminder-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {!pendingSignIn && (
          <button
            onClick={createReminder}
            disabled={saving}
            style={buttonStyle}
          >
            {saving ? t.creating : t.create}
          </button>
        )}

        {pendingSignIn && (
          <div
            style={{
              marginTop: 14,
              border: "1px solid #ffd8a8",
              background: "#fff8ef",
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.readyTitle}</div>
            <div style={{ color: "#555", marginBottom: 10 }}>{t.signInExplain}</div>
            <Link
              href={`/sign-in?redirect=${encodeURIComponent(`/reminders?lang=${lang}`)}&lang=${lang}`}
              style={{ ...buttonStyle, display: "inline-block", textAlign: "center", textDecoration: "none", width: "auto", padding: "10px 20px" }}
            >
              {t.signinBtn}
            </Link>
          </div>
        )}
      </section>

      {/* LIST */}
      <section style={{ border: "1px solid #ddd", borderRadius: 10, background: "#fff" }}>
        <div style={listHeaderStyle}>
          <div>{t.listTitle}</div>
          <div>{t.statusScheduled}</div>
          <div></div>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: 14 }}>{t.none}</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} style={listRowStyle}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.title}</div>

                {r.who_for && (
                  <div style={{ color: "#444", fontSize: 13 }}>
                    {r.who_for}
                  </div>
                )}

                <div style={{ color: "#777", fontSize: 12 }}>
                  {formatLocal(r.remind_at)}
                </div>
              </div>

              <div style={{ color: "#444" }}>{t.statusScheduled}</div>

              <button
                onClick={() => deleteReminder(r.id)}
                disabled={deletingId === r.id}
                style={deleteButtonStyle}
              >
                {deletingId === r.id ? t.deleting : t.delete}
              </button>
            </div>
          ))
        )}
      </section>

      <div style={{ marginTop: 20 }}>
        <Link href={withLang("/dashboard")} className="inline-block bg-gray-700 px-5 py-3 text-white rounded-lg">
          ← {t.back}
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------- */

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
  minHeight: 44,
  border: "1px solid #ccc",
  borderRadius: 8,
  padding: "10px 12px",
};

const buttonStyle = {
  backgroundColor: "#ff8c00",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  fontWeight: 800,
  marginTop: 12,
  cursor: "pointer",
  width: "100%",
};

const deleteButtonStyle = {
  backgroundColor: "#232F3E",
  color: "#FFD814",
  border: "1px solid #FFD814",
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
};

const listHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr auto",
  padding: "10px 12px",
  background: "#f8f8f8",
  borderBottom: "1px solid #ddd",
  fontWeight: 700,
};

const listRowStyle = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr auto",
  padding: "10px 12px",
  borderTop: "1px solid #eee",
};

