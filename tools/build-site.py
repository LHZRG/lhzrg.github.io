"""GitHub Pages 发布打包：保留源文件，给输出的 JS/CSS 引用添加发布版本。"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil

ROOT = Path(__file__).resolve().parent.parent


def build(output, version=None):
    output = Path(output).resolve()
    # 只允许约定的输出目录，防止误删源文件。
    if output != ROOT / '_site':
        raise ValueError('输出目录必须是仓库根目录下的 _site')
    sources = list(ROOT.glob('*.html')) + [ROOT / 'rss.xml', ROOT / '.nojekyll']
    sources += [p for folder in ['assets', 'content'] for p in (ROOT / folder).rglob('*') if p.is_file()]
    digest = hashlib.sha256()
    for path in sorted(sources):
        digest.update(path.relative_to(ROOT).as_posix().encode())
        digest.update(path.read_bytes())
    version = version or digest.hexdigest()[:20]
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,80}', version):
        raise ValueError('版本号只能包含英文、数字、下划线与连字符，最长 80 字符')
    if output.exists():
        shutil.rmtree(output)
    output.mkdir()
    for path in sources:
        target = output / path.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
    for target in output.glob('*.html'):
        text = target.read_text(encoding='utf-8')
        # 为本地 JS/CSS 换一个缓存键；保留经典脚本顺序，不更改站内导航网址。
        text = re.sub(
            r'((?:src|href)=[\"\'])(\./(?:assets|content)/[^\"\'?#]+\.(?:js|css))([\"\'])',
            lambda m: m[1] + m[2] + '?v=' + version + m[3], text)
        marker = (f'    <meta name="site-version" content="{version}" />\n'
                  f'    <script defer src="./assets/js/update-check.js?v={version}"></script>\n')
        text = text.replace('</head>', marker + '  </head>', 1)
        target.write_text(text, encoding='utf-8')
    (output / 'version.json').write_text(json.dumps({'version': version}) + '\n', encoding='utf-8')
    print(f'Built {len(sources)} files in _site, version={version}')
    return version


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', help='发布版本（Actions 使用 Git 提交 SHA；本地默认内容摘要）')
    args = parser.parse_args()
    build(ROOT / '_site', args.version)
