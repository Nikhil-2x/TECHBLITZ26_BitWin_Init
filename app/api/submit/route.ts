import { formSchema, LeadRecord } from '@/lib/types';
import { checkBotId } from 'botid/server';
import { saveLead } from '@/lib/pipeline';
import { bot, CHAT_ID } from '@/lib/telegram';
import { randomUUID } from 'crypto';
import { qualify, researchAgent } from '@/lib/services';

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

  // Run AI research synchronously
  let research = 'Research failed - please check AI configuration';
  let qualification = { category: 'FOLLOW_UP' as const, reason: 'AI research failed', score: 5 };

  try {
    if (process.env.GROQ_API_KEY && process.env.EXA_API_KEY) {
      // Run research
      const researchResult = await researchAgent.generate({
        prompt: `Provide a complete research summary in ONE PARAGRAPH (maximum 15 lines) about the lead's company and background: ${JSON.stringify(data)}. Include key facts about their industry, company size, notable achievements, and any relevant business information. Make it comprehensive but concise, flowing as one cohesive paragraph.`,
      });
      research = researchResult.text;

      // Run qualification
      qualification = await qualify(data, research);
    } else {
      console.warn('⚠️ AI keys not configured - using fallback qualification');
    }
  } catch (error) {
    console.error('AI research/qualification failed:', error);
  }

  // Save lead with research and score
  const lead: LeadRecord = {
    lead_id: leadId,
    name: data.name,
    email: data.email,
    company: data.company ?? '',
    message: data.message,
    score: qualification.score,
    status: 'pending',
    qualification,
    research,
    created_at: now,
    updated_at: now,
    follow_ups_sent: 0
  };
  saveLead(lead);

  // Send Telegram notification with research and score
  if (bot && CHAT_ID) {
    try {
      const { Markup } = await import('telegraf');
      const stars = '⭐'.repeat(Math.max(1, Math.round(qualification.score / 2)));
      const categoryEmoji =
        qualification.category === 'QUALIFIED'
          ? '✅'
          : qualification.category === 'FOLLOW_UP'
            ? '🔄'
            : '🟡';

      await bot.telegram.sendMessage(
        CHAT_ID,
        `🚀 <b>New Lead Received!</b>\n\n` +
          `👤 <b>Name:</b> ${esc(data.name)}\n` +
          `🏢 <b>Company:</b> ${esc(data.company || 'N/A')}\n` +
          `📧 <b>Email:</b> ${esc(data.email)}\n` +
          `📝 <b>Message:</b> ${esc(data.message.slice(0, 300))}\n\n` +
          `${categoryEmoji} <b>Category:</b> ${qualification.category}\n` +
          `📊 <b>Score:</b> ${qualification.score}/10 ${stars}\n` +
          `💡 <b>Reason:</b> ${esc(qualification.reason)}\n\n` +
          `🔍 <b>Research Summary:</b>\n${esc(research)}\n\n` +
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

  return Response.json(
    { message: 'Form submitted successfully', lead_id: leadId },
    { status: 200 }
  );
}
