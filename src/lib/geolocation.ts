// Haversine formula to calculate distance between two coordinates
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GeolocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'ACCURACY_TOO_LOW';
  message: string;
}

export const getCurrentPosition = (): Promise<GeolocationResult> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 'POSITION_UNAVAILABLE',
        message: 'Geolocation is not supported by your browser',
      } as GeolocationError);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Anti-spoofing: Reject if accuracy is too low (> 5000m for browser testing)
        // In production with mobile devices, this should be stricter (1000m)
        if (accuracy > 5000) {
          reject({
            code: 'ACCURACY_TOO_LOW',
            message: 'GPS accuracy is too low. Please move to an area with better signal.',
          } as GeolocationError);
          return;
        }

        resolve({ latitude, longitude, accuracy });
      },
      (error) => {
        let errorResult: GeolocationError;
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorResult = {
              code: 'PERMISSION_DENIED',
              message: 'Location permission denied. Please enable location access in your browser settings.',
            };
            break;
          case error.POSITION_UNAVAILABLE:
            errorResult = {
              code: 'POSITION_UNAVAILABLE',
              message: 'Location information is unavailable. Please check your GPS.',
            };
            break;
          case error.TIMEOUT:
            errorResult = {
              code: 'TIMEOUT',
              message: 'Location request timed out. Please try again.',
            };
            break;
          default:
            errorResult = {
              code: 'POSITION_UNAVAILABLE',
              message: 'Unable to get your location.',
            };
        }
        
        reject(errorResult);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

export const isWithinRadius = (
  userLat: number,
  userLon: number,
  locationLat: number,
  locationLon: number,
  radiusMeters: number
): boolean => {
  const distance = calculateDistance(userLat, userLon, locationLat, locationLon);
  return distance <= radiusMeters;
};
