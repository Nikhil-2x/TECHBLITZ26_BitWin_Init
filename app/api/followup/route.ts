import { type NextRequest } from 'next/server';
import { getDueFollowUps, updateLead } from '@/lib/pipeline';
import { generateOutreachMessage, sendEmail } from '@/lib/services';
import { bot, CHAT_ID } from '@/lib/telegram';

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * POST /api/followup
 *
 * Checks the pipeline for leads that have passed their Day 2 or Day 5
 * follow-up window and sends follow-up emails to leads. Also notifies
 * the admin via Telegram with confirmation.
 * Trigger this endpoint from a cron job or manually.
 */
export async function POST(_request: NextRequest) {
  const dueLeads = getDueFollowUps();

  if (dueLeads.length === 0) {
    return Response.json({ message: 'No follow-ups due.', count: 0 });
  }

  let sent = 0;

  for (const lead of dueLeads) {
    const followUpNumber = lead.follow_ups_sent + 1;
    const label =
      followUpNumber === 2 ? 'Day 2 Follow-up' : 'Day 5 Final Attempt';

    const message = await generateOutreachMessage(
      lead.research,
      lead.qualification,
      lead,
      followUpNumber
    );

    try {
      // Send email to the lead
      const subject = followUpNumber === 2
        ? `Following up on Tech Consulting Services - ${lead.company || 'your inquiry'}`
        : `Final follow-up on Digital Transformation Solutions - ${lead.company || 'your inquiry'}`;

      const htmlMessage = message.replace(/\n/g, '<br>');

      await sendEmail(lead.email, subject, htmlMessage);

      updateLead(lead.lead_id, { follow_ups_sent: followUpNumber });
      sent++;

      // Notify admin via Telegram
      if (bot && CHAT_ID) {
        await bot.telegram.sendMessage(
          CHAT_ID,
          `📧 <b>${label} Email Sent</b>\n\n` +
            `👤 <b>${esc(lead.name)}</b> (${esc(lead.company || 'N/A')})\n` +
            `📧 <b>Email:</b> ${esc(lead.email)}\n` +
            `📝 <b>Subject:</b> ${esc(subject)}\n\n` +
            `✅ <b>Email sent successfully</b>`,
          { parse_mode: 'HTML' }
        );
      }
    } catch (error) {
      console.error(`Failed to send follow-up email to ${lead.email}:`, error);

      // Notify admin of failure
      if (bot && CHAT_ID) {
        await bot.telegram.sendMessage(
          CHAT_ID,
          `❌ <b>${label} Email Failed</b>\n\n` +
            `👤 <b>${esc(lead.name)}</b> (${esc(lead.email)})\n` +
            `❌ <b>Error:</b> ${error instanceof Error ? esc(error.message) : 'Unknown error'}\n\n` +
            `Please check your email configuration.`,
          { parse_mode: 'HTML' }
        );
      }
    }
  }

  return Response.json({
    message: `Sent ${sent} follow-up email(s).`,
    count: sent
  });
}
