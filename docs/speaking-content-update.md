# Speaking content update procedure

Quy trình này áp dụng cho ngân hàng câu hỏi US-305 và Model Answer/Shadowing
US-306. Mục tiêu là cập nhật theo quý mà không biến nội dung tham khảo thành
“đề thi chính thức”.

## 1. Thu thập và phân loại nguồn

1. Dùng nguồn chính thức IELTS/IDP/British Council cho cấu trúc bài thi.
2. Forecast của bên thứ ba chỉ hỗ trợ chọn **chủ đề**, không được sao chép nguyên
   bộ câu hỏi, transcript hoặc audio nếu chưa có quyền.
3. Lưu `title`, `publisher`, URL HTTPS, `accessedAt` và `kind` cho mỗi nguồn.
4. Dùng `unverified-prediction` chỉ khi collection có ít nhất một nguồn
   `unofficial-forecast`; nếu không, dùng `original-practice`.
5. Mọi forecast phải hiển thị “dự đoán chưa xác minh”. Không dùng “official”,
   “đề thật” hoặc “confirmed” nếu không có xác nhận từ đơn vị tổ chức IELTS.

Nguồn cấu trúc hiện dùng:

- [IELTS Academic: Speaking test format](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking)
- [British Council: IELTS Speaking preparation](https://takeielts.britishcouncil.org/prepare/ielts-academic/speaking)

Nguồn tham khảo topic Q4/2026 hiện dùng:

- [The IELTS Bro — IELTS Speaking Forecast: Topics to Prepare](https://www.theieltsbro.com/ielts-speaking-forecast)

## 2. Biên soạn và review

1. Sửa `src/features/speaking/topics.ts`; dùng question ID mới, không tái sử dụng
   ID cho câu hỏi khác.
2. Mỗi topic phải có 4 câu Part 1, 1 cue card Part 2 với 3–4 bullet, 4 câu Part
   3, năm vocabulary item và grammar cho cả ba Part.
3. Gắn `suggestedBand` dưới dạng mục tiêu luyện tập, không phải điểm giám khảo.
4. Sửa `src/features/speaking/model-responses.ts` để mỗi question ID có đúng một
   bài mẫu nguyên bản.
5. Một người biên soạn và một reviewer khác kiểm tra: format IELTS, tiếng Anh,
   cue points, quyền nội dung, nhãn nguồn và ngày cập nhật.

## 3. Audio và transcript

Chạy pipeline demo sau khi nội dung được duyệt:

```powershell
node scripts/speaking-audio-manifest.mts
./scripts/generate-speaking-audio.ps1
node scripts/build-speaking-models.mts
./scripts/generate-shadowing-audio.ps1
```

Audio tổng hợp phải giữ nhãn `synthetic-demo`. Để phát hành audio người thật:

1. Có văn bản cho phép sử dụng/giấy phép cho từng bản thu.
2. Lưu người đọc, ngày thu, giấy phép và URL nguồn nội bộ trong hồ sơ nội dung.
3. Transcript phải khớp chính xác file audio đã duyệt.
4. Tạo lại timestamp câu/từ từ chính file đó; không tái sử dụng timestamp demo.
5. Reviewer nghe toàn bộ file và kiểm tra câu đầu/cuối ở cả ba tốc độ.

Không tải, cắt hoặc rehost audio/video của bên thứ ba chỉ vì nội dung đang công
khai trên YouTube.

## 4. Lưu bản thu và quyền riêng tư MVP

US-306 MVP không upload bản thu. Bản tạm ở RAM; bản người học chủ động lưu nằm
trong IndexedDB theo `[userId đã xác minh, questionId]` trên cùng browser origin.
Vì vậy “upload error” là không áp dụng; transaction/session/local-save errors
phải hiển thị rõ và không được báo thành công.

Nếu Product Owner thay đổi yêu cầu sang đa thiết bị, tạo user story riêng cho
private Supabase Storage, metadata table, RLS `auth.uid()`, signed URL, retention
và xóa dữ liệu. Không thêm cloud upload âm thầm vào MVP này.

## 5. Release gate

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run smoke:speaking
```

Trước khi merge GitHub `main`, reviewer phải kiểm tra thủ công trên Chrome/Edge:

- Desktop/mobile và ba Part.
- Cho phép/từ chối/cấp lại quyền microphone.
- Record, waveform, timer, replay, delete, re-record và download.
- Reload, đổi câu, quay lại câu cũ và đổi tài khoản.
- Continuous, Sentence-by-Sentence, Continue/Space, Loop và ba tốc độ.
- So sánh tuần tự/song song và bảo đảm các nguồn audio dừng nhau.
- Completion chỉ ghi nhận một lần và không sinh Speaking band.

Ghi ngày review, người review, kết quả manual QA và commit phát hành trong pull
request. Nếu chưa có audio người thật được cấp phép, release phải tiếp tục ghi
“audio demo tổng hợp” và không đánh dấu yêu cầu native-speaker hoàn thành.
