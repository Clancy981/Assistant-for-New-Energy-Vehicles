import { Battery, Zap, Shield, Smartphone, MapPin, DollarSign } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function FeaturesSection() {
  const features = [
    {
      icon: <Battery className="w-8 h-8 text-green-400" />,
      title: "续航里程分析",
      description: "根据您的日常出行需求，精准匹配最适合的续航里程车型",
    },
    {
      icon: <Zap className="w-8 h-8 text-blue-400" />,
      title: "充电便利性评估",
      description: "分析您周边充电设施分布，推荐充电最便利的车型",
    },
    {
      icon: <DollarSign className="w-8 h-8 text-yellow-400" />,
      title: "性价比优化",
      description: "综合购车成本、使用成本，为您找到最具性价比的选择",
    },
    {
      icon: <Shield className="w-8 h-8 text-purple-400" />,
      title: "安全性能评级",
      description: "基于权威安全测试数据，为您筛选最安全的新能源车型",
    },
    {
      icon: <Smartphone className="w-8 h-8 text-pink-400" />,
      title: "智能科技配置",
      description: "根据您的科技偏好，匹配最符合需求的智能化配置",
    },
    {
      icon: <MapPin className="w-8 h-8 text-teal-400" />,
      title: "本地化服务",
      description: "结合您所在地区的政策优惠和服务网点，提供本地化建议",
    },
  ]

  return (
    <section className="py-20 bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            为什么选择我们的
            <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent"> AI助手</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            我们的AI助手结合大数据分析和机器学习技术，为您提供最专业、最个性化的新能源汽车推荐服务
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
              <CardContent className="p-6">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
