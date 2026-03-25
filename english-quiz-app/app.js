// ===== Sound Effects (shared across all modules) =====
const SFX = (() => {
    let ctx = null;
    function getCtx() {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }
    function play(freq, type, dur, vol) {
        try {
            const c = getCtx();
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.value = vol || 0.18;
            gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(c.currentTime);
            osc.stop(c.currentTime + dur);
        } catch (e) { /* silent fail */ }
    }
    return {
        correct() {
            play(880, 'sine', 0.15, 0.18);
            setTimeout(() => play(1174, 'sine', 0.2, 0.15), 100);
        },
        wrong() {
            play(300, 'square', 0.15, 0.12);
            setTimeout(() => play(250, 'square', 0.2, 0.1), 100);
        },
        click() {
            play(660, 'sine', 0.08, 0.1);
        }
    };
})();

// ===== Irregular Verbs Lookup (shared) =====
const IrregularVerbs = (() => {
    let data = null;
    let v1Set = null;

    async function load() {
        if (data) return data;
        const res = await fetch('irregular_verbs.json');
        data = await res.json();
        v1Set = new Set(data.map(d => d.v1.toLowerCase()));
        return data;
    }

    function isIrregular(word) {
        if (!v1Set) return false;
        return v1Set.has(word.toLowerCase());
    }

    function search(query) {
        if (!data) return [];
        const q = query.toLowerCase().trim();
        if (!q) return data;
        return data.filter(d =>
            d.v1.toLowerCase().includes(q) ||
            d.v2.toLowerCase().includes(q) ||
            d.v3.toLowerCase().includes(q) ||
            d.vi.toLowerCase().includes(q)
        );
    }

    function init() {
        load().then(() => {
            renderList(data);
            document.getElementById('iv-count').textContent = data.length + ' động từ';
        });

        const fab = document.getElementById('iv-fab');
        const overlay = document.getElementById('iv-overlay');
        const closeBtn = document.getElementById('iv-close-btn');
        const searchInput = document.getElementById('iv-search');

        fab.addEventListener('click', () => {
            overlay.classList.add('active');
            searchInput.value = '';
            searchInput.focus();
            if (data) renderList(data);
        });

        closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });

        searchInput.addEventListener('input', () => {
            const results = search(searchInput.value);
            renderList(results);
            document.getElementById('iv-count').textContent = results.length + ' / ' + (data ? data.length : 0) + ' động từ';
        });
    }

    function renderList(items) {
        const list = document.getElementById('iv-list');
        if (!items || items.length === 0) {
            list.innerHTML = '<div class="iv-empty">Không tìm thấy</div>';
            return;
        }
        list.innerHTML = items.map(d => `
            <div class="iv-row">
                <span class="iv-col-v1">${d.v1}</span>
                <span class="iv-col-v2">${d.v2}</span>
                <span class="iv-col-v3">${d.v3}</span>
                <span class="iv-col-vi">${d.vi}</span>
            </div>
        `).join('');
    }

    // Open modal pre-filled with a specific word
    function lookup(word) {
        const overlay = document.getElementById('iv-overlay');
        const searchInput = document.getElementById('iv-search');
        overlay.classList.add('active');
        searchInput.value = word;
        const results = search(word);
        renderList(results);
        document.getElementById('iv-count').textContent = results.length + ' / ' + (data ? data.length : 0) + ' động từ';
    }

    document.addEventListener('DOMContentLoaded', init);

    return { load, isIrregular, search, lookup };
})();

// ===== State Variables =====
let words = [];
let currentIndex = 0;
let correctAnswer = "";
let correctCount = 0;
let wrongCount = 0;
let shuffledOrder = [];
let isShuffled = true;
let selectedVocabLevel = 'all';
let filteredIndices = []; // word indices matching selected level

// Review state
let reviewQueue = [];
let reviewIdx = 0;
let reviewCorrect = 0;
let reviewWrong = 0;
let reviewHintLevel = 0;
let vocabReviewMode = 'general'; // 'general' | 'wrong' | 'srs'
let phrasesCache = null;

// Per-word tracking
let wordData = {};

// Daily stats
let dailyStats = {};
let sessionStartTime = null;

// SRS intervals in days
const SRS_INTERVALS = [0, 3, 7, 30];

// ===== DOM Elements =====
const startScreen = document.getElementById('start-screen');
const vocabSetupScreen = document.getElementById('vocab-setup-screen');
const quizScreen = document.getElementById('quiz-screen');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const backBtn = document.getElementById('back-btn');
const nextBtn = document.getElementById('next-btn');
const wordText = document.getElementById('word-text');
const wordCard = document.getElementById('word-card');
const feedback = document.getElementById('feedback');
const optionsGrid = document.getElementById('options-grid');
const optionBtns = document.querySelectorAll('#options-grid .option-btn');
const progressBar = document.getElementById('progress-bar');
const wordCounter = document.getElementById('word-counter');
const correctCountEl = document.getElementById('correct-count');
const wrongCountEl = document.getElementById('wrong-count');
const shuffleToggle = document.getElementById('shuffle-toggle');
const darkmodeToggle = document.getElementById('darkmode-toggle');
const startStats = document.getElementById('start-stats');
const statLearned = document.getElementById('stat-learned');
const statRemaining = document.getElementById('stat-remaining');
const statAccuracy = document.getElementById('stat-accuracy');
const wordPhonetic = document.getElementById('word-phonetic');
const wordInfo = document.getElementById('word-info');
const speakBtn = document.getElementById('speak-btn');

// ===== Shared: Show Screen =====
// Quiz/practice screens where bottom nav should be hidden
const quizScreenIds = ['quiz-screen', 'vocab-review-screen', 'tenses-practice-screen', 'phrases-practice-screen', 'story-play-screen', 'auction-play-screen'];

function showScreen(screen, direction) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active', 'enter-right', 'enter-left');
    });
    screen.classList.add('active');

    // Directional transition
    if (direction === 'back') {
        screen.classList.add('enter-left');
    } else if (direction === 'forward') {
        screen.classList.add('enter-right');
    }
    // else: default fade (no direction class = uses screenEnter animation)

    // Sync sidebar active state
    const screenId = screen.id || '';
    let mod = 'home';
    if (screenId.startsWith('tenses')) mod = 'tenses';
    else if (screenId.startsWith('phrases')) mod = 'phrases';
    else if (screenId.startsWith('game') || screenId.startsWith('story') || screenId.startsWith('auction')) mod = 'games';
    else if (screenId === 'stats-screen') mod = 'stats';
    else if (screenId.startsWith('vocab') || screenId === 'quiz-screen') mod = 'vocab';

    document.querySelectorAll('.sidebar-nav-item').forEach(i => {
        i.classList.toggle('active', i.dataset.module === mod);
    });

    // Sync bottom nav active state
    document.querySelectorAll('.bottom-nav-item').forEach(i => {
        i.classList.toggle('active', i.dataset.module === mod);
    });

    // Hide/show bottom nav during quiz screens
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) {
        if (quizScreenIds.includes(screenId)) {
            bottomNav.classList.add('bottom-nav--hidden');
        } else {
            bottomNav.classList.remove('bottom-nav--hidden');
        }
    }
}

// ===== Utility =====
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

function shuffleVocabArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ===== Initialize =====
async function init() {
    try {
        const response = await fetch('words.json');
        words = await response.json();
    } catch (e) {
        console.error('Error loading words:', e);
    }

    loadProgress();
    loadWordData();
    loadDailyStats();
    loadSettings();
    buildFilteredIndices();
    updateHomeStats();

    // Home screen - module selection
    document.getElementById('module-vocab-btn').addEventListener('click', showVocabSetup);
    document.getElementById('module-tenses-btn').addEventListener('click', () => {
        if (typeof initTenses === 'function') initTenses();
    });
    document.getElementById('module-phrases-btn').addEventListener('click', () => {
        if (typeof initPhrases === 'function') initPhrases();
    });
    document.getElementById('module-game-btn').addEventListener('click', () => {
        if (typeof initGame === 'function') initGame();
    });
    document.getElementById('module-stats-btn').addEventListener('click', showStatsScreen);

    // Level filter
    document.querySelectorAll('#vocab-level-filter .level-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#vocab-level-filter .level-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedVocabLevel = btn.dataset.level;
            buildFilteredIndices();
            updateStartStats();
        });
    });

    // Vocab setup screen
    startBtn.addEventListener('click', startQuiz);
    resetBtn.addEventListener('click', resetProgress);
    document.getElementById('vocab-back-btn').addEventListener('click', () => showScreen(startScreen, 'back'));
    shuffleToggle.addEventListener('change', onShuffleChange);

    // Quiz screen
    backBtn.addEventListener('click', goBack);
    nextBtn.addEventListener('click', nextWord);
    optionBtns.forEach(btn => {
        btn.addEventListener('click', () => selectOption(btn));
    });
    speakBtn.addEventListener('click', () => speakWord());

    // Review (shared for general, wrong, srs)
    document.getElementById('review-btn').addEventListener('click', () => startReviewMode('general'));
    document.getElementById('wrong-words-btn').addEventListener('click', () => startReviewMode('wrong'));
    document.getElementById('srs-review-btn').addEventListener('click', () => startReviewMode('srs'));
    document.getElementById('review-back-btn').addEventListener('click', () => showVocabSetup());
    document.getElementById('review-submit-btn').addEventListener('click', submitReviewAnswer);
    document.getElementById('review-typing-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.stopPropagation(); submitReviewAnswer(); }
    });
    document.getElementById('review-hint-btn').addEventListener('click', showReviewHint);
    document.getElementById('review-next-btn').addEventListener('click', nextReviewWord);
    document.getElementById('review-speak-btn').addEventListener('click', () => {
        if (reviewQueue.length > 0 && reviewIdx < reviewQueue.length) {
            speakWord(words[reviewQueue[reviewIdx]].word);
        }
    });
    document.getElementById('review-retry-btn').addEventListener('click', () => startReviewMode(vocabReviewMode));
    document.getElementById('review-back-setup-btn').addEventListener('click', () => showVocabSetup());

    // Stats
    document.getElementById('stats-back-btn').addEventListener('click', () => {
        updateHomeStats();
        showScreen(startScreen, 'back');
    });

    // Settings
    darkmodeToggle.addEventListener('change', onDarkmodeChange);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Speech Recognition
    initSpeechRecognition();

    // ===== Desktop Sidebar =====
    initSidebar();

    // ===== Mobile Bottom Nav =====
    initBottomNav();

    // ===== Gamification =====
    updateGamificationBar();
}

function initSidebar() {
    const sidebarDarkToggle = document.getElementById('sidebar-darkmode-toggle');
    if (sidebarDarkToggle) {
        // Sync with main toggle
        sidebarDarkToggle.checked = darkmodeToggle.checked;
        sidebarDarkToggle.addEventListener('change', () => {
            darkmodeToggle.checked = sidebarDarkToggle.checked;
            onDarkmodeChange();
        });
    }

    // Sidebar nav items
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const mod = item.dataset.module;
            document.querySelectorAll('.sidebar-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            if (mod === 'home') showScreen(startScreen);
            else if (mod === 'vocab') showVocabSetup();
            else if (mod === 'tenses' && typeof initTenses === 'function') initTenses();
            else if (mod === 'phrases' && typeof initPhrases === 'function') initPhrases();
            else if (mod === 'games' && typeof initGame === 'function') initGame();
            else if (mod === 'stats') showStatsScreen();
        });
    });

    updateSidebarStreak();
}

function updateSidebarStreak() {
    const el = document.getElementById('sidebar-streak-count');
    if (el) {
        const streak = calculateStreak();
        el.textContent = streak;
    }
}

// ===== Mobile Bottom Tab Navigation =====
function initBottomNav() {
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const mod = item.dataset.module;
            document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            if (mod === 'home') showScreen(startScreen);
            else if (mod === 'vocab') showVocabSetup();
            else if (mod === 'tenses' && typeof initTenses === 'function') initTenses();
            else if (mod === 'phrases' && typeof initPhrases === 'function') initPhrases();
            else if (mod === 'games' && typeof initGame === 'function') initGame();
        });
    });
}

// ===== XP & Gamification System =====
let totalXP = parseInt(localStorage.getItem('elXP') || '0');
let userLevel = Math.floor(totalXP / 100) + 1;

function addXP(amount) {
    totalXP += amount;
    userLevel = Math.floor(totalXP / 100) + 1;
    localStorage.setItem('elXP', totalXP);
    updateGamificationBar();
}

function updateGamificationBar() {
    const levelEl = document.getElementById('user-level');
    const xpBarEl = document.getElementById('xp-bar');
    const xpTextEl = document.getElementById('xp-text');
    const streakEl = document.getElementById('home-streak-count');

    if (levelEl) levelEl.textContent = userLevel;
    if (xpBarEl) {
        const xpInLevel = totalXP % 100;
        xpBarEl.style.width = xpInLevel + '%';
    }
    if (xpTextEl) {
        const xpInLevel = totalXP % 100;
        xpTextEl.textContent = xpInLevel + '/100 XP';
    }
    if (streakEl) {
        streakEl.textContent = calculateStreak();
    }
}

function showXPFloat(x, y, amount) {
    const el = document.createElement('div');
    el.className = 'xp-float';
    el.textContent = '+' + amount + ' XP';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

// ===== Confetti =====
function launchConfetti(x, y, count) {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    const colors = ['#6C5CE7', '#FD79A8', '#FDCB6E', '#00B894', '#A29BFE', '#E17055', '#55EFC4'];
    count = count || 20;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-particle';
        p.style.left = (x || window.innerWidth / 2) + 'px';
        p.style.top = (y || window.innerHeight / 2) + 'px';
        p.style.background = colors[i % colors.length];
        p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        p.style.width = (5 + Math.random() * 6) + 'px';
        p.style.height = p.style.width;
        const angle = (Math.random() * 360) * Math.PI / 180;
        const dist = 60 + Math.random() * 120;
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist - 80 - Math.random() * 60;
        p.style.setProperty('--tx', tx + 'px');
        p.style.setProperty('--ty', ty + 'px');
        p.style.animationDelay = (Math.random() * 100) + 'ms';
        container.appendChild(p);
        requestAnimationFrame(() => p.classList.add('animate'));
        setTimeout(() => p.remove(), 1200);
    }
}

// ===== Home Stats =====
function updateHomeStats() {
    if (words.length > 0) {
        const vocabStat = document.getElementById('vocab-stat');
        const vocabBar = document.getElementById('vocab-progress-bar');
        if (vocabStat) vocabStat.textContent = `${currentIndex} / ${words.length} từ`;
        if (vocabBar) vocabBar.style.width = `${(currentIndex / words.length) * 100}%`;
    }
    if (typeof updatePhrasesHomeStat === 'function') updatePhrasesHomeStat();

    // Stats home summary
    const statsEl = document.getElementById('stats-home-summary');
    if (statsEl) {
        const streak = calculateStreak();
        const dueCount = getDueWords().length;
        let text = `Chuỗi: ${streak} ngày`;
        if (dueCount > 0) text += ` · ${dueCount} từ cần ôn`;
        statsEl.textContent = text;
    }

    updateGamificationBar();
}

// ===== Level Filter =====
function buildFilteredIndices() {
    if (selectedVocabLevel === 'all') {
        filteredIndices = words.map((_, i) => i);
    } else {
        filteredIndices = [];
        for (let i = 0; i < words.length; i++) {
            if (words[i].level === selectedVocabLevel) filteredIndices.push(i);
        }
    }
}

function getLevelProgress() {
    // Count how many filtered words have been answered correctly at least once
    let learned = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    for (const idx of filteredIndices) {
        const wd = wordData[idx];
        if (wd && wd.correctCount > 0) {
            learned++;
            totalCorrect += wd.correctCount;
            totalWrong += wd.wrongCount;
        }
    }
    return { learned, remaining: filteredIndices.length - learned, totalCorrect, totalWrong };
}

// ===== Vocab Setup Screen =====
function showVocabSetup() {
    updateStartStats();
    showScreen(vocabSetupScreen);
}

function updateStartStats() {
    if (words.length === 0) return;

    const lp = getLevelProgress();
    statLearned.textContent = lp.learned;
    statRemaining.textContent = lp.remaining;
    const total = lp.totalCorrect + lp.totalWrong;
    statAccuracy.textContent = total > 0 ? Math.round((lp.totalCorrect / total) * 100) + '%' : '0%';

    // Review button
    const reviewBtn = document.getElementById('review-btn');
    if (reviewBtn) reviewBtn.disabled = lp.learned === 0;

    // Wrong words button
    const wrongWords = getWrongWords();
    const wrongBtn = document.getElementById('wrong-words-btn');
    const wrongCount = document.getElementById('wrong-words-count');
    if (wrongBtn) {
        wrongBtn.style.display = '';
        wrongBtn.disabled = wrongWords.length === 0;
        if (wrongCount) wrongCount.textContent = wrongWords.length;
    }

    // SRS button
    const dueWords = getDueWords();
    const srsBtn = document.getElementById('srs-review-btn');
    const srsCount = document.getElementById('srs-due-count');
    if (srsBtn) {
        srsBtn.style.display = '';
        srsBtn.disabled = dueWords.length === 0;
        if (srsCount) srsCount.textContent = dueWords.length;
    }
}

// ===== Keyboard Support =====
function handleKeyboard(e) {
    if (quizScreen.classList.contains('active')) {
        if (e.key >= '1' && e.key <= '4') {
            const idx = parseInt(e.key) - 1;
            if (!optionBtns[idx].disabled) {
                selectOption(optionBtns[idx]);
            }
        }
        if (e.key === 'Enter' || e.key === ' ') {
            if (!nextBtn.disabled) {
                e.preventDefault();
                nextWord();
            }
        }
    }
    // Review screen
    const reviewScreen = document.getElementById('vocab-review-screen');
    if (reviewScreen && reviewScreen.classList.contains('active')) {
        const reviewInput = document.getElementById('review-typing-input');
        if (e.key === 'Enter' || e.key === ' ') {
            if (reviewInput && reviewInput.disabled) {
                const rnextBtn = document.getElementById('review-next-btn');
                if (rnextBtn && !rnextBtn.disabled) { e.preventDefault(); nextReviewWord(); }
            }
        }
    }
}

// ===== Settings =====
function loadSettings() {
    const dark = localStorage.getItem('eq_darkmode');
    if (dark === 'true') {
        document.body.classList.add('dark');
        darkmodeToggle.checked = true;
        const sdt = document.getElementById('sidebar-darkmode-toggle');
        if (sdt) sdt.checked = true;
    }

    const shuffle = localStorage.getItem('eq_shuffle');
    if (shuffle !== null) {
        isShuffled = shuffle === 'true';
        shuffleToggle.checked = isShuffled;
    }
}

function onShuffleChange() {
    isShuffled = shuffleToggle.checked;
    localStorage.setItem('eq_shuffle', isShuffled);
}

function onDarkmodeChange() {
    document.body.classList.toggle('dark', darkmodeToggle.checked);
    localStorage.setItem('eq_darkmode', darkmodeToggle.checked);
    // Sync sidebar toggle
    const sdt = document.getElementById('sidebar-darkmode-toggle');
    if (sdt) sdt.checked = darkmodeToggle.checked;
}

// ===== Progress (localStorage) =====
function loadProgress() {
    const saved = localStorage.getItem('eq_progress');
    if (saved) {
        const data = JSON.parse(saved);
        currentIndex = data.currentIndex || 0;
        correctCount = data.correctCount || 0;
        wrongCount = data.wrongCount || 0;
        shuffledOrder = data.shuffledOrder || [];
    }
}

function saveProgress() {
    localStorage.setItem('eq_progress', JSON.stringify({
        currentIndex,
        correctCount,
        wrongCount,
        shuffledOrder
    }));
}

// ===== Word Data (per-word tracking) =====
function loadWordData() {
    try {
        const saved = localStorage.getItem('eq_word_data');
        if (saved) wordData = JSON.parse(saved);
    } catch (e) {}
}

function saveWordData() {
    localStorage.setItem('eq_word_data', JSON.stringify(wordData));
}

function getWordRecord(idx) {
    if (!wordData[idx]) {
        wordData[idx] = {
            correctCount: 0,
            wrongCount: 0,
            lastAnswerCorrect: null,
            lastAnsweredDate: null,
            srsLevel: 0,
            nextReviewDate: null
        };
    }
    return wordData[idx];
}

function recordWordAnswer(wordIndex, isCorrect) {
    const rec = getWordRecord(wordIndex);
    const today = todayStr();

    if (isCorrect) {
        rec.correctCount++;
        rec.lastAnswerCorrect = true;
    } else {
        rec.wrongCount++;
        rec.lastAnswerCorrect = false;
    }
    rec.lastAnsweredDate = today;

    // Initialize SRS on first correct answer
    if (isCorrect && rec.srsLevel === 0 && rec.correctCount === 1) {
        rec.srsLevel = 1;
        rec.nextReviewDate = addDays(today, SRS_INTERVALS[1]);
    }

    saveWordData();
    recordDailyActivity(isCorrect);
}

function updateSRS(wordIndex, isCorrect) {
    const rec = getWordRecord(wordIndex);
    const today = todayStr();

    if (isCorrect) {
        if (rec.srsLevel < SRS_INTERVALS.length) {
            rec.srsLevel++;
        }
        if (rec.srsLevel < SRS_INTERVALS.length) {
            rec.nextReviewDate = addDays(today, SRS_INTERVALS[rec.srsLevel]);
        } else {
            // Mastered
            rec.nextReviewDate = null;
        }
    } else {
        // Reset to level 1 (review in 3 days)
        rec.srsLevel = 1;
        rec.nextReviewDate = addDays(today, SRS_INTERVALS[1]);
    }

    saveWordData();
}

function addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

// ===== Wrong Words =====
function getWrongWords() {
    const result = [];
    for (const idx of filteredIndices) {
        const rec = wordData[idx];
        // Word is "wrong" if it has more wrong answers than correct, or wrong >= 2
        if (rec && rec.wrongCount > 0 && rec.wrongCount >= rec.correctCount) {
            result.push(idx);
        }
    }
    return result;
}

// ===== SRS Due Words =====
function getDueWords() {
    const today = todayStr();
    const result = [];
    for (let i = 0; i < words.length; i++) {
        const rec = wordData[i];
        if (rec && rec.nextReviewDate && rec.nextReviewDate <= today && rec.srsLevel < SRS_INTERVALS.length) {
            result.push(i);
        }
    }
    return result;
}

// ===== Daily Stats =====
function loadDailyStats() {
    try {
        const saved = localStorage.getItem('eq_daily_stats');
        if (saved) dailyStats = JSON.parse(saved);
    } catch (e) {}
}

function saveDailyStats() {
    // Prune entries older than 90 days
    const cutoff = addDays(todayStr(), -90);
    for (const date in dailyStats) {
        if (date < cutoff) delete dailyStats[date];
    }
    localStorage.setItem('eq_daily_stats', JSON.stringify(dailyStats));
}

function getTodayStats() {
    const today = todayStr();
    if (!dailyStats[today]) {
        dailyStats[today] = { wordsLearned: 0, wordsReviewed: 0, correct: 0, wrong: 0, timeSpentMs: 0 };
    }
    return dailyStats[today];
}

function recordDailyActivity(isCorrect) {
    const ts = getTodayStats();
    ts.wordsLearned++;
    if (isCorrect) ts.correct++;
    else ts.wrong++;
    saveDailyStats();
}

function recordSessionTime() {
    if (!sessionStartTime) return;
    const elapsed = Date.now() - sessionStartTime;
    const ts = getTodayStats();
    ts.timeSpentMs += elapsed;
    saveDailyStats();
    sessionStartTime = null;
}

function calculateStreak() {
    let streak = 0;
    let d = new Date();
    // Check today first
    const today = todayStr();
    if (!dailyStats[today]) {
        // Check yesterday
        d.setDate(d.getDate() - 1);
    }
    while (true) {
        const dateStr = d.toISOString().slice(0, 10);
        if (dailyStats[dateStr] && dailyStats[dateStr].wordsLearned > 0) {
            streak++;
            d.setDate(d.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

function resetProgress() {
    if (!confirm('Bạn có chắc muốn đặt lại toàn bộ tiến trình?')) return;
    localStorage.removeItem('eq_progress');
    localStorage.removeItem('eq_word_data');
    currentIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    shuffledOrder = [];
    wordData = {};
    updateStartStats();
    updateHomeStats();
}

// ===== Quiz Navigation =====
function startQuiz() {
    if (filteredIndices.length === 0) return;
    sessionStartTime = Date.now();

    if (isShuffled) {
        shuffledOrder = shuffleVocabArray([...filteredIndices]);
    } else {
        shuffledOrder = [...filteredIndices];
    }

    currentIndex = 0;
    // Find first unlearned word in this set
    for (let i = 0; i < shuffledOrder.length; i++) {
        const rec = wordData[shuffledOrder[i]];
        if (!rec || rec.correctCount === 0) {
            currentIndex = i;
            break;
        }
    }

    saveProgress();
    showScreen(quizScreen);
    showWord();
}

function goBack() {
    recordSessionTime();
    saveProgress();
    updateHomeStats();
    showVocabSetup();
}

// ===== Quiz Logic =====
function showWord() {
    if (currentIndex >= shuffledOrder.length) {
        currentIndex = 0;
        if (isShuffled) shuffledOrder = shuffleVocabArray([...filteredIndices]);
    }

    const realIndex = shuffledOrder[currentIndex];
    const currentWord = words[realIndex];

    wordText.textContent = currentWord.word;
    correctAnswer = currentWord.meaning;

    wordPhonetic.textContent = currentWord.phonetic || '—';
    wordInfo.textContent = [currentWord.type, currentWord.level].filter(Boolean).join(' · ');

    // Irregular verb indicator
    const ivBadge = document.getElementById('iv-badge');
    if (ivBadge) {
        if (currentWord.type && currentWord.type.toLowerCase().includes('verb') && IrregularVerbs.isIrregular(currentWord.word)) {
            ivBadge.style.display = 'inline-flex';
            ivBadge.onclick = () => IrregularVerbs.lookup(currentWord.word);
        } else {
            ivBadge.style.display = 'none';
        }
    }

    speakWord(currentWord.word);

    const options = generateOptions(realIndex);
    optionBtns.forEach((btn, i) => {
        btn.textContent = options[i];
        btn.className = 'option-btn';
        btn.disabled = false;
    });

    feedback.textContent = '';
    feedback.className = 'feedback';
    nextBtn.disabled = true;
    wordCard.className = 'word-card';

    // Reset per-word tracking
    currentWordHadWrong = false;

    // Hide speech result
    const sr = document.getElementById('speech-result');
    if (sr) sr.style.display = 'none';

    const displayIndex = currentIndex + 1;
    wordCounter.textContent = `${displayIndex} / ${shuffledOrder.length}`;
    progressBar.style.width = `${(displayIndex / shuffledOrder.length) * 100}%`;
    correctCountEl.textContent = correctCount;
    wrongCountEl.textContent = wrongCount;
}

function generateOptions(correctIndex) {
    const correct = words[correctIndex].meaning;
    const options = [correct];
    const usedIndices = new Set([correctIndex]);

    while (options.length < 4) {
        const randIdx = Math.floor(Math.random() * words.length);
        if (!usedIndices.has(randIdx) && !options.includes(words[randIdx].meaning)) {
            usedIndices.add(randIdx);
            options.push(words[randIdx].meaning);
        }
    }

    return shuffleVocabArray(options);
}

let currentWordHadWrong = false;

function selectOption(btn) {
    if (btn.disabled) return;

    const selected = btn.textContent;
    const realIndex = shuffledOrder[currentIndex];

    if (selected === correctAnswer) {
        btn.classList.add('correct');
        wordCard.classList.add('correct-highlight');
        SFX.correct();
        feedback.textContent = 'Chính xác!';
        feedback.className = 'feedback correct-feedback';
        // Confetti burst + XP on correct
        const rect = wordCard.getBoundingClientRect();
        launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 16);
        addXP(10);
        showXPFloat(rect.left + rect.width / 2, rect.top, 10);
        nextBtn.disabled = false;
        correctCount++;
        optionBtns.forEach(b => b.disabled = true);
        correctCountEl.textContent = correctCount;
        // Record once: if had wrong attempts, record as wrong; else correct
        if (currentWordHadWrong) {
            recordWordAnswer(realIndex, false);
        } else {
            recordWordAnswer(realIndex, true);
        }
        saveProgress();
    } else {
        btn.classList.add('wrong');
        wordCard.classList.add('wrong-highlight');
        SFX.wrong();
        feedback.textContent = 'Sai rồi, chọn lại!';
        feedback.className = 'feedback wrong-feedback';
        wrongCount++;
        wrongCountEl.textContent = wrongCount;
        btn.disabled = true;
        setTimeout(() => wordCard.classList.remove('wrong-highlight'), 400);
        currentWordHadWrong = true;
        saveProgress();
    }
}

function nextWord() {
    currentIndex++;
    saveProgress();
    showWord();
}

// ===== Text-to-Speech =====
let cachedVoice = null;
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
let speakDelayTimer = null;

function getBestEnglishVoice() {
    if (cachedVoice) return cachedVoice;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    const priorities = [
        v => v.lang === 'en-US' && v.name.includes('Google US English'),
        v => v.lang === 'en-US' && v.name.includes('Google'),
        v => v.lang === 'en-US' && /enhanced|premium/i.test(v.name),
        v => v.lang === 'en-US' && v.name.includes('Samantha'),
        v => v.lang === 'en-GB' && /enhanced|premium/i.test(v.name),
        v => v.lang === 'en-GB' && v.name.includes('Daniel'),
        v => v.lang === 'en-US' && !v.localService,
        v => v.lang === 'en-US' && v.localService,
        v => v.lang === 'en-US',
        v => v.lang === 'en-GB',
        v => v.lang.startsWith('en'),
    ];

    for (const test of priorities) {
        const found = voices.find(test);
        if (found) {
            cachedVoice = found;
            return found;
        }
    }
    return null;
}

if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
        cachedVoice = null;
        getBestEnglishVoice();
    };
}

function speakWord(text) {
    const word = text || wordText.textContent;
    if (!word || word === 'Loading...') return;

    if (speakDelayTimer) {
        clearTimeout(speakDelayTimer);
        speakDelayTimer = null;
    }

    window.speechSynthesis.cancel();

    const doSpeak = () => {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = isMobile ? 0.85 : 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        const voice = getBestEnglishVoice();
        if (voice) utterance.voice = voice;

        const activeBtn = document.querySelector('.screen.active .speak-btn') || speakBtn;
        activeBtn.classList.add('speaking');
        utterance.onend = () => activeBtn.classList.remove('speaking');
        utterance.onerror = () => activeBtn.classList.remove('speaking');

        window.speechSynthesis.speak(utterance);
    };

    if (isMobile) {
        speakDelayTimer = setTimeout(() => {
            speakDelayTimer = null;
            doSpeak();
        }, 80);
    } else {
        doSpeak();
    }
}

// ===== Speech Recognition =====
let recognition = null;
let isListening = false;
let recognitionTimeout = null;

function initSpeechRecognition() {
    const micBtn = document.getElementById('mic-btn');
    if (!micBtn) return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
        micBtn.style.display = '';
        micBtn.disabled = true;
        micBtn.title = 'Trình duyệt không hỗ trợ nhận diện giọng nói';
        micBtn.style.opacity = '0.4';
        return;
    }

    // Show mic button
    micBtn.style.display = '';
    micBtn.addEventListener('click', toggleListening);
}

function createRecognition() {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const rec = new SpeechRecognitionAPI();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 3;

    rec.onresult = (event) => {
        stopListening();

        const currentWord = wordText.textContent.toLowerCase().trim();
        let bestMatch = 'wrong';
        let heardText = '';

        for (let i = 0; i < event.results[0].length; i++) {
            const transcript = event.results[0][i].transcript.toLowerCase().trim();
            if (!heardText) heardText = transcript;
            const match = comparePronunciation(transcript, currentWord);
            if (match === 'correct') { bestMatch = 'correct'; heardText = transcript; break; }
            if (match === 'close' && bestMatch !== 'correct') { bestMatch = 'close'; heardText = transcript; }
        }

        showSpeechResult(heardText, bestMatch);
    };

    rec.onerror = (event) => {
        stopListening();
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
            showSpeechResult('Không nghe rõ, thử lại', 'wrong');
        }
    };

    rec.onend = () => {
        stopListening();
    };

    return rec;
}

function stopListening() {
    if (recognitionTimeout) {
        clearTimeout(recognitionTimeout);
        recognitionTimeout = null;
    }
    isListening = false;
    updateMicUI(false);
    // Destroy old instance to prevent stale state
    if (recognition) {
        try { recognition.abort(); } catch (e) {}
        recognition = null;
    }
}

function toggleListening() {
    if (isListening) {
        stopListening();
        return;
    }

    // Create fresh instance each time to avoid frozen state
    stopListening();
    recognition = createRecognition();
    if (!recognition) return;

    try {
        recognition.start();
        isListening = true;
        updateMicUI(true);

        // Auto-stop after 6 seconds to prevent hanging
        recognitionTimeout = setTimeout(() => {
            if (isListening) {
                stopListening();
                showSpeechResult('Hết thời gian, thử lại', 'wrong');
            }
        }, 6000);
    } catch (e) {
        stopListening();
        showSpeechResult('Lỗi micro, thử lại', 'wrong');
    }
}

function updateMicUI(listening) {
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) micBtn.classList.toggle('listening', listening);
}

function comparePronunciation(transcript, target) {
    const t = transcript.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const w = target.toLowerCase().replace(/[^a-z\s]/g, '').trim();

    if (t === w) return 'correct';

    // Allow small differences
    if (typeof window.levenshteinDistance === 'function') {
        const dist = window.levenshteinDistance(t, w);
        if (dist <= 1) return 'correct';
        if (dist <= 2) return 'close';
    }

    // Check if transcript contains the word
    if (t.includes(w) || w.includes(t)) return 'close';

    return 'wrong';
}

function showSpeechResult(text, result) {
    const sr = document.getElementById('speech-result');
    const st = document.getElementById('speech-text');
    if (!sr || !st) return;

    sr.style.display = '';
    if (result === 'correct') {
        st.textContent = `"${text}" — Phát âm chuẩn!`;
        sr.className = 'speech-result correct';
    } else if (result === 'close') {
        st.textContent = `"${text}" — Gần đúng!`;
        sr.className = 'speech-result close';
    } else {
        st.textContent = `"${text}" — Thử lại!`;
        sr.className = 'speech-result wrong';
    }
}

// ===== Vocab Review (General / Wrong / SRS) =====
async function startReviewMode(mode) {
    vocabReviewMode = mode;
    let pool = [];

    if (mode === 'wrong') {
        pool = getWrongWords();
    } else if (mode === 'srs') {
        pool = getDueWords();
    } else {
        // General review: all learned words in current level filter
        for (const idx of filteredIndices) {
            const rec = wordData[idx];
            if (rec && rec.correctCount > 0) pool.push(idx);
        }
    }

    if (pool.length === 0 || words.length === 0) return;

    // Load phrases.json for context hints (cache)
    if (!phrasesCache) {
        try {
            const res = await fetch('phrases.json');
            phrasesCache = await res.json();
        } catch (e) { /* hints won't work but review still works */ }
    }

    shuffleVocabArray(pool);
    reviewQueue = pool.slice(0, 20);
    reviewIdx = 0;
    reviewCorrect = 0;
    reviewWrong = 0;
    sessionStartTime = Date.now();

    document.getElementById('review-quiz-section').style.display = '';
    document.getElementById('review-result-section').style.display = 'none';

    showScreen(document.getElementById('vocab-review-screen'));
    showReviewWord();
}

function showReviewWord() {
    if (reviewIdx >= reviewQueue.length) {
        showReviewResults();
        return;
    }

    const word = words[reviewQueue[reviewIdx]];

    document.getElementById('review-counter').textContent = `${reviewIdx + 1} / ${reviewQueue.length}`;
    document.getElementById('review-progress-bar').style.width = `${((reviewIdx + 1) / reviewQueue.length) * 100}%`;
    document.getElementById('review-correct').textContent = reviewCorrect;
    document.getElementById('review-wrong').textContent = reviewWrong;

    document.getElementById('review-word-text').textContent = word.word;
    document.getElementById('review-word-phonetic').textContent = word.phonetic || '—';
    document.getElementById('review-word-info').textContent = [word.type, word.level].filter(Boolean).join(' · ');

    speakWord(word.word);

    const input = document.getElementById('review-typing-input');
    input.value = '';
    input.className = 'typing-input';
    input.disabled = false;
    document.getElementById('review-submit-btn').disabled = false;
    setTimeout(() => input.focus(), 100);

    reviewHintLevel = 0;
    document.getElementById('review-hint-text').textContent = '';
    document.getElementById('review-hint-btn').disabled = false;

    document.getElementById('review-feedback').textContent = '';
    document.getElementById('review-feedback').className = 'feedback';
    document.getElementById('review-correct-answer').style.display = 'none';
    document.getElementById('review-next-btn').disabled = true;
}

async function submitReviewAnswer() {
    const input = document.getElementById('review-typing-input');
    if (input.disabled) return;
    const userText = input.value.trim();
    if (!userText) return;

    const wordIndex = reviewQueue[reviewIdx];
    const word = words[wordIndex];
    const correct = word.meaning;
    const original = word.word; // English word (câu gốc)

    input.disabled = true;
    document.getElementById('review-submit-btn').disabled = true;

    const fb = document.getElementById('review-feedback');
    const ca = document.getElementById('review-correct-answer');
    let isCorrect = false;

    // Tầng 1: Local matching
    let result = window.AnswerMatch.checkAnswer(userText, correct, { mode: 'vocab' });

    // Tầng 2: API translation nếu tầng 1 sai
    if (result === 'wrong') {
        fb.textContent = 'Đang kiểm tra...';
        fb.className = 'feedback checking';
        ca.style.display = 'none';
        const asyncResult = await window.AnswerMatch.checkAnswerAsync(userText, correct, original, { mode: 'vocab' });
        result = asyncResult.result;
    }

    if (result === 'correct') {
        input.classList.add('correct');
        SFX.correct();
        reviewCorrect++;
        fb.textContent = 'Chính xác!';
        fb.className = 'feedback correct';
        ca.style.display = 'none';
        isCorrect = true;
    } else if (result === 'close') {
        input.classList.add('close');
        SFX.correct();
        reviewCorrect++;
        fb.textContent = 'Gần đúng!';
        fb.className = 'feedback close';
        ca.innerHTML = `Đáp án: <strong>${correct}</strong>`;
        ca.style.display = '';
        isCorrect = true;
    } else {
        input.classList.add('wrong');
        SFX.wrong();
        reviewWrong++;
        fb.textContent = 'Sai rồi!';
        fb.className = 'feedback wrong';
        ca.innerHTML = `Đáp án: <strong>${correct}</strong>`;
        ca.style.display = '';
    }

    // Update word tracking
    recordWordAnswer(wordIndex, isCorrect);

    // Update SRS if in SRS/wrong mode
    if (vocabReviewMode === 'srs' || vocabReviewMode === 'wrong') {
        updateSRS(wordIndex, isCorrect);
    }

    document.getElementById('review-correct').textContent = reviewCorrect;
    document.getElementById('review-wrong').textContent = reviewWrong;
    document.getElementById('review-next-btn').disabled = false;
}

function getContextHint(wordObj) {
    if (!phrasesCache || !phrasesCache.phrases) return null;

    const w = wordObj.word.toLowerCase();
    const regex = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    const matches = phrasesCache.phrases.filter(p => regex.test(p.en));

    if (matches.length === 0) return null;

    matches.sort((a, b) => a.en.length - b.en.length);
    const phrase = matches[0];

    let hintVi = phrase.vi;
    const meanings = wordObj.meaning.split(/[,;]/).map(m => m.trim()).filter(Boolean);

    for (const meaning of meanings) {
        if (meaning.length < 2) continue;
        const escaped = meaning.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const mRegex = new RegExp(escaped, 'gi');
        if (mRegex.test(hintVi)) {
            hintVi = hintVi.replace(mRegex, '___');
            break;
        }
    }

    return hintVi;
}

function getLetterHint(meaning) {
    return meaning.split(' ').map(w => {
        if (w.length <= 1) return w;
        return w[0] + '_'.repeat(w.length - 1);
    }).join(' ');
}

function showReviewHint() {
    const word = words[reviewQueue[reviewIdx]];

    if (reviewHintLevel === 0) {
        const contextHint = getContextHint(word);
        if (contextHint) {
            document.getElementById('review-hint-text').textContent = contextHint;
        } else {
            const wc = word.meaning.split(' ').length;
            const type = word.type || '';
            document.getElementById('review-hint-text').textContent = (type ? type + ', ' : '') + wc + ' từ';
        }
    } else if (reviewHintLevel === 1) {
        document.getElementById('review-hint-text').textContent = getLetterHint(word.meaning);
    } else {
        document.getElementById('review-hint-text').textContent = word.meaning;
        document.getElementById('review-hint-btn').disabled = true;
    }

    reviewHintLevel++;
}

function showReviewResults() {
    recordSessionTime();

    const total = reviewCorrect + reviewWrong;
    const accuracy = total > 0 ? Math.round((reviewCorrect / total) * 100) : 0;

    document.getElementById('review-result-correct').textContent = reviewCorrect;
    document.getElementById('review-result-wrong').textContent = reviewWrong;
    document.getElementById('review-result-accuracy').textContent = accuracy + '%';

    const icon = document.getElementById('review-result-icon');
    const title = document.getElementById('review-result-title');

    if (accuracy >= 90) {
        icon.textContent = '🎉';
        title.textContent = 'Xuất sắc!';
    } else if (accuracy >= 70) {
        icon.textContent = '💪';
        title.textContent = 'Tốt lắm!';
    } else {
        icon.textContent = '📖';
        title.textContent = 'Cần ôn thêm!';
    }

    document.getElementById('review-quiz-section').style.display = 'none';
    document.getElementById('review-result-section').style.display = '';
}

function nextReviewWord() {
    reviewIdx++;
    showReviewWord();
}

// ===== Stats Dashboard =====
function showStatsScreen() {
    renderStatsSummary();
    renderDailyChart();
    renderSRSProgress();
    renderMissedWords();
    showScreen(document.getElementById('stats-screen'));
}

function renderStatsSummary() {
    const container = document.getElementById('stats-summary');
    const streak = calculateStreak();
    const dueCount = getDueWords().length;

    // Total words learned
    let totalLearned = 0;
    let totalMastered = 0;
    for (let i = 0; i < words.length; i++) {
        const rec = wordData[i];
        if (rec && rec.correctCount > 0) totalLearned++;
        if (rec && rec.srsLevel >= SRS_INTERVALS.length) totalMastered++;
    }

    // Total time
    let totalTimeMs = 0;
    for (const date in dailyStats) {
        totalTimeMs += dailyStats[date].timeSpentMs || 0;
    }
    const totalMinutes = Math.round(totalTimeMs / 60000);

    container.innerHTML = `
        <div class="stats-card">
            <div class="stats-card-number">${streak}</div>
            <div class="stats-card-label">Chuỗi ngày</div>
        </div>
        <div class="stats-card">
            <div class="stats-card-number">${totalLearned}</div>
            <div class="stats-card-label">Từ đã học</div>
        </div>
        <div class="stats-card">
            <div class="stats-card-number">${dueCount}</div>
            <div class="stats-card-label">Cần ôn</div>
        </div>
        <div class="stats-card">
            <div class="stats-card-number">${totalMinutes > 0 ? totalMinutes + 'p' : '0p'}</div>
            <div class="stats-card-label">Thời gian</div>
        </div>
    `;
}

function renderDailyChart() {
    const container = document.getElementById('stats-chart');
    const days = 14;
    const data = [];
    let maxVal = 1;

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const ds = dailyStats[dateStr];
        const count = ds ? ds.wordsLearned : 0;
        if (count > maxVal) maxVal = count;
        data.push({
            date: dateStr,
            day: d.toLocaleDateString('vi-VN', { weekday: 'short' }).slice(0, 2),
            count
        });
    }

    container.innerHTML = data.map(d => `
        <div class="chart-bar-wrap">
            <div class="chart-bar" style="height: ${Math.max((d.count / maxVal) * 100, d.count > 0 ? 8 : 2)}%">
                ${d.count > 0 ? `<span class="chart-bar-val">${d.count}</span>` : ''}
            </div>
            <div class="chart-bar-label">${d.day}</div>
        </div>
    `).join('');
}

function renderSRSProgress() {
    const container = document.getElementById('stats-srs');
    const counts = { new: 0, learning: 0, reviewing: 0, mastering: 0, mastered: 0 };

    for (let i = 0; i < words.length; i++) {
        const rec = wordData[i];
        if (!rec || rec.correctCount === 0) { counts.new++; continue; }
        if (rec.srsLevel >= SRS_INTERVALS.length) { counts.mastered++; continue; }
        if (rec.srsLevel === 1) { counts.learning++; continue; }
        if (rec.srsLevel === 2) { counts.reviewing++; continue; }
        if (rec.srsLevel === 3) { counts.mastering++; continue; }
        counts.learning++;
    }

    const total = words.length || 1;
    const items = [
        { label: 'Chưa học', count: counts.new, color: '#94a3b8' },
        { label: '3 ngày', count: counts.learning, color: '#f59e0b' },
        { label: '7 ngày', count: counts.reviewing, color: '#3b82f6' },
        { label: '30 ngày', count: counts.mastering, color: '#8b5cf6' },
        { label: 'Đã thuộc', count: counts.mastered, color: '#10b981' },
    ];

    container.innerHTML = `
        <div class="srs-bar">
            ${items.filter(it => it.count > 0).map(it =>
                `<div class="srs-bar-segment" style="width:${(it.count / total) * 100}%;background:${it.color}" title="${it.label}: ${it.count}"></div>`
            ).join('')}
        </div>
        <div class="srs-legend">
            ${items.map(it =>
                `<span class="srs-legend-item"><span class="srs-dot" style="background:${it.color}"></span>${it.label}: ${it.count}</span>`
            ).join('')}
        </div>
    `;
}

function renderMissedWords() {
    const container = document.getElementById('stats-missed');
    const missed = [];

    for (let i = 0; i < words.length; i++) {
        const rec = wordData[i];
        if (rec && rec.wrongCount > 0) {
            missed.push({ index: i, wrongCount: rec.wrongCount, correctCount: rec.correctCount });
        }
    }

    missed.sort((a, b) => b.wrongCount - a.wrongCount);
    const top = missed.slice(0, 10);

    if (top.length === 0) {
        container.innerHTML = '<div class="stats-empty">Chưa có từ nào sai</div>';
        return;
    }

    container.innerHTML = top.map((m, i) => {
        const w = words[m.index];
        return `
            <div class="missed-item">
                <span class="missed-rank">${i + 1}</span>
                <div class="missed-info">
                    <span class="missed-word">${w.word}</span>
                    <span class="missed-meaning">${w.meaning}</span>
                </div>
                <span class="missed-count">${m.wrongCount} sai</span>
            </div>
        `;
    }).join('');
}

// ===== Start App =====
document.addEventListener('DOMContentLoaded', init);
