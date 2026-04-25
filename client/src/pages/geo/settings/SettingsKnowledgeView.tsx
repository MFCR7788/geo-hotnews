/**
 * 知识库设置
 */
import { useNavigate } from 'react-router'
import PageHeader from '../../../components/ui/PageHeader'

export default function SettingsKnowledgeView() {
  const navigate = useNavigate()
  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="知识库设置" subtitle="品牌知识库分类与管理" onBack={() => navigate('/geo/dashboard')} />
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
        <div className="space-y-4">
          {['产品参数', '品牌故事', '客户评价', '专业认证', '技术文档', '媒体报道'].map((cat, i) => (
            <div key={cat} className="flex items-center justify-between p-4 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {['📋', '📖', '⭐', '🏆', '🔧', '📰'][i]}
                </span>
                <span className="text-sm font-medium text-gray-200">{cat}</span>
              </div>
              <span className="text-xs text-gray-500">{Math.floor(Math.random() * 20)} 条</span>
            </div>
          ))}
        </div>
        <div className="pt-6 mt-6 border-t border-white/10">
          <p className="text-xs text-gray-500">知识库分类管理功能开发中</p>
        </div>
      </div>
    </div>
  )
}
