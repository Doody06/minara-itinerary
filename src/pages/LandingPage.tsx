import { Link } from "react-router-dom";
import { ArrowRight, Shield, MapPin, Users, Utensils, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-istanbul.jpg";

const features = [
  { icon: Utensils, title: "Halal Dining", desc: "Verified halal restaurants with confidence scores and trust badges." },
  { icon: MapPin, title: "Prayer-Aware", desc: "Prayer times integrated into your schedule with nearby mosque suggestions." },
  { icon: Users, title: "Family Mode", desc: "Kid-friendly activities, family pacing, and modest-environment filtering." },
  { icon: Shield, title: "Trust Badges", desc: "Transparent halal confidence levels — verified, Muslim-friendly, or needs check." },
];

const stats = [
  { value: "176M+", label: "Muslim travelers globally" },
  { value: "5", label: "Destinations available" },
  { value: "100%", label: "Personalized itineraries" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Istanbul skyline at golden hour" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-navy/50 to-navy/80" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary-foreground text-sm mb-6">
            <Star className="w-4 h-4 text-gold" />
            AI-Powered Halal Travel Concierge
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-primary-foreground mb-4 tracking-tight">
            <span className="text-gold">MINARA</span>
          </h1>
          <p className="text-xl md:text-2xl text-primary-foreground/80 font-body mb-8 max-w-xl mx-auto">
            Plan your halal-friendly trip in minutes with personalized itineraries, verified dining, and prayer-aware scheduling.
          </p>
          <Link to="/plan">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-full shadow-lg shadow-primary/25 gap-2">
              Start Planning <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-card py-12 border-b border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-center gap-12 px-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-display font-bold text-primary">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
            Travel with <span className="text-primary">confidence</span>
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
            Every recommendation is filtered through halal needs, family preferences, and your faith-conscious priorities.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-card rounded-xl p-6 border border-border hover:shadow-lg hover:border-primary/20 transition-all group">
                <div className="w-12 h-12 rounded-lg bg-emerald-light flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <f.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-navy">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-navy-foreground mb-4">
            Ready to plan your next trip?
          </h2>
          <p className="text-navy-foreground/70 mb-8 max-w-md mx-auto">
            Join thousands of Muslim travelers who plan smarter, not harder.
          </p>
          <Link to="/plan">
            <Button size="lg" className="bg-gold hover:bg-gold/90 text-navy text-lg px-8 py-6 rounded-full font-semibold gap-2">
              Get Your Itinerary <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 MINARA. AI-generated halal-friendly itineraries with transparent confidence levels.
        </div>
      </footer>
    </div>
  );
}
