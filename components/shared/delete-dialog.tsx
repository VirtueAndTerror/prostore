'use client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useTransition } from 'react';

import { Trash2Icon } from 'lucide-react';

interface Props {
  id: string;
  action: (id: string) => Promise<{ success: boolean; message: string }>;
}

const DeleteDialog = ({ id, action }: Props) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const { success, message } = await action(id);

      if (!success) {
        toast({ variant: 'destructive', description: message });
      } else {
        toast({ description: message });
        setOpen(false);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant='destructive' size='sm' className='ml-2 cursor-pointer'>
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className=''>
        <AlertDialogHeader>
          <div className='flex justify-center mb-4'>
            <Trash2Icon color={'red'} size={30} />
          </div>
          <AlertDialogTitle className='text-center'>
            {' '}
            Are you sure you want to delete this order?{' '}
          </AlertDialogTitle>
          <AlertDialogDescription className='text-center'>
            {' '}
            This action cannot be undone and it will be permanently deleted{' '}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className='cursor-pointer'>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction asChild className='bg-destructive'>
            <Button
              variant={'destructive'}
              className='cursor-pointer'
              size='sm'
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteDialog;
