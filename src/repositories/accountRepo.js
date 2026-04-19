import { requireSupabase } from '../lib/supabase/client';

function mapAccountAccessRow(row) {
  if (!row) {
    return {
      hasPassword: false,
      loginName: '',
    };
  }

  return {
    hasPassword: Boolean(row.has_password),
    loginName: row.login_name || '',
  };
}

export async function getAccountAccessStatus() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .rpc('get_account_access_status')
    .single();

  if (error) {
    throw error;
  }

  return mapAccountAccessRow(data);
}

export async function upsertAccountAccess({ loginName, newPassword, currentPassword }) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .rpc('upsert_account_access', {
      input_login_name: loginName,
      input_new_password: newPassword,
      input_current_password: currentPassword || null,
    })
    .single();

  if (error) {
    throw error;
  }

  return mapAccountAccessRow(data);
}

export async function restoreAccountAccess({ loginName, password }) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .rpc('restore_account_access', {
      input_login_name: loginName,
      input_password: password,
    })
    .single();

  if (error) {
    throw error;
  }

  return {
    restored: Boolean(data?.restored),
    loginName: data?.login_name || '',
  };
}
