import { NextResponse } from 'next/server'
import { calculateHora } from '@/engine/phopephum-calculator'

export const runtime = 'edge'

// POST /api/calculate/hora
// Body: { date: string, time?: string }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { date, time } = body

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    const currentTime = time ? new Date(`${date}T${time}`) : undefined
    const result = calculateHora({ date: dateObj, currentTime })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[/api/calculate/hora]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
