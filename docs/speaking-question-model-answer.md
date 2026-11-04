# Speaking Question & Model Answer — US-305 + US-306

## Chạy bản gộp

Thư mục riêng: `D:\XAMPP\htdocs\BTTH3_PHP\AAA-speaking-model-answer`.
Nhánh local: `feat/us305-us306-speaking`. Chưa push hoặc merge bản gộp vào main.

```powershell
cd D:\XAMPP\htdocs\BTTH3_PHP\AAA-speaking-model-answer
npm.cmd ci
npm.cmd run dev:speaking
```

Mở **http://localhost:3003/speaking**. Cấu hình Supabase được sao chép riêng trong `.env.local`, với `AUTH_SITE_URL=http://localhost:3003`; file này được gitignore. Nếu dùng Google OAuth, quản lý Supabase cần cho phép callback `http://localhost:3003/auth/callback`.

Hai bản `AAA-speaking` và `AAA-shadowing` cũ vẫn được giữ nguyên để đối chiếu. Bản gộp có thư mục source, dependencies và môi trường riêng; Git worktree chia sẻ lịch sử repository nhóm.

## Một module, một luồng

Sidebar và dashboard chỉ có một mục **Speaking Question & Model Answer**. Không có mục Shadowing riêng.

1. `/speaking` chuyển đến `/speaking/part-1`.
2. Chọn Part 1/2/3, chủ đề và bộ luyện tập theo quý/năm.
3. `/speaking/[part]/[topicId]` hiển thị câu hỏi/cue card, audio đọc đề, từ vựng IPA–nghĩa Việt và ngữ pháp.
4. Mỗi câu có liên kết **Model Answer & Shadowing** đến `/speaking/[part]/[topicId]/[questionId]`.
5. Trang bài mẫu hiển thị đúng câu hỏi, cue points, audio phát âm đề, bài mẫu đồng bộ, từ vựng/ngữ pháp của chủ đề và recorder.
6. `/shadowing` và `/shadowing/[modelId]` cũ chỉ redirect về `/speaking`; không còn giao diện/ngân hàng độc lập tại đó.

Các engine nội bộ vẫn nằm trong `features/speaking`, `features/shadowing` và `components/audio` để tái sử dụng. Tên thư mục engine không tạo thêm module trên giao diện.

## Nội dung và ghép dữ liệu

- Ba chủ đề: Hometown, Work & Study, Technology.
- Mỗi chủ đề: bốn câu Part 1, một cue card Part 2 có bốn ý, bốn câu Part 3.
- Đủ **27 câu hỏi và 27 bài mẫu**, ghép một-một bằng question ID; đề chính, Part, chủ đề và cue points phải khớp tuyệt đối.
- 27 WAV đọc câu hỏi và 27 WAV đọc bài mẫu, ở hai thư mục `/audio/speaking` và `/audio/shadowing`. Đây là hai loại bản đọc khác nhau, không phải hai module.
- Mỗi chủ đề có năm từ/cụm từ, IPA, nghĩa Việt và ví dụ; ngữ pháp thay đổi theo Part.
- Q4/2026 có ba chủ đề; Q3/2026 có Hometown và Work & Study; Q4/2025 có Hometown. Đây là bộ luyện tập tự biên soạn, không phải dự báo hoặc đề thật đã xác minh.
- Band 7.0+/8.0+ là mục tiêu học tập, chưa được giám khảo xác nhận.

Nguồn dữ liệu câu hỏi: `src/features/speaking/topics.ts`.
Nội dung trả lời: `src/features/speaking/model-responses.ts`.
Script `scripts/build-speaking-models.mts` ghép chúng thành source model; generator tạo WAV và timestamp từ cùng lần tổng hợp. Không dùng lại ba bài demo cũ cho những đề không khớp.

## Player và ghi âm

- Highlight từ/câu theo Web Audio clock; Sentence-by-Sentence dừng bằng buffer duration và chỉ sang câu tiếp khi Continue/Space.
- Loop Sentence, chọn số câu, tốc độ 0.75/1/1.25 và nghe liên tục.
- Audio đọc đề và audio bài mẫu dừng lẫn nhau khi người dùng chuyển nguồn. Khi ghi âm, dừng các nguồn đang phát và khóa các nút phát đề/model/video trong trang.
- Space không chiếm thao tác bàn phím của input, button, link, audio, summary hoặc vùng editable.
- Recorder tái sử dụng có xin quyền mic, waveform, timer, giới hạn ba phút/20 MB, hướng dẫn khi từ chối/bận/thiếu mic.
- Nghe lại, xóa/ghi lại, download và so sánh model→bản thu hoặc song song. Bản thu đang phát được dừng khi thay file/rời trang.

## Lưu riêng và hoàn thành

Giữ quyết định MVP của US-306: bản thu mới ở RAM; chỉ lưu IndexedDB khi người học chọn **Lưu trên thiết bị** sau đăng nhập. Khóa lưu là `[userId đã xác minh từ Supabase, questionId]`. Cùng tài khoản/câu hỏi trên cùng trình duyệt có thể mở lại sau reload; dữ liệu không được upload lên Cloud Storage.

Lưu chỉ báo thành công sau transaction commit; lỗi không xóa bản thu tạm hoặc thay thế bản đã lưu trước đó. Xác nhận hoàn thành được lưu một lần bằng transaction có khóa duy nhất, bao gồm khi bấm đồng thời/reload. Chưa đồng bộ hoàn thành vào dashboard cloud của nhóm. Không tự tạo band Speaking.

Đây là bộ nhớ local theo browser profile, không phải kho mã hóa chống người có quyền dùng cùng profile/devtools hoặc script cùng origin. Không dùng thiết bị chung cho bản thu riêng tư. Dữ liệu ở cổng 3001/3002 cũ không tự chuyển sang origin 3003; có thể tải bản thu cũ về trước khi đổi bản.

## Audio và giới hạn còn lại

Audio hiện là **giọng tổng hợp Microsoft Zira en-US**, có nhãn demo. Nó chưa đáp ứng nội dung “người bản ngữ thật”. Video YouTube gốc được nhúng theo lựa chọn người học để tham khảo; không tải lại video hoặc sao chép transcript của bên thứ ba. Karaoke trong app áp dụng cho audio local và transcript riêng, không áp dụng cho video đó.

Cần bản thu người bản ngữ có quyền sử dụng, transcript chính xác và timestamp tương ứng để hoàn tất tiêu chí nội dung này. Không gắn lại timestamp demo vào một bản thu khác.

Tạo lại tài sản demo trên Windows:

```powershell
node scripts/speaking-audio-manifest.mts
./scripts/generate-speaking-audio.ps1
node scripts/build-speaking-models.mts
./scripts/generate-shadowing-audio.ps1
```

Các WAV được đóng gói sẵn nên máy chạy web/CI không cần giọng Windows hoặc quyền mic để build.

## Kiểm thử

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
# Khi server đang chạy ở 3003:
npm.cmd run smoke:speaking
```

64 unit/data/storage tests hiện có kiểm tra cả US-305, US-306 và ghép bài mẫu. Smoke test bao phủ ba ngân hàng Part, chín trang chủ đề, 27 trang câu hỏi/bài mẫu, 54 audio Range requests, redirect cũ và session không cache.

Browser access host chưa khả dụng trong phiên triển khai trước. Cần kiểm tra trực tiếp mobile/desktop, xin/từ chối quyền mic, nghe và lặp câu ở cả ba tốc độ, thao tác Space trên summary/input, chuyển giữa audio đề/model, so sánh bản thu và đổi tài khoản trước khi nghiệm thu toàn bộ. Cũng cần review đồng đội và tích hợp vào môi trường chung.
