import Link from "next/link";
import { Icon } from "./icon";

export function AppShell({
  children,
  active = "goals",
  demoMode = false,
}: {
  children: React.ReactNode;
  active?: "goals" | "settings" | "test" | "practice" | "writing";
  demoMode?: boolean;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="AAA - Trang chủ">
          <span className="brand-mark">
            A<span>.</span>
          </span>
          <span>
            AAA<small>YOUR IELTS JOURNEY</small>
          </span>
        </Link>
        <div className="workspace-label">KHÔNG GIAN HỌC TẬP</div>
        <nav className="side-nav" aria-label="Điều hướng chính">
          <Link href="/dashboard">Dashboard</Link>
          <Link
            href="/practice"
            className={active === "practice" ? "active" : ""}
            aria-current={active === "practice" ? "page" : undefined}
            aria-label="Kho tài liệu IELTS"
          >
            <Icon name="book" />
            Kho tài liệu
            {active === "practice" && <span className="nav-dot" />}
            </Link>
            <Link
            href="/writing"
            className={active === "writing" ? "active" : ""}
            aria-current={active === "writing" ? "page" : undefined}
          >
            <Icon name="edit" />
            Writing practice
              {active === "writing" && <span className="nav-dot" />}
          </Link>
          <Link
            href="/onboarding/goals"
            aria-label="Mục tiêu học tập"
            className={active === "goals" ? "active" : ""}
            aria-current={active === "goals" ? "page" : undefined}
          >
            <Icon name="target" />
            Mục tiêu học tập
            <span className="nav-dot" />
          </Link>
          <Link
            href="/profile"
            aria-label="Cài đặt tài khoản"
            className={active === "settings" ? "active" : ""}
            aria-current={active === "settings" ? "page" : undefined}
          >
            <Icon name="settings" />
            Cài đặt tài khoản
          </Link>
        </nav>
        <div className="sidebar-encouragement">
          <span className="small-spark">✦</span>
          <strong>
            Mỗi ngày một bước.
            <br />
            Mỗi bước một tiến bộ.
          </strong>
          <p>Hành trình chinh phục IELTS bắt đầu từ mục tiêu của bạn.</p>
          <span className="tiny-line" />
        </div>
        <div className="sidebar-bottom">
          <span className="online-dot" />
          Không gian dành riêng cho IELTS<small>AAA · Learn with purpose</small>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-course">
            <span className="course-icon">
              <Icon name="book" size={18} />
            </span>
            IELTS Academic
            <span className="course-pill">
              {demoMode ? "Chế độ trải nghiệm" : "Hành trình của bạn"}
            </span>
          </div>
          <Link className="account-link" href="/profile">
            <span className="account-avatar">Y</span>
            <span>Tài khoản của bạn</span>
            <Icon name="chevron" size={14} />
          </Link>
        </header>
        <main id="main-content" className="main-content">
          {children}
        </main>
        <footer className="page-footer">
          <span>Đặt mục tiêu rõ ràng. Học tập vững vàng.</span>
          <span>
            <Icon name="shield" size={15} /> Mục tiêu được lưu trong tài khoản
          </span>
        </footer>
      </div>
    </div>
  );
}
