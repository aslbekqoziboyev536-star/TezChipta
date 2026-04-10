# Supabase Integration Guide

## Overview
TezChipta is now integrated with **Supabase** for comprehensive data management:
- **Supabase**: PostgreSQL-based backend for analytics, real-time features, and data logging

## Environment Variables

Add the following to your `.env` file:

```env
# Supabase Configuration (Frontend)
VITE_SUPABASE_URL=https://okgmaigpiqxlxlwqbtjb.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Supabase Configuration (Backend)
SUPABASE_URL=https://okgmaigpiqxlxlwqbtjb.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

## Frontend Usage

### Initialization
The Supabase client is automatically initialized in `src/lib/supabase.ts`:

```typescript
import { supabase } from './src/lib/supabase';
```

### Available Helper Functions

```typescript
// Get current authenticated user
import { getCurrentSupabaseUser } from './src/lib/supabase';
const user = await getCurrentSupabaseUser();

// Check if user is authenticated
import { isSupabaseAuthenticated } from './src/lib/supabase';
const isAuth = await isSupabaseAuthenticated();

// Sign out
import { signOutSupabase } from './src/lib/supabase';
await signOutSupabase();
```

### Direct Client Access
```typescript
import { supabase } from './src/lib/supabase';

// Query data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('id', 'value');

// Insert data
const { data, error } = await supabase
  .from('table_name')
  .insert([{ column: 'value' }]);

// Real-time updates
const subscription = supabase
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'table_name' },
    (payload) => {
      console.log('Change received!', payload);
    }
  )
  .subscribe();
```

## Backend Usage

### Logging Data to Supabase
The backend server automatically logs payment events to Supabase. Helper functions are available in `src/lib/supabaseServer.ts`:

```typescript
import { 
  logToSupabase, 
  queryFromSupabase, 
  updateSupabase, 
  deleteFromSupabase 
} from './src/lib/supabaseServer';

// Insert data
await logToSupabase('payment_logs', {
  booking_id: '123',
  user_id: 'uid',
  event: 'receipt_uploaded',
  status: 'pending_review'
});

// Query data
const results = await queryFromSupabase('payment_logs');

// Update data
await updateSupabase('payment_logs', 'id_value', { status: 'completed' });

// Delete data
await deleteFromSupabase('payment_logs', 'id_value');
```

## Available Tables

### payment_logs
Stores all payment-related events for analytics and audit trails.

**Fields:**
- `id` (UUID, auto-generated)
- `booking_id` (string)
- `user_id` (string)
- `admin_id` (string, optional)
- `event` (string) - 'receipt_uploaded', 'payment_confirmed', etc.
- `status` (string) - 'pending_review', 'paid', 'rejected', etc.
- `uploaded_at` (timestamp, optional)
- `expires_at` (timestamp, optional)
- `confirmed_at` (timestamp, optional)
- `timeout_seconds` (number, optional)
- `created_at` (timestamp, auto-generated)

## Integration Points

### Payment Upload Flow
1. User uploads payment receipt via `/api/upload-payment-receipt`
2. Data logged to Supabase `payment_logs` table
3. Admin reviews and confirms via `/api/admin/confirm-manual-payment`
4. Confirmation logged to Supabase

## Error Handling

Supabase is set up with graceful error handling:
- Errors are logged to console but don't break the operation
- All operations gracefully skip Supabase if not configured

## Benefits

✅ **Unified Database Strategy**
- Supabase: Real-time capabilities, analytics, and PostgreSQL reliability

✅ **Enhanced Analytics**
- Track all payment events in Supabase for better reporting
- Real-time payment status updates

✅ **Future-Ready**
- Easy to add real-time features (Supabase subscriptions)
- Can migrate data between databases if needed

## Troubleshooting

### Supabase Connection Errors
1. Check environment variables are correctly set
2. Verify Supabase URL and anon key in `.env`
3. Check network connectivity to `https://okgmaigpiqxlxlwqbtjb.supabase.co`

### Missing Tables
Create the required tables in Supabase dashboard:
- `payment_logs` - See schema above

### Authentication Issues
- Ensure user has necessary permissions in Supabase RLS policies
- Check that anon key is configured correctly

## Support
For issues or questions about Supabase integration, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
