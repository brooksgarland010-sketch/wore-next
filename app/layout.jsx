import { ClerkProvider } from "@clerk/nextjs";
import { Syne, Inter } from "next/font/google";

const syne = Syne({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-syne" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });

export const metadata = {
  title: "wore. — AI Wardrobe Stylist",
  description: "Take photos of your clothes. wore. builds outfits from what you actually own.",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${syne.variable} ${inter.variable}`} style={{ margin: 0, padding: 0, background: "#f5f4f0", fontFamily: "var(--font-inter), sans-serif" }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
