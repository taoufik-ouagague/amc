/*
  # Token Transaction System

  1. New Tables
    - `token_transactions` - Complete audit trail of all token movements
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `transaction_type` (enum)
      - `amount` (integer, positive for credits, negative for debits)
      - `balance_before` (integer)
      - `balance_after` (integer)
      - `description` (text)
      - `reference_id` (uuid, optional - links to bookings)
      - `reference_type` (text, optional - 'booking', 'manual', etc.)
      - `created_by` (uuid, admin who performed the action)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on token_transactions
    - Users can read their own transactions
    - Admins can read all transactions and create manual adjustments

  3. Functions
    - Auto-create transaction records for booking-related token changes
    - Calculate running balances
*/

-- Create transaction type enum
CREATE TYPE token_transaction_type AS ENUM (
  'allocated',    -- Initial or additional token grants
  'consumed',     -- Tokens used for approved bookings
  'refunded',     -- Tokens returned from cancelled bookings
  'adjusted',     -- Manual admin adjustments (positive or negative)
  'expired'       -- Tokens that have expired (future feature)
);

-- Create token_transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type token_transaction_type NOT NULL,
  amount integer NOT NULL,
  balance_before integer NOT NULL DEFAULT 0,
  balance_after integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  reference_id uuid,
  reference_type text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_amount CHECK (amount != 0)
);

-- Enable RLS
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for token_transactions
CREATE POLICY "Users can read own token transactions"
  ON token_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all token transactions"
  ON token_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('amc_admin', 'ima_admin')
    )
  );

CREATE POLICY "Admins can create token transactions"
  ON token_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role = 'amc_admin'
    )
  );

-- Function to create token transaction and update user balance
CREATE OR REPLACE FUNCTION create_token_transaction(
  p_user_id uuid,
  p_transaction_type token_transaction_type,
  p_amount integer,
  p_description text,
  p_reference_id uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  current_balance integer;
  new_balance integer;
  transaction_id uuid;
BEGIN
  -- Get current user balance
  SELECT tokens_remaining INTO current_balance
  FROM profiles
  WHERE id = p_user_id;
  
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Calculate new balance
  new_balance := current_balance + p_amount;
  
  -- Ensure balance doesn't go negative (except for consumed transactions)
  IF new_balance < 0 AND p_transaction_type != 'consumed' THEN
    RAISE EXCEPTION 'Insufficient token balance';
  END IF;
  
  -- Create transaction record
  INSERT INTO token_transactions (
    user_id, transaction_type, amount, balance_before, balance_after,
    description, reference_id, reference_type, created_by
  ) VALUES (
    p_user_id, p_transaction_type, p_amount, current_balance, new_balance,
    p_description, p_reference_id, p_reference_type, auth.uid()
  ) RETURNING id INTO transaction_id;
  
  -- Update user balance
  UPDATE profiles 
  SET 
    tokens_remaining = new_balance,
    tokens_given = CASE 
      WHEN p_transaction_type = 'allocated' AND p_amount > 0 THEN tokens_given + p_amount
      WHEN p_transaction_type = 'adjusted' AND p_amount > 0 THEN tokens_given + p_amount
      WHEN p_transaction_type = 'adjusted' AND p_amount < 0 THEN GREATEST(0, tokens_given + p_amount)
      ELSE tokens_given
    END,
    tokens_consumed = CASE
      WHEN p_transaction_type = 'consumed' THEN tokens_consumed + ABS(p_amount)
      WHEN p_transaction_type = 'refunded' THEN GREATEST(0, tokens_consumed - ABS(p_amount))
      ELSE tokens_consumed
    END
  WHERE id = p_user_id;
  
  RETURN transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle booking-related token transactions
CREATE OR REPLACE FUNCTION handle_booking_token_transaction()
RETURNS trigger AS $$
BEGIN
  -- If booking is approved, consume tokens
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM create_token_transaction(
      NEW.user_id,
      'consumed',
      -NEW.tokens_consumed,
      'Tokens consumed for booking: ' || (SELECT name FROM machines WHERE id = NEW.machine_id),
      NEW.id,
      'booking'
    );
  END IF;
  
  -- If booking was approved but now rejected/cancelled, refund tokens
  IF OLD.status = 'approved' AND NEW.status IN ('rejected', 'cancelled') THEN
    PERFORM create_token_transaction(
      OLD.user_id,
      'refunded',
      OLD.tokens_consumed,
      'Tokens refunded for ' || NEW.status || ' booking: ' || (SELECT name FROM machines WHERE id = OLD.machine_id),
      OLD.id,
      'booking'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the old trigger with the new one
DROP TRIGGER IF EXISTS update_user_tokens_trigger ON bookings;
CREATE TRIGGER handle_booking_token_transaction_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION handle_booking_token_transaction();

-- Function to get user token transaction history
CREATE OR REPLACE FUNCTION get_user_token_history(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  transaction_type token_transaction_type,
  amount integer,
  balance_before integer,
  balance_after integer,
  description text,
  reference_id uuid,
  reference_type text,
  created_by_name text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tt.id,
    tt.transaction_type,
    tt.amount,
    tt.balance_before,
    tt.balance_after,
    tt.description,
    tt.reference_id,
    tt.reference_type,
    COALESCE(p.name, 'System') as created_by_name,
    tt.created_at
  FROM token_transactions tt
  LEFT JOIN profiles p ON tt.created_by = p.id
  WHERE tt.user_id = p_user_id
  ORDER BY tt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;