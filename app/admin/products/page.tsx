import DeleteDialog from '@/components/shared/delete-dialog';
import Pagination from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatId } from '@/lib';
import { deleteProduct, getAllProducts } from '@/lib/actions';
import { requireAdmin } from '@/lib/auth-guard';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Admin Product',
};

interface Props {
  searchParams: Promise<{
    page?: string;
    query?: string;
    category?: string;
  }>;
}

const AdminProductsPage = async (props: Props) => {
  await requireAdmin();

  const { page = 1, query = '', category = '' } = await props.searchParams;

  const { data: products, totalPages } = await getAllProducts({
    page: Number(page),
    query,
    category,
  });

  return (
    <div className='space-y-2'>
      <div className='flex-between'>
        <h1 className='h2-bold'>Products</h1>
        {query && (
          <div>
            Filtered by <i>&quot;{query}&quot;</i>{' '}
            <Link href='/admin/products'>
              <Button variant='outline' size='sm'>
                Remove Filter
              </Button>
            </Link>
          </div>
        )}
        <Button asChild variant='default'>
          <Link href={'/admin/products/new'}>Create New Product</Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>NAME</TableHead>
            <TableHead className='text-right'>PRICE</TableHead>
            <TableHead>CATEGORY</TableHead>
            <TableHead>STOCK</TableHead>
            <TableHead>RATING</TableHead>
            <TableHead className='w-25'>ACTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map(({ id, name, price, category, stock, rating }) => (
            <TableRow key={id}>
              <TableCell>{formatId(id)}</TableCell>
              <TableCell>{name}</TableCell>
              <TableCell className='text-right'>
                {formatCurrency(price)}
              </TableCell>
              <TableCell>{category}</TableCell>
              <TableCell>{stock}</TableCell>
              <TableCell>{rating}</TableCell>
              <TableCell className='flex gap-1'>
                <Button asChild variant={'outline'} size={'sm'}>
                  <Link href={`/admin/products/${id}`}>Edit</Link>
                </Button>
                <DeleteDialog id={id} action={deleteProduct} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <Pagination page={Number(page) || 1} totalPages={totalPages} />
      )}
    </div>
  );
};

export default AdminProductsPage;
