import type { Metadata } from "next";
import "./globals.css";
import { SimulateModalProvider } from "@/contexts/SimulateModalContext";

export const metadata: Metadata = {
    title: "アプリ名",
    description: "あとで変更",
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
