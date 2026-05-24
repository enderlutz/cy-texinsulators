import { NavLink, Outlet } from "react-router-dom";
import { Briefcase, Kanban } from "lucide-react";
import { cn } from "@/lib/utils";

export default function App() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r bg-muted/30 p-4">
        <div className="text-lg font-semibold mb-6">Insulation Hiring</div>
        <nav className="space-y-1">
          <NavItem to="/pipeline" icon={<Kanban size={16} />} label="Pipeline" />
          <NavItem to="/jobs" icon={<Briefcase size={16} />} label="Jobs" />
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
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
