import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useItinerary } from "@/lib/itineraryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { destinations, travelerTypes, interests, halalPreferences, paceOptions } from "@/data/dummyData";
import { ArrowLeft, ArrowRight, MapPin, Calendar, Users, Heart, Settings2, Sparkles, Loader2 } from "lucide-react";

const steps = [
  { title: "Destination", icon: MapPin },
  { title: "Trip Details", icon: Calendar },
  { title: "Travelers", icon: Users },
  { title: "Interests", icon: Heart },
  { title: "Preferences", icon: Settings2 },
];

export default function PlanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { generateItinerary, isGenerating, preferences: savedPrefs } = useItinerary();
  const initialStep = Math.min(Number(searchParams.get("step") || 0), 4);
  const [step, setStep] = useState(initialStep);
  const [form, setForm] = useState({
    destination: savedPrefs?.destination || "",
    startDate: savedPrefs?.startDate || "",
    endDate: savedPrefs?.endDate || "",
    travelerType: savedPrefs?.travelerType || "",
    budget: [savedPrefs?.budget || 2000],
    selectedInterests: savedPrefs?.selectedInterests || ([] as string[]),
    selectedPreferences: savedPrefs?.selectedPreferences || ([] as string[]),
    pace: savedPrefs?.pace || "balanced",
    specificNeeds: savedPrefs?.specificNeeds || "",
  });

  const updateForm = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const toggleInterest = (i: string) => {
    setForm((f) => ({
      ...f,
      selectedInterests: f.selectedInterests.includes(i)
        ? f.selectedInterests.filter((x) => x !== i)
        : [...f.selectedInterests, i],
    }));
  };

  const togglePref = (id: string) => {
    setForm((f) => ({
      ...f,
      selectedPreferences: f.selectedPreferences.includes(id)
        ? f.selectedPreferences.filter((x) => x !== id)
        : [...f.selectedPreferences, id],
    }));
  };

  const today = new Date().toISOString().split("T")[0];

  const dateErrors = {
    startDate: form.startDate && form.startDate < today
      ? "Outbound date cannot be before today."
      : "",
    endDate: form.endDate && form.startDate && form.endDate < form.startDate
      ? "Return date cannot be before the outbound date."
      : form.endDate && form.endDate < today
        ? "Return date cannot be before today."
        : "",
  };

  const canNext = () => {
    if (step === 0) return !!form.destination;
    if (step === 1) return !!form.startDate && !!form.endDate && !dateErrors.startDate && !dateErrors.endDate;
    if (step === 2) return !!form.travelerType;
    return true;
  };

  const handleGenerate = async () => {
    const success = await generateItinerary({
      destination: form.destination,
      startDate: form.startDate,
      endDate: form.endDate,
      travelerType: form.travelerType,
      budget: form.budget[0],
      selectedInterests: form.selectedInterests,
      selectedPreferences: form.selectedPreferences,
      pace: form.pace,
      specificNeeds: form.specificNeeds,
    });
    if (success) {
      navigate("/itinerary");
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={s.title} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                i < step ? "bg-primary text-primary-foreground" :
                i === step ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" :
                "bg-muted text-muted-foreground"
              }`}>
                <s.icon className="w-4 h-4" />
              </div>
              {i < steps.length - 1 && (
                <div className={`hidden md:block w-12 h-0.5 ${i < step ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <h2 className="text-2xl font-display font-bold mb-1">{steps[step].title}</h2>
          <p className="text-muted-foreground text-sm mb-6">
            {step === 0 && "Where would you like to go?"}
            {step === 1 && "When are you traveling and what's your budget?"}
            {step === 2 && "Who's joining the trip?"}
            {step === 3 && "What are you most excited about?"}
            {step === 4 && "Customize your halal travel preferences."}
          </p>

          {/* Step 0: Destination */}
          {step === 0 && (
            <div className="space-y-4">
              <Label>Choose a destination</Label>
              <Select value={form.destination} onValueChange={(v) => updateForm("destination", v)}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent>
                  {destinations.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 1: Dates & Budget */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Outbound Date</Label>
                  <Input type="date" min={today} value={form.startDate} onChange={(e) => updateForm("startDate", e.target.value)} className="h-12 mt-1" />
                  {dateErrors.startDate && <p className="text-destructive text-xs mt-1">{dateErrors.startDate}</p>}
                </div>
                <div>
                  <Label>Return Date</Label>
                  <Input type="date" min={form.startDate || today} value={form.endDate} onChange={(e) => updateForm("endDate", e.target.value)} className="h-12 mt-1" />
                  {dateErrors.endDate && <p className="text-destructive text-xs mt-1">{dateErrors.endDate}</p>}
                </div>
              </div>
              <div>
                <Label>Trip Budget: ${form.budget[0].toLocaleString()}</Label>
                <Slider value={form.budget} onValueChange={(v) => updateForm("budget", v)} min={100} max={10000} step={100} className="mt-3" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>$100</span><span>$10,000</span>
                </div>
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground">Or enter amount</Label>
                  <Input
                    type="number"
                    min={100}
                    max={10000}
                    value={form.budget[0]}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) updateForm("budget", [val]);
                    }}
                    onBlur={() => {
                      const clamped = Math.max(100, Math.min(10000, form.budget[0] || 100));
                      updateForm("budget", [clamped]);
                    }}
                    className="h-10 mt-1 w-40"
                    placeholder="$2,000"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Traveler Type */}
          {step === 2 && (
            <div className="grid grid-cols-3 gap-4">
              {travelerTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => updateForm("travelerType", t.value)}
                  className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all ${
                    form.travelerType === t.value
                      ? "border-primary bg-emerald-light shadow-md"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span className="text-3xl">{t.icon}</span>
                  <span className="text-sm font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Interests */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {interests.map((i) => (
                  <button
                    key={i}
                    onClick={() => toggleInterest(i)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      form.selectedInterests.includes(i)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div>
                <Label className="mb-2 block">Travel Pace</Label>
                <div className="grid grid-cols-3 gap-3">
                  {paceOptions.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => updateForm("pace", p.value)}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        form.pace === p.value
                          ? "border-primary bg-emerald-light"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="text-sm font-semibold">{p.label}</div>
                      <div className="text-xs text-muted-foreground">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Halal Preferences */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {halalPreferences.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      form.selectedPreferences.includes(p.id)
                        ? "border-primary bg-emerald-light"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Checkbox
                      checked={form.selectedPreferences.includes(p.id)}
                      onCheckedChange={() => togglePref(p.id)}
                    />
                    <span className="text-sm font-medium">{p.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <Label>Any specific needs?</Label>
                <Textarea
                  value={form.specificNeeds}
                  onChange={(e) => updateForm("specificNeeds", e.target.value)}
                  placeholder="e.g. Must include a visit to the Blue Mosque, need wheelchair accessibility..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : navigate("/")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> {step === 0 ? "Home" : "Back"}
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-2 bg-primary text-primary-foreground">
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="gap-2 bg-gold hover:bg-gold/90 text-navy font-semibold"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generate Itinerary
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Loading overlay */}
        {isGenerating && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-card rounded-2xl border border-border p-8 max-w-md text-center shadow-xl">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">Creating Your Itinerary</h3>
              <p className="text-muted-foreground text-sm mb-4">
                MINARA is searching our halal-verified database and crafting your personalized travel plan...
              </p>
              <div className="flex items-center justify-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
