"use client";

import { useState } from 'react';
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
    <div className="p-4">
      {/* 1. Danh sách phiếu kiểm */}
      <InventoryCheckList 
        currentUser={currentUser} 
        onOpenForm={handleOpenForm} 
      />

      {/* 2. Form chi tiết phiếu kiểm (Hiện ra khi nhấn Tạo/Sửa) */}
      {isFormOpen && (
        <InventoryCheckForm 
          // Truyền selectedCheckId (nếu có) hoặc để trống để tạo mới
          checkId={selectedCheckId ?? ""} 
          currentUser={currentUser}
          onComplete={handleComplete}
          onBack={handleCloseForm} 
        />
      )}
    </div>
  );
}