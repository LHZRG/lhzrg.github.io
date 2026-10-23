/* node tools/test-update-check.js：无需第三方依赖。 */
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const source = fs.readFileSync(require('path').join(__dirname, '../assets/js/update-check.js'), 'utf8');

async function scenario({ remote = 'new', saved = null, query = '?id=example', fail = false, status = true } = {}) {
  const navigations = [];
  const storage = new Map(saved ? [['ylj-update:/demo/', saved]] : []);
  let request;
  const context = {
    URL, AbortController, Date, setTimeout, clearTimeout,
    setInterval() {},
    document: {
      currentScript: { src: 'https://example.com/demo/assets/js/update-check.js?v=old' },
      querySelector: () => ({ content: 'old' }), visibilityState: 'visible', addEventListener() {},
    },
    window: { addEventListener() {} },
    location: { protocol: 'https:', href: 'https://example.com/demo/post.html' + query + '#heading', replace: u => navigations.push(u) },
    sessionStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) },
    history: { state: null, replaceState() {} },
    fetch: async (url, options) => {
      request = [url, options];
      if (fail) throw new Error('offline');
      return { ok: status, json: async () => ({ version: remote }) };
    },
  };
  vm.runInNewContext(source, context);
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(request[0].pathname, '/demo/version.json');
  assert.equal(request[1].cache, 'no-store');
  return navigations;
}
(async () => {
  assert.equal((await scenario({ remote: 'old' })).length, 0);
  const next = new URL((await scenario())[0]);
  assert.equal(next.searchParams.get('id'), 'example');
  assert.equal(next.searchParams.get('_sitev'), 'new');
  assert.equal(next.hash, '#heading');
  for (const options of [{ saved: 'new' }, { query: '?_sitev=new' }, { fail: true }, { status: false }, { remote: 'invalid/version' }]) {
    assert.equal((await scenario(options)).length, 0);
  }
  console.log('PASS: same/new versions, URL preservation, loop protection, offline and invalid responses');
})().catch(e => { console.error(e); process.exitCode = 1; });
