import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://xyz.supabase.co', 'xyz');

const ids = ['abc'];
const q1 = supabase.from('tasks').delete().not('id', 'in', `(${ids.join(",")})`);
console.log('q1 (one item):', q1.url.toString());

const ids2 = ['abc', 'def'];
const q2 = supabase.from('tasks').delete().not('id', 'in', `(${ids2.join(",")})`);
console.log('q2 (two items):', q2.url.toString());
