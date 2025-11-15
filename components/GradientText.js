'use client'

/**
 * GradientText Component
 * Renders text with the last letter in gradient colors
 * * @param {string} children - The text to display
 * @param {string} className - Additional CSS classes
 */
export default function GradientText({ children, className = '' }) {
  if (!children || typeof children !== 'string') {
    return <span className={className}>{children}</span>
  }

  const text = children.trim()
  const lastChar = text.slice(-1)
  const restOfText = text.slice(0, -1)

  return (
    <span className={`last-letter-gradient ${className}`}>
      {restOfText}
      <span className="gradient-letter">{lastChar}</span>
    </span>
  )
}