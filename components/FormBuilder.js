'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react'
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

// --- FIX: Now accepts fields and setFields directly ---
export default function FormBuilder({ fields = [], setFields }) {

  const addField = (index) => {
    const newField = {
      id: uuidv4(),
      type: 'text',
      label: '',
      required: false,
      options: [],
    }
    const newFields = [...fields];
    newFields.splice(index + 1, 0, newField);
    setFields(newFields); // Update parent state
  }

  const updateField = (index, updates) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFields(newFields) // Update parent state
  }

  const removeField = (index) => {
    const newFields = fields.filter((_, i) => i !== index)
    setFields(newFields) // Update parent state
  }

  const moveField = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const newFields = [...fields];
    const item = newFields[index];
    
    if (direction === 'up') {
      newFields.splice(index, 1); 
      newFields.splice(index - 1, 0, item);
    } else { 
      newFields.splice(index, 1);
      newFields.splice(index + 1, 0, item);
    }
    
    setFields(newFields); // Update parent state
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Form Fields</h2>
        <Button onClick={() => addField(fields.length - 1)} variant="outline" size="sm">
            <Plus size={16} className="mr-2" />
            Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <p className="mb-4">No fields added yet</p>
              <Button onClick={() => addField(-1)} className="bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity">
                <Plus size={16} className="mr-2" />
                Add First Field
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <React.Fragment key={field.id || index}>
              <Card className="border-l-4 border-l-brand-red">
                <CardHeader className="pb-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                        </span>
                        <CardTitle className="text-sm font-medium">
                            {field.label || '(Untitled Field)'}
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                       <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveField(index, 'up')}
                        disabled={index === 0}
                        className="h-8 w-8 text-gray-400 hover:text-foreground"
                      >
                        <ArrowUp size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveField(index, 'down')}
                        disabled={index === fields.length - 1}
                        className="h-8 w-8 text-gray-400 hover:text-foreground"
                      >
                        <ArrowDown size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(index)}
                        className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <Label>Label / Question *</Label>
                        <Input
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        placeholder="e.g., What is your team name?"
                        />
                    </div>
                  </div>

                  {/* Dropdown Options */}
                  {field.type === 'dropdown' && (
                    <div className="space-y-2 bg-yellow-500/5 p-3 rounded-md border border-yellow-500/20">
                      <Label className="text-yellow-600 dark:text-yellow-400">Dropdown Options (comma-separated)</Label>
                      <Input
                        value={field.options?.join(', ') || ''}
                        onChange={(e) =>
                          updateField(index, {
                            options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        placeholder="Option 1, Option 2, Option 3"
                        className="bg-background"
                      />
                    </div>
                  )}

                  {/* Placeholder */}
                  {['text', 'email', 'number', 'url', 'textarea'].includes(field.type) && (
                    <div className="space-y-2">
                      <Label>Placeholder Text</Label>
                      <Input
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(index, { placeholder: e.target.value })}
                        placeholder="Example answer..."
                      />
                    </div>
                  )}

                  {/* Required Checkbox */}
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id={`required-${index}`}
                      checked={field.required}
                      onCheckedChange={(checked) =>
                        updateField(index, { required: checked })
                      }
                    />
                    <Label htmlFor={`required-${index}`} className="font-normal cursor-pointer">
                      Mark as required
                    </Label>
                  </div>
                </CardContent>
              </Card>
              
              {/* Insert Button */}
              <div className="group relative h-4 w-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => addField(index)}>
                 <div className="absolute inset-x-0 h-px bg-brand-red/50"></div>
                 <div className="relative bg-background px-2 text-xs text-brand-red border border-brand-red rounded-full flex items-center">
                    <Plus size={12} className="mr-1"/> Insert Here
                 </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}