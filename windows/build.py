from pathlib import Path
import os, shutil, subprocess
root=Path(__file__).resolve().parents[1]
web=root/'windows/web';web.mkdir(exist_ok=True)
for p in (root/'dist').iterdir():
 if p.is_file():shutil.copy2(p,web/p.name)
go=os.environ.get('GO','go')
subprocess.run([go,'run','github.com/akavel/rsrc@v0.10.2','-manifest','app.manifest','-ico','icon.ico','-o','resource_windows_amd64.syso'],cwd=root/'windows',check=True)
out=root/'downloads/pear-atelier-3.9.1.exe';out.parent.mkdir(exist_ok=True)
env={**os.environ,'GOOS':'windows','GOARCH':'amd64','CGO_ENABLED':'0'}
subprocess.run([go,'build','-buildvcs=false','-trimpath','-ldflags=-s -w -H windowsgui','-o',str(out),'.'],cwd=root/'windows',env=env,check=True)
print(out)
