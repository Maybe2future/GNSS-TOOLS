"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Satellite } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { InstallButton } from "@/components/install-button"

const NAV_LINKS = [
  { href: "/converter", label: "时间转换" },
  { href: "/calendar", label: "GNSS 日历" },
  { href: "/sp3-analyzer", label: "SP3 分析" },
  { href: "/broadcast-to-sp3", label: "星历转 SP3" },
  { href: "/resources", label: "资源导航" },
]

/**
 * 站点统一导航头：品牌标识 + 页面导航 + 主题切换
 */
export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md transition-transform duration-300 group-hover:rotate-12">
            <Satellite className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold text-brand-gradient">GNSS 工具集</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <InstallButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
