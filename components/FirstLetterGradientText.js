'use client'

/**
 * FirstLetterGradientText Component
 * Renders text with the first letter in gradient colors
 * * @param {string} children - The text to display
 * @param {string} className - Additional CSS classes
 */
export default function FirstLetterGradientText({ children, className = '' }) {
  if (!children || typeof children !== 'string') {
    return <span className={className}>{children}</span>
  }

  const text = children.trim()
  const firstChar = text.slice(0, 1)
  const restOfText = text.slice(1)

  return (
    <span className={`first-letter-gradient ${className}`}>
      <span className="gradient-letter">{firstChar}</span>
      {restOfText}
    </span>
  )
}