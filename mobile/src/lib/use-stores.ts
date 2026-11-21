import { api } from './api';
import { useRequest } from './use-request';

/** Every shop with its products, shared by the Shop tab, shop pages and product pages. */
export function useStores() {
  return useRequest((fresh) => api.stores(fresh), ['stores']);
}
