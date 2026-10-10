    // TWOK mod: Pause the live player once per full page load (fresh tab/PWA launch or reload).
    // Uses a page-lifetime flag (not sessionStorage) so every fresh load pauses once, while
    // in-app navigation to other channels in the same tab keeps playing.
    (function autoPauseOnFirstLoad() {
        if (window.location.hostname !== 'www.twitch.tv' || window.top !== window.self) return;
        if (window.__teAutoPauseDone) return;
        const PLAY_PAUSE_SELECTOR = 'button[data-a-target="player-play-pause-button"]';
        const TIMEOUT_MS = 30000;
        let done = false;
        let observer = null;
        let timer = null;
        const hooked = new WeakSet();

        const finish = () => {
            done = true;
            window.__teAutoPauseDone = true;
            if (observer) observer.disconnect();
            if (timer) clearTimeout(timer);
            document.removeEventListener('visibilitychange', startTimer);
        };

        const pauseOnce = (video) => {
            if (done) return;
            finish();
            const btn = document.querySelector(PLAY_PAUSE_SELECTOR);
            if (btn && btn.getAttribute('data-a-player-state') !== 'paused') btn.click();
            setTimeout(() => {
                if (!video.paused) video.pause();
                Logger.success('Auto-paused stream on first load');
            }, 300);
        };

        const hook = (video) => {
            if (done || hooked.has(video)) return;
            hooked.add(video);
            if (!video.paused && video.readyState > 2) {
                pauseOnce(video);
            } else {
                video.addEventListener('playing', () => pauseOnce(video), { once: true });
            }
        };

        const scan = () => {
            if (done) return;
            document.querySelectorAll(`${PLAYER_SELECTOR} video, video`).forEach(hook);
        };

        observer = new MutationObserver(scan);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        // Start the ~30s window once the page is actually visible (a tab/PWA opened in the
        // background doesn't start the stream until it's shown).
        const startTimer = () => {
            if (done || timer || document.hidden) return;
            timer = setTimeout(finish, TIMEOUT_MS);
            document.removeEventListener('visibilitychange', startTimer);
        };
        document.addEventListener('visibilitychange', startTimer);
        startTimer();
        scan();
    })();
