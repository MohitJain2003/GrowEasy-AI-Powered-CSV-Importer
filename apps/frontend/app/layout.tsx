import '../styles/globals.css';

export const metadata = {
  title: 'GrowEasy CRM | AI-Powered CSV Lead Importer',
  description: 'Intelligently map and extract CRM leads from any CSV structure with advanced semantic AI.',
};

import Header from '../components/Header';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased selection:bg-indigo-500/30">
        <div className="relative min-h-screen flex flex-col justify-between">
          {/* Fixed Header */}
          <Header />

          {/* Subtle Ambient Background Glowing effects */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
          
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-24 pb-24 sm:px-6 lg:px-8 z-10">
            {children}
          </main>

          <footer className="fixed bottom-0 left-0 right-0 border-t border-blue-500/30 bg-background/80 backdrop-blur-md py-6 text-center text-xs text-zinc-500 z-50">
            <p>© {new Date().getFullYear()} GrowEasy AI. Built with precision and animations.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
