import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AttendanceButtonsProps {
  canClockIn: boolean;
  canClockOut: boolean;
  isSubmitting: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
}

const AttendanceButtons = ({
  canClockIn,
  canClockOut,
  isSubmitting,
  onClockIn,
  onClockOut,
}: AttendanceButtonsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Button
        size="lg"
        className="h-20 border-2 border-foreground text-lg shadow-md disabled:opacity-50"
        disabled={!canClockIn || isSubmitting}
        onClick={onClockIn}
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        ) : (
          <LogIn className="mr-2 h-6 w-6" />
        )}
        Clock In
      </Button>

      <Button
        size="lg"
        variant="destructive"
        className="h-20 border-2 border-foreground text-lg shadow-md disabled:opacity-50"
        disabled={!canClockOut || isSubmitting}
        onClick={onClockOut}
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        ) : (
          <LogOut className="mr-2 h-6 w-6" />
        )}
        Clock Out
      </Button>
    </div>
  );
};

export default AttendanceButtons;
