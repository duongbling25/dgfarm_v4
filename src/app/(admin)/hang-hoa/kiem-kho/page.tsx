'use client'

import React, { useState } from 'react';
import { InventoryCheckList } from '@/presentation/components/product/inventory-check/Inventorychecklist';
import { InventoryCheckForm } from '@/presentation/components/product/inventory-check/Inventorycheckform';

export default function KiemKhoPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);

  const currentUser = "Admin"; 

  const handleOpenForm = (checkId?: string) => {
    setSelectedCheckId(checkId || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedCheckId(null);
  };

  const handleComplete = () => {
    handleCloseForm();
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      {!isFormOpen ? (
        <InventoryCheckList 
          currentUser={currentUser} 
          onOpenForm={handleOpenForm} 
        />
      ) : (
        <InventoryCheckForm 
          checkId={selectedCheckId ?? ""} 
          currentUser={currentUser}
          onComplete={handleComplete}
          onBack={handleCloseForm} 
        />
      )}
    </div>
  );
}