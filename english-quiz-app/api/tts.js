module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Missing GOOGLE_CLOUD_TTS_API_KEY' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid JSON body' });
        }
    }

    const text = (body && typeof body.text === 'string') ? body.text.trim() : '';
    const rawRate = Number(body && body.rate);
    const rate = Number.isFinite(rawRate) ? Math.max(0.6, Math.min(1.4, rawRate)) : 1.0;

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }
    if (text.length > 2000) {
        return res.status(400).json({ error: 'Text too long (max 2000 chars)' });
    }

    const languageCode = process.env.GOOGLE_CLOUD_TTS_LANG || 'en-US';
    const voiceName = process.env.GOOGLE_CLOUD_TTS_VOICE || 'en-US-Neural2-F';

    try {
        const upstream = await fetch(
            'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(apiKey),
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { text: text },
                    voice: {
                        languageCode: languageCode,
                        name: voiceName,
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        speakingRate: rate,
                    },
                }),
            }
        );

        if (!upstream.ok) {
            const errText = await upstream.text();
            return res.status(upstream.status).json({
                error: 'Cloud TTS upstream error',
                details: errText.slice(0, 500),
            });
        }

        const data = await upstream.json();
        if (!data || !data.audioContent) {
            return res.status(502).json({ error: 'Cloud TTS returned no audio' });
        }

        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600');
        return res.status(200).json({
            audioContent: data.audioContent,
            mimeType: 'audio/mpeg',
            provider: 'google-cloud-tts',
            voiceName: voiceName,
            languageCode: languageCode,
        });
    } catch (err) {
        return res.status(500).json({
            error: 'Cloud TTS request failed',
            details: err && err.message ? err.message : 'Unknown error',
        });
    }
};
