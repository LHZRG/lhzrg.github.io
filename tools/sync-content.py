"""新增/删除文章后运行：python tools/sync-content.py（不需要 Node 或构建）。"""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parent.parent
manifest=root/'content/files.json'
files=json.loads(manifest.read_text(encoding='utf-8'))
files=[f for f in files if (root/'content'/f).is_file()]
known=set(files)
files += ['posts/'+p.name for p in sorted((root/'content/posts').glob('*.js')) if 'posts/'+p.name not in known]
manifest.write_text(json.dumps(files,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for p in root.glob('*.html'):
 text=p.read_text(encoding='utf-8')
 # Remove only registered base-data tags; page-only copy files stay in place.
 text=re.sub(r'    <script src="\./content/([^\"]+)"></script>\n',lambda m:'' if m.group(1) in files or (m.group(1).startswith('posts/') and not m.group(1).endswith('-copy.js')) else m.group(),text)
 marker='<!-- 内容文件：修改指南见 content/README.md；顺序与 content/files.json 保持一致。 -->'
 assert marker in text,p
 text=text.replace(marker,marker+'\n'+ '\n'.join('    <script src="./content/'+f+'"></script>' for f in files))
 # Keep script ordering deterministic and avoid accumulating whitespace.
 text=re.sub(r'(</script>)\n\n+(    <script)',r'\1\n\2',text)
 p.write_text(text,encoding='utf-8')
print('已同步',len(files),'个内容文件到全部 HTML 页面。')
