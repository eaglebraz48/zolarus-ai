"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

/* ---- language handling ---- */
type Lang = "en" | "pt" | "es" | "fr";
function getLang(): Lang {
  const fromQuery =
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("lang") as Lang | null)
      : null;

  const ck =
    typeof document !== "undefined"
      ? document.cookie.match(/(?:^|;)\s*zola_lang=([^;]+)/)
      : null;

  const fromCookie = (ck?.[1] as Lang | undefined) ?? undefined;

  const fromLocal =
    (typeof window !== "undefined"
      ? (localStorage.getItem("zola_lang") as Lang | null)
      : null) ?? undefined;

  const val = fromQuery || fromCookie || fromLocal || "en";
  return (["en", "pt", "es", "fr"].includes(val) ? val : "en") as Lang;
}

/* ---- translations ---- */
const t = {
  en: {
    title: "Profile",
    subtitle: "Basic information for your account.",
    fullName: "Full name",
    phone: "Phone (optional)",
    phonePH: "(555) 555-5555",
    save: "Save",
    saving: "Saving…",
    back: "← Back to dashboard",
    loading: "Loading…",
    saved: "Saved!",
    banner: "To edit your profile, please sign in with your email.",
    explainer:
      "Create your profile to unlock all features — including reminders, alerts, and personalized gifts.",
    signinBtn: "Sign in",
    delete: "Delete my account",
    deleting: "Deleting…",
    deletedMsg: "Your account has been deleted.",
  },
  pt: {
    title: "Perfil",
    subtitle: "Informações básicas da sua conta.",
    fullName: "Nome completo",
    phone: "Telefone (opcional)",
    phonePH: "(11) 99999-9999",
    save: "Salvar",
    saving: "Salvando…",
    back: "← Voltar ao painel",
    loading: "Carregando…",
    saved: "Salvo!",
    banner: "Para editar seu perfil, faça login com seu email.",
    explainer:
      "Crie o seu perfil para liberar todos os recursos — incluindo lembretes, alertas e presentes personalizados.",
    signinBtn: "Entrar",
    delete: "Excluir minha conta",
    deleting: "Excluindo…",
    deletedMsg: "Sua conta foi excluída.",
  },
  es: {
    title: "Perfil",
    subtitle: "Información básica de tu cuenta.",
    fullName: "Nombre completo",
    phone: "Teléfono (opcional)",
    phonePH: "(55) 5555-5555",
    save: "Guardar",
    saving: "Guardando…",
    back: "← Volver al panel",
    loading: "Cargando…",
    saved: "¡Guardado!",
    banner: "Para editar tu perfil, inicia sesión con tu correo.",
    explainer:
      "Crea tu perfil para desbloquear todas las funciones — incluidos recordatorios, alertas y regalos personalizados.",
    signinBtn: "Iniciar sesión",
    delete: "Eliminar mi cuenta",
    deleting: "Eliminando…",
    deletedMsg: "Tu cuenta ha sido eliminada.",
  },
  fr: {
    title: "Profil",
    subtitle: "Informations de base de votre compte.",
    fullName: "Nom complet",
    phone: "Téléphone (facultatif)",
    phonePH: "06 12 34 56 78",
    save: "Enregistrer",
    saving: "Enregistrement…",
    back: "← Retour au tableau de bord",
    loading: "Chargement…",
    saved: "Enregistré !",
    banner: "Pour modifier votre profil, connectez-vous avec votre e-mail.",
    explainer:
      "Créez votre profil pour débloquer toutes les fonctionnalités — y compris les rappels, alertes et cadeaux personnalisés.",
    signinBtn: "Se connecter",
    delete: "Supprimer mon compte",
    deleting: "Suppression…",
    deletedMsg: "Votre compte a été supprimé.",
  },
};

/* -------------------------------------------------------------- */

type Prof = { full_name: string | null; phone: string | null };

export default function ProfilePage() {
  const [lang, setLang] = useState<Lang>("en");
  const L = useMemo(() => t[lang], [lang]);

  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<Prof>({ full_name: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    setLang(getLang());

    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        setGuestMode(true);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      if (prof) setForm({ full_name: prof.full_name, phone: prof.phone });
      setLoading(false);
    })();
  }, []);

  /* -------------------------------------------------------------- */
  /* SAVE PROFILE */
  /* -------------------------------------------------------------- */
  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setMsg(null);

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: form.full_name?.trim() || null,
      phone: form.phone?.trim() || null,
    });

    setSaving(false);
    setMsg(error ? error.message : L.saved);
  }

  /* -------------------------------------------------------------- */
  /* DELETE ACCOUNT (via API route) */
  /* -------------------------------------------------------------- */
  async function handleDeleteAccount() {
    if (!userId) return;

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account? This cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);

    try {
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const result = await res.json();

      if (!result.success) {
        alert(result.error || "Error deleting account.");
        setDeleting(false);
        return;
      }

      await supabase.auth.signOut();

      alert(L.deletedMsg);

      window.location.href = `/?lang=${lang}`;
    } catch (err: any) {
      alert(err.message || "Unexpected error.");
      setDeleting(false);
    }
  }

  /* -------------------------------------------------------------- */

  if (loading)
    return <div className="p-6 text-white">{L.loading}</div>;

  return (
    <Suspense fallback={null}>
      <main className="max-w-3xl mx-auto p-6">

        {guestMode && (
          <div className="mb-6 rounded-lg bg-blue-900/40 border border-blue-700 px-4 py-3 text-blue-200 text-sm">
            {L.banner}
          </div>
        )}

        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          {L.title}
        </h1>

        {guestMode && (
          <p className="text-gray-300 mt-2 mb-4 text-sm">
            {L.explainer}
          </p>
        )}

        <form onSubmit={saveProfile} className="mt-8 space-y-5">

          {/* NAME */}
          <div>
            <label className="block text-sm font-medium text-gray-300">
              {L.fullName}
            </label>
            <input
              disabled={guestMode}
              style={{ color: "#000", backgroundColor: "#fff" }}
              className="mt-1 w-full rounded-lg border px-4 py-3 outline-none border-gray-300"
              value={form.full_name ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, full_name: e.target.value }))
              }
              placeholder="Jane Doe"
            />
          </div>

          {/* PHONE */}
          <div>
            <label className="block text-sm font-medium text-gray-300">
              {L.phone}
            </label>
            <input
              disabled={guestMode}
              style={{ color: "#000", backgroundColor: "#fff" }}
              className="mt-1 w-full rounded-lg border px-4 py-3 outline-none border-gray-300"
              value={form.phone ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder={L.phonePH}
            />
          </div>

          {/* BUTTONS */}
          <div className="flex gap-3">
            {!guestMode && (
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? L.saving : L.save}
              </button>
            )}

            {guestMode && (
              <Link
                href={`/sign-in?redirect=/profile&lang=${lang}`}
                className="rounded-lg bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700"
              >
                {L.signinBtn}
              </Link>
            )}

            <Link
              href={`/dashboard?lang=${lang}`}
              className="rounded-lg bg-gray-700 px-5 py-3 font-medium text-white hover:bg-gray-600 inline-block"
            >
              {L.back}
            </Link>
          </div>

          {/* DELETE ACCOUNT */}
          {!guestMode && (
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="mt-6 rounded-lg bg-red-600 px-5 py-3 text-white font-medium hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? L.deleting : L.delete}
            </button>
          )}

          {/* MESSAGE */}
          {!guestMode && msg && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                msg === L.saved
                  ? "bg-green-900/50 text-green-200 border border-green-700"
                  : "bg-red-900/50 text-red-200 border border-red-700"
              }`}
            >
              {msg}
            </div>
          )}
        </form>
      </main>
    </Suspense>
  );
}
