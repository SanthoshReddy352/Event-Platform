"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Plus, Save, ArrowLeft, Loader2, Pencil, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

import { useAuth } from '@/context/AuthContext' // Import Auth Context

function QuizBuilderContent() {
  const { session } = useAuth() // Destructure session
  const { id: eventId } = useParams();
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    question_text: "",
    options: ["", "", "", ""],
    correct_option_index: 0,
    points: 1,
  });

  useEffect(() => {
    fetchQuestions();
  }, [eventId]);

  const fetchQuestions = async () => {
    try {
      // [FIX] Use cached session
      const res = await fetch(`/api/events/${eventId}/quiz`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load saved draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(`quiz_draft_${eventId}`);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        // Only load if it's not empty/default
        if (parsed.question_text || parsed.options.some(o => o)) {
           // We don't auto-load into state immediately to avoid overwriting if they are editing
           // But we can use it when they click "Add Question"
        }
      } catch (e) {
        console.error("Error parsing saved draft", e);
      }
    }
  }, [eventId]);

  // Save to localStorage whenever formData changes
  useEffect(() => {
    if (!editingId && isDialogOpen) {
       // Only save draft for new questions
       localStorage.setItem(`quiz_draft_${eventId}`, JSON.stringify(formData));
    }
  }, [formData, editingId, isDialogOpen, eventId]);

  const handleOpenAdd = () => {
    setEditingId(null);
    // Try to load draft
    const savedDraft = localStorage.getItem(`quiz_draft_${eventId}`);
    if (savedDraft) {
        try {
            setFormData(JSON.parse(savedDraft));
        } catch (e) {
            setFormData({
                question_text: "",
                options: ["", "", "", ""],
                correct_option_index: 0,
                points: 1,
            });
        }
    } else {
        setFormData({
            question_text: "",
            options: ["", "", "", ""],
            correct_option_index: 0,
            points: 1,
        });
    }
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (q) => {
    setEditingId(q.id);
    setFormData({
      question_text: q.question_text,
      options: [...q.options],
      correct_option_index: q.correct_option_index,
      points: q.points,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.question_text.trim()) return alert("Question text required");
    if (formData.options.some((o) => !o.trim())) return alert("All options required");

    setSaving(true);
    try {
       // [FIX] Use cached session
       
      const payload = {
        action: editingId ? "update" : "create",
        question: editingId ? { ...formData, id: editingId } : formData,
      };

      const res = await fetch(`/api/events/${eventId}/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (data.success) {
        if (editingId) {
          setQuestions(questions.map(q => q.id === editingId ? data.question : q));
        } else {
          setQuestions([...questions, data.question]);
          // Clear draft on successful create
          localStorage.removeItem(`quiz_draft_${eventId}`);
          setFormData({
            question_text: "",
            options: ["", "", "", ""],
            correct_option_index: 0,
            points: 1,
          });
        }
        setIsDialogOpen(false);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error saving question:", error);
      alert("Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      // [FIX] Use cached session
      const res = await fetch(`/api/events/${eventId}/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: "delete",
          question: { id },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(questions.filter((q) => q.id !== id));
      }
    } catch (error) {
      console.error("Error deleting question:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()} size="icon">
                <ArrowLeft size={20} />
            </Button>
            <div>
                <h1 className="text-3xl font-bold">Quiz Builder</h1>
                <p className="text-gray-500">Manage questions for your quiz</p>
            </div>
        </div>
        <Button onClick={handleOpenAdd} className="bg-brand-gradient text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Question
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-red" /></div>
      ) : questions.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900 rounded-lg border border-dashed border-zinc-800">
          <p className="text-gray-400 mb-4">No questions added yet.</p>
          <Button onClick={handleOpenAdd} variant="outline" className="border-brand-orange text-brand-orange hover:bg-brand-orange/10">Create your first question</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {questions.map((q, idx) => (
            <Card key={q.id} className="relative group bg-zinc-900 border-zinc-800 hover:border-brand-red/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                      <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0 shrink-0 bg-zinc-800 border-zinc-700 text-gray-300">
                          {idx + 1}
                      </Badge>
                      <div>
                        <CardTitle className="text-lg font-medium leading-tight mb-1 text-white">
                            {q.question_text}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs font-normal bg-zinc-800 text-gray-300 hover:bg-zinc-700">
                            {q.points} Points
                        </Badge>
                      </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-brand-orange hover:text-brand-orange/80 hover:bg-brand-orange/10"
                      onClick={() => handleOpenEdit(q)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-brand-red hover:text-brand-red/80 hover:bg-brand-red/10"
                      onClick={() => handleDeleteQuestion(q.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`flex items-center p-3 rounded-md text-sm border ${
                        i === q.correct_option_index
                          ? "bg-green-900/20 border-green-500/50 text-green-400 font-medium"
                          : "bg-zinc-800 border-zinc-700 text-gray-300"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-3 border ${
                           i === q.correct_option_index 
                           ? "bg-green-600 text-white border-green-600" 
                           : "text-brand-orange border-brand-orange bg-zinc-900"
                      }`}>
                          {String.fromCharCode(65 + i)}
                      </div>
                      {opt}
                      {i === q.correct_option_index && <CheckCircle className="ml-auto h-4 w-4 text-green-500" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{editingId ? "Edit Question" : "Add New Question"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingId ? "Update the details of your question below." : "Fill in the details to create a new question."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="question" className="text-gray-200">Question Text</Label>
              <Input
                id="question"
                value={formData.question_text}
                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                placeholder="e.g. What is the capital of France?"
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-gray-500 focus-visible:ring-brand-orange"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-gray-200">Options & Correct Answer</Label>
              <div className="grid gap-3">
                {formData.options.map((opt, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                        formData.correct_option_index === i
                          ? "bg-green-600 text-white shadow-md scale-110 border-green-600"
                          : "text-brand-orange border-brand-orange bg-zinc-900 hover:bg-zinc-800"
                      }`}
                      onClick={() => setFormData({ ...formData, correct_option_index: i })}
                      title="Click to mark as correct answer"
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...formData.options];
                        newOptions[i] = e.target.value;
                        setFormData({ ...formData, options: newOptions });
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className={`flex-1 bg-zinc-900 text-white placeholder:text-gray-500 ${
                        formData.correct_option_index === i 
                        ? "border-green-500 ring-1 ring-green-500 focus-visible:ring-green-500" 
                        : "border-zinc-800 focus-visible:ring-brand-orange"
                      }`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 text-right">Click the letter circle to mark the correct answer.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="points" className="text-gray-200">Points</Label>
              <Input
                id="points"
                type="number"
                min="1"
                className="w-32 bg-zinc-900 border-zinc-800 text-white focus-visible:ring-brand-orange"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-brand-gradient text-white border-0">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Update Question" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function QuizBuilderPage() {
  return (
    <ProtectedRoute>
      <QuizBuilderContent />
    </ProtectedRoute>
  );
}
