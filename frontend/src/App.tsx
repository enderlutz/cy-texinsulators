import { NavLink, Outlet } from "react-router-dom";
import { BookOpen, Briefcase, Kanban, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function App() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r bg-muted/30 p-4 flex flex-col">
        <div className="text-lg font-semibold mb-6 leading-tight">
          Cy-Tex Insulators
          <div className="text-xs font-normal text-muted-foreground">Hiring</div>
        </div>
        <nav className="space-y-1 flex-1">
          <NavItem to="/pipeline" icon={<Kanban size={16} />} label="Pipeline" />
          <NavItem to="/jobs" icon={<Briefcase size={16} />} label="Jobs" />
        </nav>
        <nav className="space-y-1 pt-4 border-t">
          <NavItem to="/setup/facebook" icon={<BookOpen size={16} />} label="FB Setup Guide" />
          <NavItem to="/settings" icon={<SettingsIcon size={16} />} label="Settings" />
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
