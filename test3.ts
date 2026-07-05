import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://xyz.supabase.co', 'xyz');

// Test 1: string with parens
const q1 = supabase.from('tasks').delete().not('id', 'in', '(a,b)');
console.log('q1:', q1.url.toString());

// Test 2: array
const q2 = supabase.from('tasks').delete().not('id', 'in', ['a','b']);
console.log('q2:', q2.url.toString());

// Test 3: in operator with array
const q3 = supabase.from('tasks').delete().in('id', ['a','b']);
console.log('q3:', q3.url.toString());
