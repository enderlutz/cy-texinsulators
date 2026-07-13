import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BookOpen, Briefcase, Kanban, Menu, Settings as SettingsIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function App() {
  const [open, setOpen] = useState(false);

  const nav = (
    <>
      <nav className="space-y-1 flex-1">
        <NavItem to="/pipeline" icon={<Kanban size={16} />} label="Pipeline" onNavigate={() => setOpen(false)} />
        <NavItem to="/jobs" icon={<Briefcase size={16} />} label="Jobs" onNavigate={() => setOpen(false)} />
      </nav>
      <nav className="space-y-1 pt-4 border-t">
        <NavItem to="/setup/facebook" icon={<BookOpen size={16} />} label="FB Setup Guide" onNavigate={() => setOpen(false)} />
        <NavItem to="/settings" icon={<SettingsIcon size={16} />} label="Settings" onNavigate={() => setOpen(false)} />
      </nav>
    </>
  );

  return (
    <div className="min-h-screen md:flex">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-background px-4 h-14">
        <div className="text-base font-semibold leading-tight">
          Cy-Tex Insulators
          <span className="text-xs font-normal text-muted-foreground ml-2">Hiring</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 -mr-2 rounded-md hover:bg-accent"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Mobile drawer + overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 max-w-[80%] bg-background border-r p-4 flex flex-col shadow-xl">
            <div className="flex items-start justify-between mb-6">
              <div className="text-lg font-semibold leading-tight">
                Cy-Tex Insulators
                <div className="text-xs font-normal text-muted-foreground">Hiring</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 rounded-md hover:bg-accent"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      {/* Static sidebar (md and up) */}
      <aside className="hidden md:flex w-56 border-r bg-muted/30 p-4 flex-col">
        <div className="text-lg font-semibold mb-6 leading-tight">
          Cy-Tex Insulators
          <div className="text-xs font-normal text-muted-foreground">Hiring</div>
        </div>
        {nav}
      </aside>

      <main className="flex-1 p-4 md:p-6 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  onNavigate,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
          isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
