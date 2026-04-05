(function () {
    'use strict';

    var CH_STORAGE = 'eq_chinese_progress';
    var SRS_INTERVALS = [0, 1, 3, 7, 14, 30];

    var chData = {
        words: [],
        phrases: [],
        grammar: { topics: [], reviewExercises: [] },
        stories: { stories: [] },
        auction: { questions: [] }
    };

    var chProgress = defaultProgress();

    var selected = {
        vocabLevel: 'all',
        phraseLevel: 'all'
    };

    var runtime = {
        speechRate: 1.0,
        initialized: false,
        grammarTopicId: null,
        activeStory: null,
        activeStoryNode: '',
        practice: null,
        question: null,
        replayAction: null,
        backAction: null,
        lastStarter: null
    };

    var auction = {
        progress: null,
        questions: [],
        currentIdx: 0,
        currentBet: 0,
        sessionCorrect: 0,
        sessionWrong: 0,
        sessionEarned: 0,
        sessionLost: 0,
        isMission: false,
        orderSelected: []
    };

    var PHRASE_CATEGORY_ORDER = [
        'greetings', 'family', 'food', 'travel', 'shopping', 'work', 'study', 'health', 'time',
        'weather', 'housing', 'transport', 'technology', 'business', 'finance', 'culture',
        'emotion', 'society', 'environment', 'law', 'daily', 'grammar', 'story'
    ];

    var PHRASE_LEVELS = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];

    var PHRASE_CATEGORY_META = {
        all: { icon: '🗂️', label: 'Tất cả' },
        greetings: { icon: '👋', label: 'Chào hỏi' },
        family: { icon: '👨‍👩‍👧‍👦', label: 'Gia đình' },
        food: { icon: '🍜', label: 'Ăn uống' },
        travel: { icon: '✈️', label: 'Du lịch' },
        shopping: { icon: '🛍️', label: 'Mua sắm' },
        work: { icon: '💼', label: 'Công việc' },
        study: { icon: '📚', label: 'Học tập' },
        health: { icon: '🩺', label: 'Sức khỏe' },
        time: { icon: '⏰', label: 'Thời gian' },
        weather: { icon: '🌦️', label: 'Thời tiết' },
        housing: { icon: '🏠', label: 'Nhà ở' },
        transport: { icon: '🚇', label: 'Phương tiện' },
        technology: { icon: '💻', label: 'Công nghệ' },
        business: { icon: '📈', label: 'Kinh doanh' },
        finance: { icon: '💳', label: 'Tài chính' },
        culture: { icon: '🎎', label: 'Văn hóa' },
        emotion: { icon: '😊', label: 'Cảm xúc' },
        society: { icon: '🏙️', label: 'Xã hội' },
        environment: { icon: '🌿', label: 'Môi trường' },
        law: { icon: '⚖️', label: 'Pháp luật' },
        daily: { icon: '🗣️', label: 'Giao tiếp hằng ngày' },
        grammar: { icon: '🧠', label: 'Ngữ pháp' },
        story: { icon: '📖', label: 'Theo ngữ cảnh' }
    };

    var screens = {
        hub: document.getElementById('chinese-hub-screen'),
        vocabSetup: document.getElementById('chinese-vocab-setup-screen'),
        grammarHub: document.getElementById('chinese-grammar-hub-screen'),
        grammarTheory: document.getElementById('chinese-grammar-theory-screen'),
        phrasesHub: document.getElementById('chinese-phrases-hub-screen'),
        phrasesFavorites: document.getElementById('chinese-phrases-favorites-screen'),
        gameHub: document.getElementById('chinese-game-hub-screen'),
        storySelect: document.getElementById('chinese-story-select-screen'),
        auctionHome: document.getElementById('chinese-auction-home-screen'),
        auctionPlay: document.getElementById('chinese-auction-play-screen'),
        auctionResult: document.getElementById('chinese-auction-result-screen'),
        practice: document.getElementById('chinese-practice-screen'),
        story: document.getElementById('chinese-story-screen'),
        result: document.getElementById('chinese-result-screen')
    };

    function defaultProgress() {
        return {
            sessions: { vocab: 0, phrases: 0, listening: 0, grammar: 0, story: 0 },
            modeCorrect: { vocab: 0, phrases: 0, listening: 0, grammar: 0, story: 0 },
            modeWrong: { vocab: 0, phrases: 0, listening: 0, grammar: 0, story: 0 },
            modeAnswered: { vocab: 0, phrases: 0, listening: 0, grammar: 0, story: 0 },
            correct: 0,
            wrong: 0,
            storyBest: 0,
            lastMode: 'vocab',
            vocabSrs: {},
            vocabWrong: {},
            grammar: {
                unlockedTopicIds: [],
                completedTopicIds: [],
                topicStats: {}
            },
            phrases: {
                favorites: [],
                categoryLevels: {}
            }
        };
    }

    function loadProgress() {
        var base = defaultProgress();
        try {
            var saved = localStorage.getItem(CH_STORAGE);
            if (!saved) {
                chProgress = base;
                return;
            }
            var parsed = JSON.parse(saved) || {};
            chProgress = Object.assign({}, base, parsed);
            chProgress.sessions = Object.assign({}, base.sessions, parsed.sessions || {});
            chProgress.modeCorrect = Object.assign({}, base.modeCorrect, parsed.modeCorrect || {});
            chProgress.modeWrong = Object.assign({}, base.modeWrong, parsed.modeWrong || {});
            chProgress.modeAnswered = Object.assign({}, base.modeAnswered, parsed.modeAnswered || {});
            chProgress.vocabSrs = Object.assign({}, parsed.vocabSrs || {});
            chProgress.vocabWrong = Object.assign({}, parsed.vocabWrong || {});
            chProgress.grammar = Object.assign({}, base.grammar, parsed.grammar || {});
            chProgress.grammar.unlockedTopicIds = Array.isArray(chProgress.grammar.unlockedTopicIds) ? chProgress.grammar.unlockedTopicIds : [];
            chProgress.grammar.completedTopicIds = Array.isArray(chProgress.grammar.completedTopicIds) ? chProgress.grammar.completedTopicIds : [];
            chProgress.grammar.topicStats = Object.assign({}, (parsed.grammar || {}).topicStats || {});
            chProgress.phrases = Object.assign({}, base.phrases, parsed.phrases || {});
            chProgress.phrases.favorites = Array.isArray(chProgress.phrases.favorites) ? chProgress.phrases.favorites : [];
            chProgress.phrases.categoryLevels = Object.assign({}, chProgress.phrases.categoryLevels || {});
        } catch (e) {
            chProgress = base;
        }
    }

    function saveProgress() {
        localStorage.setItem(CH_STORAGE, JSON.stringify(chProgress));
    }

    function levelFromHskNumber(n) {
        var num = Number(n || 1);
        if (num < 1) num = 1;
        if (num > 9) num = 9;
        return 'HSK' + num;
    }

    function legacyToHsk(level) {
        var v = String(level || '').toUpperCase();
        if (v === 'A1') return 'HSK1';
        if (v === 'A2') return 'HSK2';
        if (v === 'B1') return 'HSK3';
        if (v === 'B2') return 'HSK4';
        return '';
    }

    function normalizeLevel(level, fallbackLevel) {
        var v = String(level || '').toUpperCase();
        if (v === 'HSK7-9' || v === 'HSK7_9') return 'HSK7-9';
        if (/^HSK[1-9]$/.test(v)) return v;
        var mapped = legacyToHsk(v);
        if (mapped) return mapped;
        return fallbackLevel || 'HSK1';
    }

    function byLevelIndex(idx, total) {
        var ratio = total > 0 ? (idx + 1) / total : 0;
        if (ratio <= 0.18) return 'HSK1';
        if (ratio <= 0.42) return 'HSK2';
        if (ratio <= 0.68) return 'HSK3';
        if (ratio <= 0.88) return 'HSK4';
        if (ratio <= 0.97) return 'HSK5';
        return 'HSK6';
    }

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = arr[i];
            arr[i] = arr[j];
            arr[j] = t;
        }
        return arr;
    }

    function todayISO() {
        return new Date().toISOString().slice(0, 10);
    }

    function addDaysISO(iso, days) {
        var d = new Date(iso + 'T00:00:00');
        d.setDate(d.getDate() + days);
        return d.toISOString().slice(0, 10);
    }

    function toISODate(d) {
        return d.toISOString().slice(0, 10);
    }

    function isDue(isoDate) {
        if (!isoDate) return true;
        return isoDate <= todayISO();
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeText(input) {
        return String(input || '')
            .toLowerCase()
            .replace(/[.,!?;:\"'“”‘’…()\[\]{}]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function levenshtein(a, b) {
        var m = a.length;
        var n = b.length;
        var dp = [];
        for (var i = 0; i <= m; i++) {
            dp[i] = [i];
            for (var j = 1; j <= n; j++) {
                dp[i][j] = i === 0 ? j : 0;
            }
        }
        for (var r = 1; r <= m; r++) {
            for (var c = 1; c <= n; c++) {
                if (a[r - 1] === b[c - 1]) dp[r][c] = dp[r - 1][c - 1];
                else {
                    dp[r][c] = 1 + Math.min(dp[r - 1][c], dp[r][c - 1], dp[r - 1][c - 1]);
                }
            }
        }
        return dp[m][n];
    }

    function getDirectionBoth() {
        var toggle = document.getElementById('chinese-direction-toggle');
        return !!(toggle && toggle.checked);
    }

    function pickDirection() {
        if (!getDirectionBoth()) return 'zh-to-vi';
        return Math.random() < 0.5 ? 'zh-to-vi' : 'vi-to-zh';
    }

    function setDirectionLabel() {
        var label = document.getElementById('chinese-direction-label');
        if (!label) return;
        label.textContent = getDirectionBoth() ? 'Hai chiều: Trung ↔ Việt' : 'Một chiều: Trung → Việt';
    }

    function getFilteredByLevel(arr, level) {
        if (!Array.isArray(arr)) return [];
        if (!level || level === 'all') return arr.slice();
        var normalized = normalizeLevel(level, 'HSK1');
        return arr.filter(function (item) {
            return normalizeLevel(item.level, 'HSK1') === normalized;
        });
    }

    function getWordById(wordId) {
        for (var i = 0; i < chData.words.length; i++) {
            if (chData.words[i].id === wordId) return chData.words[i];
        }
        return null;
    }

    function getPhraseById(phraseId) {
        for (var i = 0; i < chData.phrases.length; i++) {
            if (chData.phrases[i].id === phraseId) return chData.phrases[i];
        }
        return null;
    }

    function levelToNumber(level) {
        var v = normalizeLevel(level, 'HSK1');
        if (v === 'HSK7-9') return 7;
        return Number(v.replace('HSK', '')) || 1;
    }

    function phraseKey(zh, vi) {
        return normalizeText(zh).replace(/\s+/g, '') + '|' + normalizeText(vi).replace(/\s+/g, '');
    }

    function collectExtraPhrasesFromSources() {
        var extras = [];
        var seq = 0;

        function pushExtra(zh, vi, level, category, pinyin) {
            var zhText = String(zh || '').trim();
            var viText = String(vi || '').trim();
            if (!zhText || !viText) return;
            if (!(/[\u3400-\u9fff]/.test(zhText))) return;
            if (zhText.indexOf('___') >= 0) return;
            extras.push({
                id: 'cp_extra_' + (++seq),
                zh: zhText,
                vi: viText,
                pinyin: pinyin || '',
                level: normalizeLevel(level, 'HSK2'),
                category: category || 'daily',
                directions: ['zh-to-vi', 'vi-to-zh']
            });
        }

        (chData.stories.stories || []).forEach(function (story) {
            var nodes = story.nodes || {};
            Object.keys(nodes).forEach(function (nodeId) {
                var node = nodes[nodeId];
                pushExtra(node.zh, node.vi, 'HSK2', 'story');
            });
        });

        (chData.grammar.topics || []).forEach(function (topic) {
            var lv = normalizeLevel(topic.level, 'HSK2');
            var theory = topic.theory || {};
            (theory.formulas || []).forEach(function (f) {
                if (f.example) pushExtra(f.example.zh, f.example.vi, lv, 'grammar');
            });
            (theory.usages || []).forEach(function (u) {
                if (u.example) pushExtra(u.example.zh, u.example.vi, lv, 'grammar');
            });
        });

        return extras;
    }

    function phraseCategoryLabel(cat) {
        var key = String(cat || 'daily').toLowerCase();
        return (PHRASE_CATEGORY_META[key] && PHRASE_CATEGORY_META[key].label) || key;
    }

    function phraseCategoryIcon(cat) {
        var key = String(cat || 'daily').toLowerCase();
        return (PHRASE_CATEGORY_META[key] && PHRASE_CATEGORY_META[key].icon) || '🧩';
    }

    function orderedPhraseCategories(keys) {
        var seen = {};
        var ordered = [];
        PHRASE_CATEGORY_ORDER.forEach(function (cat) {
            if (keys.indexOf(cat) >= 0) {
                ordered.push(cat);
                seen[cat] = true;
            }
        });
        var rest = keys.filter(function (k) { return !seen[k]; }).sort();
        return ordered.concat(rest);
    }

    function normalizeAndEnrichPhrases(rawPhrases) {
        var merged = (Array.isArray(rawPhrases) ? rawPhrases.slice() : []).concat(collectExtraPhrasesFromSources());
        var dedup = {};
        var output = [];

        merged.forEach(function (phrase, idx) {
            if (!phrase) return;
            var zh = String(phrase.zh || '').trim();
            var vi = String(phrase.vi || '').trim();
            if (!zh || !vi) return;
            if (!(/[\u3400-\u9fff]/.test(zh))) return;

            var key = phraseKey(zh, vi);
            if (dedup[key]) return;
            dedup[key] = true;

            var normalizedLevel = normalizeLevel(phrase.level, byLevelIndex(idx, merged.length));
            output.push({
                id: phrase.id || ('cp_auto_' + output.length),
                zh: zh,
                vi: vi,
                en: phrase.en || '',
                pinyin: phrase.pinyin || '',
                level: normalizedLevel,
                hskLevel: Number(phrase.hskLevel || levelToNumber(normalizedLevel)),
                category: phrase.category || 'daily',
                directions: Array.isArray(phrase.directions) ? phrase.directions : ['zh-to-vi', 'vi-to-zh']
            });
        });

        return output;
    }

    function getVocabSrsRecord(wordId) {
        if (!chProgress.vocabSrs[wordId]) {
            chProgress.vocabSrs[wordId] = { level: 0, nextDue: null, wrong: 0 };
        }
        return chProgress.vocabSrs[wordId];
    }

    function updateVocabSrs(wordId, correct) {
        var rec = getVocabSrsRecord(wordId);
        if (correct) {
            rec.wrong = 0;
            rec.level = Math.min(SRS_INTERVALS.length - 1, rec.level + 1);
            rec.nextDue = addDaysISO(todayISO(), SRS_INTERVALS[rec.level]);
            if (chProgress.vocabWrong[wordId]) {
                chProgress.vocabWrong[wordId] = Math.max(0, Number(chProgress.vocabWrong[wordId] || 0) - 1);
                if (chProgress.vocabWrong[wordId] === 0) delete chProgress.vocabWrong[wordId];
            }
        } else {
            rec.wrong = Number(rec.wrong || 0) + 1;
            rec.level = Math.max(0, rec.level - 1);
            rec.nextDue = addDaysISO(todayISO(), 1);
            chProgress.vocabWrong[wordId] = Number(chProgress.vocabWrong[wordId] || 0) + 1;
        }
    }

    function countVocabLearnedByLevel(level) {
        var pool = getFilteredByLevel(chData.words, level);
        var learned = 0;
        for (var i = 0; i < pool.length; i++) {
            var rec = chProgress.vocabSrs[pool[i].id];
            // Count as learned after the first confirmed correct answer.
            if (rec && Number(rec.level || 0) >= 1) learned++;
        }
        return learned;
    }

    function countVocabDueByLevel(level) {
        var pool = getFilteredByLevel(chData.words, level);
        var due = 0;
        for (var i = 0; i < pool.length; i++) {
            var rec = chProgress.vocabSrs[pool[i].id];
            if (rec && Number(rec.level || 0) > 0 && isDue(rec.nextDue)) due++;
        }
        return due;
    }

    function countVocabWrongByLevel(level) {
        var pool = getFilteredByLevel(chData.words, level);
        var ids = {};
        for (var i = 0; i < pool.length; i++) ids[pool[i].id] = true;
        var count = 0;
        Object.keys(chProgress.vocabWrong || {}).forEach(function (id) {
            if (ids[id] && Number(chProgress.vocabWrong[id] || 0) > 0) count++;
        });
        return count;
    }

    function ensureGrammarUnlockState() {
        var topics = chData.grammar.topics || [];
        if (!topics.length) return;
        if (!chProgress.grammar.unlockedTopicIds.length) {
            chProgress.grammar.unlockedTopicIds.push(topics[0].id);
        }
        saveProgress();
    }

    function isTopicUnlocked(topicId) {
        return chProgress.grammar.unlockedTopicIds.indexOf(topicId) >= 0;
    }

    function isTopicCompleted(topicId) {
        return chProgress.grammar.completedTopicIds.indexOf(topicId) >= 0;
    }

    function updateTopicProgress(topicId, correct, wrong, acc) {
        var stats = chProgress.grammar.topicStats[topicId] || { sessions: 0, bestAcc: 0, totalCorrect: 0, totalWrong: 0 };
        stats.sessions = Number(stats.sessions || 0) + 1;
        stats.bestAcc = Math.max(Number(stats.bestAcc || 0), Number(acc || 0));
        stats.totalCorrect = Number(stats.totalCorrect || 0) + Number(correct || 0);
        stats.totalWrong = Number(stats.totalWrong || 0) + Number(wrong || 0);
        chProgress.grammar.topicStats[topicId] = stats;

        if (acc >= 70 && chProgress.grammar.completedTopicIds.indexOf(topicId) < 0) {
            chProgress.grammar.completedTopicIds.push(topicId);
        }

        var topics = (chData.grammar.topics || []).slice().sort(function (a, b) {
            return Number(a.order || 0) - Number(b.order || 0);
        });
        var idx = topics.findIndex(function (t) { return t.id === topicId; });
        if (idx >= 0 && idx < topics.length - 1 && acc >= 70) {
            var nextId = topics[idx + 1].id;
            if (chProgress.grammar.unlockedTopicIds.indexOf(nextId) < 0) {
                chProgress.grammar.unlockedTopicIds.push(nextId);
            }
        }
    }

    function isFavoritePhrase(phraseId) {
        return chProgress.phrases.favorites.indexOf(phraseId) >= 0;
    }

    function toggleFavoritePhrase(phraseId) {
        var idx = chProgress.phrases.favorites.indexOf(phraseId);
        if (idx >= 0) chProgress.phrases.favorites.splice(idx, 1);
        else chProgress.phrases.favorites.push(phraseId);
        saveProgress();
    }

    function getPhraseLevelProgress(category, level) {
        var cat = String(category || 'all').toLowerCase();
        var lv = normalizeLevel(level, 'HSK1');

        if (!chProgress.phrases.categoryLevels) chProgress.phrases.categoryLevels = {};
        if (!chProgress.phrases.categoryLevels[cat]) chProgress.phrases.categoryLevels[cat] = {};
        if (!chProgress.phrases.categoryLevels[cat][lv]) {
            chProgress.phrases.categoryLevels[cat][lv] = {
                completed: false,
                bestAccuracy: 0,
                totalAttempts: 0,
                totalCorrect: 0
            };
        }
        return chProgress.phrases.categoryLevels[cat][lv];
    }

    function isPhraseLevelUnlocked(category, level, levelCountMap) {
        var lv = normalizeLevel(level, 'HSK1');
        if (lv === 'HSK1') return true;

        var idx = PHRASE_LEVELS.indexOf(lv);
        if (idx <= 0) return true;

        var prev = PHRASE_LEVELS[idx - 1];
        if (levelCountMap && !levelCountMap[prev]) return true;

        var prevProg = getPhraseLevelProgress(category, prev);
        return !!(prevProg.completed && Number(prevProg.bestAccuracy || 0) >= 70);
    }

    function pickPhraseTargetLevel(category, levelCountMap, requestedLevel) {
        if (requestedLevel && requestedLevel !== 'all') {
            var req = normalizeLevel(requestedLevel, 'HSK1');
            return levelCountMap[req] ? req : null;
        }

        for (var i = 0; i < PHRASE_LEVELS.length; i++) {
            var lv = PHRASE_LEVELS[i];
            if (!levelCountMap[lv]) continue;
            if (!isPhraseLevelUnlocked(category, lv, levelCountMap)) continue;
            if (!getPhraseLevelProgress(category, lv).completed) return lv;
        }

        for (var j = 0; j < PHRASE_LEVELS.length; j++) {
            var fallback = PHRASE_LEVELS[j];
            if (!levelCountMap[fallback]) continue;
            if (isPhraseLevelUnlocked(category, fallback, levelCountMap)) return fallback;
        }

        return null;
    }

    function updatePhraseLevelProgress(category, level, correct, wrong, acc) {
        if (!category || !level || level === 'all') return;

        var progress = getPhraseLevelProgress(category, level);
        var total = Number(correct || 0) + Number(wrong || 0);

        progress.totalAttempts = Number(progress.totalAttempts || 0) + total;
        progress.totalCorrect = Number(progress.totalCorrect || 0) + Number(correct || 0);
        progress.bestAccuracy = Math.max(Number(progress.bestAccuracy || 0), Number(acc || 0));

        if (Number(acc || 0) >= 70) {
            progress.completed = true;
        }
    }

    async function loadData() {
        if (chData.words.length && chData.phrases.length && (chData.grammar.topics || []).length) return;

        var loaders = [
            fetch('chinese_words.json').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
            fetch('chinese_phrases.json').then(function (r) { return r.ok ? r.json() : { phrases: [] }; }).catch(function () { return { phrases: [] }; }),
            fetch('chinese_grammar.json').then(function (r) { return r.ok ? r.json() : { topics: [], reviewExercises: [] }; }).catch(function () { return { topics: [], reviewExercises: [] }; }),
            fetch('chinese_stories.json').then(function (r) { return r.ok ? r.json() : { stories: [] }; }).catch(function () { return { stories: [] }; }),
            fetch('chinese_auction_questions.json').then(function (r) { return r.ok ? r.json() : { questions: [] }; }).catch(function () { return { questions: [] }; })
        ];

        var loaded = await Promise.all(loaders);
        chData.words = Array.isArray(loaded[0]) ? loaded[0] : [];
        chData.phrases = Array.isArray(loaded[1].phrases) ? loaded[1].phrases : [];
        chData.grammar = loaded[2] || { topics: [], reviewExercises: [] };
        chData.stories = loaded[3] || { stories: [] };
        chData.auction = loaded[4] || { questions: [] };

        chData.words.forEach(function (word, idx) {
            var hskNum = Number(word.hskLevel || 0);
            if (!hskNum || hskNum < 1) {
                hskNum = levelToNumber(word.level || byLevelIndex(idx, chData.words.length));
            }
            if (hskNum > 9) hskNum = 9;
            word.hskLevel = hskNum;
            word.level = normalizeLevel(word.level, levelFromHskNumber(hskNum));
            if (!word.id) word.id = 'zw_auto_' + idx;
        });

        chData.phrases = normalizeAndEnrichPhrases(chData.phrases);

        var topics = Array.isArray(chData.grammar.topics) ? chData.grammar.topics : [];
        topics.sort(function (a, b) { return Number(a.order || 0) - Number(b.order || 0); });

        topics.forEach(function (topic, topicIdx) {
            topic.level = normalizeLevel(topic.level, byLevelIndex(topicIdx, topics.length));
            topic.exercises = Array.isArray(topic.exercises) ? topic.exercises : [];
            topic.exercises = topic.exercises.map(function (ex, exIdx) {
                var answer = ex.correctAnswer || ex.correct || '';
                var distractors = Array.isArray(ex.distractors) ? ex.distractors.slice() : [];
                var options = Array.isArray(ex.options) ? ex.options.slice() : [];
                if (!options.length) options = distractors.slice();
                if (answer && options.indexOf(answer) < 0) options.unshift(answer);
                options = options.filter(Boolean);
                options = shuffle(options).slice(0, 4);
                if (answer && options.indexOf(answer) < 0) {
                    options[0] = answer;
                    options = shuffle(options);
                }
                return {
                    id: ex.id || topic.id + '_ex_' + exIdx,
                    topicId: topic.id,
                    level: topic.level,
                    prompt: ex.prompt || '',
                    sentence: ex.sentence || '',
                    explanation: ex.explanation || '',
                    answer: answer,
                    options: options
                };
            });
        });

        chData.grammar.topics = topics;
        chData.grammar.reviewExercises = Array.isArray(chData.grammar.reviewExercises) ? chData.grammar.reviewExercises.map(function (ex, idx) {
            var answer = ex.correctAnswer || ex.correct || '';
            var opts = Array.isArray(ex.distractors) ? ex.distractors.slice() : [];
            if (answer && opts.indexOf(answer) < 0) opts.unshift(answer);
            opts = shuffle(opts.filter(Boolean)).slice(0, 4);
            if (answer && opts.indexOf(answer) < 0) {
                opts[0] = answer;
                opts = shuffle(opts);
            }
            return {
                id: ex.id || 'review_' + idx,
                topicId: ex.topicId || '',
                level: normalizeLevel(ex.level, 'HSK2'),
                prompt: ex.prompt || '',
                sentence: ex.sentence || '',
                explanation: ex.explanation || '',
                answer: answer,
                options: opts
            };
        }) : [];

        if (!chData.grammar.reviewExercises.length) {
            chData.grammar.reviewExercises = topics.slice(0, 6).map(function (t, idx) {
                return t.exercises[0] ? Object.assign({ id: 'review_auto_' + idx }, t.exercises[0]) : null;
            }).filter(Boolean);
        }
    }

    function showHub() {
        updateHubStats();
        // Use the localized home as the canonical Chinese home screen.
        openStartScreen();
    }

    function showVocabSetup() {
        updateVocabSetupStats();
        showScreen(screens.vocabSetup);
    }

    function showGrammarHub() {
        renderGrammarTopicGrid();
        showScreen(screens.grammarHub);
    }

    function showGrammarTheory(topicId) {
        runtime.grammarTopicId = topicId;
        renderGrammarTheory(topicId);
        showScreen(screens.grammarTheory);
    }

    function showPhrasesHub() {
        renderPhraseCategories();
        showScreen(screens.phrasesHub);
    }

    function showPhrasesFavorites() {
        renderPhraseFavorites();
        showScreen(screens.phrasesFavorites);
    }

    function showGameHub() {
        updateChineseAuctionHubStat();
        showScreen(screens.gameHub);
    }

    function showStorySelect() {
        renderStoryList();
        showScreen(screens.storySelect);
    }

    function updateHubStats() {
        var vocabCount = document.getElementById('chinese-vocab-count');
        var grammarCount = document.getElementById('chinese-grammar-count');
        var phrasesCount = document.getElementById('chinese-phrases-count');
        var gameCount = document.getElementById('chinese-game-count');

        if (vocabCount) vocabCount.textContent = chData.words.length + ' từ';
        if (grammarCount) grammarCount.textContent = (chData.grammar.topics || []).length + ' chủ đề';
        if (phrasesCount) phrasesCount.textContent = chData.phrases.length + ' câu';
        if (gameCount) gameCount.textContent = ((chData.stories.stories || []).length) + ' truyện · Đấu giá';
    }

    function updateVocabSetupStats() {
        var pool = getFilteredByLevel(chData.words, selected.vocabLevel);
        var learned = countVocabLearnedByLevel(selected.vocabLevel);
        var due = countVocabDueByLevel(selected.vocabLevel);
        var wrong = countVocabWrongByLevel(selected.vocabLevel);

        var totalCorrect = Number(chProgress.modeCorrect.vocab || 0);
        var totalWrong = Number(chProgress.modeWrong.vocab || 0);
        var accuracy = totalCorrect + totalWrong > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : 0;

        var learnedEl = document.getElementById('chinese-vocab-stat-learned');
        var remainingEl = document.getElementById('chinese-vocab-stat-remaining');
        var accuracyEl = document.getElementById('chinese-vocab-stat-accuracy');
        var noteEl = document.getElementById('chinese-vocab-setup-note');
        var reviewBtn = document.getElementById('chinese-vocab-review-btn');
        var wrongBtn = document.getElementById('chinese-vocab-wrong-btn');

        if (learnedEl) learnedEl.textContent = learned;
        if (remainingEl) remainingEl.textContent = Math.max(0, pool.length - learned);
        if (accuracyEl) accuracyEl.textContent = accuracy + '%';
        if (noteEl) {
            var lv = selected.vocabLevel === 'all' ? 'Tất cả cấp HSK' : selected.vocabLevel;
            noteEl.textContent = lv + ' · ' + pool.length + ' từ · học liên tục đến khi hết';
        }
        if (reviewBtn) {
            reviewBtn.textContent = 'Ôn SRS (' + due + ')';
            reviewBtn.disabled = due === 0;
        }
        if (wrongBtn) {
            wrongBtn.textContent = 'Ôn từ sai (' + wrong + ')';
            wrongBtn.disabled = wrong === 0;
        }
    }

    function getTopicStats(topicId) {
        return chProgress.grammar.topicStats[topicId] || { sessions: 0, bestAcc: 0, totalCorrect: 0, totalWrong: 0 };
    }

    function renderGrammarTopicGrid() {
        var grid = document.getElementById('chinese-grammar-topic-grid');
        var summary = document.getElementById('chinese-grammar-hub-summary');
        var reviewBtn = document.getElementById('chinese-grammar-review-btn');
        if (!grid) return;

        var topics = chData.grammar.topics || [];
        var completed = chProgress.grammar.completedTopicIds.length;
        if (summary) summary.textContent = completed + '/' + topics.length;

        grid.innerHTML = topics.map(function (topic) {
            var locked = !isTopicUnlocked(topic.id);
            var done = isTopicCompleted(topic.id);
            var stats = getTopicStats(topic.id);
            return '<button class="chinese-topic-card' + (locked ? ' chinese-topic-card--locked' : '') + (done ? ' chinese-topic-card--completed' : '') + '" data-topic-id="' + escapeHtml(topic.id) + '" ' + (locked ? 'disabled' : '') + '>'
                + '<div class="chinese-topic-head">'
                + '<div class="chinese-topic-title">' + escapeHtml((topic.name && topic.name.vi) || topic.id) + '</div>'
                + '<span class="chinese-topic-badge">' + escapeHtml(topic.level || 'HSK1') + '</span>'
                + '</div>'
                + '<div class="chinese-topic-meta">'
                + '<span>' + (topic.exercises || []).length + ' bài</span>'
                + '<span>Best ' + Number(stats.bestAcc || 0) + '%</span>'
                + '</div>'
                + '</button>';
        }).join('');

        if (reviewBtn) {
            reviewBtn.disabled = chProgress.grammar.unlockedTopicIds.length === 0;
        }
    }

    function renderGrammarTheory(topicId) {
        var topic = (chData.grammar.topics || []).find(function (t) { return t.id === topicId; });
        if (!topic) return;

        var title = document.getElementById('chinese-grammar-theory-title');
        var level = document.getElementById('chinese-grammar-theory-level');
        var desc = document.getElementById('chinese-grammar-theory-desc');
        var formulas = document.getElementById('chinese-grammar-theory-formulas');
        var signals = document.getElementById('chinese-grammar-theory-signals');
        var notes = document.getElementById('chinese-grammar-theory-notes');

        if (title) title.textContent = (topic.name && topic.name.vi) || 'Chủ đề';
        if (level) level.textContent = topic.level || 'HSK1';
        if (desc) desc.textContent = (topic.theory && topic.theory.description) || 'Chưa có mô tả lý thuyết.';

        if (formulas) {
            var formulaList = (topic.theory && topic.theory.formulas) || [];
            formulas.innerHTML = formulaList.length
                ? formulaList.map(function (f) {
                    var line = (f.structureVi || f.structure || '').trim();
                    var example = f.example ? (f.example.zh + ' · ' + f.example.vi) : '';
                    return '<div class="chinese-theory-card">'
                        + '<div class="chinese-theory-card-title">' + escapeHtml(f.label || 'Mẫu câu') + '</div>'
                        + '<div class="chinese-theory-card-desc">' + escapeHtml(line) + '</div>'
                        + (example ? '<div class="chinese-theory-card-desc"><strong>' + escapeHtml(example) + '</strong></div>' : '')
                        + '</div>';
                }).join('')
                : '<div class="chinese-theory-card"><div class="chinese-theory-card-desc">Chưa có công thức.</div></div>';
        }

        if (signals) {
            var signalWords = (topic.theory && topic.theory.signalWords) || [];
            signals.innerHTML = signalWords.length
                ? signalWords.map(function (s) { return '<span class="chinese-chip">' + escapeHtml(s) + '</span>'; }).join('')
                : '<span class="chinese-chip">Chưa có</span>';
        }

        if (notes) {
            var noteList = (topic.theory && topic.theory.notes) || [];
            notes.innerHTML = noteList.length
                ? noteList.map(function (n) { return '<li>' + escapeHtml(n) + '</li>'; }).join('')
                : '<li>Chưa có ghi chú cho chủ đề này.</li>';
        }
    }

    function renderPhraseCategories() {
        var stats = document.getElementById('chinese-phrases-hub-stats');
        var container = document.getElementById('chinese-phrases-categories');
        if (!container) return;

        var allPhrases = Array.isArray(chData.phrases) ? chData.phrases : [];
        var visiblePool = getFilteredByLevel(allPhrases, selected.phraseLevel);

        var groupedAll = {};
        allPhrases.forEach(function (p) {
            var c = p.category || 'daily';
            if (!groupedAll[c]) groupedAll[c] = [];
            groupedAll[c].push(p);
        });

        var groupedVisible = {};
        visiblePool.forEach(function (p) {
            var c = p.category || 'daily';
            if (!groupedVisible[c]) groupedVisible[c] = [];
            groupedVisible[c].push(p);
        });

        var favorites = Number(chProgress.phrases.favorites.length || 0);
        var practiced = Number(chProgress.modeAnswered.phrases || 0);
        var correct = Number(chProgress.modeCorrect.phrases || 0);
        var accuracy = practiced > 0 ? Math.round((correct / practiced) * 100) : 0;

        function levelCountMap(items) {
            var map = {};
            PHRASE_LEVELS.forEach(function (lv) { map[lv] = 0; });
            items.forEach(function (item) {
                var lv = normalizeLevel(item.level, 'HSK1');
                if (PHRASE_LEVELS.indexOf(lv) >= 0) map[lv] += 1;
            });
            return map;
        }

        function levelBadges(category, countMap) {
            return PHRASE_LEVELS.map(function (lv) {
                if (!countMap[lv]) return '';
                var prog = getPhraseLevelProgress(category, lv);
                var unlocked = isPhraseLevelUnlocked(category, lv, countMap);
                var cls = prog.completed ? 'completed' : (unlocked ? 'current' : 'locked');
                return '<span class="category-level-badge ' + cls + '" data-lv="' + escapeHtml(lv) + '">' + escapeHtml(lv) + '</span>';
            }).join('');
        }

        function completedPercent(category, countMap) {
            var total = 0;
            var completed = 0;
            PHRASE_LEVELS.forEach(function (lv) {
                var count = Number(countMap[lv] || 0);
                if (!count) return;
                total += count;
                if (getPhraseLevelProgress(category, lv).completed) completed += count;
            });
            if (!total) return 0;
            return Math.round((completed / total) * 100);
        }

        if (stats) {
            stats.innerHTML = '<span class="streak-badge">⭐ ' + favorites + ' yêu thích</span>'
                + '<span>' + practiced + ' câu đã luyện</span>'
                + '<span>' + accuracy + '% chính xác</span>';
        }

        var allCountMap = levelCountMap(allPhrases);
        var allTargetLevel = pickPhraseTargetLevel('all', allCountMap, selected.phraseLevel);
        var allLocked = !!(allTargetLevel && !isPhraseLevelUnlocked('all', allTargetLevel, allCountMap));

        var html = '<button class="category-card' + (allLocked ? ' locked' : '') + '" data-category="all" data-level="' + escapeHtml(allTargetLevel || 'all') + '">'
            + '<div class="category-icon">' + phraseCategoryIcon('all') + '</div>'
            + '<div class="category-info">'
            + '<div class="category-name">' + phraseCategoryLabel('all') + '</div>'
            + '<div class="category-count">' + visiblePool.length + ' câu' + (allLocked ? ' (khóa)' : '') + '</div>'
            + '<div class="category-progress-bar"><div class="category-progress-fill" style="width:' + completedPercent('all', allCountMap) + '%"></div></div>'
            + '<div class="category-levels">' + levelBadges('all', allCountMap) + '</div>'
            + '</div>'
            + '</button>';

        orderedPhraseCategories(Object.keys(groupedVisible)).forEach(function (cat) {
            var visibleItems = groupedVisible[cat] || [];
            var allItems = groupedAll[cat] || [];
            var countMap = levelCountMap(allItems);
            var targetLevel = pickPhraseTargetLevel(cat, countMap, selected.phraseLevel);
            var locked = !!(targetLevel && !isPhraseLevelUnlocked(cat, targetLevel, countMap));

            html += '<button class="category-card' + (locked ? ' locked' : '') + '" data-category="' + escapeHtml(cat) + '" data-level="' + escapeHtml(targetLevel || 'all') + '">'
                + '<div class="category-icon">' + phraseCategoryIcon(cat) + '</div>'
                + '<div class="category-info">'
                + '<div class="category-name">' + escapeHtml(phraseCategoryLabel(cat)) + '</div>'
                + '<div class="category-count">' + visibleItems.length + ' câu' + (locked ? ' (khóa)' : '') + '</div>'
                + '<div class="category-progress-bar"><div class="category-progress-fill" style="width:' + completedPercent(cat, countMap) + '%"></div></div>'
                + '<div class="category-levels">' + levelBadges(cat, countMap) + '</div>'
                + '</div>'
                + '</button>';
        });

        container.innerHTML = html;
    }

    function renderPhraseFavorites() {
        var countEl = document.getElementById('chinese-phrases-favorites-count');
        var listEl = document.getElementById('chinese-phrases-favorites-list');
        var practiceBtn = document.getElementById('chinese-phrases-favorites-practice-btn');
        if (!listEl) return;

        var favorites = chProgress.phrases.favorites.map(getPhraseById).filter(Boolean);
        if (countEl) countEl.textContent = String(favorites.length);

        if (!favorites.length) {
            listEl.innerHTML = '<div class="phrases-fav-empty">Chưa có câu yêu thích nào.<br>Bấm ⭐ khi luyện để thêm.</div>';
            if (practiceBtn) practiceBtn.style.display = 'none';
            return;
        }

        listEl.innerHTML = favorites.map(function (p) {
            return '<div class="fav-card">'
                + '<div class="fav-card-text">'
                + '<div class="fav-card-en">' + escapeHtml(p.zh || '') + '</div>'
                + '<div class="fav-card-vi">' + escapeHtml(p.vi || '') + '</div>'
                + '</div>'
                + '<div class="fav-card-actions">'
                + '<button class="fav-remove-btn chinese-fav-remove" data-id="' + escapeHtml(p.id) + '" title="Xóa">'
                + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
                + '</button>'
                + '</div>'
                + '</div>';
        }).join('');

        if (practiceBtn) practiceBtn.style.display = '';
    }

    function renderStoryList() {
        var list = document.getElementById('chinese-story-list');
        if (!list) return;
        var stories = (chData.stories && chData.stories.stories) ? chData.stories.stories : [];
        if (!stories.length) {
            list.innerHTML = '<div class="story-empty">Chưa có truyện tiếng Trung.</div>';
            return;
        }
        list.innerHTML = stories.map(function (story, idx) {
            var firstNode = story.nodes && story.nodes[story.startNode] ? story.nodes[story.startNode] : null;
            var preview = firstNode ? (firstNode.vi || firstNode.zh || '') : '';
            var icon = firstNode && firstNode.emoji ? firstNode.emoji : '📖';
            var endings = 0;
            if (story.nodes) {
                Object.keys(story.nodes).forEach(function (key) {
                    if (story.nodes[key] && story.nodes[key].ending) endings++;
                });
            }
            return '<button class="story-card" data-story-id="' + escapeHtml(story.id || ('story_' + idx)) + '">'
                + '<div class="story-card-icon">' + escapeHtml(icon) + '</div>'
                + '<div class="story-card-info">'
                + '<div class="story-card-title">' + escapeHtml(story.title || ('Story ' + (idx + 1))) + '</div>'
                + '<div class="story-card-meta">'
                + '<span class="story-level-badge">ZH</span>'
                + '<span class="story-theme-tag">Hội thoại</span>'
                + '</div>'
                + '<div class="story-card-footer">'
                + '<span class="story-card-endings">' + endings + ' kết thúc</span>'
                + '</div>'
                + '<div class="story-theme-tag">' + escapeHtml(preview.slice(0, 120)) + '</div>'
                + '</div>'
                + '</button>';
        }).join('');
    }

    function buildVocabQueue(mode) {
        var pool = getFilteredByLevel(chData.words, selected.vocabLevel);
        if (!pool.length) return [];

        if (mode === 'new') {
            var unseen = pool.filter(function (w) {
                var rec = chProgress.vocabSrs[w.id];
                return !rec || Number(rec.level || 0) === 0;
            });
            var seen = pool.filter(function (w) {
                var rec = chProgress.vocabSrs[w.id];
                return rec && Number(rec.level || 0) > 0;
            });
            shuffle(unseen);
            shuffle(seen);
            return unseen.concat(seen);
        }

        if (mode === 'srs') {
            var due = pool.filter(function (w) {
                var rec = chProgress.vocabSrs[w.id];
                return rec && Number(rec.level || 0) > 0 && isDue(rec.nextDue);
            });
            return shuffle(due);
        }

        var wrong = pool.filter(function (w) {
            return Number(chProgress.vocabWrong[w.id] || 0) > 0;
        });
        return shuffle(wrong);
    }

    function buildGrammarQueue(topicId, reviewMode) {
        if (reviewMode) {
            return shuffle((chData.grammar.reviewExercises || []).slice()).slice(0, 15);
        }
        var topic = (chData.grammar.topics || []).find(function (t) { return t.id === topicId; });
        if (!topic) return [];
        return shuffle((topic.exercises || []).slice()).slice(0, 15);
    }

    function buildPhraseQueue(category, fromFavorites, level) {
        var pool = Array.isArray(chData.phrases) ? chData.phrases.slice() : [];
        if (fromFavorites) {
            pool = chProgress.phrases.favorites.map(getPhraseById).filter(Boolean);
        } else {
            if (category && category !== 'all') {
                pool = pool.filter(function (p) { return p.category === category; });
            }
            if (level && level !== 'all') {
                var normalizedLevel = normalizeLevel(level, 'HSK1');
                pool = pool.filter(function (p) {
                    return normalizeLevel(p.level, 'HSK1') === normalizedLevel;
                });
            } else if (selected.phraseLevel !== 'all') {
                pool = getFilteredByLevel(pool, selected.phraseLevel);
            }
        }
        return shuffle(pool.slice()).slice(0, 15);
    }

    function buildListeningQueue() {
        var pool = getFilteredByLevel(chData.phrases, selected.phraseLevel);
        var seen = {};
        var unique = [];

        pool.forEach(function (item) {
            if (!item || !item.zh || !item.vi) return;
            var key = item.id ? ('id:' + item.id) : ('pair:' + phraseKey(item.zh, item.vi));
            if (seen[key]) return;
            seen[key] = true;
            unique.push(item);
        });

        // Listening uses the same phrase/sentence dataset as "Câu và cụm từ",
        // randomized once per session with no duplicates from start to end.
        return shuffle(unique.slice()).slice(0, 30);
    }

    function updateSpeedButtons() {
        var normal = document.getElementById('chinese-speed-normal');
        var slow = document.getElementById('chinese-speed-slow');
        if (normal) normal.classList.toggle('active', runtime.speechRate === 1.0);
        if (slow) slow.classList.toggle('active', runtime.speechRate !== 1.0);
    }

    function modeTitle(kind, source) {
        if (kind === 'vocab') {
            if (source === 'vocab_srs') return 'Từ vựng · Ôn SRS';
            if (source === 'vocab_wrong') return 'Từ vựng · Ôn từ sai';
            return 'Từ vựng · Từ mới';
        }
        if (kind === 'grammar') {
            if (source === 'grammar_review') return 'Ngữ pháp · Ôn tập';
            var topic = (chData.grammar.topics || []).find(function (t) { return t.id === runtime.practice.topicId; });
            return topic ? ('Ngữ pháp · ' + ((topic.name && topic.name.vi) || topic.id)) : 'Ngữ pháp';
        }
        if (kind === 'phrases') return 'Câu giao tiếp';
        if (kind === 'listening') return 'Luyện nghe';
        return 'Tiếng Trung';
    }

    function startPracticeSession(config) {
        if (!config.queue || !config.queue.length) {
            alert('Không có dữ liệu phù hợp cho chế độ này.');
            return;
        }

        runtime.practice = {
            kind: config.kind,
            source: config.source,
            queue: config.queue,
            idx: 0,
            correct: 0,
            wrong: 0,
            returnMode: config.returnMode || 'hub',
            direction: config.direction || 'zh-to-vi',
            topicId: config.topicId || null,
            phraseCategory: config.phraseCategory || 'all',
            phraseLevel: config.phraseLevel || 'all',
            fromFavorites: !!config.fromFavorites
        };

        runtime.lastStarter = config.starter || null;
        runtime.question = null;
        updateSpeedButtons();
        showScreen(screens.practice);
        showPracticeQuestion();
    }

    function buildVocabQuestion(item) {
        var answer = item.meaning;
        var options = [answer].concat(shuffle(chData.words.map(function (w) { return w.meaning; })).filter(function (m) { return m && m !== answer; }).slice(0, 3));
        options = shuffle(options);
        return {
            typing: false,
            main: item.word,
            sub: item.pinyin || '',
            answer: answer,
            options: options,
            speakText: item.word,
            itemId: item.id,
            bookmarkable: false
        };
    }

    function buildGrammarQuestion(item) {
        var line = item.sentence ? (item.prompt + '\n' + item.sentence) : item.prompt;
        return {
            typing: false,
            main: line || 'Chọn đáp án đúng',
            sub: item.explanation || ('Cấp độ ' + (item.level || 'HSK1')),
            answer: item.answer,
            options: (item.options || []).slice(0, 4),
            speakText: '',
            itemId: item.id,
            bookmarkable: false
        };
    }

    function buildPhraseQuestion(item, listeningMode) {
        var dir = runtime.practice.direction;
        var typing = listeningMode ? true : (Math.random() < 0.4);

        if (listeningMode) {
            return {
                typing: true,
                main: 'Nghe câu tiếng Trung và nhập nghĩa tiếng Việt',
                sub: item.pinyin || '',
                answer: item.vi,
                options: [],
                speakText: item.zh,
                itemId: item.id,
                bookmarkable: false,
                original: item.zh
            };
        }

        if (dir === 'zh-to-vi') {
            var viOptions = [item.vi].concat(shuffle(chData.phrases.map(function (p) { return p.vi; })).filter(function (v) { return v && v !== item.vi; }).slice(0, 3));
            return {
                typing: typing,
                main: item.zh,
                sub: item.pinyin || '',
                answer: item.vi,
                options: shuffle(viOptions),
                speakText: item.zh,
                itemId: item.id,
                bookmarkable: true,
                original: item.zh
            };
        }

        var zhOptions = [item.zh].concat(shuffle(chData.phrases.map(function (p2) { return p2.zh; })).filter(function (z) { return z && z !== item.zh; }).slice(0, 3));
        return {
            typing: typing,
            main: item.vi,
            sub: 'Dịch sang tiếng Trung',
            answer: item.zh,
            options: shuffle(zhOptions),
            speakText: item.zh,
            itemId: item.id,
            bookmarkable: true,
            original: item.vi
        };
    }

    function getPracticeQuestion(item) {
        if (runtime.practice.kind === 'vocab') return buildVocabQuestion(item);
        if (runtime.practice.kind === 'grammar') return buildGrammarQuestion(item);
        if (runtime.practice.kind === 'phrases') return buildPhraseQuestion(item, false);
        return buildPhraseQuestion(item, true);
    }

    function applyPracticeUIMode() {
        var isListening = !!(runtime.practice && runtime.practice.kind === 'listening');
        var screen = screens.practice;
        if (screen) screen.classList.toggle('chinese-listening-mode', isListening);

        var counter = document.getElementById('chinese-counter');
        if (counter) counter.classList.toggle('ls-counter', isListening);

        var questionCard = document.getElementById('chinese-question-card');
        if (questionCard) questionCard.classList.toggle('ls-play-area', isListening);

        var mainText = document.getElementById('chinese-main-text');
        if (mainText) mainText.classList.toggle('ls-hint-text', isListening);

        var subText = document.getElementById('chinese-sub-text');
        if (subText) subText.style.display = isListening ? 'none' : '';

        var typingArea = document.getElementById('chinese-typing-area');
        if (typingArea) typingArea.classList.toggle('ls-input-area', isListening);

        var input = document.getElementById('chinese-typing-input');
        if (input) {
            input.classList.toggle('ls-input', isListening);
            input.classList.toggle('typing-input', !isListening);
            input.placeholder = isListening ? 'Nhập nghĩa tiếng Việt bạn nghe được...' : 'Nhập câu trả lời...';
        }

        var submitBtn = document.getElementById('chinese-submit-btn');
        if (submitBtn) {
            submitBtn.classList.toggle('ls-submit-btn', isListening);
            submitBtn.classList.toggle('btn-large', isListening);
        }

        var nextBtn = document.getElementById('chinese-next-btn');
        if (nextBtn) {
            if (!nextBtn.dataset.defaultHtml) nextBtn.dataset.defaultHtml = nextBtn.innerHTML;
            nextBtn.classList.toggle('ls-next-btn', isListening);
            nextBtn.classList.toggle('btn-secondary', isListening);
            if (isListening) {
                nextBtn.innerHTML = 'Câu tiếp theo →';
            } else if (nextBtn.dataset.defaultHtml) {
                nextBtn.innerHTML = nextBtn.dataset.defaultHtml;
            }
        }

        var speakBtn = document.getElementById('chinese-speak-btn');
        if (speakBtn) {
            if (!speakBtn.dataset.defaultHtml) speakBtn.dataset.defaultHtml = speakBtn.innerHTML;
            speakBtn.classList.toggle('ls-speak-btn', isListening);
            speakBtn.classList.toggle('speak-btn', !isListening);
            if (isListening) {
                speakBtn.innerHTML = '<span class="ls-speak-icon">🔊</span><span class="ls-speak-label">Phát âm</span>';
            } else if (speakBtn.dataset.defaultHtml) {
                speakBtn.innerHTML = speakBtn.dataset.defaultHtml;
            }
        }

        var slowBtn = document.getElementById('chinese-speed-slow');
        if (slowBtn) {
            slowBtn.classList.toggle('ls-speak-slow-btn', isListening);
            slowBtn.classList.toggle('speed-btn', !isListening);
            slowBtn.textContent = isListening ? '🐢 Chậm' : 'Slow';
        }
    }

    function showPracticeQuestion() {
        if (!runtime.practice) return;
        if (runtime.practice.idx >= runtime.practice.queue.length) {
            showPracticeResult();
            return;
        }

        var item = runtime.practice.queue[runtime.practice.idx];
        runtime.question = getPracticeQuestion(item);
        applyPracticeUIMode();

        var total = runtime.practice.queue.length;
        var idx = runtime.practice.idx;

        var counter = document.getElementById('chinese-counter');
        var progress = document.getElementById('chinese-progress-bar-practice');
        var correctEl = document.getElementById('chinese-correct');
        var wrongEl = document.getElementById('chinese-wrong');
        var badge = document.getElementById('chinese-mode-badge');

        if (counter) counter.textContent = (idx + 1) + ' / ' + total;
        if (progress) progress.style.width = (((idx + 1) / total) * 100) + '%';
        if (correctEl) correctEl.textContent = runtime.practice.correct;
        if (wrongEl) wrongEl.textContent = runtime.practice.wrong;

        if (badge) {
            var title = modeTitle(runtime.practice.kind, runtime.practice.source);
            if (runtime.practice.kind === 'vocab' || runtime.practice.kind === 'phrases') {
                var d = runtime.practice.direction === 'zh-to-vi' ? 'Trung → Việt' : 'Việt → Trung';
                badge.textContent = title + ' · ' + d;
            } else {
                badge.textContent = title;
            }
        }

        document.getElementById('chinese-main-text').textContent = runtime.question.main || '';
        document.getElementById('chinese-sub-text').textContent = runtime.question.sub || '';

        var feedback = document.getElementById('chinese-feedback');
        var answer = document.getElementById('chinese-correct-answer');
        var nextBtn = document.getElementById('chinese-next-btn');
        var submitBtn = document.getElementById('chinese-submit-btn');
        var input = document.getElementById('chinese-typing-input');

        feedback.textContent = '';
        feedback.className = 'feedback';
        feedback.style.display = runtime.practice.kind === 'listening' ? 'none' : '';
        answer.style.display = 'none';
        answer.className = 'phrases-correct-answer';
        nextBtn.disabled = true;
        nextBtn.style.display = runtime.practice.kind === 'listening' ? 'none' : '';
        submitBtn.disabled = false;

        input.value = '';
        input.disabled = false;
        input.classList.remove('correct', 'close', 'wrong');
        input.dataset.answer = runtime.question.answer;

        var mcArea = document.getElementById('chinese-mc-area');
        var typingArea = document.getElementById('chinese-typing-area');

        if (runtime.question.typing) {
            mcArea.style.display = 'none';
            typingArea.style.display = '';
            setTimeout(function () {
                input.focus();
            }, 80);
        } else {
            mcArea.style.display = '';
            typingArea.style.display = 'none';
            var optionBtns = document.querySelectorAll('#chinese-options .option-btn');
            optionBtns.forEach(function (btn, optIdx) {
                var value = runtime.question.options[optIdx] || '';
                btn.dataset.value = value;
                btn.textContent = value;
                btn.style.display = value ? '' : 'none';
                btn.disabled = !value;
                btn.className = 'option-btn';
            });
        }

        var speakBtn = document.getElementById('chinese-speak-btn');
        if (speakBtn) {
            speakBtn.style.display = runtime.question.speakText ? '' : 'none';
        }

        updateBookmarkButton();

        if (runtime.question.speakText && (runtime.practice.kind === 'listening' || runtime.practice.direction === 'zh-to-vi')) {
            if (typeof window.speakText === 'function') {
                var nextItem = runtime.practice.queue[runtime.practice.idx + 1] || null;
                var nextText = '';
                if (nextItem) {
                    if (runtime.practice.kind === 'vocab') nextText = nextItem.word || '';
                    else nextText = nextItem.zh || '';
                }
                setTimeout(function () {
                    window.speakText(runtime.question.speakText, {
                        lang: 'zh-CN',
                        rate: runtime.speechRate,
                        btn: document.getElementById('chinese-speak-btn'),
                        audioId: runtime.question.itemId || null,
                        auto: true,
                        preloadNext: nextText ? {
                            text: nextText,
                            lang: 'zh-CN',
                            rate: runtime.speechRate,
                            audioId: nextItem && nextItem.id ? nextItem.id : null,
                        } : null,
                    });
                }, 220);
            }
        }

        if (window.SeenPhrases && (runtime.practice.kind === 'phrases' || runtime.practice.kind === 'listening') && item.id) {
            window.SeenPhrases.add(item.id);
        }
    }

    function updateBookmarkButton() {
        var btn = document.getElementById('chinese-bookmark-btn');
        if (!btn || !runtime.practice || !runtime.question) return;

        if (runtime.practice.kind !== 'phrases' || !runtime.question.bookmarkable) {
            btn.style.display = 'none';
            return;
        }

        btn.style.display = '';
        var fav = isFavoritePhrase(runtime.question.itemId);
        btn.classList.toggle('active', fav);
    }

    function toggleCurrentBookmark() {
        if (!runtime.practice || runtime.practice.kind !== 'phrases' || !runtime.question) return;
        toggleFavoritePhrase(runtime.question.itemId);
        updateBookmarkButton();
        renderPhraseCategories();
    }

    function setPracticeFeedback(type, msg, correctAnswer) {
        var feedback = document.getElementById('chinese-feedback');
        var answer = document.getElementById('chinese-correct-answer');
        feedback.textContent = msg;
        if (runtime.practice && runtime.practice.kind === 'listening') {
            feedback.className = 'ls-feedback';
            if (type === 'correct') feedback.classList.add('ls-feedback--correct');
            else if (type === 'close') feedback.classList.add('ls-feedback--close');
            else if (type === 'wrong') feedback.classList.add('ls-feedback--wrong');
            feedback.style.display = 'flex';
        } else {
            feedback.className = 'feedback ' + type;
            feedback.style.display = '';
        }

        if (correctAnswer) {
            answer.style.display = '';
            if (runtime.practice && runtime.practice.kind === 'listening') {
                answer.className = 'ls-answer-reveal';
                answer.innerHTML = '<span class="ls-answer-label">Đáp án đúng:</span><span class="ls-answer-text">' + escapeHtml(correctAnswer) + '</span>';
            } else {
                answer.className = 'phrases-correct-answer';
                answer.innerHTML = 'Đáp án: <strong>' + escapeHtml(correctAnswer) + '</strong>';
            }
        } else {
            answer.style.display = 'none';
        }
    }

    function lockPracticeInput() {
        var optionBtns = document.querySelectorAll('#chinese-options .option-btn');
        optionBtns.forEach(function (btn) { btn.disabled = true; });
        var input = document.getElementById('chinese-typing-input');
        var submitBtn = document.getElementById('chinese-submit-btn');
        input.disabled = true;
        submitBtn.disabled = true;
    }

    function scorePractice(correct, close) {
        if (correct || close) {
            runtime.practice.correct++;
            if (typeof addXP === 'function') addXP(8);
            if (typeof SFX !== 'undefined') SFX.correct();
        } else {
            runtime.practice.wrong++;
            if (typeof SFX !== 'undefined') SFX.wrong();
        }
        document.getElementById('chinese-correct').textContent = runtime.practice.correct;
        document.getElementById('chinese-wrong').textContent = runtime.practice.wrong;
        var nextBtn = document.getElementById('chinese-next-btn');
        nextBtn.disabled = false;
        if (runtime.practice && runtime.practice.kind === 'listening') {
            nextBtn.style.display = '';
        }
    }

    function onAnswered(correct, close) {
        var item = runtime.practice.queue[runtime.practice.idx];

        if (runtime.practice.kind === 'vocab') {
            updateVocabSrs(item.id, !!(correct || close));
        }

        lockPracticeInput();
        scorePractice(correct, close);
        saveProgress();
    }

    function submitMC(value) {
        if (!runtime.question || !value) return;
        var answer = runtime.question.answer;
        var isCorrect = value === answer;

        if (runtime.practice && runtime.practice.kind === 'vocab' && !isCorrect) {
            document.querySelectorAll('#chinese-options .option-btn').forEach(function (btn) {
                if (btn.dataset.value === value) {
                    btn.classList.add('wrong');
                    btn.disabled = true;
                }
            });
            setPracticeFeedback('wrong', 'Sai rồi, hãy chọn lại đáp án đúng.');
            if (typeof SFX !== 'undefined') SFX.wrong();
            document.getElementById('chinese-next-btn').disabled = true;
            return;
        }

        document.querySelectorAll('#chinese-options .option-btn').forEach(function (btn) {
            btn.disabled = true;
            if (btn.dataset.value === answer) btn.classList.add('correct');
            if (btn.dataset.value === value && value !== answer) btn.classList.add('wrong');
        });

        if (isCorrect) {
            setPracticeFeedback('correct', 'Chính xác!');
            onAnswered(true, false);
        } else {
            setPracticeFeedback('wrong', 'Sai rồi!', answer);
            onAnswered(false, false);
        }
    }

    async function submitTyping() {
        if (!runtime.question) return;
        var input = document.getElementById('chinese-typing-input');
        if (input.disabled) return;

        var userText = input.value.trim();
        if (!userText) return;

        var answer = runtime.question.answer || '';
        var result = 'wrong';

        if (window.AnswerMatch && typeof window.AnswerMatch.checkAnswer === 'function') {
            var opts = { mode: 'phrase' };
            if (runtime.practice.direction === 'zh-to-vi' || runtime.practice.kind === 'listening') {
                opts.fromLang = 'vi';
                opts.toLang = 'zh';
            } else {
                opts.fromLang = 'zh';
                opts.toLang = 'vi';
                opts.targetLang = 'zh';
            }
            result = window.AnswerMatch.checkAnswer(userText, answer, opts);
            if (result === 'wrong' && typeof window.AnswerMatch.checkAnswerAsync === 'function') {
                setPracticeFeedback('checking', 'Đang kiểm tra...');
                var asyncRes = await window.AnswerMatch.checkAnswerAsync(userText, answer, runtime.question.original || '', opts);
                result = asyncRes.result;
            }
        } else {
            var nUser = normalizeText(userText);
            var nAns = normalizeText(answer);
            if (nUser === nAns) result = 'correct';
            else {
                var dist = levenshtein(nUser, nAns);
                var threshold = Math.max(1, Math.floor(nAns.length * 0.15));
                result = dist <= threshold ? 'close' : 'wrong';
            }
        }

        if (result === 'correct') {
            input.classList.add('correct');
            setPracticeFeedback('correct', 'Chính xác!');
            onAnswered(true, false);
        } else if (result === 'close') {
            input.classList.add('close');
            setPracticeFeedback('close', 'Gần đúng!', answer);
            onAnswered(false, true);
        } else {
            input.classList.add('wrong');
            setPracticeFeedback('wrong', 'Sai rồi!', answer);
            onAnswered(false, false);
        }
    }

    function nextQuestion() {
        if (!runtime.practice) return;
        runtime.practice.idx++;
        showPracticeQuestion();
    }

    function openModeFromResultBack() {
        if (!runtime.practice) {
            showHub();
            return;
        }

        if (runtime.practice.returnMode === 'vocab_setup') {
            showVocabSetup();
            return;
        }
        if (runtime.practice.returnMode === 'grammar_hub') {
            showGrammarHub();
            return;
        }
        if (runtime.practice.returnMode === 'phrases_hub') {
            showPhrasesHub();
            return;
        }
        if (runtime.practice.returnMode === 'phrases_favorites') {
            showPhrasesFavorites();
            return;
        }
        if (runtime.practice.returnMode === 'game_hub') {
            showGameHub();
            return;
        }
        showHub();
    }

    function applySessionProgress(kind, correct, wrong) {
        var key = kind;
        chProgress.sessions[key] = Number(chProgress.sessions[key] || 0) + 1;
        chProgress.modeCorrect[key] = Number(chProgress.modeCorrect[key] || 0) + correct;
        chProgress.modeWrong[key] = Number(chProgress.modeWrong[key] || 0) + wrong;
        chProgress.modeAnswered[key] = Number(chProgress.modeAnswered[key] || 0) + correct + wrong;
        chProgress.correct = Number(chProgress.correct || 0) + correct;
        chProgress.wrong = Number(chProgress.wrong || 0) + wrong;
        chProgress.lastMode = key;
    }

    function showResultScreen(opts) {
        var total = opts.correct + opts.wrong;
        var acc = total > 0 ? Math.round((opts.correct / total) * 100) : 0;

        document.getElementById('chinese-result-correct').textContent = opts.correct;
        document.getElementById('chinese-result-wrong').textContent = opts.wrong;
        document.getElementById('chinese-result-accuracy').textContent = acc + '%';
        document.getElementById('chinese-result-subtitle').textContent = opts.subtitle || 'Tiếng Trung';

        if (acc >= 85) {
            document.getElementById('chinese-result-icon').textContent = '🏮';
            document.getElementById('chinese-result-title').textContent = 'Xuất sắc!';
        } else if (acc >= 65) {
            document.getElementById('chinese-result-icon').textContent = '🎯';
            document.getElementById('chinese-result-title').textContent = 'Tốt lắm!';
        } else {
            document.getElementById('chinese-result-icon').textContent = '📘';
            document.getElementById('chinese-result-title').textContent = 'Cần luyện thêm';
        }

        runtime.replayAction = opts.onReplay || null;
        runtime.backAction = opts.onBack || null;

        updateHubStats();
        updateVocabSetupStats();
        renderGrammarTopicGrid();
        renderPhraseCategories();
        renderPhraseFavorites();

        saveProgress();
        if (typeof window.refreshLocalizedHome === 'function') window.refreshLocalizedHome();
        showScreen(screens.result);
    }

    function showPracticeResult() {
        if (!runtime.practice) return;

        var correct = runtime.practice.correct;
        var wrong = runtime.practice.wrong;
        var acc = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;

        applySessionProgress(runtime.practice.kind, correct, wrong);

        if (runtime.practice.kind === 'grammar' && runtime.practice.source === 'grammar_topic' && runtime.practice.topicId) {
            updateTopicProgress(runtime.practice.topicId, correct, wrong, acc);
        }

        if (
            runtime.practice.kind === 'phrases'
            && runtime.practice.source === 'phrases_category'
            && !runtime.practice.fromFavorites
            && runtime.practice.phraseCategory
            && runtime.practice.phraseLevel
            && runtime.practice.phraseLevel !== 'all'
        ) {
            updatePhraseLevelProgress(runtime.practice.phraseCategory, runtime.practice.phraseLevel, correct, wrong, acc);
        }

        var subtitle = modeTitle(runtime.practice.kind, runtime.practice.source);
        showResultScreen({
            correct: correct,
            wrong: wrong,
            subtitle: subtitle,
            onReplay: function () {
                if (runtime.lastStarter) runtime.lastStarter();
            },
            onBack: openModeFromResultBack
        });
    }

    function startVocabNew() {
        var queue = buildVocabQueue('new');
        startPracticeSession({
            kind: 'vocab',
            source: 'vocab_new',
            queue: queue,
            direction: 'zh-to-vi',
            returnMode: 'vocab_setup',
            starter: startVocabNew
        });
    }

    function startVocabSrs() {
        var queue = buildVocabQueue('srs');
        startPracticeSession({
            kind: 'vocab',
            source: 'vocab_srs',
            queue: queue,
            direction: 'zh-to-vi',
            returnMode: 'vocab_setup',
            starter: startVocabSrs
        });
    }

    function startVocabWrong() {
        var queue = buildVocabQueue('wrong');
        startPracticeSession({
            kind: 'vocab',
            source: 'vocab_wrong',
            queue: queue,
            direction: 'zh-to-vi',
            returnMode: 'vocab_setup',
            starter: startVocabWrong
        });
    }

    function startGrammarTopic(topicId) {
        var queue = buildGrammarQueue(topicId, false);
        startPracticeSession({
            kind: 'grammar',
            source: 'grammar_topic',
            queue: queue,
            direction: 'zh-to-vi',
            returnMode: 'grammar_hub',
            topicId: topicId,
            starter: function () { startGrammarTopic(topicId); }
        });
    }

    function startGrammarReview() {
        var queue = buildGrammarQueue('', true);
        startPracticeSession({
            kind: 'grammar',
            source: 'grammar_review',
            queue: queue,
            direction: 'zh-to-vi',
            returnMode: 'grammar_hub',
            starter: startGrammarReview
        });
    }

    function startPhraseCategory(category, level) {
        var targetLevel = level || selected.phraseLevel || 'all';
        var queue = buildPhraseQueue(category, false, targetLevel);
        startPracticeSession({
            kind: 'phrases',
            source: 'phrases_category',
            queue: queue,
            direction: pickDirection(),
            returnMode: 'phrases_hub',
            phraseCategory: category,
            phraseLevel: targetLevel,
            starter: function () { startPhraseCategory(category, targetLevel); }
        });
    }

    function startFavoritePhrases() {
        var queue = buildPhraseQueue('all', true);
        startPracticeSession({
            kind: 'phrases',
            source: 'phrases_favorites',
            queue: queue,
            direction: pickDirection(),
            returnMode: 'phrases_favorites',
            fromFavorites: true,
            starter: startFavoritePhrases
        });
    }

    function startListening() {
        var queue = buildListeningQueue();
        startPracticeSession({
            kind: 'listening',
            source: 'listening',
            queue: queue,
            direction: 'zh-to-vi',
            returnMode: 'hub',
            starter: startListening
        });
    }

    function startStoryById(storyId) {
        var stories = (chData.stories && chData.stories.stories) ? chData.stories.stories : [];
        runtime.activeStory = stories.find(function (s) { return s.id === storyId; }) || null;
        if (!runtime.activeStory) {
            alert('Không tìm thấy truyện này.');
            return;
        }

        runtime.activeStoryNode = runtime.activeStory.startNode;
        document.getElementById('chinese-story-title').textContent = runtime.activeStory.title || 'Truyện tiếng Trung';
        document.getElementById('chinese-story-score').textContent = '0 ⭐';
        runtime.storyScore = 0;

        showScreen(screens.story);
        renderStoryNode();
    }

    function finishStory() {
        var score = Math.max(1, Number(runtime.storyScore || 0));
        chProgress.storyBest = Math.max(Number(chProgress.storyBest || 0), score);
        applySessionProgress('story', score, 0);

        showResultScreen({
            correct: score,
            wrong: 0,
            subtitle: 'Story tiếng Trung',
            onReplay: function () {
                if (runtime.activeStory) startStoryById(runtime.activeStory.id);
            },
            onBack: showStorySelect
        });
    }

    function renderStoryNode() {
        if (!runtime.activeStory || !runtime.activeStory.nodes) return;
        var node = runtime.activeStory.nodes[runtime.activeStoryNode];
        if (!node) return;

        document.getElementById('chinese-story-emoji').textContent = node.emoji || '📖';
        document.getElementById('chinese-story-text').textContent = node.zh || '';
        document.getElementById('chinese-story-text-vi').textContent = node.vi || '';
        document.getElementById('chinese-story-text-vi').style.display = 'none';

        var choices = document.getElementById('chinese-story-choices');
        choices.innerHTML = '';

        if (node.ending) {
            var finishBtn = document.createElement('button');
            finishBtn.className = 'btn-primary btn-large';
            finishBtn.textContent = 'Kết thúc · Xem điểm';
            finishBtn.addEventListener('click', finishStory);
            choices.appendChild(finishBtn);
            return;
        }

        (node.choices || []).forEach(function (choice) {
            var btn = document.createElement('button');
            btn.className = 'story-choice-btn';
            btn.textContent = choice.text;
            btn.addEventListener('click', function () {
                runtime.storyScore = Number(runtime.storyScore || 0) + Number(choice.points || 0);
                document.getElementById('chinese-story-score').textContent = runtime.storyScore + ' ⭐';
                runtime.activeStoryNode = choice.next;
                renderStoryNode();
            });
            choices.appendChild(btn);
        });
    }

    function loadChineseAuctionProgress() {
        var saved = localStorage.getItem('eq_ch_auction_progress');
        if (saved) {
            try {
                auction.progress = JSON.parse(saved);
            } catch (e) {
                auction.progress = null;
            }
        }
        if (!auction.progress) {
            auction.progress = {
                coins: 100,
                totalGames: 0,
                totalCorrect: 0,
                totalWrong: 0,
                bestGame: 0,
                lastDailyBonus: '',
                missionsToday: 0,
                lastMissionDate: ''
            };
            saveChineseAuctionProgress();
        }
    }

    function saveChineseAuctionProgress() {
        localStorage.setItem('eq_ch_auction_progress', JSON.stringify(auction.progress));
    }

    function updateChineseAuctionHubStat() {
        var stat = document.getElementById('chinese-auction-hub-stat');
        if (!stat) return;
        loadChineseAuctionProgress();
        stat.textContent = '💰 ' + auction.progress.coins + ' xu | ' + auction.progress.totalGames + ' ván';
    }

    function checkChineseAuctionDailyBonus() {
        var today = todayISO();
        if (auction.progress.lastDailyBonus !== today) {
            auction.progress.coins += 10;
            auction.progress.lastDailyBonus = today;
            saveChineseAuctionProgress();
        }
    }

    function showChineseAuctionHome() {
        loadChineseAuctionProgress();
        checkChineseAuctionDailyBonus();

        var bonusEl = document.getElementById('chinese-auction-daily-bonus');
        var playBtn = document.getElementById('chinese-auction-play-btn');
        var missionBtn = document.getElementById('chinese-auction-mission-btn');
        var missionInfo = document.getElementById('chinese-auction-mission-info');
        var today = todayISO();

        document.getElementById('chinese-auction-coins-amount').textContent = auction.progress.coins;

        if (bonusEl) {
            if (auction.progress.lastDailyBonus === today) bonusEl.innerHTML = '<span class="auction-bonus-claimed">✅ Đã nhận 10 xu hôm nay</span>';
            else bonusEl.innerHTML = '';
        }

        if (playBtn) {
            if (auction.progress.coins < 10) {
                playBtn.disabled = true;
                playBtn.textContent = '🎮 Cần tối thiểu 10 xu — Làm nhiệm vụ để kiếm xu';
            } else {
                playBtn.disabled = false;
                playBtn.textContent = '🎮 Chơi ngay (15 câu)';
            }
        }

        var missionsLeft = auction.progress.lastMissionDate === today ? Math.max(0, 3 - auction.progress.missionsToday) : 3;
        if (missionBtn) missionBtn.disabled = missionsLeft <= 0;
        if (missionInfo) missionInfo.textContent = missionsLeft <= 0 ? 'Đã hết lượt nhiệm vụ hôm nay (0/3)' : ('Còn ' + missionsLeft + '/3 lượt hôm nay');

        document.getElementById('chinese-auction-stat-games').textContent = auction.progress.totalGames;
        document.getElementById('chinese-auction-stat-correct').textContent = auction.progress.totalCorrect;
        document.getElementById('chinese-auction-stat-wrong').textContent = auction.progress.totalWrong;
        document.getElementById('chinese-auction-stat-best').textContent = auction.progress.bestGame;

        updateChineseAuctionHubStat();
        showScreen(screens.auctionHome);
    }

    function startChineseAuctionGame(isMission) {
        loadChineseAuctionProgress();
        auction.isMission = !!isMission;

        if (!auction.isMission && Number(auction.progress.coins || 0) < 10) {
            alert('Bạn cần ít nhất 10 xu để vào ván thường. Hãy làm nhiệm vụ để kiếm xu.');
            showChineseAuctionHome();
            return;
        }

        var totalQ = auction.isMission ? 10 : 15;
        var all = Array.isArray(chData.auction.questions) ? chData.auction.questions.slice() : [];
        if (!all.length) {
            alert('Chưa có dữ liệu đấu giá tiếng Trung.');
            return;
        }
        all = shuffle(all);

        auction.questions = all.slice(0, totalQ);
        auction.currentIdx = 0;
        auction.currentBet = 0;
        auction.sessionCorrect = 0;
        auction.sessionWrong = 0;
        auction.sessionEarned = 0;
        auction.sessionLost = 0;
        auction.orderSelected = [];

        if (auction.isMission) {
            var today = todayISO();
            if (auction.progress.lastMissionDate !== today) {
                auction.progress.lastMissionDate = today;
                auction.progress.missionsToday = 0;
            }
            auction.progress.missionsToday++;
            saveChineseAuctionProgress();
        }

        document.getElementById('chinese-auction-play-coins').textContent = auction.progress.coins;
        showChineseAuctionQuestion();
        showScreen(screens.auctionPlay);
    }

    function showChineseAuctionQuestion() {
        var q = auction.questions[auction.currentIdx];
        var total = auction.questions.length;
        if (!q) {
            showChineseAuctionResult();
            return;
        }

        document.getElementById('chinese-auction-play-progress').textContent = (auction.currentIdx + 1) + '/' + total;
        document.getElementById('chinese-auction-progress-bar').style.width = ((auction.currentIdx / total) * 100) + '%';
        document.getElementById('chinese-auction-play-coins').textContent = auction.progress.coins;

        var feedback = document.getElementById('chinese-auction-feedback');
        var nextBtn = document.getElementById('chinese-auction-next-btn');
        var answerArea = document.getElementById('chinese-auction-answer-area');
        feedback.style.display = 'none';
        feedback.innerHTML = '';
        nextBtn.style.display = 'none';
        answerArea.style.display = 'none';
        answerArea.innerHTML = '';

        var qArea = document.getElementById('chinese-auction-question-area');
        if (q.type === 'grammar_check') renderChineseAuctionGrammarQuestion(qArea, q);
        else if (q.type === 'fill_blank') renderChineseAuctionFillBlankQuestion(qArea, q);
        else if (q.type === 'word_order') renderChineseAuctionWordOrderQuestion(qArea, q);
        else renderChineseAuctionGrammarQuestion(qArea, q);

        var betArea = document.getElementById('chinese-auction-bet-area');
        if (auction.isMission) {
            betArea.style.display = 'none';
            auction.currentBet = 1;
            showChineseAuctionAnswerArea();
        } else {
            betArea.style.display = 'block';
            auction.currentBet = 0;
            document.querySelectorAll('#chinese-auction-bet-area .chinese-auction-bet-btn').forEach(function (btn) {
                var val = Number(btn.dataset.bet || 0);
                btn.disabled = val > auction.progress.coins;
                btn.classList.remove('selected');
            });
        }
    }

    function selectChineseAuctionBet(amount) {
        if (amount > auction.progress.coins) return;
        auction.currentBet = amount;
        document.querySelectorAll('#chinese-auction-bet-area .chinese-auction-bet-btn').forEach(function (btn) {
            btn.classList.toggle('selected', Number(btn.dataset.bet || 0) === amount);
        });
        showChineseAuctionAnswerArea();
    }

    function showChineseAuctionAnswerArea() {
        var q = auction.questions[auction.currentIdx];
        var answerArea = document.getElementById('chinese-auction-answer-area');
        answerArea.style.display = 'block';

        if (q.type === 'grammar_check') renderChineseAuctionGrammarAnswer(answerArea, q);
        else if (q.type === 'fill_blank') renderChineseAuctionFillBlankAnswer(answerArea, q);
        else if (q.type === 'word_order') renderChineseAuctionWordOrderAnswer(answerArea, q);
        else renderChineseAuctionGrammarAnswer(answerArea, q);
    }

    function renderChineseAuctionGrammarQuestion(area, q) {
        area.innerHTML = '<div class="auction-q-type">Ngữ pháp đúng hay sai?</div>'
            + '<div class="auction-q-sentence">"' + escapeHtml(q.sentence || '') + '"</div>';
    }

    function renderChineseAuctionGrammarAnswer(area, q) {
        area.innerHTML = '<div class="auction-answer-btns">'
            + '<button class="auction-ans-btn auction-ans-correct" data-answer="true">✅ Đúng</button>'
            + '<button class="auction-ans-btn auction-ans-wrong" data-answer="false">❌ Sai</button>'
            + '</div>';
        area.querySelectorAll('.auction-ans-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var userAns = btn.dataset.answer === 'true';
                submitChineseAuctionAnswer(userAns === !!q.isCorrect, q);
            });
        });
    }

    function renderChineseAuctionFillBlankQuestion(area, q) {
        area.innerHTML = '<div class="auction-q-type">Điền từ vào chỗ trống</div>'
            + '<div class="auction-q-sentence">"' + escapeHtml(q.sentence || '') + '"</div>';
    }

    function renderChineseAuctionFillBlankAnswer(area, q) {
        var options = shuffle((q.options || []).slice());
        area.innerHTML = '<div class="auction-fill-options">'
            + options.map(function (opt) {
                return '<button class="auction-fill-btn" data-answer="' + escapeHtml(opt) + '">' + escapeHtml(opt) + '</button>';
            }).join('')
            + '</div>';
        area.querySelectorAll('.auction-fill-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var isCorrect = btn.dataset.answer === String(q.correctAnswer || '');
                submitChineseAuctionAnswer(isCorrect, q);
            });
        });
    }

    function renderChineseAuctionWordOrderQuestion(area, q) {
        auction.orderSelected = [];
        var shuffledWords = shuffle((q.words || []).slice());
        area.innerHTML = '<div class="auction-q-type">Sắp xếp thành câu đúng</div>'
            + '<div class="auction-word-selected" id="chinese-auction-word-selected"><span class="auction-word-placeholder">Nhấn vào từ bên dưới...</span></div>'
            + '<div class="auction-word-pool" id="chinese-auction-word-pool">'
            + shuffledWords.map(function (w) {
                return '<button class="auction-word-chip" data-word="' + escapeHtml(w) + '">' + escapeHtml(w) + '</button>';
            }).join('')
            + '</div>'
            + '<button class="auction-word-undo-btn" id="chinese-auction-word-undo">↩ Xóa từ cuối</button>';

        area.querySelectorAll('.auction-word-chip').forEach(function (chip) {
            chip.addEventListener('click', function () {
                if (chip.classList.contains('used')) return;
                chip.classList.add('used');
                auction.orderSelected.push(chip.dataset.word);
                updateChineseAuctionWordOrderDisplay();
            });
        });

        var undoBtn = document.getElementById('chinese-auction-word-undo');
        if (undoBtn) {
            undoBtn.addEventListener('click', function () {
                if (!auction.orderSelected.length) return;
                var removed = auction.orderSelected.pop();
                area.querySelectorAll('.auction-word-chip').forEach(function (chip) {
                    if (chip.dataset.word === removed && chip.classList.contains('used')) {
                        chip.classList.remove('used');
                    }
                });
                updateChineseAuctionWordOrderDisplay();
            });
        }
    }

    function updateChineseAuctionWordOrderDisplay() {
        var display = document.getElementById('chinese-auction-word-selected');
        if (!display) return;
        if (!auction.orderSelected.length) {
            display.innerHTML = '<span class="auction-word-placeholder">Nhấn vào từ bên dưới...</span>';
            return;
        }
        display.innerHTML = auction.orderSelected.map(function (w) {
            return '<span class="auction-word-tag">' + escapeHtml(w) + '</span>';
        }).join(' ');
    }

    function renderChineseAuctionWordOrderAnswer(area, q) {
        area.innerHTML = '<button class="btn-primary auction-submit-order-btn" id="chinese-auction-submit-order">Kiểm tra câu</button>';
        var btn = document.getElementById('chinese-auction-submit-order');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var user = auction.orderSelected.join(' ').trim();
            var correct = (q.correctOrder || []).join(' ').trim();
            var isCorrect;
            if (window.AnswerMatch && typeof window.AnswerMatch.checkAnswer === 'function') {
                isCorrect = window.AnswerMatch.checkAnswer(user, correct, { mode: 'word_order' }) !== 'wrong';
            } else {
                isCorrect = normalizeText(user) === normalizeText(correct);
            }
            submitChineseAuctionAnswer(isCorrect, q);
        });
    }

    function submitChineseAuctionAnswer(isCorrect, q) {
        document.querySelectorAll('#chinese-auction-answer-area button').forEach(function (b) {
            b.disabled = true;
            b.style.pointerEvents = 'none';
        });

        var feedback = document.getElementById('chinese-auction-feedback');
        feedback.style.display = 'block';
        feedback.innerHTML = '';
        document.getElementById('chinese-auction-bet-area').style.display = 'none';

        if (isCorrect) {
            if (auction.isMission) {
                auction.progress.coins += 1;
                auction.sessionEarned += 1;
                feedback.innerHTML = '<div class="auction-feedback-correct"><div class="auction-feedback-icon">✅</div><div class="auction-feedback-text">Đúng! +1 xu</div></div>';
            } else {
                auction.progress.coins += auction.currentBet;
                auction.sessionEarned += auction.currentBet;
                feedback.innerHTML = '<div class="auction-feedback-correct"><div class="auction-feedback-icon">✅</div><div class="auction-feedback-text">Đúng! +' + auction.currentBet + ' xu</div></div>';
            }
            auction.sessionCorrect++;
            auction.progress.totalCorrect++;
            if (typeof SFX !== 'undefined') SFX.correct();
        } else {
            if (auction.isMission) {
                feedback.innerHTML = '<div class="auction-feedback-wrong"><div class="auction-feedback-icon">❌</div><div class="auction-feedback-text">Sai! +0 xu</div></div>';
            } else {
                auction.progress.coins -= auction.currentBet;
                if (auction.progress.coins < 0) auction.progress.coins = 0;
                auction.sessionLost += auction.currentBet;
                feedback.innerHTML = '<div class="auction-feedback-wrong"><div class="auction-feedback-icon">❌</div><div class="auction-feedback-text">Sai! -' + auction.currentBet + ' xu</div></div>';
            }
            auction.sessionWrong++;
            auction.progress.totalWrong++;
            if (typeof SFX !== 'undefined') SFX.wrong();
        }

        var explain = '';
        if (q.explanation) explain += '<div class="auction-explanation">' + escapeHtml(q.explanation) + '</div>';
        if (!isCorrect && q.correction) explain += '<div class="auction-correction">✏️ ' + escapeHtml(q.correction) + '</div>';
        if (!isCorrect && q.type === 'word_order' && Array.isArray(q.correctOrder)) explain += '<div class="auction-correction">✏️ ' + escapeHtml(q.correctOrder.join(' ')) + '</div>';
        if (!isCorrect && q.type === 'fill_blank' && q.correctAnswer) explain += '<div class="auction-correction">✏️ Đáp án: <strong>' + escapeHtml(q.correctAnswer) + '</strong></div>';
        feedback.innerHTML += explain;

        document.getElementById('chinese-auction-play-coins').textContent = auction.progress.coins;
        document.getElementById('chinese-auction-next-btn').style.display = 'block';
        saveChineseAuctionProgress();
    }

    function nextChineseAuctionQuestion() {
        auction.currentIdx++;
        if (auction.currentIdx >= auction.questions.length) showChineseAuctionResult();
        else showChineseAuctionQuestion();
    }

    function showChineseAuctionResult() {
        if (!auction.isMission) {
            auction.progress.totalGames++;
            var netGain = auction.sessionEarned - auction.sessionLost;
            if (netGain > auction.progress.bestGame) auction.progress.bestGame = netGain;
        }
        saveChineseAuctionProgress();

        var total = auction.questions.length || 1;
        var accuracy = auction.sessionCorrect / total;
        var emoji = '💪';
        var title = 'Cố gắng thêm!';
        var rank = 'Hãy luyện tập thêm nhé';
        if (accuracy >= 0.9) {
            emoji = '🏆';
            title = 'Xuất sắc!';
            rank = 'Bậc thầy ngữ pháp Trung';
        } else if (accuracy >= 0.7) {
            emoji = '🌟';
            title = 'Tốt lắm!';
            rank = 'Nhà đầu tư khôn ngoan';
        } else if (accuracy >= 0.5) {
            emoji = '👍';
            title = 'Khá tốt!';
            rank = 'Đang tiến bộ';
        }

        document.getElementById('chinese-auction-progress-bar').style.width = '100%';
        document.getElementById('chinese-auction-result-emoji').textContent = emoji;
        document.getElementById('chinese-auction-result-title').textContent = auction.isMission ? 'Nhiệm vụ hoàn thành!' : title;

        var net = auction.sessionEarned - auction.sessionLost;
        var coinsEl = document.getElementById('chinese-auction-result-coins');
        if (auction.isMission) {
            coinsEl.innerHTML = '<span class="auction-result-net positive">+' + auction.sessionEarned + ' xu</span>';
        } else {
            coinsEl.innerHTML = '<span class="auction-result-net ' + (net >= 0 ? 'positive' : 'negative') + '">' + (net >= 0 ? '+' : '') + net + ' xu</span>'
                + '<div class="auction-result-coins-total">Tổng: 💰 ' + auction.progress.coins + ' xu</div>';
        }

        document.getElementById('chinese-auction-result-correct').textContent = auction.sessionCorrect;
        document.getElementById('chinese-auction-result-wrong').textContent = auction.sessionWrong;
        document.getElementById('chinese-auction-result-earned').textContent = '+' + auction.sessionEarned;
        document.getElementById('chinese-auction-result-lost').textContent = '-' + auction.sessionLost;
        document.getElementById('chinese-auction-result-rank').textContent = rank;

        var playAgainBtn = document.getElementById('chinese-auction-result-play-btn');
        if (auction.progress.coins <= 0 && !auction.isMission) {
            playAgainBtn.disabled = true;
            playAgainBtn.textContent = 'Hết xu — Quay lại làm nhiệm vụ';
        } else {
            playAgainBtn.disabled = false;
            playAgainBtn.textContent = auction.isMission ? 'Chơi nhiệm vụ nữa' : 'Chơi lại';
        }

        updateChineseAuctionHubStat();
        showScreen(screens.auctionResult);
    }

    function bindLevelFilter(containerId, getCurrent, onChange) {
        var container = document.getElementById(containerId);
        if (!container) return;
        container.querySelectorAll('.level-pill').forEach(function (btn) {
            btn.addEventListener('click', function () {
                container.querySelectorAll('.level-pill').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                onChange(btn.dataset.level || 'all');
            });
        });
        container.querySelectorAll('.level-pill').forEach(function (btn) {
            btn.classList.toggle('active', (btn.dataset.level || 'all') === getCurrent());
        });
    }

    function openStartScreen() {
        var start = document.getElementById('start-screen');
        showScreen(start, 'back');
        if (typeof window.refreshLocalizedHome === 'function') window.refreshLocalizedHome();
    }

    function attachEvents() {
        if (runtime.initialized) return;
        runtime.initialized = true;

        document.getElementById('chinese-hub-back-btn').addEventListener('click', openStartScreen);
        document.getElementById('chinese-direction-toggle').addEventListener('change', setDirectionLabel);

        document.getElementById('chinese-mode-vocab-btn').addEventListener('click', showVocabSetup);
        document.getElementById('chinese-mode-grammar-btn').addEventListener('click', showGrammarHub);
        document.getElementById('chinese-mode-phrases-btn').addEventListener('click', showPhrasesHub);
        document.getElementById('chinese-mode-listening-btn').addEventListener('click', startListening);
        document.getElementById('chinese-mode-game-btn').addEventListener('click', showGameHub);

        document.getElementById('chinese-vocab-back-btn').addEventListener('click', showHub);
        document.getElementById('chinese-vocab-start-btn').addEventListener('click', startVocabNew);
        document.getElementById('chinese-vocab-review-btn').addEventListener('click', startVocabSrs);
        document.getElementById('chinese-vocab-wrong-btn').addEventListener('click', startVocabWrong);
        document.getElementById('chinese-vocab-reset-btn').addEventListener('click', function () {
            if (!window.confirm('Bạn muốn đặt lại toàn bộ tiến trình học tiếng Trung?')) return;
            chProgress = defaultProgress();
            ensureGrammarUnlockState();
            saveProgress();
            updateHubStats();
            updateVocabSetupStats();
            renderGrammarTopicGrid();
            renderPhraseCategories();
            renderPhraseFavorites();
            if (typeof window.refreshLocalizedHome === 'function') window.refreshLocalizedHome();
        });

        document.getElementById('chinese-grammar-hub-back-btn').addEventListener('click', showHub);
        document.getElementById('chinese-grammar-review-btn').addEventListener('click', startGrammarReview);
        document.getElementById('chinese-grammar-topic-grid').addEventListener('click', function (e) {
            var card = e.target.closest('.chinese-topic-card');
            if (!card) return;
            var topicId = card.getAttribute('data-topic-id');
            if (!topicId || !isTopicUnlocked(topicId)) return;
            showGrammarTheory(topicId);
        });

        document.getElementById('chinese-grammar-theory-back-btn').addEventListener('click', showGrammarHub);
        document.getElementById('chinese-grammar-start-topic-btn').addEventListener('click', function () {
            if (!runtime.grammarTopicId) return;
            startGrammarTopic(runtime.grammarTopicId);
        });

        document.getElementById('chinese-phrases-hub-back-btn').addEventListener('click', showHub);
        document.getElementById('chinese-phrases-open-favorites-btn').addEventListener('click', showPhrasesFavorites);
        document.getElementById('chinese-phrases-categories').addEventListener('click', function (e) {
            var card = e.target.closest('.category-card, .chinese-category-card');
            if (!card) return;
            if (card.classList.contains('locked')) return;
            var category = card.getAttribute('data-category') || 'all';
            var level = card.getAttribute('data-level') || 'all';
            startPhraseCategory(category, level);
        });

        document.getElementById('chinese-phrases-favorites-back-btn').addEventListener('click', showPhrasesHub);
        document.getElementById('chinese-phrases-favorites-list').addEventListener('click', function (e) {
            var btn = e.target.closest('.chinese-fav-remove, .fav-remove-btn');
            if (!btn) return;
            var id = btn.getAttribute('data-id');
            if (!id) return;
            chProgress.phrases.favorites = chProgress.phrases.favorites.filter(function (v) { return v !== id; });
            saveProgress();
            renderPhraseFavorites();
            renderPhraseCategories();
        });
        document.getElementById('chinese-phrases-favorites-practice-btn').addEventListener('click', startFavoritePhrases);

        document.getElementById('chinese-game-hub-back-btn').addEventListener('click', showHub);
        document.getElementById('chinese-open-story-select-btn').addEventListener('click', showStorySelect);
        document.getElementById('chinese-open-auction-btn').addEventListener('click', showChineseAuctionHome);

        document.getElementById('chinese-story-select-back-btn').addEventListener('click', showGameHub);
        document.getElementById('chinese-story-list').addEventListener('click', function (e) {
            var item = e.target.closest('.story-card, .story-item');
            if (!item) return;
            var id = item.getAttribute('data-story-id');
            if (!id) return;
            startStoryById(id);
        });

        document.getElementById('chinese-auction-home-back-btn').addEventListener('click', showGameHub);
        document.getElementById('chinese-auction-play-btn').addEventListener('click', function () { startChineseAuctionGame(false); });
        document.getElementById('chinese-auction-mission-btn').addEventListener('click', function () { startChineseAuctionGame(true); });
        document.getElementById('chinese-auction-play-back-btn').addEventListener('click', function () {
            if (window.confirm('Bạn có chắc muốn thoát? Tiến trình ván này sẽ mất.')) {
                showChineseAuctionHome();
            }
        });
        document.querySelectorAll('#chinese-auction-bet-area .chinese-auction-bet-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                selectChineseAuctionBet(Number(btn.dataset.bet || 0));
            });
        });
        document.getElementById('chinese-auction-next-btn').addEventListener('click', nextChineseAuctionQuestion);
        document.getElementById('chinese-auction-result-play-btn').addEventListener('click', function () {
            startChineseAuctionGame(auction.isMission);
        });
        document.getElementById('chinese-auction-result-back-btn').addEventListener('click', showChineseAuctionHome);

        document.getElementById('chinese-practice-back-btn').addEventListener('click', openModeFromResultBack);
        document.querySelectorAll('#chinese-options .option-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { submitMC(btn.dataset.value); });
        });
        document.getElementById('chinese-submit-btn').addEventListener('click', submitTyping);
        document.getElementById('chinese-typing-input').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') submitTyping();
        });
        document.getElementById('chinese-next-btn').addEventListener('click', nextQuestion);

        document.getElementById('chinese-speak-btn').addEventListener('click', function () {
            if (!runtime.question || !runtime.question.speakText || typeof window.speakText !== 'function') return;
            window.speakText(runtime.question.speakText, {
                lang: 'zh-CN',
                rate: runtime.speechRate,
                btn: document.getElementById('chinese-speak-btn'),
                audioId: runtime.question.itemId || null,
            });
        });
        document.getElementById('chinese-speed-normal').addEventListener('click', function () {
            runtime.speechRate = 1.0;
            updateSpeedButtons();
        });
        document.getElementById('chinese-speed-slow').addEventListener('click', function () {
            runtime.speechRate = 0.65;
            updateSpeedButtons();
        });
        document.getElementById('chinese-bookmark-btn').addEventListener('click', toggleCurrentBookmark);

        document.getElementById('chinese-story-back-btn').addEventListener('click', showStorySelect);
        document.getElementById('chinese-story-speak-btn').addEventListener('click', function () {
            if (!runtime.activeStory || !runtime.activeStoryNode || typeof window.speakText !== 'function') return;
            var node = runtime.activeStory.nodes[runtime.activeStoryNode];
            if (!node || !node.zh) return;
            window.speakText(node.zh, {
                lang: 'zh-CN',
                btn: document.getElementById('chinese-story-speak-btn'),
                audioId: (runtime.activeStory.id || 'story') + '_' + runtime.activeStoryNode,
            });
        });
        document.getElementById('chinese-story-translate-btn').addEventListener('click', function () {
            var el = document.getElementById('chinese-story-text-vi');
            if (!el) return;
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
        });

        document.getElementById('chinese-result-retry-btn').addEventListener('click', function () {
            if (typeof runtime.replayAction === 'function') runtime.replayAction();
        });
        document.getElementById('chinese-result-hub-btn').addEventListener('click', function () {
            if (typeof runtime.backAction === 'function') runtime.backAction();
            else showHub();
        });

        bindLevelFilter('chinese-vocab-level-filter', function () {
            return selected.vocabLevel;
        }, function (level) {
            selected.vocabLevel = level;
            updateVocabSetupStats();
        });

        bindLevelFilter('chinese-phrases-level-filter', function () {
            return selected.phraseLevel;
        }, function (level) {
            selected.phraseLevel = level;
            renderPhraseCategories();
        });
    }

    async function ensureReady() {
        await loadData();
        loadProgress();
        loadChineseAuctionProgress();
        ensureGrammarUnlockState();
        attachEvents();
        setDirectionLabel();
        updateHubStats();
        updateChineseAuctionHubStat();
        updateVocabSetupStats();
        renderGrammarTopicGrid();
        renderPhraseCategories();
        renderPhraseFavorites();
    }

    window.getChineseHomeSummary = async function () {
        await ensureReady();
        return {
            words: chData.words.length,
            phrases: chData.phrases.length,
            grammar: (chData.grammar.topics || []).length,
            stories: (chData.stories.stories || []).length
        };
    };

    window.updateChineseHomeStat = function () {
        updateHubStats();
        updateVocabSetupStats();
        renderGrammarTopicGrid();
        renderPhraseCategories();
    };

    window.openChineseModule = async function (mode) {
        await ensureReady();

        if (mode === 'hub') return showHub();
        if (mode === 'vocab_setup') return showVocabSetup();
        if (mode === 'vocab') return startVocabNew();
        if (mode === 'vocab_srs') return startVocabSrs();
        if (mode === 'vocab_wrong') return startVocabWrong();

        if (mode === 'grammar_hub') return showGrammarHub();
        if (mode === 'grammar_review') return startGrammarReview();

        if (mode === 'phrases_hub') return showPhrasesHub();
        if (mode === 'phrases_favorites') return showPhrasesFavorites();
        if (mode === 'phrases') return startPhraseCategory('all');

        if (mode === 'listening') return startListening();

        if (mode === 'game_hub') return showGameHub();
        if (mode === 'auction_home') return showChineseAuctionHome();
        if (mode === 'auction') return startChineseAuctionGame(false);
        if (mode === 'story_select') return showStorySelect();
        if (mode === 'story') {
            var stories = (chData.stories.stories || []);
            if (!stories.length) return showStorySelect();
            return startStoryById(stories[0].id);
        }

        return showHub();
    };

    window.initChinese = async function () {
        await ensureReady();
        showHub();
    };
})();
