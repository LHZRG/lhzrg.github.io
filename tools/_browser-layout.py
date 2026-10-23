import subprocess,tempfile
from pathlib import Path
node='C:/Users/LHZRG/AppData/Local/Temp/ylj-node-test/node-v22.16.0-win-x64/node.exe'
subprocess.run([node,'tools/_browser-layout.js'],check=True)
with tempfile.TemporaryDirectory(prefix='mj-browser-') as profile:
 r=subprocess.run(['C:/Program Files/Google/Chrome/Application/chrome.exe','--headless','--disable-gpu','--no-first-run','--user-data-dir='+profile,'--allow-file-access-from-files','--dump-dom',Path('tools/_layout-fixture.html').resolve().as_uri()],capture_output=True,text=True,encoding='utf-8',timeout=60)
 import re
 result=re.search(r'<pre id="result">(.*?)</pre>',r.stdout)
 print(result.group(1) if result else r.stderr[-2000:])
 if not result or not result.group(1).startswith('PASS'): raise SystemExit(1)
