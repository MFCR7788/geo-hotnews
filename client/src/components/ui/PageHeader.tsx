interface PageHeaderProps {
  title: string
  subtitle?: string
  description?: string
  action?: React.ReactNode
  onBack?: () => void
}

export default function PageHeader({ title, subtitle, description, action, onBack }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ←
          </button>
        )}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          {(subtitle || description) && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle || description}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
