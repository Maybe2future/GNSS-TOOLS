"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  Calendar,
  Clock,
  Globe,
  FileDown,
  BarChart3,
  FileText,
  Code,
  ArrowRight,
  Satellite,
  Orbit,
  ShieldCheck,
  Zap,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { LiveTimePanel } from "@/components/live-time-panel"

const TOOLS = [
  {
    href: "/converter",
    icon: Clock,
    title: "时间转换器",
    desc: "GPS / 北斗 / TAI / UTC 四大时间系统互转，周+周内秒、年月日时分秒、年积日三种格式自动联动，历史日期按闰秒表精确修正。",
    cta: "开始转换",
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    hoverBorder: "hover:border-blue-300 dark:hover:border-blue-700",
  },
  {
    href: "/calendar",
    icon: Calendar,
    title: "GNSS 日历",
    desc: "点选任意日期，即刻查看当天的 GPS / 北斗周数、周内秒与年积日(DOY)，支持年月快速跳转。",
    cta: "查看日历",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
    hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-700",
  },
  {
    href: "/sp3-analyzer",
    icon: BarChart3,
    title: "SP3 分析器",
    desc: "上传 SP3 精密星历文件，统计各卫星坐标离散度；支持两个文件互比，输出逐星 RMS 精度表与对比图。",
    cta: "分析 SP3",
    iconColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
    hoverBorder: "hover:border-purple-300 dark:hover:border-purple-700",
  },
  {
    href: "/broadcast-to-sp3",
    icon: FileText,
    title: "广播星历转 SP3",
    desc: "上传 RINEX 广播星历，基于开普勒轨道模型实时解算卫星位置与钟差，生成可下载的 SP3 格式文件。",
    cta: "开始转换",
    iconColor: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-100 dark:bg-red-900/40",
    hoverBorder: "hover:border-red-300 dark:hover:border-red-700",
  },
  {
    href: "/ftp-links",
    icon: FileDown,
    title: "产品 FTP",
    desc: "汇集各分析中心的 GNSS 精密产品下载地址：精密星历、钟差、偏差、地球自转参数等。",
    cta: "查看地址",
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700",
  },
  {
    href: "/resources",
    icon: Globe,
    title: "资源链接",
    desc: "IGS 官网、CDDIS 数据中心、北斗官网等 GNSS 领域常用网站导航，一站式直达。",
    cta: "浏览资源",
    iconColor: "text-green-600 dark:text-green-400",
    iconBg: "bg-green-100 dark:bg-green-900/40",
    hoverBorder: "hover:border-green-300 dark:hover:border-green-700",
  },
  {
    href: "/open-source",
    icon: Code,
    title: "开源软件",
    desc: "RTKLIB、北斗信号仿真、PPP-AR 等 GNSS 领域优秀开源项目收集，助力研究与开发。",
    cta: "浏览软件",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
    hoverBorder: "hover:border-cyan-300 dark:hover:border-cyan-700",
  },
]

const HIGHLIGHTS = [
  {
    icon: Zap,
    title: "纯前端，秒开即用",
    desc: "全部计算在浏览器本地完成，无需后端，数据不出设备。",
  },
  {
    icon: ShieldCheck,
    title: "闰秒表精确修正",
    desc: "内置 1972 年至今的 TAI-UTC 闰秒表，历史日期转换同样准确。",
  },
  {
    icon: Orbit,
    title: "真实轨道解算",
    desc: "广播星历按开普勒轨道模型传播，输出真实卫星位置与钟差。",
  },
]

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero 区 */}
      <section className="relative overflow-hidden site-hero-bg">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <div className="absolute -right-10 top-16 text-blue-500/10 dark:text-blue-400/10 animate-float-slow pointer-events-none hidden lg:block">
          <Satellite className="h-56 w-56" />
        </div>
        <div className="absolute -left-8 bottom-8 text-indigo-500/10 dark:text-indigo-400/10 animate-float-slow pointer-events-none hidden lg:block" style={{ animationDelay: "2s" }}>
          <Orbit className="h-40 w-40" />
        </div>

        <div className="container relative mx-auto px-4 pt-16 pb-14 md:pt-24 md:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-sm text-muted-foreground mb-6 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse-dot" />
              支持 GPS / 北斗 BDS / TAI / UTC
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              GNSS 时间工具
              <span className="block mt-2 text-brand-gradient">一站搞定</span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-8 leading-relaxed">
              时间系统互转、GNSS 日历、SP3 精度分析、广播星历转换与数据资源导航。
              <br className="hidden md:block" />
              纯前端实现，打开即用，数据不出浏览器。
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-12">
              <Link
                href="/converter"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5"
              >
                <Clock className="h-4 w-4" />
                立即转换时间
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/calendar"
                className="inline-flex items-center gap-2 rounded-xl glass px-6 py-3 text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <Calendar className="h-4 w-4" />
                查看 GNSS 日历
              </Link>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="max-w-4xl mx-auto"
            >
              <LiveTimePanel />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 工具卡片 */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">七款工具，各显神通</h2>
          <p className="text-muted-foreground">从时间转换到星历分析，覆盖日常 GNSS 数据处理需求</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {TOOLS.map((tool, idx) => (
            <motion.div
              key={tool.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: (idx % 3) * 0.08 }}
            >
              <Link href={tool.href} className="block h-full">
                <div className={`tool-card group ${tool.hoverBorder}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2.5 rounded-xl ${tool.iconBg}`}>
                      <tool.icon className={`h-6 w-6 ${tool.iconColor}`} />
                    </div>
                    <h3 className="text-lg font-semibold">{tool.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{tool.desc}</p>
                  <div className={`text-sm font-medium inline-flex items-center gap-1 ${tool.iconColor}`}>
                    {tool.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 特性说明 */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {HIGHLIGHTS.map((item) => (
              <div key={item.title} className="flex gap-3">
                <div className="shrink-0 p-2 h-fit rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} GNSS 工具集 · 纯前端静态站点 · 支持 GPS / 北斗 / TAI / UTC 时间系统</p>
        </div>
      </footer>
    </div>
  )
}
