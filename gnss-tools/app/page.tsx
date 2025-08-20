import Link from "next/link"
import { Calendar, Clock, Globe, FileDown, BarChart, FileText, Code } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          GNSS 工具集
        </h1>
        <ThemeToggle />
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">卫星导航时间工具</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">GNSS时间转换与日历工具，支持GPS和北斗时间系统</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Link href="/calendar">
            <div className="feature-card h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-semibold">GNSS 日历</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                查看2000年至今的日历，包括年积日(DOY)和周内秒信息。以日历形式直观展示GNSS时间信息。
              </p>
              <div className="text-blue-600 dark:text-blue-400 font-medium">查看日历 →</div>
            </div>
          </Link>

          <Link href="/converter">
            <div className="feature-card h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                  <Clock className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-2xl font-semibold">时间转换器</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                在北斗时间和GPS时间之间进行转换，支持GPS周+周内秒与年月日时分秒之间的相互转换，同样支持北斗时间系统。
              </p>
              <div className="text-indigo-600 dark:text-indigo-400 font-medium">开始转换 →</div>
            </div>
          </Link>

          <Link href="/resources">
            <div className="feature-card h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Globe className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-semibold">资源链接</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                收集GNSS领域常用的官方网站、数据中心和资源链接，包括IGS官网、CDDIS数据下载网址和北斗官网等。
              </p>
              <div className="text-green-600 dark:text-green-400 font-medium">浏览资源 →</div>
            </div>
          </Link>

          <Link href="/ftp-links">
            <div className="feature-card h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <FileDown className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-2xl font-semibold">产品FTP</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                提供各分析中心的GNSS精密产品FTP下载地址，包括精密星历、钟差、偏差和地球自转参数等产品的FTP链接。
              </p>
              <div className="text-amber-600 dark:text-amber-400 font-medium">查看FTP链接 →</div>
            </div>
          </Link>

          <Link href="/sp3-analyzer">
            <div className="feature-card h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <BarChart className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-2xl font-semibold">SP3分析器</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                上传SP3精密星历文件，读取卫星坐标并生成RMS精度图，分析卫星轨道精度。支持两个SP3文件的比较分析。
              </p>
              <div className="text-purple-600 dark:text-purple-400 font-medium">分析SP3 →</div>
            </div>
          </Link>

          <Link href="/open-source">
            <div className="feature-card h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-full">
                  <Code className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h2 className="text-2xl font-semibold">开源软件</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                收集GNSS领域优秀的开源软件资源，包括RTKLIB、北斗信号仿真、PPPAR等多种工具和库，助力研究与开发。
              </p>
              <div className="text-cyan-600 dark:text-cyan-400 font-medium">浏览软件 →</div>
            </div>
          </Link>

          <Link href="/broadcast-to-sp3">
            <div className="feature-card h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <FileText className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-semibold">广播星历转SP3</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                上传广播星历文件，自动转换为SP3精密星历格式。支持RINEX格式的广播星历，可下载转换后的SP3文件。
              </p>
              <div className="text-red-600 dark:text-red-400 font-medium">开始转换 →</div>
            </div>
          </Link>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8 mt-12 border-t border-gray-200 dark:border-gray-800">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p>© {new Date().getFullYear()} GNSS工具集 | 卫星导航时间工具</p>
        </div>
      </footer>
    </div>
  )
}
