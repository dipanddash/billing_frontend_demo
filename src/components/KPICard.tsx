import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}

const KPICard = ({ title, value, subtitle, icon, trend, className }: KPICardProps) => (
  <div className={cn(
    "bg-card rounded-lg p-3 shadow-soft transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 border border-border",
    className
  )}>
    <div className="flex items-start justify-between mb-2">
      <div className="p-1.5 rounded-md bg-accent">
        <span className="text-accent-foreground">{icon}</span>
      </div>
      {trend && (
        <span className={cn(
          "text-xs font-medium px-1.5 py-0.5 rounded-full",
          trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        )}>
          {trend.positive ? '↑' : '↓'} {trend.value}
        </span>
      )}
    </div>
    <p className="text-sm text-muted-foreground font-medium">{title}</p>
    <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
    {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
  </div>
);

export default KPICard;
