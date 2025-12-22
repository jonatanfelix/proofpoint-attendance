import { MapPin, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LocationStatusProps {
  isLoading: boolean;
  isWithinRange: boolean | null;
  distance: number | null;
  accuracy: number | null;
  locationName: string | null;
  error: string | null;
  onRefresh: () => void;
}

const LocationStatus = ({
  isLoading,
  isWithinRange,
  distance,
  accuracy,
  locationName,
  error,
  onRefresh,
}: LocationStatusProps) => {
  if (isLoading) {
    return (
      <Card className="border-2 border-foreground shadow-sm">
        <CardContent className="flex items-center justify-center gap-3 p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Detecting your location...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-2 border-destructive bg-destructive/10 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">Location Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="mt-4 w-full border-2 border-foreground"
            onClick={onRefresh}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isWithinRange === null) {
    return (
      <Card className="border-2 border-foreground shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <MapPin className="h-8 w-8 text-muted-foreground" />
          <p className="text-center text-muted-foreground">
            Enable location access to verify your presence
          </p>
          <Button
            variant="outline"
            className="border-2 border-foreground"
            onClick={onRefresh}
          >
            Enable Location
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`border-2 shadow-sm ${
        isWithinRange ? 'border-foreground bg-accent' : 'border-destructive bg-destructive/10'
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          {isWithinRange ? (
            <CheckCircle className="h-6 w-6 shrink-0" />
          ) : (
            <AlertCircle className="h-6 w-6 shrink-0 text-destructive" />
          )}
          <div className="flex-1">
            {isWithinRange ? (
              <>
                <p className="font-semibold">You are at the location</p>
                <p className="text-sm text-muted-foreground">
                  {locationName || 'Office'} • Accuracy: {Math.round(accuracy || 0)}m
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-destructive">Outside allowed area</p>
                <p className="text-sm text-muted-foreground">
                  You are {Math.round(distance || 0)}m away from {locationName || 'the office'}
                </p>
              </>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={onRefresh}
        >
          <MapPin className="mr-2 h-4 w-4" />
          Refresh Location
        </Button>
      </CardContent>
    </Card>
  );
};

export default LocationStatus;
