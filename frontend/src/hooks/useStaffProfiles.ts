import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface StaffProfile {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'billing';
}

/**
 * Fetches all staff profiles from the API.
 * Used to populate terminal/operator filter dropdowns dynamically
 * so new cashiers are immediately visible without code changes.
 */
export const useStaffProfiles = () => {
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await apiClient.get('/auth/users');
        if (res.data.status === 'success') {
          setProfiles(res.data.data as StaffProfile[]);
        }
      } catch {
        // Silently fail — dropdown will just show "All Terminals" only
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  return { profiles, isLoading };
};
