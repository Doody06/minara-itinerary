import { useEffect, useState } from "react";
import { UtensilsCrossed, MapPin, Route, Hotel, Camera, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { icon: UtensilsCrossed, text: "Searching halal-certified restaurants..." },
  { icon: MapPin, text: "Locating nearby mosques & prayer rooms..." },
  { icon: Route, text: "Finding prayer-friendly routes..." },
  { icon: Hotel, text: "Checking halal hotel options..." },
  { icon: Camera, text: "Discovering top attractions..." },
  { icon: Clock, text: "Optimizing your daily schedule..." },
  { icon: ShieldCheck, text: "Verifying halal compliance scores..." },
  { icon: Sparkles, text: "Finalizing your personalized itinerary..." },
];

const STEP_INTERVAL = 3500;

export default function GeneratingOverlay() {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((s) => (s + 1) % STEPS.length);
      setFadeKey((k) => k + 1);
    }, STEP_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const progressValue = Math.min(((currentStep + 1) / STEPS.length) * 100, 95);
  const StepIcon = STEPS[currentStep].icon;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center">
      <div className="max-w-md w-full mx-4 text-center space-y-8">
        {/* Animated icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center" key={fadeKey}>
            <StepIcon className="w-10 h-10 text-primary animate-fade-in" />
          </div>
        </div>

        {/* Step text */}
        <div key={`text-${fadeKey}`} className="animate-fade-in">
          <h3 className="text-2xl font-display font-bold text-foreground mb-2">
            Crafting Your Journey
          </h3>
          <p className="text-muted-foreground font-body text-base">
            {STEPS[currentStep].text}
          </p>
        </div>

        {/* Circular spinner */}
        <div className="flex justify-center">
          <svg className="w-10 h-10 animate-spin" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="17" stroke="hsl(var(--muted))" strokeWidth="3" />
            <path
              d="M20 3a17 17 0 0 1 17 17"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Hint */}
        <p className="text-xs text-muted-foreground/70">
          This may take up to a minute for longer trips
        </p>
      </div>
    </div>
  );
}
