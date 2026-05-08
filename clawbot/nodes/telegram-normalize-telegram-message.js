const raw = $input.first().json;
const update = raw.body && typeof raw.body === 'object' ? raw.body : raw;
const message = update.message ?? update.edited_message ?? update.channel_post;
if (!message) {
  throw new Error('Telegram payload does not contain a message');
}

const incomingText = String(message.text ?? message.caption ?? '').trim();
const urlMatch = incomingText.match(/https?:\/\/\S+/i);
const url = urlMatch ? urlMatch[0] : '';
const note = url ? incomingText.replace(url, '').trim() : '';
const from = message.from ?? {};
const author = from.username
  ? `@${from.username}`
  : [from.first_name, from.last_name].filter(Boolean).join(' ').trim();

return [{
  json: {
    chatId: message.chat?.id ?? null,
    replyToMessageId: message.message_id ?? null,
    incomingText,
    url,
    note,
    author,
    source: 'telegram',
    hasUrl: Boolean(url),
  },
}];