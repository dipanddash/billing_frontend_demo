import { Clock, PlayCircle, StopCircle, DollarSign } from 'lucide-react';
import { useState } from 'react';

const Shift = () => {
  const [shiftActive, setShiftActive] = useState(true);

  return (
    <div className="space-y-[24px] animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Shift Management</h1>

      <div className="bg-card rounded-lg border border-border shadow-soft p-[32px]">
        <div className="flex items-center gap-[16px] mb-[24px]">
          <div className={`w-[48px] h-[48px] rounded-lg flex items-center justify-center ${shiftActive ? 'bg-success/10' : 'bg-muted'}`}>
            <Clock className={`w-6 h-6 ${shiftActive ? 'text-success' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{shiftActive ? 'Shift Active' : 'No Active Shift'}</h2>
            <p className="text-sm text-muted-foreground">{shiftActive ? 'Started at 8:00 AM · 4h 30m elapsed' : 'Start your shift to begin'}</p>
          </div>
        </div>

        {shiftActive && (
          <div className="grid grid-cols-2 gap-[16px] mb-[24px]">
            <div className="bg-accent rounded-md p-[16px]">
              <p className="text-xs text-muted-foreground">Opening Balance</p>
              <p className="text-xl font-bold text-foreground">$500.00</p>
            </div>
            <div className="bg-accent rounded-md p-[16px]">
              <p className="text-xs text-muted-foreground">Current Sales</p>
              <p className="text-xl font-bold text-primary">$640.00</p>
            </div>
            <div className="bg-accent rounded-md p-[16px]">
              <p className="text-xs text-muted-foreground">Cash Received</p>
              <p className="text-xl font-bold text-foreground">$380.00</p>
            </div>
            <div className="bg-accent rounded-md p-[16px]">
              <p className="text-xs text-muted-foreground">Card / UPI</p>
              <p className="text-xl font-bold text-foreground">$260.00</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setShiftActive(!shiftActive)}
          className={`w-full py-[14px] rounded-md font-semibold text-sm flex items-center justify-center gap-[8px] transition-all ${
            shiftActive
              ? 'bg-destructive text-destructive-foreground hover:opacity-90'
              : 'gradient-primary text-primary-foreground shadow-glow hover:opacity-90'
          }`}
        >
          {shiftActive ? <><StopCircle className="w-5 h-5" /> End Shift</> : <><PlayCircle className="w-5 h-5" /> Start Shift</>}
        </button>
      </div>
    </div>
  );
};

export default Shift;
