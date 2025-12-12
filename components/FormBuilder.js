'use client'

import React, { memo, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Trash2, Plus, GripVertical, 
  Type, Mail, Hash, Link, FileText, 
  List, CheckSquare, Calendar, Sparkles
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

// Field type configuration with icons
const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: Type, color: 'text-blue-500' },
  { value: 'email', label: 'Email', icon: Mail, color: 'text-green-500' },
  { value: 'number', label: 'Number', icon: Hash, color: 'text-purple-500' },
  { value: 'url', label: 'URL', icon: Link, color: 'text-cyan-500' },
  { value: 'textarea', label: 'Text Area', icon: FileText, color: 'text-orange-500' },
  { value: 'dropdown', label: 'Dropdown', icon: List, color: 'text-pink-500' },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare, color: 'text-emerald-500' },
  { value: 'date', label: 'Date', icon: Calendar, color: 'text-amber-500' },
]

// Get icon for field type
const getFieldIcon = (type) => {
  const fieldType = FIELD_TYPES.find(f => f.value === type)
  return fieldType ? fieldType.icon : Type
}

const getFieldColor = (type) => {
  const fieldType = FIELD_TYPES.find(f => f.value === type)
  return fieldType ? fieldType.color : 'text-gray-500'
}

// ============================================================================
// Memoized Field Item Component
// ============================================================================
const FieldItem = memo(({ field, index, totalFields, onUpdate, onRemove, onAdd }) => {
  const FieldIcon = getFieldIcon(field.type)
  const iconColor = getFieldColor(field.type)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
    >
      <Card className="group relative overflow-hidden border-l-4 border-l-brand-red bg-card/60 backdrop-blur-sm hover:shadow-lg hover:shadow-brand-red/5 transition-all duration-300">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <CardHeader className="pb-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Drag Handle */}
              <div className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors">
                <GripVertical size={18} className="text-muted-foreground" />
              </div>
              
              {/* Field Number Badge */}
              <div className="bg-brand-red/10 text-brand-red w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
              
              {/* Field Type Icon */}
              <div className={`p-1.5 rounded-md bg-background/50 ${iconColor}`}>
                <FieldIcon size={16} />
              </div>
              
              {/* Field Label */}
              <CardTitle className="text-sm font-medium">
                {field.label || '(Untitled Field)'}
              </CardTitle>
              
              {/* Required Badge */}
              {field.required && (
                <Badge variant="secondary" className="text-[10px] bg-brand-red/10 text-brand-red border-brand-red/20">
                  Required
                </Badge>
              )}
            </div>
            
            {/* Delete Button */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={16} />
              </Button>
            </motion.div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-0 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field Type */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Field Type</Label>
              <Select
                value={field.type}
                onValueChange={(value) => onUpdate(index, { type: value })}
              >
                <SelectTrigger className="bg-background/50 border-border/50 focus:border-brand-red/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => {
                    const Icon = type.icon
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon size={14} className={type.color} />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Field Label */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Label / Question *</Label>
              <Input
                value={field.label}
                onChange={(e) => onUpdate(index, { label: e.target.value })}
                placeholder="e.g., What is your team name?"
                className="bg-background/50 border-border/50 focus:border-brand-red/50 transition-colors"
              />
            </div>
          </div>

          {/* Dropdown Options */}
          <AnimatePresence>
            {field.type === 'dropdown' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 bg-amber-500/5 p-4 rounded-lg border border-amber-500/20"
              >
                <Label className="text-xs font-medium text-amber-500 flex items-center gap-2">
                  <List size={14} />
                  Dropdown Options (comma-separated)
                </Label>
                <Input
                  value={field.options?.join(', ') || ''}
                  onChange={(e) =>
                    onUpdate(index, {
                      options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Option 1, Option 2, Option 3"
                  className="bg-background border-amber-500/30 focus:border-amber-500/50"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Placeholder */}
          <AnimatePresence>
            {['text', 'email', 'number', 'url', 'textarea'].includes(field.type) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <Label className="text-xs font-medium text-muted-foreground">Placeholder Text</Label>
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => onUpdate(index, { placeholder: e.target.value })}
                  placeholder="Example answer..."
                  className="bg-background/50 border-border/50 focus:border-brand-red/50 transition-colors"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Required Checkbox */}
          <div className="flex items-center space-x-2 pt-2 border-t border-border/30">
            <Checkbox
              id={`required-${field.id}`}
              checked={field.required}
              onCheckedChange={(checked) =>
                onUpdate(index, { required: checked })
              }
              className="data-[state=checked]:bg-brand-red data-[state=checked]:border-brand-red"
            />
            <Label htmlFor={`required-${field.id}`} className="font-normal cursor-pointer text-sm">
              Mark as required
            </Label>
          </div>
        </CardContent>
      </Card>
      
      {/* Insert Button */}
      <motion.div 
        className="group/insert relative h-8 w-full flex items-center justify-center my-2 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
        onClick={() => onAdd(index)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="absolute inset-x-4 h-px bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />
        <div className="relative bg-background px-3 py-1 text-xs text-brand-red border border-brand-red/30 rounded-full flex items-center gap-1 hover:bg-brand-red/5 transition-colors">
          <Plus size={12} />
          Insert Field
        </div>
      </motion.div>
    </motion.div>
  )
})

FieldItem.displayName = 'FieldItem'

// ============================================================================
// Empty State Component
// ============================================================================
function EmptyState({ onAddField }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-dashed border-brand-red/30 bg-gradient-to-br from-brand-red/5 to-transparent">
        <CardContent className="py-16">
          <div className="text-center space-y-4">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                repeatDelay: 3
              }}
              className="inline-block"
            >
              <div className="p-4 rounded-full bg-brand-red/10 inline-block">
                <Sparkles className="h-12 w-12 text-brand-red" />
              </div>
            </motion.div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">No Fields Yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                Start building your form by adding your first field. You can add text inputs, 
                dropdowns, checkboxes, and more!
              </p>
            </div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                onClick={() => onAddField(-1)} 
                className="bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity px-8"
                size="lg"
              >
                <Plus size={18} className="mr-2" />
                Add First Field
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Main Form Builder Component
// ============================================================================
export default function FormBuilder({ fields = [], setFields }) {

  const addField = useCallback((index) => {
    const newField = {
      id: uuidv4(),
      type: 'text',
      label: '',
      required: false,
      options: [],
    }
    setFields(prevFields => {
      const newFields = [...prevFields]
      newFields.splice(index + 1, 0, newField)
      return newFields
    })
  }, [setFields])

  const updateField = useCallback((index, updates) => {
    setFields(prevFields => {
      const newFields = [...prevFields]
      newFields[index] = { ...newFields[index], ...updates }
      return newFields
    })
  }, [setFields])

  const removeField = useCallback((index) => {
    setFields(prevFields => prevFields.filter((_, i) => i !== index))
  }, [setFields])

  const handleReorder = useCallback((newOrder) => {
    setFields(newOrder)
  }, [setFields])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Form Fields</h2>
          <p className="text-sm text-muted-foreground">Drag to reorder • Click to edit</p>
        </div>
        {fields.length > 0 && (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={() => addField(fields.length - 1)} 
              variant="outline" 
              size="sm"
              className="border-brand-red/30 hover:bg-brand-red/5 hover:border-brand-red/50 transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Add Field
            </Button>
          </motion.div>
        )}
      </div>

      {/* Fields List */}
      {fields.length === 0 ? (
        <EmptyState onAddField={addField} />
      ) : (
        <Reorder.Group 
          axis="y" 
          values={fields} 
          onReorder={handleReorder}
          className="space-y-2"
        >
          <AnimatePresence>
            {fields.map((field, index) => (
              <Reorder.Item 
                key={field.id || index} 
                value={field}
                className="cursor-grab active:cursor-grabbing"
              >
                <FieldItem
                  field={field}
                  index={index}
                  totalFields={fields.length}
                  onUpdate={updateField}
                  onRemove={removeField}
                  onAdd={addField}
                />
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
    </div>
  )
}