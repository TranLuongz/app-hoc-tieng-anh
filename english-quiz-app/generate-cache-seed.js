#!/usr/bin/env node
// ===== Bot sinh answer-cache-seed.json =====
// Chạy: node generate-cache-seed.js
// Dịch tất cả từ vựng + cụm từ qua API, thu thập đáp án thay thế
// Kết quả lưu vào answer-cache-seed.json
// Tối ưu: chạy song song 10 requests, race strategy Lingva+MyMemory

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SEED_FILE = path.join(DIR, 'answer-cache-seed.json');
const PROGRESS_FILE = path.join(DIR, '.cache-gen-progress.json');

// ===== Config =====
const CONCURRENCY = 10;     // Số request chạy song song
const DELAY_MS = 50;        // Delay nhỏ giữa mỗi batch (tránh overwhelm)
const BATCH_SIZE = 100;     // Lưu progress mỗi 100 entries
const TIMEOUT_MS = 6000;    // Timeout cho mỗi API call

// ===== Lingva instances =====
const LINGVA_HOSTS = [
    'lingva.ml',
    'lingva.thedaviddelta.com',
];
let lingvaIdx = 0;

// ===== Translation functions =====
async function translateLingva(text, from, to) {
    const host = LINGVA_HOSTS[lingvaIdx % LINGVA_HOSTS.length];
    lingvaIdx++;
    const url = `https://${host}/api/v1/${from}/${to}/${encodeURIComponent(text)}`;
    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(tid);
        if (!res.ok) return null;
        const data = await res.json();
        return data && data.translation ? data.translation : null;
    } catch (e) {
        return null;
    }
}

async function translateMyMemory(text, from, to) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(tid);
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.responseData && data.responseData.translatedText) {
            const t = data.responseData.translatedText;
            if (t.toUpperCase().startsWith('PLEASE')) return null;
            return t;
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Race strategy: chạy cả 2 API song song, lấy kết quả nhanh nhất
async function translateRace(text, from, to) {
    try {
        const result = await Promise.any([
            translateLingva(text, from, to).then(r => { if (!r) throw new Error('empty'); return r; }),
            translateMyMemory(text, from, to).then(r => { if (!r) throw new Error('empty'); return r; })
        ]);
        return result;
    } catch (e) {
        return null;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Normalize (giống answer-match.js) =====
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

function getCacheKey(answer) {
    return stripDiacritics(answer.toLowerCase().trim());
}

// ===== Load / Save =====
function loadSeed() {
    try {
        if (fs.existsSync(SEED_FILE)) {
            return JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
        }
    } catch (e) { /* */ }
    return {};
}

function saveSeed(seed) {
    fs.writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2), 'utf-8');
}

function loadProgress() {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
        }
    } catch (e) { /* */ }
    return { wordsIdx: 0, phrasesIdx: 0 };
}

function saveProgress(prog) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(prog), 'utf-8');
}

function addToSeed(seed, correctAnswer, altAnswer) {
    if (!altAnswer || !correctAnswer) return false;
    const key = getCacheKey(correctAnswer);
    const normAlt = normalizeText(altAnswer);
    const normCorrect = normalizeText(correctAnswer);
    if (normAlt === normCorrect) return false;
    if (normAlt.length < 1) return false;

    if (!seed[key]) seed[key] = [];
    if (!seed[key].some(a => normalizeText(a) === normAlt)) {
        seed[key].push(altAnswer);
        return true;
    }
    return false;
}

// ===== Main =====
async function main() {
    console.log('===== Answer Cache Seed Generator (Turbo) =====');
    console.log(`Concurrency: ${CONCURRENCY} | Delay: ${DELAY_MS}ms | Race: Lingva+MyMemory\n`);

    const words = JSON.parse(fs.readFileSync(path.join(DIR, 'words.json'), 'utf-8'));
    const phrasesData = JSON.parse(fs.readFileSync(path.join(DIR, 'phrases.json'), 'utf-8'));
    const phrases = phrasesData.phrases || phrasesData;

    console.log(`Từ vựng: ${words.length} từ`);
    console.log(`Cụm từ: ${phrases.length} câu`);

    let seed = loadSeed();
    let progress = loadProgress();
    let totalAdded = 0;
    const startTime = Date.now();

    // ===== Phase 1: Từ vựng =====
    console.log(`\n--- Phase 1: Từ vựng (bắt đầu từ #${progress.wordsIdx}) ---`);

    for (let batchStart = progress.wordsIdx; batchStart < words.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, words.length);
        const batch = words.slice(batchStart, batchEnd);

        // Mỗi word cần 2 translations (en→vi, vi→en) — chạy song song tất cả
        const tasks = [];
        batch.forEach(w => {
            tasks.push({ type: 'vi', word: w, promise: translateRace(w.word, 'en', 'vi') });
            tasks.push({ type: 'en', word: w, promise: translateRace(w.meaning, 'vi', 'en') });
        });

        // Chạy song song theo concurrency
        for (let i = 0; i < tasks.length; i += CONCURRENCY) {
            const chunk = tasks.slice(i, i + CONCURRENCY);
            const results = await Promise.all(chunk.map(t => t.promise));
            results.forEach((result, idx) => {
                const task = chunk[idx];
                if (!result) return;
                if (task.type === 'vi') {
                    const parts = result.split(/[,;/]/).map(s => s.trim()).filter(s => s.length > 0);
                    parts.forEach(part => { if (addToSeed(seed, task.word.meaning, part)) totalAdded++; });
                } else {
                    const parts = result.split(/[,;/]/).map(s => s.trim()).filter(s => s.length > 0);
                    parts.forEach(part => { if (addToSeed(seed, task.word.word, part)) totalAdded++; });
                }
            });
            if (i + CONCURRENCY < tasks.length) await sleep(DELAY_MS);
        }

        progress.wordsIdx = batchEnd;
        saveProgress(progress);
        saveSeed(seed);

        const pct = (batchEnd / words.length * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const speed = (batchEnd / elapsed).toFixed(1);
        const eta = ((words.length - batchEnd) / speed).toFixed(0);
        console.log(`  [${pct}%] ${batchEnd}/${words.length} từ | +${totalAdded} mới | ${elapsed}s | ~${eta}s còn lại`);
    }

    console.log(`\nPhase 1 xong: +${totalAdded} đáp án từ vựng`);
    const phase1Added = totalAdded;

    // ===== Phase 2: Cụm từ =====
    console.log(`\n--- Phase 2: Cụm từ (bắt đầu từ #${progress.phrasesIdx}) ---`);

    for (let batchStart = progress.phrasesIdx; batchStart < phrases.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, phrases.length);
        const batch = phrases.slice(batchStart, batchEnd);

        const tasks = [];
        batch.forEach(p => {
            tasks.push({ type: 'vi', phrase: p, promise: translateRace(p.en, 'en', 'vi') });
            tasks.push({ type: 'en', phrase: p, promise: translateRace(p.vi, 'vi', 'en') });
        });

        for (let i = 0; i < tasks.length; i += CONCURRENCY) {
            const chunk = tasks.slice(i, i + CONCURRENCY);
            const results = await Promise.all(chunk.map(t => t.promise));
            results.forEach((result, idx) => {
                const task = chunk[idx];
                if (!result) return;
                if (task.type === 'vi') {
                    if (addToSeed(seed, task.phrase.vi, result)) totalAdded++;
                } else {
                    if (addToSeed(seed, task.phrase.en, result)) totalAdded++;
                }
            });
            if (i + CONCURRENCY < tasks.length) await sleep(DELAY_MS);
        }

        progress.phrasesIdx = batchEnd;
        saveProgress(progress);
        saveSeed(seed);

        const pct = (batchEnd / phrases.length * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const speed = (batchEnd / elapsed).toFixed(1);
        const eta = speed > 0 ? ((phrases.length - batchEnd) / speed).toFixed(0) : '?';
        console.log(`  [${pct}%] ${batchEnd}/${phrases.length} câu | +${totalAdded - phase1Added} mới | ${elapsed}s | ~${eta}s còn lại`);
    }

    // ===== Done =====
    saveSeed(seed);
    if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);

    const keys = Object.keys(seed);
    const totalAnswers = keys.reduce((sum, k) => sum + seed[k].length, 0);
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log('\n===== HOÀN THÀNH =====');
    console.log(`Thời gian: ${totalTime} phút`);
    console.log(`Tổng entries: ${keys.length}`);
    console.log(`Tổng đáp án thay thế: ${totalAnswers}`);
    console.log(`File: ${SEED_FILE}`);
    console.log('\nDeploy file answer-cache-seed.json cùng app là xong!');
}

main().catch(e => {
    console.error('Lỗi:', e);
    process.exit(1);
});
