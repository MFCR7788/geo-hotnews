import { cn } from '../../lib/utils'

interface StatCardProps {
  value: number | string
  label?: string
  title?: string
  color?: string
  trend?: string | null
  icon?: string
  loading?: boolean
  onClick?: () => void
  className?: string
}

export default function StatCard({ value, label, title, color, trend, icon, loading, onClick, className }: StatCardProps) {
  const displayLabel = label || title || ''
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        {icon && <span className="text-xl">{icon}</span>}
        {trend && (
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            trend === 'up' ? 'bg-green-50 text-green-600' :
            trend === 'down' ? 'bg-red-50 text-red-600' :
            'bg-gray-50 text-gray-500'
          )}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''}
          </span>
        )}
      </div>
      <div
        className="text-3xl font-bold leading-none mb-1.5"
        style={{ color: color || 'inherit' }}
      >
        {loading ? (
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        ) : (
          value ?? '--'
        )}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{displayLabel}</div>
    </div>
  )
}
