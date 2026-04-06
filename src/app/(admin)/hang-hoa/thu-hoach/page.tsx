'use client'

import React, { useState } from 'react';
import { HarvestManager } from '@/presentation/components/product/harvest/HarvestManager';
import { HarvestReport } from '@/presentation/components/product/harvest/HarvestReport';

export default function ThuHoachPage() {
  const [view, setView] = useState<'report' | 'recorder'>('report');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey(k => k + 1);
    setView('report');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F0F1F3]">
      {view === 'report' ? (
        <HarvestReport 
          key={refreshKey} 
          onOpenForm={() => setView('recorder')} 
        />
      ) : (
        <HarvestManager 
          currentUser="Admin" 
          onSuccess={handleSuccess}
          onBack={() => setView('report')} 
        />
      )}
    </div>
  );
}