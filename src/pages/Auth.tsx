import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Clock, Shield, Info } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    setErrors({});
    
    try {
      loginSchema.parse({ email, password });
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            newErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Login Gagal',
            description: 'Email atau password salah. Silakan coba lagi.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Login Gagal',
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Selamat Datang!',
          description: 'Anda berhasil login.',
        });
        navigate('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b-2 border-foreground bg-background px-4 py-4">
        <div className="container mx-auto flex items-center gap-2">
          <MapPin className="h-8 w-8" />
          <h1 className="text-2xl font-bold tracking-tight">GeoAttend</h1>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-3xl font-bold">Geo-Verified Attendance</h2>
          <p className="text-muted-foreground">Secure, location-based time tracking for field teams</p>
        </div>

        {/* Features */}
        <div className="mb-8 grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3 border-2 border-foreground bg-card p-4 shadow-sm">
            <MapPin className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-semibold">GPS Verified</p>
              <p className="text-sm text-muted-foreground">100m accuracy</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-2 border-foreground bg-card p-4 shadow-sm">
            <Clock className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-semibold">Real-Time</p>
              <p className="text-sm text-muted-foreground">Instant records</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-2 border-foreground bg-card p-4 shadow-sm">
            <Shield className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-semibold">Anti-Fraud</p>
              <p className="text-sm text-muted-foreground">Photo evidence</p>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="w-full max-w-md border-2 border-foreground shadow-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Selamat Datang</CardTitle>
            <CardDescription>
              Masukkan kredensial untuk mengakses akun Anda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-2 border-foreground"
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-2 border-foreground"
                  disabled={isSubmitting}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full border-2 border-foreground shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Info about signup */}
            <div className="mt-4 p-3 rounded-lg bg-muted border-2 border-foreground">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Pendaftaran akun baru hanya dapat dilakukan oleh Admin. 
                  Hubungi Admin perusahaan Anda untuk mendapatkan akun.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-foreground bg-background px-4 py-4">
        <p className="text-center text-sm text-muted-foreground">
          © 2024 GeoAttend. Secure attendance tracking.
        </p>
      </footer>
    </div>
  );
};

export default Auth;
