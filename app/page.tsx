import Link from "next/link";

export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/50 backdrop-blur-sm bg-zinc-950/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Runtime PM
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-zinc-300 hover:text-white transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/auth/signup"
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg shadow-purple-500/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block px-4 py-2 mb-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800/50 rounded-full text-sm text-purple-300">
            Your Personal PM That Makes Decisions, Not Just Stores Tasks
          </div>
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Stop Overcommitting.
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Start Executing.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-400 mb-8 max-w-3xl mx-auto leading-relaxed">
            Runtime PM is an automated execution manager that translates your
            priorities into realistic daily plans. No more decision fatigue. No
            more broken plans. Just clear direction.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-xl shadow-purple-500/30 text-lg"
            >
              Get Started for Free
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-4 border border-zinc-700 text-zinc-300 font-semibold rounded-lg hover:border-zinc-600 hover:text-white transition-all text-lg"
            >
              Log In
            </Link>
          </div>
        </div>

        {/* Animated background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-24 px-6 bg-zinc-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Tired of This?
            </h2>
            <p className="text-xl text-zinc-400">
              You're not alone. Most productivity apps make these problems
              worse.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg
                    className="w-8 h-8 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                ),
                title: "Overcommitment",
                description:
                  "You plan 8 hours of work but only have 4. By 2pm, you're already behind.",
              },
              {
                icon: (
                  <svg
                    className="w-8 h-8 text-orange-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                ),
                title: "Constant Rescheduling",
                description:
                  "Every day you manually move tasks around. It's tedious and you never catch up.",
              },
              {
                icon: (
                  <svg
                    className="w-8 h-8 text-yellow-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3.75 13.5l10.5-11.25L12.75 12l10.5 11.25L3.75 13.5z"
                    />
                  </svg>
                ),
                title: "Energy Mismatch",
                description:
                  "You schedule deep work when you're drained, or admin tasks when you're energized.",
              },
              {
                icon: (
                  <svg
                    className="w-8 h-8 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                    />
                  </svg>
                ),
                title: "Context Switching",
                description:
                  "Jumping between multiple tasks leaves you exhausted with little to show for it.",
              },
              {
                icon: (
                  <svg
                    className="w-8 h-8 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                    />
                  </svg>
                ),
                title: "Decision Fatigue",
                description:
                  "You spend more time deciding what to work on than actually working.",
              },
              {
                icon: (
                  <svg
                    className="w-8 h-8 text-pink-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                    />
                  </svg>
                ),
                title: "Broken Plans",
                description:
                  "Reality never matches your plan. One interruption derails everything.",
              },
            ].map((pain, idx) => (
              <div
                key={idx}
                className="p-6 bg-zinc-800/50 border border-zinc-700/50 rounded-xl hover:border-red-500/50 transition-all hover:shadow-lg hover:shadow-red-500/10"
              >
                <div className="mb-4">{pain.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{pain.title}</h3>
                <p className="text-zinc-400 leading-relaxed">
                  {pain.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How Runtime PM Solves It
            </h2>
            <p className="text-xl text-zinc-400">
              We make the decisions so you can focus on execution.
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                title: "Reality-First Planning",
                description:
                  "Start with your actual constraints—energy level, available hours, real priorities. The system builds your plan from there, not from wishful thinking.",
                benefit: "No more overcommitment. Plans that actually work.",
              },
              {
                title: "Automated Decision Making",
                description:
                  "The system decides what to work on, what to defer, and what to drop. You never manually reschedule tasks again.",
                benefit: "Eliminate decision fatigue. Just execute.",
              },
              {
                title: "Energy-Aware Matching",
                description:
                  "High-energy tasks when you're energized. Low-energy tasks when you're drained. The system matches tasks to your actual capacity.",
                benefit: "Work smarter, not harder.",
              },
              {
                title: "Context Switch Protection",
                description:
                  "Limits to one primary focus per day. Minimal secondary tasks. Explicit boundaries on what NOT to do.",
                benefit: "Deep work that actually happens.",
              },
              {
                title: "Continuous Adaptation",
                description:
                  "Plans break. That's reality. The system adapts when things change, repairing your plan automatically.",
                benefit: "Resilient plans that survive reality.",
              },
              {
                title: "Clear Execution Boundaries",
                description:
                  "Explicitly tells you when to stop working. No guilt about what didn't get done. Just clear direction on what matters today.",
                benefit: "Peace of mind and real progress.",
              },
            ].map((solution, idx) => (
              <div
                key={idx}
                className="grid md:grid-cols-10 gap-6 p-8 bg-gradient-to-r from-zinc-800/30 to-zinc-900/30 border border-zinc-700/50 rounded-xl hover:border-purple-500/50 transition-all items-stretch overflow-visible"
              >
                <div className="md:col-span-7 flex flex-col justify-center">
                  <h3 className="text-2xl font-semibold mb-3 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    {solution.title}
                  </h3>
                  <p className="text-zinc-300 leading-relaxed">
                    {solution.description}
                  </p>
                </div>
                <div className="md:col-span-3 flex items-stretch">
                  <div className="w-full flex items-center justify-center">
                    <p className="text-xl font-bold text-white px-4 py-4 break-words text-center">
                      {solution.benefit}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section className="py-24 px-6 bg-zinc-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              See It In Action
            </h2>
            <p className="text-xl text-zinc-400">
              A control panel for execution, not another todo list.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Screenshot Placeholder 1 - Today's Plan */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-8 overflow-hidden">
                <div className="mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold mb-2">Today's Plan</div>
                    <div className="text-sm text-zinc-400">
                      Monday, January 15
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-800/50 rounded-lg p-4">
                    <div className="text-xs text-purple-400 uppercase mb-2">
                      Primary Focus
                    </div>
                    <div className="text-lg font-semibold">
                      Complete project proposal
                    </div>
                    <div className="text-sm text-zinc-400 mt-1">
                      3h • High energy • Deep focus
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-zinc-500 uppercase">
                      Secondary Tasks
                    </div>
                    <div className="bg-zinc-800/50 rounded p-3">
                      <div className="text-sm">Review design mockups</div>
                      <div className="text-xs text-zinc-500">
                        45m • Medium energy
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screenshot Placeholder 2 - Morning Check-in */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-8 overflow-hidden">
                <div className="mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold mb-2">
                      Morning Check-In
                    </div>
                    <div className="text-sm text-zinc-400">
                      60-second reality check
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-zinc-400 mb-2">
                        Energy Level
                      </div>
                      <div className="flex gap-2">
                        {["Low", "Medium", "High"].map((level, i) => (
                          <div
                            key={i}
                            className={`px-4 py-2 rounded ${
                              i === 2
                                ? "bg-blue-500 text-white"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {level}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-zinc-400 mb-2">
                        Available Hours
                      </div>
                      <div className="text-2xl font-bold">6 hours</div>
                    </div>
                    <div className="pt-4 border-t border-zinc-800">
                      <div className="text-xs text-zinc-500">
                        System generates your plan automatically
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Screenshot - Weekly Review */}
          <div className="max-w-3xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-8 overflow-hidden">
                <div className="mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold mb-2">Weekly Review</div>
                    <div className="text-sm text-zinc-400">
                      Runtime-generated insights
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-zinc-800/50 rounded p-4 text-center">
                      <div className="text-3xl font-bold text-green-400">
                        24
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        Tasks Completed
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 rounded p-4 text-center">
                      <div className="text-3xl font-bold text-blue-400">
                        2.1
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        Avg Context Switches
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 rounded p-4 text-center">
                      <div className="text-3xl font-bold text-purple-400">
                        87%
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        Energy Match
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-800/50 rounded-lg p-4">
                    <div className="text-sm text-emerald-400 mb-2">Insight</div>
                    <div className="text-sm text-zinc-300">
                      You're consistently over-scoping by 20%. Consider reducing
                      daily task load for better completion rates.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/30 via-blue-900/30 to-cyan-900/30 border border-purple-800/50 rounded-3xl p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.1),transparent)]"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to Stop Overcommitting?
              </h2>
              <p className="text-xl text-zinc-300 mb-8 max-w-2xl mx-auto">
                Join users who've eliminated decision fatigue and started
                executing with clarity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/signup"
                  className="px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-zinc-100 transition-all shadow-xl text-lg"
                >
                  Get Started for Free
                </Link>
                <Link
                  href="/auth/login"
                  className="px-8 py-4 border-2 border-white/20 text-white font-semibold rounded-lg hover:border-white/40 hover:bg-white/10 transition-all text-lg"
                >
                  Log In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
                Runtime PM
              </div>
              <p className="text-zinc-400 text-sm">
                Your personal PM that makes execution decisions, not just stores
                tasks.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>
                  <Link
                    href="/auth/login"
                    className="hover:text-white transition-colors"
                  >
                    Log In
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signup"
                    className="hover:text-white transition-colors"
                  >
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>
                  <a
                    href="mailto:hello@runtimepm.com"
                    className="hover:text-white transition-colors"
                  >
                    hello@runtimepm.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-zinc-800/50 text-center text-sm text-zinc-500">
            <p>© {new Date().getFullYear()} Runtime PM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
