# US-101 · Tài khoản AAA

## Chạy cục bộ

1. Chạy `npm ci` tại `D:\AAA`.
2. Tạo `.env.local` theo `.env.example`, dùng URL và publishable key của Supabase nhóm. Dùng `http://localhost:3000` nhất quán để giữ cookie trong luồng OAuth.
3. Chạy `npm run dev`, mở `http://localhost:3000`. Mã OTP được gửi qua dịch vụ SMTP đã cấu hình trong Supabase nhóm.
4. Khi kiểm thử Google, đăng ký callback của Supabase trong Google Cloud và allowlist `/auth/callback` của ứng dụng trong Supabase. Không đưa OAuth secret vào repo.

## Cấu hình Supabase

- Áp dụng lần lượt các migration của repo. Bật Email và Confirm email để tài khoản ở trạng thái chờ tới khi nhập OTP.
- Đặt mã email dài 6 chữ số, hết hạn sau 600 giây. Dùng nội dung từ `supabase/templates` cho Confirm signup và Reset password. Môi trường dùng email thật cần SMTP.
- Supabase Auth lưu mật khẩu bằng bcrypt. JWT access token có thời hạn 3600 giây. Phiên cục bộ có time-box 336 giờ (14 ngày), với refresh token xoay vòng. Trên hosted Supabase, đặt Time-box user sessions thành 14 ngày nếu gói hỗ trợ. Time-box giới hạn thời gian gia hạn phiên theo cơ chế của Supabase, còn token refresh được xoay vòng sau khi sử dụng.
- Hồ sơ cập nhật tên và URL ảnh HTTPS. Khảo sát US-102 lấy giao diện từ commit `148f462` và ghi mục tiêu theo tài khoản. Tài khoản đã có mục tiêu đi tới Dashboard.

## Nghiệm thu

- Đăng ký với mật khẩu hợp lệ và kiểm tra không đăng nhập được trước xác minh. Thử mã đúng, sai, hết hạn, dùng lại và gửi lại mã.
- Thử Google lần đầu, Google cho tài khoản đã có mục tiêu và hủy xác thực. Kiểm tra khảo sát và hồ sơ yêu cầu đăng nhập.
- Gửi mã đặt lại, đổi mật khẩu và đăng nhập lại. Kiểm tra mã cũ không dùng lại được và mật khẩu cũ bị từ chối.
- Cập nhật tên và avatar, đăng xuất rồi đăng nhập lại. Dùng hai tài khoản để kiểm tra cách ly dữ liệu. Kiểm tra phiên hết hạn access token và hành vi khi refresh token bị thu hồi.
- Đo thời gian từng yêu cầu auth trên stack thử nghiệm sau khi khởi động. Ghi lại thời gian API và tách riêng thời gian nhận email, thao tác người dùng trên Google và thời gian khởi động ứng dụng.
