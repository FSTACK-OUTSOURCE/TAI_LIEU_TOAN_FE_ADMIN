"use client";

import Cookies from "js-cookie";
import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faUser } from "@fortawesome/free-solid-svg-icons";
import { getTokenByUser } from "../Api/apiUser";
import styles from "../page.module.css";

export default function Login() {
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getTokenApi = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const username = usernameRef.current?.value?.trim() || "";
    const password = passwordRef.current?.value || "";

    if (!username || !password) {
      setError("Vui lòng nhập đầy đủ tài khoản và mật khẩu.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await getTokenByUser({ USER_NAME: username, PASSWORD: password });
      if (response.success) {
        const token = response.access_token;
        Cookies.set("token", token);
        try {
          const decoded = JSON.parse(atob(token.split(".")[1]));
          localStorage.setItem("isAdmin", decoded?.IsRoot === "True" ? "1" : "0");
          localStorage.setItem("isEditer", decoded?.IsEditer === "True" ? "1" : "0");
        } catch {}

        const queryParameters = new URLSearchParams(window.location.search);
        const returnUrl = queryParameters.get("redirectUrl");
        window.location.href = returnUrl
          ? window.location.origin + returnUrl
          : window.location.origin + "/Admin";
        return;
      }
      setError("Tài khoản hoặc mật khẩu không đúng.");
    } catch {
      setError("Không thể đăng nhập lúc này. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginShell}>
        <div className={styles.loginVisual}>
          <div className={styles.loginBrand}>
            <span className={styles.loginBrandMark}>TL</span>
            <div>
              <strong>Tài Liệu Toán</strong>
              <span>Admin Console</span>
            </div>
          </div>
          <div className={styles.loginImageWrap}>
            <Image
              src="/login.png"
              alt="Tài liệu toán"
              width={560}
              height={360}
              priority
              className={styles.loginImage}
            />
          </div>
          <div className={styles.loginVisualCopy}>
            <h1>Quản trị tài liệu tập trung</h1>
            <p>Theo dõi, đăng tải và tổ chức kho tài liệu toán trong một giao diện gọn gàng.</p>
          </div>
        </div>

        <div className={styles.loginPanel}>
          <div className={styles.loginHeader}>
            <span>Đăng nhập hệ thống</span>
            <h2>Chào mừng trở lại</h2>
            <p>Sử dụng tài khoản quản trị để tiếp tục làm việc.</p>
          </div>

          <form className={styles.loginForm} onSubmit={getTokenApi}>
            <label className={styles.loginField}>
              <span>Tài khoản</span>
              <div className={styles.loginInputWrap}>
                <FontAwesomeIcon icon={faUser} className={styles.loginFieldIcon} />
                <input
                  ref={usernameRef}
                  type="text"
                  id="userAccount"
                  placeholder="Nhập tài khoản"
                  autoComplete="username"
                />
              </div>
            </label>

            <label className={styles.loginField}>
              <span>Mật khẩu</span>
              <div className={styles.loginInputWrap}>
                <FontAwesomeIcon icon={faLock} className={styles.loginFieldIcon} />
                <input
                  ref={passwordRef}
                  type="password"
                  id="passWordAccount"
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                />
              </div>
            </label>

            {error && <div className={styles.loginError}>{error}</div>}

            <button className={styles.loginSubmit} type="submit" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
