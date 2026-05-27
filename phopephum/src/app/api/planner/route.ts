import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

export const runtime = 'edge'

// Schema สำหรับ Validate ข้อมูลเข้า
const taskSchema = z.object({
  taskTitle: z.string().min(1, 'Task title is required'),
  horaSlotIndex: z.number().min(1).max(8),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
})

const updateTaskStatusSchema = z.object({
  id: z.string().uuid(),
  isCompleted: z.boolean(),
})

const journalSchema = z.object({
  journalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  energyRating: z.number().min(1).max(5).optional(),
  journalContent: z.string().optional(),
  affirmationReceived: z.string().optional(),
})

// 1. GET /api/planner — ดึงข้อมูลการวางแผนและวารสารตามวัน
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // ดึงแผนงานประจำวัน
    const { data: tasks, error: tasksError } = await supabase
      .from('planner_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('scheduled_date', date)
      .order('hora_slot_index', { ascending: true })

    if (tasksError) {
      console.error('[/api/planner] Fetch tasks error:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    // ดึงบันทึกวารสารประจำวัน
    const { data: journal, error: journalError } = await supabase
      .from('user_journals')
      .select('*')
      .eq('user_id', user.id)
      .eq('journal_date', date)
      .maybeSingle()

    if (journalError) {
      console.error('[/api/planner] Fetch journal error:', journalError)
    }

    return NextResponse.json({
      success: true,
      data: {
        tasks: tasks.map(t => ({
          id: t.id,
          taskTitle: t.task_title,
          horaSlotIndex: t.hora_slot_index,
          isCompleted: t.is_completed,
          scheduledDate: t.scheduled_date
        })),
        journal: journal ? {
          id: journal.id,
          journalDate: journal.journal_date,
          energyRating: journal.energy_rating,
          journalContent: journal.journal_content,
          affirmationReceived: journal.affirmation_received
        } : null
      }
    })
  } catch (error) {
    console.error('[/api/planner] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 2. POST /api/planner — สร้าง Task ใหม่ หรือสร้าง/บันทึก Journal
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type } = body // 'task' หรือ 'journal'

    if (type === 'task') {
      const parsed = taskSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
      }

      const { taskTitle, horaSlotIndex, scheduledDate } = parsed.data

      const { data: task, error: taskError } = await supabase
        .from('planner_tasks')
        .insert({
          user_id: user.id,
          task_title: taskTitle,
          hora_slot_index: horaSlotIndex,
          scheduled_date: scheduledDate,
          is_completed: false
        })
        .select()
        .single()

      if (taskError) {
        console.error('[/api/planner] Insert task error:', taskError)
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: {
          id: task.id,
          taskTitle: task.task_title,
          horaSlotIndex: task.hora_slot_index,
          isCompleted: task.is_completed,
          scheduledDate: task.scheduled_date
        }
      })
    } else if (type === 'journal') {
      const parsed = journalSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
      }

      const { journalDate, energyRating, journalContent, affirmationReceived } = parsed.data

      // ค้นหาว่ามี journal ของวันนี้หรือยังเพื่อทำการ Upsert
      const { data: existingJournal } = await supabase
        .from('user_journals')
        .select('id')
        .eq('user_id', user.id)
        .eq('journal_date', journalDate)
        .maybeSingle()

      let resultData
      if (existingJournal) {
        const { data: updated, error: updateError } = await supabase
          .from('user_journals')
          .update({
            energy_rating: energyRating,
            journal_content: journalContent,
            affirmation_received: affirmationReceived,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingJournal.id)
          .select()
          .single()

        if (updateError) throw updateError
        resultData = updated
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('user_journals')
          .insert({
            user_id: user.id,
            journal_date: journalDate,
            energy_rating: energyRating,
            journal_content: journalContent,
            affirmation_received: affirmationReceived
          })
          .select()
          .single()

        if (insertError) throw insertError
        resultData = inserted
      }

      return NextResponse.json({
        success: true,
        data: {
          id: resultData.id,
          journalDate: resultData.journal_date,
          energyRating: resultData.energy_rating,
          journalContent: resultData.journal_content,
          affirmationReceived: resultData.affirmation_received
        }
      })
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
  } catch (error) {
    console.error('[/api/planner] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 3. PUT /api/planner — อัปเดตสถานะของ Task
export async function PUT(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = updateTaskStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { id, isCompleted } = parsed.data

    const { data: task, error: taskError } = await supabase
      .from('planner_tasks')
      .update({
        is_completed: isCompleted,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // ปลอดภัย 2 ชั้น เช็คสิทธิ์ในระดับ query
      .select()
      .single()

    if (taskError) {
      console.error('[/api/planner] Update task error:', taskError)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: task.id,
        taskTitle: task.task_title,
        horaSlotIndex: task.hora_slot_index,
        isCompleted: task.is_completed,
        scheduledDate: task.scheduled_date
      }
    })
  } catch (error) {
    console.error('[/api/planner] PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 4. DELETE /api/planner — ลบ Task
export async function DELETE(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    const { error: taskError } = await supabase
      .from('planner_tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (taskError) {
      console.error('[/api/planner] Delete task error:', taskError)
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[/api/planner] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
