import { type TableData } from '@/data/tables';
import TableCard from './TableCard';
import StatusLegend from './StatusLegend';

interface Props {
  tables: TableData[];
  onTableClick: (table: TableData) => void;
}

export default function TableMapView({ tables, onTableClick }: Props) {
  const occupied = tables.filter((t) => t.status === 'occupied');
  const available = tables.filter((t) => t.status === 'available');
  const others = tables.filter((t) => t.status !== 'occupied' && t.status !== 'available');

  const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0);
  const usedSeats = tables.reduce((sum, t) => sum + t.guests, 0);
  const occupancyRate = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;

  const byNumber = (a: TableData, b: TableData) => a.number - b.number;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-white via-primary/10 to-warning/10 p-4 shadow-sm sm:p-5">
      <div className="pointer-events-none absolute -top-20 -right-14 h-48 w-48 rounded-full bg-warning/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.08),transparent_40%)]" />

      <div className="relative mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Live Floor Plan</h2>
          <p className="text-xs text-muted-foreground">Real-time seat and token visibility for active tables</p>
        </div>
        <StatusLegend />
      </div>

      <div className="relative mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-white to-primary/10 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tables</p>
          <p className="text-lg font-semibold text-foreground">{tables.length}</p>
        </div>
        <div className="rounded-xl border border-warning/30 bg-gradient-to-br from-white to-warning/15 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Occupied</p>
          <p className="text-lg font-semibold text-warning">{occupied.length}</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-white to-primary/10 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Available</p>
          <p className="text-lg font-semibold text-foreground">{available.length}</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-white to-primary/10 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Seat Occupancy</p>
          <p className="text-lg font-semibold text-foreground">{occupancyRate}%</p>
        </div>
      </div>

      <div className="space-y-5">
        {occupied.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-warning">Occupied Zone</h3>
              <span className="text-xs text-muted-foreground">{occupied.length} tables</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {occupied.sort(byNumber).map((t) => (
                <TableCard key={t.id} table={t} onClick={() => onTableClick(t)} />
              ))}
            </div>
          </section>
        )}

        {available.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">Available Zone</h3>
              <span className="text-xs text-muted-foreground">{available.length} tables</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {available.sort(byNumber).map((t) => (
                <TableCard key={t.id} table={t} onClick={() => onTableClick(t)} />
              ))}
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Other Status</h3>
              <span className="text-xs text-muted-foreground">{others.length} tables</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {others.sort(byNumber).map((t) => (
                <TableCard key={t.id} table={t} onClick={() => onTableClick(t)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}