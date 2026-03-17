
-- Add indexes on destination columns for faster lookups
CREATE INDEX IF NOT EXISTS idx_places_destination ON public.places (destination);
CREATE INDEX IF NOT EXISTS idx_hotels_destination ON public.hotels (destination);

-- Add index on destination + name for faster upserts
CREATE INDEX IF NOT EXISTS idx_places_destination_name ON public.places (destination, name);
CREATE INDEX IF NOT EXISTS idx_hotels_destination_name ON public.hotels (destination, name);
