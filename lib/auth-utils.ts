import { auth } from '@/auth';

export async function getAuthenticatedUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error('User not authenticated');
  return userId;
}
