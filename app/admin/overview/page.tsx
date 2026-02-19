import { auth } from '@/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib';
import { getOrderSummary } from '@/lib/actions';
import { BadgeDollarSign, Barcode, CreditCard, Users } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import Charts from './charts';
import { requireAdmin } from '@/lib/auth-guard';

export const metadata: Metadata = { title: 'Admin Dashboard' };

const AdminOverviewPage = async () => {
  await requireAdmin();

  const session = await auth();

  if (session?.user?.role !== 'admin') throw new Error('User not authorized');

  const {
    totalSales,
    ordersCount,
    usersCount,
    productsCount,
    salesData,
    latestSales,
  } = await getOrderSummary();

  // TODO: Create CustomCard Component to simplify this code.

  return (
    <div className='space-y-2'>
      <h1 className='h2-bold'>Dashboard</h1>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0'>
            <CardTitle className='text-sm font-medium'>Total Revenue</CardTitle>
            <BadgeDollarSign />
          </CardHeader>
          <CardContent>
            <div className='text-xl font-bold'>
              {formatCurrency(totalSales._sum.totalPrice?.toString() || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0'>
            <CardTitle className='text-sm font-medium'>Sales</CardTitle>
            <CreditCard />
          </CardHeader>
          <CardContent>
            <div className='text-xl font-bold'>{formatNumber(ordersCount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0'>
            <CardTitle className='text-sm font-medium'>Cusotmers</CardTitle>
            <Users />
          </CardHeader>
          <CardContent>
            <div className='text-xl font-bold'>{formatNumber(usersCount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0'>
            <CardTitle className='text-sm font-medium'>Products</CardTitle>
            <Barcode />
          </CardHeader>
          <CardContent>
            <div className='text-xl font-bold'>
              {formatNumber(productsCount)}
            </div>
          </CardContent>
        </Card>
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
                {latestSales.map(({ user, createdAt, totalPrice, id }) => (
                  <TableRow key={id}>
                    <TableCell>
                      {user?.name ? user.name : 'Deleted User'}
                    </TableCell>
                    <TableCell>{formatDateTime(createdAt).dateOnly}</TableCell>
                    <TableCell>{formatCurrency(totalPrice)}</TableCell>
                    <TableCell>
                      <Link href={`/order/${id}`}>
                        <span className='px-2'>Details</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverviewPage;
