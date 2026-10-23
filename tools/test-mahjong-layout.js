/* node tools/test-mahjong-layout.js：无需第三方依赖的牌展示回归测试。 */
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { Markdown, POSTS } = require('./load-content').load(fs.readFileSync(path.join(__dirname, '../assets/js/markdown.js'), 'utf8'));
const render = Markdown.render;
const multi = render('[mj 123456m]<br>[mj 789p h6m] ←');
assert.match(multi, /class="mj-stack"/);
assert.equal((multi.match(/class="mj-line"/g) || []).length, 2);
assert.doesNotMatch(multi, /<br>|&lt;br/);
assert.match(multi, /class="mj-mark">←<\/span>/);
assert.match(render('→ [mj k55m 55m]'), /mj-mark">→<\/span><span class="mj-row"/);
assert.match(render('[mj h5m 55m] → [mj k55m 55m]'), /mj-kan/);
assert.doesNotMatch(render('`[mj 123m]`'), /<img/);
assert.match(render('`[mj 123m]`'), /<code>\[mj 123m\]<\/code>/);
assert.doesNotMatch(render('[mj INVALID]'), /<img/);
assert.match(render('普通[链接](post.html?id=example)'), /href="post.html\?id=example"/);
assert.match(render('| 说明 | 牌 |\n| --- | --- |\n| 两行 | [mj 123m]<br>[mj h4m 56m] ← |'), /mj-stack/);
for (const post of POSTS.filter(p => /richimaj-start|riichimaj-yaku-list/.test(p.id))) {
  const html = render(post.body);
  assert.match(html, /mj-stack/);
  assert.match(html, /mj-kan/);
  assert.doesNotMatch(html, /\[mj\s/);
  for (const [, filename] of html.matchAll(/src="(assets\/img\/tiles\/[^"]+)"/g)) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', filename)), filename);
  }
}
console.log('PASS: multiline diagrams, attached arrows, kan images, code escaping, both article diagrams and image paths');
