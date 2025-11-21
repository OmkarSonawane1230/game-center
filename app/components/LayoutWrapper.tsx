'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const isGamePage = pathname?.startsWith('/ultimate-tictactoe') || pathname?.startsWith('/dots-and-boxes') || pathname?.includes('/game/');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main style={{ flex: 1 }}>
        {children}
      </main>
      {!isGamePage && <Footer />}
    </div>
  );
}
