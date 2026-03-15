import StatCard from '@/components/admin/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDateTime } from '@/lib';
import { getOrderSummary } from '@/lib/actions';
import { requireAdmin } from '@/lib/auth-guard';
import { BadgeDollarSign, Barcode, CreditCard, Users } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import Charts from './charts';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
};

const AdminOverviewPage = async () => {
  await requireAdmin();

  const {
    totalSales,
    ordersCount,
    usersCount,
    productsCount,
    salesData,
    latestSales,
  } = await getOrderSummary();

  const totalRevenue = Number(totalSales._sum.totalPrice ?? 0);

  return (
    <div className='space-y-2'>
      <h1 className='h2-bold'>Dashboard</h1>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <StatCard
          title='Total Revenue'
          value={totalRevenue}
          icon={BadgeDollarSign}
          format='currency'
        />
        <StatCard title='Sales' value={ordersCount} icon={CreditCard} />
        <StatCard title='Customers' value={usersCount} icon={Users} />
        <StatCard title='Products' value={productsCount} icon={Barcode} />
      </div>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
        <Card className='col-span-4'>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Charts data={salesData} />
          </CardContent>
        </Card>
        <Card className='col-span-3'>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BUYER</TableHead>
                  <TableHead>DATE</TableHead>
                  <TableHead>TOTAL</TableHead>
                  <TableHead>ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestSales.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className='h-24 text-center text-muted-foreground'
                    >
                      No recent sales
                    </TableCell>
                  </TableRow>
                ) : (
                  latestSales.map(({ user, createdAt, totalPrice, id }) => (
                    <TableRow key={id}>
                      <TableCell>
                        {user?.name ?? 'Deleted User'}
                      </TableCell>
                      <TableCell>{formatDateTime(createdAt).dateOnly}</TableCell>
                      <TableCell>{formatCurrency(totalPrice)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/order/${id}`}
                          className='text-primary underline-offset-4 hover:underline'
                        >
                          Details
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverviewPage;
