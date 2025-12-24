import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CalendarDays, Plus, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  review_notes: string | null;
  created_at: string;
}

const LeaveRequest = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [leaveType, setLeaveType] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // Fetch user's leave requests
  const { data: leaveRequests, isLoading } = useQuery({
    queryKey: ['leave-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!user?.id,
  });

  // Submit leave request
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not found');
      if (!leaveType) throw new Error('Pilih jenis izin');
      if (!startDate || !endDate) throw new Error('Tanggal harus diisi');
      
      // Validate date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (start > end) {
        throw new Error('Tanggal mulai tidak boleh lebih besar dari tanggal selesai');
      }
      
      if (start < today) {
        throw new Error('Tidak dapat mengajukan izin untuk tanggal yang sudah lewat');
      }

      const { error } = await supabase.from('leave_requests').insert({
        user_id: user.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Pengajuan berhasil dikirim!');
      setLeaveType('');
      setStartDate('');
      setEndDate('');
      setReason('');
    },
    onError: (error) => {
      toast.error(error.message || 'Gagal mengirim pengajuan');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Menunggu</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Disetujui</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Ditolak</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'cuti':
        return 'Cuti';
      case 'izin':
        return 'Izin';
      case 'sakit':
        return 'Sakit';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pengajuan Izin / Cuti</h1>
          <p className="text-muted-foreground">Ajukan permohonan izin atau cuti Anda</p>
        </div>

        {/* Form */}
        <Card className="border-2 border-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Ajukan Izin Baru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leaveType">Jenis Izin</Label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger className="border-2 border-foreground">
                      <SelectValue placeholder="Pilih jenis izin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cuti">Cuti</SelectItem>
                      <SelectItem value="izin">Izin</SelectItem>
                      <SelectItem value="sakit">Sakit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Tanggal Mulai</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-2 border-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Tanggal Selesai</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="border-2 border-foreground"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="reason">Alasan (opsional)</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Jelaskan alasan pengajuan..."
                    className="border-2 border-foreground"
                    rows={3}
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={submitMutation.isPending || !leaveType || !startDate || !endDate}
                className="border-2 border-foreground w-full md:w-auto"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Ajukan Izin
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="border-2 border-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Riwayat Pengajuan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !leaveRequests?.length ? (
              <p className="text-center py-8 text-muted-foreground">
                Belum ada riwayat pengajuan
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal Ajuan</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Alasan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Catatan Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {format(new Date(req.created_at), 'dd MMM yyyy', { locale: idLocale })}
                        </TableCell>
                        <TableCell>{getLeaveTypeLabel(req.leave_type)}</TableCell>
                        <TableCell>
                          {format(new Date(req.start_date), 'dd MMM', { locale: idLocale })} -{' '}
                          {format(new Date(req.end_date), 'dd MMM yyyy', { locale: idLocale })}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {req.reason || '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {req.review_notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LeaveRequest;
