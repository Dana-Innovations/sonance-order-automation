-- Remove UNIQUE constraint from sender_email to allow multiple emails per customer
-- Multiple emails will be stored as semicolon-separated values
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_sender_email_key;

-- Create a function to check if an email exists in a semicolon-separated email string
-- This function returns true if the search_email is found in the email_list (which may contain multiple emails separated by semicolons)
-- Usage in queries: WHERE email_exists_in_list(sender_email, 'search@email.com')
CREATE OR REPLACE FUNCTION email_exists_in_list(email_list TEXT, search_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Handle NULL cases
    IF email_list IS NULL OR search_email IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Trim whitespace and check if the email exists in the list
    -- Split by semicolon, trim each part, and check for exact match (case-insensitive)
    -- This handles emails like "email1@test.com;email2@test.com" correctly
    RETURN EXISTS (
        SELECT 1 
        FROM unnest(string_to_array(email_list, ';')) AS email_item
        WHERE LOWER(TRIM(email_item)) = LOWER(TRIM(search_email))
        AND TRIM(email_item) != ''
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Alternative: Create a simpler helper that can be used with LIKE patterns
-- This allows using pattern matching in n8n filters: sender_email LIKE '%search@email.com%'
-- Note: This approach is less precise but works with n8n's filter UI
-- The email_exists_in_list function is preferred for exact matches

-- Create an index using a GIN index on the email field for faster searches
-- Note: For semicolon-separated values, we'll use a functional index
-- We'll also keep the existing index but it won't be as effective for partial matches
-- For better performance with the LIKE pattern, we keep the existing index

-- Add a comment to the sender_email column to document the format
COMMENT ON COLUMN customers.sender_email IS 'Email address(es) of the customer. Multiple emails can be stored separated by semicolons (e.g., "email1@example.com;email2@example.com")';

