"use client";

import { getUnreadCount } from "@/app/Api/apiRegistration";
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Styles from "../page.module.css";

const inter = Inter({ subsets: ["latin"] });

const adminLinks = [
  { href: "/Admin/Config", label: "Cấu hình", adminOnly: true },
  { href: "/Admin/Account", label: "Tài khoản", adminOnly: true },
  { href: "/Admin/Notification", label: "Đăng ký mới", adminOnly: true, badge: true },
  { href: "/Admin/Topic", label: "Chủ đề", adminOnly: true },
  { href: "/Admin/Group", label: "Bộ tài liệu", adminOnly: true },
  { href: "/Admin/Document", label: "Tài liệu", adminOnly: true },
  { href: "/Admin/DocumentOrder", label: "Tài liệu nổi bật", adminOnly: true },
  { href: "/Admin/HistoryRecharge", label: "Lịch sử giao dịch", adminOnly: true },
  { href: "/Admin/HistoryBuy", label: "Lịch sử mua hàng", adminOnly: true },
  { href: "/Admin/Blog", label: "Blog" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const admin = localStorage.getItem("isAdmin") === "1";
    const editer = localStorage.getItem("isEditer") === "1";
    if (!admin && !editer) {
      window.location.href = "/Login";
      return;
    }
    setIsAdmin(admin);
    setReady(true);

    const fetchUnread = async () => setUnreadCount(await getUnreadCount());
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    const expired = "expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    document.cookie = `token=; ${expired}`;
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("isEditer");
    window.location.href = "/Login";
  };

  const navClass = (href: string) =>
    `${Styles.fontSideBar} ${pathname === href || pathname?.startsWith(`${href}/`) ? Styles.activeSideBarLink : ""}`;

  if (!ready) return null;

  return (
    <html lang="vi">
      <body className={`${Styles.body} ${inter.className} ${Styles.backgroundColorSideBar}`}>
        <div className={Styles.adminShell}>
          <aside className={Styles.sideBar}>
            <div className={Styles.sideBarInner}>
              <Link href="/Admin/Document" className={Styles.sideBarLogo}>
                <Image
                  src="/logopage.png"
                  alt="Tài liệu toán.vn"
                  width={260}
                  height={84}
                  priority
                />
              </Link>

              <nav className={Styles.sideBarNav} aria-label="Admin navigation">
                {adminLinks
                  .filter((link) => !link.adminOnly || isAdmin)
                  .map((link) => (
                    <Link key={link.href} href={link.href} className={navClass(link.href)}>
                      <span>{link.label}</span>
                      {link.badge && unreadCount > 0 && (
                        <span className={Styles.sideBarBadge}>
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  ))}
              </nav>

              <button type="button" onClick={handleLogout} className={Styles.logoutSideBarLink}>
                Đăng xuất
              </button>
            </div>
          </aside>

          <main className={Styles.adminContent}>{children}</main>
        </div>
      </body>
    </html>
  );
}
