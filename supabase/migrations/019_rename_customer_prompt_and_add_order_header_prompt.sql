-- Rename customer_prompt_text to order_line_prompt
ALTER TABLE customers 
RENAME COLUMN customer_prompt_text TO order_line_prompt;

-- Add order_header_prompt field for order header-specific prompts
-- TEXT type supports unlimited length with special characters, carriage returns, etc.
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS order_header_prompt TEXT;

