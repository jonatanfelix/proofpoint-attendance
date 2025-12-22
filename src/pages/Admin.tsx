import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, Calendar, Users, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceWithProfile {
  id: string;
  record_type: string;
  recorded_at: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  photo_url: string | null;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
  locations: {
    name: string;
  } | null;
}

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Check if user is admin
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data?.role;
    },
    enabled: !!user?.id,
  });

  // Fetch all attendance records (admin only)
  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['admin-attendance', searchTerm, startDate, endDate],
    queryFn: async () => {
      // Fetch attendance records
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          locations (name)
        `)
        .order('recorded_at', { ascending: false });

      if (startDate) {
        query = query.gte('recorded_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('recorded_at', `${endDate}T23:59:59`);
      }

      const { data: attendanceData, error } = await query;
      if (error) throw error;

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(attendanceData.map((r) => r.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const profilesMap = new Map(
        profilesData?.map((p) => [p.user_id, { full_name: p.full_name, email: p.email }])
      );

      // Combine data
      let combined: AttendanceWithProfile[] = attendanceData.map((r) => ({
        ...r,
        profiles: profilesMap.get(r.user_id) || null,
      }));

      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        combined = combined.filter(
          (r) =>
            r.profiles?.full_name?.toLowerCase().includes(term) ||
            r.profiles?.email?.toLowerCase().includes(term)
        );
      }

      return combined;
    },
    enabled: userRole === 'admin',
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: totalEmployees } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: todayRecords } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .gte('recorded_at', today.toISOString());

      const { count: totalLocations } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      return {
        totalEmployees: totalEmployees || 0,
        todayRecords: todayRecords || 0,
        totalLocations: totalLocations || 0,
      };
    },
    enabled: userRole === 'admin',
  });

  const exportToCSV = () => {
    if (!records || records.length === 0) return;

    const headers = ['Employee Name', 'Email', 'Type', 'Date/Time', 'Location', 'Latitude', 'Longitude', 'Accuracy'];
    const rows = records.map((r) => [
      r.profiles?.full_name || 'Unknown',
      r.profiles?.email || 'Unknown',
      r.record_type,
      format(new Date(r.recorded_at), 'yyyy-MM-dd HH:mm:ss'),
      r.locations?.name || 'N/A',
      r.latitude,
      r.longitude,
      r.accuracy_meters || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto max-w-2xl px-4 py-6">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-destructive mb-4">Access Denied</p>
              <p className="text-muted-foreground mb-4">
                You do not have permission to view this page.
              </p>
              <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto max-w-6xl px-4 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage attendance records</p>
            </div>
            <Button onClick={exportToCSV} disabled={!records?.length}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalEmployees || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.todayRecords || 0}</p>
                    <p className="text-sm text-muted-foreground">Today&apos;s Records</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalLocations || 0}</p>
                    <p className="text-sm text-muted-foreground">Active Locations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search Employee</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading records...</p>
              ) : !records?.length ? (
                <p className="text-center py-8 text-muted-foreground">No records found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>GPS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{record.profiles?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">
                                {record.profiles?.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={record.record_type === 'clock_in' ? 'default' : 'secondary'}
                            >
                              {record.record_type === 'clock_in' ? 'Clock In' : 'Clock Out'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(record.recorded_at), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>{record.locations?.name || 'N/A'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}
                            {record.accuracy_meters && (
                              <span className="block text-xs">±{record.accuracy_meters}m</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Admin;
