import { AccountLink } from "./Community";
import { isStaging, appPath } from "./base";
import Link from "./Link";
import { useLocation } from "react-router-dom";
import { useContent } from "./content";
import "./globals.css";
import "./platform.css";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { site } = useContent();
  const { pathname } = useLocation();
  return (
    <>
      {isStaging && (
        <div className="staging-banner">测试环境 · 内容与正式站独立</div>
      )}
      <a className="skip-link" href="#main">
        跳到主要内容
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="brand">
            <img
              className="site-mark"
              src={appPath("/favicon.svg?v=2")}
              alt=""
              width="36"
              height="36"
            />
            {site.name}
            <small>AI MENDAO</small>
          </Link>
          <nav className="nav" aria-label="主导航">
            <Link
              href="/news"
              aria-current={pathname === "/news" ? "page" : undefined}
            >
              AI 实时资讯
            </Link>
            <Link
              href="/learn"
              aria-current={
                pathname.startsWith("/learn") ||
                pathname.startsWith("/scenarios")
                  ? "page"
                  : undefined
              }
            >
              学习中心
            </Link>
            <Link href="/tools">模型与平台</Link>
            <Link href="/calculators">实用工具</Link>
            <Link href="/forum">社区论坛</Link>
            <Link href="/saved">我的收藏</Link>
          </nav>
          <AccountLink />
        </div>
      </header>
      <main id="main" className="container">
        {children}
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <span>AI 门道 · 看懂 AI，用出门道。</span>
          <div className="footer-links">
            <Link href="/about">关于本站</Link>
            <Link href="/privacy">隐私说明</Link>
            {import.meta.env.VITE_CONTACT_EMAIL && (
              <a href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL}`}>
                反馈建议
              </a>
            )}
            {site.icp && (
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noreferrer"
              >
                {site.icp}
              </a>
            )}
            <span>© {new Date().getFullYear()} ruming.top</span>
          </div>
        </div>
      </footer>
    </>
  );
}
