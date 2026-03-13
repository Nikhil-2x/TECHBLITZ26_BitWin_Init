import { Telegraf, Markup } from 'telegraf';
import type { LeadRecord, QualificationSchema } from './types';
import {
  getAllLeads,
  getLead,
  getPipelineSummary,
  updateLead
} from './pipeline';
import { generateOutreachMessage, writeEmail } from './services';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';

if (!BOT_TOKEN) {
  console.warn(
    '⚠️  TELEGRAM_BOT_TOKEN is not set. Telegram integration will be disabled.'
  );
}

export const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN) : null;

/* ─────────────────────────────── Helpers ──────────────────────────────── */

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ─────────────────────────── Notifications ────────────────────────────── */

/**
 * Agent 4 – Telegram Decision Agent
 * Send lead details + approve/reject inline keyboard to the rep.
 */
export async function sendLeadNotification(lead: LeadRecord): Promise<void> {
  if (!bot || !CHAT_ID) {
    console.warn('⚠️  Telegram not configured, skipping notification.');
    return;
  }

  const stars = '⭐'.repeat(Math.max(1, Math.round(lead.score / 2)));
  const categoryEmoji =
    lead.qualification.category === 'QUALIFIED'
      ? '✅'
      : lead.qualification.category === 'FOLLOW_UP'
        ? '🔄'
        : '🟡';

  const message =
    `🚀 <b>New Lead Received</b>\n\n` +
    `👤 <b>Name:</b> ${esc(lead.name)}\n` +
    `🏢 <b>Company:</b> ${esc(lead.company || 'N/A')}\n` +
    `📧 <b>Email:</b> ${esc(lead.email)}\n` +
    `📝 <b>Message:</b> ${esc(lead.message.slice(0, 200))}\n\n` +
    `${categoryEmoji} <b>Category:</b> ${lead.qualification.category}\n` +
    `📊 <b>Score:</b> ${lead.score}/10 ${stars}\n` +
    `💡 <b>Reason:</b> ${esc(lead.qualification.reason)}\n\n` +
    `🔍 <b>Research Summary:</b>\n${esc(lead.research.slice(0, 600))}...\n\n` +
    `🆔 <b>Lead ID:</b> <code>${lead.lead_id}</code>`;

  await bot.telegram.sendMessage(CHAT_ID, message, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Approve Lead', `approve_${lead.lead_id}`),
        Markup.button.callback('❌ Reject Lead', `reject_${lead.lead_id}`)
      ]
    ]).reply_markup
  });
}

/* ─────────────────────────── Approval Actions ─────────────────────────── */

/**
 * Agent 5 – Outreach Agent
 * Triggered when rep approves a lead. Generates personalized outreach and
 * schedules follow-ups at Day 2 and Day 5.
 */
export async function handleApprove(leadId: string): Promise<void> {
  if (!bot || !CHAT_ID) return;

  const lead = getLead(leadId);
  if (!lead) {
    await bot.telegram.sendMessage(CHAT_ID, `⚠️ Lead <code>${leadId}</code> not found.`, { parse_mode: 'HTML' });
    return;
  }
  if (lead.status !== 'pending') {
    await bot.telegram.sendMessage(CHAT_ID, `ℹ️ Lead <b>${esc(lead.name)}</b> was already <b>${lead.status}</b>.`, { parse_mode: 'HTML' });
    return;
  }

  updateLead(leadId, { status: 'approved' });

  // Immediately confirm to the rep — no AI needed
  await bot.telegram.sendMessage(
    CHAT_ID,
    `✅ <b>Lead Approved!</b>\n\n👤 <b>${esc(lead.name)}</b> from <b>${esc(lead.company || 'N/A')}</b>\n📧 ${esc(lead.email)}\n\n⏳ Generating personalized outreach...`,
    { parse_mode: 'HTML' }
  );

  // Try AI outreach — fall back to template if AI keys not set
  let outreachMessage: string;
  let emailDraft: string;

  try {
    [outreachMessage, emailDraft] = await Promise.all([
      generateOutreachMessage(lead.research, lead.qualification, lead, 1),
      writeEmail(lead.research, lead.qualification, lead)
    ]);
  } catch {
    outreachMessage =
      `Hi ${lead.name},\n\nI came across ${lead.company || 'your work'} and wanted to reach out. I think there's a great opportunity for us to work together.\n\nWould you be open to a quick 15-minute call this week?\n\nBest regards`;
    emailDraft =
      `Subject: Update on Tech Consulting Services and Digital Transformation\n\nDear ${lead.name},\n\nI hope this email finds you well. It's been a while since we last spoke, and I wanted to follow up on our previous conversation regarding technology consulting services. At BitWin Init, our team specializes in helping businesses leverage technology for growth and innovation.\n\nAs a reminder, we provide expert tech consulting services tailored to your business needs. We've been working diligently on various projects, exploring the latest technologies and their applications.\n\nIn recent weeks, we've:\n\n- Successfully implemented digital transformation solutions for several clients\n- Developed comprehensive tech strategies for growing businesses\n- Partnered with industry leaders to deliver cutting-edge consulting services\n\nWe believe that our expertise in tech consulting can help ${lead.company || 'your company'} achieve its digital goals and stay ahead in today's competitive landscape. If you're interested in learning more about our services, we'd be happy to schedule a consultation call to discuss your specific needs.\n\nWould you like to schedule a call or meeting to explore how BitWin Init can support your technology initiatives?\n\nBest regards,\n\nAryan\nCEO\nBitWin Init\n+91 9839391871`;
  }

  const now = new Date();
  const day2 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const day5 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  updateLead(leadId, {
    status: 'approved',
    outreach_email: emailDraft,
    outreach_message: outreachMessage,
    follow_up_day2_at: day2.toISOString(),
    follow_up_day5_at: day5.toISOString(),
    follow_ups_sent: 0  // Changed from 1 since we're not sending yet
  });

  // Show email draft with send button
  await bot.telegram.sendMessage(
    CHAT_ID,
    `📧 <b>Email Draft for ${esc(lead.name)}</b>\n\n` +
    `<b>To:</b> ${esc(lead.email)}\n\n` +
    `<b>Subject:</b> ${esc(emailDraft.split('\n')[0].replace('Subject: ', ''))}\n\n` +
    `<b>Body:</b>\n${esc(emailDraft.split('\n').slice(1).join('\n'))}`,
    {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback('📤 Send Email', `send_email_${lead.lead_id}`),
          Markup.button.callback('❌ Cancel', `cancel_email_${lead.lead_id}`)
        ]
      ]).reply_markup
    }
  );
}

export async function handleReject(leadId: string): Promise<void> {
  if (!bot || !CHAT_ID) return;

  const lead = getLead(leadId);
  if (!lead) {
    await bot.telegram.sendMessage(CHAT_ID, `⚠️ Lead <code>${leadId}</code> not found.`, { parse_mode: 'HTML' });
    return;
  }
  if (lead.status !== 'pending') {
    await bot.telegram.sendMessage(CHAT_ID, `ℹ️ Lead <b>${esc(lead.name)}</b> was already <b>${lead.status}</b>.`, { parse_mode: 'HTML' });
    return;
  }

  updateLead(leadId, { status: 'rejected' });

  await bot.telegram.sendMessage(
    CHAT_ID,
    `❌ <b>Lead Rejected</b>\n\n👤 <b>${esc(lead.name)}</b> from <b>${esc(lead.company || 'N/A')}</b> has been marked as rejected.\n\nUse /pipeline to see full pipeline status.`,
    { parse_mode: 'HTML' }
  );
}

export async function handleSendEmail(leadId: string): Promise<void> {
  if (!bot || !CHAT_ID) return;

  const lead = getLead(leadId);
  if (!lead) {
    await bot.telegram.sendMessage(CHAT_ID, `⚠️ Lead <code>${leadId}</code> not found.`, { parse_mode: 'HTML' });
    return;
  }

  if (!lead.outreach_email) {
    await bot.telegram.sendMessage(CHAT_ID, `⚠️ No email draft found for lead <code>${leadId}</code>.`, { parse_mode: 'HTML' });
    return;
  }

  try {
    // Parse the email draft - assuming format "Subject: ...\n\nBody..."
    const lines = lead.outreach_email.split('\n');
    const subject = lines[0].replace('Subject: ', '');
    const body = lines.slice(2).join('\n');

    // Convert plain text to HTML
    const htmlBody = body.replace(/\n/g, '<br>');

    const { sendEmail } = await import('./services');
    await sendEmail(lead.email, subject, htmlBody);

    // Update lead status
    const now = new Date();
    const day2 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const day5 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    updateLead(leadId, {
      status: 'contacted',
      follow_up_day2_at: day2.toISOString(),
      follow_up_day5_at: day5.toISOString(),
      follow_ups_sent: 1
    });

    await bot.telegram.sendMessage(
      CHAT_ID,
      `✅ <b>Email Sent Successfully!</b>\n\n` +
      `👤 <b>To:</b> ${esc(lead.name)} (${esc(lead.email)})\n` +
      `📧 <b>Subject:</b> ${esc(subject)}\n\n` +
      `📅 <b>Follow-up Schedule Set:</b>\n` +
      `• Day 0: Initial outreach ✅\n` +
      `• Day 2: Follow-up → ${day2.toLocaleDateString()}\n` +
      `• Day 5: Final attempt → ${day5.toLocaleDateString()}`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error('Email send error:', error);
    await bot.telegram.sendMessage(
      CHAT_ID,
      `❌ <b>Email Send Failed</b>\n\n` +
      `Could not send email to ${esc(lead.email)}. Please check your Resend configuration.\n\n` +
      `Error: ${error instanceof Error ? esc(error.message) : 'Unknown error'}`,
      { parse_mode: 'HTML' }
    );
  }
}

export async function handleCancelEmail(leadId: string): Promise<void> {
  if (!bot || !CHAT_ID) return;

  const lead = getLead(leadId);
  if (!lead) {
    await bot.telegram.sendMessage(CHAT_ID, `⚠️ Lead <code>${leadId}</code> not found.`, { parse_mode: 'HTML' });
    return;
  }

  updateLead(leadId, { status: 'pending' }); // Reset to pending

  await bot.telegram.sendMessage(
    CHAT_ID,
    `❌ <b>Email Cancelled</b>\n\n` +
    `Email to ${esc(lead.name)} was not sent. Lead status reset to pending.`,
    { parse_mode: 'HTML' }
  );
}

/* ───────────────────────── Pipeline Summary ───────────────────────────── */

/**
 * Agent 6 – Pipeline Monitoring Agent
 * Returns a summary of the full pipeline to the rep's Telegram chat.
 */
export async function sendPipelineSummary(
  chatId: string | number
): Promise<void> {
  if (!bot) return;

  const s = getPipelineSummary();

  await bot.telegram.sendMessage(
    chatId,
    `📊 <b>Pipeline Summary</b>\n\n` +
      `📅 <b>Leads Today:</b> ${s.today}\n` +
      `📦 <b>Total Leads:</b> ${s.total}\n\n` +
      `✅ <b>Approved:</b> ${s.approved}\n` +
      `❌ <b>Rejected:</b> ${s.rejected}\n` +
      `⏳ <b>Pending:</b> ${s.pending}\n` +
      `📞 <b>Contacted:</b> ${s.contacted}\n\n` +
      `💰 <b>Est. Revenue:</b> $${s.estimatedRevenue.toLocaleString()}`,
    { parse_mode: 'HTML' }
  );
}

/* ──────────────────────── Bot Command Registration ────────────────────── */

if (bot) {
  /** /pipeline – full pipeline summary */
  bot.command('pipeline', async ctx => {
    await sendPipelineSummary(ctx.chat.id);
  });

  /** /leads – list 10 most recent leads */
  bot.command('leads', async ctx => {
    const leads = getAllLeads().slice(-10).reverse();
    if (leads.length === 0) {
      await ctx.reply('No leads in the pipeline yet.');
      return;
    }
    const lines = leads.map(
      l =>
        `• <b>${esc(l.name)}</b> (${esc(l.company || 'N/A')}) — Score: ${l.score}/10 — <i>${l.status}</i>\n  ID: <code>${l.lead_id}</code>`
    );
    await ctx.reply(`📋 <b>Recent Leads:</b>\n\n${lines.join('\n\n')}`, {
      parse_mode: 'HTML'
    });
  });

  /** /approve <lead_id> */
  bot.command('approve', async ctx => {
    const parts = ctx.message.text.split(' ');
    if (parts.length < 2) {
      await ctx.reply('Usage: /approve <lead_id>');
      return;
    }
    await handleApprove(parts[1].trim());
  });

  /** /reject <lead_id> */
  bot.command('reject', async ctx => {
    const parts = ctx.message.text.split(' ');
    if (parts.length < 2) {
      await ctx.reply('Usage: /reject <lead_id>');
      return;
    }
    await handleReject(parts[1].trim());
  });

  /** Inline keyboard — Approve button */
  bot.action(/^approve_(.+)$/, async ctx => {
    const leadId = ctx.match[1];
    try { await ctx.answerCbQuery('✅ Processing approval...'); } catch {}
    try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch {}
    await handleApprove(leadId);
  });

  /** Inline keyboard — Reject button */
  bot.action(/^reject_(.+)$/, async ctx => {
    const leadId = ctx.match[1];
    try { await ctx.answerCbQuery('❌ Rejecting lead...'); } catch {}
    try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch {}
    await handleReject(leadId);
  });

  /** Inline keyboard — Send Email button */
  bot.action(/^send_email_(.+)$/, async ctx => {
    const leadId = ctx.match[1];
    try { await ctx.answerCbQuery('📤 Sending email...'); } catch {}
    try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch {}
    await handleSendEmail(leadId);
  });

  /** Inline keyboard — Cancel Email button */
  bot.action(/^cancel_email_(.+)$/, async ctx => {
    const leadId = ctx.match[1];
    try { await ctx.answerCbQuery('❌ Cancelled'); } catch {}
    try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch {}
    await handleCancelEmail(leadId);
  });
}
