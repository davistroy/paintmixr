#!/usr/bin/env tsx
/**
 * Seed Paints Script
 *
 * Converts paints from user_info/paint_colors.json to Supabase database format
 * and inserts them for a specific user.
 *
 * Usage: npx tsx scripts/seed-paints.ts <user-email>
 */

import { createClient } from '@supabase/supabase-js';
import { hexToLab } from '../src/lib/color-science';
import paintColorsData from '../user_info/paint_colors.json';

// Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface UserPaint {
  hex: string;
  name: string;
  code: string;
  spray: string;
  note?: string;
}

/**
 * Estimate Kubelka-Munk coefficients based on LAB color
 */
function estimateKubelkaMunk(lab: { l: number; a: number; b: number }) {
  const lightness = lab.l / 100;

  // Base K coefficient: darker colors absorb more light
  const k = Math.max(0.02, 1.0 - lightness * 0.8);

  // Base S coefficient: lighter colors scatter more light
  const s = Math.max(0.08, lightness * 0.9);

  return { k, s };
}

/**
 * Estimate opacity based on lightness
 */
function estimateOpacity(lab: { l: number; a: number; b: number }) {
  const lightness = lab.l / 100;
  return Math.max(0.45, 0.95 - lightness * 0.3);
}

/**
 * Estimate tinting strength based on chroma
 */
function estimateTintingStrength(lab: { l: number; a: number; b: number }) {
  const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  return Math.max(0.3, Math.min(0.95, (chroma / 100) + 0.5));
}

/**
 * Convert user paint to database format
 */
function convertPaintToDbFormat(paint: UserPaint, userId: string) {
  const lab = hexToLab(paint.hex);
  const kubelkaMunk = estimateKubelkaMunk(lab);
  const opacity = estimateOpacity(lab);
  const tintingStrength = estimateTintingStrength(lab);

  return {
    user_id: userId,
    name: paint.name,
    brand: `Code ${paint.code}`,
    hex_color: paint.hex,
    lab_color: {
      l: lab.l,
      a: lab.a,
      b: lab.b
    },
    opacity,
    tinting_strength: tintingStrength,
    kubelka_munk: {
      k: kubelkaMunk.k,
      s: kubelkaMunk.s
    },
    metadata: {
      code: paint.code,
      spray_code: paint.spray,
      ...(paint.note && { note: paint.note })
    }
  };
}

async function main() {
  const userEmail = process.argv[2];

  if (!userEmail) {
    console.error('Usage: npx tsx scripts/seed-paints.ts <user-email>');
    process.exit(1);
  }

  console.log(`🔍 Looking up user: ${userEmail}`);

  // Get user ID from email
  const { data: userData, error: userError } = await supabase.auth.admin.listUsers();

  if (userError) {
    console.error('Error fetching users:', userError);
    process.exit(1);
  }

  const user = userData.users.find(u => u.email === userEmail);

  if (!user) {
    console.error(`Error: User not found with email ${userEmail}`);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);

  // Check if user already has paints
  const { data: existingPaints, error: checkError } = await supabase
    .from('paints')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (checkError) {
    console.error('Error checking existing paints:', checkError);
    process.exit(1);
  }

  if (existingPaints && existingPaints.length > 0) {
    console.log('⚠️  User already has paints in database. Delete existing paints? (y/n)');
    console.log('   Press Ctrl+C to cancel or modify script to handle this case');
    process.exit(0);
  }

  console.log(`📦 Converting ${paintColorsData.length} paints from JSON...`);

  const paintsToInsert = (paintColorsData as UserPaint[]).map(paint =>
    convertPaintToDbFormat(paint, user.id)
  );

  console.log(`💾 Inserting ${paintsToInsert.length} paints into database...`);

  // Insert in batches of 100 to avoid timeout
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < paintsToInsert.length; i += batchSize) {
    const batch = paintsToInsert.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('paints')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      process.exit(1);
    }

    inserted += data?.length || 0;
    console.log(`  ✓ Inserted batch ${i / batchSize + 1}: ${data?.length || 0} paints`);
  }

  console.log(`\n✅ Successfully inserted ${inserted} paints for ${userEmail}`);
  console.log(`🎨 User can now use Enhanced Accuracy Mode with their paint collection`);
}

main().catch(console.error);
