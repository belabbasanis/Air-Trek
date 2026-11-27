#!/usr/bin/env python3
"""Slim a .glb for the web: shrink its textures and re-encode them, then write the .glb back out.

    python3 tools/slim-glb.py input.glb output.glb [--max 1024] [--quality 85]

- Every embedded texture is resized so its longest side is at most --max pixels (never enlarged).
  Normal maps keep a little more quality; roughness/metal maps go to half the size.
- Opaque textures become JPEG; a texture with real transparency stays PNG.
- Geometry, skins and animations are copied as they are (no mesh compression, so the plain
  three.js GLTFLoader reads the result without any decoder).
- Tripo rigs sometimes store bone rotations as normalised int16 while labelling them FLOAT, which
  makes every clip explode in three.js. Such tracks are detected and rewritten as real floats.

Needs Python 3 with Pillow and numpy:  pip3 install pillow numpy
"""
import argparse, io, json, struct, sys

import numpy as np
from PIL import Image


def read_glb(path):
    b = open(path, 'rb').read()
    magic, version, _ = struct.unpack('<III', b[:12])
    if magic != 0x46546C67 or version != 2: sys.exit(f'{path}: not a glTF 2.0 binary (.glb)')
    off, chunks = 12, []
    while off < len(b):
        n, kind = struct.unpack('<II', b[off:off + 8]); chunks.append((kind, b[off + 8:off + 8 + n])); off += 8 + n
    j = json.loads(chunks[0][1])
    binb = bytearray(chunks[1][1]) if len(chunks) > 1 else bytearray()
    return j, binb, len(b)


def fix_rotations(j, binb):
    acc, bv, fixed = j.get('accessors', []), j.get('bufferViews', []), 0
    for an in j.get('animations', []):
        for ch in an['channels']:
            if ch['target'].get('path') != 'rotation': continue
            a = acc[an['samplers'][ch['sampler']]['output']]
            if a.get('componentType') != 5126 or a.get('type') != 'VEC4' or 'bufferView' not in a: continue
            v, n = bv[a['bufferView']], a['count']; o = v.get('byteOffset', 0) + a.get('byteOffset', 0)
            if v['byteLength'] < n * 16: continue
            raw = bytes(binb[o:o + n * 16])
            f = np.frombuffer(raw, '<f4').reshape(n, 4).astype(np.float64)
            with np.errstate(all='ignore'):
                if np.all(np.abs(np.linalg.norm(f, axis=1) - 1) < 1e-3): continue        # already real unit quaternions
            q = np.frombuffer(raw, '<i2').reshape(n, 8)[:, :4].astype(np.float64) / 32767.0
            nr = np.linalg.norm(q, axis=1)
            if not np.all(np.abs(nr - 1) < 2e-3): continue                                # not the int16 case either: leave it
            q = (q / nr[:, None]).astype('<f4'); binb[o:o + n * 16] = q.tobytes(); fixed += 1
            a['min'] = q.min(axis=0).astype(float).tolist(); a['max'] = q.max(axis=0).astype(float).tolist()
    return fixed


def texture_roles(j):
    """image index -> 'normal' | 'orm' | 'color' (how the materials use it)"""
    tex, roles = j.get('textures', []), {}
    def mark(ref, role):
        if ref and 'index' in ref and ref['index'] < len(tex) and 'source' in tex[ref['index']]: roles.setdefault(tex[ref['index']]['source'], role)
    for m in j.get('materials', []):
        mark(m.get('normalTexture'), 'normal')
        pbr = m.get('pbrMetallicRoughness', {})
        mark(pbr.get('metallicRoughnessTexture'), 'orm'); mark(m.get('occlusionTexture'), 'orm')
        mark(pbr.get('baseColorTexture'), 'color'); mark(m.get('emissiveTexture'), 'color')
    return roles


def slim_images(j, binb, max_px, quality):
    bv, roles, out, report = j.get('bufferViews', []), texture_roles(j), {}, []
    for i, im in enumerate(j.get('images', [])):
        if 'bufferView' not in im: continue                                                   # external or data-URI images are left alone
        v = bv[im['bufferView']]; data = bytes(binb[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])
        img = Image.open(io.BytesIO(data)); role = roles.get(i, 'color')
        cap = max(64, max_px // 2) if role == 'orm' else max_px
        w, h = img.size; k = min(1.0, cap / max(w, h)); size = (max(1, round(w * k)), max(1, round(h * k)))
        if size == (w, h) and img.format == 'JPEG':                                              # already small JPEG: re-encoding would only lose quality
            report.append(f'  image {i} ({role}): {w}x{h} {len(data)/1e3:.0f} KB, kept'); continue
        alpha = img.mode in ('RGBA', 'LA', 'PA') or (img.mode == 'P' and 'transparency' in img.info)
        if alpha:
            img = img.convert('RGBA'); alpha = img.getchannel('A').getextrema()[0] < 255  # keep PNG only for real transparency
        img = img.convert('RGBA' if alpha else 'RGB')
        if size != (w, h): img = img.resize(size, Image.LANCZOS)
        buf = io.BytesIO()
        if alpha: img.save(buf, 'PNG', optimize=True); im['mimeType'] = 'image/png'
        else: img.save(buf, 'JPEG', quality=min(95, quality + 7) if role == 'normal' else quality, optimize=True); im['mimeType'] = 'image/jpeg'
        if len(buf.getvalue()) < len(data) or size != (w, h):
            out[im['bufferView']] = buf.getvalue(); report.append(f'  image {i} ({role}): {w}x{h} {len(data)/1e3:.0f} KB -> {size[0]}x{size[1]} {len(buf.getvalue())/1e3:.0f} KB')
        else: report.append(f'  image {i} ({role}): {w}x{h} {len(data)/1e3:.0f} KB, kept')
    return out, report


def write_glb(path, j, binb, replaced):
    bv, nb = j.get('bufferViews', []), bytearray()
    for k in sorted(range(len(bv)), key=lambda k: bv[k].get('byteOffset', 0)):              # every view rewritten in order, 4-byte aligned
        v = bv[k]; data = replaced.get(k) or bytes(binb[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])
        while len(nb) % 4: nb.append(0)
        v['byteOffset'] = len(nb); v['byteLength'] = len(data); nb += data
    while len(nb) % 4: nb.append(0)
    if j.get('buffers'): j['buffers'][0]['byteLength'] = len(nb)
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    total = 12 + 8 + len(js) + (8 + len(nb) if nb else 0)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total)); f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        if nb: f.write(struct.pack('<II', len(nb), 0x004E4942)); f.write(nb)
    return total


def main():
    ap = argparse.ArgumentParser(description='Shrink the textures of a .glb (and repair Tripo int16 rotations).')
    ap.add_argument('input'); ap.add_argument('output')
    ap.add_argument('--max', type=int, default=1024, help='longest side of colour and normal textures, in pixels (default 1024)')
    ap.add_argument('--quality', type=int, default=85, help='JPEG quality for colour textures (default 85)')
    a = ap.parse_args()
    j, binb, before = read_glb(a.input)
    if len(j.get('buffers', [])) > 1 or any('uri' in b for b in j.get('buffers', [])): sys.exit('only self-contained .glb files (one embedded buffer) are supported')
    fixed = fix_rotations(j, binb)
    replaced, report = slim_images(j, binb, a.max, a.quality)
    after = write_glb(a.output, j, binb, replaced)
    print(f'{a.input}: {before/1e6:.2f} MB -> {a.output}: {after/1e6:.2f} MB')
    for line in report: print(line)
    if fixed: print(f'  repaired {fixed} animation rotation tracks (int16 data labelled FLOAT)')


if __name__ == '__main__':
    main()
