import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
    <Card className="border-2 border-foreground">
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-4 text-center">Absensi</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Button
            size="lg"
            className="h-24 border-2 border-foreground text-xl font-bold shadow-md disabled:opacity-50"
            disabled={!canClockIn || isSubmitting}
            onClick={onClockIn}
          >
            {isSubmitting ? (
              <Loader2 className="mr-3 h-8 w-8 animate-spin" />
            ) : (
              <LogIn className="mr-3 h-8 w-8" />
            )}
            HADIR
          </Button>

          <Button
            size="lg"
            variant="destructive"
            className="h-24 border-2 border-foreground text-xl font-bold shadow-md disabled:opacity-50"
            disabled={!canClockOut || isSubmitting}
            onClick={onClockOut}
          >
            {isSubmitting ? (
              <Loader2 className="mr-3 h-8 w-8 animate-spin" />
            ) : (
              <LogOut className="mr-3 h-8 w-8" />
            )}
            PULANG
          </Button>
        </div>
        
        {!canClockIn && !canClockOut && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Menunggu lokasi tersedia...
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceButtons;
