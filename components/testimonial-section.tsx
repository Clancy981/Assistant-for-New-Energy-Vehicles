import { Card, CardContent } from "@/components/ui/card"
import { Star, Quote } from "lucide-react"

export default function TestimonialSection() {
  const testimonials = [
    {
      name: "张先生",
      role: "企业高管",
      content:
        "通过AI助手的推荐，我找到了完美符合我需求的新能源汽车。续航里程、充电便利性都完全符合我的预期，非常满意！",
      rating: 5,
      avatar: "/professional-man.png",
    },
    {
      name: "李女士",
      role: "自由职业者",
      content: "作为新手，我对新能源汽车一无所知。AI助手耐心地为我分析了各种选项，最终帮我选到了性价比最高的车型。",
      rating: 5,
      avatar: "/professional-woman-diverse.png",
    },
    {
      name: "王先生",
      role: "IT工程师",
      content:
        "AI助手的分析非常专业和全面，不仅考虑了我的预算，还分析了我的使用场景。推荐的车型完全符合我的技术控需求。",
      rating: 5,
      avatar: "/tech-professional.png",
    },
  ]

  return (
    <section className="py-20 bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            用户
            <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent"> 真实评价</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">听听我们的用户如何评价我们的AI智能助手服务</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Quote className="w-8 h-8 text-green-400 mb-4" />
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>

                <p className="text-gray-300 leading-relaxed mb-6">"{testimonial.content}"</p>

                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.avatar || "/placeholder.svg"}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-sm text-gray-400">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
