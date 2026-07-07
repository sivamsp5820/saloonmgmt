-- Seed script for Saloon Management Database

-- 1. Insert Cashier & Admin Profiles
INSERT INTO profiles (id, username, password_hash, name, role) VALUES
('d0000000-0000-0000-0000-000000000000', 'admin', '$2a$10$roZpygbavHCwB9VazTAsquRyLNbjMpiYh6z1gZPxfiCGIxVqk2K4S', 'Administrator', 'admin'),
('d0000000-0000-0000-0000-000000000001', 'billing1', '$2a$10$IxyM3uRO4x/vosvTRCJjZOsHQr3Jgf97zr13wUOKYSVWWiYEn55bi', 'Counter Cashier Terminal 1', 'billing'),
('d0000000-0000-0000-0000-000000000002', 'billing2', '$2a$10$5HUdMo8nyA./G.1RuYTLh.ze7/UcXNvYMOyBYl0u.QWPvRY2pojDe', 'Counter Cashier Terminal 2', 'billing')
ON CONFLICT (username) DO NOTHING;

-- 2. Insert Default Services
INSERT INTO services (id, name, category, price, duration, description) VALUES
('a1000000-0000-0000-0000-000000000001', 'Haircut (Men)', 'Hair', 150.00, 30, 'Classic precision cut'),
('a1000000-0000-0000-0000-000000000002', 'Hair Spa', 'Hair', 700.00, 90, 'Nourishing hair spa'),
('a1000000-0000-0000-0000-000000000003', 'Threading', 'Skin', 60.00, 15, 'Eyebrow & face threading'),
('a1000000-0000-0000-0000-000000000004', 'Hair Cut', 'Hair', 150.00, 30, 'Ladies haircut'),
('a1000000-0000-0000-0000-000000000005', 'Shave & Trim', 'Beard', 120.00, 20, 'Beard shave & styling'),
('a1000000-0000-0000-0000-000000000006', 'Facial', 'Skin', 600.00, 60, 'Brightening facial'),
('a1000000-0000-0000-0000-000000000007', 'Manicure', 'Nails', 400.00, 45, 'Classic manicure'),
('a1000000-0000-0000-0000-000000000008', 'Pedicure', 'Nails', 450.00, 50, 'Relaxing pedicure'),
('a1000000-0000-0000-0000-000000000009', 'Full Body Spa', 'Spa', 1200.00, 120, 'Luxury body spa')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Default Customers
INSERT INTO customers (id, name, phone) VALUES
('c1000000-0000-0000-0000-000000000001', 'Priya Sharma', '9876543210'),
('c1000000-0000-0000-0000-000000000002', 'Meena Patel', '9812345678'),
('c1000000-0000-0000-0000-000000000003', 'Sunita Rao', '9823456789'),
('c1000000-0000-0000-0000-000000000004', 'Kavya Reddy', '9834567890'),
('c1000000-0000-0000-0000-000000000005', 'Anjali Devi', '9845678901'),
('c1000000-0000-0000-0000-000000000006', 'Rekha Nair', '9856789012'),
('c1000000-0000-0000-0000-000000000007', 'Pooja Singh', '9867890123'),
('c1000000-0000-0000-0000-000000000008', 'Deepa Kumar', '9878901234'),
('c1000000-0000-0000-0000-000000000009', 'Vani Murthy', '9889012345'),
('c1000000-0000-0000-0000-000000000010', 'Saroja Devi', '9890123456')
ON CONFLICT (phone) DO NOTHING;

-- 4. Generate Random Bills & Expenses using PL/pgSQL
DO $$
DECLARE
    cust_id UUID;
    cashier_id UUID;
    tx_id UUID;
    svc_id UUID;
    svc_price NUMERIC;
    num_svcs INT;
    sub_tot NUMERIC;
    disc NUMERIC;
    disc_val NUMERIC;
    tot NUMERIC;
    pm VARCHAR;
    dt TIMESTAMP;
    i INT;
    j INT;
    svc_count INT;
    shuffled_services UUID[] := ARRAY[
        'a1000000-0000-0000-0000-000000000001'::UUID,
        'a1000000-0000-0000-0000-000000000002'::UUID,
        'a1000000-0000-0000-0000-000000000003'::UUID,
        'a1000000-0000-0000-0000-000000000004'::UUID,
        'a1000000-0000-0000-0000-000000000005'::UUID,
        'a1000000-0000-0000-0000-000000000006'::UUID,
        'a1000000-0000-0000-0000-000000000007'::UUID,
        'a1000000-0000-0000-0000-000000000008'::UUID,
        'a1000000-0000-0000-0000-000000000009'::UUID
    ];
    customers_list UUID[] := ARRAY[
        'c1000000-0000-0000-0000-000000000001'::UUID,
        'c1000000-0000-0000-0000-000000000002'::UUID,
        'c1000000-0000-0000-0000-000000000003'::UUID,
        'c1000000-0000-0000-0000-000000000004'::UUID,
        'c1000000-0000-0000-0000-000000000005'::UUID,
        'c1000000-0000-0000-0000-000000000006'::UUID,
        'c1000000-0000-0000-0000-000000000007'::UUID,
        'c1000000-0000-0000-0000-000000000008'::UUID,
        'c1000000-0000-0000-0000-000000000009'::UUID,
        'c1000000-0000-0000-0000-000000000010'::UUID
    ];
    cashiers_list UUID[] := ARRAY[
        'd0000000-0000-0000-0000-000000000001'::UUID,
        'd0000000-0000-0000-0000-000000000002'::UUID
    ];
    modes_list VARCHAR[] := ARRAY['Cash', 'UPI', 'Card'];
    exp_cats VARCHAR[] := ARRAY['Product Purchase', 'Utilities', 'Maintenance', 'Salary', 'Rent', 'Marketing', 'Other'];
    exp_desc VARCHAR[] := ARRAY['Shampoo purchase', 'Electricity bill', 'Water supplier bill', 'Salon chair repair', 'Cashier advance payment', 'Local flyer marketing', 'Coffee & snacks for customers'];
BEGIN
    -- Only generate seeds if transactions are empty
    SELECT COUNT(*) INTO svc_count FROM transactions;
    IF svc_count = 0 THEN
        -- Generate 40 transactions
        FOR i IN 1..40 LOOP
            -- Setup random parameters
            dt := NOW() - (random() * 30 * INTERVAL '1 day') - (random() * 10 * INTERVAL '1 hour');
            cust_id := customers_list[1 + floor(random() * 10)::INT];
            cashier_id := cashiers_list[1 + floor(random() * 2)::INT];
            pm := modes_list[1 + floor(random() * 3)::INT];
            num_svcs := 1 + floor(random() * 3)::INT;
            
            -- Insert transaction header with dummy amounts (will update after calculating items)
            INSERT INTO transactions (customer_id, subtotal, discount_type, discount_value, discount_amount, total, payment_mode, billed_by, created_at)
            VALUES (cust_id, 0.00, 'rupees', 0.00, 0.00, 0.00, pm, cashier_id, dt)
            RETURNING id INTO tx_id;

            sub_tot := 0.00;
            -- Pick random non-duplicate services
            FOR j IN 1..num_svcs LOOP
                svc_id := shuffled_services[1 + ((i * 3 + j) % 9)];
                
                SELECT price INTO svc_price FROM services WHERE id = svc_id;
                
                INSERT INTO transaction_services (transaction_id, service_id, price)
                VALUES (tx_id, svc_id, svc_price);
                
                sub_tot := sub_tot + svc_price;
            END LOOP;

            -- Calculate discount (40% chance of 10% discount)
            IF random() > 0.6 THEN
                disc := floor(sub_tot * 0.1);
            ELSE
                disc := 0.00;
            END IF;
            
            tot := sub_tot - disc;

            -- Update transaction totals
            UPDATE transactions 
            SET subtotal = sub_tot, 
                discount_value = disc, 
                discount_amount = disc, 
                total = tot
            WHERE id = tx_id;
        END LOOP;
        
        -- Generate 10 dummy expenses
        FOR i IN 1..10 LOOP
            dt := NOW() - (random() * 30 * INTERVAL '1 day') - (random() * 8 * INTERVAL '1 hour');
            cashier_id := cashiers_list[1 + floor(random() * 2)::INT];
            pm := modes_list[1 + floor(random() * 3)::INT];
            
            INSERT INTO expenses (description, category, amount, payment_mode, note, recorded_by, created_at)
            VALUES (
                exp_desc[1 + floor(random() * array_length(exp_desc, 1))::INT],
                exp_cats[1 + floor(random() * array_length(exp_cats, 1))::INT],
                100.00 + floor(random() * 1900.00),
                pm,
                'Monthly recurring expense tracker test',
                cashier_id,
                dt
            );
        END LOOP;
    END IF;
END $$;
