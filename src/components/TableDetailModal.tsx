import { type TableData, type TableStatus, statusConfig } from '@/data/tables';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, ShoppingBag, Ticket, UserRound, Users, X } from 'lucide-react';

interface Props {
  table: TableData | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (tableId: string, status: TableStatus) => void;
}

export default function TableDetailModal({ table, open, onClose, onStatusChange }: Props) {
  if (!table) return null;
  const cfg = statusConfig[table.status];
  const statusBadgeClass =
    table.status === 'occupied'
      ? 'bg-warning/20 text-warning border-warning/40'
      : 'bg-primary/15 text-foreground border-primary/30';
  void onStatusChange;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-h-[80vh] overflow-y-auto border-primary/25 bg-gradient-to-br from-white via-primary/10 to-warning/10 sm:max-w-md [&::-webkit-scrollbar]:hidden [&>button]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <DialogClose className="absolute right-2 top-2 z-20 border-0 bg-transparent p-0 text-muted-foreground shadow-none outline-none ring-0 hover:bg-transparent hover:text-foreground focus:outline-none focus:ring-0 focus-visible:ring-0">
          <X className="h-3 w-3" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="pointer-events-none absolute -top-20 -right-10 h-44 w-44 rounded-full bg-warning/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />

        <DialogHeader className="relative pr-10">
          <DialogTitle className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Table Details</p>
              <span className="text-xl font-semibold text-foreground">T-{table.number}</span>
            </div>
            <Badge variant="secondary" className={`gap-1.5 border ${statusBadgeClass}`}>
              <span className={`h-2 w-2 rounded-full ${cfg.dotClass}`} />
              {cfg.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="relative mt-2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-primary/20 bg-white/85 p-3">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Guests</span>
              <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-foreground">
                <Users className="h-4 w-4 text-muted-foreground" />
                {table.guests}/{table.capacity}
              </p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-white/85 p-3">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Duration</span>
              <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {table.duration > 0 ? `${table.duration}m` : '-'}
              </p>
            </div>
          </div>

          {table.customerName && (
            <div className="rounded-xl border border-primary/20 bg-white/85 p-3">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Customer</span>
              <p className="mt-1 flex items-center gap-1 text-sm font-medium text-foreground">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{table.customerName}</span>
              </p>
            </div>
          )}

          {table.status === 'occupied' && table.tokenNumber && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-3">
              <span className="text-[11px] uppercase tracking-wide text-warning/90">Token No</span>
              <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-foreground">
                <Ticket className="h-4 w-4 text-warning" />
                {table.tokenNumber}
              </p>
            </div>
          )}

        </div>

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="h-8 px-3 text-xs">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
