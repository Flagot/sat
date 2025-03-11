import { Link } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import logo from "../assets/sat_logo-removebg-preview.png";

const Landing = () => {
  const isAuthenticated = !!useAppSelector((state) => state.auth.user);

  return (
    <div className="min-h-screen bg-white">
      <div className="absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="h-72 bg-gradient-to-r from-blue-50 via-white to-blue-50" />
      </div>

      {/* Top nav */}
      <header className="mx-auto max-w-6xl px-5 pt-6">
        <div className="flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2">
            <img src={logo} alt="SAT Prime" className="h-10 w-10" />
            <div className="leading-tight">
              <div className="font-bold text-gray-900">SAT PRIME</div>
              <div className="text-xs text-gray-500">
                Practice • Track • Improve
              </div>
            </div>
          </Link>

          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-md px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Sign up
              </Link>
            </div>
          ) : (
            <Link
              to="/app"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Go to dashboard
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
              Prepare smarter for the SAT.
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Full-length practice tests, progress tracking, and tools that help
              you focus on what moves your score.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/signup"
                    className="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Get started free
                  </Link>
                  <Link
                    to="/login"
                    className="rounded-md border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    I already have an account
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/app"
                    className="rounded-md bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Continue practicing
                  </Link>
                </>
              )}
            </div>

            <div className="mt-6 text-sm text-gray-500">
              Built for focused practice: see what's locked, unlock what you
              need, and keep moving.
            </div>
          </div>

          {/* Simple feature preview */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="grid gap-4">
              <div className="rounded-xl border border-gray-100 p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Full-length tests
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Take realistic exams and resume where you left off.
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Score insights
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Understand your performance and track improvements over time.
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 p-4">
                <div className="text-sm font-semibold text-gray-900">
                  Ask AI
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Get explanations and guidance when you're stuck.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section className="mt-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything you need to succeed
            </h2>
            <p className="mt-2 text-gray-600">
              Comprehensive tools designed to help you master the SAT
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-3 text-2xl">📝</div>
              <h3 className="text-lg font-semibold text-gray-900">
                Practice Tests
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Take full-length SAT practice exams with realistic timing and
                question formats. Track your progress and identify areas for
                improvement.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-3 text-2xl">📊</div>
              <h3 className="text-lg font-semibold text-gray-900">
                Detailed Score Reports
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Get comprehensive score breakdowns by section (English and
                Math). Review correct and incorrect answers with explanations
                for every question.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-3 text-2xl">🤖</div>
              <h3 className="text-lg font-semibold text-gray-900">
                AI-Powered Tutoring
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Get instant help from our AI tutor. Ask questions about
                concepts, strategies, or get step-by-step explanations for
                difficult problems.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-3 text-2xl">🔖</div>
              <h3 className="text-lg font-semibold text-gray-900">
                Flagged Questions
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Mark questions you want to review later. Quickly navigate to
                flagged items and focus on areas that need extra attention.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-3 text-2xl">🎴</div>
              <h3 className="text-lg font-semibold text-gray-900">
                Interactive Flashcards
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Study vocabulary, formulas, and key concepts with interactive
                flashcards. Create your own custom flashcard sets for
                personalized learning.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-3 text-2xl">📈</div>
              <h3 className="text-lg font-semibold text-gray-900">
                Progress Tracking
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Monitor your improvement over time. View your score history,
                track attempts, and see how you're progressing toward your goal.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mt-20 rounded-2xl bg-gray-50 p-8 md:p-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">How it works</h2>
            <p className="mt-2 text-gray-600">
              Get started in three simple steps
            </p>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Sign up for free
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Create your account in seconds. No credit card required. Start
                practicing immediately with access to free practice tests.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Take practice tests
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Choose from available practice exams. Work through questions at
                your own pace, flag difficult items, and save your progress to
                resume later.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Review and improve
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Analyze your scores, review detailed explanations, and use
                flashcards to reinforce concepts. Track your progress and watch
                your score improve.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mt-14 rounded-2xl bg-gray-900 p-8 text-white">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="text-xl font-bold">Ready to start improving?</div>
              <div className="mt-1 text-sm text-gray-300">
                Jump into practice tests and track your progress.
              </div>
            </div>
            {!isAuthenticated ? (
              <div className="flex gap-2">
                <Link
                  to="/signup"
                  className="rounded-md bg-white px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                >
                  Sign up
                </Link>
                <Link
                  to="/login"
                  className="rounded-md border border-white/20 bg-transparent px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Log in
                </Link>
              </div>
            ) : (
              <Link
                to="/app"
                className="rounded-md bg-white px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100"
              >
                Go to dashboard
              </Link>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;
