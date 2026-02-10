import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./context/ThemeContext";
import { StoreProvider } from "./store/StoreProvider";
import { SessionProvider } from "./hooks";
import { AppErrorBoundary } from "./components/errors";
import { QuestionsProvider } from "./features/questions";
import { QueryProvider } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OP Skillsim",
  description: "Open Protocol Skillsimulator",
  icons: {
    icon: "/logos/OP1-favicon.png",
    shortcut: "/logos/OP1-favicon.png",
    apple: "/logos/OP1-favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <StoreProvider>
            <SessionProvider>
              <ThemeProvider>
                <QuestionsProvider>
                  <AppErrorBoundary>
                    {children}
                  </AppErrorBoundary>
                </QuestionsProvider>
              </ThemeProvider>
            </SessionProvider>
          </StoreProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
