// ===== State Variables =====
let words = [];
let currentIndex = 0;
let correctAnswer = "";
let correctCount = 0;
let wrongCount = 0;
let shuffledOrder = [];
let isShuffled = true;

// Review state
let reviewQueue = [];
let reviewIdx = 0;
let reviewCorrect = 0;
let reviewWrong = 0;
let reviewHintLevel = 0;
let phrasesCache = null;

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
    document.getElementById('module-phrases-btn').addEventListener('click', () => {
        if (typeof initPhrases === 'function') initPhrases();
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

    // Review
    document.getElementById('review-btn').addEventListener('click', startVocabReview);
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
    document.getElementById('review-retry-btn').addEventListener('click', startVocabReview);
    document.getElementById('review-back-setup-btn').addEventListener('click', () => showVocabSetup());

    // Settings
    darkmodeToggle.addEventListener('change', onDarkmodeChange);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
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
    const reviewBtn = document.getElementById('review-btn');
    if (reviewBtn) reviewBtn.disabled = getReviewPoolSize() === 0;
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

// ===== Vocab Review =====
function getReviewPoolSize() {
    if (currentIndex > 0) return currentIndex;
    if (correctCount + wrongCount > 0) return words.length;
    return 0;
}

async function startVocabReview() {
    const poolSize = getReviewPoolSize();
    if (poolSize === 0 || words.length === 0) return;

    // Load phrases.json for context hints (cache)
    if (!phrasesCache) {
        try {
            const res = await fetch('phrases.json');
            phrasesCache = await res.json();
        } catch (e) { /* hints won't work but review still works */ }
    }

    // Build pool of learned word indices
    const pool = [];
    for (let i = 0; i < poolSize; i++) {
        pool.push(getWordIndex(i));
    }

    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    reviewQueue = pool.slice(0, 20);
    reviewIdx = 0;
    reviewCorrect = 0;
    reviewWrong = 0;

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

function submitReviewAnswer() {
    const input = document.getElementById('review-typing-input');
    if (input.disabled) return;
    const userText = input.value.trim();
    if (!userText) return;

    const word = words[reviewQueue[reviewIdx]];
    const correct = word.meaning;
    const result = checkReviewAnswer(userText, correct);

    input.disabled = true;
    document.getElementById('review-submit-btn').disabled = true;

    const fb = document.getElementById('review-feedback');
    const ca = document.getElementById('review-correct-answer');

    if (result === 'correct') {
        input.classList.add('correct');
        reviewCorrect++;
        fb.textContent = 'Chính xác!';
        fb.className = 'feedback correct';
        ca.style.display = 'none';
    } else if (result === 'close') {
        input.classList.add('close');
        reviewCorrect++;
        fb.textContent = 'Gần đúng!';
        fb.className = 'feedback close';
        ca.innerHTML = `Đáp án: <strong>${correct}</strong>`;
        ca.style.display = '';
    } else {
        input.classList.add('wrong');
        reviewWrong++;
        fb.textContent = 'Sai rồi!';
        fb.className = 'feedback wrong';
        ca.innerHTML = `Đáp án: <strong>${correct}</strong>`;
        ca.style.display = '';
    }

    document.getElementById('review-correct').textContent = reviewCorrect;
    document.getElementById('review-wrong').textContent = reviewWrong;
    document.getElementById('review-next-btn').disabled = false;
}

function checkReviewAnswer(userInput, correctAnswer) {
    const normUser = window.normalizeText(userInput);
    const normCorrect = window.normalizeText(correctAnswer);

    if (normUser === normCorrect) return 'correct';

    // Check each meaning if comma-separated
    const meanings = correctAnswer.split(/[,;]/).map(m => m.trim()).filter(Boolean);
    for (const m of meanings) {
        if (window.normalizeText(m) === normUser) return 'correct';
    }

    // Levenshtein
    const threshold = correctAnswer.length > 20 ? 3 : 2;
    if (window.levenshteinDistance(normUser, normCorrect) <= threshold) return 'close';

    for (const m of meanings) {
        if (window.levenshteinDistance(normUser, window.normalizeText(m)) <= 2) return 'close';
    }

    // Word match
    const userWords = normUser.split(' ').filter(Boolean);
    const correctWords = normCorrect.split(' ').filter(Boolean);
    const matchCount = userWords.filter(w => correctWords.includes(w)).length;
    if (matchCount / Math.max(userWords.length, correctWords.length, 1) >= 0.75) return 'close';

    return 'wrong';
}

function getContextHint(wordObj) {
    if (!phrasesCache || !phrasesCache.phrases) return null;

    const w = wordObj.word.toLowerCase();
    const regex = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    const matches = phrasesCache.phrases.filter(p => regex.test(p.en));

    if (matches.length === 0) return null;

    // Prefer shorter sentences
    matches.sort((a, b) => a.en.length - b.en.length);
    const phrase = matches[0];

    // Try to blank out the meaning in Vietnamese sentence
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

// ===== Start App =====
document.addEventListener('DOMContentLoaded', init);
