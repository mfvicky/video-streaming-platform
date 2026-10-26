import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';

export const sessionQueryKey = ['auth', 'session'] as const;
export const useSession = () => useQuery({
  queryKey: sessionQueryKey,
  queryFn: authApi.session,
  staleTime: 60_000,
  retry: false,
});
