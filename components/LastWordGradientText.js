'use client'

/**
 * LastWordGradientText Component
 * Renders text with the last word in gradient colors
 * * @param {string} children - The text to display
 * @param {string} className - Additional CSS classes
 */
export default function LastWordGradientText({ children, className = '' }) {
  if (!children || typeof children !== 'string') {
    return <span className={className}>{children}</span>
  }

  const text = children.trim()
  const words = text.split(' ')
  
  if (words.length <= 1) {
    // If there's only one word or no text, apply gradient to all
    return (
      <span className={`last-word-gradient ${className}`}>
        <span className="gradient-letter">{text}</span>
      </span>
    )
  }

  const lastWord = words[words.length - 1]
  const restOfText = words.slice(0, -1).join(' ')

  return (
    <span className={`last-word-gradient ${className}`}>
      {restOfText}
      {/* The .gradient-letter class is reused from your CSS */}
      <span className="gradient-letter"> {lastWord}</span>
    </span>
  )
}