import type { Metadata } from "next";
import "./globals.css";
import { SimulateModalProvider } from "@/contexts/SimulateModalContext";

export const metadata: Metadata = {
    title: "アプリ名",
    description: "あとで変更",
    viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="ja">
            <body>
            <SimulateModalProvider>
                {children}
            </SimulateModalProvider>
            </body>
        </html>
    );
}
