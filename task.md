# Tasks for Pro Statistics Refactoring

- [ ] Create `src/pages/Statistics/hooks/useAnalytics.ts` (Firestore optimization with limit/orderBy, aggregation logic)
- [ ] Create backend endpoint `/api/ai-analysis` in `server.ts`
- [ ] Create `src/pages/Statistics/hooks/useAIAnalysis.ts` (Backend call + LocalStorage caching)
- [ ] Create `src/pages/Statistics/components/StatsCards.tsx`
- [ ] Create `src/pages/Statistics/components/AIBox.tsx`
- [ ] Create `src/pages/Statistics/components/Chart.tsx`
- [ ] Create `src/pages/Statistics/components/EmptyState.tsx` and Skeletons
- [ ] Create `src/pages/Statistics/StatisticsPage.tsx` integrating all above
- [ ] Update `App.tsx` to use the new `StatisticsPage` and delete old `Statistics.tsx`
