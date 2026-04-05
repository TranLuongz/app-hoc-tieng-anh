# Pre-generated Audio Layout

Hybrid TTS pipeline checks these files first before calling runtime TTS APIs:

- `audio/en/{audioId}.mp3`
- `audio/vi/{audioId}.mp3`
- `audio/zh/{audioId}.mp3`

Examples:

- English phrase `p_0001` -> `audio/en/p_0001.mp3`
- Chinese phrase `cp_000001` -> `audio/zh/cp_000001.mp3`
- Chinese word `zw_00001` -> `audio/zh/zw_00001.mp3`
- English word index 1 -> `audio/en/ew_00001.mp3`

If a pre-generated file is missing, the app automatically falls back to:

1. `/api/edge-tts`
2. Google Translate TTS
3. Web Speech API
