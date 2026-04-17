import "dotenv/config";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration not found. Supabase integration will be skipped.');
}

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Log payment events to Supabase
 * @param tableName - The table name in Supabase
 * @param data - The data to insert
 */
export async function logToSupabase(tableName: string, data: any) {
  if (!supabase) {
    console.warn('Supabase not configured, skipping Supabase logging');
    return null;
  }

  try {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert([data]);

    if (error) {
      console.error(`Error logging to Supabase table ${tableName}:`, error);
      return null;
    }

    console.log(`Successfully logged to Supabase ${tableName}:`, result);
    return result;
  } catch (err) {
    console.error(`Failed to log to Supabase ${tableName}:`, err);
    return null;
  }
}

/**
 * Query data from Supabase
 * @param tableName - The table name in Supabase
 * @param options - Query options (select, filter, etc.)
 */
export async function queryFromSupabase(
  tableName: string,
  options?: { select?: string; filter?: { key: string; value: any } }
) {
  if (!supabase) {
    console.warn('Supabase not configured, skipping Supabase query');
    return null;
  }

  try {
    let query = supabase.from(tableName).select(options?.select || '*');

    if (options?.filter) {
      query = query.eq(options.filter.key, options.filter.value);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error querying Supabase table ${tableName}:`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Failed to query Supabase ${tableName}:`, err);
    return null;
  }
}

/**
 * Update data in Supabase
 * @param tableName - The table name in Supabase
 * @param id - The record ID
 * @param data - The data to update
 */
export async function updateSupabase(tableName: string, id: string, data: any) {
  if (!supabase) {
    console.warn('Supabase not configured, skipping Supabase update');
    return null;
  }

  try {
    const { data: result, error } = await supabase
      .from(tableName)
      .update(data)
      .eq('id', id);

    if (error) {
      console.error(`Error updating Supabase table ${tableName}:`, error);
      return null;
    }

    console.log(`Successfully updated Supabase ${tableName}:`, result);
    return result;
  } catch (err) {
    console.error(`Failed to update Supabase ${tableName}:`, err);
    return null;
  }
}

/**
 * Delete data from Supabase
 * @param tableName - The table name in Supabase
 * @param id - The record ID
 */
export async function deleteFromSupabase(tableName: string, id: string) {
  if (!supabase) {
    console.warn('Supabase not configured, skipping Supabase delete');
    return null;
  }

  try {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting from Supabase table ${tableName}:`, error);
      return null;
    }

    console.log(`Successfully deleted from Supabase ${tableName}`);
    return true;
  } catch (err) {
    console.error(`Failed to delete from Supabase ${tableName}:`, err);
    return null;
  }
}

export default supabase;
