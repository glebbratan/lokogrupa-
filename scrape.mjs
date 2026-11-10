// Обходит публичное превью t.me/s/<канал> и собирает docs/posts.json: [[id, unix_ts, url_картинки], ...]
import { writeFileSync, mkdirSync } from 'node:fs';
const CH = process.env.CHANNEL || 'localgrup';
const out = [];
let before = '';
for (let page = 0; page < 2000; page++) {
  const res = await fetch(`https://t.me/s/${CH}${before ? '?before=' + before : ''}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) { console.error('HTTP', res.status); break; }
  const html = await res.text();
  const blocks = html.split('tgme_widget_message_wrap').slice(1);
  if (!blocks.length) break;
  let minId = Infinity;
  for (const b of blocks) {
    const id = +(b.match(/data-post="[^"/]+\/(\d+)"/) || [])[1];
    if (!id) continue;
    minId = Math.min(minId, id);
    const img = (b.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/) || [])[1];
    const dt = (b.match(/<time[^>]*datetime="([^"]+)"/) || [])[1];
    if (img && dt && !/forwarded_from/.test(b)) out.push([id, Math.floor(Date.parse(dt) / 1000), img]);
  }
  if (!isFinite(minId) || String(minId) === before) break;
  before = minId;
  console.log('page', page, 'до id', minId, 'собрано', out.length);
  await new Promise(r => setTimeout(r, 300));
}
if (out.length) {
  out.sort((a, b) => a[0] - b[0]);
  mkdirSync('docs', { recursive: true });
  writeFileSync('docs/posts.json', JSON.stringify(out));
  console.log('Готово:', out.length, 'постов');
} else { console.error('Ничего не собрано, posts.json не тронут'); process.exit(1); }
