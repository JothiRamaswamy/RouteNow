import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RouteNow — NYC Commute Intelligence",
  description: "Know exactly when to walk out the door.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <main className="min-h-screen bg-background">
          <div className="mx-auto max-w-2xl px-4 py-8">
            <header className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                RouteNow
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Know exactly when to walk out the door.
              </p>
            </header>
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
