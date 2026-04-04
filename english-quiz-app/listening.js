// ===== Luyện Nghe — Listening Dictation =====
// Smart queue: ưu tiên câu chưa học ở bất kỳ module nào
(function () {
    'use strict';

    var lsScreen = document.getElementById('listening-screen');
    var lsPool = null;       // toàn bộ phrases đủ điều kiện (A1+A2, ≤80 ký tự)
    var lsQueue = [];        // 30 câu cho session hiện tại
    var lsIdx = 0;
    var lsCorrect = 0;
    var lsAnswered = false;
    var lsInitialized = false;

    var SESSION_SIZE = 30;

    // ===== Load data =====
    async function lsLoadData() {
        if (lsPool) return;
        var phrases = [];
        if (window.AppDataLoader && typeof window.AppDataLoader.getPhrasesList === 'function') {
            phrases = await window.AppDataLoader.getPhrasesList();
        } else {
            var res = await fetch('phrases.json');
            var json = await res.json();
            phrases = Array.isArray(json && json.phrases) ? json.phrases : [];
        }

        lsPool = phrases.filter(function (p) {
            return (p.level === 'A1' || p.level === 'A2') && p.en && p.en.length <= 80;
        });
    }

    // ===== Shuffle =====
    function lsShuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    // ===== Smart queue: ưu tiên câu chưa seen =====
    // Logic:
    //   1. Chưa seen ở đâu → ưu tiên cao nhất
    //   2. Đã seen ở Phrases nhưng chưa nghe → ưu tiên trung bình
    //   3. Đã nghe rồi → lấy xếp sau, tránh lặp lại gần đây
    function lsBuildSmartQueue() {
        var seenAll = window.SeenPhrases ? window.SeenPhrases.getAll() : [];
        var seenSet = {};
        seenAll.forEach(function (id) { seenSet[id] = true; });

        // Tách pool thành 2 nhóm
        var unseen = [];
        var seen = [];
        lsPool.forEach(function (p) {
            if (seenSet[p.id]) seen.push(p);
            else unseen.push(p);
        });

        // Shuffle cả 2 nhóm
        unseen = lsShuffle(unseen);
        seen = lsShuffle(seen);

        // Ghép: unseen trước, seen sau
        var combined = unseen.concat(seen);

        // Lấy SESSION_SIZE câu
        return combined.slice(0, SESSION_SIZE);
    }

    // ===== Normalize =====
    function lsNormalize(text) {
        return text.toLowerCase()
            .replace(/[.,!?;:"'""''…\-()[\]]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function lsLevenshtein(a, b) {
        var m = a.length, n = b.length;
        var dp = [];
        for (var i = 0; i <= m; i++) {
            dp[i] = [i];
            for (var j = 1; j <= n; j++) {
                dp[i][j] = i === 0 ? j
                    : (a[i-1] === b[j-1]
                        ? dp[i-1][j-1]
                        : 1 + Math.min(dp[i-1][j-1], dp[i][j-1], dp[i-1][j]));
            }
        }
        return dp[m][n];
    }

    function lsCheckAnswer(userInput, correctText) {
        var u = lsNormalize(userInput);
        var c = lsNormalize(correctText);
        if (u === c) return 'correct';
        var dist = lsLevenshtein(u, c);
        var threshold = Math.max(2, Math.floor(c.length * 0.15));
        if (dist <= threshold) return 'close';
        return 'wrong';
    }

    // ===== TTS =====
    function lsSpeak(rate) {
        var phrase = lsQueue[lsIdx];
        if (!phrase) return;
        var btn = document.getElementById('ls-speak-btn');
        window.speakText(phrase.en, { btn: btn, rate: rate || 1.0 });
    }

    // ===== Show question =====
    function lsShowQuestion() {
        lsAnswered = false;
        var shown = Math.min(lsQueue.length, SESSION_SIZE);
        document.getElementById('ls-counter').textContent = (lsIdx + 1) + '/' + shown;

        var input = document.getElementById('ls-input');
        input.value = '';
        input.disabled = false;
        input.classList.remove('ls-input--correct', 'ls-input--wrong', 'ls-input--close');

        document.getElementById('ls-feedback').style.display = 'none';
        document.getElementById('ls-answer-reveal').style.display = 'none';
        document.getElementById('ls-next-btn').style.display = 'none';
        document.getElementById('ls-submit-btn').style.display = '';

        // Mark as seen khi hiển thị
        var phrase = lsQueue[lsIdx];
        if (window.SeenPhrases && phrase && phrase.id) {
            window.SeenPhrases.add(phrase.id);
        }

        setTimeout(function () { lsSpeak(1.0); }, 300);
        input.focus();
    }

    // ===== Submit =====
    function lsSubmit() {
        if (lsAnswered) return;
        var input = document.getElementById('ls-input');
        var userInput = input.value.trim();
        if (!userInput) return;

        lsAnswered = true;
        input.disabled = true;
        document.getElementById('ls-submit-btn').style.display = 'none';

        var phrase = lsQueue[lsIdx];
        var result = lsCheckAnswer(userInput, phrase.en);
        var feedback = document.getElementById('ls-feedback');
        feedback.style.display = 'flex';

        if (result === 'correct') {
            lsCorrect++;
            feedback.className = 'ls-feedback ls-feedback--correct';
            feedback.innerHTML = '✅ Chính xác!';
            input.classList.add('ls-input--correct');
            if (typeof SFX !== 'undefined') SFX.correct();
        } else if (result === 'close') {
            lsCorrect++;
            feedback.className = 'ls-feedback ls-feedback--close';
            feedback.innerHTML = '🟡 Gần đúng — chấp nhận!';
            input.classList.add('ls-input--close');
            document.getElementById('ls-answer-reveal').style.display = 'block';
            document.getElementById('ls-answer-text').textContent = phrase.en;
            document.getElementById('ls-answer-reveal').innerHTML +=
                '<span class="ls-answer-vi">(' + phrase.vi + ')</span>';
            if (typeof SFX !== 'undefined') SFX.correct();
        } else {
            feedback.className = 'ls-feedback ls-feedback--wrong';
            feedback.innerHTML = '❌ Chưa đúng';
            input.classList.add('ls-input--wrong');
            document.getElementById('ls-answer-reveal').style.display = 'block';
            document.getElementById('ls-answer-text').textContent = phrase.en;
            document.getElementById('ls-answer-reveal').innerHTML +=
                '<span class="ls-answer-vi">(' + phrase.vi + ')</span>';
            if (typeof SFX !== 'undefined') SFX.wrong();
        }

        document.getElementById('ls-next-btn').style.display = '';
    }

    // ===== Next =====
    function lsNext() {
        lsIdx++;
        var total = Math.min(lsQueue.length, SESSION_SIZE);
        if (lsIdx >= total) {
            lsShowDone(total);
        } else {
            lsShowQuestion();
        }
    }

    // ===== Done =====
    function lsShowDone(total) {
        var container = document.querySelector('#listening-screen .game-container');
        var topBar = container.querySelector('.top-bar');
        var topBarHTML = topBar ? topBar.outerHTML : '';

        container.innerHTML = topBarHTML
            + '<div class="ls-body"><div class="ls-done-card">'
            + '<div class="ls-done-icon">🎧</div>'
            + '<h2 class="ls-done-title">Hoàn thành!</h2>'
            + '<p class="ls-done-score">' + lsCorrect + ' / ' + total + ' câu đúng</p>'
            + '<p class="ls-done-seen" style="font-size:0.78rem;color:var(--text-muted)">'
            + 'Tổng đã học: ' + (window.SeenPhrases ? window.SeenPhrases.count() : 0) + ' / ' + lsPool.length + ' câu'
            + '</p>'
            + '<button class="btn-primary btn-large" id="ls-restart-btn">Học tiếp</button>'
            + '<button class="btn-secondary btn-large" id="ls-exit-btn">Thoát</button>'
            + '</div></div>';

        document.getElementById('ls-restart-btn').addEventListener('click', lsStart);
        document.getElementById('ls-exit-btn').addEventListener('click', function () {
            showScreen(document.getElementById('start-screen'));
        });
        // Re-attach back button
        var backBtn = document.getElementById('ls-back-btn');
        if (backBtn) backBtn.addEventListener('click', function () {
            showScreen(document.getElementById('start-screen'));
        });

        if (typeof addXP === 'function') addXP(lsCorrect * 2);
    }

    // ===== Start session =====
    function lsStart() {
        lsQueue = lsBuildSmartQueue();
        lsIdx = 0;
        lsCorrect = 0;

        // Restore full screen HTML nếu bị done-card thay thế
        var input = document.getElementById('ls-input');
        if (!input) {
            var container = document.querySelector('#listening-screen .game-container');
            container.innerHTML = _originalHTML;
            lsAttachEvents();
        }

        lsShowQuestion();
    }

    // Lưu HTML gốc để restore sau done-card
    var _originalHTML = '';

    // ===== Events =====
    function lsAttachEvents() {
        var speakBtn  = document.getElementById('ls-speak-btn');
        var slowBtn   = document.getElementById('ls-speak-slow-btn');
        var submitBtn = document.getElementById('ls-submit-btn');
        var nextBtn   = document.getElementById('ls-next-btn');
        var input     = document.getElementById('ls-input');
        var backBtn   = document.getElementById('ls-back-btn');

        if (speakBtn)  speakBtn.addEventListener('click', function () { lsSpeak(1.0); });
        if (slowBtn)   slowBtn.addEventListener('click', function () { lsSpeak(0.7); });
        if (submitBtn) submitBtn.addEventListener('click', lsSubmit);
        if (nextBtn)   nextBtn.addEventListener('click', lsNext);
        if (input) {
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    if (!lsAnswered) lsSubmit();
                    else lsNext();
                }
            });
        }
        if (backBtn) backBtn.addEventListener('click', function () {
            showScreen(document.getElementById('start-screen'));
        });
    }

    // ===== Public entry =====
    window.initListening = async function () {
        if (!lsInitialized) {
            try {
                await lsLoadData();
            } catch (e) {
                console.error('[Listening] Failed to load data:', e);
                return;
            }
            _originalHTML = document.querySelector('#listening-screen .game-container').innerHTML;
            lsAttachEvents();
            lsInitialized = true;
        }
        lsStart();
        showScreen(lsScreen);
    };

})();
