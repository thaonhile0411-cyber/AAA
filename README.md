This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Shadowing studio — US-306

Project riêng `AAA-shadowing`, từ `origin/main` mới nhất tại commit `0c68c18`. Chạy `npm.cmd run dev:shadowing`, mở **http://localhost:3002/shadowing**. Cấu hình Supabase đã được sao chép riêng vào `.env.local` (không commit).

Có highlight theo audio, Sentence-by-Sentence, Loop Sentence, tốc độ 0.75/1/1.25, recorder với waveform/timer, nghe so sánh, lưu tự nguyện theo tài khoản/câu hỏi trên thiết bị và xác nhận hoàn thành một lần. Audio local là demo tổng hợp có nhãn rõ; video YouTube gốc được đính kèm để tham khảo. Chưa coi demo là bản thu người bản ngữ thật.

Xem [hướng dẫn và checklist](docs/us-306-shadowing.md). `npm test` kiểm tra dữ liệu, timeline và persistence; `npm run smoke:shadowing` kiểm tra HTTP khi server đang chạy. Bản thu tạm không upload lên cloud.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
