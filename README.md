# AAA — IELTS frontend / US-102

Giao diện khảo sát mục tiêu IELTS, dùng Next.js App Router, React, TypeScript và Tailwind CSS.
Phong cách xanh–trắng lấy cảm hứng từ PREP, dùng thương hiệu **AAA**, chỉ có nội dung IELTS.

**Phạm vi hiện tại: chỉ frontend theo yêu cầu.** Không có API route, Supabase, database,
đăng nhập thật, thuật toán chấm placement hoặc sinh lộ trình. Dữ liệu bản xem trước
được lưu trong trình duyệt bằng localStorage, không ghi vào `user_profiles`.

## Writing question bank (US-303)

Mở `/writing` để luyện Task 1 và Task 2 với dàn ý, từ vựng, bài mẫu tô sáng và biểu đồ phóng to. Module này chạy được mà không cần Docker hay thông tin Supabase. Xem [hướng dẫn và tiêu chí kiểm thử](docs/us-303-writing.md).

## Chạy dự án

Node.js 22.18+ (máy hiện tại dùng Node 24) và npm:

```powershell
npm.cmd ci
npm.cmd run dev
```

Mở http://localhost:3000. Có thể dùng `npm` thay `npm.cmd` trên macOS/Linux.
Trên Windows, `npm.cmd` hoạt động khi PowerShell chặn `npm.ps1`.
Không cần file .env, Supabase hay tài khoản để xem frontend.

## Phạm vi US-102

| Đường dẫn | Nội dung |
| --- | --- |
| `/` | Chuyển đến khảo sát mục tiêu |
| `/onboarding/goals` | US-102: form khảo sát với 3 trường bắt buộc |
| `/settings/goals` | Xem, sửa, lưu mục tiêu ngay tại trang cài đặt |

US-103 (Placement Test), US-104 (kết quả band) và US-201 (tạo lộ trình) không có
trang hay logic trong phần việc này. Sau này nhóm có thể nối hành động lưu thành công
với bước phù hợp trong luồng chung.

## Hành vi US-102

- **Target Band:** dropdown 3.0–9.0, bước 0.5, bắt buộc.
- **Ngày thi:** date picker, ngày lịch hợp lệ, cách hôm nay ít nhất 7 ngày.
  Ngày hiện tại tính theo múi giờ Việt Nam; đúng ngày +7 được chấp nhận.
- **Thời gian mỗi ngày:** 15 phút, 30 phút, 1 giờ, 2 giờ, >2 giờ. Bắt buộc chọn.
- Tóm tắt band, ngày thi, nhịp học, số ngày còn lại cập nhật theo form.
- Checkbox điểm IELTS gần đây mở 4 dropdown Listening/Reading/Writing/Speaking,
  mỗi điểm 0.0–9.0, bước 0.5; cần nhập đủ cả 4.
- Tính overall từ trung bình 4 kỹ năng, làm tròn nửa band (.25 lên .5, .75 lên số nguyên).
- Mục tiêu <= band hiện tại: cảnh báo và gợi ý tăng 0.5, vẫn cho lưu.
  Đã đạt 9.0 thì gợi ý duy trì thay vì gợi ý 9.5.
- Trang cài đặt điền sẵn dữ liệu; lưu thành công hiển thị thông báo, không tự bắt làm lại onboarding.
- Có loading, trạng thái đang lưu, lỗi theo trường, lỗi đọc/ghi bộ nhớ trình duyệt và nút thử lại.
- Lưu lỗi thì giữ nội dung form. Dữ liệu localStorage hỏng được coi là chưa có mục tiêu.
- Giao diện có breakpoint desktop/tablet/mobile, label, focus, radio bàn phím, skip link,
  aria-invalid, mô tả lỗi và reduced motion.

## Cấu trúc và điểm nối backend sau này

| File | Vai trò |
| --- | --- |
| `src/components/goal-survey.tsx` | Form dùng chung cho onboarding và cài đặt |
| `src/components/app-shell.tsx` | Điều hướng, header, thương hiệu AAA |
| `src/lib/goals.ts` | Kiểu dữ liệu, lựa chọn, ngày tháng và kiểm tra form |
| `src/lib/goal-storage.ts` | Adapter bản xem trước dùng localStorage |
| `src/app/globals.css` | Style responsive và trạng thái tương tác |

Khi nhóm làm backend, thay `loadBrowserGoals()` và `saveBrowserGoals()` bằng lệnh gọi
API đã xác thực, giữ kiểu dữ liệu đầu vào/đầu ra để ít phải sửa UI. Khi đăng ký US-101
thành công, chuyển đến `/onboarding/goals`.

Dữ liệu form:

```ts
{
  targetBand: 7,
  examDate: "2026-12-30", // ISO calendar date
  dailyStudyMinutes: 60,
  useExistingScores: false,
  scores: null
}
```

Khi có điểm: `scores` chứa đủ `listening`, `reading`, `writing`, `speaking`.
Giá trị `dailyStudyMinutes: 180` hiện là mã demo cho lựa chọn **>2 giờ**, không phải
khẳng định học đúng 3 giờ; nhóm có thể đổi hợp đồng này khi thống nhất API.
`currentBand` trong bản frontend này chỉ được tính từ điểm IELTS do người dùng tự nhập.

Key localStorage: `aaa:us102:goals:v1`. Dữ liệu chỉ ở trình duyệt hiện tại,
không đồng bộ thiết bị và không được tách theo tài khoản vì chưa có authentication.
Xóa dữ liệu trang hoặc dùng trình duyệt/phiên ẩn danh khác để thử luồng mới.

## Kiểm tra

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Test kiểm tra quy tắc form, 65 tổ hợp band–thời gian, ngày +6/+7, timezone Việt Nam,
điểm 4 kỹ năng, làm tròn overall, cảnh báo và adapter localStorage.
Có thể định dạng source bằng `npm.cmd run format`.

Kiểm tra thủ công khi mở giao diện:

1. Bấm Lưu mục tiêu khi trống: thấy lỗi tại các trường bắt buộc.
2. Chọn 7.0, 30/12/2026 (nếu còn cách hiện tại >=7 ngày), 1 giờ: thấy thông báo lưu thành công.
3. Tải lại, vào cài đặt: các giá trị vẫn được điền sẵn; sửa rồi lưu tại chỗ.
4. Bật điểm có sẵn, điền 7.5/7.0/6.5/7.0: thấy overall 7.0.
5. Đặt mục tiêu 6.5 hoặc 7.0 với overall 7.0: có cảnh báo gợi ý tăng mục tiêu.
6. Chọn ngày quá gần hoặc thiếu một kỹ năng: không lưu.
7. Kiểm tra date picker, radio bằng bàn phím, chiều rộng điện thoại và thông báo lỗi lưu.

Peer review, GitHub PR, Supabase thật và Vercel sẽ do nhóm thực hiện khi tích hợp;
bản local này không được coi là đã hoàn tất toàn bộ DoD của nhóm.
