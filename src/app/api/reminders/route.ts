export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendReminderEmail } from '@/app/actions/sendReminderEmail';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date().toISOString();

  const { data } = await supabase
    .from('reminders')
    .select('*')
    .lte('remind_at', now)
    .is('sent_at', null)
    .limit(20);

  for (const r of data || []) {
    if (!r.email) continue;

    await sendReminderEmail(r.email, r.title || 'Reminder', r.remind_at);
await new Promise(res => setTimeout(res, 700));
    await supabase
      .from('reminders')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', r.id);
  }

  return NextResponse.json({ ok: true, processed: data?.length || 0 });
}