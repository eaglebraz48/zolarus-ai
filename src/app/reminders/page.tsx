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

  /* LOAD USER & EXISTING REMINDERS */
  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const me = data.user;

      if (!me) {
        setGuestMode(true);
        return;
      }

      setUserId(me.id);
      setUserEmail(me.email || null);

      const { data: r } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", me.id)
        .order("remind_at", { ascending: true });

      setRows((r as Row[]) || []);
    })();
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
          background: guestMode ? "#eee" : "#fff",
          opacity: guestMode ? 0.45 : 1,
          pointerEvents: guestMode ? "none" : "auto",
          marginBottom: 20,
        }}
      >
        <div style={{ fontWeight: 700 }}>{t.formTitle}</div>

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

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={inputStyle}
        />

        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          style={inputStyle}
        />

        <button
          onClick={createReminder}
          disabled={saving}
          style={buttonStyle}
        >
          {saving ? t.creating : t.create}
        </button>
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

const inputStyle = {
  border: "1px solid #ccc",
  borderRadius: 8,
  padding: "10px 12px",
  marginTop: 10,
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

