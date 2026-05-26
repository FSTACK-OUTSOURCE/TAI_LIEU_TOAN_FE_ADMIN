import type { Metadata } from "next";
import { Suspense } from "react";

const siteName = "Tài Liệu Toán Admin";
const siteDescription = "Hệ thống quản trị tài liệu, blog và người dùng của Tài Liệu Toán.";

export const metadata: Metadata = {
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: ["Tài Liệu Toán", "quản trị tài liệu", "admin tài liệu toán", "tài liệu toán"],
  authors: [{ name: "Tài Liệu Toán" }],
  creator: "Tài Liệu Toán",
  publisher: "Tài Liệu Toán",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: siteName,
    description: siteDescription,
    siteName,
    type: "website",
    locale: "vi_VN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>

      <body>
        <Suspense fallback={<div>Loading...</div>}>
          {children}
        </Suspense>
        </body>
    </html>
  );
}
