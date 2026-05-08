const meta = $input.first().json;
const rawText = String(meta.data ?? '').trim();
if (!rawText) {
  throw new Error('Extractor returned empty content');
}

let title = String(meta.titleOverride || '').trim();
if (!title) {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const cleaned = line.replace(/^#+\s*/, '').trim();
    if (cleaned && !/^untitled$/i.test(cleaned) && cleaned.length > 5) {
      title = cleaned.slice(0, 120);
      break;
    }
  }
}
if (!title) title = 'Untitled';

const articleText = rawText.slice(0, 15000);
const prompt = [
  '你是知识整理助手。请只输出严格 JSON，不要 Markdown，不要额外解释。',
  'JSON 必须包含 summary, tags, category 三个字段。',
  'summary: 一句话中文摘要。',
  'tags: 5-10 个标签，数组格式，兼顾主题/技术/领域。',
  'category: 只能是以下之一：AI技术、AI商业、运营方法、产品思维、技术实操、职业发展、生活洞察。',
  '',
  `source=${meta.source}`,
  `url=${meta.url}`,
  `title=${title}`,
  `note=${meta.note || ''}`,
  'text=',
  articleText,
].join('\n');

return [{
  json: {
    ...meta,
    title,
    articleText,
    prompt,
  }
}];