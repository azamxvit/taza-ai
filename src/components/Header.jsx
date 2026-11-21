import { useState } from "react";
import { NavLink } from "react-router-dom";

export default function Header() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    isActive ? "text-green-200" : "hover:text-green-200 transition";

  return (
    <header className="bg-green-700 text-white py-4 shadow-xl sticky top-0 z-20">
      <div className="max-w-6xl mx-auto flex justify-between items-center px-6">
        <NavLink to="/" className="flex items-center space-x-2" onClick={() => setOpen(false)}>
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 13l-5 5m0 0l-5-5m5 5V6"
            />
          </svg>
          <h1 className="text-3xl font-extrabold tracking-tight">CleanCity</h1>
        </NavLink>

        {/* Desktop nav */}
        <nav className="space-x-6 text-lg font-medium hidden sm:block">
          <NavLink to="/" end className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/map" className={linkClass}>
            Map
          </NavLink>
          <NavLink to="/reports" className={linkClass}>
            Reports
          </NavLink>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden text-white p-2 rounded hover:bg-green-600 transition"
          aria-label="Toggle navigation menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <nav className="sm:hidden mt-3 px-6 pb-2 flex flex-col space-y-3 text-lg font-medium">
          <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/map" className={linkClass} onClick={() => setOpen(false)}>
            Map
          </NavLink>
          <NavLink to="/reports" className={linkClass} onClick={() => setOpen(false)}>
            Reports
          </NavLink>
        </nav>
      )}
    </header>
  );
}
