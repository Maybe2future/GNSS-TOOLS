import Link from "next/link"
import {
  ExternalLink,
  Home,
  Globe,
  BookOpen,
  Cpu,
  Navigation,
  Box,
  GitBranch,
  Compass,
  Layers,
  Zap,
  Video,
  Server,
  Workflow,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"

// 开源软件数据
const softwareList = [
  {
    id: "rtklib",
    title: "RTKLIB",
    description: "伟大无需多言，开源GNSS定位软件包",
    url: "https://www.rtklib.com/",
    language: "C语言编写",
    categories: ["定位", "RTK", "PPP"],
    color: "blue",
    featured: true,
    icon: <Compass className="h-10 w-10 text-blue-600 dark:text-blue-400" />,
  },
  {
    id: "bds-sdr",
    title: "BDS-3-B1C-B2a-SDR-receiver",
    description: "北斗信号仿真",
    url: "https://github.com/lyf8118/BDS-3-B1C-B2a-SDR-receiver",
    language: "MATLAB编写",
    categories: ["北斗", "信号处理", "仿真"],
    color: "red",
    icon: <Navigation className="h-10 w-10 text-red-600 dark:text-red-400" />,
  },
  {
    id: "claslib",
    title: "CLASLIB",
    description: "基于RTKLIB开发，实现了PPP-RTK, VRS，SSR2OBS多个功能，目前仅支持日本I6数据解码计算",
    url: "https://github.com/QZSS-Strategy-Office/claslib",
    language: "C语言编写",
    categories: ["PPP-RTK", "VRS", "SSR2OBS"],
    color: "green",
    icon: <Layers className="h-10 w-10 text-green-600 dark:text-green-400" />,
  },
  {
    id: "gsilib",
    title: "GSILIB",
    description:
      "基于RTKLIB开发，实现了三个新功能：估计和校正不同类型接收机之间的频间偏置（IFB）、估计和校正不同类型接收机之间的系统间偏差（ISB）、校正每个接收器的L2P（Y）和L2C之间的四分之一周期偏移",
    url: "https://www.gsi.go.jp/ENGLISH/eiseisokuchi-e30001.html",
    language: "C语言编写",
    categories: ["IFB", "ISB", "偏差校正"],
    color: "indigo",
    icon: <Zap className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />,
  },
  {
    id: "pride-pppar",
    title: "PRIDE PPPAR",
    description:
      "支持多系统全频点GNSS处理与PPPAR，支持LEO卫星运动学定轨解算，需要在WSL或者LINUX系统下编译安装，附带GUI程序",
    url: "https://github.com/PrideLab/PRIDE-PPPAR",
    language: "FORTRAN语言",
    categories: ["PPPAR", "LEO", "定轨"],
    color: "purple",
    icon: <Server className="h-10 w-10 text-purple-600 dark:text-purple-400" />,
  },
  {
    id: "hasppp",
    title: "HASPPP",
    description: "可接收并实时解码GAL HAS数据的RTKLIB二次开发的程序",
    url: "https://github.com/ZhangRunzhi20/HASPPP",
    language: "C, C++程序",
    categories: ["HAS", "实时解码", "RTKLIB"],
    color: "amber",
    icon: <Cpu className="h-10 w-10 text-amber-600 dark:text-amber-400" />,
  },
  {
    id: "gamp",
    title: "GAMP",
    description: "目前源码toolbox不再提供，需要找作者进行获取源码，基于RTKLIB二次开发，支持非差非组合处理",
    url: "https://geodesy.noaa.gov/gps-toolbox/GAMP.htm",
    language: "C, C++",
    categories: ["非差非组合", "RTKLIB"],
    color: "blue",
    icon: <Box className="h-10 w-10 text-blue-600 dark:text-blue-400" />,
  },
  {
    id: "ginan",
    title: "GINAN",
    description: "采用了RTKLIB模块，包含PEA POD功能，目前都合并为PEA，可进行滤波定轨",
    url: "https://github.com/GeoscienceAustralia/ginan",
    language: "多语言编写，C++较多",
    categories: ["PEA", "POD", "滤波定轨"],
    color: "green",
    icon: <GitBranch className="h-10 w-10 text-green-600 dark:text-green-400" />,
  },
  {
    id: "ginav",
    title: "GINav",
    description: "惯导工具箱，可支持SPP,PPK,PPD，PPS等多个功能，初学较为推荐",
    url: "https://github.com/kaichen686/GINav",
    language: "MATLAB编写",
    categories: ["惯导", "SPP", "PPK"],
    color: "red",
    icon: <Compass className="h-10 w-10 text-red-600 dark:text-red-400" />,
  },
  {
    id: "great",
    title: "GREAT系列程序",
    description:
      "PVT可支持无电离层，非差非组合解算，支持PPPAR等功能，MSF支持PPP松紧耦合，模糊度固定等功能，LAG程序支持低轨增强GNSS解算，多系统数据仿真",
    url: "https://github.com/GREAT-WHU",
    language: "C++编写",
    categories: ["PVT", "MSF", "LAG"],
    color: "indigo",
    icon: <Workflow className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />,
  },
  {
    id: "groops",
    title: "GROOPS",
    description: "多系统定位定轨程序",
    url: "https://github.com/groops-devs/groops",
    language: "C++编写",
    categories: ["定位", "定轨"],
    color: "purple",
    icon: <Globe className="h-10 w-10 text-purple-600 dark:text-purple-400" />,
  },
  {
    id: "nav-learning",
    title: "Navigation-Learning",
    description: "各类开源程序源码，架构讲解，各类学习视频，书籍推荐，很全的分享与讲解",
    url: "https://github.com/LiZhengXiao99/Navigation-Learning",
    language: "资源集合",
    categories: ["学习资源", "教程"],
    color: "amber",
    icon: <BookOpen className="h-10 w-10 text-amber-600 dark:text-amber-400" />,
  },
  {
    id: "rtklib-tutorial",
    title: "RTKLIB源码讲解",
    description: "RTKLIB源码讲解与RTKLIB在VSCODE中编译配置教程视频，对于初学者很有帮助",
    url: "https://space.bilibili.com/1394219706",
    language: "视频教程",
    categories: ["RTKLIB", "教程", "视频"],
    color: "blue",
    icon: <Video className="h-10 w-10 text-blue-600 dark:text-blue-400" />,
  },
]

export default function OpenSourcePage() {
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
              GNSS 开源软件
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h2 className="text-3xl font-bold mb-4">GNSS开源软件资源</h2>
          <p className="text-muted-foreground">收集了GNSS领域优秀的开源软件、工具和学习资源，助力研究与开发</p>
        </div>

        {/* 特色软件 - RTKLIB */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-6 text-center">特色开源软件</h3>
          <Card className="overflow-hidden border-t-4 border-blue-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 p-6 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50">
                <div className="w-full h-48 relative">
                  <Image
                    src="https://sjc.microlink.io/MMKGZYoeU5kY1MTwmSXLkO9WBjEpA4X0pRHb72XzSnr-siuEUVDWH52jZTMM1RZqgQWeMmh7NCGSFBByvyxJ8w.jpeg"
                    alt="RTKLIB官网截图"
                    fill
                    style={{ objectFit: "contain" }}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-2xl">RTKLIB</CardTitle>
                  <CardDescription className="text-base">伟大无需多言，开源GNSS定位软件包</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">
                    RTKLIB是一个开源的GNSS定位软件包，支持标准和精密定位算法，包括RTK、PPP等多种定位模式。它由一个便携式程序库和多个应用程序组成，提供了丰富的GNSS数据处理功能。
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 text-xs rounded-full tag-blue">定位</span>
                    <span className="px-2 py-1 text-xs rounded-full tag-blue">RTK</span>
                    <span className="px-2 py-1 text-xs rounded-full tag-blue">PPP</span>
                    <span className="px-2 py-1 text-xs rounded-full tag-blue">C语言编写</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <a
                    href="https://www.rtklib.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center link-blue"
                  >
                    访问官网
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </CardFooter>
              </div>
            </div>
          </Card>
        </div>

        {/* 其他开源软件列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {softwareList
            .filter((sw) => sw.id !== "rtklib")
            .map((software) => (
              <Card
                key={software.id}
                className="overflow-hidden transition-all hover:shadow-md border-t-4"
                style={{ borderTopColor: `var(--${software.color}-500)` }}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">{software.icon}</div>
                  </div>
                  <CardTitle className="mt-4">{software.title}</CardTitle>
                  <CardDescription>{software.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{software.language}</p>
                  <div className="flex flex-wrap gap-2">
                    {software.categories.map((category) => (
                      <span key={category} className={`px-2 py-1 text-xs rounded-full tag-${software.color}`}>
                        {category}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <a
                    href={software.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center link-${software.color}`}
                  >
                    访问项目
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </CardFooter>
              </Card>
            ))}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 max-w-3xl mx-auto">
          <h3 className="text-xl font-semibold mb-4 text-center">关于GNSS开源软件</h3>
          <p className="mb-4">
            GNSS开源软件为研究人员、工程师和爱好者提供了宝贵的工具和资源，可用于学习、研究和开发GNSS相关应用。
          </p>
          <p>
            这些软件涵盖了从信号处理、定位算法到数据分析的各个方面，为GNSS领域的创新和进步做出了重要贡献。
            我们鼓励用户在使用这些开源资源的同时，也积极参与到开源社区中，共同推动GNSS技术的发展。
          </p>
        </div>
      </main>
    </div>
  )
}
