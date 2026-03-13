import { type NextRequest } from 'next/server';
import { bot } from '@/lib/telegram';

// Bot commands and action handlers are registered at module level in
// lib/telegram.ts when the module is first imported.

export async function POST(request: NextRequest) {
  if (!bot) {
    return Response.json(
      { error: 'Telegram bot not configured. Set TELEGRAM_BOT_TOKEN.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    await bot.handleUpdate(body);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    return Response.json({ ok: false }, { status: 500 });
  }
}

// GET /api/telegram/start-polling — starts long-polling locally (dev only)
export async function GET(_request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return Response.json({ error: 'Only available in development' }, { status: 403 });
  }
  if (!bot) {
    return Response.json({ error: 'Telegram bot not configured' }, { status: 503 });
  }
  // Remove any existing webhook so polling can work
  await bot.telegram.deleteWebhook({ drop_pending_updates: false });
  // Launch polling (non-blocking)
  bot.launch({ dropPendingUpdates: false }).catch((err: unknown) =>
    console.error('Polling error:', err)
  );
  return Response.json({ ok: true, message: 'Bot polling started' });
}
