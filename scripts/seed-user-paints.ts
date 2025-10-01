/**
 * Seed script to migrate user_info/paint_colors.json to Supabase paints table
 * Run with: npx tsx scripts/seed-user-paints.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { hexToLab, hexToRgb } from '@/lib/color-science'
import { estimateKSFromLab } from '@/lib/kubelka-munk'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface PaintColorData {
  hex: string
  name: string
  code: string
  spray?: string
  note?: string
}

async function seedUserPaints() {
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error('Not authenticated. Please login first.')
    console.log('Run: npm run auth:login')
    process.exit(1)
  }

  console.log(`Seeding paints for user: ${user.email}`)

  // Get or create default collection
  let { data: collections, error: collError } = await supabase
    .from('paint_collections')
    .select('*')
    .eq('is_default', true)
    .limit(1)

  if (collError) {
    console.error('Error fetching collections:', collError)
    process.exit(1)
  }

  let collectionId: string

  if (!collections || collections.length === 0) {
    console.log('Creating default paint collection...')
    const { data: newCollection, error: createError } = await supabase
      .from('paint_collections')
      .insert({
        name: 'My Paint Collection',
        description: 'Default paint collection',
        is_default: true,
        color_space: 'LAB'
      })
      .select()
      .single()

    if (createError || !newCollection) {
      console.error('Error creating collection:', createError)
      process.exit(1)
    }

    collectionId = newCollection.id
  } else {
    collectionId = collections[0].id
  }

  console.log(`Using collection: ${collectionId}`)

  // Read paint colors JSON
  const paintColorsPath = path.join(process.cwd(), 'user_info', 'paint_colors.json')
  const paintColorsData: PaintColorData[] = JSON.parse(fs.readFileSync(paintColorsPath, 'utf-8'))

  console.log(`Found ${paintColorsData.length} paints to import`)

  // Transform and insert paints
  const paintsToInsert = paintColorsData.map(paint => {
    const lab = hexToLab(paint.hex)
    const rgb = hexToRgb(paint.hex)
    const ks = estimateKSFromLab(lab)

    return {
      user_id: user.id,
      collection_id: collectionId,
      name: paint.name,
      brand: 'User Paint Collection',
      sku: paint.code,
      finish_type: 'matte',
      hex: paint.hex,
      lab_l: lab.l,
      lab_a: lab.a,
      lab_b: lab.b,
      rgb_r: rgb.r,
      rgb_g: rgb.g,
      rgb_b: rgb.b,
      k_coefficient: ks.K,
      s_coefficient: ks.S,
      optical_properties_calibrated: false,
      color_accuracy_verified: false,
      opacity: 0.8,
      tinting_strength: 1.0,
      drying_time_hours: 24,
      volume_ml: 100,
      cost_per_ml: 0.05,
      verification_notes: paint.note || null,
      archived: false
    }
  })

  // Insert in batches of 50
  const batchSize = 50
  let inserted = 0

  for (let i = 0; i < paintsToInsert.length; i += batchSize) {
    const batch = paintsToInsert.slice(i, i + batchSize)

    const { error: insertError } = await supabase
      .from('paints')
      .insert(batch)

    if (insertError) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError)
      continue
    }

    inserted += batch.length
    console.log(`Inserted ${inserted} / ${paintsToInsert.length} paints`)
  }

  console.log('\n✅ Paint seeding complete!')
  console.log(`Total paints inserted: ${inserted}`)
}

seedUserPaints().catch(console.error)