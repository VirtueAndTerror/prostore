import { Metadata } from 'next';
import Link from 'next/link';
import { getAllOrders, deleteOrder } from '@/lib/actions';
import { requireAdmin } from '@/lib/auth-guard';
import { formatCurrency, formatDateTime, formatId } from '@/lib';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Pagination from '@/components/shared/pagination';
import DeleteDialog from '@/components/shared/delete-dialog';

export const metadata: Metadata = {
  title: 'Admin Orders',
};

interface Props {
  searchParams: Promise<{ page?: string; query?: string }>;
}

const AdminOrdersPage = async ({ searchParams }: Props) => {
  await requireAdmin();

  const { page = 1, query = '' } = await searchParams;

  const { data, totalPages } = await getAllOrders({
    page: Number(page),
    query,
    limit: 4,
  });

  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-3'>
        <h1 className='h2-bold'>Orders</h1>
        {query && (
          <p className='text-sm mb-2'>
            Filtered by <i>&quot;{query}&quot;</i>
            <Link href='/admin/orders'>
              <Button variant='outline' size='sm' className='ml-2'>
                Clear
              </Button>
            </Link>
          </p>
        )}
      </div>
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>DATE</TableHead>
              <TableHead>CUSTOMER</TableHead>
              <TableHead>TOTAL</TableHead>
              <TableHead>PAID</TableHead>
              <TableHead>DELIVERED</TableHead>
              <TableHead>ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((order) => {
              const {
                id,
                createdAt,
                totalPrice,
                isPaid,
                paidAt,
                isDelivered,
                deliveredAt,
                user: { name },
              } = order;
              return (
                <TableRow key={id}>
                  <TableCell>{formatId(id)}</TableCell>
                  <TableCell>{formatDateTime(createdAt).dateTime}</TableCell>
                  <TableCell>{name}</TableCell>
                  <TableCell>{formatCurrency(totalPrice)}</TableCell>
                  <TableCell>
                    {isPaid && paidAt
                      ? formatDateTime(paidAt).dateTime
                      : 'Not Paid'}
                  </TableCell>
                  <TableCell>
                    {isDelivered && deliveredAt
                      ? formatDateTime(deliveredAt).dateTime
                      : 'Not Delivered'}
                  </TableCell>
                  <TableCell>
                    <Link href={`/order/${id}`}>
                      <span>View Details</span>
                    </Link>
                    <DeleteDialog id={id} action={deleteOrder} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <Pagination page={Number(page) || 1} totalPages={totalPages} />
        )}
      </div>
    </div>
  );
};

export default AdminOrdersPage;
