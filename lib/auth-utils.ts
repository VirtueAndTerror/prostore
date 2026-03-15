import { auth } from '@/auth';

export async function requireAuthenticatedUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error('User not authenticated');
  return userId;
}
