function toEdgeRate(rate) {
    const r = Number.isFinite(Number(rate)) ? Number(rate) : 1.0;
    const bounded = Math.max(0.6, Math.min(1.4, r));
    const pct = Math.round((bounded - 1.0) * 100);
    return (pct >= 0 ? '+' : '') + pct + '%';
}

function parseBody(req) {
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            body = {};
        }
    }
    return body || {};
}

function pickVoice(lang) {
    const key = String(lang || '').trim();
    const map = {
        'en': 'en-US-JennyNeural',
        'en-US': 'en-US-JennyNeural',
        'en-GB': 'en-GB-SoniaNeural',
        'vi': 'vi-VN-HoaiMyNeural',
        'vi-VN': 'vi-VN-HoaiMyNeural',
        'zh': 'zh-CN-XiaoxiaoNeural',
        'zh-CN': 'zh-CN-XiaoxiaoNeural',
        'zh-TW': 'zh-TW-HsiaoChenNeural',
    };

    if (map[key]) return map[key];

    const base = key.split('-')[0];
    if (map[base]) return map[base];

    return 'en-US-JennyNeural';
}

function languageFromVoice(voiceName) {
    if (String(voiceName).startsWith('zh-TW')) return 'zh-TW';
    if (String(voiceName).startsWith('zh-')) return 'zh-CN';
    if (String(voiceName).startsWith('vi-')) return 'vi-VN';
    return 'en-US';
}

function streamToBuffer(stream) {
    return new Promise(function (resolve, reject) {
        const chunks = [];
        stream.on('data', function (chunk) {
            chunks.push(Buffer.from(chunk));
        });
        stream.on('end', function () {
            resolve(Buffer.concat(chunks));
        });
        stream.on('close', function () {
            resolve(Buffer.concat(chunks));
        });
        stream.on('error', reject);
    });
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let MsEdgeTTS;
    let OUTPUT_FORMAT;
    try {
        ({ MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts'));
    } catch (e) {
        return res.status(500).json({
            error: 'Missing msedge-tts package',
            details: 'Run npm install in english-quiz-app before deploying',
        });
    }

    const body = parseBody(req);
    const query = req.query || {};

    const text = String((body.text != null ? body.text : query.text) || '').trim();
    const lang = String((body.lang != null ? body.lang : query.lang) || 'en-US').trim();
    const rawRate = Number(body.rate != null ? body.rate : query.rate);
    const rate = Number.isFinite(rawRate) ? Math.max(0.6, Math.min(1.4, rawRate)) : 1.0;
    const edgeRate = String((body.edgeRate != null ? body.edgeRate : query.edgeRate) || toEdgeRate(rate));

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }
    if (text.length > 2000) {
        return res.status(400).json({ error: 'Text too long (max 2000 chars)' });
    }

    const voiceName = pickVoice(lang);
    const languageCode = languageFromVoice(voiceName);

    const tts = new MsEdgeTTS();
    try {
        await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        const streamPack = tts.toStream(text, { rate: edgeRate });
        const audioBuffer = await streamToBuffer(streamPack.audioStream);

        if (!audioBuffer || !audioBuffer.length) {
            return res.status(502).json({ error: 'Edge TTS returned no audio' });
        }

        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600');
        return res.status(200).json({
            audioContent: audioBuffer.toString('base64'),
            mimeType: 'audio/mpeg',
            provider: 'msedge-tts',
            voiceName: voiceName,
            languageCode: languageCode,
        });
    } catch (err) {
        return res.status(500).json({
            error: 'Edge TTS request failed',
            details: err && err.message ? err.message : String(err),
        });
    } finally {
        try { tts.close(); } catch (e) { /* ignore */ }
    }
};
