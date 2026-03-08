
-- Create places table
CREATE TABLE public.places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destination TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('activity', 'food', 'prayer', 'transport', 'hotel')),
  badges TEXT[] DEFAULT '{}',
  halal_status TEXT CHECK (halal_status IN ('verified', 'muslim-friendly', 'needs-check')),
  confidence_score INTEGER,
  cost_range TEXT,
  area TEXT,
  tags TEXT[] DEFAULT '{}',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Places are publicly readable" ON public.places FOR SELECT USING (true);

CREATE INDEX idx_places_destination ON public.places(destination);
CREATE INDEX idx_places_type ON public.places(type);
CREATE INDEX idx_places_tags ON public.places USING GIN(tags);

-- Create hotels table
CREATE TABLE public.hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destination TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  badges TEXT[] DEFAULT '{}',
  halal_status TEXT CHECK (halal_status IN ('verified', 'muslim-friendly', 'needs-check')),
  confidence_score INTEGER,
  price_range TEXT,
  area TEXT,
  tags TEXT[] DEFAULT '{}',
  star_rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotels are publicly readable" ON public.hotels FOR SELECT USING (true);

CREATE INDEX idx_hotels_destination ON public.hotels(destination);

-- Seed Istanbul places
INSERT INTO public.places (destination, name, description, type, badges, halal_status, confidence_score, cost_range, area, tags) VALUES
-- Food
('istanbul', 'Sultanahmet Köftecisi', 'Traditional Turkish breakfast with simit, cheese, olives, and çay near the Blue Mosque.', 'food', ARRAY['halal-certified','budget-fit'], 'verified', 95, '$8–12', 'Sultanahmet', ARRAY['Food & Cuisine','History & Culture','budget']),
('istanbul', 'Hafiz Mustafa 1864', 'Ottoman-era dessert house and restaurant with halal-certified Turkish cuisine. Famous for baklava.', 'food', ARRAY['halal-certified','family-friendly','budget-fit'], 'verified', 92, '$15–25', 'Sultanahmet', ARRAY['Food & Cuisine','History & Culture','family']),
('istanbul', 'Fatih Damak Pide', 'Family-friendly halal pide restaurant in the Fatih district, known for traditional Turkish pide.', 'food', ARRAY['halal-certified','family-friendly','no-alcohol'], 'verified', 90, '$10–18', 'Fatih', ARRAY['Food & Cuisine','family','budget']),
('istanbul', 'Sefa Restaurant', 'Authentic Turkish breakfast spread with menemen, cheese varieties, and fresh bread.', 'food', ARRAY['halal-certified','budget-fit'], 'verified', 88, '$6–10', 'Fatih', ARRAY['Food & Cuisine','budget']),
('istanbul', 'Ali Baba Restaurant', 'Traditional kebab restaurant near Süleymaniye with panoramic Golden Horn views.', 'food', ARRAY['halal-certified','no-alcohol','family-friendly'], 'verified', 91, '$12–20', 'Süleymaniye', ARRAY['Food & Cuisine','family']),
('istanbul', 'Çamlıca Hill Café', 'Breakfast with panoramic Istanbul views near the Çamlıca Mosque, Turkeys largest.', 'food', ARRAY['halal-certified','family-friendly'], 'verified', 85, '$8–15', 'Üsküdar', ARRAY['Food & Cuisine','Nature & Parks','family']),
('istanbul', 'Kanaat Lokantası', 'Historic halal lokanta serving traditional Ottoman-style home cooking since 1933.', 'food', ARRAY['halal-certified','no-alcohol','budget-fit'], 'verified', 94, '$8–14', 'Üsküdar', ARRAY['Food & Cuisine','History & Culture','budget']),
('istanbul', 'Develi Restaurant', 'Upscale halal restaurant known for southeastern Turkish cuisine. Award-winning.', 'food', ARRAY['halal-certified','family-friendly','no-alcohol'], 'verified', 93, '$25–45', 'Samatya', ARRAY['Food & Cuisine','family','luxury']),
('istanbul', 'Hamdi Restaurant', 'Rooftop halal restaurant with Golden Horn views and exceptional kebabs.', 'food', ARRAY['halal-certified','no-alcohol','family-friendly'], 'verified', 96, '$20–35', 'Eminönü', ARRAY['Food & Cuisine','family']),
('istanbul', 'Bosphorus Sunset Dinner Cruise', 'Family-friendly dinner cruise with halal menu. Enjoy sunset views of the Bosphorus skyline.', 'food', ARRAY['halal-certified','family-friendly','no-alcohol'], 'muslim-friendly', 78, '$30–50', 'Bosphorus', ARRAY['Food & Cuisine','Nature & Parks','family','luxury']),
('istanbul', 'Pandeli Restaurant', 'Historic restaurant at the entrance of the Spice Bazaar, serving Ottoman cuisine since 1901.', 'food', ARRAY['halal-certified','family-friendly'], 'verified', 87, '$18–30', 'Eminönü', ARRAY['Food & Cuisine','History & Culture']),
('istanbul', 'Çiya Sofrası', 'Renowned for authentic Anatolian cuisine with many unique regional dishes. Fully halal.', 'food', ARRAY['halal-certified','no-alcohol','family-friendly'], 'verified', 91, '$12–22', 'Kadıköy', ARRAY['Food & Cuisine','family']),
('istanbul', 'Nusr-Et Steakhouse', 'Famous Salt Bae restaurant with premium halal steaks and Ottoman decor.', 'food', ARRAY['halal-certified','family-friendly'], 'verified', 88, '$50–120', 'Etiler', ARRAY['Food & Cuisine','luxury']),
-- Activities
('istanbul', 'Hagia Sophia Grand Mosque', 'One of the worlds greatest architectural marvels, now a functioning mosque. Modest dress required.', 'activity', ARRAY['family-friendly','verified'], 'verified', 100, 'Free', 'Sultanahmet', ARRAY['Islamic Heritage','History & Culture','Architecture','Photography','family']),
('istanbul', 'Topkapi Palace & Islamic Relics', 'Home to sacred relics including the Prophets (PBUH) cloak and sword. Sacred Relics section is a must-see.', 'activity', ARRAY['family-friendly','verified'], 'verified', 100, '$15', 'Sultanahmet', ARRAY['Islamic Heritage','History & Culture','Architecture','family']),
('istanbul', 'Grand Bazaar', 'One of the oldest covered markets in the world. Great for souvenirs, Turkish lamps, and spices.', 'activity', ARRAY['family-friendly','budget-fit'], NULL, NULL, 'Free', 'Beyazıt', ARRAY['Shopping','History & Culture','family','kid-friendly']),
('istanbul', 'Süleymaniye Mosque & Complex', 'Masterpiece of Ottoman architect Sinan. Includes mosque, gardens, and the tomb of Sultan Süleyman.', 'activity', ARRAY['prayer-nearby','family-friendly','verified'], 'verified', 100, 'Free', 'Süleymaniye', ARRAY['Islamic Heritage','History & Culture','Architecture','Photography','family']),
('istanbul', 'Chora Church (Kariye Mosque)', 'Recently restored mosque with stunning Byzantine mosaics and frescoes. Unique blend of Islamic and Byzantine art.', 'activity', ARRAY['verified','family-friendly'], 'verified', 95, 'Free', 'Fatih', ARRAY['Islamic Heritage','History & Culture','Architecture']),
('istanbul', 'Spice Bazaar & Eminönü', 'Aromatic spice market with Turkish delights, teas, and local treats. Great for family shopping.', 'activity', ARRAY['family-friendly','kid-friendly','budget-fit'], NULL, NULL, 'Free', 'Eminönü', ARRAY['Shopping','Food & Cuisine','family','kid-friendly']),
('istanbul', 'Çamlıca Mosque', 'Turkeys largest mosque, opened in 2019. Stunning modern Islamic architecture with city-wide views.', 'activity', ARRAY['prayer-nearby','family-friendly','verified'], 'verified', 100, 'Free', 'Üsküdar', ARRAY['Islamic Heritage','Architecture','Photography','family']),
('istanbul', 'Kadıköy Market Walk', 'Vibrant local market with fresh produce, street food, and artisan shops. Great family outing.', 'activity', ARRAY['family-friendly','kid-friendly','budget-fit'], NULL, NULL, 'Free', 'Kadıköy', ARRAY['Shopping','Food & Cuisine','family','kid-friendly']),
('istanbul', 'Maidens Tower (Kız Kulesi)', 'Iconic tower on a small islet in the Bosphorus. Take the boat ride for stunning views.', 'activity', ARRAY['family-friendly'], NULL, 80, '$10', 'Üsküdar', ARRAY['History & Culture','Photography','family']),
('istanbul', 'Istiklal Avenue & Galata Tower', 'Walk down Istanbuls famous pedestrian street. Visit Galata Tower for 360° city views.', 'activity', ARRAY['family-friendly'], NULL, NULL, '$10', 'Beyoğlu', ARRAY['History & Culture','Shopping','Photography','family']),
('istanbul', 'Basilica Cistern', 'Underground cistern with 336 marble columns. Atmospheric and cool on hot days.', 'activity', ARRAY['family-friendly'], NULL, NULL, '$15', 'Sultanahmet', ARRAY['History & Culture','Architecture','Photography']),
('istanbul', 'Dolmabahçe Palace', 'Opulent 19th-century Ottoman palace on the Bosphorus. Stunning European-influenced architecture.', 'activity', ARRAY['family-friendly'], NULL, NULL, '$20', 'Beşiktaş', ARRAY['History & Culture','Architecture','Photography','luxury']),
('istanbul', 'Miniaturk', 'Open-air miniature park with scale models of famous Turkish landmarks. Perfect for kids.', 'activity', ARRAY['family-friendly','kid-friendly'], NULL, NULL, '$5', 'Eyüp', ARRAY['family','kid-friendly','Nature & Parks']),
('istanbul', 'Eyüp Sultan Mosque & Pierre Loti Hill', 'Holy mosque and cable car up to Pierre Loti for Golden Horn views and tea.', 'activity', ARRAY['prayer-nearby','family-friendly','verified'], 'verified', 100, 'Free', 'Eyüp', ARRAY['Islamic Heritage','Nature & Parks','Photography','family']),
('istanbul', 'Istanbul Aquarium', 'Large aquarium with themed zones. Great rainy-day activity for families.', 'activity', ARRAY['family-friendly','kid-friendly'], NULL, NULL, '$15', 'Florya', ARRAY['family','kid-friendly','Nature & Parks']),
('istanbul', 'Princes Islands (Büyükada)', 'Car-free island getaway with horse carriages, beaches, and pine forests. Half-day trip.', 'activity', ARRAY['family-friendly'], NULL, NULL, '$5–10', 'Islands', ARRAY['Nature & Parks','Beaches','Photography','family']),
('istanbul', 'Rumeli Fortress', 'Medieval Ottoman fortress on the Bosphorus built by Mehmed the Conqueror before conquering Constantinople.', 'activity', ARRAY['family-friendly'], NULL, NULL, '$5', 'Sarıyer', ARRAY['Islamic Heritage','History & Culture','Architecture','Photography']),
('istanbul', 'Turkish Bath (Çemberlitaş Hamamı)', 'Historic Ottoman hammam with separate male/female sections. Authentic Turkish bath experience.', 'activity', ARRAY['muslim-friendly'], 'muslim-friendly', 82, '$40–80', 'Sultanahmet', ARRAY['History & Culture','luxury']),
-- Prayer
('istanbul', 'Sultan Ahmed Mosque (Blue Mosque)', 'Start the day with prayer at the iconic Blue Mosque. Prayer rooms available for men and women.', 'prayer', ARRAY['prayer-nearby','family-friendly'], 'verified', 100, 'Free', 'Sultanahmet', ARRAY['Islamic Heritage','prayer','family']),
('istanbul', 'Fatih Mosque', 'Historic mosque in the conservative Fatih district, named after Sultan Mehmed the Conqueror.', 'prayer', ARRAY['prayer-nearby','family-friendly'], 'verified', 100, 'Free', 'Fatih', ARRAY['Islamic Heritage','prayer','family']),
('istanbul', 'Istanbul Airport Prayer Room', 'Prayer room available at Istanbul Airport (IST) for departing travelers.', 'prayer', ARRAY['prayer-nearby'], 'verified', 100, 'Free', 'Airport', ARRAY['prayer']),
-- Transport
('istanbul', 'Istanbul Airport Transfer', 'Allow 1.5–2 hours for airport transfer. Prayer room available at Istanbul Airport (IST).', 'transport', ARRAY['prayer-nearby'], NULL, NULL, '$15–30', 'Airport', ARRAY['transport']),
('istanbul', 'Ferry to Asian Side', 'Take the public ferry from Eminönü to Üsküdar/Kadıköy. Scenic Bosphorus crossing.', 'transport', ARRAY['budget-fit','family-friendly'], NULL, NULL, '$1–2', 'Eminönü', ARRAY['transport','family','budget']),
('istanbul', 'Tram to Sultanahmet', 'T1 tram line connects major tourist areas. Buy an Istanbulkart for easy transit.', 'transport', ARRAY['budget-fit'], NULL, NULL, '$0.50', 'Various', ARRAY['transport','budget']);

-- Seed Istanbul hotels
INSERT INTO public.hotels (destination, name, description, badges, halal_status, confidence_score, price_range, area, tags, star_rating) VALUES
('istanbul', 'Dosso Dossi Hotels Old City', 'Family-friendly hotel in Sultanahmet with halal breakfast, prayer mats in rooms, and Qibla direction.', ARRAY['muslim-friendly','family-friendly','prayer-nearby'], 'muslim-friendly', 85, '$80–150/night', 'Sultanahmet', ARRAY['family','budget','Islamic Heritage'], 4),
('istanbul', 'Hotel & Spa & Convention Center WOW Istanbul', 'Large resort-style hotel with halal dining options, pool with separate hours, and prayer facilities.', ARRAY['halal-certified','family-friendly','prayer-nearby'], 'verified', 90, '$120–200/night', 'Yeşilköy', ARRAY['family','luxury'], 5),
('istanbul', 'Ajwa Hotel Sultanahmet', 'Luxury boutique hotel designed with Ottoman aesthetics. Halal minibar, prayer amenities, no alcohol.', ARRAY['halal-certified','no-alcohol','prayer-nearby','family-friendly'], 'verified', 96, '$200–400/night', 'Sultanahmet', ARRAY['luxury','Islamic Heritage','family'], 5),
('istanbul', 'DoubleTree by Hilton Istanbul Topkapi', 'Modern hotel near historic sites with halal breakfast and prayer room.', ARRAY['muslim-friendly','family-friendly','prayer-nearby'], 'muslim-friendly', 80, '$70–130/night', 'Topkapı', ARRAY['family','budget'], 4),
('istanbul', 'Retaj Royale Istanbul', 'Halal-certified hotel chain with fully halal F&B, separate pool hours, and prayer facilities.', ARRAY['halal-certified','no-alcohol','prayer-nearby','family-friendly'], 'verified', 93, '$100–180/night', 'Fatih', ARRAY['family','Islamic Heritage'], 4);
