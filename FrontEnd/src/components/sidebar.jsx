// const SideBar = () => {
//   return <div className="bg-">

//   </div>;
// };

// export default SideBar;
// src/components/Sidebar.jsx
import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/slices/authSlice";
import {
  BsArrowLeftSquare,
  BsArrowRightSquare,
  BsBookmarkCheck,
  BsAirplane,
  BsCart2,
  BsCardChecklist,
  BsMic,
  BsPerson,
} from "react-icons/bs";
import logo from "../assets/images.png";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const collapsed = isOpen ? "block" : "hidden";
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const navItemClass = ({ isActive }) =>
    [
      "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/20"
        : "text-slate-200 hover:bg-white/5 hover:text-white",
    ].join(" ");

  return (
    <div
      className={`sticky top-0 shrink-0 h-screen transition-all duration-300 ${
        isOpen ? "w-64" : "w-16"
      } bg-linear-to-b from-slate-950 to-slate-900 text-slate-100 border-r border-white/10`}
    >
      <div className="flex items-center justify-between px-3 pt-4">
        <Link to="/landing" className="flex items-center gap-2 min-w-0">
          <img
            src={logo}
            alt="SAT Prime"
            className="h-9 w-9 rounded-lg ring-1 ring-white/10 bg-white/5 p-1"
          />
          <div className={`min-w-0 transition-all duration-300 ${collapsed}`}>
            <div className="truncate text-sm font-semibold tracking-wide">
              SAT PRIME
            </div>
            <div className="truncate text-xs text-slate-400">Practice • Track • Improve</div>
          </div>
        </Link>

        <button
          type="button"
          onClick={handleToggle}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <BsArrowLeftSquare /> : <BsArrowRightSquare />}
        </button>
      </div>

      <div className="mt-4 flex h-[calc(100vh-5.25rem)] flex-col justify-between px-2 pb-0">
        <nav className="space-y-1">
          <NavLink to="/app" className={navItemClass}>
            <BsMic className="text-lg text-slate-300 group-hover:text-white" />
            <span className={collapsed}>Home</span>
          </NavLink>
          <NavLink to="/ai" className={navItemClass}>
            <BsAirplane className="text-lg text-slate-300 group-hover:text-white" />
            <span className={collapsed}>Ask AI</span>
          </NavLink>
          <NavLink to="/score" className={navItemClass}>
            <BsBookmarkCheck className="text-lg text-slate-300 group-hover:text-white" />
            <span className={collapsed}>Score Report</span>
          </NavLink>
          <NavLink to="/flash" className={navItemClass}>
            <BsCardChecklist className="text-lg text-slate-300 group-hover:text-white" />
            <span className={collapsed}>Flash Cards</span>
          </NavLink>
          <NavLink to="/order" className={navItemClass}>
            <BsCart2 className="text-lg text-slate-300 group-hover:text-white" />
            <span className={collapsed}>Order History</span>
          </NavLink>
        </nav>

        <div className="space-y-1">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 ring-1 ring-white/10">
                <BsPerson className="text-lg text-slate-200" />
              </div>
              <div className={`min-w-0 ${collapsed}`}>
                <div className="truncate text-sm font-semibold text-slate-100">
                  {user?.name || user?.email || "Guest"}
                </div>
                <div className="truncate text-xs text-slate-400">
                  {user ? user.email : "Not signed in"}
                </div>
              </div>
            </div>
          </div>

          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span className={collapsed}>Logout</span>
              <span className={isOpen ? "hidden" : "block"}>↩</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
