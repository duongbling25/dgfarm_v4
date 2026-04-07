// src/presentation/hooks/useProducts.ts
'use client'

import { useState, useTransition } from 'react'
import type { Product } from '@/domain/entities/Product'
import {
  addProductUseCase,
  updateProductUseCase,
  deleteProductsUseCase,
} from '@/application/use-cases/product/ProductUseCases'
import type { AddProductDTO, UpdateProductDTO } from '@/application/dto/ProductDTO'

export function useProducts(initialProducts: Product[]) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAdd(form: AddProductDTO, onSuccess?: () => void) {
    setError(null)
    startTransition(async () => {
      try {
        await addProductUseCase(form)
        onSuccess?.()
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  function handleUpdate(id: string, form: UpdateProductDTO, onSuccess?: () => void) {
    setError(null)
    startTransition(async () => {
      try {
        await updateProductUseCase(id, form)
        setProducts(prev =>
          prev.map(p => p.id === id ? { ...p, ...form } as Product : p)
        )
        onSuccess?.()
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  function handleDelete(ids: string[], onSuccess?: () => void) {
    setError(null)
    startTransition(async () => {
      try {
        await deleteProductsUseCase(ids)
        setProducts(prev => prev.filter(p => !ids.includes(p.id)))
        onSuccess?.()
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  return { products, setProducts, isPending, error, handleAdd, handleUpdate, handleDelete }
}
