import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const registryPath = path.join(process.cwd(), '..', '.devin', 'agents.json');
    
    if (!fs.existsSync(registryPath)) {
      const altPath = path.join(process.cwd(), '.devin', 'agents.json');
      if (fs.existsSync(altPath)) {
        const data = fs.readFileSync(altPath, 'utf-8');
        return NextResponse.json(JSON.parse(data));
      }
      
      return NextResponse.json(
        { error: 'Agents registry not found' },
        { status: 404 }
      );
    }
    
    const data = fs.readFileSync(registryPath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('Failed to read agents registry:', error);
    return NextResponse.json(
      { error: 'Failed to read agents registry' },
      { status: 500 }
    );
  }
}
