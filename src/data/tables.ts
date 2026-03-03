export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'disabled';

export interface TableOrder {
  id: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  progress: number; // 0-100
}

export interface TableData {
  id: string;
  number: number;
  capacity: number;
  guests: number;
  status: TableStatus;
  tokenNumber?: string;
  order?: TableOrder;
  duration: number; // minutes
  revenue: number;
  customerName?: string;
  notes?: string;
  experienceScore: number; // 0-100
  position: { x: number; y: number };
  shape: 'round' | 'square' | 'rect';
}

export interface Reservation {
  id: string;
  customerName: string;
  partySize: number;
  time: string;
  tableId?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
}


export const statusConfig: Record<TableStatus, { label: string; dotClass: string; bgClass: string; borderClass: string }> = {
  available: { label: 'Available', dotClass: 'bg-primary', bgClass: 'bg-primary/10', borderClass: 'border-primary/40' },
  occupied: { label: 'Occupied', dotClass: 'bg-warning', bgClass: 'bg-warning/15', borderClass: 'border-warning/50' },
  reserved: { label: 'Reserved', dotClass: 'bg-warning', bgClass: 'bg-warning/15', borderClass: 'border-warning/35' },
  cleaning: { label: 'Cleaning', dotClass: 'bg-sky-500', bgClass: 'bg-sky-50', borderClass: 'border-sky-200' },
  disabled: { label: 'Disabled', dotClass: 'bg-muted-foreground/50', bgClass: 'bg-muted/50', borderClass: 'border-border' },
};