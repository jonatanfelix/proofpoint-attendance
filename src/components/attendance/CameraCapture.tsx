import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, X, RotateCcw } from 'lucide-react';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
  employeeName: string;
  recordType: 'CLOCK IN' | 'CLOCK OUT';
  latitude: number;
  longitude: number;
}

const CameraCapture = ({
  isOpen,
  onClose,
  onCapture,
  employeeName,
  recordType,
  latitude,
  longitude,
}: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please check permissions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Add watermark
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    // Watermark styling
    const padding = 20;
    const lineHeight = 28;
    const fontSize = 18;
    const watermarkHeight = lineHeight * 5 + padding * 2;

    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, canvas.height - watermarkHeight, canvas.width, watermarkHeight);

    // Text styling
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'left';

    const startY = canvas.height - watermarkHeight + padding + fontSize;

    // Record type badge
    ctx.fillStyle = recordType === 'CLOCK IN' ? '#22c55e' : '#ef4444';
    ctx.fillRect(padding, startY - fontSize, 100, fontSize + 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(recordType, padding + 8, startY);

    // Employee name
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Employee: ${employeeName}`, padding, startY + lineHeight);

    // Timestamp
    ctx.fillText(`Time: ${timestamp}`, padding, startY + lineHeight * 2);

    // GPS coordinates
    ctx.font = `${fontSize - 2}px Arial`;
    ctx.fillText(
      `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      padding,
      startY + lineHeight * 3
    );

    // Verification text
    ctx.fillStyle = '#9ca3af';
    ctx.font = `italic ${fontSize - 4}px Arial`;
    ctx.fillText('GeoAttend Verified', padding, startY + lineHeight * 4);

    // Get the watermarked image
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onCapture(imageDataUrl);
    onClose();
  }, [employeeName, recordType, latitude, longitude, onCapture, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Take {recordType} Photo</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={startCamera} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden mb-4">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-muted-foreground">Starting camera...</p>
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              <Button
                onClick={capturePhoto}
                className="w-full"
                size="lg"
                disabled={isLoading || !stream}
              >
                <Camera className="h-5 w-5 mr-2" />
                Capture Photo
              </Button>
            </>
          )}

          {/* Hidden canvas for watermarking */}
          <canvas ref={canvasRef} className="hidden" />
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraCapture;
