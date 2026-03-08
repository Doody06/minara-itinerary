import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "What does 'halal-friendly' mean in MINARA?", a: "We use transparent confidence levels. 'Verified Halal' means the place has certification. 'Muslim-Friendly' means it's widely recommended by Muslim travelers. 'Needs Check' means we suggest confirming halal status yourself." },
  { q: "How does the AI generate itineraries?", a: "Our AI considers your destination, budget, traveler type, interests, and halal preferences to create a personalized day-by-day plan with verified halal dining, prayer-aware scheduling, and family-friendly activities." },
  { q: "Which destinations are supported?", a: "Currently Istanbul, Kuala Lumpur, Dubai, London, and Tokyo. We're expanding to more destinations soon." },
  { q: "Can I customize the generated itinerary?", a: "Yes! You can use quick-edit buttons to adjust for more Islamic sites, kid-friendly activities, budget options, or regenerate entire days." },
  { q: "Is this app free?", a: "The basic itinerary generation is free. Premium features like verified restaurant details and downloadable PDF itineraries will be available soon." },
  { q: "How accurate are the halal ratings?", a: "Each place has a confidence score (0-100%) based on available data from Muslim travel platforms, local community reports, and official certifications. We always recommend verifying critical dietary requirements in person." },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl font-display font-bold text-center mb-2">Frequently Asked Questions</h1>
        <p className="text-muted-foreground text-center mb-8">Everything you need to know about MINARA.</p>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-xl border border-border px-5">
              <AccordionTrigger className="text-left font-medium">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
