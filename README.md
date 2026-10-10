# Twitch Enhancements (TWOK mod)

This is the **Twitch Enhancements** userscript by **JJJ**, published on Greasy Fork as script [494966](https://greasyfork.org/scripts/494966) under the **MIT license**. All credit for the script goes to the author. This repo only adds one small change:

- **Auto-pause on first load**: pauses the Twitch player once per full page load, the first time it starts playing. It gives up after 30 seconds. In-app channel navigation and manual play are left alone.

## Install

Open this link with Tampermonkey installed:

https://raw.githubusercontent.com/Nemisor/twitch-enhancements-twok/main/twitch-enhancements-twok.user.js

The script's `@updateURL`/`@downloadURL` point to that same link, so Tampermonkey updates from this repo instead of Greasy Fork. The version is `<author version>.1`.

## How it's built

- `autopause-block.js`: the mod code.
- `apply-autopause.py STOCK OUT RAW_URL`: inserts the block into the stock script, sets the version and update URLs, and exits with code 2 (`PATCH-FAIL`) if the stock script changed in a way the patch can't handle.
- `.github/workflows/build.yml`: downloads the current stock script from Greasy Fork daily (or on demand), runs the patcher and commits the result when it changes. If the patch fails, the run fails and nothing is pushed.

## License

MIT, same as the upstream script. Original author: JJJ (https://greasyfork.org/scripts/494966).
