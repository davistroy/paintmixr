#!/usr/bin/env node
/**
 * Seed Paints Direct Script
 * Generates SQL INSERT statements and applies them via Supabase
 */

import { hexToLab } from '../src/lib/color-science.js';
import paintColorsData from '../user_info/paint_colors.json' assert { type: 'json' };

interface UserPaint {
  hex: string;
  name: string;
  code: string;
  spray: string;
  note?: string;
}

function estimateKubelkaMunk(lab: { l: number; a: number; b: number }) {
  const lightness = lab.l / 100;
  const k = Math.max(0.02, 1.0 - lightness * 0.8);
  const s = Math.max(0.08, lightness * 0.9);
  return { k, s };
}

function estimateOpacity(lab: { l: number; a: number; b: number }) {
  const lightness = lab.l / 100;
  return Math.max(0.45, 0.95 - lightness * 0.3);
}

function estimateTintingStrength(lab: { l: number; a: number; b: number }) {
  const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  return Math.max(0.3, Math.min(0.95, (chroma / 100) + 0.5));
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function generateInsertSQL(userEmail: string): string {
  const paints = paintColorsData as UserPaint[];

  let sql = `-- Seed paints for ${userEmail}\n`;
  sql += `-- First, get the user ID\n`;
  sql += `DO $$\n`;
  sql += `DECLARE\n`;
  sql += `  v_user_id UUID;\n`;
  sql += `BEGIN\n`;
  sql += `  -- Get user ID from auth.users\n`;
  sql += `  SELECT id INTO v_user_id FROM auth.users WHERE email = '${escapeSQL(userEmail)}';\n\n`;
  sql += `  IF v_user_id IS NULL THEN\n`;
  sql += `    RAISE EXCEPTION 'User not found: ${escapeSQL(userEmail)}';\n`;
  sql += `  END IF;\n\n`;
  sql += `  -- Delete existing paints for this user (if any)\n`;
  sql += `  DELETE FROM paints WHERE user_id = v_user_id;\n\n`;
  sql += `  -- Insert paints\n`;

  paints.forEach((paint, idx) => {
    const lab = hexToLab(paint.hex);
    const km = estimateKubelkaMunk(lab);
    const opacity = estimateOpacity(lab);
    const tintingStrength = estimateTintingStrength(lab);

    const metadata = {
      code: paint.code,
      spray_code: paint.spray,
      ...(paint.note && { note: paint.note })
    };

    sql += `  INSERT INTO paints (user_id, name, brand, hex_color, lab_color, opacity, tinting_strength, kubelka_munk, metadata)\n`;
    sql += `  VALUES (\n`;
    sql += `    v_user_id,\n`;
    sql += `    '${escapeSQL(paint.name)}',\n`;
    sql += `    'Code ${escapeSQL(paint.code)}',\n`;
    sql += `    '${paint.hex}',\n`;
    sql += `    '{"l": ${lab.l.toFixed(2)}, "a": ${lab.a.toFixed(2)}, "b": ${lab.b.toFixed(2)}}'::jsonb,\n`;
    sql += `    ${opacity.toFixed(4)},\n`;
    sql += `    ${tintingStrength.toFixed(4)},\n`;
    sql += `    '{"k": ${km.k.toFixed(4)}, "s": ${km.s.toFixed(4)}}'::jsonb,\n`;
    sql += `    '${JSON.stringify(metadata)}'::jsonb\n`;
    sql += `  );\n\n`;
  });

  sql += `  RAISE NOTICE 'Successfully inserted % paints for user %', ${paints.length}, '${escapeSQL(userEmail)}';\n`;
  sql += `END $$;\n`;

  return sql;
}

const userEmail = process.argv[2] || 'troy@k4jda.com';
const sql = generateInsertSQL(userEmail);

console.log(sql);
