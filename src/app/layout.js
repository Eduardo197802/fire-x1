import { Manrope, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display"
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata = {
  title: "Fire X1 Dashboard",
  description: "Painel operacional Fire X1 Play"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.variable} ${manrope.variable}`}>
        {children}
      </body>
    </html>
  );
}