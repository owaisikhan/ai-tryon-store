import { Plus_Jakarta_Sans } from "next/font/google";
import Footer from "@/app/_components/layout/Footer";
import Header from "@/app/_components/layout/Header";
import Providers from "@/app/_components/layout/Providers";
import { siteConfig } from "@/app/_lib/siteConfig";
import "@/app/_styles/globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
};

export const viewport = {
  themeColor: "#111013",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
