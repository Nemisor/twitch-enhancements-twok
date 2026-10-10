#!/usr/bin/env python3
"""Apply TWOK's autoPauseOnFirstLoad mod to a stock Twitch Enhancements script.
Usage: apply-autopause.py STOCK.user.js OUT.user.js RAW_URL
Exit 2 if the patch can't apply cleanly (anchor missing/ambiguous, header fields missing, or already modded)."""
import re, sys, os
MOD_REV = 2  # bump for every mod fix so Tampermonkey sees a newer version
stock, out, raw = sys.argv[1:4]
here = os.path.dirname(os.path.abspath(__file__))
src = open(stock, encoding='utf-8').read()
block = open(os.path.join(here, 'autopause-block.js'), encoding='utf-8').read().rstrip('\n') + '\n'
def die(m): print('PATCH-FAIL: ' + m, file=sys.stderr); sys.exit(2)
if 'autoPauseOnFirstLoad' in src: die('stock already contains autoPauseOnFirstLoad')
m = re.search(r'^// @version\s+(\S+)\s*$', src, re.M)
if not m: die('no @version')
author = m.group(1); newver = '%s.%d' % (author, MOD_REV)
if src.count('// ==/UserScript==') != 1: die('header end not unique')
for k in ('@name', '@namespace'):
    if not re.search(r'^// ' + k + r'\s', src, re.M): die('missing ' + k)
anchor = '\n    let o = new MutationObserver(() => {'
if src.count(anchor) != 1: die('insertion anchor count = %d' % src.count(anchor))
if 'PLAYER_SELECTOR' not in src or 'Logger' not in src: die('PLAYER_SELECTOR/Logger missing')
src = src.replace(m.group(0), '// @version      ' + newver, 1)
src = re.sub(r'^// @(downloadURL|updateURL)\s.*\n', '', src, flags=re.M)
src = src.replace('// ==/UserScript==',
    '// @downloadURL  %s\n// @updateURL    %s\n// ==/UserScript==\n\n'
    '// Modified by TWOK: auto-pause on first load (pauses the player once per full page load\n'
    '// when it first plays; gives up after 30s). Based on author version %s; hosted at github.com/Nemisor/twitch-enhancements-twok.' % (raw, raw, author), 1)
src = src.replace(anchor, '\n\n' + block + anchor, 1)
open(out, 'w', encoding='utf-8', newline='\n').write(src)
print('OK author=%s new=%s' % (author, newver))
