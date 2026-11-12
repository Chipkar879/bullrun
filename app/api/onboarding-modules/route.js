import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// How many modules a student must finish before sign-in lands on the simulator.
const REQUIRED_MODULES = 2;

export async function GET() {
  const dataDir = path.join(process.cwd(), 'app', 'data');
  const required = [];
  let modulesFound = 0;

  for (let n = 1; n <= 5 && modulesFound < REQUIRED_MODULES; n++) {
    const filePath = path.join(dataDir, `Mod_${n}.txt`);
    if (!fs.existsSync(filePath)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const mods = Array.isArray(parsed) ? parsed : [parsed];
      for (const mod of mods) {
        if (modulesFound >= REQUIRED_MODULES) break;
        modulesFound++;
        for (const sm of mod.submodules || []) required.push(sm.id);
      }
    } catch (err) {
      console.error('onboarding-modules: could not read Mod_' + n + '.txt', err);
    }
  }

  return NextResponse.json({ required }, { headers: { 'Cache-Control': 'no-store' } });
}