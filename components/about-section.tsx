import { Button } from "@/components/ui/button"
import { CheckCircle, Users, Award, TrendingUp } from "lucide-react"

export default function AboutSection() {
  const stats = [
    { icon: <Users className="w-8 h-8 text-green-400" />, number: "50万+", label: "服务用户" },
    { icon: <Award className="w-8 h-8 text-blue-400" />, number: "200+", label: "合作品牌" },
    { icon: <TrendingUp className="w-8 h-8 text-purple-400" />, number: "95%", label: "满意度" },
    { icon: <CheckCircle className="w-8 h-8 text-teal-400" />, number: "24/7", label: "在线服务" },
  ]

  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                关于我们的
                <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                  {" "}
                  智能助手
                </span>
              </h2>
              <p className="text-xl text-gray-300 leading-relaxed mb-8">
                我们致力于通过人工智能技术，为每一位用户提供最专业、最个性化的新能源汽车购买建议。
                我们的AI助手经过数百万真实用户数据训练，能够精准理解您的需求并提供最适合的推荐。
              </p>
            </div>

            <div className="space-y-4">
              {[
                "基于大数据的智能分析算法",
                "覆盖全国主流新能源汽车品牌",
                "实时更新的市场价格和政策信息",
                "专业的汽车行业专家团队支持",
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">{item}</span>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-6 text-lg rounded-full"
            >
              了解更多
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
                <div className="flex justify-center mb-4">{stat.icon}</div>
                <div className="text-3xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
