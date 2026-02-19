'use client';
import { SalesData } from '@/types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface Props {
  data: SalesData;
}

const Charts = ({ data }: Props) => {
  return (
    <ResponsiveContainer width={'100%'} height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey={'month'}
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Bar
          dataKey={'totalSales'}
          fill='current'
          radius={[40, 40, 0, 0]}
          className='fill-primary'
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default Charts;
