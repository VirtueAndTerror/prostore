'use client';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { z } from 'zod';
import { updateUserSchema } from '@/lib';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { USER_ROLES } from '@/lib/constants';
import { updateUser } from '@/lib/actions';
import type { UpdateUser } from '@/types';

interface Props {
  user: UpdateUser;
}

const UpdateUserForm = ({ user }: Props) => {
  const router = useRouter();

  const { toast } = useToast();

  const form = useForm<UpdateUser>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: user,
  });

  const {
    control,
    formState: { isSubmitting },
    handleSubmit,
    reset,
  } = form;

  const onSubmit = async (values: UpdateUser) => {
    try {
      const { success, message } = await updateUser({ ...values, id: user.id });

      if (!success)
        return toast({
          title: 'Error',
          variant: 'destructive',
          description: message,
        });

      toast({
        title: 'Updated',
        description: 'User updated successfully',
      });

      reset();
      router.push('/admin/users');
    } catch (error) {
      toast({
        title: 'Error',
        variant: 'destructive',
        description: (error as Error).message,
      });
    }
  };

  return (
    <Form {...form}>
      <form method='POST' onSubmit={handleSubmit(onSubmit)}>
        {/* Email */}
        <div>
          <FormField
            control={control}
            name='email'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input readOnly placeholder='Enter user email' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Name */}
        <div>
          <FormField
            control={control}
            name='name'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder='Enter user name' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Role */}
        <div>
          <FormField
            control={control}
            name='role'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select role' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>
        <div className='pt-4'>
          <Button
            type='submit'
            disabled={isSubmitting}
            className='hover:cursor-pointer'
          >
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default UpdateUserForm;
