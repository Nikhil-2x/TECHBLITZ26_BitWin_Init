export async function register() {
  // Only run on the Node.js server runtime, not in the browser or edge
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      console.warn('⚠️  Telegram env vars not set — bot polling skipped.');
      return;
    }

    const { bot } = await import('./lib/telegram');
    if (!bot) return;

    // Remove any existing webhook so long-polling can take over
    await bot.telegram.deleteWebhook({ drop_pending_updates: false });

    // Start long-polling — allows approve/reject inline buttons to work
    // without needing ngrok or any public URL in local dev
    bot
      .launch({ dropPendingUpdates: false })
      .catch((err: unknown) => console.error('[Telegram] Polling error:', err));

    console.log('✅ Telegram bot polling started (approve/reject buttons active)');
  }
}
