'use client'

/**
 * FirstWordGradientText Component
 * Renders text with the first word in gradient colors
 * * @param {string} children - The text to display
 * @param {string} className - Additional CSS classes
 */
export default function FirstWordGradientText({ children, className = '' }) {
  if (!children || typeof children !== 'string') {
    return <span className={className}>{children}</span>
  }

  const text = children.trim()
  const words = text.split(' ')
  
  if (words.length === 0) {
    return <span className={className}>{text}</span>
  }

  const firstWord = words[0]
  const restOfText = words.slice(1).join(' ')

  return (
    <span className={`first-word-gradient ${className}`}>
      {/* The .gradient-letter class is reused from your CSS */}
      <span className="gradient-letter">{firstWord}</span>
      {/* We add the space back in */}
      {restOfText && ` ${restOfText}`}
    </span>
  )
}