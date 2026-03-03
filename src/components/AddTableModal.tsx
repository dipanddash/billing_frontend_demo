import { useEffect, useState } from 'react';
import { Building2, Hash, Users } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface AddTableForm {
  number: string;
  floor: string;
  capacity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaving?: boolean;
  defaultNumber: string;
  onSubmit: (values: AddTableForm) => Promise<void> | void;
}

const floorOptions = ['Ground', 'First', 'Second', 'Outdoor'];
const capacityOptions = [2, 4, 6, 8, 10];

export default function AddTableModal({ open, onOpenChange, isSaving = false, defaultNumber, onSubmit }: Props) {
  const [number, setNumber] = useState(defaultNumber);
  const [floor, setFloor] = useState('Ground');
  const [capacity, setCapacity] = useState('4');

  useEffect(() => {
    if (!open) return;
    setNumber(defaultNumber);
    setFloor('Ground');
    setCapacity('4');
  }, [open, defaultNumber]);

  const handleSave = async () => {
    const trimmed = number.trim();
    if (!trimmed) {
      window.alert('Table number is required');
      return;
    }

    await onSubmit({
      number: trimmed,
      floor,
      capacity: Number(capacity),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Hash className="h-4 w-4" />
            </span>
            Add New Table
          </DialogTitle>
          <DialogDescription>
            Create a table and make it immediately available on the floor map.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Preview</p>
              <Badge variant="secondary" className="text-[10px]">
                AVAILABLE
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">T-{number || '--'}</span>
              <span className="text-xs text-muted-foreground">{capacity} seats</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="table-number">Table Number</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Hash size={16} className="shrink-0" />
              </span>
              <Input
                id="table-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="A12"
                className="pl-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Floor</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-muted-foreground">
                  <Building2 size={16} className="shrink-0" />
                </span>
                <Select value={floor} onValueChange={setFloor}>
                  <SelectTrigger className="pl-11">
                    <SelectValue placeholder="Choose floor" />
                  </SelectTrigger>
                  <SelectContent>
                    {floorOptions.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Capacity</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-muted-foreground">
                  <Users size={16} className="shrink-0" />
                </span>
                <Select value={capacity} onValueChange={setCapacity}>
                  <SelectTrigger className="pl-11">
                    <SelectValue placeholder="Capacity" />
                  </SelectTrigger>
                  <SelectContent>
                    {capacityOptions.map((c) => (
                      <SelectItem key={String(c)} value={String(c)}>
                        {c} seats
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Create Table'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}