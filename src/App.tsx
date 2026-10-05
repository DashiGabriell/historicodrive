import { Link, Route, Routes } from "react-router-dom";
import { ButtonLink } from "@/ui";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import Styleguide from "@/pages/styleguide";

export default function App() {
  return (
    <>
      <header className="sticky top-0 z-50 bg-background border-b border-[hsl(var(--border))]">
        <div className="container flex h-[72px] items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="" width={36} height={36} className="h-9 w-9" />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Histórico<span className="text-primary">Drive</span>
            </span>
          </Link>
          <nav aria-label="Principal">
            <ButtonLink href="/styleguide" variant="ghost" size="sm">
              Design system
            </ButtonLink>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/styleguide" element={<Styleguide />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}
