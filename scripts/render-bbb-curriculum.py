# -*- coding: utf-8 -*-
import base64
import hashlib
import importlib.util
import json
import os
import pathlib
import sys
import tempfile
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'sources' / 'curriculum' / 'bbb-parallel-lines.manifest.json'
OUTPUT = ROOT / 'public' / 'generated' / 'curriculum-rendered.json'

manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
owner, repo = manifest['sourceRepository'].split('/')
commit = manifest['sourceCommit']


def raw_url(file_path: str) -> str:
    encoded = '/'.join(urllib.parse.quote(part) for part in file_path.split('/'))
    return f'https://raw.githubusercontent.com/{owner}/{repo}/{commit}/{encoded}'


def git_blob_sha(data: bytes) -> str:
    header = f'blob {len(data)}\0'.encode('utf-8')
    return hashlib.sha1(header + data).hexdigest()


def fetch_pinned(file_path: str, expected_sha: str) -> bytes:
    with urllib.request.urlopen(raw_url(file_path), timeout=30) as response:
        data = response.read()
    actual = git_blob_sha(data)
    if actual != expected_sha:
        raise RuntimeError(f'Source drift for {file_path}: expected {expected_sha}, got {actual}')
    return data


def import_from_path(name: str, file_path: pathlib.Path):
    spec = importlib.util.spec_from_file_location(name, file_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f'Cannot import {file_path}')
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


source_records = {item['path']: item['blobSha'] for item in manifest['sourceFiles']}
asset_records = {item['path']: item['blobSha'] for item in manifest.get('visualAssets', [])}
selected = {(b['file'], b['section'], int(b['question'])): b for b in manifest['blocks']}

with tempfile.TemporaryDirectory(prefix='makbilim-bbb-') as tmp:
    tmp_dir = pathlib.Path(tmp)

    # Mirror only the pinned files required by the original geometry engine.
    for source_path, sha in source_records.items():
        data = fetch_pinned(source_path, sha)
        target_name = pathlib.Path(source_path).name
        (tmp_dir / target_name).write_bytes(data)

    # Load the exact original engine and geometry helpers first, under their original import names.
    sys.path.insert(0, str(tmp_dir))
    wsengine = import_from_path('wsengine', tmp_dir / 'wsengine.py')
    import_from_path('geo', tmp_dir / 'geo.py')

    current_section = {'title': None}
    captured = {}

    def capture_section(title, subtitle, color):
        current_section['title'] = title

    def capture_question(num, body, src='', grade=''):
        # Original source uses integer numbers that reset per section.
        key_candidates = [
            key for key in selected
            if key[1] == current_section['title'] and key[2] == int(num)
        ]
        for key in key_candidates:
            block = selected[key]
            if key[0].endswith('t02_angles.py') and active_file['path'].endswith('t02_angles.py'):
                captured[block['id']] = body
            elif key[0].endswith('t03_congruence.py') and active_file['path'].endswith('t03_congruence.py'):
                captured[block['id']] = body

    def capture_endsec():
        return None

    wsengine.SECTION = capture_section
    wsengine.Q = capture_question
    wsengine.ENDSEC = capture_endsec

    active_file = {'path': ''}
    for topic_path in ['geometry8/topics/t02_angles.py', 'geometry8/topics/t03_congruence.py']:
        active_file['path'] = topic_path
        module_name = pathlib.Path(topic_path).stem
        module = import_from_path(module_name, tmp_dir / pathlib.Path(topic_path).name)
        module.build()

    missing = [block['id'] for block in manifest['blocks'] if block['id'] not in captured]
    if missing:
        raise RuntimeError(f'Failed to capture curriculum blocks: {missing}')

    # Embed original raster assets as data URIs so output is self-contained and pinned.
    asset_data = {}
    for asset_path, sha in asset_records.items():
        data = fetch_pinned(asset_path, sha)
        mime = 'image/png' if asset_path.lower().endswith('.png') else 'application/octet-stream'
        asset_data[pathlib.Path(asset_path).name] = f'data:{mime};base64,{base64.b64encode(data).decode("ascii")}'

    rendered_blocks = []
    for block in manifest['blocks']:
        body = captured[block['id']]
        for filename, data_uri in asset_data.items():
            body = body.replace(f'src="assets/{filename}"', f'src="{data_uri}"')

        # This wrapper is byte-for-byte equivalent in structure to wsengine.Q for an untagged question.
        label = str(block['question'])
        html = (
            f'<div class="q"><div class="qhead"><span class="qnum">{label}</span>'
            f'<div class="qtags"></div></div><div class="qbody">{body}</div></div>'
        )
        rendered_blocks.append({
            'id': block['id'],
            'section': block['section'],
            'question': block['question'],
            'reason': block['reason'],
            'html': html,
            'htmlSha256': hashlib.sha256(html.encode('utf-8')).hexdigest(),
        })

output = {
    'generatedFrom': {
        'repository': manifest['sourceRepository'],
        'commit': commit,
        'mode': 'verbatim-rendered',
        'engine': 'geometry8/wsengine.py',
    },
    'immutable': True,
    'blockCount': len(rendered_blocks),
    'blocks': rendered_blocks,
}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'bbb-rendered: captured {len(rendered_blocks)} verbatim question blocks')
