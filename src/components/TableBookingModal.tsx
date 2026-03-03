import { useEffect, useState } from 'react';
import { Phone, UserRound, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type TableData } from '@/data/tables';

interface Props {
  open: boolean;
  table: TableData | null;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { table: string; customer_name: string; customer_phone: string; guest_count: number }) => Promise<void> | void;
}

export default function TableBookingModal({
  open,
  table,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: Props) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [guestCount, setGuestCount] = useState('1');

  useEffect(() => {
    if (!open) return;
    setCustomerName('');
    setCustomerPhone('');
    setGuestCount('1');
  }, [open, table?.id]);

  const handleCreateSession = async () => {
    if (!table) return;
    const name = customerName.trim();
    const phone = customerPhone.trim();
    const guests = Number(guestCount);

    if (!name) {
      window.alert('Customer name is required');
      return;
    }
    if (!phone) {
      window.alert('Customer phone is required');
      return;
    }
    if (!Number.isFinite(guests) || guests <= 0) {
      window.alert('Guest count must be greater than 0');
      return;
    }
    if (table.capacity > 0 && guests > table.capacity) {
      window.alert(`Guest count cannot exceed table capacity (${table.capacity})`);
      return;
    }

    await onSubmit({
      table: table.id,
      customer_name: name,
      customer_phone: phone,
      guest_count: guests,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book Table {table?.number}</DialogTitle>
          <DialogDescription>Create session for this available table.</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
          <p className="font-medium text-foreground">Table: T-{table?.number}</p>
          <p className="text-xs text-muted-foreground">Capacity: {table?.capacity ?? 0}</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Customer Name</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <UserRound size={16} className="shrink-0" />
              </span>
              <Input
                id="customer-name"
                className="pl-11"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Rahul"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-phone">Customer Phone</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Phone size={16} className="shrink-0" />
              </span>
              <Input
                id="customer-phone"
                className="pl-11"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="9876543210"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest-count">Guest Count</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Users size={16} className="shrink-0" />
              </span>
              <Input
                id="guest-count"
                type="number"
                min={1}
                max={table?.capacity ?? undefined}
                className="pl-11"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCreateSession} disabled={isSubmitting}>
            {isSubmitting ? 'Booking...' : 'Book Table'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}