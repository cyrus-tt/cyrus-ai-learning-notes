const meta = $('Prepare Prompt').first().json;
const llm = $input.first().json;
const rawOutput = String(llm.message?.content ?? llm.choices?.[0]?.message?.content ?? '').trim();

let parsed;
try {
  let candidate = rawOutput;
  if (candidate.startsWith('```')) {
    candidate = candidate.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  }
  if (!candidate.startsWith('{')) {
    const match = candidate.match(/\{[\s\S]*\}/);
    if (match) candidate = match[0];
  }
  parsed = JSON.parse(candidate);
} catch {
  parsed = {
    summary: meta.articleText.slice(0, 100),
    tags: ['知识管理', '内容沉淀', '自动化工作流'],
    category: '未分类',
  };
}

const summary = String(parsed.summary || meta.articleText.slice(0, 100)).trim();
const categoryOptions = new Set(['AI技术', 'AI商业', '运营方法', '产品思维', '技术实操', '职业发展', '生活洞察']);
const category = categoryOptions.has(parsed.category) ? parsed.category : '未分类';
const rawTags = Array.isArray(parsed.tags) ? parsed.tags : [parsed.tags].filter(Boolean);
const tags = [];
for (const tag of rawTags.map((value) => String(value).trim()).filter(Boolean)) {
  if (!tags.includes(tag)) tags.push(tag);
}
for (const fallback of [category, '知识管理', '内容沉淀', '自动化工作流']) {
  if (fallback && !tags.includes(fallback)) tags.push(fallback);
}
const finalTags = tags.slice(0, 10);

const safeTitle = String(meta.title || 'note')
  .replace(/[<>:"/\\|?*\n\r\t]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 160) || 'note';
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
const noteFileName = `${safeTitle}-${timestamp}.md`;

const images = Array.isArray(meta.images) ? meta.images : [];

const frontmatter = [
  '---',
  `title: "${String(meta.title || '').replace(/"/g, '\\"')}"`,
  `date: ${new Date().toISOString()}`,
  'type: article',
  `category: ${category}`,
  'tags:',
  ...finalTags.map((tag) => `  - ${tag}`),
  `source: "${String(meta.url).replace(/"/g, '\\"')}"`,
  `author: "${String(meta.author || '').replace(/"/g, '\\"')}"`,
  'status: inbox',
  '---',
].join('\n');

const noteSection = meta.note ? `\n## 我的备注\n\n${meta.note}\n` : '';

let imageSection = '';
if (images.length > 0) {
  const lines = images.map((img) => `![${(img.alt || '').slice(0, 80)}](${img.url})`);
  imageSection = `\n## 图片\n\n${lines.join('\n\n')}\n`;
}

const markdown = `${frontmatter}\n\n> **摘要**: ${summary}\n${noteSection}${imageSection}\n## 原文内容\n\n${meta.articleText}\n\n---\n\n🔗 [原文链接](${meta.url})\n`;

return [{
  json: {
    title: meta.title,
    category,
    tags: finalTags,
    summary,
    sourceUrl: meta.url,
    noteFileName,
    author: meta.author || '',
    source: meta.source || 'telegram',
    chatId: meta.chatId ?? null,
    replyToMessageId: meta.replyToMessageId ?? null,
  },
  binary: {
    data: {
      data: Buffer.from(markdown, 'utf8').toString('base64'),
      mimeType: 'text/markdown',
      fileName: noteFileName,
    },
  },
}];
