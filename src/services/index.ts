/**
 * Services Index
 *
 * Central export point for all application services.
 * Services handle API mutations (create/update/delete).
 * For data fetching, use SWR hooks in @/shared/hooks/data/
 */

export { budgetService } from './budget.service';
export { goalService } from './goal.service';
export { transactionService } from './transaction.service';
