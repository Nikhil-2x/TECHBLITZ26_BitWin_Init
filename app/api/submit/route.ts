import { formSchema, LeadRecord } from '@/lib/types';
import { checkBotId } from 'botid/server';
import { saveLead } from '@/lib/pipeline';
import { bot, CHAT_ID } from '@/lib/telegram';
import { randomUUID } from 'crypto';

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function POST(request: Request) {
  const verification = await checkBotId();

  if (verification.isBot) {
    return Response.json({ error: 'Access denied' }, { status: 403 });
  }

  const body = await request.json();

  const parsedBody = formSchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json({ error: parsedBody.error.message }, { status: 400 });
  }

  const data = parsedBody.data;
  const leadId = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  const now = new Date().toISOString();

  // Save lead immediately to pipeline with pending status
  const lead: LeadRecord = {
    lead_id: leadId,
    name: data.name,
    email: data.email,
    company: data.company ?? '',
    message: data.message,
    score: 0,
    status: 'pending',
    qualification: { category: 'FOLLOW_UP', reason: 'Awaiting AI analysis...', score: 0 },
    research: 'AI research in progress...',
    created_at: now,
    updated_at: now,
    follow_ups_sent: 0
  };
  saveLead(lead);

  // Send Telegram notification IMMEDIATELY — no AI dependency
  if (bot && CHAT_ID) {
    try {
      const { Markup } = await import('telegraf');
      await bot.telegram.sendMessage(
        CHAT_ID,
        `🚀 <b>New Lead Received!</b>\n\n` +
          `👤 <b>Name:</b> ${esc(data.name)}\n` +
          `🏢 <b>Company:</b> ${esc(data.company || 'N/A')}\n` +
          `📧 <b>Email:</b> ${esc(data.email)}\n` +
          `📝 <b>Message:</b> ${esc(data.message.slice(0, 300))}\n\n` +
          `⏳ <i>AI research is running in background. Lead score will be updated shortly.</i>\n\n` +
          `🆔 <b>Lead ID:</b> <code>${leadId}</code>`,
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [
              Markup.button.callback('✅ Approve Lead', `approve_${leadId}`),
              Markup.button.callback('❌ Reject Lead', `reject_${leadId}`)
            ]
          ]).reply_markup
        }
      );
    } catch (err) {
      console.error('Telegram notification failed:', err);
    }
  } else {
    console.warn('⚠️ Telegram not configured — skipping notification');
  }

  // Fire AI research workflow in background (non-blocking)
  // Only runs if workflow API keys are configured
  if (process.env.AI_GATEWAY_API_KEY && process.env.EXA_API_KEY) {
    import('workflow/api').then(({ start }) =>
      import('@/workflows/inbound').then(({ workflowInbound }) =>
        start(workflowInbound, [data, leadId]).catch((err: unknown) =>
          console.error('Workflow error:', err)
        )
      )
    ).catch((err: unknown) => console.error('Workflow import error:', err));
  }

  return Response.json(
    { message: 'Form submitted successfully', lead_id: leadId },
    { status: 200 }
  );
}
