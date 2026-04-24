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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="space-y-4">
          {['产品参数', '品牌故事', '客户评价', '专业认证', '技术文档', '媒体报道'].map((cat, i) => (
            <div key={cat} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {['📋', '📖', '⭐', '🏆', '🔧', '📰'][i]}
                </span>
                <span className="text-sm font-medium text-gray-700">{cat}</span>
              </div>
              <span className="text-xs text-gray-400">{Math.floor(Math.random() * 20)} 条</span>
            </div>
          ))}
        </div>
        <div className="pt-6 mt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">知识库分类管理功能开发中</p>
        </div>
      </div>
    </div>
  )
}
