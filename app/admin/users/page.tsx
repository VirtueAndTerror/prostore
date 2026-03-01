import DeleteDialog from '@/components/shared/delete-dialog';
import Pagination from '@/components/shared/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deleteUser, getAllUsers } from '@/lib/actions';
import { requireAdmin } from '@/lib/auth-guard';
import { formatId } from '@/lib/utils';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Admin User',
};

interface Props {
  searchParams: Promise<{ page?: string; limit?: number; query: string }>;
}

const AdminUserPage = async (props: Props) => {
  await requireAdmin();

  const { page = 1, query } = await props.searchParams;

  const { data, totalPages } = await getAllUsers({ page: Number(page), query });

  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-3'>
        <h1 className='h2-bold'>Users</h1>
        {query && (
          <div>
            Filtered by <i>&quot;{query}&quot;</i>{' '}
            <Link href='/admin/users'>
              <Button variant='outline' size='sm'>
                Remove Filter
              </Button>
            </Link>
          </div>
        )}
      </div>
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>NAME</TableHead>
              <TableHead>EMAIL</TableHead>
              <TableHead>ROLE</TableHead>
              <TableHead>ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(({ id, name, email, role }) => (
              <TableRow key={id}>
                <TableCell>{formatId(id)}</TableCell>
                <TableCell>{name}</TableCell>
                <TableCell>{email}</TableCell>
                <TableCell>
                  {role === 'user' ? (
                    <Badge variant='secondary'>User</Badge>
                  ) : (
                    <Badge variant='default'>Admin</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button asChild variant='outline' size='sm'>
                    <Link href={`/admin/users/${id}`}>Edit</Link>
                  </Button>
                  <DeleteDialog id={id} action={deleteUser} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <Pagination page={Number(page) || 1} totalPages={totalPages} />
        )}
      </div>
    </div>
  );
};

export default AdminUserPage;
