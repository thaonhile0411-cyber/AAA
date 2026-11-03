import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  icons: { icon: "/icon.svg" },
  title: "Mục tiêu IELTS của bạn | AAA",
  description:
    "Thiết lập band điểm, ngày thi và thời gian học để bắt đầu hành trình IELTS dành riêng cho bạn cùng AAA.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <a className="skip-link" href="#main-content">
          Đến nội dung chính
        </a>
        {children}
      </body>
    </html>
  );
}
