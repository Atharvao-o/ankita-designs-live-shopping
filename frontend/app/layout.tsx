import type { Metadata } from "next";
import "@livekit/components-styles";
import "@/app/globals.css";
import { GlobalSidebar } from "@/components/layout/global-sidebar";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TutorialProvider } from "@/components/tutorial/TutorialProvider";

export const metadata: Metadata = {
  title: "Ankita Designs Online Live Exhibition",
  description:
    "Ankita Designs Online Live Exhibition is a direct live-commerce marketplace for vendors and customers."
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
            <GlobalSidebar />
          </TutorialProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
