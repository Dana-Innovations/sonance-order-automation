'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { PriceValidation } from './PriceValidation'
import { LineItemEditor } from './LineItemEditor'
import { Tables } from '@/lib/types/database'

type OrderLine = Tables<'order_lines'>
type Order = Tables<'orders'> & {
  order_lines: OrderLine[]
}

export function OrderLinesTable({
  order,
  userId,
}: {
  order: Order
  userId: string
}) {
  const supabase = createClient()

  // Fetch pricing data for each line item
  const { data: pricingData } = useQuery({
    queryKey: ['order-pricing', order.id],
    queryFn: async () => {
      const lines = order.order_lines || []
      const pricingResults: Record<string, any> = {}

      for (const line of lines) {
        if (!line.cust_product_sku) continue

        // Try to find product by SKU
        const { data: product } = await supabase
          .from('products')
          .select('id')
          .eq('product_sku', line.cust_product_sku)
          .single()

        if (product) {
          // Get customer pricing
          const { data: customerPricing } = await supabase
            .from('customer_pricing')
            .select('*')
            .eq('ps_customer_id', order.ps_customer_id)
            .eq('product_id', product.id)
            .eq('uom', line.cust_uom || '')
            .eq('currency_code', line.cust_currency_code || 'USD')
            .single()

          pricingResults[line.id] = {
            product,
            customerPricing,
            isValidItem: true,
          }
        } else {
          pricingResults[line.id] = {
            isValidItem: false,
          }
        }
      }

      return pricingResults
    },
  })

  const calculateTotal = () => {
    return order.order_lines.reduce((sum, line) => {
      return sum + (Number(line.cust_line_total) || 0)
    }, 0)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-card-foreground">Order Lines</h2>
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-medium text-foreground">${calculateTotal().toFixed(2)}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Line
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Item
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Qty
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                UOM
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Unit Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {order.order_lines.map((line) => (
              <tr key={line.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 text-sm text-foreground">
                  {line.cust_line_number}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {line.cust_product_sku || 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {line.cust_line_desc || 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {line.cust_quantity?.toFixed(2) || '0.00'}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {line.cust_uom || 'N/A'}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  ${line.cust_unit_price?.toFixed(2) || '0.00'}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  ${line.cust_line_total?.toFixed(2) || '0.00'}
                </td>
                <td className="px-4 py-3">
                  <PriceValidation
                    line={line}
                    pricingData={pricingData?.[line.id]}
                  />
                </td>
                <td className="px-4 py-3">
                  <LineItemEditor line={line} orderId={order.id} userId={userId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


