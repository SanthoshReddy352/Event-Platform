
import { useState, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'

// [OPTIMIZED] Wrapped in React.memo to prevent unnecessary re-renders
const DynamicForm = memo(function DynamicForm({ fields = [], onSubmit, eventId, formData, onFormChange, submitLabel }) {
  
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // [OPTIMIZED] useCallback to prevent function recreation on every render
  const handleInputChange = useCallback((fieldId, value) => {
    if (onFormChange) {
      onFormChange({ ...formData, [fieldId]: value });
    }
    
    if (errors[fieldId]) {
      setErrors({ ...errors, [fieldId]: null })
    }
  }, [formData, errors, onFormChange])

  const validateForm = useCallback(() => {
    const newErrors = {}
    fields.forEach((field) => {
      const fieldKey = field.id; 
      if (field.required && !formData[fieldKey]) {
        newErrors[fieldKey] = `${field.label} is required`
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [fields, formData])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [validateForm, onSubmit, formData])

  const renderField = useCallback((field) => {
    const fieldId = field.id 
    const value = formData[fieldId] || ''

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
              value={value}
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
              value={value}
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
              value={value} 
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
              checked={value === true}
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
              value={value}
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
  }, [formData, errors, handleInputChange])

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
        className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : (submitLabel || 'Submit Registration')}
      </Button>
    </form>
  )
});

export default DynamicForm