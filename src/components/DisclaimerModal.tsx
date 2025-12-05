'use client';

import { useEffect, useState } from 'react';

type Persistence = 'local' | 'session' | 'none';

type Props = {
  /** Increment when you materially change terms so users must accept again */
  termsVersion?: string;
  /**
   * 'local' = remember acceptance in localStorage (default)
   * 'session' = remember acceptance only for this browser session (sessionStorage)
   * 'none' = never remember; user must accept on every mount
   */
  persistence?: Persistence;
};

export default function DisclaimerModal({
  termsVersion = '2025-10-29',
  persistence = 'local',
}: Props) {
  const KEY = `zola_terms_accepted_v${termsVersion}`;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // If persistence is 'none' we always open (no storage check)
    if (persistence === 'none') {
      setOpen(true);
      return;
    }

    if (typeof window === 'undefined') {
      setOpen(true);
      return;
    }

    try {
      const storage =
        persistence === 'session' ? window.sessionStorage : window.localStorage;
      const ok = storage.getItem(KEY) === 'true';
      setOpen(!ok);
    } catch {
      // If storage access fails, open modal to be safe
      setOpen(true);
    }
  }, [KEY, persistence]);

  function accept() {
    try {
      if (persistence === 'local' && typeof window !== 'undefined') {
        window.localStorage.setItem(KEY, 'true');
      } else if (persistence === 'session' && typeof window !== 'undefined') {
        window.sessionStorage.setItem(KEY, 'true');
      }
      // if persistence === 'none', we intentionally do NOT store anything
    } catch {
      // ignore storage failures
    } finally {
      setOpen(false);
      setScrolled(false);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="zola-terms-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: 'min(720px, 92vw)',
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 16px 50px rgba(2,6,23,.35)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 id="zola-terms-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
            Before We Start
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#475569' }}>
            Scroll through the terms below to continue — available in English, Português, Español,
            and Français.
          </p>
        </div>

        <div
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) setScrolled(true);
          }}
          style={{
            maxHeight: '60vh',
            overflowY: 'auto',
            padding: 18,
            lineHeight: 1.55,
            color: '#0f172a',
          }}
        >
          {/* English */}
          <h3>English</h3>
          <p>
            <strong>User Responsibility.</strong> By using this app, you agree that you shop at your own
            risk. All purchases, payment methods, delivery issues, product quality, returns, and
            cancellations are your sole responsibility. <strong>Arison8, LLC</strong> and its product{' '}
            <strong>Zolarus</strong> are not liable for any damage, loss, or claim arising out of your
            purchase or use of merchandise. You must be at least 18 years old or have consent of a
            parent or legal guardian to make purchases. Please review seller terms and your local
            consumer protections.
          </p>
          <p>
            <strong>Affiliate Disclosure.</strong> Some links in this app may be affiliate links.{' '}
            <em>As an Amazon Associate, we earn from qualifying purchases.</em>
          </p>
          <hr />

          {/* Portuguese */}
          <h3>Português (Brasil)</h3>
          <p>
            <strong>Responsabilidade do Usuário.</strong> Ao usar este aplicativo, você concorda que
            realiza suas compras por sua própria conta e risco. Todas as compras, métodos de pagamento,
            entregas, qualidade dos produtos, devoluções e cancelamentos são de sua inteira
            responsabilidade. A <strong>Arison8, LLC</strong> e seu produto <strong>Zolarus</strong> não
            se responsabilizam por qualquer dano, perda ou reclamação decorrente da compra ou uso de
            mercadorias. É necessário ter pelo menos 18 anos ou consentimento de um responsável legal
            para efetuar compras. Leia os termos do vendedor e as leis de proteção ao consumidor do seu
            país.
          </p>
          <p>
            <strong>Divulgação de Afiliados.</strong> Alguns links neste aplicativo podem ser links de
            afiliados. <em>Como associado da Amazon, ganhamos com compras qualificadas.</em>
          </p>
          <hr />

          {/* Spanish */}
          <h3>Español</h3>
          <p>
            <strong>Responsabilidad del Usuario.</strong> Al usar esta aplicación, aceptas que realizas
            tus compras bajo tu propio riesgo. Todas las compras, métodos de pago, entregas, calidad de
            productos, devoluciones y cancelaciones son de tu exclusiva responsabilidad.{' '}
            <strong>Arison8, LLC</strong> y su producto <strong>Zolarus</strong> no se hacen responsables
            de ningún daño, pérdida o reclamo derivado de tus compras o uso de los productos. Debes
            tener al menos 18 años o el consentimiento de un padre o tutor legal para realizar compras.
            Revisa los términos del vendedor y las leyes de protección al consumidor de tu país.
          </p>
          <p>
            <strong>Divulgación de Afiliados.</strong> Algunos enlaces en esta aplicación pueden ser
            enlaces de afiliados. <em>Como asociado de Amazon, ganamos con las compras que califiquen.</em>
          </p>
          <hr />

          {/* French */}
          <h3>Français</h3>
          <p>
            <strong>Responsabilité de l’Utilisateur.</strong> En utilisant cette application, vous acceptez
            d’effectuer vos achats à vos propres risques. Tous les achats, modes de paiement, livraisons,
            qualité des produits, retours et annulations relèvent de votre seule responsabilité.{' '}
            <strong>Arison8, LLC</strong> et son produit <strong>Zolarus</strong> ne sont pas responsables
            des dommages, pertes ou réclamations liés à vos achats ou à l’utilisation de marchandises.
            Vous devez avoir au moins 18 ans ou le consentement d’un parent ou tuteur légal pour effectuer
            des achats. Consultez les conditions du vendeur et les protections du consommateur de votre pays.
          </p>
          <p>
            <strong>Déclaration d’Affiliation.</strong> Certains liens de cette application peuvent être
            des liens d’affiliation. <em>En tant qu’associé Amazon, nous gagnons de l’argent sur les
            achats qualifiés.</em>
          </p>
        </div>

        <div
          style={{
            padding: 16,
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            onClick={accept}
            disabled={!scrolled}
            style={{
              border: 'none',
              background: scrolled ? '#0f172a' : '#94a3b8',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 16px',
              fontWeight: 800,
              cursor: scrolled ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s ease',
            }}
          >
            {scrolled ? 'I Agree' : 'Scroll to Agree'}
          </button>
        </div>
      </div>
    </div>
  );
}
