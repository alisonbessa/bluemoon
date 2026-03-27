-- Add missing indexes for frequently queried columns
-- Identified via query audit: goals, income_sources, categories, recurring_bills, transactions

-- Goals: queried by budgetId, memberId, isArchived
CREATE INDEX IF NOT EXISTS idx_goals_budget_id ON goals(budget_id);
CREATE INDEX IF NOT EXISTS idx_goals_member_id ON goals(member_id);
CREATE INDEX IF NOT EXISTS idx_goals_budget_archived ON goals(budget_id, is_archived);

-- Goal contributions: queried by goalId, year+month
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_year_month ON goal_contributions(year, month);

-- Income sources: queried by budgetId, isActive, memberId
CREATE INDEX IF NOT EXISTS idx_income_sources_budget_id ON income_sources(budget_id);
CREATE INDEX IF NOT EXISTS idx_income_sources_budget_active ON income_sources(budget_id, is_active);
CREATE INDEX IF NOT EXISTS idx_income_sources_member_id ON income_sources(member_id);

-- Categories: queried by memberId for viewMode filtering
CREATE INDEX IF NOT EXISTS idx_categories_member_id ON categories(member_id);
CREATE INDEX IF NOT EXISTS idx_categories_budget_member ON categories(budget_id, member_id);

-- Recurring bills: queried by budgetId + isActive
CREATE INDEX IF NOT EXISTS idx_recurring_bills_budget_active ON recurring_bills(budget_id, is_active);

-- Transactions: composite indexes for viewMode + spending aggregation queries
CREATE INDEX IF NOT EXISTS idx_transactions_budget_member_date ON transactions(budget_id, member_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_budget_category_date ON transactions(budget_id, category_id, date);
