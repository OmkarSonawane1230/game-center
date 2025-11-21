import type { Metadata } from "next";
import "./styles/globals.css";
import "./styles/Home.module.css";
import "./styles/UltimateTicTacToe.module.css";
import ClientBodyWrapper from "./components/ClientBodyWrapper";

export const metadata: Metadata = {
  title: "Retro Game Hub - Premium Gaming Experience",
  description: "A premium collection of retro browser games with real-time multiplayer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClientBodyWrapper>
          {children}
        </ClientBodyWrapper>
      </body>
    </html>
  );
}