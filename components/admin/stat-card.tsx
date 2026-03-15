import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatNumber } from '@/lib';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  format?: 'currency' | 'number';
}

const StatCard = ({ title, value, icon: Icon, format = 'number' }: StatCardProps) => (
  <Card>
    <CardHeader className='flex flex-row items-center justify-between space-y-0'>
      <CardTitle className='text-sm font-medium'>{title}</CardTitle>
      <Icon className='h-4 w-4 text-muted-foreground' aria-hidden />
    </CardHeader>
    <CardContent>
      <div className='text-xl font-bold'>
        {format === 'currency' ? formatCurrency(value) : formatNumber(value)}
      </div>
    </CardContent>
  </Card>
);

export default StatCard;
