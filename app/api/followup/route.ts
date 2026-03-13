import { type NextRequest } from 'next/server';
import { getDueFollowUps, updateLead } from '@/lib/pipeline';
import { generateOutreachMessage } from '@/lib/services';
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
 * follow-up window and sends the rep a suggested follow-up message via
 * Telegram. Trigger this endpoint from a cron job or manually.
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

    if (bot && CHAT_ID) {
      await bot.telegram.sendMessage(
        CHAT_ID,
        `🔔 <b>${label}</b>\n\n` +
          `Lead: <b>${esc(lead.name)}</b> (${esc(lead.company || 'N/A')})\n` +
          `Email: ${esc(lead.email)}\n\n` +
          `📱 <b>Suggested Message:</b>\n${esc(message)}`,
        { parse_mode: 'HTML' }
      );
    }

    updateLead(lead.lead_id, { follow_ups_sent: followUpNumber });
    sent++;
  }

  return Response.json({
    message: `Sent ${sent} follow-up(s).`,
    count: sent
  });
}
