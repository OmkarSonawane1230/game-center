'use client';

import { ReactNode } from 'react';
import LayoutWrapper from './LayoutWrapper';
import LeaderboardModal from './LeaderboardModal';

export default function ClientBodyWrapper({ children }: { children: ReactNode }) {
  return (
    <>
      <LayoutWrapper>
        {children}
      </LayoutWrapper>
      <LeaderboardModal />
    </>
  );
}
