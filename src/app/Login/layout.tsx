export const metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập hệ thống quản trị Tài Liệu Toán.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
