ALTER TABLE "ReviewRequest"
ADD COLUMN IF NOT EXISTS guest_id text,
ADD COLUMN IF NOT EXISTS guest_name text,
ADD COLUMN IF NOT EXISTS booking_id text,
ADD COLUMN IF NOT EXISTS sv_number text,
ADD COLUMN IF NOT EXISTS platform text DEFAULT 'airbnb',
ADD COLUMN IF NOT EXISTS requested_at timestamptz,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS response_notes text;

NOTIFY pgrst, 'reload schema';