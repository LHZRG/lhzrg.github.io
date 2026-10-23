const fs=require('fs'); const path=require('path'); const {pathToFileURL}=require('url');
const {Markdown}=require('./load-content').load(fs.readFileSync('assets/js/markdown.js','utf8'));
const html=`<!doctype html><meta charset="utf-8"><base href="${pathToFileURL(path.resolve('.')+path.sep)}"><style>${fs.readFileSync('assets/css/main.css','utf8')}</style><div class="prose" style="padding:20px"><div id="mixed">${Markdown.render('[mj 1m h2m k55m 55m]')}</div><div id="river">${Markdown.render('[mj 123456m]<br>[mj 789p h6m] ←')}</div><table><tr><td id="arrow">${Markdown.render('→ [mj k55m 55m]').replace(/<\/?p>/g,'')}</td></tr></table></div><pre id="result"></pre><script>
const results=[]; const rect=e=>e.getBoundingClientRect();
function check(ok,msg){if(!ok)throw Error(msg);results.push(msg)}
try {for(const h of [36,28]){
 document.querySelector('.prose').style.setProperty('--mj-h',h+'px');
 const imgs=[...document.querySelectorAll('#mixed img')].map(rect);
 check(imgs.every(r=>Math.abs(r.bottom-imgs[0].bottom)<0.1),'bottom alignment '+h);
 const rows=[...document.querySelectorAll('#river .mj-line')].map(rect);
 check(rows.every(r=>Math.abs(r.height-h)<0.1),'row heights '+h);
 check(Math.abs(rows[1].top-rows[0].bottom)<0.1,'zero vertical gap '+h);
 check(Math.abs(rows[1].left-rows[0].left)<0.1,'left alignment '+h);
 const mark=rect(document.querySelector('#arrow .mj-mark')); const tile=rect(document.querySelector('#arrow .mj-row'));
 check(Math.abs(tile.left-mark.right)<0.1,'compact arrow '+h);
}document.querySelector('#result').textContent='PASS '+JSON.stringify(results)}catch(e){document.querySelector('#result').textContent='FAIL '+e.message}
</script>`;
fs.writeFileSync('tools/_layout-fixture.html',html);
