import "./globals.css";
import type { Metadata } from "next";

import Header from "./components/Header";
import Banner from "./components/Banner";
import Proposals from "./components/Proposals";

export const metadata: Metadata = {
  title: "Simple DAO",
  description: "Decentralized Autonomous Organization",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 dark:bg-[#212936] dark:text-gray-300">
        <Header />
        <Banner />
        <Proposals />
        {children}
      </body>
    </html>
  );
}
