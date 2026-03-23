// ===== Phrases Module (IIFE to avoid global conflicts) =====
(function() {
'use strict';

// State
let phrasesData = null;
let phrasesProgress = {};
let currentCategory = null;
let currentLevel = null;
let selectedFilterLevel = 'all';
let practiceQueue = [];
let pIdx = 0;
let pCorrect = 0;
let pWrong = 0;
let currentMode = 'mc'; // 'mc' or 'typing'
let currentDirection = 'en-to-vi';
let hintLevel = 0;
let hintPenalty = 0;
let speechRate = 1.0;
let favMode = false;

// DOM refs (lazy)
const phrasesHubScreen = document.getElementById('phrases-hub-screen');
const phrasesPracticeScreen = document.getElementById('phrases-practice-screen');
const phrasesResultScreen = document.getElementById('phrases-result-screen');
const phrasesFavScreen = document.getElementById('phrases-favorites-screen');

// ===== Init =====
async function initPhrases() {
    if (!phrasesData) {
        try {
            const res = await fetch('phrases.json');
            phrasesData = await res.json();
        } catch (e) {
            console.error('Failed to load phrases.json', e);
            return;
        }
    }
    loadPhrasesProgress();
    attachPhrasesEvents();
    showPhrasesHub();
    showScreen(phrasesHubScreen);
}

let phrasesEventsAttached = false;
function attachPhrasesEvents() {
    if (phrasesEventsAttached) return;
    phrasesEventsAttached = true;

    // Hub
    document.getElementById('phrases-hub-back-btn').addEventListener('click', () => showScreen(document.getElementById('start-screen')));
    document.getElementById('phrases-fav-btn').addEventListener('click', showFavorites);

    // Level filter
    document.querySelectorAll('#phrases-level-filter .level-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#phrases-level-filter .level-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedFilterLevel = btn.dataset.level;
            renderCategories();
        });
    });

    // Practice
    document.getElementById('phrases-practice-back-btn').addEventListener('click', () => showScreen(phrasesHubScreen));
    document.querySelectorAll('#phrases-options .option-btn').forEach(btn => {
        btn.addEventListener('click', () => selectMCOption(btn));
    });
    document.getElementById('phrases-submit-btn').addEventListener('click', submitTyping);
    document.getElementById('phrases-typing-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.stopPropagation(); submitTyping(); }
    });
    document.getElementById('phrases-next-btn').addEventListener('click', nextPhrase);
    document.getElementById('phrases-hint-btn').addEventListener('click', showHint);
    document.getElementById('phrases-speak-btn').addEventListener('click', () => speakPhrase());
    document.getElementById('phrases-speed-normal').addEventListener('click', () => setSpeechRate(1.0));
    document.getElementById('phrases-speed-slow').addEventListener('click', () => setSpeechRate(0.6));
    document.getElementById('phrases-bookmark-btn').addEventListener('click', toggleBookmark);

    // Result
    document.getElementById('phrases-result-next-btn').addEventListener('click', onPhrasesResultNext);
    document.getElementById('phrases-result-hub-btn').addEventListener('click', () => {
        showPhrasesHub();
        showScreen(phrasesHubScreen);
    });

    // Favorites
    document.getElementById('phrases-fav-back-btn').addEventListener('click', () => {
        showPhrasesHub();
        showScreen(phrasesHubScreen);
    });
    document.getElementById('phrases-fav-practice-btn').addEventListener('click', startFavPractice);

    // Keyboard
    document.addEventListener('keydown', handlePhrasesKeyboard);
}

function handlePhrasesKeyboard(e) {
    if (!phrasesPracticeScreen.classList.contains('active')) return;
    // Block keyboard when typing mode input is visible (even if disabled after submit)
    const typingInput = document.getElementById('phrases-typing-input');
    const typingArea = document.getElementById('phrases-typing-area');
    if (currentMode === 'typing' && typingArea.style.display !== 'none') {
        // Only allow Enter/Space for next button when input is disabled (already submitted)
        if (e.key === 'Enter' || e.key === ' ') {
            if (typingInput.disabled) {
                const nextBtn = document.getElementById('phrases-next-btn');
                if (!nextBtn.disabled) { e.preventDefault(); nextPhrase(); }
            }
        }
        return;
    }

    if (currentMode === 'mc') {
        if (e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            const btns = document.querySelectorAll('#phrases-options .option-btn');
            const idx = parseInt(e.key) - 1;
            if (btns[idx] && !btns[idx].disabled) btns[idx].click();
        }
    }
    if (e.key === 'Enter' || e.key === ' ') {
        const nextBtn = document.getElementById('phrases-next-btn');
        if (!nextBtn.disabled) { e.preventDefault(); nextPhrase(); }
    }
}

// ===== Progress =====
function loadPhrasesProgress() {
    try {
        const saved = localStorage.getItem('ep_phrases_progress');
        if (saved) phrasesProgress = JSON.parse(saved);
    } catch (e) {}
    if (!phrasesProgress.categories) phrasesProgress.categories = {};
    if (!phrasesProgress.favorites) phrasesProgress.favorites = [];
    if (!phrasesProgress.stats) phrasesProgress.stats = { currentStreak: 0, longestStreak: 0, totalPracticed: 0, totalCorrect: 0, lastPracticeDate: '' };
    if (phrasesProgress.settings && phrasesProgress.settings.speechRate) speechRate = phrasesProgress.settings.speechRate;
}

function savePhrasesProgress() {
    if (!phrasesProgress.settings) phrasesProgress.settings = {};
    phrasesProgress.settings.speechRate = speechRate;
    localStorage.setItem('ep_phrases_progress', JSON.stringify(phrasesProgress));
}

function getCatLevelProgress(catId, level) {
    if (!phrasesProgress.categories[catId]) phrasesProgress.categories[catId] = {};
    if (!phrasesProgress.categories[catId][level]) {
        phrasesProgress.categories[catId][level] = { completed: false, bestAccuracy: 0, totalAttempts: 0, totalCorrect: 0, wrongPhraseIds: [] };
    }
    return phrasesProgress.categories[catId][level];
}

function isLevelUnlocked(catId, level) {
    if (level === 'A1') return true;
    const levels = ['A1', 'A2', 'B1', 'B2'];
    const idx = levels.indexOf(level);
    if (idx <= 0) return true;
    const prev = levels[idx - 1];
    const prog = getCatLevelProgress(catId, prev);
    return prog.completed && prog.bestAccuracy >= 70;
}

// ===== Hub =====
function showPhrasesHub() {
    renderStatsBar();
    renderCategories();
}

function renderStatsBar() {
    const s = phrasesProgress.stats;
    updateStreak();
    const bar = document.getElementById('phrases-stats-bar');
    const total = phrasesData ? phrasesData.phrases.length : 0;
    const acc = s.totalPracticed > 0 ? Math.round((s.totalCorrect / s.totalPracticed) * 100) : 0;
    bar.innerHTML = `
        <span class="streak-badge">${s.currentStreak > 0 ? '🔥 ' + s.currentStreak + ' ngày' : '📅 Bắt đầu streak!'}</span>
        <span>${s.totalPracticed} câu đã luyện</span>
        <span>${acc}% chính xác</span>
    `;
}

function updateStreak() {
    const s = phrasesProgress.stats;
    const today = new Date().toISOString().split('T')[0];
    if (s.lastPracticeDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (s.lastPracticeDate === yesterday) {
        // streak continues
    } else if (s.lastPracticeDate && s.lastPracticeDate !== today) {
        s.currentStreak = 0;
    }
}

function renderCategories() {
    const container = document.getElementById('phrases-categories');
    const cats = phrasesData.categories;
    const levels = ['A1', 'A2', 'B1', 'B2'];

    container.innerHTML = cats.map(cat => {
        const catPhrases = phrasesData.phrases.filter(p => p.category === cat.id);
        const filteredPhrases = selectedFilterLevel === 'all' ? catPhrases : catPhrases.filter(p => p.level === selectedFilterLevel);

        if (filteredPhrases.length === 0) return '';

        // Count completed
        let completedCount = 0;
        let totalCount = 0;
        const levelBadges = levels.map(lv => {
            const lvPhrases = catPhrases.filter(p => p.level === lv);
            if (lvPhrases.length === 0) return '';
            totalCount += lvPhrases.length;
            const prog = getCatLevelProgress(cat.id, lv);
            const unlocked = isLevelUnlocked(cat.id, lv);
            if (prog.completed) completedCount += lvPhrases.length;
            const cls = prog.completed ? 'completed' : (unlocked ? 'current' : 'locked');
            return `<span class="category-level-badge ${cls}">${lv}</span>`;
        }).join('');

        const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        // Determine which level to start
        let targetLevel = selectedFilterLevel !== 'all' ? selectedFilterLevel : null;
        if (!targetLevel) {
            for (const lv of levels) {
                if (isLevelUnlocked(cat.id, lv) && !getCatLevelProgress(cat.id, lv).completed) {
                    targetLevel = lv;
                    break;
                }
            }
            if (!targetLevel) targetLevel = 'A1';
        }

        const locked = !isLevelUnlocked(cat.id, targetLevel);

        return `
            <div class="category-card ${locked ? 'locked' : ''}" data-cat="${cat.id}" data-level="${targetLevel}">
                <div class="category-icon">${cat.icon}</div>
                <div class="category-info">
                    <div class="category-name">${cat.name.vi}</div>
                    <div class="category-count">${filteredPhrases.length} câu ${locked ? '(khóa)' : ''}</div>
                    <div class="category-progress-bar"><div class="category-progress-fill" style="width:${pct}%"></div></div>
                    <div class="category-levels">${levelBadges}</div>
                </div>
            </div>
        `;
    }).join('');

    // Click handlers
    container.querySelectorAll('.category-card:not(.locked)').forEach(card => {
        card.addEventListener('click', () => {
            currentCategory = card.dataset.cat;
            currentLevel = card.dataset.level;
            favMode = false;
            startPhrasesPractice();
        });
    });
}

// ===== Practice =====
function startPhrasesPractice() {
    pIdx = 0;
    pCorrect = 0;
    pWrong = 0;
    hintPenalty = 0;

    const pool = favMode
        ? phrasesData.phrases.filter(p => phrasesProgress.favorites.includes(p.id))
        : phrasesData.phrases.filter(p => p.category === currentCategory && p.level === currentLevel);

    if (pool.length === 0) {
        alert('Không có câu nào để luyện tập!');
        return;
    }

    // Prioritize wrong phrases
    const prog = favMode ? null : getCatLevelProgress(currentCategory, currentLevel);
    const wrongIds = new Set(prog ? prog.wrongPhraseIds : []);
    const wrong = pool.filter(p => wrongIds.has(p.id));
    const other = pool.filter(p => !wrongIds.has(p.id));
    shuffleArr(wrong);
    shuffleArr(other);

    practiceQueue = [...wrong, ...other].slice(0, 15);
    shuffleArr(practiceQueue);

    showScreen(phrasesPracticeScreen);
    showPhraseExercise();
}

function showPhraseExercise() {
    if (pIdx >= practiceQueue.length) {
        showPhrasesResults();
        return;
    }

    const phrase = practiceQueue[pIdx];
    const total = practiceQueue.length;

    // Counter
    document.getElementById('phrases-counter').textContent = `${pIdx + 1} / ${total}`;
    document.getElementById('phrases-progress-bar-practice').style.width = `${((pIdx + 1) / total) * 100}%`;
    document.getElementById('phrases-correct').textContent = pCorrect;
    document.getElementById('phrases-wrong').textContent = pWrong;

    // Decide mode and direction
    const wordCount = phrase.en.split(/\s+/).length;
    currentMode = Math.random() < (wordCount > 8 ? 0.3 : 0.5) ? 'typing' : 'mc';
    currentDirection = Math.random() < 0.5 ? 'en-to-vi' : 'vi-to-en';

    // Direction badge
    const badge = document.getElementById('phrases-direction-badge');
    badge.textContent = currentDirection === 'en-to-vi' ? 'Dịch sang tiếng Việt' : 'Dịch sang tiếng Anh';

    // Question text
    const questionText = currentDirection === 'en-to-vi' ? phrase.en : phrase.vi;
    document.getElementById('phrases-question-text').textContent = questionText;

    // TTS - show speak controls only for English
    const speakRow = document.querySelector('.phrases-speak-row');
    if (currentDirection === 'en-to-vi') {
        speakRow.style.display = 'flex';
        speakPhrase(phrase.en);
    } else {
        speakRow.style.display = 'none';
    }

    // Bookmark
    const bmBtn = document.getElementById('phrases-bookmark-btn');
    bmBtn.classList.toggle('active', phrasesProgress.favorites.includes(phrase.id));

    // Speed buttons
    document.getElementById('phrases-speed-normal').classList.toggle('active', speechRate === 1.0);
    document.getElementById('phrases-speed-slow').classList.toggle('active', speechRate === 0.6);

    // Show correct area
    const mcArea = document.getElementById('phrases-mc-area');
    const typingArea = document.getElementById('phrases-typing-area');

    if (currentMode === 'mc') {
        mcArea.style.display = '';
        typingArea.style.display = 'none';
        setupMCOptions(phrase);
    } else {
        mcArea.style.display = 'none';
        typingArea.style.display = '';
        setupTyping();
    }

    // Reset feedback
    document.getElementById('phrases-feedback').textContent = '';
    document.getElementById('phrases-feedback').className = 'feedback';
    document.getElementById('phrases-correct-answer').style.display = 'none';
    document.getElementById('phrases-next-btn').disabled = true;

    // Reset hint
    hintLevel = 0;
    document.getElementById('phrases-hint-text').textContent = '';
    document.getElementById('phrases-hint-btn').disabled = false;
}

// ===== Multiple Choice =====
function setupMCOptions(phrase) {
    const correctText = currentDirection === 'en-to-vi' ? phrase.vi : phrase.en;
    const options = [correctText];
    const sameLevel = phrasesData.phrases.filter(p => p.level === phrase.level && p.id !== phrase.id);
    shuffleArr(sameLevel);

    for (const p of sameLevel) {
        if (options.length >= 4) break;
        const text = currentDirection === 'en-to-vi' ? p.vi : p.en;
        if (!options.includes(text)) options.push(text);
    }

    shuffleArr(options);

    const btns = document.querySelectorAll('#phrases-options .option-btn');
    btns.forEach((btn, i) => {
        btn.textContent = options[i] || '';
        btn.dataset.value = options[i] || '';
        btn.className = 'option-btn';
        btn.disabled = false;
        btn.style.display = options[i] ? '' : 'none';
    });
}

function selectMCOption(btn) {
    if (btn.disabled) return;
    const phrase = practiceQueue[pIdx];
    const correct = currentDirection === 'en-to-vi' ? phrase.vi : phrase.en;
    const isCorrect = btn.dataset.value === correct;

    const btns = document.querySelectorAll('#phrases-options .option-btn');

    if (isCorrect) {
        btn.classList.add('correct');
        if (typeof SFX !== 'undefined') SFX.correct();
        btns.forEach(b => b.disabled = true);
        pCorrect++;
        showPhrasesFeedback('correct');
        // Play EN audio on VI->EN after correct
        if (currentDirection === 'vi-to-en') speakPhrase(phrase.en);
    } else {
        btn.classList.add('wrong');
        if (typeof SFX !== 'undefined') SFX.wrong();
        btn.disabled = true;
        pWrong++;
        showPhrasesFeedback('wrong', correct);
        // Show correct answer
        btns.forEach(b => {
            if (b.dataset.value === correct) b.classList.add('correct');
            b.disabled = true;
        });
        trackWrongPhrase(phrase.id);
    }

    document.getElementById('phrases-next-btn').disabled = false;
}

// ===== Typing =====
function setupTyping() {
    const input = document.getElementById('phrases-typing-input');
    input.value = '';
    input.className = 'typing-input';
    input.disabled = false;
    input.placeholder = currentDirection === 'en-to-vi' ? 'Nhập bản dịch tiếng Việt...' : 'Type the English translation...';
    document.getElementById('phrases-submit-btn').disabled = false;
    setTimeout(() => input.focus(), 100);
}

function submitTyping() {
    const input = document.getElementById('phrases-typing-input');
    const userText = input.value.trim();
    if (!userText) return;

    const phrase = practiceQueue[pIdx];
    const correct = currentDirection === 'en-to-vi' ? phrase.vi : phrase.en;
    const result = checkTypingAnswer(userText, correct);

    input.disabled = true;
    document.getElementById('phrases-submit-btn').disabled = true;

    if (result === 'correct') {
        input.classList.add('correct');
        if (typeof SFX !== 'undefined') SFX.correct();
        pCorrect++;
        showPhrasesFeedback('correct');
        if (currentDirection === 'vi-to-en') speakPhrase(phrase.en);
    } else if (result === 'close') {
        input.classList.add('close');
        if (typeof SFX !== 'undefined') SFX.correct();
        pCorrect++; // still counts
        showPhrasesFeedback('close', correct);
    } else {
        input.classList.add('wrong');
        if (typeof SFX !== 'undefined') SFX.wrong();
        pWrong++;
        showPhrasesFeedback('wrong', correct);
        trackWrongPhrase(phrase.id);
    }

    document.getElementById('phrases-next-btn').disabled = false;
}

function checkTypingAnswer(userInput, correctAnswer) {
    const normUser = normalizeText(userInput);
    const normCorrect = normalizeText(correctAnswer);

    if (normUser === normCorrect) return 'correct';

    // Levenshtein
    const threshold = correctAnswer.length > 30 ? 4 : correctAnswer.length > 15 ? 3 : 2;
    if (levenshteinDistance(normUser, normCorrect) <= threshold) return 'close';

    // Word match
    const userWords = normUser.split(' ').filter(Boolean);
    const correctWords = normCorrect.split(' ').filter(Boolean);
    const matchCount = userWords.filter(w => correctWords.includes(w)).length;
    const ratio = matchCount / Math.max(userWords.length, correctWords.length);
    if (ratio >= 0.75) return 'close';

    return 'wrong';
}

function normalizeText(text) {
    return text.toLowerCase().trim()
        .replace(/[.!?,;:"""''…]+/g, '')
        .replace(/\s+/g, ' ')
        // Vietnamese diacritics: strip for comparison
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC')
        // English contractions
        .replace(/n't/g, ' not').replace(/'re/g, ' are')
        .replace(/'s/g, ' is').replace(/'m/g, ' am')
        .replace(/'ll/g, ' will').replace(/'ve/g, ' have')
        .replace(/'d/g, ' would');
}

function levenshteinDistance(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
        }
    }
    return dp[m][n];
}

// ===== Hint =====
function showHint() {
    const phrase = practiceQueue[pIdx];
    const answer = currentDirection === 'en-to-vi' ? phrase.vi : phrase.en;
    const words = answer.split(' ');
    let hint = '';

    if (hintLevel === 0) {
        hint = words[0][0] + '... (' + words.length + ' từ)';
    } else if (hintLevel === 1) {
        hint = words.map((w, i) => i === 0 ? w : w[0] + '...').join(' ');
    } else if (hintLevel === 2) {
        hint = answer.substring(0, Math.ceil(answer.length * 0.6)) + '...';
    } else {
        hint = answer;
        document.getElementById('phrases-hint-btn').disabled = true;
    }

    hintLevel++;
    hintPenalty += 0.25;
    document.getElementById('phrases-hint-text').textContent = hint;
}

// ===== Feedback =====
function showPhrasesFeedback(result, correctAnswer) {
    const fb = document.getElementById('phrases-feedback');
    const ca = document.getElementById('phrases-correct-answer');

    if (result === 'correct') {
        fb.textContent = 'Chính xác!';
        fb.className = 'feedback correct';
        ca.style.display = 'none';
    } else if (result === 'close') {
        fb.textContent = 'Gần đúng!';
        fb.className = 'feedback close';
        ca.innerHTML = 'Đáp án: <strong>' + correctAnswer + '</strong>';
        ca.style.display = '';
    } else {
        fb.textContent = 'Sai rồi!';
        fb.className = 'feedback wrong';
        ca.innerHTML = 'Đáp án: <strong>' + correctAnswer + '</strong>';
        ca.style.display = '';
    }
}

function trackWrongPhrase(phraseId) {
    if (favMode) return;
    const prog = getCatLevelProgress(currentCategory, currentLevel);
    if (!prog.wrongPhraseIds.includes(phraseId)) {
        prog.wrongPhraseIds.push(phraseId);
        savePhrasesProgress();
    }
}

// ===== Next =====
function nextPhrase() {
    pIdx++;
    hintLevel = 0;
    hintPenalty = 0;
    showPhraseExercise();
}

// ===== TTS =====
const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

function speakPhrase(text) {
    if (!text && practiceQueue[pIdx]) text = practiceQueue[pIdx].en;
    if (!text) return;

    window.speechSynthesis.cancel();

    const doSpeak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        // On mobile, adjust rate slightly for clearer output
        const mobileAdjust = isMobileDevice ? 0.95 : 1;
        utterance.rate = speechRate * mobileAdjust;
        utterance.pitch = 1;
        utterance.volume = 1;

        if (typeof getBestEnglishVoice === 'function') {
            const voice = getBestEnglishVoice();
            if (voice) utterance.voice = voice;
        }

        const btn = document.getElementById('phrases-speak-btn');
        if (btn) {
            btn.classList.add('speaking');
            utterance.onend = () => btn.classList.remove('speaking');
            utterance.onerror = () => btn.classList.remove('speaking');
        }

        window.speechSynthesis.speak(utterance);
    };

    // Chrome Android: delay after cancel() to prevent garbled audio
    if (isMobileDevice) {
        setTimeout(doSpeak, 80);
    } else {
        doSpeak();
    }
}

function setSpeechRate(rate) {
    speechRate = rate;
    document.getElementById('phrases-speed-normal').classList.toggle('active', rate === 1.0);
    document.getElementById('phrases-speed-slow').classList.toggle('active', rate === 0.6);
    savePhrasesProgress();
    // Re-speak if current phrase is English
    if (currentDirection === 'en-to-vi' && practiceQueue[pIdx]) {
        speakPhrase(practiceQueue[pIdx].en);
    }
}

// ===== Bookmark =====
function toggleBookmark() {
    const phrase = practiceQueue[pIdx];
    if (!phrase) return;
    const idx = phrasesProgress.favorites.indexOf(phrase.id);
    if (idx >= 0) {
        phrasesProgress.favorites.splice(idx, 1);
    } else {
        phrasesProgress.favorites.push(phrase.id);
    }
    document.getElementById('phrases-bookmark-btn').classList.toggle('active', phrasesProgress.favorites.includes(phrase.id));
    savePhrasesProgress();
}

// ===== Results =====
function showPhrasesResults() {
    const total = pCorrect + pWrong;
    const accuracy = total > 0 ? Math.round((pCorrect / total) * 100) : 0;

    document.getElementById('phrases-result-correct').textContent = pCorrect;
    document.getElementById('phrases-result-wrong').textContent = pWrong;
    document.getElementById('phrases-result-accuracy').textContent = accuracy + '%';

    const icon = document.getElementById('phrases-result-icon');
    const title = document.getElementById('phrases-result-title');
    const msg = document.getElementById('phrases-result-message');
    const nextBtn = document.getElementById('phrases-result-next-btn');
    const subtitle = document.getElementById('phrases-result-subtitle');

    if (favMode) {
        subtitle.textContent = 'Luyện tập câu yêu thích';
    } else {
        const cat = phrasesData.categories.find(c => c.id === currentCategory);
        subtitle.textContent = (cat ? cat.name.vi : '') + ' - ' + currentLevel;
    }

    if (accuracy >= 90) {
        icon.textContent = '🎉';
        title.textContent = 'Xuất sắc!';
        msg.textContent = 'Bạn nắm rất vững phần này!';
    } else if (accuracy >= 70) {
        icon.textContent = '💪';
        title.textContent = 'Tốt lắm!';
        msg.textContent = 'Bạn đã vượt qua bài kiểm tra!';
    } else {
        icon.textContent = '📖';
        title.textContent = 'Cần luyện thêm!';
        msg.textContent = 'Đạt 70% để mở khóa level tiếp theo.';
    }

    // Update progress
    if (!favMode) {
        const prog = getCatLevelProgress(currentCategory, currentLevel);
        prog.totalAttempts += total;
        prog.totalCorrect += pCorrect;
        if (accuracy >= 70) {
            prog.completed = true;
            // Remove wrong phrases that were answered correctly this time
            prog.wrongPhraseIds = prog.wrongPhraseIds.filter(id =>
                practiceQueue.some(p => p.id === id) ? false : true
            );
        }
        if (accuracy > prog.bestAccuracy) prog.bestAccuracy = accuracy;
    }

    // Stats
    const s = phrasesProgress.stats;
    const today = new Date().toISOString().split('T')[0];
    s.totalPracticed += pCorrect + pWrong;
    s.totalCorrect += pCorrect;
    if (s.lastPracticeDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (s.lastPracticeDate === yesterday) {
            s.currentStreak++;
        } else {
            s.currentStreak = 1;
        }
        if (s.currentStreak > s.longestStreak) s.longestStreak = s.currentStreak;
        s.lastPracticeDate = today;
    }

    savePhrasesProgress();

    // Button
    if (accuracy >= 70 && !favMode) {
        nextBtn.textContent = 'Tiếp tục';
    } else {
        nextBtn.textContent = 'Thử lại';
    }

    showScreen(phrasesResultScreen);
}

function onPhrasesResultNext() {
    const prog = favMode ? null : getCatLevelProgress(currentCategory, currentLevel);
    if (prog && prog.completed) {
        // Move to next level or back to hub
        const levels = ['A1', 'A2', 'B1', 'B2'];
        const idx = levels.indexOf(currentLevel);
        if (idx < levels.length - 1) {
            const nextLv = levels[idx + 1];
            const has = phrasesData.phrases.some(p => p.category === currentCategory && p.level === nextLv);
            if (has) {
                currentLevel = nextLv;
                startPhrasesPractice();
                return;
            }
        }
    }
    if (favMode) {
        showFavorites();
        showScreen(phrasesFavScreen);
    } else {
        startPhrasesPractice(); // retry
    }
}

// ===== Favorites =====
function showFavorites() {
    const list = document.getElementById('phrases-fav-list');
    const practiceBtn = document.getElementById('phrases-fav-practice-btn');
    const favIds = phrasesProgress.favorites;

    document.getElementById('phrases-fav-count').textContent = favIds.length;

    if (favIds.length === 0) {
        list.innerHTML = '<div class="phrases-fav-empty">Chưa có câu yêu thích nào.<br>Bấm ⭐ khi luyện tập để thêm.</div>';
        practiceBtn.style.display = 'none';
    } else {
        const phrases = favIds.map(id => phrasesData.phrases.find(p => p.id === id)).filter(Boolean);
        list.innerHTML = phrases.map(p => `
            <div class="fav-card" data-id="${p.id}">
                <div class="fav-card-text">
                    <div class="fav-card-en">${p.en}</div>
                    <div class="fav-card-vi">${p.vi}</div>
                </div>
                <div class="fav-card-actions">
                    <button class="fav-speak-btn" title="Phát âm">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    </button>
                    <button class="fav-remove-btn" title="Xóa">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            </div>
        `).join('');

        // Attach events
        list.querySelectorAll('.fav-speak-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const card = btn.closest('.fav-card');
                const phrase = phrasesData.phrases.find(p => p.id === card.dataset.id);
                if (phrase) speakPhrase(phrase.en);
            });
        });
        list.querySelectorAll('.fav-remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const card = btn.closest('.fav-card');
                phrasesProgress.favorites = phrasesProgress.favorites.filter(id => id !== card.dataset.id);
                savePhrasesProgress();
                showFavorites();
            });
        });

        practiceBtn.style.display = '';
        practiceBtn.textContent = `Luyện tập (${phrases.length} câu)`;
    }

    showScreen(phrasesFavScreen);
}

function startFavPractice() {
    favMode = true;
    startPhrasesPractice();
}

// ===== Home Stat =====
function updatePhrasesHomeStat() {
    if (!phrasesData) return;
    const total = phrasesData.phrases.length;
    let practiced = 0;
    for (const catId in phrasesProgress.categories) {
        for (const lv in phrasesProgress.categories[catId]) {
            const prog = phrasesProgress.categories[catId][lv];
            if (prog.completed) {
                practiced += phrasesData.phrases.filter(p => p.category === catId && p.level === lv).length;
            }
        }
    }
    const pct = total > 0 ? Math.round((practiced / total) * 100) : 0;
    const bar = document.getElementById('phrases-progress-bar');
    if (bar) bar.style.width = pct + '%';
    const stat = document.getElementById('phrases-stat');
    if (stat) stat.textContent = `${practiced} / ${total} câu`;
}

// ===== Utility =====
function shuffleArr(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// Expose to global scope
window.initPhrases = initPhrases;
window.updatePhrasesHomeStat = updatePhrasesHomeStat;
window.normalizeText = normalizeText;
window.levenshteinDistance = levenshteinDistance;

})();
