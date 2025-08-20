"use client"

import Link from "next/link"
import { Home, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

// 产品数据结构
interface ProductLink {
  id: string
  name: string
  url: string
  type: string
}

// 分析中心数据结构
interface AnalysisCenter {
  id: string
  name: string
  fullName: string
  description: string
  products: ProductLink[]
}

// 产品类型说明
const productTypes = {
  SP3: "精密星历文件，包含卫星位置和钟差信息，通常以5分钟或15分钟间隔提供",
  CLK: "精密钟差文件，提供卫星钟差信息，通常以5秒或30秒间隔提供",
  BIA: "相位偏差/码偏差文件，用于精密定位和模糊度固定",
  OSB: "观测值偏差文件，与BIA类似，用于精密定位",
  ATT: "卫星姿态文件，提供卫星姿态信息",
  OBX: "卫星姿态文件的另一种格式",
  ERP: "地球自转参数文件，包含极移和UT1-UTC信息",
  DCB: "差分码偏差文件，用于电离层延迟估计和精密定位",
}

// URL中的占位符说明
const placeholders = {
  "%W": "GPS周，例如2263",
  "%Y": "四位年份，例如2023",
  "%y": "两位年份，例如23",
  "%n": "年内天数(DOY)，例如001表示一年中的第一天",
  "%m": "月份，例如01表示一月",
  "%d": "日期，例如01表示一号",
}

// 分析中心数据
const analysisCenters: AnalysisCenter[] = [
  {
    id: "grg",
    name: "GRG",
    fullName: "CNES/CLS (法国国家空间研究中心)",
    description: "提供高精度的多GNSS产品，包括GPS、GLONASS、Galileo和BeiDou系统",
    products: [
      {
        id: "grg-sp3",
        name: "GRG_SP3",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/GRG0MGXFIN_%Y%n0000_01D_05M_ORB.SP3.gz",
        type: "SP3",
      },
      {
        id: "grg-clk",
        name: "GRG_CLK",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/GRG0MGXFIN_%Y%n0000_01D_30S_CLK.CLK.gz",
        type: "CLK",
      },
      {
        id: "grg-bia",
        name: "GRG_BIA",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/GRG0MGXFIN_%Y%n0000_01D_01D_OSB.BIA.gz",
        type: "BIA",
      },
      {
        id: "grg-att",
        name: "GRG_ATT",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/GRG0MGXFIN_%Y%n0000_01D_30S_ATT.OBX.gz",
        type: "ATT",
      },
    ],
  },
  {
    id: "gfz",
    name: "GFZ",
    fullName: "德国地学研究中心",
    description: "提供快速(RAP)和最终(FIN)多GNSS产品，覆盖GPS、GLONASS、Galileo、BeiDou和QZSS系统",
    products: [
      {
        id: "gfz-sp3",
        name: "GFZ_SP3",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/GFZ0MGXRAP_%Y%n0000_01D_05M_ORB.SP3.gz",
        type: "SP3",
      },
      {
        id: "gfz-clk",
        name: "GFZ_CLK",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/GFZ0MGXRAP_%Y%n0000_01D_30S_CLK.CLK.gz",
        type: "CLK",
      },
      {
        id: "gfz-bia",
        name: "GFZ_BIA",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/GFZ0MGXRAP_%Y%n0000_01D_01D_OSB.BIA.gz",
        type: "BIA",
      },
      {
        id: "gfz-att",
        name: "GFZ_ATT",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/GFZ0MGXRAP_%Y%n0000_01D_30S_ATT.OBX.gz",
        type: "ATT",
      },
      {
        id: "gfz-erp",
        name: "GFZ_ERP",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/GFZ0MGXRAP_%Y%n0000_01D_01D_ERP.ERP.gz",
        type: "ERP",
      },
    ],
  },
  {
    id: "cod",
    name: "COD",
    fullName: "欧洲定轨中心",
    description: "提供高质量的多GNSS产品，包括GPS、GLONASS、Galileo和BeiDou系统",
    products: [
      {
        id: "cod-sp3",
        name: "COD_SP3",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/COD0MGXFIN_%Y%n0000_01D_05M_ORB.SP3.gz",
        type: "SP3",
      },
      {
        id: "cod-clk",
        name: "COD_CLK",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/COD0MGXFIN_%Y%n0000_01D_30S_CLK.CLK.gz",
        type: "CLK",
      },
      {
        id: "cod-bia",
        name: "COD_BIA",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/COD0MGXFIN_%Y%n0000_01D_01D_OSB.BIA.gz",
        type: "BIA",
      },
      {
        id: "cod-att-15",
        name: "COD_ATT_15",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/COD0MGXFIN_%Y%n0000_01D_15M_ATT.OBX.gz",
        type: "ATT",
      },
      {
        id: "cod-erp",
        name: "COD_ERP",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/COD0MGXFIN_%Y%n0000_01D_12H_ERP.ERP.gz",
        type: "ERP",
      },
      {
        id: "cod-att-30",
        name: "COD_ATT_30",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/COD0MGXFIN_%Y%n0000_01D_30S_ATT.OBX.gz",
        type: "ATT",
      },
    ],
  },
  {
    id: "whm",
    name: "WHM",
    fullName: "武汉大学",
    description: "提供多GNSS产品，多系统高精度产品",
    products: [
      {
        id: "whm-sp3",
        name: "WHM_SP3",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/WHM0MGXFIN_%Y%n0000_01D_05M_ORB.SP3.gz",
        type: "SP3",
      },
      {
        id: "whm-clk",
        name: "WHM_CLK",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/WUM0MGXFIN_%Y%n0000_01D_30S_CLK.CLK.gz",
        type: "CLK",
      },
      {
        id: "whm-bia",
        name: "WHM_BIA",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/WHM0MGXRAP_%Y%n0000_01D_01D_OSB.BIA.gz",
        type: "BIA",
      },
      {
        id: "whm-att",
        name: "WHM_ATT",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/WHM0MGXFIN_%Y%n0000_01D_30S_ATT.OBX.gz",
        type: "ATT",
      },
      {
        id: "whm-erp",
        name: "WHM_ERP",
        url: "ftp://igs.ign.fr/pub/igs/products/mgex/%W/WUM0MGXFIN_%Y%n0000_01D_01D_ERP.ERP.gz",
        type: "ERP",
      },
      {
        id: "whm-rap-erp",
        name: "WHM_RAP_ERP",
        url: "ftp://igs.gnsswhu.cn/pub/whu/phasebias/%Y/orbit/WUM0MGXRAP_%Y%n0000_01D_01D_ERP.ERP.gz",
        type: "ERP",
      },
      {
        id: "whm-rap-sp3",
        name: "WHM_RAP_SP3",
        url: "ftp://igs.gnsswhu.cn/pub/whu/phasebias/%Y/orbit/WUM0MGXRAP_%Y%n0000_01D_05M_ORB.SP3.gz",
        type: "SP3",
      },
      {
        id: "whm-rap-clk",
        name: "WHM_RAP_CLK",
        url: "ftp://igs.gnsswhu.cn/pub/whu/phasebias/%Y/clock/WUM0MGXRAP_%Y%n0000_01D_30S_CLK.CLK.gz",
        type: "CLK",
      },
      {
        id: "whm-rap-bia",
        name: "WHM_RAP_BIA",
        url: "ftp://igs.gnsswhu.cn/pub/whu/phasebias/%Y/bias/WUM0MGXRAP_%Y%n0000_01D_01D_OSB.BIA.gz",
        type: "BIA",
      },
    ],
  },
  {
    id: "gbm",
    name: "GBM",
    fullName: "德国地学研究中心",
    description: "德国地学研究中心，提供多GNSS产品",
    products: [
      {
        id: "gbm-sp3-igs20",
        name: "GBM_SP3_IGS20",
        url: "ftp://ftp.gfz-potsdam.de/pub/GNSS/products/mgex/%W_IGS20/GBM0MGXRAP_%Y%n0000_01D_05M_ORB.SP3.gz",
        type: "SP3",
      },
      {
        id: "gbm-clk-igs20",
        name: "GBM_CLK_IGS20",
        url: "ftp://ftp.gfz-potsdam.de/pub/GNSS/products/mgex/%W_IGS20/GBM0MGXRAP_%Y%n0000_01D_30S_CLK.CLK.gz",
        type: "CLK",
      },
      {
        id: "gbm-bia-igs20",
        name: "GBM_BIA_IGS20",
        url: "ftp://ftp.gfz-potsdam.de/pub/GNSS/products/mgex/%W_IGS20/GBM0MGXRAP_%Y%n0000_01D_01D_OSB.BIA.gz",
        type: "BIA",
      },
      {
        id: "gbm-att-igs20",
        name: "GBM_ATT_IGS20",
        url: "ftp://ftp.gfz-potsdam.de/pub/GNSS/products/mgex/%W_IGS20/GBM0MGXRAP_%Y%n0000_01D_30S_ATT.OBX.gz",
        type: "ATT",
      },
      {
        id: "gbm-erp-igs20",
        name: "GBM_ERP_IGS20",
        url: "ftp://ftp.gfz-potsdam.de/pub/GNSS/products/mgex/%W_IGS20/GBM0MGXRAP_%Y%n0000_01D_01D_ERP.ERP.gz",
        type: "ERP",
      },
      {
        id: "gbm-sp3",
        name: "GBM_SP3",
        url: "ftp://ftp.gfz-potsdam.de/pub/GNSS/products/mgex/%W/GBM0MGXRAP_%Y%n0000_01D_05M_ORB.SP3.gz",
        type: "SP3",
      },
      {
        id: "gbm-clk",
        name: "GBM_CLK",
        url: "ftp://ftp.gfz-potsdam.de/pub/GNSS/products/mgex/%W/GBM0MGXRAP_%Y%n0000_01D_05M_CLK.CLK.gz",
        type: "CLK",
      },
      {
        id: "gbm-bia",
        name: "GBM_BIA",
        url: "ftp://ftp.gfz-potsdam.de/pub/GNSS/products/mgex/%W/GBM0MGXRAP_%Y%n0000_01D_01D_OSB.BIA.gz",
        type: "BIA",
      },
      {
        id: "gbm-att",
        name: "GBM_ATT",
        url: "ftp://ftp.gfz-potsdam.de/pub/GNSS/products/mgex/%W/GBM0MGXRAP_%Y%n0000_01D_30S_ATT.OBX.gz",
        type: "ATT",
      },
      {
        id: "gbm-erp",
        name: "GBM_ERP",
        url: "ftp://ftp.gfz-potsdam.de/pub/GNSS/products/mgex/%W/GBM0MGXRAP_%Y%n0000_01D_01D_ERP.ERP.gz",
        type: "ERP",
      },
    ],
  },
  {
    id: "other",
    name: "其他",
    fullName: "其他分析中心和数据源",
    description: "包括CAS提供的DCB产品和LEO卫星数据",
    products: [
      {
        id: "dcb-cas",
        name: "DCB_CAS",
        url: "ftp://gssc.esa.int/gnss/products/mgex/dcb/%Y/CAS0MGXRAP_%Y%n0000_01D_01D_DCB.BSX.gz",
        type: "DCB",
      },
      {
        id: "leo-data-fo-c",
        name: "LEO_DATA_FO-c",
        url: "ftp://isdcftp.gfz-potsdam.de/grace-fo/Level-1B/JPL/INSTRUMENT/RL04/%Y/gracefo_1B_%Y-%m-%d_RL04.ascii.noLRI.tgz",
        type: "LEO",
      },
      {
        id: "leo-data-fo-d",
        name: "LEO_DATA_FO-d",
        url: "ftp://isdcftp.gfz-potsdam.de/grace-fo/Level-1A/JPL/INSTRUMENT/RL04/%Y/gracefo_1A_%Y-%m-%d_RL04.ascii.noLRI.tgz",
        type: "LEO",
      },
    ],
  },
]

export default function FtpLinksPage() {
  // 安全的复制到剪贴板函数
  const copyToClipboard = (text: string, productName: string) => {
    try {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          alert(`已复制 ${productName} 的FTP地址到剪贴板`)
        })
        .catch((err) => {
          console.error("复制失败:", err)
          // 提供备用方案
          const textArea = document.createElement("textarea")
          textArea.value = text
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          try {
            document.execCommand("copy")
            alert(`已复制 ${productName} 的FTP地址到剪贴板`)
          } catch (err) {
            console.error("备用复制方法失败:", err)
            alert("复制失败，请手动复制地址")
          }
          document.body.removeChild(textArea)
        })
    } catch (err) {
      console.error("复制操作不支持:", err)
      alert("您的浏览器不支持自动复制，请手动复制地址")
    }
  }

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
              GNSS 产品FTP地址
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-3xl font-bold mb-4">GNSS精密产品FTP下载地址</h2>
          <p className="text-muted-foreground">
            收集了各分析中心提供的GNSS精密产品FTP下载地址，包括精密星历、钟差、偏差和地球自转参数等
          </p>
        </div>

        <div className="mb-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>URL占位符说明</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">FTP地址中包含以下占位符，需要替换为实际值：</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(placeholders).map(([key, description]) => (
                  <div key={key} className="flex items-center gap-2 p-2 border rounded-md">
                    <Badge variant="outline" className="font-mono">
                      {key}
                    </Badge>
                    <span className="text-sm">{description}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="grg" className="max-w-4xl mx-auto">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-6">
            {analysisCenters.map((center) => (
              <TabsTrigger key={center.id} value={center.id}>
                {center.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {analysisCenters.map((center) => (
            <TabsContent key={center.id} value={center.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {center.name}
                    <span className="text-sm font-normal text-muted-foreground">({center.fullName})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">{center.description}</p>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">产品名称</TableHead>
                          <TableHead>产品类型</TableHead>
                          <TableHead className="hidden md:table-cell">FTP地址</TableHead>
                          <TableHead className="w-[100px] text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {center.products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="cursor-help">
                                      {product.type}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">
                                      {productTypes[product.type as keyof typeof productTypes] || product.type}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="font-mono text-xs truncate hidden md:table-cell max-w-[300px]">
                              {product.url}
                            </TableCell>
                            <TableCell className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => copyToClipboard(product.url, product.name)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>复制FTP地址</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-12 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>关于GNSS精密产品</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                GNSS精密产品是由各分析中心基于全球GNSS观测站网数据计算得到的高精度产品，主要包括精密星历(SP3)、精密钟差(CLK)、相位/码偏差(BIA/OSB)、卫星姿态(ATT/OBX)和地球自转参数(ERP)等。
              </p>
              <p>
                这些产品广泛应用于精密定位、授时、大地测量、地球物理和空间科学等领域。不同分析中心提供的产品在精度、时效性和覆盖的卫星系统等方面有所不同。
              </p>
              <p>
                使用这些FTP地址时，需要将URL中的占位符(%W, %Y,
                %n等)替换为实际的时间信息。例如，%W表示GPS周，%Y表示四位年份，%n表示年内天数(DOY)。
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
