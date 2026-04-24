import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  variant?: 'default' | 'warning'
}

export default function TagInput({ tags, onChange, placeholder = '+ 添加', variant = 'default' }: TagInputProps) {
  const [inputVisible, setInputVisible] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function showInput() {
    setInputVisible(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function addTag() {
    const val = inputValue.trim()
    if (val && !tags.includes(val)) {
      onChange([...tags, val])
    }
    setInputVisible(false)
    setInputValue('')
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 min-h-[36px] px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
      {tags.map((tag, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-md',
            variant === 'warning'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          )}
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="hover:text-red-500"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {inputVisible ? (
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          className="flex-1 min-w-[100px] bg-transparent outline-none text-sm text-gray-700 dark:text-gray-300"
        />
      ) : (
        <button
          type="button"
          onClick={showInput}
          className="text-sm text-gray-400 hover:text-blue-500 px-1"
        >
          {placeholder}
        </button>
      )}
    </div>
  )
}
