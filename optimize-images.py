#!/usr/bin/env python3
"""Optimize Be Healthy PT images: download, convert to WebP, update HTML."""
import re, os, subprocess, sys
from pathlib import Path

SITE = Path("/home/jarvis/.openclaw/workspace/projects/freelance/be-healthy/site-v2")
ASSETS = SITE / "assets"
IMAGES = SITE / "images"
IMAGES.mkdir(exist_ok=True)

html_files = list(SITE.glob("*.html"))
print(f"{len(html_files)} HTML files")

# Collect ALL framer CDN URLs
url_re = re.compile(r'https://framerusercontent\.com/images/([A-Za-z0-9_\-]+)\.(\w+)(?:\?[^"\'&\s<>)]*(?:&amp;[^"\'&\s<>)]*)*)?')

# Build set of unique base images (hash + ext)
base_images = set()
for hf in html_files:
    for m in url_re.finditer(hf.read_text()):
        base_images.add((m.group(1), m.group(2)))

print(f"{len(base_images)} unique base images")

# Step 1: Download missing base images
downloaded = 0
for name, ext in sorted(base_images):
    dest = ASSETS / f"{name}.{ext}"
    if dest.exists() and dest.stat().st_size > 100:
        continue
    url = f"https://framerusercontent.com/images/{name}.{ext}"
    print(f"DL: {name}.{ext}")
    try:
        subprocess.run(["curl", "-sL", "-o", str(dest), url], timeout=30, check=True)
        downloaded += 1
    except Exception as e:
        print(f"  FAIL: {e}")
print(f"Downloaded {downloaded} new images")

# Step 2: Convert to WebP (skip SVGs)
converted = {}
for name, ext in sorted(base_images):
    src = ASSETS / f"{name}.{ext}"
    if not src.exists() or src.stat().st_size < 100:
        continue
    
    if ext.lower() == "svg":
        converted[name] = {"svg": True, "path": f"assets/{name}.{ext}"}
        continue
    
    desktop = IMAGES / f"{name}-desktop.webp"
    mobile = IMAGES / f"{name}-mobile.webp"
    
    if not desktop.exists():
        r = subprocess.run(["convert", str(src), "-resize", "1200x>", "-quality", "80", str(desktop)], capture_output=True)
        if r.returncode != 0:
            print(f"  convert fail: {name}")
            continue
    
    if not mobile.exists():
        subprocess.run(["convert", str(src), "-resize", "600x>", "-quality", "80", str(mobile)], capture_output=True)
    
    # Get dimensions
    try:
        r = subprocess.run(["identify", "-format", "%w %h", str(desktop)], capture_output=True, text=True, check=True)
        w, h = r.stdout.strip().split()[:2]
        converted[name] = {"desktop": f"images/{name}-desktop.webp", "mobile": f"images/{name}-mobile.webp", "w": int(w), "h": int(h)}
    except:
        pass

print(f"Converted {len([v for v in converted.values() if not v.get('svg')])} raster + {len([v for v in converted.values() if v.get('svg')])} SVG")

# Step 3: Update HTML
for hf in html_files:
    content = hf.read_text()
    img_idx = [0]
    
    def replace_img(m):
        tag = m.group(0)
        url_m = url_re.search(tag)
        if not url_m:
            return tag
        name = url_m.group(1)
        info = converted.get(name)
        if not info:
            return tag
        if info.get("svg"):
            # Replace all CDN refs for this SVG with local path
            return url_re.sub(lambda mm: info["path"] if mm.group(1) == name else mm.group(0), tag)
        
        alt_m = re.search(r'alt="([^"]*)"', tag)
        alt = alt_m.group(1) if alt_m else ""
        style_m = re.search(r'style="([^"]*)"', tag)
        style = f' style="{style_m.group(1)}"' if style_m else ""
        cls_m = re.search(r'class="([^"]*)"', tag)
        cls = f' class="{cls_m.group(1)}"' if cls_m else ""
        
        img_idx[0] += 1
        lazy = '' if img_idx[0] <= 1 else ' loading="lazy"'
        priority = ' fetchpriority="high"' if img_idx[0] <= 1 else ''
        
        return (f'<img src="{info["desktop"]}" '
                f'srcset="{info["mobile"]} 600w, {info["desktop"]} 1200w" '
                f'sizes="(max-width: 768px) 600px, 1200px" '
                f'width="{info["w"]}" height="{info["h"]}" '
                f'alt="{alt}"{cls}{style}{lazy}{priority} decoding="async">')
    
    new = re.sub(r'<img\s[^>]*?>', replace_img, content)
    
    # Replace remaining CDN URLs outside img tags (srcset in source tags, etc.)
    for name, ext in base_images:
        info = converted.get(name)
        if not info:
            continue
        pattern = re.compile(rf'https://framerusercontent\.com/images/{re.escape(name)}\.{re.escape(ext)}(?:\?[^"\'&\s<>)]*(?:&amp;[^"\'&\s<>)]*)*)?')
        if info.get("svg"):
            new = pattern.sub(info["path"], new)
        else:
            new = pattern.sub(info["desktop"], new)
    
    hf.write_text(new)
    print(f"  {hf.name}: {img_idx[0]} img tags")

# Summary
remaining = sum(1 for hf in html_files for _ in re.finditer(r'framerusercontent\.com/images/', hf.read_text()))
webp_size = sum(f.stat().st_size for f in IMAGES.glob("*.webp"))
print(f"\nWebP total: {webp_size/1024/1024:.1f}MB")
print(f"Remaining CDN refs: {remaining}")
