'use client'

import { Tables } from '@/lib/types/database'

type OrderLine = Tables<'order_lines'>

export function PriceValidation({
  line,
  pricingData,
}: {
  line: OrderLine
  pricingData?: {
    product?: any
    customerPricing?: any
    isValidItem: boolean
  }
}) {
  if (!pricingData) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
        Checking...
      </span>
    )
  }

  if (!pricingData.isValidItem) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
        Invalid Item
      </span>
    )
  }

  if (!pricingData.customerPricing) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
        No Price Found
      </span>
    )
  }

  const orderPrice = Number(line.cust_unit_price) || 0
  const negotiatedPrice = Number(pricingData.customerPricing.unit_price) || 0

  if (orderPrice === 0 || negotiatedPrice === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
        No Price
      </span>
    )
  }

  const variance = Math.abs(orderPrice - negotiatedPrice) / negotiatedPrice
  const variancePercent = (variance * 100).toFixed(2)

  if (variance < 0.001) {
    // Exact match (within 0.1%)
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        ✓ Match
      </span>
    )
  } else if (variance <= 0.05) {
    // 0.1% - 5% variance
    return (
      <span
        className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800"
        title={`${variancePercent}% variance`}
      >
        ⚠ {variancePercent}%
      </span>
    )
  } else {
    // > 5% variance
    return (
      <span
        className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
        title={`${variancePercent}% variance`}
      >
        ⚠ {variancePercent}%
      </span>
    )
  }
}














