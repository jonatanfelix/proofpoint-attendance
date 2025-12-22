import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

interface StatusCardProps {
  status: 'not_present' | 'clocked_in' | 'clocked_out';
  lastClockIn?: Date | null;
  lastClockOut?: Date | null;
}

const StatusCard = ({ status, lastClockIn, lastClockOut }: StatusCardProps) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'clocked_in':
        return {
          icon: <CheckCircle className="h-8 w-8" />,
          title: 'Currently Working',
          subtitle: lastClockIn
            ? `Clocked in at ${format(lastClockIn, 'HH:mm')}`
            : 'You are on duty',
          bgClass: 'bg-accent',
        };
      case 'clocked_out':
        return {
          icon: <XCircle className="h-8 w-8" />,
          title: 'Shift Completed',
          subtitle: lastClockOut
            ? `Clocked out at ${format(lastClockOut, 'HH:mm')}`
            : 'See you tomorrow',
          bgClass: 'bg-secondary',
        };
      default:
        return {
          icon: <Clock className="h-8 w-8" />,
          title: 'Not Yet Present',
          subtitle: 'Clock in to start your shift',
          bgClass: 'bg-muted',
        };
    }
  };

  const { icon, title, subtitle, bgClass } = getStatusInfo();

  return (
    <Card className={`border-2 border-foreground ${bgClass} shadow-sm`}>
      <CardContent className="flex items-center gap-4 p-6">
        {icon}
        <div>
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusCard;
