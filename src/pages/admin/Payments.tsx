import StatusBadge from '@/components/StatusBadge';
import KPICard from '@/components/KPICard';
import { DollarSign, Clock, Search, Filter } from 'lucide-react';
import { useState } from 'react';

const payments = [
  { id: 'PAY-001', invoice: 'INV-001', method: 'Card', amount: '$1,250.00', status: 'paid' as const, date: '2026-02-15' },
  { id: 'PAY-002', invoice: 'INV-004', method: 'Cash', amount: '$560.00', status: 'paid' as const, date: '2026-02-14' },
  { id: 'PAY-003', invoice: 'INV-007', method: 'UPI', amount: '$3,200.00', status: 'paid' as const, date: '2026-02-13' },
  { id: 'PAY-004', invoice: 'INV-002', method: 'Bank', amount: '$840.00', status: 'pending' as const, date: '2026-02-12' },
  { id: 'PAY-005', invoice: 'INV-006', method: 'Card', amount: '$420.00', status: 'pending' as const, date: '2026-02-11' },
  { id: 'PAY-006', invoice: 'INV-008', method: 'Cash', amount: '$780.00', status: 'paid' as const, date: '2026-02-10' },
];

const Payments = () => {
  const [search, setSearch] = useState('');
  const filtered = payments.filter(p => p.id.toLowerCase().includes(search.toLowerCase()) || p.invoice.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-[24px] animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Payments</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <KPICard title="Total Received" value="$6,210" icon={<DollarSign className="w-5 h-5" />} trend={{ value: '8%', positive: true }} />
        <KPICard title="Pending Payments" value="$1,260" icon={<Clock className="w-5 h-5" />} trend={{ value: '2', positive: false }} />
      </div>

      <div className="relative max-w-sm">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments..." className="w-full pl-[36px] pr-[16px] py-[10px] rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="bg-card rounded-lg shadow-soft border border-border overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-secondary/50">
            <th className="text-left px-[24px] py-[12px] text-xs font-semibold text-muted-foreground uppercase">Payment ID</th>
            <th className="text-left px-[24px] py-[12px] text-xs font-semibold text-muted-foreground uppercase">Invoice</th>
            <th className="text-left px-[24px] py-[12px] text-xs font-semibold text-muted-foreground uppercase">Method</th>
            <th className="text-left px-[24px] py-[12px] text-xs font-semibold text-muted-foreground uppercase">Amount</th>
            <th className="text-left px-[24px] py-[12px] text-xs font-semibold text-muted-foreground uppercase">Status</th>
            <th className="text-left px-[24px] py-[12px] text-xs font-semibold text-muted-foreground uppercase">Date</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-[24px] py-[14px] text-sm font-semibold text-primary">{p.id}</td>
                <td className="px-[24px] py-[14px] text-sm text-foreground">{p.invoice}</td>
                <td className="px-[24px] py-[14px] text-sm text-muted-foreground">{p.method}</td>
                <td className="px-[24px] py-[14px] text-sm font-semibold text-foreground">{p.amount}</td>
                <td className="px-[24px] py-[14px]"><StatusBadge variant={p.status} /></td>
                <td className="px-[24px] py-[14px] text-sm text-muted-foreground">{p.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payments;
