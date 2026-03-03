import { Users, Clock, ShoppingBag, Ticket, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { type TableData, statusConfig } from '@/data/tables';
import { Progress } from '@/components/ui/progress';

interface Props {
  table: TableData;
  onClick: () => void;
}

export default function TableCard({ table, onClick }: Props) {
  const cfg = statusConfig[table.status];
  const statusLabelClass = table.status === 'occupied'
    ? 'bg-warning/20 text-warning border-warning/40'
    : 'bg-secondary text-foreground border-border';
  const cardTintClass = table.status === 'occupied'
    ? 'from-warning/15 to-white'
    : table.status === 'available'
      ? 'from-primary/15 to-white'
      : 'from-muted/40 to-white';

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative w-full overflow-hidden rounded-xl border ${cfg.borderClass} bg-gradient-to-br ${cardTintClass} p-4 text-left transition-all hover:shadow-md`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-16 w-16 rounded-full bg-primary/15 blur-2xl" />
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Table</p>
          <p className="text-base font-semibold text-foreground">T-{table.number}</p>
        </div>
        <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium ${statusLabelClass}`}>
          <span className={`h-2 w-2 rounded-full ${cfg.dotClass}`} />
          {cfg.label}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-primary/15 bg-white/85 px-2 py-1.5">
          <p className="text-[11px] text-muted-foreground">Guests</p>
          <p className="flex items-center gap-1 text-xs font-medium text-foreground">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            {table.guests}/{table.capacity}
          </p>
        </div>
        <div className="rounded-lg border border-primary/15 bg-white/85 px-2 py-1.5">
          <p className="text-[11px] text-muted-foreground">Duration</p>
          <p className="flex items-center gap-1 text-xs font-medium text-foreground">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {table.duration > 0 ? `${table.duration}m` : '-'}
          </p>
        </div>
      </div>

      {table.status === 'occupied' && table.tokenNumber && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-warning/30 bg-warning/10 px-2 py-1.5 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Ticket className="h-3.5 w-3.5" />
            Token
          </span>
          <span className="font-semibold text-foreground">{table.tokenNumber}</span>
        </div>
      )}

      {table.customerName && (
        <p className="mb-2 flex items-center gap-1 text-xs font-medium text-foreground">
          <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate">{table.customerName}</span>
        </p>
      )}

      {table.order && (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <ShoppingBag className="h-3.5 w-3.5" />
              {table.order.id}
            </span>
            <span className="font-medium text-foreground">${table.order.total.toFixed(2)}</span>
          </div>
          <Progress value={table.order.progress} className="h-1.5" />
        </div>
      )}
    </motion.button>
  );
}