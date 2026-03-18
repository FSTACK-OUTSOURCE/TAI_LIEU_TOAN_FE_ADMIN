'use client'
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Styles from "../page.module.css";
const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const admin = localStorage.getItem('isAdmin') === '1';
    const editer = localStorage.getItem('isEditer') === '1';
    if (!admin && !editer) {
      window.location.href = '/Login';
      return;
    }
    setIsAdmin(admin);
    setReady(true);
  }, []);

  const handleLogout = () => {
    const expired = "expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
    document.cookie = `token=; ${expired}`;
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isEditer');
    window.location.href = '/Login';
  };

  if (!ready) return null;

  return (
    <html lang="en">
      <body className={`${Styles.body} ${inter.className} ${Styles.height100} ${Styles.backgroundColorSideBar} `}>
        <div className="col-md-12">
          <div className="row">
            <div className={`col-md-2 ${Styles.sideBar}`}>
              <div className={`d-flex flex-column flex-shrink-0 p-3 ${Styles.height100}`}>
                <a href="/" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-dark text-decoration-none pb-5 pt-5">
                  <svg className="bi me-2" width="40" height="32"></svg>
                  <Image
                    src="/logopage.png"
                    alt="Tài liệu toán.vn"
                    className='img-fluid'
                    width={300}
                    height={300}
                  />
                </a>
                <ul className="nav nav-pills flex-column mb-auto">
                  {isAdmin && (
                    <>
                      <li className={`nav-item pt-3 pb-3 ${Styles.borderSideBarItem}`}>
                        <Link href="/Admin/Config" className={`nav-link ${Styles.fontSideBar}`} aria-current="page">
                          <svg className="bi me-2" width="16" height="16"></svg>
                          Cấu hình
                        </Link>
                      </li>
                      <li className={`nav-item pt-3 pb-3 ${Styles.borderSideBarItem}`}>
                        <Link href="/Admin/Account" className={`nav-link ${Styles.fontSideBar}`}>
                          <svg className="bi me-2" width="16" height="16"></svg>
                          Tài khoản
                        </Link>
                      </li>
                      <li className={`nav-item pt-3 pb-3 ${Styles.borderSideBarItem}`}>
                        <Link href="/Admin/Topic" className={`nav-link ${Styles.fontSideBar}`}>
                          <svg className="bi me-2" width="16" height="16"></svg>
                          Chủ đề
                        </Link>
                      </li>
                      <li className={`nav-item pt-3 pb-3 ${Styles.borderSideBarItem}`}>
                        <Link href="/Admin/Group" className={`nav-link ${Styles.fontSideBar}`}>
                          <svg className="bi me-2" width="16" height="16"></svg>
                          Bộ tài liệu
                        </Link>
                      </li>
                      <li className={`nav-item pt-3 pb-3 ${Styles.borderSideBarItem}`}>
                        <Link href="/Admin/Document" className={`nav-link ${Styles.fontSideBar}`}>
                          <svg className="bi me-2" width="16" height="16"></svg>
                          Tài liệu
                        </Link>
                      </li>
                      <li className={`nav-item pt-3 pb-3 ${Styles.borderSideBarItem}`}>
                        <Link href="/Admin/DocumentOrder" className={`nav-link ${Styles.fontSideBar}`}>
                          <svg className="bi me-2" width="16" height="16"></svg>
                          Tài liệu nổi bật
                        </Link>
                      </li>
                      <li className={`nav-item pt-3 pb-3 ${Styles.borderSideBarItem}`}>
                        <Link href="/Admin/HistoryRecharge" className={`nav-link ${Styles.fontSideBar}`}>
                          <svg className="bi me-2" width="16" height="16"></svg>
                          Lịch sử giao dịch
                        </Link>
                      </li>
                      <li className={`nav-item pt-3 pb-3 ${Styles.borderSideBarItem}`}>
                        <Link href="/Admin/HistoryBuy" className={`nav-link ${Styles.fontSideBar}`}>
                          <svg className="bi me-2" width="16" height="16"></svg>
                          Lịch sử mua hàng
                        </Link>
                      </li>
                      <li className={`nav-item pt-3 pb-3 ${Styles.borderSideBarItem}`}>
                        <Link href="/Admin/PaymentInfo" className={`nav-link ${Styles.fontSideBar}`}>
                          <svg className="bi me-2" width="16" height="16"></svg>
                          Thông tin thanh toán
                        </Link>
                      </li>
                    </>
                  )}
                  <li className={`nav-item pt-3 pb-3 ${Styles.borderSideBarItem}`}>
                    <Link href="/Admin/Blog" className={`nav-link ${Styles.fontSideBar}`}>
                      <svg className="bi me-2" width="16" height="16"></svg>
                      Blog
                    </Link>
                  </li>
                  <li className={`nav-item pt-3 pb-3 ${Styles.borderSideBarItem}`}>
                    <Link href="#" onClick={handleLogout} className={`nav-link ${Styles.fontSideBar}`}>
                      <svg className="bi me-2" width="16" height="16"></svg>
                      Đăng xuất
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-md-10">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
