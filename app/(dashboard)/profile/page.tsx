"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(data);
    } catch (err: any) {
      console.error("Error loading profile:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          full_name: profile.full_name,
          role: profile.role,
          work_style: profile.work_style,
          typical_work_hours: profile.typical_work_hours,
          primary_goals: profile.primary_goals,
          secondary_goals: profile.secondary_goals,
          preferred_task_duration: profile.preferred_task_duration,
          deep_work_preference: profile.deep_work_preference,
          multitasking_comfort: profile.multitasking_comfort,
          break_frequency: profile.break_frequency,
          peak_energy_time: profile.peak_energy_time,
          low_energy_time: profile.low_energy_time,
          context_switch_tolerance: profile.context_switch_tolerance,
          planning_style: profile.planning_style,
          overcommitment_tendency: profile.overcommitment_tendency,
          current_challenges: profile.current_challenges,
          tools_used: profile.tools_used,
          team_size: profile.team_size,
          timezone: profile.timezone,
        })
        .eq("user_id", profile.user_id);

      if (updateError) throw updateError;

      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Auto-resize textarea based on content
  const autoResize = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    element.style.height = element.scrollHeight + "px";
  };

  const updateProfile = (field: keyof UserProfile, value: any) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-zinc-400">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">No profile found</p>
          <button
            onClick={() => router.push("/auth/onboarding")}
            className="px-4 py-2 bg-white text-black rounded-lg hover:bg-zinc-200"
          >
            Complete Onboarding
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Your Profile</h1>
        <p className="text-zinc-400">
          This information helps personalize your planning experience
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-3 bg-green-950/50 border border-green-900 rounded-lg text-green-400 text-sm">
          {successMessage}
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => updateProfile("full_name", e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Role / What You Do
              </label>
              <input
                type="text"
                value={profile.role}
                onChange={(e) => updateProfile("role", e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Work Style
              </label>
              <textarea
                value={profile.work_style}
                onChange={(e) => {
                  updateProfile("work_style", e.target.value);
                  autoResize(e.target);
                }}
                onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                ref={(el) => el && autoResize(el)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 resize-none overflow-hidden"
                style={{ minHeight: "60px" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Typical Work Hours per Day
              </label>
              <input
                type="number"
                min="1"
                max="24"
                step="0.5"
                value={profile.typical_work_hours || ""}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  updateProfile("typical_work_hours", isNaN(value) ? 8 : value);
                }}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Team Size
              </label>
              <select
                value={profile.team_size || ""}
                onChange={(e) => updateProfile("team_size", e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="">Not specified</option>
                <option value="solo">Working solo</option>
                <option value="small">Small team (2-5)</option>
                <option value="medium">Medium team (6-15)</option>
                <option value="large">Large team (16+)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Goals & Challenges
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Primary Goals
              </label>
              <textarea
                value={profile.primary_goals}
                onChange={(e) => {
                  updateProfile("primary_goals", e.target.value);
                  autoResize(e.target);
                }}
                onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                ref={(el) => el && autoResize(el)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 resize-none overflow-hidden"
                style={{ minHeight: "80px" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Secondary Goals
              </label>
              <textarea
                value={profile.secondary_goals || ""}
                onChange={(e) => {
                  updateProfile("secondary_goals", e.target.value);
                  autoResize(e.target);
                }}
                onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                ref={(el) => el && autoResize(el)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 resize-none overflow-hidden"
                style={{ minHeight: "60px" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Current Challenges
              </label>
              <textarea
                value={profile.current_challenges || ""}
                onChange={(e) => {
                  updateProfile("current_challenges", e.target.value);
                  autoResize(e.target);
                }}
                onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                ref={(el) => el && autoResize(el)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600 resize-none overflow-hidden"
                style={{ minHeight: "60px" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Tools & Technologies
              </label>
              <input
                type="text"
                value={profile.tools_used || ""}
                onChange={(e) => updateProfile("tools_used", e.target.value)}
                placeholder="e.g., React, Python, Figma"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              />
            </div>
          </div>
        </div>

        {/* Work Preferences */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Work Preferences
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Peak Energy Time
              </label>
              <select
                value={profile.peak_energy_time}
                onChange={(e) =>
                  updateProfile("peak_energy_time", e.target.value)
                }
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Low Energy Time
              </label>
              <select
                value={profile.low_energy_time}
                onChange={(e) =>
                  updateProfile("low_energy_time", e.target.value)
                }
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Deep Work Preference
              </label>
              <select
                value={profile.deep_work_preference}
                onChange={(e) =>
                  updateProfile("deep_work_preference", e.target.value)
                }
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Preferred Task Duration
              </label>
              <select
                value={profile.preferred_task_duration || 60}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  updateProfile(
                    "preferred_task_duration",
                    isNaN(value) ? 60 : value
                  );
                }}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="25">25 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
                <option value="120">120 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Break Frequency
              </label>
              <select
                value={profile.break_frequency}
                onChange={(e) =>
                  updateProfile("break_frequency", e.target.value)
                }
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="rarely">Rarely</option>
                <option value="hourly">Every hour</option>
                <option value="frequent">Frequently</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Multitasking Comfort
              </label>
              <select
                value={profile.multitasking_comfort}
                onChange={(e) =>
                  updateProfile("multitasking_comfort", e.target.value)
                }
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Planning Style */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Planning Style
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Planning Approach
              </label>
              <select
                value={profile.planning_style}
                onChange={(e) =>
                  updateProfile("planning_style", e.target.value)
                }
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="aggressive">Aggressive</option>
                <option value="balanced">Balanced</option>
                <option value="conservative">Conservative</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Overcommitment Tendency
              </label>
              <select
                value={profile.overcommitment_tendency}
                onChange={(e) =>
                  updateProfile("overcommitment_tendency", e.target.value)
                }
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Context Switch Tolerance
              </label>
              <select
                value={profile.context_switch_tolerance}
                onChange={(e) =>
                  updateProfile("context_switch_tolerance", e.target.value)
                }
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
