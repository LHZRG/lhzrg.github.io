"""python tools/test-build-site.py：验证发布产物完整性和缓存参数。"""
import importlib.util
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('build_site', root / 'tools/build-site.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
version = builder.build(root / '_site')
assert json.loads((root / '_site/version.json').read_text())['version'] == version
for page in root.glob('*.html'):
    output = (root / '_site' / page.name).read_text(encoding='utf-8')
    assert f'name="site-version" content="{version}"' in output
    assert output.count('assets/js/update-check.js?') == 1
    for url in re.findall(r'(?:src|href)=[\"\'](\./(?:content|assets)/[^\"\']+)[\"\']', output):
        path = url.split('?')[0][2:]
        assert (root / '_site' / path).is_file(), (page, path)
        if path.endswith(('.js', '.css')):
            assert url.endswith('?v=' + version), url
assert (root / '_site/tools.html').is_file()
assert not (root / '_site/.webui_secret_key').exists()
print('PASS: all pages, content paths, JS/CSS versions, update checker, private-file exclusion')
