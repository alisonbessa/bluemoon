/**
 * SWR Utilities
 * Centralized exports for SWR-related utilities
 */

export {
  fetcher,
  postFetcher,
  FetchError,
  isFetchError,
  getErrorMessage,
} from './fetcher';

export {
  optimisticMutate,
  createOptimisticAdd,
  createOptimisticUpdate,
  createOptimisticDelete,
} from './optimistic';
