import { cn } from "@/lib/utils";

type StatusVariant = 'paid' | 'pending' | 'cancelled' | 'overdue' | 'active' | 'inactive' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'free' | 'busy' | 'reserved' | 'cleaning' | 'cooking' | 'ready' | 'served';

const variantStyles: Record<StatusVariant, string> = {
  paid: 'bg-success/10 text-success',
  active: 'bg-success/10 text-success',
  'in-stock': 'bg-success/10 text-success',
  free: 'bg-success/10 text-success',
  ready: 'bg-success/10 text-success',
  served: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  'low-stock': 'bg-warning/10 text-warning',
  busy: 'bg-warning/10 text-warning',
  cooking: 'bg-warning/10 text-warning',
  cancelled: 'bg-muted text-muted-foreground',
  inactive: 'bg-muted text-muted-foreground',
  reserved: 'bg-muted text-muted-foreground',
  overdue: 'bg-destructive/10 text-destructive',
  'out-of-stock': 'bg-destructive/10 text-destructive',
  cleaning: 'bg-info/10 text-info',
};

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
  className?: string;
}

const StatusBadge = ({ variant, label, className }: StatusBadgeProps) => (
  <span className={cn(
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize",
    variantStyles[variant],
    className
  )}>
    {label || variant.replace('-', ' ')}
  </span>
);

export default StatusBadge;
