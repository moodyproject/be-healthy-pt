#!/usr/bin/env python3
"""Download framer CDN images, convert to WebP, update HTML files."""

import os
import re
import subprocess
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse, unquote
from html import unescape
import urllib.request

SITE_DIR = Path(__file__).parent
IMG_DIR = SITE_DIR / "images"
IMG_DIR.mkdir(exist_ok=True)

# Find all HTML files (exclude node_modules)
html_files = []
for pattern in ["*.html", "blog/*.html", "support/*.html"]:
    html_files.extend(SITE_DIR.glob(pattern))

print(f"Found {len(html_files)} HTML files")

# Extract all framer image URLs from all HTML files
all_urls = set()
url_pattern = re.compile(r'https://framerusercontent\.com/images/[^"\'\s\)]+')

for hf in html_files:
    content = hf.read_text()
    # Unescape &amp; to & for proper URL handling
    found = url_pattern.findall(content)
    for u in found:
        all_urls.add(u.replace('&amp;', '&'))

print(f"Found {len(all_urls)} total URLs (with query params)")

# Deduplicate by base URL (strip query params)
base_to_urls = {}
for url in all_urls:
    base = url.split('?')[0]
    if base not in base_to_urls:
        base_to_urls[base] = []
    base_to_urls[base].append(url)

unique_bases = sorted(base_to_urls.keys())
print(f"Unique base images: {len(unique_bases)}")

# Generate local filenames from base URLs
def get_local_name(base_url):
    """Extract filename from URL path."""
    path = urlparse(base_url).path
    fname = path.split('/')[-1]  # e.g., "abc123.jpg"
    return fname

# Download unique images
downloaded = {}
failed = []
for i, base_url in enumerate(unique_bases):
    fname = get_local_name(base_url)
    local_path = IMG_DIR / fname
    
    if local_path.exists() and local_path.stat().st_size > 0:
        downloaded[base_url] = local_path
        continue
    
    print(f"  [{i+1}/{len(unique_bases)}] Downloading {fname}...")
    try:
        req = urllib.request.Request(base_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        local_path.write_bytes(data)
        downloaded[base_url] = local_path
    except Exception as e:
        print(f"    FAILED: {e}")
        failed.append(base_url)

print(f"\nDownloaded: {len(downloaded)}, Failed: {len(failed)}")
if failed:
    for f in failed:
        print(f"  FAILED: {f}")

# Convert to WebP using ImageMagick
# SVGs stay as-is, everything else -> WebP
webp_map = {}  # base_url -> {desktop: path, mobile: path}

for base_url, local_path in downloaded.items():
    ext = local_path.suffix.lower()
    stem = local_path.stem
    
    if ext == '.svg':
        webp_map[base_url] = {'desktop': local_path, 'mobile': None}
        continue
    
    webp_path = IMG_DIR / f"{stem}.webp"
    mobile_path = IMG_DIR / f"{stem}-mobile.webp"
    
    if not webp_path.exists():
        # Determine max width: use 1200 for large images, 800 for smaller
        try:
            result = subprocess.run(
                ['identify', '-format', '%w', str(local_path)],
                capture_output=True, text=True, timeout=10
            )
            orig_width = int(result.stdout.strip().split('[')[0]) if result.stdout.strip() else 1200
        except:
            orig_width = 1200
        
        max_w = min(1200, orig_width)
        cmd = [
            'convert', str(local_path),
            '-resize', f'{max_w}x>',
            '-quality', '80',
            str(webp_path)
        ]
        try:
            subprocess.run(cmd, timeout=30, check=True, capture_output=True)
        except Exception as e:
            print(f"  WebP conversion failed for {stem}: {e}")
            webp_map[base_url] = {'desktop': local_path, 'mobile': None}
            continue
    
    # Create mobile variant for images wider than 800px
    if not mobile_path.exists():
        try:
            result = subprocess.run(
                ['identify', '-format', '%w', str(webp_path)],
                capture_output=True, text=True, timeout=10
            )
            w = int(result.stdout.strip().split('[')[0]) if result.stdout.strip() else 0
            if w > 700:
                subprocess.run([
                    'convert', str(local_path),
                    '-resize', '600x>',
                    '-quality', '80',
                    str(mobile_path)
                ], timeout=30, check=True, capture_output=True)
            else:
                mobile_path = None
        except:
            mobile_path = None
    
    webp_map[base_url] = {
        'desktop': webp_path if webp_path.exists() else local_path,
        'mobile': mobile_path if mobile_path and mobile_path.exists() else None
    }

print(f"\nConverted {len(webp_map)} images to WebP")

# Get dimensions for width/height attributes
def get_dimensions(path):
    try:
        result = subprocess.run(
            ['identify', '-format', '%wx%h', str(path)],
            capture_output=True, text=True, timeout=10
        )
        parts = result.stdout.strip().split('[')[0]
        w, h = parts.split('x')
        return int(w), int(h)
    except:
        return None, None

# Now update HTML files
# Strategy: for each HTML file, find all framer image URLs and replace them
# We need to handle both src= and srcset= attributes, and background-image URLs

def get_relative_path(html_file, img_path):
    """Get relative path from HTML file to image."""
    return os.path.relpath(img_path, html_file.parent)

img_count_first = {}  # track first image per HTML file for eager loading

for hf in html_files:
    content = hf.read_text()
    original = content
    img_counter = [0]  # mutable container for closure
    
    # Find all img tags and replace
    def replace_img_tag(match):
        img_counter[0] += 1
        is_first_img = (img_counter[0] == 1)
        tag = match.group(0)
        
        # Extract src
        src_match = re.search(r'src="([^"]*framerusercontent\.com/images/[^"]*)"', tag)
        if not src_match:
            return tag
        
        orig_src = src_match.group(1).replace('&amp;', '&')
        base_url = orig_src.split('?')[0]
        
        if base_url not in webp_map:
            return tag
        
        info = webp_map[base_url]
        desktop_path = info['desktop']
        mobile_path = info['mobile']
        
        rel_desktop = get_relative_path(hf, desktop_path)
        
        # Get dimensions
        w, h = get_dimensions(desktop_path)
        
        # Build new tag
        new_src = rel_desktop
        
        # Add loading attribute
        loading = 'eager' if is_first_img else 'lazy'
        
        # Remove old src, add new attributes
        new_tag = tag
        # Replace src
        new_tag = re.sub(
            r'src="[^"]*framerusercontent\.com/images/[^"]*"',
            f'src="{new_src}"',
            new_tag
        )
        
        # Add/replace loading attribute
        if 'loading=' in new_tag:
            new_tag = re.sub(r'loading="[^"]*"', f'loading="{loading}"', new_tag)
        else:
            new_tag = new_tag.replace('<img ', f'<img loading="{loading}" ')
        
        # Add width/height if we have them and they're not already there
        if w and h:
            if 'width=' not in new_tag.lower().split('style=')[0]:  # Don't conflict with style
                # Add before closing > or />
                dim_attrs = f'width="{w}" height="{h}"'
                if '/>' in new_tag:
                    new_tag = new_tag.replace('/>', f'{dim_attrs} />')
                elif '>' in new_tag:
                    new_tag = new_tag.replace('>', f' {dim_attrs}>', 1)
        
        # Add srcset for responsive images if mobile variant exists
        if mobile_path:
            rel_mobile = get_relative_path(hf, mobile_path)
            srcset = f'{rel_mobile} 600w, {rel_desktop} 1200w'
            if 'srcset=' not in new_tag:
                new_tag = new_tag.replace(f'src="{new_src}"', 
                    f'src="{new_src}" srcset="{srcset}" sizes="(max-width: 768px) 600px, 1200px"')
        
        return new_tag
    
    # Replace img tags
    content = re.sub(r'<img[^>]*framerusercontent\.com/images/[^>]*/?>', replace_img_tag, content)
    
    # Also replace srcset attributes that reference framer CDN
    def replace_srcset_url(match):
        orig_url = match.group(1).replace('&amp;', '&')
        base_url = orig_url.split('?')[0]
        descriptor = match.group(2) if match.lastindex >= 2 else ''
        
        if base_url in webp_map:
            info = webp_map[base_url]
            rel_path = get_relative_path(hf, info['desktop'])
            return f'{rel_path}{descriptor}'
        return match.group(0)
    
    # Replace background-image URLs in style attributes
    def replace_bg_url(match):
        orig_url = match.group(1).replace('&amp;', '&')
        base_url = orig_url.split('?')[0]
        
        if base_url in webp_map:
            info = webp_map[base_url]
            rel_path = get_relative_path(hf, info['desktop'])
            return f'url({rel_path})'
        return match.group(0)
    
    content = re.sub(
        r'url\((https://framerusercontent\.com/images/[^)]+)\)',
        replace_bg_url,
        content
    )
    
    # Replace any remaining framer image URLs in srcset
    def replace_srcset_attr(match):
        srcset_content = match.group(1)
        def repl_single(m):
            url = m.group(1).replace('&amp;', '&')
            base = url.split('?')[0]
            rest = m.group(2)
            if base in webp_map:
                rel = get_relative_path(hf, webp_map[base]['desktop'])
                return f'{rel}{rest}'
            return m.group(0)
        new_srcset = re.sub(r'(https://framerusercontent\.com/images/[^,\s"]+)(\s+\S+)?', repl_single, srcset_content)
        return f'srcset="{new_srcset}"'
    
    content = re.sub(r'srcset="([^"]*framerusercontent\.com[^"]*)"', replace_srcset_attr, content)
    
    if content != original:
        hf.write_text(content)
        print(f"Updated: {hf.name}")

# Clean up original downloaded files (keep only webp + svg)
kept = 0
removed = 0
for base_url, local_path in downloaded.items():
    ext = local_path.suffix.lower()
    if ext == '.svg':
        kept += 1
        continue
    webp_path = IMG_DIR / f"{local_path.stem}.webp"
    if webp_path.exists() and local_path.exists() and local_path.suffix != '.webp':
        local_path.unlink()
        removed += 1
    else:
        kept += 1

print(f"\nCleaned up: removed {removed} originals, kept {kept} non-webp files")

# Summary
webp_files = list(IMG_DIR.glob("*.webp"))
total_size = sum(f.stat().st_size for f in webp_files)
print(f"\nFinal: {len(webp_files)} WebP files, total size: {total_size / 1024 / 1024:.1f} MB")

# Check for any remaining framer URLs in HTML
remaining = 0
for hf in html_files:
    content = hf.read_text()
    found = re.findall(r'https://framerusercontent\.com/images/[^"\'>\s]+', content)
    if found:
        remaining += len(found)
        print(f"  Remaining in {hf.name}: {len(found)} URLs")

if remaining == 0:
    print("✅ All framer image URLs replaced!")
else:
    print(f"⚠️  {remaining} framer image URLs still remaining")
