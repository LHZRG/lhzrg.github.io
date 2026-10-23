from pathlib import Path
import subprocess, threading, http.server, os
for root in [Path('C:/Program Files'),Path('C:/Program Files (x86)'),Path(os.environ['LOCALAPPDATA'])]:
 for rel in ['Google/Chrome/Application/chrome.exe','Microsoft/Edge/Application/msedge.exe']:
  p=root/rel
  if p.exists(): print('BROWSER',p,flush=True)
class Server(http.server.ThreadingHTTPServer): request_queue_size=128
s=Server(('127.0.0.1',8123),http.server.SimpleHTTPRequestHandler)
threading.Thread(target=s.serve_forever,daemon=True).start()
env=os.environ.copy(); env['NODE_PATH']='C:/Users/LHZRG/AppData/Local/Temp/ylj-node-test/node-v22.16.0-win-x64/node_modules'
r=subprocess.run(['C:/Users/LHZRG/AppData/Local/Temp/ylj-node-test/node-v22.16.0-win-x64/node.exe','tools/smoke.js'],env=env)
s.shutdown()
raise SystemExit(r.returncode)
