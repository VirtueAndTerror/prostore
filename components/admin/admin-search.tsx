// This is a Client Component - uses browser APIs and React hooks
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Input } from '../ui/input';

/**
 * AdminSearch Component
 *
 * Provides a search bar for admin pages that dynamically routes search queries
 * to the appropriate admin section (orders, users, or products).
 */
const AdminSearch = () => {
  // Get the current page pathname to determine which section is being searched
  const pathname = usePathname();

  // Determine the form submission URL based on current admin section
  const formActionUrl = pathname.includes('/admin/orders')
    ? '/admin/orders'
    : pathname.includes('/admin/users')
      ? '/admin/users'
      : '/admin/products';

  // Retrieve current query parameters from URL
  const searchParams = useSearchParams();

  // Manage the search input value, initializing with existing query param if present
  const [queryValue, setQueryValue] = useState(searchParams.get('query') || '');

  // Sync input value with URL search parameters when they change
  // This ensures the input reflects the current search query
  useEffect(() => {
    setQueryValue(searchParams.get('query') || '');
  }, [searchParams]);

  return (
    // Form submits as GET request to maintain search state in URL
    <form action={formActionUrl} method='GET'>
      {/* Search input field with responsive sizing */}
      <Input
        type='search'
        placeholder='Search ...'
        name='query'
        value={queryValue}
        onChange={(e) => setQueryValue(e.target.value)}
        className='md:w-25 lg:w-75'
      />

      {/* Hidden submit button - form can be submitted via keyboard or programmatically */}
      <button className='sr-only' type='submit'>
        Search
      </button>
    </form>
  );
};

export default AdminSearch;
