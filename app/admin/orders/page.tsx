import { Metadata } from 'next';
import Link from 'next/link';
import { getAllOrders, deleteOrder } from '@/lib/actions';
import { requireAdmin } from '@/lib/auth-guard';
import { formatCurrency, formatDateTime, formatId } from '@/lib';
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

export const metadata: Metadata = { title: 'Admin Orders' };

interface Props {
  searchParams: Promise<{ page: string }>;
}

const AdminOrdersPage = async ({ searchParams }: Props) => {
  await requireAdmin();

  const { page = '1' } = await searchParams;

  const { data, totalPages } = await getAllOrders({
    page: Number(page) || 1,
    // limit: 2,
  });

  return (
    <div className='space-y-2'>
      <h2 className='h2-bold'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>DATE</TableHead>
                <TableHead>TOTAL</TableHead>
                <TableHead>PAID</TableHead>
                <TableHead>DELIVERED</TableHead>
                <TableHead>ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map(
                ({
                  id,
                  createdAt,
                  totalPrice,
                  isPaid,
                  paidAt,
                  isDelivered,
                  deliveredAt,
                }) => (
                  <TableRow key={id}>
                    <TableCell>{formatId(id)}</TableCell>
                    <TableCell>
                      {formatDateTime(createdAt).dateTime}
                    </TableCell>
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
                ),
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <Pagination page={Number(page) || 1} totalPages={totalPages} />
          )}
        </div>
      </h2>
    </div>
  );
};

export default AdminOrdersPage;
