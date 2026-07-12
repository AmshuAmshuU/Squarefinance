'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../utils/auth';

const AuthGuard = ({ children, roles = [] }) => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    if (!isAuthenticated()) {
      router.replace('/admin/login');
      return;
    }
    setAuthorized(true);
  }, []); // Empty dependency array - only run once on mount

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-500 font-medium">Loading...</div>
      </div>
    );
  }

  return children;
};

export default AuthGuard;
