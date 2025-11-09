'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'

// --- START OF FIX: Accept formData and onFormChange as props ---
export default function DynamicForm({ fields = [], onSubmit, eventId, formData, onFormChange }) {
  // --- END OF FIX ---
  
  // This local state is only for validation errors
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (fieldId, value) => {
    // --- START OF FIX: Call parent's state updater ---
    // This updates the state in `page.js` which is synced to sessionStorage
    if (onFormChange) {
      onFormChange({ ...formData, [fieldId]: value });
    }
    // --- END OF FIX ---
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors({ ...errors, [fieldId]: null })
    }
  }

  const validateForm = () => {
    const newErrors = {}
    fields.forEach((field) => {
      const fieldKey = field.id; 
      // --- START OF FIX: Use formData from props for validation ---
      if (field.required && !formData[fieldKey]) {
      // --- END OF FIX ---
        newErrors[fieldKey] = `${field.label} is required`
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      // --- START OF FIX: Pass formData from props to parent onSubmit ---
      await onSubmit(formData)
      // --- END OF FIX ---
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderField = (field) => {
    const fieldId = field.id 
    // --- START OF FIX: Use formData from props to get value ---
    const value = formData[fieldId] || ''
    // --- END OF FIX ---

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'url':
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type={field.type}
              value={value} // Value comes from parent state
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              required={field.required}
            />
            {errors[fieldId] && (
              <p className="text-red-500 text-sm">{errors[fieldId]}</p>
            )}
          </div>
        )

      case 'textarea':
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={fieldId}
              value={value} // Value comes from parent state
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              required={field.required}
              rows={4}
            />
            {errors[fieldId] && (
              <p className="text-red-500 text-sm">{errors[fieldId]}</p>
            )}
          </div>
        )

      case 'dropdown':
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value} // Value comes from parent state
              onValueChange={(val) => handleInputChange(field.id, val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option, idx) => (
                  <SelectItem key={idx} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors[fieldId] && (
              <p className="text-red-500 text-sm">{errors[fieldId]}</p>
            )}
          </div>
        )

      case 'checkbox':
        return (
          <div key={fieldId} className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={value === true} // Value comes from parent state
              onCheckedChange={(checked) => handleInputChange(field.id, checked)}
            />
            <Label htmlFor={fieldId} className="font-normal">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        )

      case 'date':
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type="date"
              value={value} // Value comes from parent state
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
            />
            {errors[fieldId] && (
              <p className="text-red-500 text-sm">{errors[fieldId]}</p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  if (fields.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">
            No registration form available for this event yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {fields.map((field) => renderField(field))}
      <Button
        type="submit"
        className="w-full bg-[#00629B] hover:bg-[#004d7a]"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Registration'}
      </Button>
    </form>
  )
}