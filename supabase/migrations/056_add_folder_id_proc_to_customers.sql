-- Add Folder_ID_Proc field to customers table
-- Stores the Microsoft Exchange folder ID for the customer's processed emails folder
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS "Folder_ID_Proc" TEXT;
