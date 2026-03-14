// ===== Tenses Module =====
let tensesData = null;
let tensesProgress = {};
let currentTenseId = null;
let currentTheoryPage = 0;
let practiceQueue = [];
let practiceIndex = 0;
let practiceCorrect = 0;
let practiceWrong = 0;
let reviewMode = false;
let tensesInitialized = false;

// ===== Tenses DOM Elements =====
const tensesHubScreen = document.getElementById('tenses-hub-screen');
const tensesLearnScreen = document.getElementById('tenses-learn-screen');
const tensesPracticeScreen = document.getElementById('tenses-practice-screen');
const tensesResultScreen = document.getElementById('tenses-result-screen');

// ===== Initialize Tenses Module =====
async function initTenses() {
    if (!tensesData) {
        try {
            const resp = await fetch('tenses.json');
            tensesData = await resp.json();
        } catch (e) {
            alert('Lỗi tải dữ liệu ngữ pháp!');
            return;
        }
    }

    loadTensesProgress();

    if (!tensesInitialized) {
        // Hub
        document.getElementById('tenses-hub-back-btn').addEventListener('click', () => {
            showScreen(document.getElementById('start-screen'));
            updateTensesHomeStat();
        });
        document.getElementById('tenses-review-btn').addEventListener('click', startReview);

        // Learn
        document.getElementById('learn-back-btn').addEventListener('click', () => showTensesHub());
        document.getElementById('theory-prev-btn').addEventListener('click', prevTheoryPage);
        document.getElementById('theory-next-btn').addEventListener('click', nextTheoryPage);
        document.getElementById('start-practice-btn').addEventListener('click', () => startPractice(currentTenseId));

        // Practice
        document.getElementById('practice-back-btn').addEventListener('click', () => {
            if (confirm('Tiến trình bài luyện sẽ mất. Bạn có chắc không?')) showTensesHub();
        });
        document.querySelectorAll('#practice-options .option-btn').forEach(btn => {
            btn.addEventListener('click', () => selectPracticeOption(btn));
        });
        document.getElementById('practice-next-btn').addEventListener('click', nextExercise);

        // Result
        document.getElementById('result-next-btn').addEventListener('click', onResultNext);
        document.getElementById('result-hub-btn').addEventListener('click', () => showTensesHub());

        // Keyboard
        document.addEventListener('keydown', handleTensesKeyboard);

        tensesInitialized = true;
    }

    showTensesHub();
}

// ===== Keyboard =====
function handleTensesKeyboard(e) {
    if (tensesPracticeScreen.classList.contains('active')) {
        const opts = document.querySelectorAll('#practice-options .option-btn');
        if (e.key >= '1' && e.key <= '4') {
            const idx = parseInt(e.key) - 1;
            if (opts[idx] && !opts[idx].disabled) selectPracticeOption(opts[idx]);
        }
        if (e.key === 'Enter' || e.key === ' ') {
            const nextBtn = document.getElementById('practice-next-btn');
            if (!nextBtn.disabled) { e.preventDefault(); nextExercise(); }
        }
    }
    if (tensesLearnScreen.classList.contains('active')) {
        if (e.key === 'ArrowRight' || e.key === 'Enter') nextTheoryPage();
        if (e.key === 'ArrowLeft') prevTheoryPage();
    }
}

// ===== Progress =====
function loadTensesProgress() {
    const saved = localStorage.getItem('et_tenses_progress');
    if (saved) {
        tensesProgress = JSON.parse(saved);
    } else {
        tensesProgress = {};
    }
}

function saveTensesProgress() {
    localStorage.setItem('et_tenses_progress', JSON.stringify(tensesProgress));
}

function getTenseProgress(tenseId) {
    if (!tensesProgress[tenseId]) {
        tensesProgress[tenseId] = {
            learnComplete: false,
            practiceComplete: false,
            bestAccuracy: 0,
            totalAttempts: 0,
            totalCorrect: 0,
            wrongExerciseIds: []
        };
    }
    return tensesProgress[tenseId];
}

function isTenseUnlocked(tense) {
    if (tense.order === 1) return true;
    const prevTense = tensesData.tenses.find(t => t.order === tense.order - 1);
    if (!prevTense) return true;
    const prev = getTenseProgress(prevTense.id);
    return prev.practiceComplete && prev.bestAccuracy >= 60;
}

function getMasteredCount() {
    return tensesData.tenses.filter(t => {
        const p = getTenseProgress(t.id);
        return p.practiceComplete;
    }).length;
}

// ===== Home Stat =====
function updateTensesHomeStat() {
    if (!tensesData) return;
    const mastered = getMasteredCount();
    const stat = document.getElementById('tenses-stat');
    const bar = document.getElementById('tenses-progress-bar');
    if (stat) stat.textContent = `${mastered} / 12 thì`;
    if (bar) bar.style.width = `${(mastered / 12) * 100}%`;
}

// ===== Tenses Hub =====
function showTensesHub() {
    renderTensesGrid();
    updateHubProgress();
    showScreen(tensesHubScreen);
}

function renderTensesGrid() {
    const grid = document.getElementById('tenses-grid');
    grid.innerHTML = '';

    tensesData.tenses.forEach(tense => {
        const prog = getTenseProgress(tense.id);
        const unlocked = isTenseUnlocked(tense);
        let status = 'locked';
        if (unlocked && prog.practiceComplete) status = 'mastered';
        else if (unlocked && prog.learnComplete) status = 'learning';
        else if (unlocked) status = 'available';

        const statusIcon = status === 'mastered' ? '✓' : status === 'locked' ? '🔒' : status === 'learning' ? '📝' : '→';

        const learnDone = prog.learnComplete;
        const practiceDone = prog.practiceComplete;

        const card = document.createElement('div');
        card.className = `tense-card ${status}`;
        card.innerHTML = `
            <div class="tense-card-header">
                <span class="tense-order">${tense.order}</span>
                <span class="tense-status-icon">${statusIcon}</span>
            </div>
            <div class="tense-card-name">${tense.name.vi}</div>
            <div class="tense-card-name-en">${tense.name.en}</div>
            <div class="tense-card-progress">
                <div class="tense-card-phases">
                    <span class="phase-dot ${learnDone ? 'done' : (unlocked && !learnDone ? 'active' : '')}" title="Lý thuyết"></span>
                    <span class="phase-dot ${practiceDone ? 'done' : (learnDone && !practiceDone ? 'active' : '')}" title="Luyện tập"></span>
                </div>
                <span class="tense-accuracy">${prog.bestAccuracy > 0 ? prog.bestAccuracy + '%' : ''}</span>
            </div>
        `;

        if (unlocked) {
            card.addEventListener('click', () => {
                currentTenseId = tense.id;
                if (!prog.learnComplete) {
                    startLearn(tense.id);
                } else {
                    startPractice(tense.id);
                }
            });
        }

        grid.appendChild(card);
    });
}

function updateHubProgress() {
    const mastered = getMasteredCount();
    document.getElementById('tenses-mastered-count').textContent = mastered;
    document.getElementById('tenses-overall-progress').style.width = `${(mastered / 12) * 100}%`;

    const reviewBtn = document.getElementById('tenses-review-btn');
    reviewBtn.disabled = mastered < 2;
}

// ===== Learn Phase =====
function startLearn(tenseId) {
    currentTenseId = tenseId;
    currentTheoryPage = 0;
    const tense = tensesData.tenses.find(t => t.id === tenseId);

    document.getElementById('learn-tense-title').textContent = tense.name.vi;
    document.getElementById('start-practice-btn').style.display = 'none';

    renderTheoryPage(tense);
    showScreen(tensesLearnScreen);
}

function renderTheoryPage(tense) {
    if (!tense) tense = tensesData.tenses.find(t => t.id === currentTenseId);
    const viewport = document.getElementById('theory-viewport');
    const pages = getTheoryPages(tense);
    const totalPages = pages.length;

    viewport.innerHTML = pages[currentTheoryPage];

    // Page indicator
    document.getElementById('learn-page-indicator').textContent = `${currentTheoryPage + 1}/${totalPages}`;

    // Dots
    const dotsContainer = document.getElementById('theory-dots');
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
        const dot = document.createElement('div');
        dot.className = `theory-dot ${i === currentTheoryPage ? 'active' : ''}`;
        dotsContainer.appendChild(dot);
    }

    // Buttons
    document.getElementById('theory-prev-btn').disabled = currentTheoryPage === 0;
    const practiceBtn = document.getElementById('start-practice-btn');
    const navRow = document.querySelector('.theory-nav');

    if (currentTheoryPage === totalPages - 1) {
        navRow.style.display = 'none';
        practiceBtn.style.display = '';
        // Mark learn complete
        const prog = getTenseProgress(currentTenseId);
        prog.learnComplete = true;
        saveTensesProgress();
    } else {
        navRow.style.display = 'flex';
        practiceBtn.style.display = 'none';
    }
}

function getTheoryPages(tense) {
    const t = tense.theory;
    const pages = [];

    // Page 1: Overview
    let html = `<div class="theory-card">
        <div class="theory-card-title">${tense.name.vi}</div>
        <div class="theory-card-title" style="font-size:0.85rem;color:var(--text-muted);margin-top:-0.5rem;margin-bottom:1rem">${tense.name.en}</div>
        <div class="theory-description">${t.description}</div>
    </div>`;
    pages.push(html);

    // Page 2: Formulas
    html = `<div class="theory-card">
        <div class="theory-card-title">Công thức</div>`;
    t.formulas.forEach(f => {
        html += `<div class="formula-box">
            <div class="formula-label">${f.label}</div>
            <div class="formula-structure">${f.structure}</div>
            <div class="formula-example">
                <div class="formula-example-en">${f.example.en}</div>
                <div class="formula-example-vi">${f.example.vi}</div>
            </div>
        </div>`;
    });
    html += '</div>';
    pages.push(html);

    // Page 3: Signal words
    html = `<div class="theory-card">
        <div class="theory-card-title">Dấu hiệu nhận biết</div>
        <div class="signal-words-wrap">`;
    t.signalWords.forEach(w => {
        html += `<span class="signal-chip">${w}</span>`;
    });
    html += '</div></div>';
    pages.push(html);

    // Page 4: Usages + Notes
    html = `<div class="theory-card">
        <div class="theory-card-title">Cách sử dụng & Lưu ý</div>`;
    t.usages.forEach(u => {
        html += `<div class="usage-item">
            <div class="usage-rule">${u.rule}</div>
            <div class="usage-example">"${u.example.en}" — ${u.example.vi}</div>
        </div>`;
    });
    if (t.notes && t.notes.length) {
        html += '<div style="margin-top:0.75rem">';
        t.notes.forEach(n => {
            html += `<div class="note-item">${n}</div>`;
        });
        html += '</div>';
    }
    html += '</div>';
    pages.push(html);

    return pages;
}

function nextTheoryPage() {
    const tense = tensesData.tenses.find(t => t.id === currentTenseId);
    const totalPages = getTheoryPages(tense).length;
    if (currentTheoryPage < totalPages - 1) {
        currentTheoryPage++;
        renderTheoryPage(tense);
    }
}

function prevTheoryPage() {
    if (currentTheoryPage > 0) {
        currentTheoryPage--;
        const tense = tensesData.tenses.find(t => t.id === currentTenseId);
        renderTheoryPage(tense);
    }
}

// ===== Practice Phase =====
function startPractice(tenseId) {
    currentTenseId = tenseId;
    reviewMode = false;
    practiceIndex = 0;
    practiceCorrect = 0;
    practiceWrong = 0;

    practiceQueue = buildPracticeQueue(tenseId);
    showExercise();
    showScreen(tensesPracticeScreen);
}

function buildPracticeQueue(tenseId) {
    const tense = tensesData.tenses.find(t => t.id === tenseId);
    if (!tense) return [];

    const all = [
        ...tense.exercises.conjugation.map(e => ({ ...e, type: 'conjugation' })),
        ...tense.exercises.fillInBlank.map(e => ({ ...e, type: 'fillInBlank' })),
        ...tense.exercises.identifyTense.map(e => ({ ...e, type: 'identifyTense' }))
    ];

    // Prioritize wrong exercises
    const prog = getTenseProgress(tenseId);
    const wrongIds = new Set(prog.wrongExerciseIds || []);
    const wrong = all.filter(e => wrongIds.has(e.id));
    const other = all.filter(e => !wrongIds.has(e.id));

    shuffleArray(wrong);
    shuffleArray(other);

    const queue = [...wrong, ...other].slice(0, 10);
    shuffleArray(queue);
    return queue;
}

function showExercise() {
    if (practiceIndex >= practiceQueue.length) {
        showResults();
        return;
    }

    const ex = practiceQueue[practiceIndex];
    const total = practiceQueue.length;

    // Counter
    document.getElementById('practice-counter').textContent = `${practiceIndex + 1} / ${total}`;
    document.getElementById('practice-progress-bar').style.width = `${((practiceIndex + 1) / total) * 100}%`;
    document.getElementById('practice-correct').textContent = practiceCorrect;
    document.getElementById('practice-wrong').textContent = practiceWrong;

    // Type badge
    const badge = document.getElementById('exercise-type-badge');
    const typeLabels = {
        conjugation: 'Chia động từ',
        fillInBlank: 'Điền vào chỗ trống',
        identifyTense: 'Nhận diện thì'
    };
    badge.textContent = typeLabels[ex.type] || ex.type;

    // Render exercise card
    const card = document.getElementById('exercise-card');
    card.className = 'exercise-card';

    if (ex.type === 'conjugation') {
        const sentenceHtml = ex.sentence ? ex.sentence.replace('___', '<span class="exercise-blank">______</span>') : '';
        card.innerHTML = `
            <div class="exercise-prompt">${ex.prompt}</div>
            ${sentenceHtml ? `<div class="exercise-sentence">${sentenceHtml}</div>` : ''}
            ${ex.verb ? `<div class="exercise-verb-hint">Động từ: <strong>${ex.verb}</strong></div>` : ''}
        `;
    } else if (ex.type === 'fillInBlank') {
        const sentenceHtml = ex.sentence.replace('___', '<span class="exercise-blank">______</span>');
        card.innerHTML = `
            <div class="exercise-sentence">${sentenceHtml}</div>
            ${ex.verb ? `<div class="exercise-verb-hint">Động từ: <strong>${ex.verb}</strong></div>` : ''}
        `;
    } else if (ex.type === 'identifyTense') {
        card.innerHTML = `
            <div class="exercise-prompt">Câu này thuộc thì nào?</div>
            <div class="exercise-sentence">${ex.sentence}</div>
        `;
    }

    // Options
    const options = buildExerciseOptions(ex);
    const optBtns = document.querySelectorAll('#practice-options .option-btn');
    optBtns.forEach((btn, i) => {
        btn.textContent = options[i].label;
        btn.dataset.value = options[i].value;
        btn.className = 'option-btn practice-opt';
        btn.disabled = false;
    });

    // Reset feedback & explanation
    document.getElementById('practice-feedback').textContent = '';
    document.getElementById('practice-feedback').className = 'feedback';
    document.getElementById('explanation-box').style.display = 'none';
    document.getElementById('practice-next-btn').disabled = true;
}

function buildExerciseOptions(ex) {
    let options;

    if (ex.type === 'identifyTense') {
        // Map tense IDs to Vietnamese names
        const allOptions = [ex.correctAnswer, ...ex.distractors];
        options = allOptions.map(id => {
            const t = tensesData.tenses.find(t => t.id === id);
            return { value: id, label: t ? t.name.vi : id };
        });
    } else {
        const allOptions = [ex.correctAnswer, ...ex.distractors];
        options = allOptions.map(v => ({ value: v, label: v }));
    }

    // Shuffle
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    return options;
}

function selectPracticeOption(btn) {
    if (btn.disabled) return;

    const ex = practiceQueue[practiceIndex];
    const selected = btn.dataset.value;
    const card = document.getElementById('exercise-card');
    const feedbackEl = document.getElementById('practice-feedback');
    const prog = getTenseProgress(currentTenseId);

    if (selected === ex.correctAnswer) {
        btn.classList.add('correct');
        card.classList.add('correct-anim');
        feedbackEl.textContent = 'Chính xác!';
        feedbackEl.className = 'feedback correct-msg';
        practiceCorrect++;
        document.getElementById('practice-correct').textContent = practiceCorrect;

        // Disable all
        document.querySelectorAll('#practice-options .option-btn').forEach(b => b.disabled = true);
        document.getElementById('practice-next-btn').disabled = false;

        // Remove from wrong list if was there
        prog.wrongExerciseIds = (prog.wrongExerciseIds || []).filter(id => id !== ex.id);

        // Show explanation
        if (ex.explanation) {
            document.getElementById('explanation-text').textContent = ex.explanation;
            document.getElementById('explanation-box').style.display = '';
        }
    } else {
        btn.classList.add('wrong');
        card.classList.add('wrong-anim');
        feedbackEl.textContent = 'Sai rồi, chọn lại!';
        feedbackEl.className = 'feedback wrong-msg';
        practiceWrong++;
        document.getElementById('practice-wrong').textContent = practiceWrong;
        btn.disabled = true;
        setTimeout(() => card.classList.remove('wrong-anim'), 400);

        // Add to wrong list
        if (!prog.wrongExerciseIds) prog.wrongExerciseIds = [];
        if (!prog.wrongExerciseIds.includes(ex.id)) {
            prog.wrongExerciseIds.push(ex.id);
        }
    }

    saveTensesProgress();
}

function nextExercise() {
    practiceIndex++;
    if (practiceIndex >= practiceQueue.length) {
        showResults();
    } else {
        showExercise();
    }
}

// ===== Review Phase =====
function startReview() {
    reviewMode = true;
    practiceIndex = 0;
    practiceCorrect = 0;
    practiceWrong = 0;
    currentTenseId = null;

    practiceQueue = buildReviewQueue();
    if (practiceQueue.length === 0) {
        alert('Chưa có đủ dữ liệu ôn tập!');
        return;
    }
    showExercise();
    showScreen(tensesPracticeScreen);
}

function buildReviewQueue() {
    const completedIds = tensesData.tenses
        .filter(t => getTenseProgress(t.id).practiceComplete)
        .map(t => t.id);

    if (!tensesData.reviewExercises) return [];

    const eligible = tensesData.reviewExercises.filter(ex =>
        ex.tensesRequired.every(id => completedIds.includes(id))
    );

    shuffleArray(eligible);
    return eligible.slice(0, 15).map(ex => ({ ...ex }));
}

// ===== Results =====
function showResults() {
    const total = practiceCorrect + practiceWrong;
    const accuracy = total > 0 ? Math.round((practiceCorrect / total) * 100) : 0;

    document.getElementById('result-correct').textContent = practiceCorrect;
    document.getElementById('result-wrong').textContent = practiceWrong;
    document.getElementById('result-accuracy').textContent = accuracy + '%';

    const tense = currentTenseId ? tensesData.tenses.find(t => t.id === currentTenseId) : null;

    if (reviewMode) {
        document.getElementById('result-icon').textContent = accuracy >= 60 ? '🏆' : '📖';
        document.getElementById('result-title').textContent = 'Ôn tập hoàn thành!';
        document.getElementById('result-subtitle').textContent = 'Ôn tập tổng hợp';
        document.getElementById('result-message').textContent = accuracy >= 80
            ? 'Tuyệt vời! Bạn nắm rất vững các thì đã học.'
            : 'Hãy ôn lại để cải thiện thêm!';
        document.getElementById('result-next-btn').textContent = 'Ôn tập lại';
    } else if (tense) {
        const prog = getTenseProgress(currentTenseId);
        prog.totalAttempts += total;
        prog.totalCorrect += practiceCorrect;
        if (accuracy > prog.bestAccuracy) prog.bestAccuracy = accuracy;

        if (accuracy >= 60) {
            prog.practiceComplete = true;
            document.getElementById('result-icon').textContent = '🎉';
            document.getElementById('result-title').textContent = 'Hoàn thành!';
            document.getElementById('result-message').textContent = 'Tuyệt vời! Thì tiếp theo đã được mở khóa.';

            // Find next tense
            const nextTense = tensesData.tenses.find(t => t.order === tense.order + 1);
            if (nextTense) {
                document.getElementById('result-next-btn').textContent = `Học ${nextTense.name.vi}`;
            } else {
                document.getElementById('result-next-btn').textContent = 'Về danh sách';
            }
        } else {
            document.getElementById('result-icon').textContent = '💪';
            document.getElementById('result-title').textContent = 'Cần luyện thêm!';
            document.getElementById('result-message').textContent = `Cần đạt ít nhất 60% để mở khóa thì tiếp theo. Bạn đạt ${accuracy}%.`;
            document.getElementById('result-next-btn').textContent = 'Luyện lại';
        }

        document.getElementById('result-subtitle').textContent = tense.name.vi + ' — Luyện tập';
        saveTensesProgress();
    }

    showScreen(tensesResultScreen);
    updateTensesHomeStat();
}

function onResultNext() {
    if (reviewMode) {
        startReview();
        return;
    }

    const tense = tensesData.tenses.find(t => t.id === currentTenseId);
    const prog = getTenseProgress(currentTenseId);

    if (prog.practiceComplete) {
        // Go to next tense
        const nextTense = tensesData.tenses.find(t => t.order === tense.order + 1);
        if (nextTense && isTenseUnlocked(nextTense)) {
            startLearn(nextTense.id);
        } else {
            showTensesHub();
        }
    } else {
        // Retry same tense
        startPractice(currentTenseId);
    }
}

// ===== Utility =====
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
