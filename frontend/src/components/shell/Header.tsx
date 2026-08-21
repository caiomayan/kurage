"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Brand } from "@/components/ui/Brand";
import { SteamIcon } from "@/components/ui/PlatformIcons";
import { RoleIcon } from "@/components/ui/RoleIcon";
import { Avatar } from "@/components/ui/Avatar";
import { CountryFlag } from "@/components/ui/CountryFlag";
import { FaceitLevelIcon } from "@/components/ui/faceit-levels/FaceitLevelIcon";
import { KurageLevelIcon } from "@/components/ui/KurageLevelIcon";
import { useAuth } from "@/lib/auth";
import {
  PiMagnifyingGlass,
  PiList,
  PiX,
  PiCaretDown,
  PiUser,
  PiSignOut,
  PiGear,
  PiTrophy,
  PiArrowRight,
} from "react-icons/pi";
import { cn } from "@/lib/utils";

import { NAV_LINKS } from "@/lib/constants";
import { useSearchShortcut } from "@/lib/search-store";
import { HeaderSearch } from "@/components/search/HeaderSearch";
import { UserMenuDropdown } from "./UserMenuDropdown";

export function Header() {
  useSearchShortcut();
  const pathname = usePathname();
  const { user, isAuthenticated, loginWithSteam, logout, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isClosingDropdown, setIsClosingDropdown] = useState(false);

  const closeDropdown = useCallback(() => {
    setIsClosingDropdown(true);
    setTimeout(() => {
      setUserDropdownOpen(false);
      setIsClosingDropdown(false);
    }, 200);
  }, []);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  // Track scroll position for blur effect & beam border
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation for user dropdown
  const handleDropdownKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDropdown();
        triggerButtonRef.current?.focus();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const menuItems = dropdownRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
        if (!menuItems || menuItems.length === 0) return;
        const currentIndex = Array.from(menuItems).indexOf(document.activeElement as HTMLElement);
        let nextIndex = 0;
        if (event.key === "ArrowDown") {
          nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
        }
        menuItems[nextIndex]?.focus();
      }
    },
    []
  );

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 w-full transition-all duration-300 ease-in-out",
        pathname === "/mar" ? "header-mar-fade" : "header-blur",
        pathname === "/mar"
          ? scrolled ? "is-scrolled" : ""
          : scrolled ? "is-scrolled" : ""
      )}
    >
      {/* ── Resend-Style Traveling Light Beam Border ── */}
      {pathname !== "/mar" && (
        <div
          className={cn(
            "navbar-beam-container transition-opacity duration-500",
            scrolled ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="navbar-beam-glow" />
        </div>
      )}

      <div className="relative z-10 mx-auto flex h-[58px] w-full max-w-7xl items-center justify-between px-6">
        {/* Left: Brand (flex-1 to balance right side) */}
        <div className={cn("flex flex-1 items-center justify-start transition-opacity duration-300", isSearchOpen && "opacity-15 pointer-events-none")}>
          <Brand />
        </div>

        {/* Center: Desktop Navigation — mathematically centered */}
        <nav className={cn("hidden shrink-0 items-center justify-center gap-1 md:flex transition-opacity duration-300", isSearchOpen && "opacity-15 pointer-events-none")} aria-label="Navegação Principal">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-[14px] font-medium transition-colors",
                  isActive
                    ? "text-ink"
                    : "text-charcoal hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search shortcut, Auth (flex-1 to balance left side) */}
        <div className="flex flex-1 items-center justify-end gap-10">
          <HeaderSearch isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />

          {/* User Auth Section */}
          <div className={cn("flex items-center transition-opacity duration-300", isSearchOpen && "opacity-15 pointer-events-none")}>
          {isLoading ? (
            <div
              className="h-9 w-9 animate-pulse rounded-full bg-white/10"
              aria-label="Carregando sessão"
            />
          ) : isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef} onKeyDown={handleDropdownKeyDown}>
              <button
                ref={triggerButtonRef}
                id="user-menu-button"
                onClick={() => {
                  setUserDropdownOpen((prev) => !prev);
                }}
                className="flex items-center justify-center transition-transform duration-200 hover:scale-105 focus:outline-none cursor-pointer"
                aria-haspopup="menu"
                aria-expanded={userDropdownOpen}
              >
                <Avatar
                  src={user.avatarUrl}
                  username={user.username}
                  size="sm"
                  isVerifiedPro={user.isVerifiedPro}
                  enableHovercard={false}
                />
              </button>

              {/* User Dropdown Menu with Framer Motion */}
              <AnimatePresence>
                {userDropdownOpen && (
                  <UserMenuDropdown
                    user={user}
                    onClose={() => setUserDropdownOpen(false)}
                    onLogout={() => logout()}
                  />
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              onClick={() => loginWithSteam()}
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-[13px] font-medium text-ink backdrop-blur-sm transition hover:bg-white/10 hover:border-white/20"
            >
              <SteamIcon size={13} />
              <span>Sign in</span>
            </button>
          )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={cn("grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-mute transition hover:bg-white/10 hover:text-ink md:hidden", isSearchOpen && "opacity-15 pointer-events-none")}
          >
            {mobileMenuOpen ? <PiX className="h-4 w-4" /> : <PiList className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--divider-soft)] bg-canvas/95 backdrop-blur-md px-6 py-4 md:hidden search-panel-enter">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2.5 text-[15px] text-charcoal transition hover:bg-surface-card hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
