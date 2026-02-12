# Order Portal Application

Enterprise-grade web application for Customer Service Representatives (CSRs) to review, validate, and export customer sales orders.

## Features

- **Order Management**: View, filter, and search orders assigned to your customers
- **Order Review**: Side-by-side PDF viewer and order details for visual comparison
- **Price Validation**: Automatic price variance detection with visual indicators
- **Line Item Editing**: Inline editing of order lines with audit trail
- **Order Validation**: Checklist-based validation workflow
- **XML Export**: Generate PeopleSoft-compatible XML files
- **Audit Logging**: Complete audit trail of all changes
- **Tracking Dashboard**: Monitor order status and identify bottlenecks

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- SharePoint access (for PDF viewing)
- Azure AD app registration (for SharePoint authentication)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env.local` file in the `order-portal-web` directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   SHAREPOINT_CLIENT_ID=your_client_id
   SHAREPOINT_CLIENT_SECRET=your_client_secret
   SHAREPOINT_TENANT_ID=your_tenant_id
   SHAREPOINT_SITE_ID=your_site_id
   ```

3. **Database Setup:**
   The required database tables should already be created via migrations. Ensure the following tables exist:
   - `customers`
   - `orders`
   - `order_lines`
   - `products`
   - `customer_pricing`
   - `order_statuses`
   - `audit_log` (created via migration)
   - `order_status_history` (created via migration)
   - `csr_assignments` (created via migration)

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Authentication

The application uses Supabase Auth. Users must be created in Supabase and assigned to customers via the `csr_assignments` table.

## CSR Assignment

To assign a CSR to customers, insert records into the `csr_assignments` table using the user's email:
```sql
INSERT INTO csr_assignments (user_email, ps_customer_id)
VALUES ('csr@example.com', 'customer-id');
```

## Project Structure

```
order-portal-web/
├── app/
│   ├── (auth)/          # Authentication routes
│   ├── (dashboard)/     # Protected dashboard routes
│   └── api/             # API routes
├── components/
│   ├── layout/          # Layout components
│   ├── orders/          # Order-related components
│   ├── pdf/             # PDF viewer components
│   ├── audit/           # Audit log components
│   └── reports/         # Reporting components
├── lib/
│   ├── supabase/        # Supabase client configuration
│   ├── hooks/           # React hooks
│   ├── types/           # TypeScript types
│   └── xml/             # XML generation utilities
└── middleware.ts        # Route protection middleware
```

## Key Technologies

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type safety
- **Supabase**: Backend database and authentication
- **Tailwind CSS**: Styling
- **React Query**: Data fetching and caching
- **react-pdf**: PDF viewing
- **Microsoft Graph API**: SharePoint integration

## Development

- Run development server: `npm run dev`
- Build for production: `npm run build`
- Start production server: `npm start`
- Lint code: `npm run lint`

## Deployment

The application can be deployed to Vercel, Netlify, or any Node.js hosting platform. Ensure all environment variables are configured in your deployment platform.

## Support

For issues or questions, please contact the development team.
