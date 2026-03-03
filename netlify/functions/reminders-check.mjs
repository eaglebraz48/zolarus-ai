// netlify/functions/reminders-check.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_BASE_URL = process.env.APP_BASE_URL;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

export default async () => {
  const nowISO = new Date().toISOString();

  console.log('[reminders-check] Starting at:', nowISO);
  console.log('[reminders-check] Env vars present:', {
    SUPABASE_URL: !!SUPABASE_URL,
    SERVICE_ROLE: !!SERVICE_ROLE,
    APP_BASE_URL: !!APP_BASE_URL,
  });

  // Hard fail if missing required envs (otherwise you’ll chase ghosts)
  if (!SUPABASE_URL || !SERVICE_ROLE || !APP_BASE_URL) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Missing required env vars',
        required: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'APP_BASE_URL'],
        time: nowISO,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('[reminders-check] Querying reminders...');

    const { data: dueReminders, error: queryError } = await supabase
      .from('reminders')
      .select('id, title, remind_at, email, sent_at')
      .lte('remind_at', nowISO)
      .is('sent_at', null)
      .order('remind_at', { ascending: true })
      .limit(20);

    console.log('[reminders-check] Query result:', {
      error: queryError?.message ?? null,
      count: dueReminders?.length ?? 0,
    });

    if (queryError) {
      console.error('[reminders-check] Query failed:', queryError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Query failed',
          message: queryError.message,
          processed: 0,
          sent: 0,
          time: nowISO,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!dueReminders || dueReminders.length === 0) {
      console.log('[reminders-check] No reminders due');
      return new Response(
        JSON.stringify({
          ok: true,
          message: 'No reminders due',
          processed: 0,
          sent: 0,
          time: nowISO,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[reminders-check] Found ${dueReminders.length} due reminders`);

    const details = [];
    let sentCount = 0;

    for (const r of dueReminders) {
      const item = {
        id: r.id,
        title: r.title ?? null,
        email: r.email ?? null,
        remind_at: r.remind_at ?? null,
        send_ok: false,
        send_error: null,
        update_ok: false,
        update_error: null,
        status: null,
      };

      console.log(`[reminders-check] Processing reminder: ${r.id}`);

      if (!r.email) {
        item.status = 'SKIP - no email';
        details.push(item);
        continue;
      }

      // 1) Send via your existing Next.js API (/api/send) so you have ONE sender setup
      try {
        const resp = await fetch(`${APP_BASE_URL}/api/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: r.email,
            subject: `Reminder: ${r.title ?? '(no title)'}`,
            html: `<h2>${r.title ?? 'Reminder'}</h2><p>Scheduled: ${new Date(r.remind_at).toISOString()}</p>`,
          }),
        });

        const out = await resp.json().catch(() => ({}));

        if (!resp.ok || !out?.success) {
          throw new Error(`api/send failed (${resp.status}): ${JSON.stringify(out)}`);
        }

        item.send_ok = true;
        item.status = 'SENT_EMAIL';
        console.log(`[reminders-check] Email sent via /api/send. id=${out?.id ?? 'n/a'}`);
      } catch (e) {
        item.send_ok = false;
        item.send_error = String(e);
        item.status = 'SEND_FAILED';
        console.error('[reminders-check] Email send failed:', e);
        details.push(item);
        continue; // don’t mark sent_at if email failed
      }

      // 2) Mark as sent (sent_at)
      try {
        const sentAt = new Date().toISOString();

        const { error: updErr } = await supabase
          .from('reminders')
          .update({ sent_at: sentAt })
          .eq('id', r.id);

        if (updErr) throw updErr;

        item.update_ok = true;
        item.status = 'SENT_AND_MARKED';
        sentCount++;
        console.log(`[reminders-check] Marked ${r.id} as sent_at=${sentAt}`);
      } catch (e) {
        item.update_ok = false;
        item.update_error = String(e);
        item.status = 'UPDATE_FAILED';
        console.error('[reminders-check] DB update failed:', e);
      }

      // tiny pacing so you don’t blast providers
      await new Promise((res) => setTimeout(res, 400));

      details.push(item);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed: dueReminders.length,
        sent: sentCount,
        time: nowISO,
        details,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[reminders-check] Fatal error:', e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Fatal error',
        message: String(e),
        processed: 0,
        sent: 0,
        time: nowISO,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};