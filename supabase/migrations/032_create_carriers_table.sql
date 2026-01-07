-- Create Carriers table for carrier and ship via validation
CREATE TABLE carriers (
    carrier_id VARCHAR(10) NOT NULL,
    carrier_descr VARCHAR(30) NOT NULL,
    ship_via_code VARCHAR(10) NOT NULL,
    ship_via_desc VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Composite primary key on Carrier_ID and Ship_Via_Code
    PRIMARY KEY (carrier_id, ship_via_code)
);

-- Create indexes for faster lookups
CREATE INDEX idx_carriers_carrier_id ON carriers (carrier_id);
CREATE INDEX idx_carriers_ship_via_code ON carriers (ship_via_code);

-- Add comment to table
COMMENT ON TABLE carriers IS 'Carrier and Ship Via codes for order shipping validation';

