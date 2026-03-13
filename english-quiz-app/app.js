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
const quizScreen = document.getElementById('quiz-screen');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const backBtn = document.getElementById('back-btn');
const nextBtn = document.getElementById('next-btn');
const wordText = document.getElementById('word-text');
const wordCard = document.getElementById('word-card');
const feedback = document.getElementById('feedback');
const optionsGrid = document.getElementById('options-grid');
const optionBtns = document.querySelectorAll('.option-btn');
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
const wordVowels = document.getElementById('word-vowels');
const speakBtn = document.getElementById('speak-btn');

// ===== Initialize =====
async function init() {
    try {
        const response = await fetch('words.json');
        words = await response.json();
    } catch (e) {
        wordText.textContent = 'Lỗi tải dữ liệu!';
        return;
    }

    loadProgress();
    loadSettings();
    updateStartStats();

    startBtn.addEventListener('click', startQuiz);
    resetBtn.addEventListener('click', resetProgress);
    backBtn.addEventListener('click', goBack);
    nextBtn.addEventListener('click', nextWord);
    shuffleToggle.addEventListener('change', onShuffleChange);
    darkmodeToggle.addEventListener('change', onDarkmodeChange);

    optionBtns.forEach(btn => {
        btn.addEventListener('click', () => selectOption(btn));
    });

    speakBtn.addEventListener('click', () => speakWord());

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

// ===== Keyboard Support =====
function handleKeyboard(e) {
    if (!quizScreen.classList.contains('active')) {
        if (e.key === 'Enter') startQuiz();
        return;
    }

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

        if (currentIndex > 0 || correctCount > 0) {
            startStats.style.display = 'flex';
            resetBtn.style.display = 'inline-block';
        }
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
    startStats.style.display = 'none';
    resetBtn.style.display = 'none';
    updateStartStats();
}

function updateStartStats() {
    if (words.length === 0) return;
    statLearned.textContent = currentIndex;
    statRemaining.textContent = words.length - currentIndex;
    const total = correctCount + wrongCount;
    statAccuracy.textContent = total > 0 ? Math.round((correctCount / total) * 100) + '%' : '0%';
}

// ===== Navigation =====
function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

function startQuiz() {
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
    updateStartStats();
    startStats.style.display = 'flex';
    resetBtn.style.display = 'inline-block';
    showScreen(startScreen);
}

// ===== Shuffle =====
function generateShuffledOrder() {
    const indices = Array.from({ length: words.length }, (_, i) => i);
    // Fisher-Yates shuffle
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

    wordText.innerHTML = highlightVowels(currentWord.word);
    correctAnswer = currentWord.meaning;

    // Phonetic & vowels
    wordPhonetic.textContent = getPhonetic(currentWord.word);
    wordVowels.innerHTML = getVowelInfo(currentWord.word);

    // Auto-speak on new word
    speakWord(currentWord.word);

    // Generate options
    const options = generateOptions(realIndex);
    optionBtns.forEach((btn, i) => {
        btn.textContent = options[i];
        btn.className = 'option-btn';
        btn.disabled = false;
    });

    // Update UI
    feedback.textContent = '';
    feedback.className = 'feedback';
    nextBtn.disabled = true;
    wordCard.className = 'word-card';

    // Progress
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

    // Shuffle options
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
        // Correct
        btn.classList.add('correct');
        wordCard.classList.add('correct-anim');
        feedback.textContent = '🎉 Chính xác!';
        feedback.className = 'feedback correct-msg';
        nextBtn.disabled = false;
        correctCount++;

        // Disable all buttons
        optionBtns.forEach(b => b.disabled = true);
        correctCountEl.textContent = correctCount;
        saveProgress();
    } else {
        // Wrong
        btn.classList.add('wrong');
        wordCard.classList.add('wrong-anim');
        feedback.textContent = '❌ Sai rồi, chọn lại!';
        feedback.className = 'feedback wrong-msg';
        wrongCount++;
        wrongCountEl.textContent = wrongCount;
        btn.disabled = true;

        // Remove shake after animation
        setTimeout(() => {
            wordCard.classList.remove('wrong-anim');
        }, 400);

        saveProgress();
    }
}

function nextWord() {
    currentIndex++;
    if (currentIndex >= words.length) {
        currentIndex = 0;
        // Re-shuffle for new round
        if (isShuffled) {
            shuffledOrder = generateShuffledOrder();
        }
    }
    saveProgress();
    showWord();
}

// ===== Vowel & Phonetic Helpers =====
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

function highlightVowels(word) {
    return word.split('').map(ch => {
        if (VOWELS.has(ch.toLowerCase())) {
            return `<span class="vowel-highlight">${ch}</span>`;
        }
        return ch;
    }).join('');
}

function getVowelInfo(word) {
    const found = [...new Set(word.toLowerCase().split('').filter(ch => VOWELS.has(ch)))];
    if (found.length === 0) return '<span class="vowel-none">Không có nguyên âm</span>';
    return `Nguyên âm: ${found.map(v => `<span class="vowel-char">${v.toUpperCase()}</span>`).join(' ')}`;
}

// Simple phonetic pronunciation guide
const PHONETIC_MAP = {
    'a': '/æ/', 'e': '/ɛ/', 'i': '/ɪ/', 'o': '/ɑː/', 'u': '/ʌ/',
    'ai': '/eɪ/', 'ay': '/eɪ/', 'ea': '/iː/', 'ee': '/iː/', 'oa': '/oʊ/',
    'oo': '/uː/', 'ou': '/aʊ/', 'ow': '/aʊ/', 'oi': '/ɔɪ/', 'oy': '/ɔɪ/',
    'ie': '/iː/', 'ei': '/eɪ/', 'au': '/ɔː/', 'aw': '/ɔː/',
    'th': '/θ/', 'sh': '/ʃ/', 'ch': '/tʃ/', 'ph': '/f/',
    'ck': '/k/', 'ng': '/ŋ/', 'wh': '/w/', 'wr': '/r/',
    'kn': '/n/', 'gh': '/g/', 'tion': '/ʃən/', 'sion': '/ʒən/',
    'ight': '/aɪt/', 'ough': '/ɔː/', 'ous': '/əs/'
};

function getPhonetic(word) {
    let result = word.toLowerCase();
    // Replace longer patterns first
    const sorted = Object.entries(PHONETIC_MAP).sort((a, b) => b[0].length - a[0].length);
    for (const [pattern, ipa] of sorted) {
        result = result.replaceAll(pattern, ` ${ipa} `);
    }
    // Clean up remaining letters
    result = result.replace(/\s+/g, ' ').trim();
    return `[ ${result} ]`;
}

// ===== Text-to-Speech =====
function speakWord(text) {
    const word = text || wordText.textContent;
    if (!word || word === 'Loading...') return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1;

    // Try to find an English voice
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en'));
    if (enVoice) utterance.voice = enVoice;

    speakBtn.classList.add('speaking');
    utterance.onend = () => speakBtn.classList.remove('speaking');
    utterance.onerror = () => speakBtn.classList.remove('speaking');

    window.speechSynthesis.speak(utterance);
}

// ===== Start App =====
document.addEventListener('DOMContentLoaded', init);
