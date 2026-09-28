"""Package the prebuilt app for Cloudflare Pages dashboard direct upload."""
import json
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text())['version']
output = root / 'downloads' / f'li-paint-pages-{version}.zip'
output.parent.mkdir(exist_ok=True)
assets = ['index.html', 'app.js', 'native-bridge.js', 'themes.js',
          'settings-backup.js', 'manifest.webmanifest']
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in assets:
        archive.write(root / 'dist' / name, name)
    # This Worker already serves the embedded assets and the fixed NovelAI relay.
    archive.write(root / 'dist/server/index.js', '_worker.js')
print(output)
