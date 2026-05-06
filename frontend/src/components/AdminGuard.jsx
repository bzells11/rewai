import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { apiFetch } from '../lib/supabase';

export default function AdminGuard({ children }) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch('/users/me'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile?.is_admin) return <Navigate to="/dashboard" replace />;

  return children;
}
