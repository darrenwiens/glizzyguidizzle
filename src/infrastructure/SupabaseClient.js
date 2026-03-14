import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

/** Fetch all locations from cantire_loc (paginated to handle >1000 rows) */
export async function fetchAllLocations() {
  const pageSize = 1000;
  let allData = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('cantire_loc')
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Failed to load locations: ${error.message}`);
    }

    allData = allData.concat(data);

    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Loaded ${allData.length} locations`);
  return allData;
}

/** Update a location's inspection result */
export async function updateInspection(locationId, { standStatus, standBbox, standView }) {
  const updates = { stand_status: standStatus };
  if (standBbox !== undefined) updates.stand_bbox = standBbox;
  if (standView !== undefined) updates.stand_view = standView;

  const { data, error } = await supabase
    .from('cantire_loc')
    .update(updates)
    .eq('id', locationId)
    .select();

  if (error) {
    throw new Error(`Failed to save inspection: ${error.message}`);
  }
  return data?.[0];
}
