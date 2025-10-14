import type { Metadata } from "next";
import "../styles.css";

export const metadata: Metadata = {
  title: "ZORA CORE Admin",
  description: "Operations and governance console"
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
