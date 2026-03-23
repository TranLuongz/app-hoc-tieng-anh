(function () {
'use strict';

// ===== State =====
let storiesData = null;
let gameProgress = {};
let currentStory = null;
let currentNodeId = null;
let sessionVocab = [];
let sessionScore = 0;
let sessionNodesVisited = 0;
let totalNodesEstimate = 0;
let typewriterTimer = null;
let typewriterDone = false;
let gameInitialized = false;

// ===== DOM Refs =====
const startScreen = document.getElementById('start-screen');
const gameHubScreen = document.getElementById('game-hub-screen');
const storySelectScreen = document.getElementById('story-select-screen');
const storyPlayScreen = document.getElementById('story-play-screen');
const storyResultScreen = document.getElementById('story-result-screen');

// ===== Init =====
window.initGame = async function () {
    if (!storiesData) {
        const res = await fetch('stories.json');
        storiesData = await res.json();
    }
    loadGameProgress();
    if (!gameInitialized) {
        attachGameEvents();
        gameInitialized = true;
    }
    showGameHub();
};

// ===== localStorage =====
function loadGameProgress() {
    const saved = localStorage.getItem('eg_game_progress');
    if (saved) {
        try { gameProgress = JSON.parse(saved); } catch (e) { gameProgress = {}; }
    }
}

function saveGameProgress() {
    localStorage.setItem('eg_game_progress', JSON.stringify(gameProgress));
}

// ===== Events =====
function attachGameEvents() {
    document.getElementById('game-hub-back-btn').addEventListener('click', () => {
        showScreen(startScreen);
        updateGameHomeStat();
    });

    document.getElementById('story-select-back-btn').addEventListener('click', showGameHub);

    document.getElementById('story-play-back-btn').addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn thoát? Tiến trình lượt chơi này sẽ mất.')) {
            clearTypewriter();
            showStorySelect();
        }
    });

    document.getElementById('story-translate-btn').addEventListener('click', toggleTranslation);
    document.getElementById('story-speak-btn').addEventListener('click', speakStoryText);

    document.getElementById('story-replay-btn').addEventListener('click', () => {
        if (currentStory) startStory(currentStory.id);
    });

    document.getElementById('story-back-list-btn').addEventListener('click', showStorySelect);

    // Level filter
    document.getElementById('story-level-filter').addEventListener('click', (e) => {
        const pill = e.target.closest('.level-pill');
        if (!pill) return;
        document.querySelectorAll('#story-level-filter .level-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        renderStoryList(pill.dataset.level);
    });

    // Click on story scene to skip typewriter
    document.getElementById('story-scene').addEventListener('click', () => {
        if (!typewriterDone && typewriterTimer) {
            skipTypewriter();
        }
    });
}

// ===== Game Hub =====
function showGameHub() {
    const grid = document.getElementById('game-hub-grid');
    const storyProgress = getStoryBuilderProgress();

    grid.innerHTML = `
        <button class="game-type-card story-builder" id="game-story-builder-btn">
            <div class="game-type-icon">📖</div>
            <div class="game-type-info">
                <div class="game-type-title">Story Builder</div>
                <div class="game-type-desc">Xây câu chuyện tương tác — học từ vựng qua lựa chọn rẽ nhánh</div>
                <div class="game-type-stat">${storyProgress.completed} / ${storyProgress.total} truyện đã hoàn thành</div>
            </div>
        </button>
        <button class="game-type-card sentence-auction" id="game-auction-btn">
            <div class="game-type-icon">💰</div>
            <div class="game-type-info">
                <div class="game-type-title">Sentence Auction</div>
                <div class="game-type-desc">Đấu giá câu — đặt cược vào ngữ pháp đúng sai</div>
                <div class="game-type-stat" id="auction-hub-stat">${getAuctionHubStat()}</div>
            </div>
        </button>
    `;

    document.getElementById('game-story-builder-btn').addEventListener('click', showStorySelect);
    document.getElementById('game-auction-btn').addEventListener('click', initAuction);
    showScreen(gameHubScreen);
}

// ===== Story Select =====
function showStorySelect() {
    clearTypewriter();
    renderStoryList('all');
    showScreen(storySelectScreen);
}

function renderStoryList(levelFilter) {
    const list = document.getElementById('story-list');
    const stories = storiesData.stories.filter(s =>
        levelFilter === 'all' || s.level === levelFilter
    );

    list.innerHTML = stories.map(story => {
        const prog = gameProgress[story.id] || { endings: [], bestScore: 0, totalPlays: 0, vocabLearned: [] };
        const endingsFound = prog.endings ? prog.endings.length : 0;
        const bestStars = getBestStars(story, prog);
        const themeLabels = { daily_life: 'Đời sống', travel: 'Du lịch', business: 'Công việc', mystery: 'Bí ẩn', adventure: 'Phiêu lưu' };

        return `
            <button class="story-card" data-story-id="${story.id}">
                <div class="story-card-icon">${story.icon}</div>
                <div class="story-card-info">
                    <div class="story-card-title">${story.title.vi}</div>
                    <div class="story-card-meta">
                        <span class="story-level-badge">${story.level}</span>
                        <span class="story-theme-tag">${themeLabels[story.theme] || story.theme}</span>
                    </div>
                    <div class="story-card-footer">
                        <div class="story-card-stars">
                            ${[1, 2, 3].map(i => `<span class="star ${i <= bestStars ? 'earned' : ''}">⭐</span>`).join('')}
                        </div>
                        <span class="story-card-endings">${endingsFound}/${story.totalEndings} kết thúc</span>
                    </div>
                </div>
            </button>
        `;
    }).join('');

    list.querySelectorAll('.story-card').forEach(card => {
        card.addEventListener('click', () => startStory(card.dataset.storyId));
    });
}

function getBestStars(story, prog) {
    if (!prog.endings || prog.endings.length === 0) return 0;
    let best = 0;
    for (const eid of prog.endings) {
        for (const key in story.nodes) {
            const node = story.nodes[key];
            if (node.ending && node.endingId === eid && node.stars > best) {
                best = node.stars;
            }
        }
    }
    return best;
}

// ===== Start Story =====
function startStory(storyId) {
    currentStory = storiesData.stories.find(s => s.id === storyId);
    if (!currentStory) return;

    currentNodeId = currentStory.startNode;
    sessionVocab = [];
    sessionScore = 0;
    sessionNodesVisited = 0;
    totalNodesEstimate = estimatePathLength(currentStory);

    document.getElementById('story-play-title').textContent = currentStory.title.vi;
    document.getElementById('story-points').textContent = '0';
    document.getElementById('story-progress-bar').style.width = '0%';

    const vocabBar = document.getElementById('story-vocab-bar');
    vocabBar.style.display = 'none';
    document.getElementById('story-vocab-count').textContent = '0';

    renderNode(currentNodeId);
    showScreen(storyPlayScreen);
}

function estimatePathLength(story) {
    // Rough estimate: count non-ending nodes
    let count = 0;
    for (const key in story.nodes) {
        if (!story.nodes[key].ending) count++;
    }
    return Math.max(count / 2, 3);
}

// ===== Render Node =====
function renderNode(nodeId) {
    clearTypewriter();
    const node = currentStory.nodes[nodeId];
    if (!node) return;

    currentNodeId = nodeId;
    sessionNodesVisited++;

    // Update progress bar
    const progress = Math.min((sessionNodesVisited / totalNodesEstimate) * 100, 95);
    document.getElementById('story-progress-bar').style.width = progress + '%';

    // Scene mood
    const scene = document.getElementById('story-scene');
    scene.setAttribute('data-mood', node.mood || 'calm');

    // Scene emoji
    document.getElementById('scene-emoji').textContent = node.sceneEmoji || '';

    // Reset translation
    document.getElementById('story-text-vi').style.display = 'none';
    document.getElementById('story-text-vi').textContent = node.textVi || '';

    // Clear choices
    document.getElementById('story-choices').innerHTML = '';

    // Check if ending
    if (node.ending) {
        typewriterEffect(document.getElementById('story-text'), node.text, 25, () => {
            setTimeout(() => showStoryResult(node), 800);
        });
        return;
    }

    // Typewriter text then show choices
    typewriterEffect(document.getElementById('story-text'), node.text, 25, () => {
        renderChoices(node.choices);
    });
}

// ===== Typewriter Effect =====
function typewriterEffect(element, text, speed, callback) {
    typewriterDone = false;
    element.textContent = '';
    window._typewriterFullText = text;
    window._typewriterElement = element;
    window._typewriterCallback = callback;

    let i = 0;
    // Add cursor
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    element.appendChild(cursor);

    typewriterTimer = setInterval(() => {
        if (i < text.length) {
            element.insertBefore(document.createTextNode(text[i]), cursor);
            i++;
        } else {
            clearInterval(typewriterTimer);
            typewriterTimer = null;
            typewriterDone = true;
            if (cursor.parentNode) cursor.remove();
            if (callback) callback();
        }
    }, speed);
}

function skipTypewriter() {
    if (typewriterTimer) {
        clearInterval(typewriterTimer);
        typewriterTimer = null;
    }
    typewriterDone = true;
    const el = window._typewriterElement;
    const text = window._typewriterFullText;
    const cb = window._typewriterCallback;
    if (el && text) {
        el.textContent = text;
    }
    if (cb) cb();
}

function clearTypewriter() {
    if (typewriterTimer) {
        clearInterval(typewriterTimer);
        typewriterTimer = null;
    }
    typewriterDone = true;
}

// ===== Render Choices =====
function renderChoices(choices) {
    const container = document.getElementById('story-choices');
    container.innerHTML = '';

    choices.forEach((choice, idx) => {
        const btn = document.createElement('button');
        btn.className = 'story-choice-btn';
        btn.textContent = choice.text;
        btn.addEventListener('click', () => selectChoice(idx, choices));
        container.appendChild(btn);
    });
}

// ===== Select Choice =====
function selectChoice(idx, choices) {
    const choice = choices[idx];
    if (!choice) return;

    if (typeof SFX !== 'undefined') SFX.click();

    // Highlight selected
    const btns = document.querySelectorAll('.story-choice-btn');
    btns.forEach((btn, i) => {
        if (i === idx) btn.classList.add('selected');
        btn.style.pointerEvents = 'none';
    });

    // Add vocab
    if (choice.vocab) {
        choice.vocab.forEach(v => {
            if (!sessionVocab.includes(v)) sessionVocab.push(v);
        });
        const vocabBar = document.getElementById('story-vocab-bar');
        vocabBar.style.display = 'flex';
        document.getElementById('story-vocab-count').textContent = sessionVocab.length;
    }

    // Add points
    sessionScore += (choice.points || 0);
    document.getElementById('story-points').textContent = sessionScore;

    // Navigate to next node
    setTimeout(() => {
        renderNode(choice.next);
    }, 600);
}

// ===== TTS =====
function speakStoryText() {
    if (!currentStory || !currentNodeId) return;
    const node = currentStory.nodes[currentNodeId];
    if (!node) return;
    const text = node.text;
    if (!text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
}

// ===== Toggle Translation =====
function toggleTranslation() {
    const vi = document.getElementById('story-text-vi');
    vi.style.display = vi.style.display === 'none' ? 'block' : 'none';
}

// ===== Story Result =====
function showStoryResult(endingNode) {
    // Update progress bar to 100%
    document.getElementById('story-progress-bar').style.width = '100%';

    // Save progress
    if (!gameProgress[currentStory.id]) {
        gameProgress[currentStory.id] = {
            endings: [],
            bestScore: 0,
            totalPlays: 0,
            vocabLearned: [],
            lastPlayed: ''
        };
    }

    const prog = gameProgress[currentStory.id];
    prog.totalPlays++;
    prog.lastPlayed = new Date().toISOString().slice(0, 10);

    if (endingNode.endingId && !prog.endings.includes(endingNode.endingId)) {
        prog.endings.push(endingNode.endingId);
    }

    if (sessionScore > prog.bestScore) {
        prog.bestScore = sessionScore;
    }

    sessionVocab.forEach(v => {
        if (!prog.vocabLearned.includes(v)) prog.vocabLearned.push(v);
    });

    saveGameProgress();

    // Render result
    document.getElementById('story-result-emoji').textContent = endingNode.sceneEmoji || '🌟';
    document.getElementById('story-result-title').textContent = endingNode.endingTitle.vi;
    document.getElementById('story-result-subtitle').textContent = endingNode.endingTitle.en;

    // Stars
    const starsContainer = document.getElementById('story-result-stars');
    const stars = endingNode.stars || 1;
    starsContainer.innerHTML = [1, 2, 3].map(i =>
        `<span class="result-star ${i > stars ? 'empty' : ''}">⭐</span>`
    ).join('');

    // Stats
    document.getElementById('result-score').textContent = sessionScore;
    document.getElementById('result-vocab').textContent = sessionVocab.length;
    document.getElementById('result-endings').textContent =
        `${prog.endings.length}/${currentStory.totalEndings}`;

    // Vocab chips
    const vocabDiv = document.getElementById('story-result-vocab');
    if (sessionVocab.length > 0) {
        vocabDiv.innerHTML = `
            <h4>Từ vựng đã học trong lượt này</h4>
            <div class="vocab-chips">
                ${sessionVocab.map(v => `<span class="vocab-chip">${v}</span>`).join('')}
            </div>
        `;
    } else {
        vocabDiv.innerHTML = '';
    }

    showScreen(storyResultScreen);
}

// ===== Home Stat =====
function getStoryBuilderProgress() {
    if (!storiesData) return { completed: 0, total: 0 };
    const total = storiesData.stories.length;
    let completed = 0;
    storiesData.stories.forEach(s => {
        if (gameProgress[s.id] && gameProgress[s.id].endings && gameProgress[s.id].endings.length > 0) {
            completed++;
        }
    });
    return { completed, total };
}

window.updateGameHomeStat = function () {
    const prog = getStoryBuilderProgress();
    const stat = document.getElementById('game-stat');
    const bar = document.getElementById('game-progress-bar');
    if (stat) stat.textContent = `${prog.completed} / ${prog.total} truyện`;
    if (bar) bar.style.width = prog.total > 0 ? `${(prog.completed / prog.total) * 100}%` : '0%';
};

// Update home stat on page load if data is cached
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('eg_game_progress');
    if (saved) {
        try { gameProgress = JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    // Lazy update after stories load
    fetch('stories.json').then(r => r.json()).then(data => {
        storiesData = data;
        if (typeof window.updateGameHomeStat === 'function') window.updateGameHomeStat();
    }).catch(() => {});
});

// ===================================================================
// =================== SENTENCE AUCTION MODULE =======================
// ===================================================================

// ----- Auction State -----
let auctionData = null;
let auctionProgress = null;
let auctionQuestions = [];
let auctionCurrentIdx = 0;
let auctionCurrentBet = 0;
let auctionSessionCorrect = 0;
let auctionSessionWrong = 0;
let auctionSessionEarned = 0;
let auctionSessionLost = 0;
let auctionIsMission = false;
let auctionEventsAttached = false;
let wordOrderSelected = [];

// ----- Auction DOM Refs -----
const auctionHomeScreen = document.getElementById('auction-home-screen');
const auctionPlayScreen = document.getElementById('auction-play-screen');
const auctionResultScreen = document.getElementById('auction-result-screen');

// ----- Auction localStorage -----
function loadAuctionProgress() {
    const saved = localStorage.getItem('eg_auction_progress');
    if (saved) {
        try { auctionProgress = JSON.parse(saved); } catch (e) { auctionProgress = null; }
    }
    if (!auctionProgress) {
        auctionProgress = {
            coins: 100,
            totalGames: 0,
            totalCorrect: 0,
            totalWrong: 0,
            bestGame: 0,
            lastDailyBonus: '',
            missionsToday: 0,
            lastMissionDate: ''
        };
        saveAuctionProgress();
    }
}

function saveAuctionProgress() {
    localStorage.setItem('eg_auction_progress', JSON.stringify(auctionProgress));
}

function getAuctionHubStat() {
    const saved = localStorage.getItem('eg_auction_progress');
    if (saved) {
        try {
            const p = JSON.parse(saved);
            return `💰 ${p.coins} xu | ${p.totalGames} ván`;
        } catch (e) {}
    }
    return '💰 100 xu';
}

// ----- Init Auction -----
async function initAuction() {
    if (!auctionData) {
        const res = await fetch('auction_questions.json');
        auctionData = await res.json();
    }
    loadAuctionProgress();
    if (!auctionEventsAttached) {
        attachAuctionEvents();
        auctionEventsAttached = true;
    }
    showAuctionHome();
}

// ----- Auction Events -----
function attachAuctionEvents() {
    document.getElementById('auction-home-back-btn').addEventListener('click', showGameHub);
    document.getElementById('auction-play-btn').addEventListener('click', () => startAuctionGame(false));
    document.getElementById('auction-mission-btn').addEventListener('click', () => startAuctionGame(true));

    document.getElementById('auction-play-back-btn').addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn thoát? Tiến trình ván này sẽ mất.')) {
            showAuctionHome();
        }
    });

    document.querySelectorAll('.auction-bet-btn').forEach(btn => {
        btn.addEventListener('click', () => selectBet(parseInt(btn.dataset.bet)));
    });

    document.getElementById('auction-next-btn').addEventListener('click', nextAuctionQuestion);
    document.getElementById('auction-result-play-btn').addEventListener('click', () => startAuctionGame(false));
    document.getElementById('auction-result-back-btn').addEventListener('click', showAuctionHome);
}

// ----- Auction Home -----
function showAuctionHome() {
    loadAuctionProgress();
    checkDailyBonus();

    document.getElementById('auction-coins-amount').textContent = auctionProgress.coins;

    // Daily bonus display
    const bonusDiv = document.getElementById('auction-daily-bonus');
    const today = new Date().toISOString().slice(0, 10);
    if (auctionProgress.lastDailyBonus === today) {
        bonusDiv.innerHTML = '<span class="auction-bonus-claimed">✅ Đã nhận 10 xu hôm nay</span>';
    } else {
        bonusDiv.innerHTML = '';
    }

    // Play button state
    const playBtn = document.getElementById('auction-play-btn');
    if (auctionProgress.coins <= 0) {
        playBtn.disabled = true;
        playBtn.textContent = '🎮 Hết xu — Làm nhiệm vụ để kiếm xu';
    } else {
        playBtn.disabled = false;
        playBtn.textContent = '🎮 Chơi ngay (15 câu)';
    }

    // Mission info
    const missionInfo = document.getElementById('auction-mission-info');
    const missionDate = auctionProgress.lastMissionDate;
    const missionsLeft = missionDate === today ? Math.max(0, 3 - auctionProgress.missionsToday) : 3;
    const missionBtn = document.getElementById('auction-mission-btn');
    if (missionsLeft <= 0) {
        missionBtn.disabled = true;
        missionInfo.textContent = 'Đã hết lượt nhiệm vụ hôm nay (0/3)';
    } else {
        missionBtn.disabled = false;
        missionInfo.textContent = `Còn ${missionsLeft}/3 lượt hôm nay`;
    }

    // Stats
    document.getElementById('auction-stat-games').textContent = auctionProgress.totalGames;
    document.getElementById('auction-stat-correct').textContent = auctionProgress.totalCorrect;
    document.getElementById('auction-stat-wrong').textContent = auctionProgress.totalWrong;
    document.getElementById('auction-stat-best').textContent = auctionProgress.bestGame;

    showScreen(auctionHomeScreen);
}

function checkDailyBonus() {
    const today = new Date().toISOString().slice(0, 10);
    if (auctionProgress.lastDailyBonus !== today) {
        auctionProgress.coins += 10;
        auctionProgress.lastDailyBonus = today;
        saveAuctionProgress();
    }
}

// ----- Start Game / Mission -----
function startAuctionGame(isMission) {
    auctionIsMission = isMission;
    const totalQ = isMission ? 10 : 15;

    // Shuffle and pick questions
    const allQ = [...auctionData.questions];
    for (let i = allQ.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allQ[i], allQ[j]] = [allQ[j], allQ[i]];
    }
    auctionQuestions = allQ.slice(0, totalQ);
    auctionCurrentIdx = 0;
    auctionCurrentBet = 0;
    auctionSessionCorrect = 0;
    auctionSessionWrong = 0;
    auctionSessionEarned = 0;
    auctionSessionLost = 0;

    if (isMission) {
        const today = new Date().toISOString().slice(0, 10);
        if (auctionProgress.lastMissionDate !== today) {
            auctionProgress.missionsToday = 0;
            auctionProgress.lastMissionDate = today;
        }
        auctionProgress.missionsToday++;
        saveAuctionProgress();
    }

    document.getElementById('auction-play-coins').textContent = auctionProgress.coins;
    showAuctionQuestion();
    showScreen(auctionPlayScreen);
}

// ----- Show Question -----
function showAuctionQuestion() {
    const q = auctionQuestions[auctionCurrentIdx];
    const total = auctionQuestions.length;

    document.getElementById('auction-play-progress').textContent = `${auctionCurrentIdx + 1}/${total}`;
    document.getElementById('auction-progress-bar').style.width = `${((auctionCurrentIdx) / total) * 100}%`;
    document.getElementById('auction-play-coins').textContent = auctionProgress.coins;

    // Reset areas
    document.getElementById('auction-feedback').style.display = 'none';
    document.getElementById('auction-next-btn').style.display = 'none';
    document.getElementById('auction-answer-area').style.display = 'none';
    document.getElementById('auction-answer-area').innerHTML = '';

    // Render question
    const area = document.getElementById('auction-question-area');
    switch (q.type) {
        case 'grammar_check': renderGrammarQuestion(area, q); break;
        case 'fill_blank': renderFillBlankQuestion(area, q); break;
        case 'word_order': renderWordOrderQuestion(area, q); break;
        case 'translation_check': renderTranslationQuestion(area, q); break;
    }

    // Show bet area (not for missions)
    const betArea = document.getElementById('auction-bet-area');
    if (auctionIsMission) {
        betArea.style.display = 'none';
        auctionCurrentBet = 1; // mission: 1 xu per correct
        showAnswerArea();
    } else {
        betArea.style.display = 'block';
        auctionCurrentBet = 0;
        // Disable bet buttons that exceed coins
        document.querySelectorAll('.auction-bet-btn').forEach(btn => {
            const val = parseInt(btn.dataset.bet);
            btn.disabled = val > auctionProgress.coins;
            btn.classList.remove('selected');
        });
    }
}

function selectBet(amount) {
    if (amount > auctionProgress.coins) return;
    auctionCurrentBet = amount;
    if (typeof SFX !== 'undefined') SFX.click();

    document.querySelectorAll('.auction-bet-btn').forEach(btn => {
        btn.classList.toggle('selected', parseInt(btn.dataset.bet) === amount);
    });

    // Show answer area after betting
    showAnswerArea();
}

function showAnswerArea() {
    const q = auctionQuestions[auctionCurrentIdx];
    const answerArea = document.getElementById('auction-answer-area');
    answerArea.style.display = 'block';

    switch (q.type) {
        case 'grammar_check': renderGrammarAnswer(answerArea); break;
        case 'fill_blank': renderFillBlankAnswer(answerArea, q); break;
        case 'word_order': renderWordOrderAnswer(answerArea); break;
        case 'translation_check': renderTranslationAnswer(answerArea); break;
    }
}

// ----- Render: Grammar Check -----
function renderGrammarQuestion(area, q) {
    area.innerHTML = `
        <div class="auction-q-type">Ngữ pháp đúng hay sai?</div>
        <div class="auction-q-sentence">"${q.sentence}"</div>
    `;
}

function renderGrammarAnswer(area) {
    area.innerHTML = `
        <div class="auction-answer-btns">
            <button class="auction-ans-btn auction-ans-correct" data-answer="true">✅ Đúng</button>
            <button class="auction-ans-btn auction-ans-wrong" data-answer="false">❌ Sai</button>
        </div>
    `;
    area.querySelectorAll('.auction-ans-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const q = auctionQuestions[auctionCurrentIdx];
            const userAnswer = btn.dataset.answer === 'true';
            submitAuctionAnswer(userAnswer === q.isCorrect, q);
        });
    });
}

// ----- Render: Fill Blank -----
function renderFillBlankQuestion(area, q) {
    area.innerHTML = `
        <div class="auction-q-type">Điền từ vào chỗ trống</div>
        <div class="auction-q-sentence">"${q.sentence}"</div>
    `;
}

function renderFillBlankAnswer(area, q) {
    const shuffled = [...q.options].sort(() => Math.random() - 0.5);
    area.innerHTML = `
        <div class="auction-fill-options">
            ${shuffled.map(opt => `<button class="auction-fill-btn" data-answer="${opt}">${opt}</button>`).join('')}
        </div>
    `;
    area.querySelectorAll('.auction-fill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const isCorrect = btn.dataset.answer === q.correctAnswer;
            submitAuctionAnswer(isCorrect, q);
        });
    });
}

// ----- Render: Word Order -----
function renderWordOrderQuestion(area, q) {
    wordOrderSelected = [];
    area.innerHTML = `
        <div class="auction-q-type">Sắp xếp thành câu đúng</div>
        <div class="auction-word-selected" id="auction-word-selected">
            <span class="auction-word-placeholder">Nhấn vào từ bên dưới...</span>
        </div>
        <div class="auction-word-pool" id="auction-word-pool">
            ${shuffleArray([...q.words]).map(w => `<button class="auction-word-chip" data-word="${w}">${w}</button>`).join('')}
        </div>
        <button class="auction-word-undo-btn" id="auction-word-undo">↩ Xóa từ cuối</button>
    `;

    area.querySelectorAll('.auction-word-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (chip.classList.contains('used')) return;
            chip.classList.add('used');
            wordOrderSelected.push(chip.dataset.word);
            if (typeof SFX !== 'undefined') SFX.click();
            updateWordOrderDisplay();
        });
    });

    document.getElementById('auction-word-undo').addEventListener('click', () => {
        if (wordOrderSelected.length === 0) return;
        const removed = wordOrderSelected.pop();
        // Unmark the chip
        const chips = area.querySelectorAll('.auction-word-chip');
        for (const chip of chips) {
            if (chip.dataset.word === removed && chip.classList.contains('used')) {
                chip.classList.remove('used');
                break;
            }
        }
        updateWordOrderDisplay();
    });
}

function updateWordOrderDisplay() {
    const display = document.getElementById('auction-word-selected');
    if (wordOrderSelected.length === 0) {
        display.innerHTML = '<span class="auction-word-placeholder">Nhấn vào từ bên dưới...</span>';
    } else {
        display.innerHTML = wordOrderSelected.map(w => `<span class="auction-word-tag">${w}</span>`).join(' ');
    }
}

function renderWordOrderAnswer(area) {
    // Word order doesn't need a separate answer area; check is via submit button
    // Add submit button in answer area
    const answerArea = document.getElementById('auction-answer-area');
    answerArea.innerHTML = `
        <button class="btn-primary auction-submit-order-btn" id="auction-submit-order">Kiểm tra câu</button>
    `;
    document.getElementById('auction-submit-order').addEventListener('click', () => {
        const q = auctionQuestions[auctionCurrentIdx];
        const isCorrect = wordOrderSelected.join(' ') === q.correctOrder.join(' ');
        submitAuctionAnswer(isCorrect, q);
    });
}

// ----- Render: Translation Check -----
function renderTranslationQuestion(area, q) {
    area.innerHTML = `
        <div class="auction-q-type">Bản dịch đúng hay sai?</div>
        <div class="auction-q-sentence">"${q.english}"</div>
        <div class="auction-q-translation">${q.vietnamese}</div>
    `;
}

function renderTranslationAnswer(area) {
    area.innerHTML = `
        <div class="auction-answer-btns">
            <button class="auction-ans-btn auction-ans-correct" data-answer="true">✅ Dịch đúng</button>
            <button class="auction-ans-btn auction-ans-wrong" data-answer="false">❌ Dịch sai</button>
        </div>
    `;
    area.querySelectorAll('.auction-ans-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const q = auctionQuestions[auctionCurrentIdx];
            const userAnswer = btn.dataset.answer === 'true';
            submitAuctionAnswer(userAnswer === q.isCorrect, q);
        });
    });
}

// ----- Submit Answer -----
function submitAuctionAnswer(isCorrect, q) {
    // Disable all answer buttons
    document.querySelectorAll('.auction-ans-btn, .auction-fill-btn, .auction-submit-order-btn').forEach(b => {
        b.disabled = true;
        b.style.pointerEvents = 'none';
    });

    const betArea = document.getElementById('auction-bet-area');
    betArea.style.display = 'none';

    const feedback = document.getElementById('auction-feedback');
    feedback.style.display = 'block';

    if (isCorrect) {
        if (typeof SFX !== 'undefined') SFX.correct();
        if (auctionIsMission) {
            auctionProgress.coins += 1;
            auctionSessionEarned += 1;
            feedback.innerHTML = `
                <div class="auction-feedback-correct">
                    <div class="auction-feedback-icon">✅</div>
                    <div class="auction-feedback-text">Đúng! +1 xu</div>
                </div>
            `;
        } else {
            auctionProgress.coins += auctionCurrentBet;
            auctionSessionEarned += auctionCurrentBet;
            feedback.innerHTML = `
                <div class="auction-feedback-correct">
                    <div class="auction-feedback-icon">✅</div>
                    <div class="auction-feedback-text">Đúng! +${auctionCurrentBet} xu</div>
                </div>
            `;
        }
        auctionSessionCorrect++;
        auctionProgress.totalCorrect++;
    } else {
        if (typeof SFX !== 'undefined') SFX.wrong();
        if (auctionIsMission) {
            feedback.innerHTML = `
                <div class="auction-feedback-wrong">
                    <div class="auction-feedback-icon">❌</div>
                    <div class="auction-feedback-text">Sai! +0 xu</div>
                </div>
            `;
        } else {
            auctionProgress.coins -= auctionCurrentBet;
            if (auctionProgress.coins < 0) auctionProgress.coins = 0;
            auctionSessionLost += auctionCurrentBet;
            feedback.innerHTML = `
                <div class="auction-feedback-wrong">
                    <div class="auction-feedback-icon">❌</div>
                    <div class="auction-feedback-text">Sai! -${auctionCurrentBet} xu</div>
                </div>
            `;
        }
        auctionSessionWrong++;
        auctionProgress.totalWrong++;
    }

    // Show explanation
    let explanationHTML = '';
    if (q.explanation) {
        explanationHTML += `<div class="auction-explanation">${q.explanation}</div>`;
    }
    if (!isCorrect && q.correction) {
        explanationHTML += `<div class="auction-correction">✏️ ${q.correction}</div>`;
    }
    if (!isCorrect && q.type === 'word_order') {
        explanationHTML += `<div class="auction-correction">✏️ ${q.correctOrder.join(' ')}</div>`;
    }
    if (!isCorrect && q.type === 'fill_blank') {
        explanationHTML += `<div class="auction-correction">✏️ Đáp án: <strong>${q.correctAnswer}</strong></div>`;
    }
    feedback.innerHTML += explanationHTML;

    // Update coins display
    document.getElementById('auction-play-coins').textContent = auctionProgress.coins;
    saveAuctionProgress();

    // Show next button
    document.getElementById('auction-next-btn').style.display = 'block';
}

// ----- Next Question -----
function nextAuctionQuestion() {
    auctionCurrentIdx++;
    if (auctionCurrentIdx >= auctionQuestions.length) {
        showAuctionResult();
    } else {
        showAuctionQuestion();
    }
}

// ----- Auction Result -----
function showAuctionResult() {
    if (!auctionIsMission) {
        auctionProgress.totalGames++;
        const netGain = auctionSessionEarned - auctionSessionLost;
        if (netGain > auctionProgress.bestGame) {
            auctionProgress.bestGame = netGain;
        }
        saveAuctionProgress();
    }

    // Progress bar to 100%
    document.getElementById('auction-progress-bar').style.width = '100%';

    // Emoji & title
    const accuracy = auctionQuestions.length > 0 ? auctionSessionCorrect / auctionQuestions.length : 0;
    let emoji, title, rankText;
    if (accuracy >= 0.9) { emoji = '🏆'; title = 'Xuất sắc!'; rankText = 'Bậc thầy ngữ pháp'; }
    else if (accuracy >= 0.7) { emoji = '🌟'; title = 'Tốt lắm!'; rankText = 'Nhà đầu tư khôn ngoan'; }
    else if (accuracy >= 0.5) { emoji = '👍'; title = 'Khá tốt!'; rankText = 'Đang tiến bộ'; }
    else { emoji = '💪'; title = 'Cố gắng thêm!'; rankText = 'Hãy luyện tập thêm nhé'; }

    document.getElementById('auction-result-emoji').textContent = emoji;
    document.getElementById('auction-result-title').textContent = auctionIsMission ? 'Nhiệm vụ hoàn thành!' : title;

    // Coins display
    const coinsDiv = document.getElementById('auction-result-coins');
    const net = auctionSessionEarned - auctionSessionLost;
    if (auctionIsMission) {
        coinsDiv.innerHTML = `<span class="auction-result-net positive">+${auctionSessionEarned} xu</span>`;
    } else {
        coinsDiv.innerHTML = `<span class="auction-result-net ${net >= 0 ? 'positive' : 'negative'}">${net >= 0 ? '+' : ''}${net} xu</span>
            <div class="auction-result-coins-total">Tổng: 💰 ${auctionProgress.coins} xu</div>`;
    }

    document.getElementById('auction-result-correct').textContent = auctionSessionCorrect;
    document.getElementById('auction-result-wrong').textContent = auctionSessionWrong;
    document.getElementById('auction-result-earned').textContent = '+' + auctionSessionEarned;
    document.getElementById('auction-result-lost').textContent = '-' + auctionSessionLost;

    document.getElementById('auction-result-rank').textContent = rankText;

    // Disable play again if no coins
    const playAgainBtn = document.getElementById('auction-result-play-btn');
    if (auctionProgress.coins <= 0 && !auctionIsMission) {
        playAgainBtn.disabled = true;
        playAgainBtn.textContent = 'Hết xu — Quay lại làm nhiệm vụ';
    } else {
        playAgainBtn.disabled = false;
        playAgainBtn.textContent = auctionIsMission ? 'Chơi nhiệm vụ nữa' : 'Chơi lại';
    }

    showScreen(auctionResultScreen);
}

// ----- Utility -----
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

})();
