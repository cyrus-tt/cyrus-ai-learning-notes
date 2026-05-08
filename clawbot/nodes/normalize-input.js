const raw = $input.first().json;
const payload = raw.body && typeof raw.body === 'object' ? raw.body : raw;
const query = raw.query && typeof raw.query === 'object' ? raw.query : {};

const rawUrlInput = String(payload.url ?? query.url ?? '').trim();
const urlMatch = rawUrlInput.match(/https?:\/\/[^\s"'<>]+/i);
const rawUrl = (urlMatch ? urlMatch[0] : rawUrlInput)
  .replace(/[)\],，。！？；]+$/u, '')
  .trim();

const note = String(payload.note ?? query.note ?? '').trim();
const author = String(payload.author ?? payload.username ?? '').trim();
const source = String(payload.source ?? 'wechat').trim();
const chatId = payload.chatId ?? null;
const replyToMessageId = payload.replyToMessageId ?? null;

if (!rawUrl) {
  throw new Error('Missing url in webhook body or query string');
}

async function resolveShareUrl(inputUrl) {
  return {
    resolvedUrl: inputUrl,
    resolveError: null,
  };
}

async function main() {
  const { resolvedUrl, resolveError } = await resolveShareUrl(rawUrl);

  return [
    {
      json: {
        url: resolvedUrl,
        originalUrl: rawUrl,
        resolvedUrl,
        resolveError,
        note,
        author,
        source,
        chatId,
        replyToMessageId,
        receivedAt: new Date().toISOString(),
      },
    },
  ];
}

return main();
