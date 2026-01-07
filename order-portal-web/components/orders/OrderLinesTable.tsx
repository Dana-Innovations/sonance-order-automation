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
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }} className="text-card-foreground">Order Lines</h2>
        <div style={{ fontSize: '0.75rem' }} className="text-muted-foreground">
          Total: <span className="font-medium text-foreground">${calculateTotal().toFixed(2)}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th style={{ fontSize: '0.65rem', padding: '8px 4px', width: '40px', textAlign: 'center' }} className="font-medium uppercase text-muted-foreground">
                Line
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '90px' }} className="text-left font-medium uppercase text-muted-foreground">
                Cust Item
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '280px' }} className="text-left font-medium uppercase text-muted-foreground">
                Cust Description
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '50px', textAlign: 'right' }} className="font-medium uppercase text-muted-foreground">
                Qty
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 4px', width: '40px' }} className="text-left font-medium uppercase text-muted-foreground">
                UOM
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 4px', width: '70px', textAlign: 'right' }} className="font-medium uppercase text-muted-foreground">
                Unit Price
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 6px', width: '70px', textAlign: 'right' }} className="font-medium uppercase text-muted-foreground">
                Total
              </th>
              <th style={{ fontSize: '0.65rem', padding: '8px 8px' }} className="text-left font-medium uppercase text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {order.order_lines.map((line, index) => (
              <tr key={line.id} className="hover:bg-muted/50" style={{ marginBottom: index < order.order_lines.length - 1 ? '6px' : '0' }}>
                <td style={{ fontSize: '0.75rem', padding: '10px 4px', verticalAlign: 'top', textAlign: 'center', width: '40px' }} className="text-foreground">
                  {line.cust_line_number}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', width: '90px' }} className="text-foreground">
                  {line.cust_product_sku || 'N/A'}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', maxWidth: '280px', lineHeight: '1.4' }} className="text-foreground">
                  <div style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                    {line.cust_line_desc || 'N/A'}
                  </div>
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', textAlign: 'right', width: '50px' }} className="text-foreground">
                  {Math.round(line.cust_quantity || 0)}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 4px', verticalAlign: 'top', width: '40px' }} className="text-foreground">
                  {line.cust_uom || 'N/A'}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 4px', verticalAlign: 'top', textAlign: 'right', width: '70px' }} className="text-foreground">
                  ${line.cust_unit_price?.toFixed(2) || '0.00'}
                </td>
                <td style={{ fontSize: '0.75rem', padding: '10px 6px', verticalAlign: 'top', textAlign: 'right', width: '70px' }} className="font-medium text-foreground">
                  ${line.cust_line_total?.toFixed(2) || '0.00'}
                </td>
                <td style={{ padding: '10px 8px', verticalAlign: 'top' }}>
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
