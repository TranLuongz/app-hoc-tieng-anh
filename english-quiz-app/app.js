// ===== State Variables =====
let words = [];
let currentIndex = 0;
let correctAnswer = "";
let correctCount = 0;
let wrongCount = 0;
let shuffledOrder = [];
let isShuffled = true;

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
function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
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
    loadSettings();
    updateHomeStats();

    // Home screen - module selection
    document.getElementById('module-vocab-btn').addEventListener('click', showVocabSetup);
    document.getElementById('module-tenses-btn').addEventListener('click', () => {
        if (typeof initTenses === 'function') initTenses();
    });

    // Vocab setup screen
    startBtn.addEventListener('click', startQuiz);
    resetBtn.addEventListener('click', resetProgress);
    document.getElementById('vocab-back-btn').addEventListener('click', () => showScreen(startScreen));
    shuffleToggle.addEventListener('change', onShuffleChange);

    // Quiz screen
    backBtn.addEventListener('click', goBack);
    nextBtn.addEventListener('click', nextWord);
    optionBtns.forEach(btn => {
        btn.addEventListener('click', () => selectOption(btn));
    });
    speakBtn.addEventListener('click', () => speakWord());

    // Settings
    darkmodeToggle.addEventListener('change', onDarkmodeChange);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

// ===== Home Stats =====
function updateHomeStats() {
    if (words.length === 0) return;
    const vocabStat = document.getElementById('vocab-stat');
    const vocabBar = document.getElementById('vocab-progress-bar');
    if (vocabStat) vocabStat.textContent = `${currentIndex} / ${words.length} từ`;
    if (vocabBar) vocabBar.style.width = `${(currentIndex / words.length) * 100}%`;
}

// ===== Vocab Setup Screen =====
function showVocabSetup() {
    updateStartStats();
    showScreen(vocabSetupScreen);
}

function updateStartStats() {
    if (words.length === 0) return;
    statLearned.textContent = currentIndex;
    statRemaining.textContent = words.length - currentIndex;
    const total = correctCount + wrongCount;
    statAccuracy.textContent = total > 0 ? Math.round((correctCount / total) * 100) + '%' : '0%';
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
}

// ===== Settings =====
function loadSettings() {
    const dark = localStorage.getItem('eq_darkmode');
    if (dark === 'true') {
        document.body.classList.add('dark');
        darkmodeToggle.checked = true;
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

function resetProgress() {
    if (!confirm('Bạn có chắc muốn đặt lại toàn bộ tiến trình?')) return;
    localStorage.removeItem('eq_progress');
    currentIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    shuffledOrder = [];
    updateStartStats();
    updateHomeStats();
}

// ===== Quiz Navigation =====
function startQuiz() {
    if (words.length === 0) return;
    if (isShuffled && shuffledOrder.length !== words.length) {
        shuffledOrder = generateShuffledOrder();
        saveProgress();
    } else if (!isShuffled) {
        shuffledOrder = [];
    }

    showScreen(quizScreen);
    showWord();
}

function goBack() {
    saveProgress();
    updateHomeStats();
    showVocabSetup();
}

// ===== Shuffle =====
function generateShuffledOrder() {
    const indices = Array.from({ length: words.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
}

function getWordIndex(idx) {
    if (isShuffled && shuffledOrder.length > 0) {
        return shuffledOrder[idx % shuffledOrder.length];
    }
    return idx % words.length;
}

// ===== Quiz Logic =====
function showWord() {
    const realIndex = getWordIndex(currentIndex);
    const currentWord = words[realIndex];

    wordText.textContent = currentWord.word;
    correctAnswer = currentWord.meaning;

    wordPhonetic.textContent = currentWord.phonetic || '—';
    wordInfo.textContent = [currentWord.type, currentWord.level].filter(Boolean).join(' · ');

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

    const displayIndex = (currentIndex % words.length) + 1;
    wordCounter.textContent = `${displayIndex} / ${words.length}`;
    progressBar.style.width = `${(displayIndex / words.length) * 100}%`;
    correctCountEl.textContent = correctCount;
    wrongCountEl.textContent = wrongCount;
}

function generateOptions(correctIndex) {
    const correct = words[correctIndex].meaning;
    const options = [correct];
    const usedIndices = new Set([correctIndex]);

    while (options.length < 4) {
        const randIdx = Math.floor(Math.random() * words.length);
        if (!usedIndices.has(randIdx)) {
            usedIndices.add(randIdx);
            options.push(words[randIdx].meaning);
        }
    }

    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
}

function selectOption(btn) {
    if (btn.disabled) return;

    const selected = btn.textContent;

    if (selected === correctAnswer) {
        btn.classList.add('correct');
        wordCard.classList.add('correct-anim');
        feedback.textContent = 'Chính xác!';
        feedback.className = 'feedback correct-msg';
        nextBtn.disabled = false;
        correctCount++;
        optionBtns.forEach(b => b.disabled = true);
        correctCountEl.textContent = correctCount;
        saveProgress();
    } else {
        btn.classList.add('wrong');
        wordCard.classList.add('wrong-anim');
        feedback.textContent = 'Sai rồi, chọn lại!';
        feedback.className = 'feedback wrong-msg';
        wrongCount++;
        wrongCountEl.textContent = wrongCount;
        btn.disabled = true;
        setTimeout(() => wordCard.classList.remove('wrong-anim'), 400);
        saveProgress();
    }
}

function nextWord() {
    currentIndex++;
    if (currentIndex >= words.length) {
        currentIndex = 0;
        if (isShuffled) {
            shuffledOrder = generateShuffledOrder();
        }
    }
    saveProgress();
    showWord();
}

// ===== Text-to-Speech =====
let cachedVoice = null;

function getBestEnglishVoice() {
    if (cachedVoice) return cachedVoice;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    const priorities = [
        v => v.lang === 'en-US' && v.localService && v.name.includes('Google'),
        v => v.lang === 'en-US' && v.name.includes('Google'),
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

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voice = getBestEnglishVoice();
    if (voice) utterance.voice = voice;

    speakBtn.classList.add('speaking');
    utterance.onend = () => speakBtn.classList.remove('speaking');
    utterance.onerror = () => speakBtn.classList.remove('speaking');

    window.speechSynthesis.speak(utterance);
}

// ===== Start App =====
document.addEventListener('DOMContentLoaded', init);
