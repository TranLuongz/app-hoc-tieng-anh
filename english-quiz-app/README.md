# English Learning App

Ứng dụng học tiếng Anh đa module chạy bằng HTML/CSS/Vanilla JS, deploy được trên Vercel.

## Tính năng chính

- Vocabulary quiz (trắc nghiệm từ vựng, SRS review, wrong words review).
- Grammar/Tenses hub (lý thuyết + luyện tập).
- Phrases module (luyện câu theo chủ đề + yêu thích).
- Story game + Sentence Auction.
- Lưu tiến trình bằng localStorage.
- TTS thống nhất giọng bằng Cloud TTS qua API route `/api/tts` + fallback Web Speech khi lỗi mạng/API.

## Cấu trúc dự án (rút gọn)

```txt
english-quiz-app/
|-- index.html
|-- app.js
|-- phrases.js
|-- tenses.js
|-- game.js
|-- style.css
|-- phrases.css
|-- tenses.css
|-- game.css
|-- words.json
|-- phrases.json
|-- tenses.json
|-- grammar.json
|-- stories.json
|-- irregular_verbs.json
|-- auction_questions.json
|-- api/
|   `-- tts.js
|-- .env.example
`-- README.md
```

## Thiết lập môi trường (Cloud TTS)

Tạo file `.env.local` (local) hoặc thêm biến môi trường trong Vercel:

```env
GOOGLE_CLOUD_TTS_API_KEY=your_google_cloud_tts_api_key
GOOGLE_CLOUD_TTS_LANG=en-US
GOOGLE_CLOUD_TTS_VOICE=en-US-Neural2-F
```

Giải thích:

- `GOOGLE_CLOUD_TTS_API_KEY`: bắt buộc, dùng ở server side API route.
- `GOOGLE_CLOUD_TTS_LANG`: tùy chọn, mặc định `en-US`.
- `GOOGLE_CLOUD_TTS_VOICE`: tùy chọn, mặc định `en-US-Neural2-F`.

## Chạy local

Khuyên dùng server thay vì mở trực tiếp file:

```bash
npx serve . -p 3000
```

Mở: `http://localhost:3000`

Lưu ý: nếu không có API key, app vẫn đọc được nhờ fallback Web Speech nhưng giọng sẽ phụ thuộc từng trình duyệt/thiết bị.

## Deploy Vercel

1. Import repo lên Vercel.
2. Root Directory: `english-quiz-app`.
3. Thêm các Environment Variables ở trên.
4. Redeploy.

Sau deploy, frontend gọi `/api/tts` để lấy audio từ Cloud TTS. API key không lộ ra client.

## Cơ chế TTS hiện tại

- Frontend gọi `window.speakText(...)` hoặc `speakWord(...)`.
- Pipeline ưu tiên Cloud TTS (`/api/tts`).
- Nếu Cloud lỗi, fallback về Web Speech API để không mất âm thanh.

## Dataset và scripts

- `words.json` chứa dữ liệu từ vựng.
- `generate_words.py` dùng để tạo lại bộ từ (nếu cần).
- `generate-cache-seed.js`/`answer-cache-seed.json` phục vụ cache/gợi ý dữ liệu.

## License

MIT.