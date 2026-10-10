    // TWOK mod: pause ONLY the front-page autoplay video when Twitch first loads.
    // Approach modeled on FrankerFaceZ (Apache-2.0, https://github.com/FrankerFaceZ/FrankerFaceZ):
    // only act on the front page and only on its featured player; direct channel loads never pause.
    // Once per full page load; cancels on any navigation away from '/'; gives up ~30s after the
    // page is visible. If an ad is showing when we pause, pause again on the next play after it.
    (function autoPauseOnFirstLoad() {
        if (window.location.hostname !== 'www.twitch.tv' || window.top !== window.self) return;
        if (window.__teAutoPauseDone) return;
        if (window.location.pathname !== '/') return; // arm only on the front page
        const FRONT_VIDEO_SELECTOR = [
            '[data-a-player-type="frontpage"] video',
            '[data-a-player-type="channel_home_carousel"] video',
            '[data-a-player-type="site"] video'
        ].join(',');
        const AD_SELECTOR = [
            '[data-a-target="video-ad-label"]',
            '[data-a-target="video-ad-countdown"]',
            '[data-test-selector="ad-banner-default-text"]'
        ].join(',');
        const PLAY_PAUSE_SELECTOR = 'button[data-a-target="player-play-pause-button"]';
        const TIMEOUT_MS = 30000;
        let done = false;
        let paused = false;     // we've paused the autoplay video once
        let adPending = false;  // an ad was showing when we paused; re-pause after it
        let observer = null;
        let timer = null;
        let poll = null;
        const hooked = new WeakSet();
        const onFrontPage = () => window.location.pathname === '/';
        const adShowing = () => !!document.querySelector(AD_SELECTOR);

        const finish = () => {
            if (done) return;
            done = true;
            window.__teAutoPauseDone = true;
            if (observer) observer.disconnect();
            if (timer) clearTimeout(timer);
            if (poll) clearInterval(poll);
            document.removeEventListener('visibilitychange', startTimer);
            window.removeEventListener('popstate', checkPath, true);
            if (window.navigation && window.navigation.removeEventListener) window.navigation.removeEventListener('navigate', onNavigate);
        };

        // Cancel on any navigation away from '/' (pushState/replaceState/popstate/navigate + poll).
        const checkPath = () => { if (!done && !onFrontPage()) finish(); };
        const onNavigate = (e) => {
            try { if (new URL(e.destination.url).pathname === '/') return; } catch (_) { /* fall through */ }
            finish();
        };
        try {
            const origPush = history.pushState;
            const origReplace = history.replaceState;
            history.pushState = function () { const r = origPush.apply(this, arguments); checkPath(); return r; };
            history.replaceState = function () { const r = origReplace.apply(this, arguments); checkPath(); return r; };
        } catch (_) { /* sandboxed; rely on navigate/popstate/poll */ }
        window.addEventListener('popstate', checkPath, true);
        if (window.navigation && window.navigation.addEventListener) window.navigation.addEventListener('navigate', onNavigate);
        poll = setInterval(checkPath, 250);

        const doPause = (video) => {
            const btn = document.querySelector(PLAY_PAUSE_SELECTOR);
            if (btn && btn.getAttribute('data-a-player-state') !== 'paused') btn.click();
            setTimeout(() => { if (!video.paused) video.pause(); }, 300);
        };

        const onPlaying = (video) => {
            if (done) return;
            checkPath();
            if (done) return;
            if (!paused) {
                paused = true;
                adPending = adShowing();
                doPause(video);
                Logger.success('Auto-paused front-page autoplay' + (adPending ? ' (ad showing; will re-pause after it)' : ''));
                if (!adPending) finish();
            } else if (adPending && !adShowing()) {
                adPending = false;
                doPause(video);
                Logger.success('Re-paused front-page autoplay after ad');
                finish();
            }
        };

        const hook = (video) => {
            if (done || hooked.has(video)) return;
            hooked.add(video);
            video.addEventListener('playing', () => onPlaying(video));
            if (!video.paused && video.readyState > 2) onPlaying(video);
        };

        const scan = () => {
            if (done) return;
            checkPath();
            if (done) return;
            document.querySelectorAll(FRONT_VIDEO_SELECTOR).forEach(hook);
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
