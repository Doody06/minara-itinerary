import { Badge as BadgeType } from "@/data/dummyData";
import { Shield, Utensils, MapPin, Users, Baby, DollarSign, CheckCircle, Wine } from "lucide-react";

const badgeConfig: Record<BadgeType, { label: string; icon: React.ElementType; className: string }> = {
  "halal-certified": { label: "Halal Certified", icon: Shield, className: "bg-emerald-light text-emerald border-emerald/20" },
  "muslim-friendly": { label: "Muslim-Friendly", icon: CheckCircle, className: "bg-emerald-light text-emerald border-emerald/20" },
  "no-alcohol": { label: "No Alcohol", icon: Wine, className: "bg-gold-light text-gold border-gold/20" },
  "prayer-nearby": { label: "Prayer Nearby", icon: MapPin, className: "bg-emerald-light text-emerald border-emerald/20" },
  "family-friendly": { label: "Family-Friendly", icon: Users, className: "bg-secondary text-secondary-foreground border-secondary" },
  "kid-friendly": { label: "Kid-Friendly", icon: Baby, className: "bg-secondary text-secondary-foreground border-secondary" },
  "budget-fit": { label: "Budget Fit", icon: DollarSign, className: "bg-gold-light text-gold border-gold/20" },
  "verified": { label: "Verified", icon: Shield, className: "bg-emerald-light text-emerald border-emerald/20" },
};

export function HalalBadge({ badge }: { badge: BadgeType }) {
  const config = badgeConfig[badge];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export function ConfidenceIndicator({ score }: { score: number }) {
  const color = score >= 90 ? "text-emerald bg-emerald-light" : score >= 70 ? "text-gold bg-gold-light" : "text-muted-foreground bg-muted";
  const label = score >= 90 ? "High Confidence" : score >= 70 ? "Moderate" : "Needs Check";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {score}% — {label}
    </span>
  );
}
