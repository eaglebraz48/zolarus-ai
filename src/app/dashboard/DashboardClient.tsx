const L: Record<Lang, any> = {
  en: {
    header: 'Dashboard',
    welcome: 'Welcome,',
    profile: 'Profile',
    setUp: 'Set up profile',
    reminders: 'Reminders',
    open: 'Open',
    shopTitle: 'Shop',
    browse: 'Browse / Shop now',
    compareSubtitle: 'Compare prices across stores',
    compareFreeText: 'Compare prices for free',
    compareBlurb:
      "Compare prices across other stores to save on gifts and everyday buys. We'll surface smart matches for what you're shopping, so you don't overpay when prices vary.",
    compareCTA: 'Compare prices',
    zolaCredits: 'Zola Credits',
    comingSoon: 'Coming soon',
    loading: 'Loading...',
    referralLabel: 'Your referral link',
    copy: 'Copy',
    basicInfo: 'Basic info',
    remindersBlurb: "Set reminders for special occasions and we'll email you on time.",
    referTeaser: 'Start referring today — share the app link below',
    referralsCircle: 'Referrals',
    share: 'Share',
    copied: 'Copied',
  },

  pt: {
    header: 'Painel',
    welcome: 'Bem-vindo,',
    profile: 'Perfil',
    setUp: 'Configurar perfil',
    reminders: 'Lembretes',
    open: 'Abrir',
    shopTitle: 'Loja',
    browse: 'Navegar / Comprar agora',
    compareSubtitle: 'Comparar preços entre lojas',
    compareFreeText: 'Comparar preços de graça',
    compareBlurb:
      'Compare preços em outras lojas para economizar em presentes e compras do dia a dia. Nós sugerimos correspondências inteligentes para o que você procura.',
    compareCTA: 'Comparar preços',
    zolaCredits: 'Créditos Zola',
    comingSoon: 'Em breve',
    loading: 'Carregando...',
    referralLabel: 'Seu link de indicação',
    copy: 'Copiar',
    basicInfo: 'Informações básicas',
    remindersBlurb:
      'Crie lembretes para datas especiais e nós te enviamos um e-mail na hora certa.',
    referTeaser: 'Comece a indicar hoje — compartilhe o link do app abaixo',
    referralsCircle: 'Indicações',
    share: 'Compartilhar',
    copied: 'Copiado',
  },

  es: {
    header: 'Tablero',
    welcome: 'Bienvenido,',
    profile: 'Perfil',
    setUp: 'Configurar perfil',
    reminders: 'Recordatorios',
    open: 'Abrir',
    shopTitle: 'Tienda',
    browse: 'Explorar / Comprar ahora',
    compareSubtitle: 'Comparar precios entre tiendas',
    compareFreeText: 'Comparar precios gratis',
    compareBlurb:
      'Compara precios para ahorrar en regalos y compras diarias. Mostraremos coincidencias inteligentes para lo que buscas.',
    compareCTA: 'Comparar precios',
    zolaCredits: 'Créditos Zola',
    comingSoon: 'Próximamente',
    loading: 'Cargando...',
    referralLabel: 'Tu enlace de referencia',
    copy: 'Copiar',
    basicInfo: 'Información básica',
    remindersBlurb:
      'Crea recordatorios para fechas especiales y te enviaremos un correo a tiempo.',
    referTeaser: 'Empieza a invitar hoy: comparte el enlace de la app abajo',
    referralsCircle: 'Referencias',
    share: 'Compartir',
    copied: 'Copiado',
  },

  fr: {
    header: 'Tableau de bord',
    welcome: 'Bienvenue,',
    profile: 'Profil',
    setUp: 'Configurer le profil',
    reminders: 'Rappels',
    open: 'Ouvrir',
    shopTitle: 'Boutique',
    browse: 'Parcourir / Acheter maintenant',
    compareSubtitle: 'Comparer les prix entre les boutiques',
    compareFreeText: 'Comparer les prix gratuitement',
    compareBlurb:
      "Comparez les prix pour économiser sur les cadeaux et achats quotidiens. Nous mettrons en avant des correspondances intelligentes pour vos recherches.",
    compareCTA: 'Comparer les prix',
    zolaCredits: 'Crédits Zola',
    comingSoon: 'Bientôt',
    loading: 'Chargement...',
    referralLabel: "Votre lien d'invitation",
    copy: 'Copier',
    basicInfo: 'Infos de base',
    remindersBlurb:
      'Créez des rappels pour les dates importantes et nous vous enverrons un e-mail à temps.',
    referTeaser:
      'Commencez à parrainer dès maintenant — partagez le lien de l’app ci-dessous',
    referralsCircle: 'Parrainages',
    share: 'Partager',
    copied: 'Copié',
  },
};


// --------------------------
// Auth guard (reviewer + normal users)
// --------------------------
React.useEffect(() => {
  let mounted = true;

  (async () => {
    try {
      if (!mounted) return;

      // 🔥 NEW LOGIC:
      // Reviewer should ONLY bypass if login form has validated
      const reviewer = localStorage.getItem("reviewer_mode");

      if (reviewer === "true") {
        // reviewer explicitly logged in → allow access
        return;
      }

      // 🔐 Normal users → require Supabase session
      const { data } = await supabase.auth.getSession();

      if (!data?.session) {
        window.location.href = "/sign-in";
        return;
      }

    } catch (err) {
      if (mounted) {
        window.location.href = "/sign-in";
      }
    }
  })();

  return () => {
    mounted = false;
  };
}, []);


  // --------------------------

  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [profileName, setProfileName] = React.useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [referral, setReferral] = React.useState('');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    let mountedFlag = true;
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mountedFlag) return;
        setUserEmail(user?.email ?? null);

        // attempt to fetch profile (profiles table)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, display_name')
          .eq('id', user?.id)
          .single();

        if (!mountedFlag) return;
        setProfileName(
          profile?.display_name ?? profile?.full_name ?? user?.email ?? null
        );
      } catch (err) {
        // ignore — keep UI simple
      } finally {
        if (mountedFlag) setLoadingProfile(false);
      }
    };

    load();
    return () => {
      mountedFlag = false;
      setMounted(false);
    };
  }, []);

  // compute referral on client only
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const base = window.location.origin;
      const url = `${base}/?ref=global&lang=${encodeURIComponent(lang)}`;
      setReferral(url);
    } catch {
      setReferral('');
    }
  }, [lang]);

  async function copyReferral() {
    try {
      if (!referral) return;
      await navigator.clipboard.writeText(referral);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  // localized "Zolarus International / Brasil / ..." label
  const internationalLabel = React.useMemo(() => {
    if (lang === 'pt') return 'Zolarus Brasil';
    if (lang === 'es') return 'Zolarus Internacional';
    if (lang === 'fr') return 'Zolarus International';
    return 'Zolarus International';
  }, [lang]);

  return (
    <div style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
      {/* keep disclaimer component — its internal logic determines show/remember */}
      <DisclaimerModal termsVersion="2025-10-29" />

      <h2
        style={{
          color: '#14aaf5',
          fontSize: 36,
          marginBottom: 8,
          textAlign: 'left',
        }}
      >
        {t.header}
      </h2>
      <p
        style={{
          marginBottom: 20,
          color: '#9fb0c8',
          textAlign: 'left',
        }}
      >
        {t.welcome}{' '}
        <strong style={{ color: '#7ee787' }}>
          {profileName ?? userEmail ?? 'guest'}
        </strong>
      </p>

      {/* Centered card grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 18,
          justifyItems: 'center',
        }}
      >
        {/* Profile card */}
        <div style={{ ...cardStyle(), width: '100%' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>{t.profile}</h3>
          <p style={{ color: '#7b8794' }}>{t.basicInfo}</p>
          <Link href={`/dashboard/profile?lang=${lang}`} className="btn-small">
            <button style={primaryBtnStyle(false)}>{t.setUp}</button>
          </Link>
        </div>

        {/* Reminders */}
        <div style={{ ...cardStyle(), width: '100%' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>{t.reminders}</h3>
          <p style={{ color: '#7b8794' }}>{t.remindersBlurb}</p>
          <Link
            href={`/dashboard/reminders?lang=${lang}`}
            className="btn-small"
          >
            <button style={primaryBtnStyle(false)}>{t.open}</button>
          </Link>
        </div>

        {/* Shop card */}
        <div style={{ ...cardStyle(), width: '100%' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>{t.shopTitle}</h3>

       {/* Browse / Shop now - vivid amazon-ish orange */}
<div style={{ marginTop: 8 }}>
  <Link
    href={`/shop?lang=${lang}`}
    style={{
      display: 'inline-block',
      padding: '8px 14px',
      borderRadius: 8,
      background: 'linear-gradient(180deg,#ff9900,#e07a00)',
      color: '#111',
      fontWeight: 700,
      textDecoration: 'none',
      boxShadow: '0 6px 18px rgba(224,122,0,0.18)',
    }}
  >
    Browse Now
  </Link>
</div>

            <strong
  style={{
    display: 'block',
    marginBottom: 6,
    color: '#fff',
  }}
>
  Compare prices using our AI
</strong>

<div style={{ color: '#9fb0c8', marginBottom: 10 }}>
  Compare prices for free
</div>

<p style={{ color: '#9fb0c8', marginBottom: 12 }}>
  See price differences across stores instantly — powered by AI.
</p>

<Link
  href={`/shop?lang=${lang}`}
  style={{
    display: 'inline-block',
    padding: '8px 14px',
    borderRadius: 8,
    background: '#0b72ff',
    color: '#fff',
    fontWeight: 700,
    textDecoration: 'none',
  }}
  aria-label="Compare prices"
  title="Compare prices"
>
  Compare prices
</Link>


          </div>

          <div style={{ marginTop: 12 }}>
            {loadingProfile ? (
              <Link
  href={`/shop?lang=${lang}`}
  style={{
    color: '#cbd5e1',
    textDecoration: 'underline',
  }}
>
  {t.loading}
</Link>

            ) : null}
          </div>
        </div>

        {/* Zola Credits */}
        <div style={{ ...cardStyle(), width: '100%' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>{t.zolaCredits}</h3>
          <p style={{ color: '#7b8794' }}>
            {t.comingSoon}{' '}
            <span
              style={{
                color: '#7ee787',
                fontWeight: 700,
              }}
            >
              {t.referTeaser}
            </span>
          </p>
        </div>

    {/* Empty placeholder to keep grid symmetric (if needed) */}
<div style={{ width: '100%', visibility: 'hidden' }} />

{/* Bottom centered circles + referral */}
<div
  style={{
    marginTop: 30,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 18,
  }}
>

        <div
          style={{
            display: 'flex',
            gap: 24,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background:
                'radial-gradient(circle at 30% 30%, #10b981 0%, #047857 40%, #064e3b 100%)',
              boxShadow:
                '0 12px 30px rgba(16,185,129,0.18), inset 0 -6px 20px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 16 }}>{internationalLabel}</div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                marginTop: 6,
              }}
            >
              {t.comingSoon}
            </div>
          </div>

          <Link
  href={`/referrals?lang=${lang}`}
  style={{
    width: 100,
    height: 100,
    borderRadius: '50%',
    background:
      'radial-gradient(circle at 30% 30%, #7c3aed 0%, #5b21b6 40%, #3b0f73 100%)',
    boxShadow:
      '0 12px 30px rgba(124,58,237,0.14), inset 0 -6px 20px rgba(0,0,0,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    textAlign: 'center',
    textDecoration: 'none',
  }}
  aria-label={t.referralsCircle}
  title={t.referralsCircle}
>
  {t.referralsCircle}
</Link>

        </div>

        {/* Referral link row */}
        <div
          style={{
            width: '100%',
            maxWidth: 720,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <label
            style={{
              color: '#9fb0c8',
              minWidth: 140,
            }}
          >
            {t.referralLabel}
          </label>

          <input
            readOnly
            value={referral}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: '#0b1220',
              color: '#e6eef8',
              minWidth: 160,
              maxWidth: 520,
            }}
          />

          <button
            onClick={copyReferral}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: copied ? '#059669' : '#0b72ff',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {copied ? t.copied : t.copy}
          </button>

          <button
            onClick={async () => {
              const text =
                lang === 'pt'
                  ? 'Vem testar o Zolarus comigo: '
                  : lang === 'es'
                  ? 'Prueba Zolarus conmigo: '
                  : lang === 'fr'
                  ? 'Essaie Zolarus avec moi : '
                  : 'Try Zolarus with me: ';

              const payload = {
                title: 'Zolarus',
                text: text + referral,
                url: referral,
              };

              try {
                if (navigator && (navigator as any).share) {
                  await (navigator as any).share(payload);
                } else {
                  await navigator.clipboard.writeText(payload.text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              } catch {}
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: '#0951a8',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t.share}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- styles ---------- */

function cardStyle(): React.CSSProperties {
  return {
    padding: 18,
    borderRadius: 12,
    background: '#0b1220',
    border: '1px solid rgba(255,255,255,0.12)',
    minHeight: 140,
  };
}

function primaryBtnStyle(ghost = false): React.CSSProperties {
  if (ghost) {
    return {
      padding: '8px 12px',
      borderRadius: 8,
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.06)',
      color: '#cfe9ff',
    };
  }
  return {
    padding: '8px 12px',
    borderRadius: 8,
    background: '#0b72ff',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
  };
}
