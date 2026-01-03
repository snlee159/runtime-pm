import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // Check if inspiration already exists for today
    const { data: existing } = await supabase
      .from('daily_inspirations')
      .select('*')
      .eq('date', today)
      .single()

    if (existing) {
      return NextResponse.json(existing)
    }

    // Generate new inspiration using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a motivational coach and productivity expert. Generate inspiring and practical content for people managing their daily tasks.',
        },
        {
          role: 'user',
          content: `Generate a daily inspiration package containing:
1. A motivational quote (can be from a famous person or an original insight about productivity, focus, achievement, or personal growth). Keep it under 120 characters.
2. A practical productivity tip with an emoji at the start. Make it actionable and specific. Keep it under 150 characters.

Respond in JSON format:
{
  "motivational_quote": "Your quote here — Author Name",
  "productivity_tip": "🎯 Your tip here"
}`,
        },
      ],
      temperature: 0.9,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('No content generated')
    }

    const inspiration = JSON.parse(content)

    // Store in database
    console.log('Attempting to insert inspiration for date:', today)
    const { data: newInspiration, error: insertError } = await supabase
      .from('daily_inspirations')
      .insert({
        date: today,
        motivational_quote: inspiration.motivational_quote,
        productivity_tip: inspiration.productivity_tip,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting inspiration:', insertError)
      console.error('Insert error details:', JSON.stringify(insertError, null, 2))
      // Return the generated content even if we can't save it
      return NextResponse.json({
        date: today,
        ...inspiration,
        _saved: false,
        _error: insertError.message
      })
    }

    console.log('Successfully saved inspiration to database:', newInspiration.id)
    return NextResponse.json(newInspiration)
  } catch (error: any) {
    console.error('Error generating daily inspiration:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate daily inspiration' },
      { status: 500 }
    )
  }
}

