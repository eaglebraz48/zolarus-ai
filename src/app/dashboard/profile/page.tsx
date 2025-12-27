"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function DashboardProfilePage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      if (data?.full_name) setFullName(data.full_name);
      if (data?.phone) setPhone(data.phone);

      setLoading(false);
    })();
  }, []);

  const save = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      phone,
    });
    alert("Saved!");
  };

  if (loading) return <p style={{ color: "#fff" }}>Loading…</p>;

  return (
    <main
      style={{
        padding: "40px",
        maxWidth: "600px",
        margin: "0 auto",
        color: "#fff",
      }}
    >
      {/* TITLE */}
      <h1 style={{ fontSize: 34, fontWeight: 700, color: "#7ee787" }}>
        Profile
      </h1>
      <p style={{ marginTop: 6, color: "#9fb0c8" }}>
        Basic information for your account.
      </p>

      {/* FORM */}
      <div style={{ marginTop: 30 }}>

        {/* FULL NAME */}
        <label style={{ color: "#cfd8e3", fontWeight: 500 }}>Full name</label>
        <input
          placeholder="Enter your name"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 8,
            marginTop: 6,
            marginBottom: 20,
            border: "1px solid #3b4252",
            backgroundColor: "#111827",
            color: "#ffffff",
            fontSize: 16,
          }}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        {/* PHONE */}
        <label style={{ color: "#cfd8e3", fontWeight: 500 }}>
          Phone (optional)
        </label>
        <input
          placeholder="(555) 555-5555"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 8,
            marginTop: 6,
            marginBottom: 20,
            border: "1px solid #3b4252",
            backgroundColor: "#111827",
            color: "#ffffff",
            fontSize: 16,
          }}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {/* BUTTONS */}
        <button
          onClick={save}
          style={{
            background: "#0b72ff",
            color: "#fff",
            borderRadius: 8,
            padding: "10px 18px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          Save
        </button>

        <Link
          href="/dashboard"
          style={{
            marginLeft: 20,
            padding: "10px 18px",
            borderRadius: 8,
            background: "#374151",
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          ← Back to dashboard
        </Link>
      </div>

      {/* PLACEHOLDER STYLE */}
      <style>
        {`
          input::placeholder {
            color: #9ca3af !important;
            opacity: 1;
          }
        `}
      </style>
    </main>
  );
}
