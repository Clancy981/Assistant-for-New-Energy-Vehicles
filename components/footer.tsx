import { Button } from "@/components/ui/button"
import { Car, Mail, Phone, MapPin, Zap } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-black border-t border-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-400 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">新能源AI助手</span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              通过AI智能技术，为您提供最专业的新能源汽车购买建议，让每一次选择都更加智能。
            </p>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">服务项目</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  车型推荐
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  性价比分析
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  充电方案
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  政策咨询
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">客户支持</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  使用指南
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  常见问题
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  联系客服
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  意见反馈
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">联系我们</h3>
            <div className="space-y-3 text-gray-400">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-green-400" />
                <span>400-888-9999</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-green-400" />
                <span>service@evai.com</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-green-400" />
                <span>北京市朝阳区科技园</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="border-t border-gray-800 pt-12 mb-8">
          <div className="text-center space-y-6">
            <h3 className="text-2xl font-bold text-white">准备好找到您的理想新能源汽车了吗？</h3>
            <p className="text-gray-400 max-w-2xl mx-auto">
              立即开始使用我们的AI智能助手，几分钟内获得专业的个性化推荐
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-6 text-lg rounded-full group"
            >
              <Zap className="mr-2 w-5 h-5" />
              立即开始
            </Button>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">© 2024 新能源AI助手. 保留所有权利.</p>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-green-400 transition-colors">
              隐私政策
            </a>
            <a href="#" className="hover:text-green-400 transition-colors">
              服务条款
            </a>
            <a href="#" className="hover:text-green-400 transition-colors">
              Cookie政策
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
