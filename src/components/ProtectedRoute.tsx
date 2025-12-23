import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'developer' | 'admin_or_developer';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Fetch user role
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data?.role as string | null;
    },
    enabled: !!user?.id,
  });

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin border-4 border-foreground border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check role-based access for admin pages
  const isAdminPage = location.pathname.startsWith('/admin');
  const isAdminOrDeveloper = userRole === 'admin' || userRole === 'developer';

  // If accessing admin pages, must be admin or developer
  if (isAdminPage && !isAdminOrDeveloper) {
    return <Navigate to="/" replace />;
  }

  // Check specific required role
  if (requiredRole) {
    if (requiredRole === 'developer' && userRole !== 'developer') {
      return <Navigate to="/" replace />;
    }
    if (requiredRole === 'admin' && userRole !== 'admin' && userRole !== 'developer') {
      return <Navigate to="/" replace />;
    }
    if (requiredRole === 'admin_or_developer' && !isAdminOrDeveloper) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
