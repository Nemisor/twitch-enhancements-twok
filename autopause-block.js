    // TWOK mod: Pause ONLY the video that autoplays when Twitch first loads (fresh tab/PWA
    // launch or full reload). Cancels for good on any in-app navigation or the first real user
    // interaction, so a stream the user clicks to open is never paused. Gives up after ~30s visible.
    (function autoPauseOnFirstLoad() {
        if (window.location.hostname !== 'www.twitch.tv' || window.top !== window.self) return;
        if (window.__teAutoPauseDone) return;
        const INITIAL_HREF = window.location.href;
        const INITIAL_PATH = window.location.pathname;
        const PLAY_PAUSE_SELECTOR = 'button[data-a-target="player-play-pause-button"]';
        const TIMEOUT_MS = 30000;
        let done = false;
        let observer = null;
        let timer = null;
        let poll = null;
        const hooked = new WeakSet();
        const onInitialUrl = () => window.location.href === INITIAL_HREF || window.location.pathname === INITIAL_PATH;

        const finish = () => {
            if (done) return;
            done = true;
            window.__teAutoPauseDone = true;
            if (observer) observer.disconnect();
            if (timer) clearTimeout(timer);
            if (poll) clearInterval(poll);
            document.removeEventListener('visibilitychange', startTimer);
            window.removeEventListener('popstate', onPopState, true);
            document.removeEventListener('pointerdown', onUserInput, true);
            document.removeEventListener('keydown', onUserInput, true);
            if (window.navigation && window.navigation.removeEventListener) window.navigation.removeEventListener('navigate', onNavigate);
        };

        // Any in-app navigation cancels (a replaceState that keeps the same path is fine).
        const checkPath = () => { if (!done && window.location.pathname !== INITIAL_PATH) finish(); };
        const onPopState = () => finish();
        const onNavigate = (e) => {
            try {
                const dest = new URL(e.destination.url);
                if (e.navigationType === 'replace' && dest.pathname === INITIAL_PATH) return;
            } catch (_) { /* fall through */ }
            finish();
        };
        try {
            const origPush = history.pushState;
            const origReplace = history.replaceState;
            history.pushState = function () { const r = origPush.apply(this, arguments); if (!done && window.location.href !== INITIAL_HREF) finish(); return r; };
            history.replaceState = function () { const r = origReplace.apply(this, arguments); checkPath(); return r; };
        } catch (_) { /* sandboxed; rely on navigate/popstate/poll */ }
        window.addEventListener('popstate', onPopState, true);
        if (window.navigation && window.navigation.addEventListener) window.navigation.addEventListener('navigate', onNavigate);
        poll = setInterval(checkPath, 200);

        // First real user interaction before a pause cancels it.
        const onUserInput = (e) => { if (e.isTrusted) finish(); };
        document.addEventListener('pointerdown', onUserInput, true);
        document.addEventListener('keydown', onUserInput, true);

        const pauseOnce = (video) => {
            if (done) return;
            if (!onInitialUrl()) { finish(); return; }
            finish();
            const btn = document.querySelector(PLAY_PAUSE_SELECTOR);
            if (btn && btn.getAttribute('data-a-player-state') !== 'paused') btn.click();
            setTimeout(() => {
                if (!video.paused) video.pause();
                Logger.success('Auto-paused autoplay video on first load');
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
            checkPath();
            if (done) return;
            document.querySelectorAll(`${PLAYER_SELECTOR} video, video`).forEach(hook);
        };

        observer = new MutationObserver(scan);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        // Start the ~30s window once the page is actually visible.
        const startTimer = () => {
            if (done || timer || document.hidden) return;
            timer = setTimeout(finish, TIMEOUT_MS);
            document.removeEventListener('visibilitychange', startTimer);
        };
        document.addEventListener('visibilitychange', startTimer);
        startTimer();
        scan();
    })();
