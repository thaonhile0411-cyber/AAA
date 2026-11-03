import Link from "next/link";
import { Icon } from "./icon";

export function AppShell({
  children,
  active = "goals",
}: {
  children: React.ReactNode;
  active?: "goals" | "settings";
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
          <Link
            href="/onboarding/goals"
            className={active === "goals" ? "active" : ""}
            aria-current={active === "goals" ? "page" : undefined}
          >
            <Icon name="target" />
            Mục tiêu học tập
            <span className="nav-dot" />
          </Link>
          <Link
            href="/settings/goals"
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
            <span className="course-pill">Hành trình của bạn</span>
          </div>
          <Link className="account-link" href="/settings/goals">
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
            <Icon name="shield" size={15} /> Dữ liệu được bảo vệ theo tài khoản
          </span>
        </footer>
      </div>
    </div>
  );
}
