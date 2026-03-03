import { statusConfig, type TableStatus } from '@/data/tables';

export default function StatusLegend() {
  const visibleStatuses: TableStatus[] = ['available', 'occupied'];

  return (
    <div className="flex flex-wrap gap-2">
      {visibleStatuses.map((s) => (
        <div key={s} className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-white/70 px-2.5 py-1 text-xs text-muted-foreground">
          <span className={`h-2.5 w-2.5 rounded-full ${statusConfig[s].dotClass}`} />
          {statusConfig[s].label}
        </div>
      ))}
    </div>
  );
}