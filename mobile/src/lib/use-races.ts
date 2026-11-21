import { api } from './api';
import { useRequest } from './use-request';

/** The full race list plus today's date (Ghana), shared by every screen. */
export function useRaces() {
  return useRequest((fresh) => api.events(fresh), ['events']);
}
