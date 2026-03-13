ALTER TABLE public.places ADD CONSTRAINT places_name_destination_unique UNIQUE (name, destination);
ALTER TABLE public.hotels ADD CONSTRAINT hotels_name_destination_unique UNIQUE (name, destination);