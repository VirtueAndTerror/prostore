import { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth-guard';
import { notFound } from 'next/navigation';
import { getUserById } from '@/lib/actions';
import UpdateUserForm from './update-user-form';

export const metadata: Metadata = {
  title: 'Admin Update User',
  description: 'Update user details'
};

interface Props {
  params: Promise<{ id: string }>;
}

const AdminUserUpdatePage = async (props: Props) => {
  await requireAdmin();

  const { id } = await props.params;

  const user = await getUserById(id);

  if (!user) return notFound();

// Ensure email is always a string for the form (DB may return null)
const formUser = { ...user, email: user.email ?? '' };
  

  console.info(user);

  return (
    <div className='space-y-8 max-w-lg mx-auto'>
      <h1 className='h2-bold'>User Update</h1>
      <UpdateUserForm user={formUser} />
    </div>
  );
};

export default AdminUserUpdatePage;
