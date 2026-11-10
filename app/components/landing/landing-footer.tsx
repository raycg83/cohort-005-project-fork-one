import { Link } from "react-router";

const LINK_CLASS = "hover:text-foreground";

export function LandingFooter({ signedIn }: { signedIn: boolean }) {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-foreground">Cadence</p>
          <p className="mt-1">Learn to code, at your own pace.</p>
        </div>
        <nav className="flex gap-6">
          <Link to="/courses" className={LINK_CLASS}>
            Courses
          </Link>
          {signedIn ? (
            <Link to="/dashboard" className={LINK_CLASS}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className={LINK_CLASS}>
                Log In
              </Link>
              <Link to="/signup" className={LINK_CLASS}>
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}
