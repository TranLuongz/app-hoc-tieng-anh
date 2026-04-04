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
const learningLanguageSelect = document.getElementById('learning-language-select');
const learningLanguageSelectMobile = document.getElementById('learning-language-select-mobile');
const homeLogoIconEl = document.getElementById('home-logo-icon');
const homeTitleEl = document.getElementById('home-title');
const homeSubtitleEl = document.getElementById('home-subtitle');

const LEARNING_LANG_KEY = 'eq_learning_lang';
let currentLearningLang = 'en';
let forcedNavModule = null;
let chineseWordsCache = null;
let vocabDataReady = false;
let vocabLoadPromise = null;
let coreAppInitialized = false;
let vocabModuleInitialized = false;

// ===== Shared: Show Screen =====
// Quiz/practice screens where bottom nav should be hidden
const quizScreenIds = ['quiz-screen', 'vocab-review-screen', 'tenses-practice-screen', 'phrases-practice-screen', 'story-play-screen', 'auction-play-screen', 'listening-screen', 'chinese-practice-screen', 'chinese-story-screen', 'chinese-auction-play-screen'];

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
    else if (screenId === 'listening-screen') mod = 'listening';
    else if (screenId === 'stats-screen') mod = 'stats';
    else if (screenId.startsWith('chinese')) mod = forcedNavModule || 'home';
    else if (screenId.startsWith('vocab') || screenId === 'quiz-screen') mod = 'vocab';

    if (!screenId.startsWith('chinese')) forcedNavModule = null;

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

function getLearningLanguage() {
    return currentLearningLang;
}

window.getLearningLanguage = getLearningLanguage;

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

function loadWordsFromSource() {
    if (window.AppDataLoader && typeof window.AppDataLoader.getWords === 'function') {
        return window.AppDataLoader.getWords();
    }
    return fetch('words.json').then(function (response) {
        if (!response.ok) throw new Error('Failed to load words.json (' + response.status + ')');
        return response.json();
    });
}

async function ensureVocabDataLoaded() {
    if (vocabDataReady && words.length > 0) return true;
    if (vocabLoadPromise) return vocabLoadPromise;

    vocabLoadPromise = (async function () {
        try {
            const loadedWords = await loadWordsFromSource();
            words = Array.isArray(loadedWords) ? loadedWords : [];
            vocabDataReady = true;

            shuffledOrder = Array.isArray(shuffledOrder)
                ? shuffledOrder.filter(idx => idx >= 0 && idx < words.length)
                : [];
            if (currentIndex >= shuffledOrder.length) currentIndex = 0;

            buildFilteredIndices();
            updateStartStats();
            updateHomeStats();
            return true;
        } catch (e) {
            console.error('Error loading words:', e);
            return false;
        } finally {
            vocabLoadPromise = null;
        }
    })();

    return vocabLoadPromise;
}

const HOME_UI_COPY = {
    en: {
        logo: '📚',
        title: 'English Learning',
        subtitle: 'Học từ vựng và ngữ pháp tiếng Anh',
        cards: {
            vocab: {
                icon: 'A',
                title: 'Từ vựng 3668 từ thông dụng',
                desc: '3668 từ có IPA, phân loại theo level'
            },
            tenses: {
                icon: 'T',
                title: '12 Thì tiếng Anh',
                desc: 'Lý thuyết, luyện tập, ôn tập'
            },
            phrases: {
                icon: '💬',
                title: 'Câu & Cụm từ',
                desc: '9600+ câu Anh-Việt, A1-B2'
            },
            listening: {
                icon: '🎧',
                title: 'Luyện Nghe',
                desc: 'Nghe và gõ lại câu tiếng Anh'
            },
            games: {
                icon: '🎮',
                title: 'Trò chơi tiếng Anh',
                desc: 'Học qua câu chuyện tương tác'
            }
        }
    },
    zh: {
        logo: '中',
        title: 'Chinese Learning',
        subtitle: 'Học tiếng Trung theo cùng giao diện',
        cards: {
            vocab: {
                icon: '字',
                title: 'Từ vựng tiếng Trung',
                desc: 'Hán tự theo HSK, pinyin và nghĩa Việt'
            },
            tenses: {
                icon: '文',
                title: 'Ngữ pháp tiếng Trung',
                desc: 'Mẫu câu và bài tập chọn đáp án'
            },
            phrases: {
                icon: '句',
                title: 'Câu giao tiếp tiếng Trung',
                desc: 'Luyện dịch Trung-Việt hai chiều'
            },
            listening: {
                icon: '🎧',
                title: 'Luyện nghe tiếng Trung',
                desc: 'Nghe tiếng Trung và trả lời'
            },
            games: {
                icon: '🎮',
                title: 'Trò chơi tiếng Trung',
                desc: 'Story tương tác + Sentence Auction'
            }
        }
    }
};

function loadLearningLanguage() {
    const saved = localStorage.getItem(LEARNING_LANG_KEY);
    currentLearningLang = saved === 'zh' ? 'zh' : 'en';
}

function setLearningLanguage(lang) {
    currentLearningLang = lang === 'zh' ? 'zh' : 'en';
    localStorage.setItem(LEARNING_LANG_KEY, currentLearningLang);
    if (learningLanguageSelect) learningLanguageSelect.value = currentLearningLang;
    if (learningLanguageSelectMobile) learningLanguageSelectMobile.value = currentLearningLang;
    applyHomeLanguageCopy();
    updateIrregularVerbUI();
    setStatsSectionTitlesByLanguage();
    showScreen(startScreen);
    updateHomeStats();
}

function updateIrregularVerbUI() {
    const isZh = currentLearningLang === 'zh';
    const ivFab = document.getElementById('iv-fab');
    const ivBadge = document.getElementById('iv-badge');
    const ivOverlay = document.getElementById('iv-overlay');

    if (ivFab) ivFab.style.display = isZh ? 'none' : '';
    if (ivBadge) ivBadge.style.display = isZh ? 'none' : 'none';
    if (isZh && ivOverlay) ivOverlay.classList.remove('active');
}

function setStatsSectionTitlesByLanguage() {
    const chartTitle = document.getElementById('stats-section-chart-title');
    const srsTitle = document.getElementById('stats-section-srs-title');
    const missedTitle = document.getElementById('stats-section-missed-title');

    if (currentLearningLang === 'zh') {
        if (chartTitle) chartTitle.textContent = 'Lượt luyện theo chế độ';
        if (srsTitle) srsTitle.textContent = 'Tiến trình từ vựng HSK';
        if (missedTitle) missedTitle.textContent = 'Từ vựng hay sai nhất';
    } else {
        if (chartTitle) chartTitle.textContent = 'Từ học mỗi ngày';
        if (srsTitle) srsTitle.textContent = 'Tiến trình SRS';
        if (missedTitle) missedTitle.textContent = 'Từ hay sai nhất';
    }
}

function setupLearningLanguageSelector() {
    const selectors = [learningLanguageSelect, learningLanguageSelectMobile].filter(Boolean);
    if (!selectors.length) return;

    selectors.forEach(function (sel) {
        sel.value = currentLearningLang;
        sel.addEventListener('change', function () {
            setLearningLanguage(sel.value);
        });
    });
}

function applyHomeLanguageCopy() {
    const key = currentLearningLang === 'zh' ? 'zh' : 'en';
    const copy = HOME_UI_COPY[key];
    if (!copy) return;

    if (homeLogoIconEl) homeLogoIconEl.textContent = copy.logo;
    if (homeTitleEl) homeTitleEl.textContent = copy.title;
    if (homeSubtitleEl) homeSubtitleEl.textContent = copy.subtitle;

    const map = [
        ['vocab', 'module-vocab-btn', 'module-vocab-title', 'module-vocab-desc'],
        ['tenses', 'module-tenses-btn', 'module-tenses-title', 'module-tenses-desc'],
        ['phrases', 'module-phrases-btn', 'module-phrases-title', 'module-phrases-desc'],
        ['listening', 'module-listening-btn', 'module-listening-title', 'module-listening-desc'],
        ['games', 'module-game-btn', 'module-game-title', 'module-game-desc']
    ];

    map.forEach(function (row) {
        const cardKey = row[0];
        const btnId = row[1];
        const titleId = row[2];
        const descId = row[3];
        const cardCopy = copy.cards[cardKey];
        if (!cardCopy) return;

        const btn = document.getElementById(btnId);
        const icon = btn ? btn.querySelector('.module-icon') : null;
        const title = document.getElementById(titleId);
        const desc = document.getElementById(descId);

        if (icon) icon.textContent = cardCopy.icon;
        if (title) title.textContent = cardCopy.title;
        if (desc) desc.textContent = cardCopy.desc;
    });
}

function getChineseProgressSnapshot() {
    let parsed = null;
    try {
        parsed = JSON.parse(localStorage.getItem('eq_chinese_progress') || '{}');
    } catch (e) {
        parsed = {};
    }

    const sessions = parsed.sessions || {};
    const modeCorrect = parsed.modeCorrect || {};
    const modeWrong = parsed.modeWrong || {};
    const vocabSrs = parsed.vocabSrs || {};
    const vocabWrong = parsed.vocabWrong || {};
    const correct = Number(parsed.correct || 0);
    const wrong = Number(parsed.wrong || 0);
    const today = todayStr();

    let dueVocab = 0;
    let learnedVocab = 0;
    Object.keys(vocabSrs).forEach(id => {
        const rec = vocabSrs[id] || {};
        const lv = Number(rec.level || 0);
        if (lv > 0) learnedVocab++;
        if (lv > 0 && rec.nextDue && String(rec.nextDue) <= today) dueVocab++;
    });

    const totalSessions = Number(sessions.vocab || 0)
        + Number(sessions.phrases || 0)
        + Number(sessions.listening || 0)
        + Number(sessions.grammar || 0)
        + Number(sessions.story || 0);

    const totalModeCorrect = Number(modeCorrect.vocab || 0)
        + Number(modeCorrect.phrases || 0)
        + Number(modeCorrect.listening || 0)
        + Number(modeCorrect.grammar || 0)
        + Number(modeCorrect.story || 0);

    const totalModeWrong = Number(modeWrong.vocab || 0)
        + Number(modeWrong.phrases || 0)
        + Number(modeWrong.listening || 0)
        + Number(modeWrong.grammar || 0)
        + Number(modeWrong.story || 0);

    return {
        sessions: {
            vocab: Number(sessions.vocab || 0),
            phrases: Number(sessions.phrases || 0),
            listening: Number(sessions.listening || 0),
            grammar: Number(sessions.grammar || 0),
            story: Number(sessions.story || 0)
        },
        modeCorrect: {
            vocab: Number(modeCorrect.vocab || 0),
            phrases: Number(modeCorrect.phrases || 0),
            listening: Number(modeCorrect.listening || 0),
            grammar: Number(modeCorrect.grammar || 0),
            story: Number(modeCorrect.story || 0)
        },
        modeWrong: {
            vocab: Number(modeWrong.vocab || 0),
            phrases: Number(modeWrong.phrases || 0),
            listening: Number(modeWrong.listening || 0),
            grammar: Number(modeWrong.grammar || 0),
            story: Number(modeWrong.story || 0)
        },
        totalSessions,
        totalModeCorrect,
        totalModeWrong,
        answered: correct + wrong,
        storyBest: Number(parsed.storyBest || 0),
        dueVocab,
        learnedVocab,
        vocabSrs,
        vocabWrong
    };
}

async function updateChineseHomeStatsView() {
    let summary = null;
    if (typeof window.getChineseHomeSummary === 'function') {
        try {
            summary = await window.getChineseHomeSummary();
        } catch (e) {
            summary = null;
        }
    }
    if (!summary) {
        summary = { words: 0, phrases: 0, grammar: 0, stories: 0 };
    }

    const progress = getChineseProgressSnapshot();
    const answeredRatio = summary.words > 0 ? Math.min(100, (progress.answered / summary.words) * 100) : 0;

    const vocabStat = document.getElementById('vocab-stat');
    const tensesStat = document.getElementById('tenses-stat');
    const phrasesStat = document.getElementById('phrases-stat');
    const listeningStat = document.getElementById('listening-stat');
    const gameStat = document.getElementById('game-stat');

    if (vocabStat) vocabStat.textContent = `${summary.words} từ`;
    if (tensesStat) tensesStat.textContent = `${summary.grammar} bài`;
    if (phrasesStat) phrasesStat.textContent = `${summary.phrases} câu`;
    if (listeningStat) listeningStat.textContent = `${summary.phrases} câu`;
    if (gameStat) gameStat.textContent = `${summary.stories} truyện · Best ${progress.storyBest} ⭐`;

    const vocabBar = document.getElementById('vocab-progress-bar');
    const tensesBar = document.getElementById('tenses-progress-bar');
    const phrasesBar = document.getElementById('phrases-progress-bar');
    const listeningBar = document.getElementById('listening-progress-bar');
    const gameBar = document.getElementById('game-progress-bar');

    if (vocabBar) vocabBar.style.width = answeredRatio + '%';
    if (tensesBar) tensesBar.style.width = Math.min(100, progress.sessions.grammar * 10) + '%';
    if (phrasesBar) phrasesBar.style.width = answeredRatio + '%';
    if (listeningBar) listeningBar.style.width = Math.min(100, progress.sessions.listening * 10) + '%';
    if (gameBar) gameBar.style.width = Math.min(100, progress.sessions.story * 10) + '%';
}

function openChineseModuleMode(mode, navModule) {
    forcedNavModule = navModule || 'home';
    if (typeof window.openChineseModule === 'function') {
        window.openChineseModule(mode);
        return;
    }
    if (typeof window.initChinese === 'function') window.initChinese();
}

async function openModule(moduleKey) {
    const mod = moduleKey || 'home';
    if (mod === 'home') {
        showScreen(startScreen);
        updateHomeStats();
        return;
    }
    if (mod === 'stats') {
        await showStatsScreen();
        return;
    }

    if (currentLearningLang === 'zh') {
        if (mod === 'vocab') return openChineseModuleMode('vocab_setup', 'vocab');
        if (mod === 'tenses') return openChineseModuleMode('grammar_hub', 'tenses');
        if (mod === 'phrases') return openChineseModuleMode('phrases_hub', 'phrases');
        if (mod === 'listening') return openChineseModuleMode('listening', 'listening');
        if (mod === 'games') return openChineseModuleMode('game_hub', 'games');
        return;
    }

    if (mod === 'vocab') return showVocabSetup();
    if (mod === 'tenses' && typeof initTenses === 'function') return initTenses();
    if (mod === 'phrases' && typeof initPhrases === 'function') return initPhrases();
    if (mod === 'listening' && typeof window.initListening === 'function') return window.initListening();
    if (mod === 'games' && typeof initGame === 'function') return initGame();
}

window.refreshLocalizedHome = function () {
    updateHomeStats();
};

// ===== Initialize =====
function initCoreApp() {
    if (coreAppInitialized) return;
    loadProgress();
    loadWordData();
    loadDailyStats();
    loadLearningLanguage();
    loadSettings();
    setupLearningLanguageSelector();
    applyHomeLanguageCopy();
    updateIrregularVerbUI();
    setStatsSectionTitlesByLanguage();
    updateHomeStats();

    // Home screen - module selection
    document.getElementById('module-vocab-btn').addEventListener('click', () => openModule('vocab'));
    document.getElementById('module-tenses-btn').addEventListener('click', () => openModule('tenses'));
    document.getElementById('module-phrases-btn').addEventListener('click', () => openModule('phrases'));
    document.getElementById('module-listening-btn').addEventListener('click', () => openModule('listening'));
    document.getElementById('module-game-btn').addEventListener('click', () => openModule('games'));
    document.getElementById('module-stats-btn').addEventListener('click', () => openModule('stats'));

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
    coreAppInitialized = true;
}

function initVocabModule() {
    if (vocabModuleInitialized) return;

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
    vocabModuleInitialized = true;
}

async function init() {
    initCoreApp();
    initVocabModule();
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
            openModule(item.dataset.module);
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
            openModule(item.dataset.module);
        });
    });
}

// ===== SeenPhrases — Global cross-module tracker =====
// Theo dõi phrase ID đã hiển thị ở bất kỳ module nào (Phrases + Listening)
// Để khi học Cụm từ xong sang Luyện Nghe không bị lặp câu đã học
window.SeenPhrases = (function () {
    var KEY = 'eq_seen_p';
    var MAX = 10000; // giới hạn tối đa trước khi reset
    var _seen = null;

    function _load() {
        if (_seen) return;
        try { _seen = JSON.parse(localStorage.getItem(KEY) || '[]'); }
        catch (e) { _seen = []; }
    }

    function _save() {
        try { localStorage.setItem(KEY, JSON.stringify(_seen)); }
        catch (e) { /* ignore */ }
    }

    return {
        add: function (id) {
            _load();
            if (!_seen.includes(id)) {
                _seen.push(id);
                if (_seen.length > MAX) _seen = _seen.slice(-MAX); // giữ MAX mới nhất
                _save();
            }
        },
        has: function (id) {
            _load();
            return _seen.includes(id);
        },
        getAll: function () {
            _load();
            return _seen.slice();
        },
        reset: function () {
            _seen = [];
            _save();
        },
        count: function () {
            _load();
            return _seen.length;
        }
    };
})();

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
    if (currentLearningLang === 'zh') {
        updateChineseHomeStatsView();
    } else {
        if (words.length > 0) {
            const vocabStat = document.getElementById('vocab-stat');
            const vocabBar = document.getElementById('vocab-progress-bar');
            if (vocabStat) vocabStat.textContent = `${currentIndex} / ${words.length} từ`;
            if (vocabBar) vocabBar.style.width = `${(currentIndex / words.length) * 100}%`;
        }
        if (typeof updatePhrasesHomeStat === 'function') updatePhrasesHomeStat();
    }

    // Stats home summary
    const statsEl = document.getElementById('stats-home-summary');
    if (statsEl) {
        if (currentLearningLang === 'zh') {
            const zh = getChineseProgressSnapshot();
            const total = zh.totalModeCorrect + zh.totalModeWrong;
            const acc = total > 0 ? Math.round((zh.totalModeCorrect / total) * 100) : 0;
            let text = `Lượt luyện: ${zh.totalSessions}`;
            if (zh.dueVocab > 0) text += ` · ${zh.dueVocab} từ cần ôn`;
            if (total > 0) text += ` · ${acc}% chính xác`;
            statsEl.textContent = text;
        } else {
            const streak = calculateStreak();
            const dueCount = getDueWords().length;
            let text = `Chuỗi: ${streak} ngày`;
            if (dueCount > 0) text += ` · ${dueCount} từ cần ôn`;
            statsEl.textContent = text;
        }
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
async function showVocabSetup() {
    if (currentLearningLang === 'zh') {
        openChineseModuleMode('vocab_setup', 'vocab');
        return;
    }

    const ready = await ensureVocabDataLoaded();
    if (!ready || words.length === 0) {
        console.error('Vocab data is not available');
        return;
    }

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
async function startQuiz() {
    const ready = await ensureVocabDataLoaded();
    if (!ready || filteredIndices.length === 0) return;
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
        if (currentLearningLang === 'zh') {
            ivBadge.style.display = 'none';
        } else if (currentWord.type && currentWord.type.toLowerCase().includes('verb') && IrregularVerbs.isIrregular(currentWord.word)) {
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

// ===== Text-to-Speech (Enhanced) =====
let cachedVoiceByLang = {};
let currentAudio = null;
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
let speakDelayTimer = null;

const TTS_CONFIG = {
    cloudEndpoint: '/api/tts',
    preferCloud: false,
    useLegacyGoogleFallback: true,
    useDictionaryFallback: false,
};

// In-memory cache: Dictionary API word audio (word → mp3 URL)
const _dictAudioCache = {};
// In-memory cache: Google TTS blob URLs (text key → blob URL)
// Blob URLs tồn tại suốt session → repeat plays không cần network
const _googleTTSCache = {};
// In-memory cache: Cloud TTS blob URLs (text+rate key → blob URL)
const _cloudTTSCache = {};

const CJK_CHAR_REGEX = /[\u3400-\u9FFF]/;

function normalizeLangCode(langCode) {
    const lc = (langCode || '').toLowerCase();
    if (lc.startsWith('zh')) return 'zh-CN';
    if (lc.startsWith('vi')) return 'vi-VN';
    return 'en-US';
}

function inferLangCodeFromText(text, fallback) {
    const explicit = normalizeLangCode(fallback);
    if (fallback) return explicit;
    const s = String(text || '');
    if (CJK_CHAR_REGEX.test(s)) return 'zh-CN';
    const hasVi = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(s);
    if (hasVi) return 'vi-VN';
    return 'en-US';
}

function prefetchWordAudio(word) {
    if (!word || /\s/.test(word.trim())) return;
    const key = word.toLowerCase().trim();
    if (key in _dictAudioCache) return;
    const controller = new AbortController();
    const tid = setTimeout(function() { controller.abort(); }, 5000);
    fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(key), { signal: controller.signal })
        .then(function(res) {
            clearTimeout(tid);
            if (!res.ok) { _dictAudioCache[key] = null; return null; }
            return res.json();
        })
        .then(function(data) {
            if (!data) return;
            for (var i = 0; i < data.length; i++) {
                var ph = data[i].phonetics || [];
                for (var j = 0; j < ph.length; j++) {
                    if (ph[j].audio && ph[j].audio.includes('-us')) { _dictAudioCache[key] = ph[j].audio; return; }
                }
            }
            for (var i = 0; i < data.length; i++) {
                var ph = data[i].phonetics || [];
                for (var j = 0; j < ph.length; j++) {
                    if (ph[j].audio) { _dictAudioCache[key] = ph[j].audio; return; }
                }
            }
            _dictAudioCache[key] = null;
        })
        .catch(function() { clearTimeout(tid); _dictAudioCache[key] = null; });
}

function getBestVoice(langCode) {
    const lang = normalizeLangCode(langCode);
    if (cachedVoiceByLang[lang]) return cachedVoiceByLang[lang];
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    var priorities;
    if (lang === 'zh-CN') {
        priorities = [
            v => v.lang === 'zh-CN' && v.name.toLowerCase().includes('google'),
            v => v.lang === 'zh-CN' && /mandarin|chinese/i.test(v.name),
            v => v.lang === 'zh-CN',
            v => v.lang === 'zh-TW',
            v => v.lang.startsWith('zh'),
        ];
    } else if (lang === 'vi-VN') {
        priorities = [
            v => v.lang === 'vi-VN' && v.name.toLowerCase().includes('google'),
            v => v.lang === 'vi-VN',
            v => v.lang.startsWith('vi'),
        ];
    } else {
        priorities = [
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
    }

    for (const test of priorities) {
        const found = voices.find(test);
        if (found) { cachedVoiceByLang[lang] = found; return found; }
    }
    return null;
}

// Preload voices ngay khi khởi động
getBestVoice('en-US');
getBestVoice('zh-CN');
if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = function() {
        cachedVoiceByLang = {};
        getBestVoice('en-US');
        getBestVoice('zh-CN');
        getBestVoice('vi-VN');
    };
}

// ---- Helpers ----

// Stop bất kỳ audio đang phát
function _stopCurrentAudio() {
    if (currentAudio) {
        try { currentAudio.pause(); } catch(e) {}
        currentAudio = null;
    }
    _stopWebSpeechKeepalive();
    window.speechSynthesis.cancel();
}

// Play một audio URL với rate control qua playbackRate
// rate: 1.0 = bình thường, 0.6 = chậm, v.v.
function _playAudioUrl(url, btn, rate, onFail) {
    var audio = new Audio(url);
    audio.playbackRate = (rate && rate > 0) ? rate : 1.0;
    currentAudio = audio;
    if (btn) btn.classList.add('speaking');
    audio.onended = function() {
        if (btn) btn.classList.remove('speaking');
        if (currentAudio === audio) currentAudio = null;
    };
    audio.onerror = function() {
        if (btn) btn.classList.remove('speaking');
        if (currentAudio === audio) currentAudio = null;
        if (onFail) onFail();
    };
    audio.play().catch(function() {
        if (btn) btn.classList.remove('speaking');
        if (currentAudio === audio) currentAudio = null;
        if (onFail) onFail();
    });
}

// Chia text dài thành các đoạn ≤ maxLen ký tự tại ranh giới câu/từ
function _splitTextForTTS(text, maxLen) {
    maxLen = maxLen || 180;
    if (text.length <= maxLen) return [text];
    var chunks = [];
    // Tách tại các dấu ngắt câu
    var sentences = text.match(/[^.!?,;]+[.!?,;]*/g) || [text];
    var current = '';
    for (var i = 0; i < sentences.length; i++) {
        var s = sentences[i].trim();
        if (!s) continue;
        if ((current + ' ' + s).trim().length <= maxLen) {
            current = (current + ' ' + s).trim();
        } else {
            if (current) chunks.push(current);
            // Nếu câu đơn vẫn quá dài → cắt tại khoảng trắng
            if (s.length > maxLen) {
                var words = s.split(' ');
                current = '';
                for (var w = 0; w < words.length; w++) {
                    if ((current + ' ' + words[w]).trim().length <= maxLen) {
                        current = (current + ' ' + words[w]).trim();
                    } else {
                        if (current) chunks.push(current);
                        current = words[w];
                    }
                }
            } else {
                current = s;
            }
        }
    }
    if (current) chunks.push(current);
    return chunks.length ? chunks : [text.slice(0, maxLen)];
}

// Keepalive để chống Chrome/Chromium bug: Web Speech tự pause sau ~15s
var _webSpeechKeepalive = null;
function _startWebSpeechKeepalive() {
    _stopWebSpeechKeepalive();
    _webSpeechKeepalive = setInterval(function() {
        if (!window.speechSynthesis.speaking) { _stopWebSpeechKeepalive(); return; }
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
    }, 10000);
}
function _stopWebSpeechKeepalive() {
    if (_webSpeechKeepalive) { clearInterval(_webSpeechKeepalive); _webSpeechKeepalive = null; }
}

// Fallback: Web Speech API (last resort, giọng local)
function _speakViaWebSpeech(text, btn, rate, langCode) {
    window.speechSynthesis.cancel();
    _stopWebSpeechKeepalive();
    var doSpeak = function() {
        var utt = new SpeechSynthesisUtterance(text);
        var normalizedLang = normalizeLangCode(langCode);
        utt.lang = normalizedLang;
        utt.rate = (rate != null && rate > 0) ? rate : 0.9;
        utt.pitch = 1;
        utt.volume = 1;
        var voice = getBestVoice(normalizedLang);
        if (voice) utt.voice = voice;
        if (btn) btn.classList.add('speaking');
        utt.onend = function() {
            _stopWebSpeechKeepalive();
            if (btn) btn.classList.remove('speaking');
        };
        utt.onerror = function() {
            _stopWebSpeechKeepalive();
            if (btn) btn.classList.remove('speaking');
        };
        window.speechSynthesis.speak(utt);
        _startWebSpeechKeepalive();
    };
    setTimeout(doSpeak, isMobile ? 80 : 20);
}

function _base64ToBlobUrl(base64, mimeType) {
    var binary = atob(base64);
    var len = binary.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    var blob = new Blob([bytes], { type: mimeType || 'audio/mpeg' });
    return URL.createObjectURL(blob);
}

function _getCloudTTSBlobUrl(text, rate, langCode) {
    if (!TTS_CONFIG.preferCloud) return Promise.reject(new Error('cloud tts disabled'));
    var normalizedRate = (rate && rate > 0) ? rate : 1.0;
    var normalizedText = (text || '').trim();
    var normalizedLang = normalizeLangCode(langCode);
    var cacheKey = normalizedLang + '|' + normalizedText.toLowerCase().slice(0, 320) + '|' + normalizedRate.toFixed(2);
    if (_cloudTTSCache[cacheKey]) return Promise.resolve(_cloudTTSCache[cacheKey]);

    return fetch(TTS_CONFIG.cloudEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: normalizedText.slice(0, 2000),
            rate: normalizedRate,
            lang: normalizedLang,
        })
    })
        .then(function(res) {
            if (!res.ok) throw new Error('cloud tts ' + res.status);
            return res.json();
        })
        .then(function(data) {
            if (!data || !data.audioContent) throw new Error('empty cloud tts audio');
            var blobUrl = _base64ToBlobUrl(data.audioContent, data.mimeType || 'audio/mpeg');
            _cloudTTSCache[cacheKey] = blobUrl;
            return blobUrl;
        });
}

function _speakViaCloudTTS(text, btn, rate, langCode, onFail) {
    _getCloudTTSBlobUrl(text, rate, langCode)
        .then(function(url) {
            _playAudioUrl(url, btn, rate, onFail);
        })
        .catch(function() {
            if (onFail) onFail();
        });
}

function _getGoogleTTSBlobUrl(text, langCode) {
    var normalizedLang = normalizeLangCode(langCode);
    var cacheKey = normalizedLang + '|' + text.toLowerCase().trim().slice(0, 180);
    if (_googleTTSCache[cacheKey]) return Promise.resolve(_googleTTSCache[cacheKey]);

    // tw-ob client ổn định hơn gtx, ít bị block hơn trên các trình duyệt không phải Chrome
    var url = 'https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=' + encodeURIComponent(normalizedLang) + '&client=tw-ob&q='
        + encodeURIComponent(text.slice(0, 180));

    return fetch(url)
        .then(function(res) {
            if (!res.ok) throw new Error('gtts ' + res.status);
            return res.blob();
        })
        .then(function(blob) {
            if (!blob || blob.size < 100) throw new Error('gtts empty blob');
            var blobUrl = URL.createObjectURL(blob);
            _googleTTSCache[cacheKey] = blobUrl;
            return blobUrl;
        });
}

// Primary TTS: Google Translate TTS
// Fetch → blob URL → cache in-memory → playbackRate cho speed control
// Giọng Google nhất quán trên mọi thiết bị
function _speakViaGoogleTTS(text, btn, rate, langCode, onFail) {
    _getGoogleTTSBlobUrl(text, langCode)
        .then(function(blobUrl) {
            _playAudioUrl(blobUrl, btn, rate, onFail);
        })
        .catch(function() {
            if (onFail) onFail();
        });
}

// Phát tuần tự nhiều chunks (cho text dài)
function _speakChunksSequentially(chunks, btn, rate, langCode, onFail) {
    if (!chunks || !chunks.length) return;
    if (btn) btn.classList.add('speaking');
    var idx = 0;

    function playNext() {
        if (idx >= chunks.length) {
            if (btn) btn.classList.remove('speaking');
            return;
        }

        var chunk = chunks[idx++];
        var getChunkAudio = null;
        if (TTS_CONFIG.preferCloud) {
            getChunkAudio = _getCloudTTSBlobUrl(chunk, rate, langCode).catch(function(err) {
                if (TTS_CONFIG.useLegacyGoogleFallback) return _getGoogleTTSBlobUrl(chunk, langCode);
                throw err;
            });
        } else {
            getChunkAudio = _getGoogleTTSBlobUrl(chunk, langCode);
        }

        getChunkAudio
            .then(function(url) {
                var audio = new Audio(url);
                audio.playbackRate = (rate && rate > 0) ? rate : 1.0;
                currentAudio = audio;
                audio.onended = function() { if (currentAudio === audio) currentAudio = null; playNext(); };
                audio.onerror = function() {
                    if (currentAudio === audio) currentAudio = null;
                    if (btn) btn.classList.remove('speaking');
                    if (onFail) onFail();
                };
                audio.play().catch(function() {
                    if (currentAudio === audio) currentAudio = null;
                    if (btn) btn.classList.remove('speaking');
                    if (onFail) onFail();
                });
            })
            .catch(function() {
                if (btn) btn.classList.remove('speaking');
                if (onFail) onFail();
            });
    }

    playNext();
}

// ---- Main speak functions ----

function speakWord(text) {
    var word = (text || (wordText && wordText.textContent) || '').trim();
    if (!word || word === 'Loading...') return;

    if (speakDelayTimer) { clearTimeout(speakDelayTimer); speakDelayTimer = null; }
    _stopCurrentAudio();

    var activeBtn = document.querySelector('.screen.active .speak-btn') || speakBtn;
    var langCode = 'en-US';

    // Cloud-first để đồng nhất giọng giữa browser/device.
    var fallbackToWebSpeech = function() {
        _speakViaWebSpeech(word, activeBtn, null, langCode);
    };

    if (TTS_CONFIG.preferCloud) {
        _speakViaCloudTTS(word, activeBtn, 1.0, langCode, function() {
            if (TTS_CONFIG.useDictionaryFallback && !/\s/.test(word)) {
                var audioUrl = _dictAudioCache[word.toLowerCase()];
                if (audioUrl) {
                    _playAudioUrl(audioUrl, activeBtn, 1.0, fallbackToWebSpeech);
                    return;
                }
                prefetchWordAudio(word);
            }
            if (TTS_CONFIG.useLegacyGoogleFallback) {
                _speakViaGoogleTTS(word, activeBtn, 1.0, langCode, fallbackToWebSpeech);
                return;
            }
            fallbackToWebSpeech();
        });
        return;
    }

    _speakViaGoogleTTS(word, activeBtn, 1.0, langCode, fallbackToWebSpeech);
}

// Global speak — dùng cho phrases.js và game.js
// opts: { rate: number, btn: HTMLElement, lang: 'en-US'|'vi-VN'|'zh-CN' }
window.speakText = function(text, opts) {
    _stopCurrentAudio();
    var btn = (opts && opts.btn) || null;
    var rate = (opts && opts.rate != null && opts.rate > 0) ? opts.rate : 1.0;
    var langCode = inferLangCodeFromText(text, opts && opts.lang);
    var fallbackToWebSpeech = function() {
        _speakViaWebSpeech(text, btn, rate, langCode);
    };

    var chunks = _splitTextForTTS(text);
    if (TTS_CONFIG.preferCloud) {
        if (chunks.length <= 1) {
            _speakViaCloudTTS(text, btn, rate, langCode, function() {
                if (TTS_CONFIG.useLegacyGoogleFallback) {
                    _speakViaGoogleTTS(text, btn, rate, langCode, fallbackToWebSpeech);
                    return;
                }
                fallbackToWebSpeech();
            });
            return;
        }
        _speakChunksSequentially(chunks, btn, rate, langCode, fallbackToWebSpeech);
        return;
    }

    if (chunks.length <= 1) {
        _speakViaGoogleTTS(text, btn, rate, langCode, fallbackToWebSpeech);
        return;
    }
    _speakChunksSequentially(chunks, btn, rate, langCode, fallbackToWebSpeech);
};

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
    const ready = await ensureVocabDataLoaded();
    if (!ready || words.length === 0) return;

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
            if (window.AppDataLoader && typeof window.AppDataLoader.getPhrasesPayload === 'function') {
                phrasesCache = await window.AppDataLoader.getPhrasesPayload();
            } else {
                const res = await fetch('phrases.json');
                phrasesCache = await res.json();
            }
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
async function loadChineseWordsForStats() {
    if (Array.isArray(chineseWordsCache)) return chineseWordsCache;
    try {
        const res = await fetch('chinese_words.json');
        chineseWordsCache = res.ok ? await res.json() : [];
    } catch (e) {
        chineseWordsCache = [];
    }
    return chineseWordsCache;
}

async function renderChineseStatsSummary() {
    const container = document.getElementById('stats-summary');
    if (!container) return;

    let summary = { words: 0, phrases: 0, grammar: 0, stories: 0 };
    if (typeof window.getChineseHomeSummary === 'function') {
        try {
            const s = await window.getChineseHomeSummary();
            if (s) summary = s;
        } catch (e) {
            // ignore
        }
    }

    const p = getChineseProgressSnapshot();
    const totalAnswer = p.totalModeCorrect + p.totalModeWrong;
    const acc = totalAnswer > 0 ? Math.round((p.totalModeCorrect / totalAnswer) * 100) : 0;

    container.innerHTML = `
        <div class="stats-card">
            <div class="stats-card-number">${p.totalSessions}</div>
            <div class="stats-card-label">Lượt luyện</div>
        </div>
        <div class="stats-card">
            <div class="stats-card-number">${p.learnedVocab}</div>
            <div class="stats-card-label">Từ đã học</div>
        </div>
        <div class="stats-card">
            <div class="stats-card-number">${p.dueVocab}</div>
            <div class="stats-card-label">Cần ôn</div>
        </div>
        <div class="stats-card">
            <div class="stats-card-number">${acc}%</div>
            <div class="stats-card-label">Chính xác</div>
        </div>
    `;

    // Keep section context informative for Chinese dataset size
    const chartTitle = document.getElementById('stats-section-chart-title');
    if (chartTitle) {
        chartTitle.textContent = `Lượt luyện theo chế độ (Từ: ${summary.words}, Câu: ${summary.phrases})`;
    }
}

function renderChineseModeChart() {
    const container = document.getElementById('stats-chart');
    if (!container) return;

    const p = getChineseProgressSnapshot();
    const rows = [
        { key: 'vocab', label: 'Từ', count: Number(p.sessions.vocab || 0) },
        { key: 'grammar', label: 'Ngữ', count: Number(p.sessions.grammar || 0) },
        { key: 'phrases', label: 'Câu', count: Number(p.sessions.phrases || 0) },
        { key: 'listening', label: 'Nghe', count: Number(p.sessions.listening || 0) },
        { key: 'story', label: 'Game', count: Number(p.sessions.story || 0) }
    ];

    let maxVal = 1;
    rows.forEach(r => { if (r.count > maxVal) maxVal = r.count; });

    container.innerHTML = rows.map(r => `
        <div class="chart-bar-wrap">
            <div class="chart-bar" style="height: ${Math.max((r.count / maxVal) * 100, r.count > 0 ? 8 : 2)}%">
                ${r.count > 0 ? `<span class="chart-bar-val">${r.count}</span>` : ''}
            </div>
            <div class="chart-bar-label">${r.label}</div>
        </div>
    `).join('');
}

async function renderChineseSRSProgress() {
    const container = document.getElementById('stats-srs');
    if (!container) return;

    let totalWords = 0;
    if (typeof window.getChineseHomeSummary === 'function') {
        try {
            const s = await window.getChineseHomeSummary();
            totalWords = Number((s && s.words) || 0);
        } catch (e) {
            totalWords = 0;
        }
    }
    if (!totalWords) {
        const words = await loadChineseWordsForStats();
        totalWords = Array.isArray(words) ? words.length : 0;
    }

    const p = getChineseProgressSnapshot();
    const counts = { new: 0, learning: 0, reviewing: 0, mastering: 0, mastered: 0 };

    Object.keys(p.vocabSrs || {}).forEach(id => {
        const rec = p.vocabSrs[id] || {};
        const lv = Number(rec.level || 0);
        if (lv <= 0) return;
        if (lv === 1) counts.learning++;
        else if (lv === 2) counts.reviewing++;
        else if (lv === 3 || lv === 4) counts.mastering++;
        else counts.mastered++;
    });

    const learned = counts.learning + counts.reviewing + counts.mastering + counts.mastered;
    counts.new = Math.max(0, totalWords - learned);

    const total = Math.max(1, totalWords);
    const items = [
        { label: 'Chưa học', count: counts.new, color: '#94a3b8' },
        { label: 'Mới học', count: counts.learning, color: '#f59e0b' },
        { label: 'Đang ôn', count: counts.reviewing, color: '#3b82f6' },
        { label: 'Củng cố', count: counts.mastering, color: '#8b5cf6' },
        { label: 'Đã thuộc', count: counts.mastered, color: '#10b981' }
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

async function renderChineseMissedWords() {
    const container = document.getElementById('stats-missed');
    if (!container) return;

    const p = getChineseProgressSnapshot();
    const wrongMap = p.vocabWrong || {};
    const entries = Object.keys(wrongMap)
        .map(id => ({ id, wrongCount: Number(wrongMap[id] || 0) }))
        .filter(r => r.wrongCount > 0)
        .sort((a, b) => b.wrongCount - a.wrongCount)
        .slice(0, 10);

    if (!entries.length) {
        container.innerHTML = '<div class="stats-empty">Chưa có từ nào sai</div>';
        return;
    }

    const words = await loadChineseWordsForStats();
    const byId = {};
    (Array.isArray(words) ? words : []).forEach(w => {
        if (w && w.id) byId[w.id] = w;
    });

    container.innerHTML = entries.map((m, i) => {
        const w = byId[m.id] || {};
        const wordText = w.word || m.id;
        const meaningText = w.meaning || '';
        return `
            <div class="missed-item">
                <span class="missed-rank">${i + 1}</span>
                <div class="missed-info">
                    <span class="missed-word">${wordText}</span>
                    <span class="missed-meaning">${meaningText}</span>
                </div>
                <span class="missed-count">${m.wrongCount} sai</span>
            </div>
        `;
    }).join('');
}

async function showStatsScreen() {
    setStatsSectionTitlesByLanguage();

    if (currentLearningLang === 'zh') {
        await renderChineseStatsSummary();
        renderChineseModeChart();
        await renderChineseSRSProgress();
        await renderChineseMissedWords();
    } else {
        renderStatsSummary();
        renderDailyChart();
        renderSRSProgress();
        renderMissedWords();
    }

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
