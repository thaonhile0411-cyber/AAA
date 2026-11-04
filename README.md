# AAA — Speaking Question & Model Answer

Module gộp US-305 và US-306, trên nhánh local `feat/us305-us306-speaking`.

```powershell
cd D:\XAMPP\htdocs\BTTH3_PHP\AAA-speaking-model-answer
npm.cmd ci
npm.cmd run dev:speaking
```

Mở **http://localhost:3003/speaking**.

Một mục điều hướng, ba Part riêng: chọn chủ đề/câu hỏi → mở đúng Model Answer → nghe, Shadowing và ghi âm. Có 27 câu hỏi, 27 bài mẫu tương ứng, audio đọc đề và đọc bài mẫu, từ vựng IPA–nghĩa Việt, gợi ý ngữ pháp, luyện từng câu/lặp câu/chỉnh tốc độ và nghe so sánh.

Bản thu mới ở RAM; có thể chọn lưu theo tài khoản/câu hỏi trên thiết bị. Không upload audio lên cloud. `.env.local` đã được sao chép riêng và không commit. Hai project cũ vẫn được giữ nguyên.

Audio local hiện là demo giọng tổng hợp có nhãn rõ, chưa phải bản thu người bản ngữ thật. Band là mục tiêu học tập. Các liên kết YouTube là nguồn tham khảo, không phải nguồn transcript trong app.

Xem [hướng dẫn đầy đủ, giới hạn và kiểm thử](docs/speaking-question-model-answer.md).

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
# Khi dev server đang chạy:
npm.cmd run smoke:speaking
```

Các đường dẫn `/shadowing` cũ chuyển về `/speaking`, không tạo thêm module độc lập. Chưa push bản gộp lên GitHub.
