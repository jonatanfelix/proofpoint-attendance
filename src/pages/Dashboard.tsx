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
import CameraCapture from '@/components/attendance/CameraCapture';
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

interface ProfileData {
  full_name: string;
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

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [pendingRecordType, setPendingRecordType] = useState<'clock_in' | 'clock_out' | null>(null);

  // Fetch user profile for camera watermark
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (error) return null;
      return data as ProfileData;
    },
    enabled: !!user?.id,
  });

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

  // Upload photo to storage
  const uploadPhoto = async (imageDataUrl: string, recordType: 'clock_in' | 'clock_out'): Promise<string | null> => {
    try {
      // Convert base64 to blob
      const base64Data = imageDataUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // Generate unique filename
      const fileName = `${user?.id}/${Date.now()}_${recordType}.jpg`;

      const { error } = await supabase.storage
        .from('attendance-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('attendance-photos')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Photo upload error:', err);
      return null;
    }
  };

  // Clock in/out mutation
  const attendanceMutation = useMutation({
    mutationFn: async ({ recordType, photoUrl }: { recordType: 'clock_in' | 'clock_out'; photoUrl: string | null }) => {
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
        photo_url: photoUrl,
      });

      if (error) throw error;
    },
    onSuccess: (_, { recordType }) => {
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
    setPendingRecordType('clock_in');
    setShowCamera(true);
  };

  const handleClockOut = () => {
    setPendingRecordType('clock_out');
    setShowCamera(true);
  };

  const handleCameraCapture = async (imageDataUrl: string) => {
    if (!pendingRecordType) return;

    // Upload photo first
    const photoUrl = await uploadPhoto(imageDataUrl, pendingRecordType);

    // Submit attendance record
    attendanceMutation.mutate({ recordType: pendingRecordType, photoUrl });
    setPendingRecordType(null);
  };

  const handleCameraClose = () => {
    setShowCamera(false);
    setPendingRecordType(null);
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

      {/* Camera Capture Modal */}
      {currentPosition && (
        <CameraCapture
          isOpen={showCamera}
          onClose={handleCameraClose}
          onCapture={handleCameraCapture}
          employeeName={profile?.full_name || user?.email || 'Employee'}
          recordType={pendingRecordType === 'clock_in' ? 'CLOCK IN' : 'CLOCK OUT'}
          latitude={currentPosition.latitude}
          longitude={currentPosition.longitude}
        />
      )}
    </div>
  );
};

export default Dashboard;
