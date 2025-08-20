import Link from "next/link"
import { ExternalLink, Home, Globe, Database, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"

// 网站数据
const websites = [
  {
    id: "igs",
    title: "IGS官方网站",
    description: "国际GNSS服务组织(International GNSS Service)官方网站，提供GNSS数据产品、标准和服务。",
    url: "https://www.igs.org/",
    icon: <Globe className="h-10 w-10 text-blue-600 dark:text-blue-400" />,
    categories: ["数据产品", "研究", "标准"],
    color: "blue",
  },
  {
    id: "cddis",
    title: "CDDIS数据中心",
    description: "CDDIS提供全球GNSS观测数据、产品和相关信息的存档。",
    url: "https://cddis.nasa.gov/",
    icon: <Database className="h-10 w-10 text-green-600 dark:text-green-400" />,
    categories: ["数据下载", "观测数据", "产品"],
    color: "green",
  },
  {
    id: "beidou",
    title: "北斗卫星导航系统",
    description: "中国北斗卫星导航系统官方网站，提供北斗系统信息、新闻、应用和服务。",
    url: "http://www.beidou.gov.cn/",
    icon: <Navigation className="h-10 w-10 text-red-600 dark:text-red-400" />,
    categories: ["系统信息", "应用", "服务"],
    color: "red",
  },
  {
    id: "igs-data",
    title: "IGS数据中心",
    description: "IGS数据中心提供高精度GNSS轨道数据、钟差数据和地球自转参数等产品。",
    url: "https://igs.org/data-products/",
    icon: <Database className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />,
    categories: ["精密轨道", "钟差", "EOP"],
    color: "indigo",
  },
  {
    id: "sopac",
    title: "SOPAC数据中心",
    description: "Scripps轨道与永久阵列中心(SOPAC)提供GNSS数据产品和分析服务。",
    url: "http://sopac-csrc.ucsd.edu/",
    icon: <Globe className="h-10 w-10 text-purple-600 dark:text-purple-400" />,
    categories: ["数据产品", "分析", "研究"],
    color: "purple",
  },
  {
    id: "mgex",
    title: "IGS MGEX",
    description: "IGS多GNSS实验(MGEX)提供GPS、GLONASS、Galileo、BeiDou、QZSS和NAVIC的产品。",
    url: "https://igs.org/mgex/",
    icon: <Globe className="h-10 w-10 text-amber-600 dark:text-amber-400" />,
    categories: ["多系统", "产品", "实验"],
    color: "amber",
  },
]

export default function ResourcesPage() {
  return (
    <div className="min-h-screen pb-12">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm mb-8">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="mr-2 h-4 w-4" />
                首页
              </Button>
            </Link>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              GNSS 资源链接
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h2 className="text-3xl font-bold mb-4">各类官网资源</h2>
          <p className="text-muted-foreground">收集了GNSS领域常用的官方网站、数据中心和资源链接，方便快速访问</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {websites.map((site) => (
            <Card
              key={site.id}
              className="overflow-hidden transition-all hover:shadow-md border-t-4"
              style={{ borderTopColor: `var(--${site.color}-500)` }}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">{site.icon}</div>
                </div>
                <CardTitle className="mt-4">{site.title}</CardTitle>
                <CardDescription>{site.description}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex flex-wrap gap-2">
                  {site.categories.map((category) => (
                    <span key={category} className={`px-2 py-1 text-xs rounded-full tag-${site.color}`}>
                      {category}
                    </span>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center link-${site.color}`}
                >
                  访问网站
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 max-w-3xl mx-auto">
          <h3 className="text-xl font-semibold mb-4 text-center">关于GNSS资源</h3>
          <p className="mb-4">
            全球导航卫星系统(GNSS)包括美国的GPS、俄罗斯的GLONASS、欧盟的Galileo和中国的北斗系统等。这些系统为全球用户提供定位、导航和授时服务。
          </p>
          <p>
            上述资源链接提供了GNSS相关的官方信息、数据产品和研究资料，可用于科学研究、工程应用和教育目的。如需更多资源，请参考各官方网站的详细说明。
          </p>
        </div>
      </main>
    </div>
  )
}
