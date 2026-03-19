export type HalalStatus = "verified" | "muslim-friendly" | "needs-check";
export type Badge = "halal-certified" | "muslim-friendly" | "no-alcohol" | "prayer-nearby" | "family-friendly" | "kid-friendly" | "budget-fit" | "verified";

export interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  description: string;
  type: "activity" | "food" | "prayer" | "transport" | "hotel";
  badges: Badge[];
  halalStatus?: HalalStatus;
  confidenceScore?: number;
  explanation?: string;
  cost?: string;
  latitude?: number;
  longitude?: number;
}

export interface DayPlan {
  day: number;
  title: string;
  items: ItineraryItem[];
}

export const destinations = [
  { value: "istanbul", label: "Istanbul, Turkey", country: "Turkey" },
  { value: "kuala-lumpur", label: "Kuala Lumpur, Malaysia", country: "Malaysia" },
  { value: "dubai", label: "Dubai, UAE", country: "UAE" },
  { value: "london", label: "London, UK", country: "United Kingdom" },
  { value: "tokyo", label: "Tokyo, Japan", country: "Japan" },
];

export const travelerTypes = [
  { value: "solo", label: "Solo Traveler", icon: "🧳" },
  { value: "couple", label: "Couple", icon: "👫" },
  { value: "family", label: "Family with Kids", icon: "👨‍👩‍👧‍👦" },
];

export const interests = [
  "Islamic Heritage", "History & Culture", "Nature & Parks", "Beaches",
  "Shopping", "Adventure", "Food & Cuisine", "Architecture", "Photography",
];

export const halalPreferences = [
  { id: "halal-food", label: "Halal Restaurants Only" },
  { id: "prayer-area", label: "Prayer Areas Nearby" },
  { id: "no-alcohol", label: "No Alcohol Venues" },
  { id: "islamic-sites", label: "Islamic Sites" },
  { id: "private-spots", label: "Private / Modest Spots" },
  { id: "family-friendly", label: "Family-Friendly Activities" },
];

export const paceOptions = [
  { value: "relaxed", label: "Relaxed", desc: "Fewer activities, more rest" },
  { value: "balanced", label: "Balanced", desc: "Mix of activity and leisure" },
  { value: "packed", label: "Packed", desc: "Maximum sightseeing" },
];

export const dummyItinerary: DayPlan[] = [
  {
    day: 1,
    title: "Sultanahmet — Islamic Heritage & Old City",
    items: [
      {
        id: "1-1",
        time: "8:00 – 9:00 AM",
        title: "Breakfast at Sultanahmet Köftecisi",
        description: "Traditional Turkish breakfast with simit, cheese, olives, and çay near the Blue Mosque.",
        type: "food",
        badges: ["halal-certified", "budget-fit"],
        halalStatus: "verified",
        confidenceScore: 95,
        explanation: "Long-established halal restaurant in Sultanahmet, verified by local Muslim community.",
        cost: "$8–12",
      },
      {
        id: "1-2",
        time: "9:00 AM",
        title: "Fajr / Dhuhr Prayer at Sultan Ahmed Mosque",
        description: "Start the day with prayer at the iconic Blue Mosque. Prayer rooms available for men and women.",
        type: "prayer",
        badges: ["prayer-nearby", "family-friendly"],
      },
      {
        id: "1-3",
        time: "9:30 – 12:00 PM",
        title: "Hagia Sophia Grand Mosque",
        description: "Explore one of the world's greatest architectural marvels, now a functioning mosque. Modest dress required.",
        type: "activity",
        badges: ["family-friendly", "verified"],
        halalStatus: "verified",
        confidenceScore: 100,
        explanation: "UNESCO World Heritage site and active mosque. Fully Muslim-friendly.",
      },
      {
        id: "1-4",
        time: "12:30 – 2:00 PM",
        title: "Lunch at Hafiz Mustafa 1864",
        description: "Ottoman-era dessert house and restaurant with halal-certified Turkish cuisine. Try their baklava.",
        type: "food",
        badges: ["halal-certified", "family-friendly", "budget-fit"],
        halalStatus: "verified",
        confidenceScore: 92,
        explanation: "Historic halal restaurant, consistently recommended by Muslim travel platforms.",
        cost: "$15–25",
      },
      {
        id: "1-5",
        time: "2:30 – 4:30 PM",
        title: "Topkapi Palace & Islamic Relics",
        description: "Home to sacred relics including the Prophet's (PBUH) cloak and sword. The Sacred Relics section is a must-see.",
        type: "activity",
        badges: ["family-friendly", "verified"],
        halalStatus: "verified",
        confidenceScore: 100,
        explanation: "Major Islamic heritage site with verified sacred relics collection.",
      },
      {
        id: "1-6",
        time: "5:00 – 6:00 PM",
        title: "Grand Bazaar Shopping",
        description: "One of the oldest covered markets in the world. Great for souvenirs, Turkish lamps, and spices.",
        type: "activity",
        badges: ["family-friendly", "budget-fit"],
      },
      {
        id: "1-7",
        time: "7:00 – 8:30 PM",
        title: "Dinner at Fatih Damak Pide",
        description: "Family-friendly halal pide restaurant in the Fatih district, known for traditional Turkish pide.",
        type: "food",
        badges: ["halal-certified", "family-friendly", "no-alcohol"],
        halalStatus: "verified",
        confidenceScore: 90,
        explanation: "Located in the conservative Fatih district, entirely halal and family-oriented.",
        cost: "$10–18",
      },
    ],
  },
  {
    day: 2,
    title: "Fatih & Süleymaniye — Culture & Cuisine",
    items: [
      {
        id: "2-1",
        time: "8:00 – 9:30 AM",
        title: "Breakfast at Sefa Restaurant",
        description: "Authentic Turkish breakfast spread with menemen, cheese varieties, and fresh bread.",
        type: "food",
        badges: ["halal-certified", "budget-fit"],
        halalStatus: "verified",
        confidenceScore: 88,
        cost: "$6–10",
      },
      {
        id: "2-2",
        time: "10:00 – 12:00 PM",
        title: "Süleymaniye Mosque & Complex",
        description: "Masterpiece of Ottoman architect Sinan. Includes mosque, gardens, and the tomb of Sultan Süleyman.",
        type: "activity",
        badges: ["prayer-nearby", "family-friendly", "verified"],
        halalStatus: "verified",
        confidenceScore: 100,
      },
      {
        id: "2-3",
        time: "12:30 – 2:00 PM",
        title: "Lunch at Ali Baba Restaurant",
        description: "Traditional kebab restaurant near Süleymaniye with panoramic Golden Horn views.",
        type: "food",
        badges: ["halal-certified", "no-alcohol", "family-friendly"],
        halalStatus: "verified",
        confidenceScore: 91,
        cost: "$12–20",
      },
      {
        id: "2-4",
        time: "2:30 – 4:00 PM",
        title: "Chora Church (Kariye Mosque)",
        description: "Recently restored mosque with stunning Byzantine mosaics and frescoes. A unique blend of Islamic and Byzantine art.",
        type: "activity",
        badges: ["verified", "family-friendly"],
        halalStatus: "verified",
        confidenceScore: 95,
      },
      {
        id: "2-5",
        time: "4:30 – 6:00 PM",
        title: "Spice Bazaar & Eminönü",
        description: "Aromatic spice market with Turkish delights, teas, and local treats. Great for family shopping.",
        type: "activity",
        badges: ["family-friendly", "kid-friendly", "budget-fit"],
      },
      {
        id: "2-6",
        time: "6:30 – 8:00 PM",
        title: "Bosphorus Sunset Dinner Cruise",
        description: "Family-friendly dinner cruise with halal menu. Enjoy sunset views of the Bosphorus skyline.",
        type: "food",
        badges: ["halal-certified", "family-friendly", "no-alcohol"],
        halalStatus: "muslim-friendly",
        confidenceScore: 78,
        explanation: "Halal menu option available on request. Confirm no-alcohol policy when booking.",
        cost: "$30–50",
      },
    ],
  },
  {
    day: 3,
    title: "Asian Side — Local Life & Serenity",
    items: [
      {
        id: "3-1",
        time: "8:30 – 10:00 AM",
        title: "Breakfast at Çamlıca Hill Café",
        description: "Breakfast with panoramic Istanbul views near the new Çamlıca Mosque, Turkey's largest.",
        type: "food",
        badges: ["halal-certified", "family-friendly"],
        halalStatus: "verified",
        confidenceScore: 85,
        cost: "$8–15",
      },
      {
        id: "3-2",
        time: "10:00 – 11:30 AM",
        title: "Çamlıca Mosque",
        description: "Turkey's largest mosque, opened in 2019. Stunning modern Islamic architecture with city-wide views.",
        type: "activity",
        badges: ["prayer-nearby", "family-friendly", "verified"],
        halalStatus: "verified",
        confidenceScore: 100,
      },
      {
        id: "3-3",
        time: "12:00 – 1:30 PM",
        title: "Lunch at Kanaat Lokantası, Üsküdar",
        description: "Historic halal lokanta (eatery) serving traditional Ottoman-style home cooking since 1933.",
        type: "food",
        badges: ["halal-certified", "no-alcohol", "budget-fit"],
        halalStatus: "verified",
        confidenceScore: 94,
        explanation: "Established halal lokanta in conservative Üsküdar, verified for decades.",
        cost: "$8–14",
      },
      {
        id: "3-4",
        time: "2:00 – 4:00 PM",
        title: "Kadıköy Market Walk",
        description: "Vibrant local market with fresh produce, street food, and artisan shops. Great family outing.",
        type: "activity",
        badges: ["family-friendly", "kid-friendly", "budget-fit"],
      },
      {
        id: "3-5",
        time: "4:30 – 5:30 PM",
        title: "Maiden's Tower (Kız Kulesi)",
        description: "Iconic tower on a small islet in the Bosphorus. Take the boat ride for stunning views.",
        type: "activity",
        badges: ["family-friendly"],
        confidenceScore: 80,
      },
      {
        id: "3-6",
        time: "6:30 – 8:30 PM",
        title: "Farewell Dinner at Develi Restaurant",
        description: "Upscale halal restaurant known for southeastern Turkish cuisine. Perfect farewell dinner spot.",
        type: "food",
        badges: ["halal-certified", "family-friendly", "no-alcohol"],
        halalStatus: "verified",
        confidenceScore: 93,
        explanation: "Award-winning halal restaurant, highly rated on CrescentRating and Muslim travel guides.",
        cost: "$25–45",
      },
    ],
  },
  {
    day: 4,
    title: "Beyoğlu & Departure",
    items: [
      {
        id: "4-1",
        time: "8:00 – 9:30 AM",
        title: "Breakfast at Hotel",
        description: "Enjoy the hotel's halal breakfast buffet before checking out.",
        type: "food",
        badges: ["halal-certified"],
        halalStatus: "muslim-friendly",
        confidenceScore: 80,
        cost: "Included",
      },
      {
        id: "4-2",
        time: "10:00 – 12:00 PM",
        title: "Istiklal Avenue & Galata Tower",
        description: "Walk down Istanbul's famous pedestrian street. Visit Galata Tower for 360° city views.",
        type: "activity",
        badges: ["family-friendly"],
      },
      {
        id: "4-3",
        time: "12:30 – 1:30 PM",
        title: "Lunch at Hamdi Restaurant",
        description: "Rooftop halal restaurant with Golden Horn views and exceptional kebabs.",
        type: "food",
        badges: ["halal-certified", "no-alcohol", "family-friendly"],
        halalStatus: "verified",
        confidenceScore: 96,
        explanation: "Premium halal restaurant highly recommended by Muslim travel platforms worldwide.",
        cost: "$20–35",
      },
      {
        id: "4-4",
        time: "2:00 PM",
        title: "Transfer to Istanbul Airport",
        description: "Allow 1.5–2 hours for airport transfer. Prayer room available at Istanbul Airport (IST).",
        type: "transport",
        badges: ["prayer-nearby"],
      },
    ],
  },
];

export const hotelSuggestion = {
  name: "Dosso Dossi Hotels Old City",
  description: "Family-friendly hotel in Sultanahmet with halal breakfast, prayer mats in rooms, and Qibla direction.",
  badges: ["muslim-friendly", "family-friendly", "prayer-nearby"] as Badge[],
  halalStatus: "muslim-friendly" as HalalStatus,
  confidenceScore: 85,
  priceRange: "$80–150/night",
};
