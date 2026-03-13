# English Vocabulary Quiz App 📚

Ứng dụng học từ vựng tiếng Anh với **3000 từ thông dụng nhất**, chạy hoàn toàn trên trình duyệt (local), không cần server.

## Tính năng

- **3000 từ vựng** - Lấy từ dataset [google-10000-english](https://github.com/first20hours/google-10000-english), dịch sang tiếng Việt
- **Quiz trắc nghiệm** - Mỗi câu hỏi có 4 đáp án, chỉ 1 đáp án đúng
- **Buộc chọn lại** khi sai - Không được bỏ qua, phải chọn đúng mới tiếp tục
- **Lưu tiến trình** - localStorage giữ lại vị trí học, điểm số
- **Xáo trộn từ** - Tùy chọn học theo thứ tự hoặc ngẫu nhiên
- **Chế độ tối** - Giao diện dark mode dễ nhìn
- **Phím tắt** - Nhấn 1-4 chọn đáp án, Enter/Space để tiếp tục
- **Responsive** - Hiển thị tốt trên mobile và desktop

## Cấu trúc

```
english-quiz-app/
├── index.html          # Trang chính
├── style.css           # Giao diện (CSS)
├── app.js              # Logic quiz (JavaScript)
├── words.json          # Dataset 3000 từ Anh-Việt
├── generate_words.py   # Script tạo dataset
└── README.md           # Tài liệu
```

## Cách chạy

### Cách 1: Mở trực tiếp
Mở file `index.html` bằng trình duyệt (nên dùng Chrome/Edge).

> ⚠️ Một số trình duyệt chặn fetch local file. Nếu gặp lỗi, dùng Cách 2.

### Cách 2: Local server (khuyên dùng)

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

Mở trình duyệt: `http://localhost:8000`

## Cách tạo lại dataset

Nếu muốn tạo lại file `words.json`:

```bash
pip install deep-translator requests
python generate_words.py
```

Script sẽ:
1. Download danh sách từ từ [google-10000-english](https://github.com/first20hours/google-10000-english)
2. Lọc 3000 từ phổ biến nhất
3. Dịch sang tiếng Việt qua Google Translate
4. Lưu vào `words.json`

## Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript
- Google Fonts (Inter)
- localStorage cho lưu tiến trình
- Không framework, không build tools

## Screenshots

### Màn hình chính
- Logo, thống kê tiến trình
- Toggle xáo trộn & dark mode

### Màn hình quiz
- Hiển thị từ tiếng Anh lớn
- 4 nút đáp án tiếng Việt
- Thanh tiến trình
- Đếm đúng/sai

## License

MIT - Tự do sử dụng và chỉnh sửa.
