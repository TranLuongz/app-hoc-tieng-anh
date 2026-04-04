// ===== Answer Match Engine — Hệ thống so khớp đáp án =====
// Tầng 1: Local matching (offline, instant) — synonym tables, pronouns, fuzzy
// Tầng 2: Back-translation + Forward-translation via MyMemory API
// Tầng 3: Cache accepted answers (localStorage)

(function () {
    'use strict';

    // ===== Bảng đại từ đồng nghĩa tiếng Việt =====
    const PRONOUN_GROUPS = [
        ['tôi', 'mình', 'tớ', 'ta', 'tui'],
        ['bạn', 'cậu', 'mày', 'ngươi'],
        ['anh ấy', 'nó', 'hắn', 'ổng', 'ảnh'],
        ['cô ấy', 'chị ấy', 'nó', 'bả', 'cổ'],
        ['chúng tôi', 'chúng ta', 'bọn mình', 'bọn tôi', 'tụi mình', 'tụi tôi'],
        ['họ', 'chúng nó', 'bọn họ', 'tụi nó', 'bọn nó'],
        ['của tôi', 'của mình', 'của tớ', 'của tui'],
        ['của bạn', 'của cậu', 'của mày'],
    ];

    const pronounMap = {};
    PRONOUN_GROUPS.forEach(group => {
        const canonical = group[0];
        group.forEach(p => {
            pronounMap[stripDiacritics(p.toLowerCase())] = stripDiacritics(canonical.toLowerCase());
        });
    });

    // ===== Bảng từ đồng nghĩa tiếng Việt =====
    const SYNONYM_GROUPS_VI = [
        ['có thể', 'được', 'có khả năng'],
        ['muốn', 'thích', 'mong'],
        ['nói', 'kể', 'bảo', 'nói rằng'],
        ['nhìn', 'xem', 'ngắm', 'trông'],
        ['đẹp', 'xinh', 'đẹp đẽ'],
        ['lớn', 'to', 'bự'],
        ['nhỏ', 'bé', 'nhỏ bé'],
        ['nhanh', 'mau', 'lẹ', 'nhanh chóng'],
        ['chậm', 'chậm chạp', 'từ từ'],
        ['vui', 'vui vẻ', 'hạnh phúc', 'sung sướng'],
        ['buồn', 'buồn bã', 'u buồn', 'đau buồn'],
        ['giỏi', 'tốt', 'xuất sắc'],
        ['xấu', 'tồi', 'dở', 'tệ'],
        ['bắt đầu', 'khởi đầu', 'khởi sự'],
        ['kết thúc', 'hoàn thành', 'xong', 'chấm dứt'],
        ['hiểu', 'hiểu biết', 'nắm được', 'biết'],
        ['giúp', 'giúp đỡ', 'hỗ trợ'],
        ['thay đổi', 'đổi', 'biến đổi'],
        ['sử dụng', 'dùng', 'xài'],
        ['cần', 'cần thiết', 'cần phải'],
        ['đi', 'đến', 'tới', 'đi đến', 'đi tới'],
        ['về', 'trở về', 'quay về', 'trở lại', 'quay lại'],
        ['lại', 'lần nữa', 'thêm lần nữa', 'một lần nữa', 'lặp lại'],
        ['luôn luôn', 'luôn', 'lúc nào cũng'],
        ['không bao giờ', 'chẳng bao giờ', 'không khi nào', 'chưa bao giờ'],
        ['thường', 'thường xuyên', 'thường hay'],
        ['đôi khi', 'thỉnh thoảng', 'đôi lúc', 'có khi', 'có lúc'],
        ['rất', 'lắm', 'cực kỳ', 'vô cùng', 'quá'],
        ['nhiều', 'khá nhiều', 'rất nhiều'],
        ['ít', 'ít ỏi', 'không nhiều'],
        ['mới', 'mới mẻ'],
        ['cũ', 'cũ kỹ'],
        ['sớm', 'sớm sủa'],
        ['muộn', 'trễ', 'chậm trễ'],
        ['gần', 'gần đây', 'gần gũi'],
        ['xa', 'xa xôi', 'cách xa'],
        ['dễ', 'dễ dàng', 'đơn giản'],
        ['khó', 'khó khăn', 'gian nan'],
        ['đúng', 'chính xác'],
        ['sai', 'không đúng'],
        ['quan trọng', 'trọng yếu', 'hệ trọng'],
        ['thú vị', 'hấp dẫn'],
        ['chán', 'nhàm chán', 'buồn chán', 'nhạt nhẽo'],
        ['nhớ', 'ghi nhớ', 'nhớ được'],
        ['quên', 'quên mất', 'không nhớ'],
        ['tìm', 'tìm kiếm', 'kiếm', 'tìm thấy'],
        ['cho', 'đưa', 'tặng', 'biếu'],
        ['lấy', 'cầm', 'nắm', 'nhận'],
        ['mở', 'mở ra'],
        ['đóng', 'đóng lại', 'khép', 'khép lại'],
        ['ăn', 'dùng bữa', 'ăn uống'],
        ['uống', 'uống nước'],
        ['ngủ', 'đi ngủ', 'ngủ nghỉ'],
        // Thêm mới — các cặp hay gặp sai
        ['cổ xưa', 'cổ đại', 'cổ kính', 'xa xưa', 'lâu đời'],
        ['tập trung', 'chú ý', 'chú tâm', 'tập trung vào'],
        ['tiêu điểm', 'trọng tâm', 'trung tâm', 'điểm nhấn'],
        ['suy nghĩ', 'suy tính', 'tính', 'cân nhắc', 'đắn đo', 'nghĩ'],
        ['du lịch', 'đi chơi', 'đi du lịch', 'đi phượt'],
        ['chuyến đi', 'chuyến du lịch', 'cuộc hành trình'],
        ['kế hoạch', 'dự định', 'tính', 'dự tính', 'lên kế hoạch'],
        ['mạnh', 'khỏe', 'cường tráng', 'mạnh mẽ'],
        ['yếu', 'yếu đuối', 'yếu ớt'],
        ['giàu', 'giàu có', 'sung túc', 'khá giả'],
        ['nghèo', 'nghèo khổ', 'thiếu thốn'],
        ['thông minh', 'thông thái', 'khôn ngoan', 'lanh lợi', 'sáng dạ'],
        ['ngu', 'dốt', 'ngốc', 'đần'],
        ['sợ', 'sợ hãi', 'lo sợ', 'khiếp sợ'],
        ['giận', 'tức giận', 'bực', 'nổi giận', 'cáu'],
        ['yêu', 'yêu thương', 'thương', 'quý', 'mến'],
        ['ghét', 'căm ghét', 'ghét bỏ', 'không ưa'],
        ['chạy', 'chạy bộ', 'chạy nhanh'],
        ['đi bộ', 'cuốc bộ', 'đi chân'],
        ['nơi', 'chỗ', 'địa điểm', 'vị trí'],
        ['nhà', 'ngôi nhà', 'căn nhà', 'gia đình'],
        ['người', 'con người', 'người ta'],
        ['bạn bè', 'bạn', 'bè bạn'],
        ['công việc', 'việc làm', 'việc', 'nghề'],
        ['tiền', 'tiền bạc', 'tiền nong'],
        ['thời gian', 'thời giờ', 'lúc'],
        ['ngay lập tức', 'ngay', 'tức thì', 'liền'],
        ['cuối cùng', 'sau cùng', 'rốt cuộc'],
        ['đầu tiên', 'trước tiên', 'trước hết'],
        ['tuy nhiên', 'nhưng', 'tuy vậy', 'thế nhưng'],
        ['vì', 'bởi vì', 'do', 'tại vì', 'vì vậy'],
        ['nếu', 'nếu như', 'giả sử', 'nếu mà'],
    ];

    const synonymMapVi = {};
    SYNONYM_GROUPS_VI.forEach(group => {
        const canonical = stripDiacritics(group[0].toLowerCase());
        group.forEach(w => {
            synonymMapVi[stripDiacritics(w.toLowerCase())] = canonical;
        });
    });

    // ===== English synonym groups =====
    const SYNONYM_GROUPS_EN = [
        ['big', 'large', 'huge', 'enormous', 'massive'],
        ['small', 'little', 'tiny', 'miniature'],
        ['fast', 'quick', 'rapid', 'swift', 'speedy'],
        ['slow', 'sluggish', 'gradual'],
        ['happy', 'glad', 'joyful', 'pleased', 'delighted', 'cheerful'],
        ['sad', 'unhappy', 'sorrowful', 'depressed', 'miserable'],
        ['beautiful', 'pretty', 'gorgeous', 'lovely', 'attractive', 'handsome'],
        ['ugly', 'hideous', 'unattractive'],
        ['smart', 'clever', 'intelligent', 'bright', 'wise', 'brilliant'],
        ['stupid', 'dumb', 'foolish', 'silly', 'idiotic'],
        ['start', 'begin', 'commence', 'initiate'],
        ['end', 'finish', 'complete', 'conclude', 'terminate'],
        ['help', 'assist', 'aid', 'support'],
        ['use', 'utilize', 'employ', 'apply'],
        ['need', 'require', 'demand'],
        ['want', 'desire', 'wish', 'crave'],
        ['look', 'see', 'watch', 'view', 'observe', 'gaze'],
        ['say', 'tell', 'speak', 'talk', 'state', 'mention', 'utter'],
        ['go', 'move', 'travel', 'head', 'proceed', 'depart'],
        ['come', 'arrive', 'approach', 'reach'],
        ['give', 'provide', 'offer', 'grant', 'donate'],
        ['get', 'obtain', 'receive', 'acquire', 'gain'],
        ['make', 'create', 'build', 'construct', 'produce', 'craft'],
        ['find', 'discover', 'locate', 'detect', 'spot'],
        ['think', 'believe', 'consider', 'contemplate', 'ponder', 'reflect', 'deliberate'],
        ['understand', 'comprehend', 'grasp', 'realize', 'perceive'],
        ['change', 'alter', 'modify', 'transform', 'adjust'],
        ['important', 'significant', 'crucial', 'vital', 'essential', 'critical'],
        ['interesting', 'fascinating', 'engaging', 'intriguing', 'captivating'],
        ['boring', 'dull', 'tedious', 'monotonous'],
        ['easy', 'simple', 'straightforward', 'effortless'],
        ['hard', 'difficult', 'tough', 'challenging', 'demanding'],
        ['correct', 'right', 'accurate', 'proper'],
        ['wrong', 'incorrect', 'inaccurate', 'mistaken'],
        ['often', 'frequently', 'regularly', 'commonly'],
        ['sometimes', 'occasionally', 'from time to time'],
        ['always', 'forever', 'constantly', 'perpetually', 'continually'],
        ['never', 'not ever'],
        ['again', 'once more', 'one more time', 'repeat'],
        ['very', 'really', 'extremely', 'quite', 'highly', 'incredibly'],
        ['many', 'lots of', 'a lot of', 'numerous', 'plenty of'],
        ['few', 'not many', 'a few', 'scarce'],
        ['new', 'brand new', 'fresh', 'novel', 'recent'],
        ['old', 'ancient', 'aged', 'elderly', 'antique', 'archaic', 'vintage'],
        ['near', 'close', 'nearby', 'adjacent'],
        ['far', 'distant', 'remote', 'faraway'],
        ['open', 'unlock', 'unseal'],
        ['close', 'shut', 'seal'],
        ['remember', 'recall', 'recollect'],
        ['forget', 'overlook', 'neglect'],
        // Thêm mới
        ['trip', 'journey', 'travel', 'voyage', 'tour', 'excursion'],
        ['plan', 'intend', 'contemplate', 'consider', 'mean to'],
        ['strong', 'powerful', 'mighty', 'robust'],
        ['weak', 'feeble', 'frail', 'fragile'],
        ['rich', 'wealthy', 'affluent', 'prosperous'],
        ['poor', 'impoverished', 'destitute'],
        ['afraid', 'scared', 'frightened', 'terrified', 'fearful'],
        ['angry', 'mad', 'furious', 'annoyed', 'irritated', 'upset'],
        ['love', 'adore', 'cherish', 'treasure'],
        ['hate', 'despise', 'detest', 'loathe'],
        ['run', 'sprint', 'dash', 'jog'],
        ['walk', 'stroll', 'wander', 'hike'],
        ['place', 'location', 'spot', 'site', 'area', 'position'],
        ['house', 'home', 'residence', 'dwelling'],
        ['person', 'human', 'individual', 'someone'],
        ['friend', 'buddy', 'pal', 'companion', 'mate'],
        ['work', 'job', 'occupation', 'profession', 'career', 'employment'],
        ['money', 'cash', 'funds', 'currency'],
        ['time', 'moment', 'period', 'duration'],
        ['immediately', 'instantly', 'right away', 'at once', 'straight away'],
        ['finally', 'eventually', 'at last', 'in the end', 'ultimately'],
        ['first', 'firstly', 'initially', 'to begin with'],
        ['however', 'but', 'nevertheless', 'nonetheless', 'yet', 'still'],
        ['because', 'since', 'as', 'due to', 'owing to'],
        ['if', 'provided that', 'assuming', 'in case', 'supposing'],
        ['about', 'approximately', 'around', 'roughly'],
        ['also', 'too', 'as well', 'likewise', 'moreover'],
        ['enough', 'sufficient', 'adequate'],
        ['maybe', 'perhaps', 'possibly', 'probably'],
        ['child', 'kid', 'youngster'],
        ['eat', 'consume', 'dine', 'have a meal'],
        ['drink', 'sip', 'consume', 'have a drink'],
        ['sleep', 'rest', 'nap', 'slumber'],
        ['buy', 'purchase', 'acquire', 'obtain'],
        ['sell', 'trade', 'market'],
        ['learn', 'study', 'acquire knowledge'],
        ['teach', 'instruct', 'educate', 'train'],
        ['try', 'attempt', 'endeavor', 'strive'],
        ['show', 'display', 'demonstrate', 'reveal', 'exhibit'],
        ['hide', 'conceal', 'cover'],
        ['break', 'shatter', 'smash', 'crack', 'destroy'],
        ['fix', 'repair', 'mend', 'restore'],
        ['keep', 'maintain', 'preserve', 'retain', 'hold'],
        ['leave', 'depart', 'exit', 'go away', 'abandon'],
        ['stay', 'remain', 'linger', 'wait'],
        ['ask', 'inquire', 'question', 'request'],
        ['answer', 'reply', 'respond'],
        ['choose', 'select', 'pick', 'opt for'],
        ['stop', 'halt', 'cease', 'quit', 'discontinue'],
        ['continue', 'proceed', 'carry on', 'go on', 'persist'],
        ['happen', 'occur', 'take place', 'transpire'],
        ['seem', 'appear', 'look like'],
        ['become', 'turn into', 'grow', 'get'],
        ['allow', 'permit', 'let', 'authorize'],
        ['prevent', 'stop', 'block', 'hinder', 'prohibit'],
        ['somewhere', 'some place', 'someplace'],
        ['everywhere', 'all over', 'throughout'],
        ['nobody', 'no one', 'none'],
        ['everybody', 'everyone', 'all'],
    ];

    const synonymMapEn = {};
    SYNONYM_GROUPS_EN.forEach(group => {
        const canonical = group[0].toLowerCase();
        group.forEach(w => {
            synonymMapEn[w.toLowerCase()] = canonical;
        });
    });

    function buildReplacementRules(map) {
        return Object.keys(map)
            .sort((a, b) => b.length - a.length)
            .map(key => ({
                regex: new RegExp('\\b' + escapeRegex(key) + '\\b', 'gi'),
                replacement: map[key],
            }));
    }

    const pronounRules = buildReplacementRules(pronounMap);
    const synonymRulesVi = buildReplacementRules(synonymMapVi);
    const synonymRulesEn = buildReplacementRules(synonymMapEn);
    const VI_CHAR_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    const CJK_CHAR_REGEX = /[\u3400-\u9FFF]/;

    // ===== Stop words for content-word matching =====
    const STOP_WORDS_EN = new Set([
        'the', 'a', 'an', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being',
        'to', 'of', 'in', 'on', 'at', 'for', 'with', 'about', 'by', 'from',
        'it', 'its', 'this', 'that', 'these', 'those',
        'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
        'my', 'your', 'his', 'her', 'our', 'their', 'mine', 'yours', 'ours', 'theirs',
        'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could',
        'may', 'might', 'must', 'have', 'has', 'had', 'having',
        'not', 'no', 'nor', 'and', 'or', 'but', 'so', 'if', 'then',
        'up', 'out', 'off', 'down', 'over', 'under', 'into', 'through',
        'just', 'also', 'very', 'too', 'quite', 'really',
    ]);

    const STOP_WORDS_VI = new Set([
        'là', 'của', 'và', 'các', 'có', 'được', 'trong', 'cho', 'với',
        'này', 'đó', 'kia', 'ấy', 'đây',
        'thì', 'mà', 'nhưng', 'hay', 'hoặc', 'nếu',
        'đã', 'đang', 'sẽ', 'vẫn', 'còn', 'cũng',
        'rất', 'quá', 'lắm', 'hơn', 'nhất',
        'không', 'chưa', 'chẳng', 'đừng', 'hãy',
        'ở', 'tại', 'từ', 'đến', 'về', 'ra', 'vào',
        'tôi', 'bạn', 'anh', 'chị', 'em', 'nó', 'họ', 'chúng',
        'một', 'hai', 'ba', 'nhiều', 'ít', 'mỗi', 'mọi',
    ]);

    const STOP_WORDS_ZH = new Set([
        '的', '了', '在', '是', '有', '和', '就', '都', '而', '及',
        '与', '着', '或', '一个', '沒有', '没有', '我们', '你们', '他们', '她们',
        '它们', '这', '那', '吗', '呢', '吧', '啊', '呀', '很', '也',
        '不', '我', '你', '他', '她', '它', '要', '会', '能', '可以',
    ]);

    // ===== Cache (localStorage) =====
    const CACHE_KEY = 'el_accepted_answers';
    const CACHE_SAVE_DELAY_MS = 1200;
    let cacheData = null;
    let cacheDirty = false;
    let cacheSaveTimer = null;

    function readCacheFromStorage() {
        try {
            return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function flushCacheToStorage() {
        if (!cacheDirty || !cacheData) return;
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
            cacheDirty = false;
        } catch (e) { /* ignore quota errors */ }
    }

    function scheduleCacheSave() {
        if (cacheSaveTimer) return;
        cacheSaveTimer = setTimeout(() => {
            cacheSaveTimer = null;
            flushCacheToStorage();
        }, CACHE_SAVE_DELAY_MS);
    }

    function ensureCacheLoaded() {
        if (!cacheData) {
            cacheData = readCacheFromStorage();
            cacheDirty = false;
        }
        return cacheData;
    }

    function loadCache() {
        return ensureCacheLoaded();
    }

    function saveCache(cache) {
        cacheData = cache || {};
        cacheDirty = true;
        scheduleCacheSave();
    }

    function getCacheKey(correctAnswer) {
        return stripDiacritics(correctAnswer.toLowerCase().trim());
    }

    function checkCache(userInput, correctAnswer) {
        const cache = loadCache();
        const key = getCacheKey(correctAnswer);
        const accepted = cache[key];
        if (!accepted || !Array.isArray(accepted)) return false;
        const normUser = normalizeText(userInput);
        return accepted.some(a => normalizeText(a) === normUser);
    }

    function saveAcceptedAnswer(correctAnswer, userAnswer) {
        const cache = loadCache();
        const key = getCacheKey(correctAnswer);
        if (!cache[key]) cache[key] = [];
        const normNew = normalizeText(userAnswer);
        if (!cache[key].some(a => normalizeText(a) === normNew)) {
            cache[key].push(userAnswer);
        }
        saveCache(cache);
    }

    // ===== Normalize =====
    function normalizeText(text) {
        if (!text) return '';
        return text.toLowerCase().trim()
            .replace(/[.!?,;:"""''…\-()[\]{}]+/g, '')
            .replace(/\s+/g, ' ')
            .replace(/n't/g, ' not')
            .replace(/'re/g, ' are')
            .replace(/'s/g, ' is')
            .replace(/'m/g, ' am')
            .replace(/'ll/g, ' will')
            .replace(/'ve/g, ' have')
            .replace(/'d/g, ' would')
            .trim();
    }

    function stripDiacritics(text) {
        if (!text) return '';
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
    }

    // ===== Levenshtein =====
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

    // ===== Split alternatives =====
    function splitAlternatives(answer) {
        return answer
            .split(/[,;]/)
            .flatMap(part => {
                if (/\//.test(part) && !/\d\/\d/.test(part)) {
                    return part.split('/');
                }
                return [part];
            })
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    // ===== Pronoun canonicalization =====
    function canonicalizePronouns(text) {
        const stripped = stripDiacritics(text);
        let result = stripped;
        pronounRules.forEach(rule => {
            result = result.replace(rule.regex, rule.replacement);
        });
        return result;
    }

    // ===== Synonym canonicalization =====
    function canonicalizeSynonyms(text, map, rules) {
        let result = stripDiacritics(text.toLowerCase());
        rules.forEach(rule => {
            result = result.replace(rule.regex, rule.replacement);
        });
        return result;
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ===== Strip English articles =====
    function stripArticles(text) {
        return text.replace(/\b(a|an|the|to)\b/gi, '').replace(/\s+/g, ' ').trim();
    }

    function containsCJK(text) {
        return CJK_CHAR_REGEX.test(text || '');
    }

    function stripChinesePunctuation(text) {
        return (text || '').replace(/[，。！？；：、（）《》“”‘’【】…\-]/g, '').replace(/\s+/g, ' ').trim();
    }

    function normalizePinyin(text) {
        if (!text) return '';
        var base = stripDiacritics(text.toLowerCase().trim())
            .replace(/ü/g, 'u')
            .replace(/[0-9]/g, '')
            .replace(/[^a-z\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return base;
    }

    function tokenizeChinese(text) {
        var compact = stripChinesePunctuation(text).replace(/\s+/g, '');
        if (!compact) return [];
        return compact.split('');
    }

    // ===== Content-word comparison (bỏ stop words, so sánh synonym-aware) =====
    function compareContentWords(text1, text2) {
        const norm1 = normalizeText(text1);
        const norm2 = normalizeText(text2);
        if (!norm1 || !norm2) return false;

        const isChinese = containsCJK(text1) || containsCJK(text2);
        const isVietnamese = !isChinese && (VI_CHAR_REGEX.test(text1) || VI_CHAR_REGEX.test(text2));
        const stopWords = isChinese ? STOP_WORDS_ZH : (isVietnamese ? STOP_WORDS_VI : STOP_WORDS_EN);
        const synMap = isVietnamese ? synonymMapVi : synonymMapEn;

        const getContentWords = t => {
            if (isChinese) {
                return tokenizeChinese(t).filter(w => w && !stopWords.has(w));
            }
            const words = t.split(' ').filter(w => w && !stopWords.has(w));
            return words.map(w => {
                const stripped = stripDiacritics(w);
                return synMap[stripped] || synMap[w] || stripped;
            });
        };

        const words1 = getContentWords(norm1);
        const words2 = getContentWords(norm2);
        if (!words1.length || !words2.length) return false;

        const words2Set = new Set(words2);
        const matchCount = words1.filter(w => words2Set.has(w)).length;
        const ratio = matchCount / Math.max(words1.length, words2.length, 1);
        return ratio >= 0.5; // 50% content words match
    }

    // ===== Core matching: single answer =====
    function matchSingle(userInput, correctAnswer, options) {
        const mode = (options && options.mode) || 'phrase';
        const normUser = normalizeText(userInput);
        const normCorrect = normalizeText(correctAnswer);
        const zhCandidate = (options && options.targetLang === 'zh') || containsCJK(normUser) || containsCJK(normCorrect);

        if (!normUser || !normCorrect) return 'wrong';

        // Tier 1: Exact normalized match
        if (normUser === normCorrect) return 'correct';

        // Tier 1b: Chinese direct + pinyin normalization
        if (zhCandidate) {
            const zhUser = stripChinesePunctuation(normUser).replace(/\s+/g, '');
            const zhCorrect = stripChinesePunctuation(normCorrect).replace(/\s+/g, '');
            if (zhUser && zhCorrect && zhUser === zhCorrect) return 'correct';

            const pyUser = normalizePinyin(normUser);
            const pyCorrect = normalizePinyin(normCorrect);
            if (pyUser && pyCorrect && pyUser === pyCorrect) return 'correct';
        }

        // Tier 2: Pronoun canonicalization
        const canonUser = canonicalizePronouns(normUser);
        const canonCorrect = canonicalizePronouns(normCorrect);
        if (canonUser === canonCorrect) return 'correct';

        // Tier 3: Synonym canonicalization (Vietnamese)
        const synUserVi = canonicalizeSynonyms(normUser, synonymMapVi, synonymRulesVi);
        const synCorrectVi = canonicalizeSynonyms(normCorrect, synonymMapVi, synonymRulesVi);
        if (synUserVi === synCorrectVi) return 'correct';

        // Tier 3b: Synonym canonicalization (English)
        const synUserEn = canonicalizeSynonyms(normUser, synonymMapEn, synonymRulesEn);
        const synCorrectEn = canonicalizeSynonyms(normCorrect, synonymMapEn, synonymRulesEn);
        if (synUserEn === synCorrectEn) return 'correct';

        // Tier 4: Strip articles
        if (stripArticles(normUser) === stripArticles(normCorrect)) return 'correct';

        // Tier 5: Levenshtein (strip diacritics)
        const strippedUser = stripDiacritics(normUser);
        const strippedCorrect = stripDiacritics(normCorrect);
        const maxLen = Math.max(strippedCorrect.length, 1);
        const dist = levenshteinDistance(strippedUser, strippedCorrect);
        const threshold = Math.min(4, Math.max(1, Math.floor(maxLen * 0.15)));
        if (dist <= threshold) return 'close';

        // Tier 5b: pinyin close match for Chinese workflows
        if (zhCandidate) {
            const pyUser = normalizePinyin(normUser);
            const pyCorrect = normalizePinyin(normCorrect);
            if (pyUser && pyCorrect) {
                const pyDist = levenshteinDistance(pyUser, pyCorrect);
                const pyThreshold = Math.min(4, Math.max(1, Math.floor(Math.max(pyCorrect.length, 1) * 0.18)));
                if (pyDist <= pyThreshold) return 'close';
            }
        }

        // Tier 6: Word overlap (skip for word_order)
        if (mode !== 'word_order') {
            const userWords = canonUser.split(' ').filter(Boolean);
            const correctWords = canonCorrect.split(' ').filter(Boolean);
            if (userWords.length >= 2 && correctWords.length >= 2) {
                const matchCount = userWords.filter(w => correctWords.includes(w)).length;
                const ratio = matchCount / Math.max(userWords.length, correctWords.length, 1);
                if (ratio >= 0.75) return 'close';
            }
        }

        // Tier 7: Content-word matching (bỏ stop words, synonym-aware, 50% threshold)
        if (mode !== 'word_order' && compareContentWords(userInput, correctAnswer)) {
            return 'close';
        }

        return 'wrong';
    }

    // ===== Main sync check (Tầng 1 + cache) =====
    function checkAnswer(userInput, correctAnswer, options) {
        if (!userInput || !correctAnswer) return 'wrong';
        const mode = (options && options.mode) || 'phrase';

        // Check cache first
        if (checkCache(userInput, correctAnswer)) return 'correct';

        // Split alternatives for vocab mode
        const alternatives = (mode === 'vocab')
            ? splitAlternatives(correctAnswer)
            : [correctAnswer];

        let bestResult = 'wrong';
        for (const alt of alternatives) {
            const result = matchSingle(userInput, alt, options);
            if (result === 'correct') return 'correct';
            if (result === 'close') bestResult = 'close';
        }

        return bestResult;
    }

    // ===== Translation APIs — Race Strategy =====
    // Lingva (Google Translate proxy) = primary, MyMemory = fallback
    // Gọi cả 2 song song, ai trả trước dùng trước

    // Lingva: public instances
    var LINGVA_INSTANCES = [
        'lingva.ml',
        'lingva.thedaviddelta.com',
    ];
    var lingvaIdx = 0; // rotate instances

    function fetchWithTimeout(url, timeoutMs) {
        var controller = new AbortController();
        var timeoutId = setTimeout(function () { controller.abort(); }, timeoutMs || 5000);
        return fetch(url, { signal: controller.signal })
            .then(function (res) { clearTimeout(timeoutId); return res; })
            .catch(function (e) { clearTimeout(timeoutId); throw e; });
    }

    async function translateLingva(text, fromLang, toLang) {
        // Lingva API: /api/v1/{source}/{target}/{query}
        var host = LINGVA_INSTANCES[lingvaIdx % LINGVA_INSTANCES.length];
        lingvaIdx++;
        var url = 'https://' + host + '/api/v1/' + fromLang + '/' + toLang + '/' + encodeURIComponent(text);
        try {
            var res = await fetchWithTimeout(url, 4000);
            if (!res.ok) return null;
            var data = await res.json();
            if (data && data.translation) {
                return data.translation;
            }
            return null;
        } catch (e) {
            console.warn('[AnswerMatch] Lingva error:', e.message || e);
            return null;
        }
    }

    async function translateMyMemory(text, fromLang, toLang) {
        var url = 'https://api.mymemory.translated.net/get?q='
            + encodeURIComponent(text)
            + '&langpair=' + fromLang + '|' + toLang;
        try {
            var res = await fetchWithTimeout(url, 5000);
            if (!res.ok) return null;
            var data = await res.json();
            if (data && data.responseData && data.responseData.translatedText) {
                var translated = data.responseData.translatedText;
                if (translated.toUpperCase().indexOf('PLEASE') === 0) return null;
                return translated;
            }
            return null;
        } catch (e) {
            console.warn('[AnswerMatch] MyMemory error:', e.message || e);
            return null;
        }
    }

    // Race: gọi Lingva + MyMemory song song, trả kết quả đầu tiên thành công
    async function translateRace(text, fromLang, toLang) {
        try {
            var result = await Promise.any([
                translateLingva(text, fromLang, toLang).then(function (r) {
                    if (!r) throw new Error('empty');
                    console.log('[AnswerMatch] Lingva won:', r);
                    return r;
                }),
                translateMyMemory(text, fromLang, toLang).then(function (r) {
                    if (!r) throw new Error('empty');
                    console.log('[AnswerMatch] MyMemory won:', r);
                    return r;
                })
            ]);
            return result;
        } catch (e) {
            // Cả 2 đều fail
            console.warn('[AnswerMatch] All translation APIs failed');
            return null;
        }
    }

    // ===== Detect language of user input / correct answer =====
    // correctAnswer và userInput CÙNG ngôn ngữ (cả hai đều là đáp án target)
    // originalText là ngôn ngữ GỐC (ngôn ngữ khác)
    function detectLangPair(userInput, correctAnswer, options) {
        if (options && options.fromLang && options.toLang) {
            return { fromLang: options.fromLang, toLang: options.toLang };
        }
        if (containsCJK(correctAnswer) || containsCJK(userInput)) {
            return { fromLang: 'zh', toLang: 'vi' };
        }
        // Check both userInput and correctAnswer — they are in the same language
        if (VI_CHAR_REGEX.test(correctAnswer) || VI_CHAR_REGEX.test(userInput)) {
            // Both are Vietnamese → translate FROM Vietnamese TO English
            return { fromLang: 'vi', toLang: 'en' };
        }
        // Both are English → translate FROM English TO Vietnamese
        return { fromLang: 'en', toLang: 'vi' };
    }

    // ===== Async check (Tầng 1 + 2 + 3) =====
    async function checkAnswerAsync(userInput, correctAnswer, originalText, options) {
        if (!userInput || !correctAnswer) return { result: 'wrong' };

        // Tầng 1: sync check
        var syncResult = checkAnswer(userInput, correctAnswer, options);
        if (syncResult !== 'wrong') {
            return { result: syncResult };
        }

        // Tầng 2: API translation
        if (!originalText) {
            return { result: 'wrong' };
        }

        var langPair = detectLangPair(userInput, correctAnswer, options);
        var fromLang = langPair.fromLang;
        var toLang = langPair.toLang;

        // Chạy song song: back-translate user input + forward-translate original
        var results;
        try {
            results = await Promise.all([
                translateRace(userInput, fromLang, toLang),
                translateRace(originalText, toLang, fromLang)
            ]);
        } catch (e) {
            console.warn('[AnswerMatch] Promise.all error:', e.message || e);
            return { result: 'wrong' };
        }

        var backTranslated = results[0];
        var forwardTranslated = results[1];

        console.log('[AnswerMatch] Back-translated:', backTranslated, '| Forward-translated:', forwardTranslated);

        // A) Back-translation: user input → other lang → compare with originalText
        // Ví dụ: "cổ đại" → vi→en → "ancient" → so với "ancient" ✓
        if (backTranslated) {
            var btResult = matchSingle(backTranslated, originalText, { mode: 'phrase' });
            if (btResult === 'correct' || btResult === 'close') {
                saveAcceptedAnswer(correctAnswer, userInput);
                return { result: 'correct' };
            }
            // Content-word comparison (linh hoạt hơn cho câu dài)
            if (compareContentWords(backTranslated, originalText)) {
                saveAcceptedAnswer(correctAnswer, userInput);
                return { result: 'correct' };
            }
            // Try alternatives of originalText
            var mode = (options && options.mode) || 'phrase';
            if (mode === 'vocab') {
                var alts = splitAlternatives(originalText);
                for (var i = 0; i < alts.length; i++) {
                    var altRes = matchSingle(backTranslated, alts[i], { mode: 'phrase' });
                    if (altRes === 'correct' || altRes === 'close') {
                        saveAcceptedAnswer(correctAnswer, userInput);
                        return { result: 'correct' };
                    }
                }
            }
        }

        // B) Forward-translation: originalText → user's lang → compare with user input
        // Ví dụ: "focus" → en→vi → "tập trung" → so với "tập trung" ✓
        if (forwardTranslated) {
            var fwdAlts = splitAlternatives(forwardTranslated);
            for (var j = 0; j < fwdAlts.length; j++) {
                var fwdRes = matchSingle(userInput, fwdAlts[j], { mode: 'phrase' });
                if (fwdRes === 'correct' || fwdRes === 'close') {
                    saveAcceptedAnswer(correctAnswer, userInput);
                    return { result: 'correct' };
                }
            }
            // Full text comparison
            var fullRes = matchSingle(userInput, forwardTranslated, { mode: 'phrase' });
            if (fullRes === 'correct' || fullRes === 'close') {
                saveAcceptedAnswer(correctAnswer, userInput);
                return { result: 'correct' };
            }
            // Content-word comparison
            if (compareContentWords(userInput, forwardTranslated)) {
                saveAcceptedAnswer(correctAnswer, userInput);
                return { result: 'correct' };
            }
        }

        return { result: 'wrong' };
    }

    // ===== Export / Import cache =====
    // Dùng trong console: AnswerMatch.exportCache() → copy JSON
    // Sau đó paste vào answer-cache-seed.js hoặc import lại
    function exportCache() {
        return JSON.stringify(loadCache(), null, 2);
    }

    function importCache(jsonOrObj) {
        var incoming = typeof jsonOrObj === 'string' ? JSON.parse(jsonOrObj) : jsonOrObj;
        var existing = loadCache();
        var added = 0;
        Object.keys(incoming).forEach(function (key) {
            if (!Array.isArray(incoming[key])) return;
            if (!existing[key]) existing[key] = [];
            incoming[key].forEach(function (answer) {
                var norm = normalizeText(answer);
                if (!existing[key].some(function (a) { return normalizeText(a) === norm; })) {
                    existing[key].push(answer);
                    added++;
                }
            });
        });
        saveCache(existing);
        console.log('[AnswerMatch] Imported', added, 'new accepted answers');
        return added;
    }

    function clearCache() {
        cacheData = {};
        cacheDirty = false;
        if (cacheSaveTimer) {
            clearTimeout(cacheSaveTimer);
            cacheSaveTimer = null;
        }
        try { localStorage.removeItem(CACHE_KEY); } catch (e) { /* */ }
        console.log('[AnswerMatch] Cache cleared');
    }

    function getCacheStats() {
        var cache = loadCache();
        var keys = Object.keys(cache);
        var totalAnswers = keys.reduce(function (sum, k) { return sum + (cache[k].length || 0); }, 0);
        return { entries: keys.length, totalAnswers: totalAnswers };
    }

    // ===== Auto-load seed cache từ file =====
    // File answer-cache-seed.json chứa cache dùng chung cho tất cả máy.
    // Workflow: dùng app → tích lũy cache → exportCache() → paste vào seed file → deploy
    // → tất cả máy mới đều có sẵn cache mà không cần gọi API lại.
    function loadSeedCache() {
        fetch('answer-cache-seed.json')
            .then(function (res) {
                if (!res.ok) return;
                return res.json();
            })
            .then(function (seed) {
                if (!seed || typeof seed !== 'object') return;
                var keys = Object.keys(seed);
                if (keys.length === 0) return;
                // Merge seed vào localStorage (không ghi đè dữ liệu user đã có)
                var existing = loadCache();
                var added = 0;
                keys.forEach(function (key) {
                    if (!Array.isArray(seed[key])) return;
                    if (!existing[key]) existing[key] = [];
                    seed[key].forEach(function (answer) {
                        var norm = normalizeText(answer);
                        if (!existing[key].some(function (a) { return normalizeText(a) === norm; })) {
                            existing[key].push(answer);
                            added++;
                        }
                    });
                });
                if (added > 0) {
                    saveCache(existing);
                    console.log('[AnswerMatch] Loaded', added, 'answers from seed cache');
                }
            })
            .catch(function () { /* seed file not found or invalid — OK */ });
    }

    // Load seed khi app khởi động
    loadSeedCache();

    // Flush pending cache write before page goes to background/unload.
    window.addEventListener('beforeunload', flushCacheToStorage);
    window.addEventListener('pagehide', flushCacheToStorage);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            flushCacheToStorage();
        }
    });

    // ===== Expose globally =====
    window.AnswerMatch = {
        normalizeText: normalizeText,
        stripDiacritics: stripDiacritics,
        levenshteinDistance: levenshteinDistance,
        splitAlternatives: splitAlternatives,
        checkAnswer: checkAnswer,
        checkAnswerAsync: checkAnswerAsync,
        exportCache: exportCache,
        importCache: importCache,
        clearCache: clearCache,
        getCacheStats: getCacheStats,
    };

    // Backward compatibility
    window.normalizeText = normalizeText;
    window.levenshteinDistance = levenshteinDistance;

})();
