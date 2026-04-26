import * as React from "react"
import { ChevronDown } from "lucide-react"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: Array<{ value: string; label: string }>
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, ...props }, ref) => (
    <div className="relative inline-block w-full">
      <select
        ref={ref}
        className={`w-full appearance-none bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 pr-10 text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:border-[#276ef1] focus:ring-1 focus:ring-[#276ef1] transition-colors ${className}`}
        {...props}
      >
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {props.children}
      </select>
      <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
    </div>
  )
)
Select.displayName = "Select"

export { Select }
