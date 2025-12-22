import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import StatusCard from '@/components/attendance/StatusCard';
import LocationStatus from '@/components/attendance/LocationStatus';
import AttendanceButtons from '@/components/attendance/AttendanceButtons';
import RecentHistory from '@/components/attendance/RecentHistory';
import { getCurrentPosition, calculateDistance, GeolocationError } from '@/lib/geolocation';

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

interface AttendanceRecord {
  id: string;
  record_type: 'clock_in' | 'clock_out';
  recorded_at: string;
  photo_url: string | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [nearestLocation, setNearestLocation] = useState<Location | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isWithinRange, setIsWithinRange] = useState<boolean | null>(null);

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data as Location[];
    },
  });

  // Fetch recent attendance records
  const { data: recentRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['attendance-records', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as AttendanceRecord[];
    },
    enabled: !!user?.id,
  });

  // Get current attendance status
  const getAttendanceStatus = useCallback(() => {
    if (!recentRecords || recentRecords.length === 0) return 'not_present';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRecords = recentRecords.filter((r) => {
      const recordDate = new Date(r.recorded_at);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });

    if (todayRecords.length === 0) return 'not_present';

    const lastRecord = todayRecords[0];
    return lastRecord.record_type === 'clock_in' ? 'clocked_in' : 'clocked_out';
  }, [recentRecords]);

  const status = getAttendanceStatus();

  const lastClockIn = recentRecords?.find((r) => r.record_type === 'clock_in');
  const lastClockOut = recentRecords?.find((r) => r.record_type === 'clock_out');

  // Refresh location
  const refreshLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      const position = await getCurrentPosition();
      setCurrentPosition(position);

      if (locations && locations.length > 0) {
        // Find nearest location
        let nearest: Location | null = null;
        let minDistance = Infinity;

        for (const loc of locations) {
          const dist = calculateDistance(
            position.latitude,
            position.longitude,
            Number(loc.latitude),
            Number(loc.longitude)
          );
          if (dist < minDistance) {
            minDistance = dist;
            nearest = loc;
          }
        }

        setNearestLocation(nearest);
        setDistance(minDistance);
        setIsWithinRange(nearest ? minDistance <= nearest.radius_meters : false);
      } else {
        // No locations configured - allow clock in from anywhere for testing
        setNearestLocation(null);
        setDistance(0);
        setIsWithinRange(true);
      }
    } catch (err) {
      const error = err as GeolocationError;
      setLocationError(error.message);
      setIsWithinRange(null);
    } finally {
      setLocationLoading(false);
    }
  }, [locations]);

  // Initial location fetch
  useEffect(() => {
    if (locations !== undefined) {
      refreshLocation();
    }
  }, [locations, refreshLocation]);

  // Clock in/out mutation
  const attendanceMutation = useMutation({
    mutationFn: async (recordType: 'clock_in' | 'clock_out') => {
      if (!user?.id || !currentPosition) {
        throw new Error('Missing required data');
      }

      const { error } = await supabase.from('attendance_records').insert({
        user_id: user.id,
        location_id: nearestLocation?.id || null,
        record_type: recordType,
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        accuracy_meters: currentPosition.accuracy,
        recorded_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: (_, recordType) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      toast({
        title: recordType === 'clock_in' ? 'Clocked In!' : 'Clocked Out!',
        description: `Successfully recorded at ${new Date().toLocaleTimeString()}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record attendance',
        variant: 'destructive',
      });
    },
  });

  const handleClockIn = () => {
    attendanceMutation.mutate('clock_in');
  };

  const handleClockOut = () => {
    attendanceMutation.mutate('clock_out');
  };

  const canClockIn = isWithinRange === true && status !== 'clocked_in';
  const canClockOut = isWithinRange === true && status === 'clocked_in';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto max-w-2xl px-4 py-6">
        <div className="space-y-6">
          {/* Status Card */}
          <StatusCard
            status={status}
            lastClockIn={lastClockIn ? new Date(lastClockIn.recorded_at) : null}
            lastClockOut={lastClockOut ? new Date(lastClockOut.recorded_at) : null}
          />

          {/* Location Status */}
          <LocationStatus
            isLoading={locationLoading}
            isWithinRange={isWithinRange}
            distance={distance}
            accuracy={currentPosition?.accuracy || null}
            locationName={nearestLocation?.name || null}
            error={locationError}
            onRefresh={refreshLocation}
          />

          {/* Attendance Buttons */}
          <AttendanceButtons
            canClockIn={canClockIn}
            canClockOut={canClockOut}
            isSubmitting={attendanceMutation.isPending}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
          />

          {/* Recent History */}
          <RecentHistory
            records={recentRecords || []}
            isLoading={recordsLoading}
          />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
