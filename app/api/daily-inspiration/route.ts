import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get date from query params (user's local date)
    const { searchParams } = new URL(request.url);
    const today =
      searchParams.get("date") || new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Check if inspiration already exists for today
    const { data: existing, error: existingError } = await supabase
      .from("daily_inspirations")
      .select("*")
      .eq("date", today)
      .single();

    console.log("Checking for existing inspiration for date:", today);
    console.log("Found existing:", existing ? "YES" : "NO");
    if (existingError) {
      console.log("Error checking existing:", existingError);
    }

    if (existing) {
      console.log("Returning existing inspiration:", existing.id);
      const response = NextResponse.json(existing);
      // Prevent caching to ensure fresh data each day
      response.headers.set("Cache-Control", "no-store, max-age=0");
      return response;
    }

    console.log("No existing inspiration found, generating new one...");

    // Double-check one more time to handle race conditions
    const { data: doubleCheck } = await supabase
      .from("daily_inspirations")
      .select("*")
      .eq("date", today)
      .single();

    if (doubleCheck) {
      console.log(
        "Double-check found existing inspiration (race condition avoided):",
        doubleCheck.id
      );
      const response = NextResponse.json(doubleCheck);
      response.headers.set("Cache-Control", "no-store, max-age=0");
      return response;
    }

    // Fetch last 30 days of inspirations to avoid repeats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentInspirations } = await supabase
      .from("daily_inspirations")
      .select("motivational_quote, productivity_tip")
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: false })
      .limit(30);

    // Build context of recent inspirations to avoid
    const recentContext =
      recentInspirations && recentInspirations.length > 0
        ? `\n\nRECENT INSPIRATIONS FROM THE LAST 30 DAYS (DO NOT REPEAT THEMES, AUTHORS, OR SIMILAR CONTENT):\n${recentInspirations
            .map(
              (r, i) =>
                `Day ${i + 1}:\n- Quote: ${r.motivational_quote}\n- Tip: ${
                  r.productivity_tip
                }`
            )
            .join(
              "\n\n"
            )}\n\nGenerate something COMPLETELY DIFFERENT from the above.`
        : "";

    // Generate new inspiration using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a highly creative motivational coach and productivity expert. Generate diverse, inspiring, and practical content for people managing their daily tasks. Vary your style significantly - be philosophical, tactical, humorous, stoic, energetic, or zen. Draw from different cultures, time periods, and schools of thought.",
        },
        {
          role: "user",
          content: `${recentContext}

Generate a unique daily inspiration package containing:
1. A motivational quote - vary your approach each time:
   - Famous quotes from diverse sources (entrepreneurs, artists, athletes, philosophers, scientists, writers from different eras and cultures)
   - Original insights about productivity, creativity, resilience, or human nature
   - Unexpected wisdom from unusual sources
   - Modern takes on ancient wisdom
   Keep it under 120 characters.

2. A practical productivity tip with an emoji at the start:
   - Be highly specific and actionable
   - Vary the domain: time management, focus, energy, creativity, habits, mindset, tools, environment, communication, decision-making
   - Mix tactical with strategic, urgent with important
   - Include unconventional or counterintuitive tips
   Keep it under 150 characters.

Maximize variety and avoid repetition. Each day should feel distinctly different.

Respond in JSON format:
{
  "motivational_quote": "Your quote here — Author Name",
  "productivity_tip": "🎯 Your tip here"
}`,
        },
      ],
      temperature: 1.2,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated");
    }

    const inspiration = JSON.parse(content);

    // Store in database
    console.log("Attempting to insert inspiration for date:", today);
    const { data: newInspiration, error: insertError } = await supabase
      .from("daily_inspirations")
      .insert({
        date: today,
        motivational_quote: inspiration.motivational_quote,
        productivity_tip: inspiration.productivity_tip,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting inspiration:", insertError);
      console.error(
        "Insert error details:",
        JSON.stringify(insertError, null, 2)
      );

      // If it's a duplicate key error, fetch and return the existing record
      if (insertError.code === "23505") {
        console.log("Duplicate detected, fetching existing record...");
        const { data: existingRecord } = await supabase
          .from("daily_inspirations")
          .select("*")
          .eq("date", today)
          .single();

        if (existingRecord) {
          console.log(
            "Returning existing record after duplicate error:",
            existingRecord.id
          );
          const response = NextResponse.json(existingRecord);
          response.headers.set("Cache-Control", "no-store, max-age=0");
          return response;
        }
      }

      // For other errors, return the generated content even if we can't save it
      return NextResponse.json({
        date: today,
        ...inspiration,
        _saved: false,
        _error: insertError.message,
      });
    }

    console.log(
      "Successfully saved inspiration to database:",
      newInspiration.id
    );
    const response = NextResponse.json(newInspiration);
    // Prevent caching to ensure fresh data each day
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error: any) {
    console.error("Error generating daily inspiration:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate daily inspiration" },
      { status: 500 }
    );
  }
}
