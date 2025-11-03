'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, Plus, GripVertical } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
  { value: 'url', label: 'URL' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
]

export default function FormBuilder({ initialFields = [], onSave }) {
  const [fields, setFields] = useState(
    initialFields.length > 0 ? initialFields : []
  )
  const [isSaving, setIsSaving] = useState(false)

  const addField = () => {
    const newField = {
      id: uuidv4(),
      type: 'text',
      label: '',
      required: false,
      options: [],
    }
    setFields([...fields, newField])
  }

  const updateField = (index, updates) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFields(newFields)
  }

  const removeField = (index) => {
    const newFields = fields.filter((_, i) => i !== index)
    setFields(newFields)
  }

  const handleSave = async () => {
    // Validate fields
    const validFields = fields.filter(f => f.label.trim() !== '')
    if (validFields.length === 0) {
      alert('Please add at least one field with a label')
      return
    }

    setIsSaving(true)
    try {
      await onSave(validFields)
    } catch (error) {
      console.error('Error saving form:', error)
      alert('Failed to save form. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Form Builder</h2>
        <Button onClick={addField} variant="outline">
          <Plus size={16} className="mr-2" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <p className="mb-4">No fields added yet</p>
              <Button onClick={addField} className="bg-[#00629B] hover:bg-[#004d7a]">
                <Plus size={16} className="mr-2" />
                Add First Field
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id || index}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <GripVertical size={20} className="text-gray-400" />
                    <CardTitle className="text-sm font-medium">
                      Field {index + 1}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Field Type */}
                <div className="space-y-2">
                  <Label>Field Type</Label>
                  <Select
                    value={field.type}
                    onValueChange={(value) => updateField(index, { type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Field Label */}
                <div className="space-y-2">
                  <Label>Field Label *</Label>
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    placeholder="e.g., Team Name, Email Address"
                  />
                </div>

                {/* Dropdown Options */}
                {field.type === 'dropdown' && (
                  <div className="space-y-2">
                    <Label>Options (comma-separated)</Label>
                    <Input
                      value={field.options?.join(', ') || ''}
                      onChange={(e) =>
                        updateField(index, {
                          options: e.target.value.split(',').map((s) => s.trim()),
                        })
                      }
                      placeholder="e.g., Option 1, Option 2, Option 3"
                    />
                  </div>
                )}

                {/* Placeholder */}
                {['text', 'email', 'number', 'url', 'textarea'].includes(field.type) && (
                  <div className="space-y-2">
                    <Label>Placeholder (optional)</Label>
                    <Input
                      value={field.placeholder || ''}
                      onChange={(e) => updateField(index, { placeholder: e.target.value })}
                      placeholder="e.g., Enter your team name"
                    />
                  </div>
                )}

                {/* Required Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`required-${index}`}
                    checked={field.required}
                    onCheckedChange={(checked) =>
                      updateField(index, { required: checked })
                    }
                  />
                  <Label htmlFor={`required-${index}`} className="font-normal">
                    Required field
                  </Label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {fields.length > 0 && (
        <div className="flex justify-end space-x-4 pt-4">
          <Button
            onClick={handleSave}
            className="bg-[#00629B] hover:bg-[#004d7a]"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Form'}
          </Button>
        </div>
      )}
    </div>
  )
}
