import type { Metadata, Viewport } from "next";
import "@livekit/components-styles";
import "@/app/globals.css";
import { GlobalBackButton } from "@/components/layout/global-back-button";
import { GlobalSidebar } from "@/components/layout/global-sidebar";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TutorialProvider } from "@/components/tutorial/TutorialProvider";

export const metadata: Metadata = {
  title: "Ankita Designs Social Shopping",
  description:
    "Ankita Designs is a social shopping marketplace for discovering small vendors, products, live streams, and shopping events."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
    (() => {
      try {
        const key = "ankita-expoverse-theme";
        const saved = window.localStorage.getItem(key);
        const theme = saved === "light" || saved === "dark"
          ? saved
          : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
        document.documentElement.dataset.theme = theme;
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
      } catch {
        document.documentElement.dataset.theme = "dark";
        document.documentElement.classList.add("dark");
      }
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <TutorialProvider>
            {children}
            <GlobalBackButton />
            <GlobalSidebar />
          </TutorialProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
