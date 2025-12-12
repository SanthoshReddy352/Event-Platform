"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import EventForm from "@/components/EventForm"; // Use the shared component
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

import { fetchWithTimeout } from "@/lib/utils";

import { useAuth } from "@/context/AuthContext"; // Import Auth Context

function NewEventContent() {
  const { session } = useAuth(); // Destructure session
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const STORAGE_KEY = "newEventForm";

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      // [FIX] Use cached session instead of fetching again
      if (!session) throw new Error("No active session");

      const response = await fetchWithTimeout(`/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
        timeout: 15000
      });

      const data = await response.json();
      if (data.success) {
        // Clear storage on successful creation
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
        // Redirect to the Events List
        router.push(`/admin/events`);
      } else {
        alert(`Failed to create event: ${data.error}`);
      }
    } catch (error) {
      console.error("Error creating event:", error);
      if (error.name === 'AbortError') {
        alert("Request timed out. Please try again.");
      } else {
        alert("An error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => router.push("/admin/events")}
        className="mb-4"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Events
      </Button>

      <EventForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        storageKey={STORAGE_KEY}
      />
    </div>
  );
}

export default function NewEventPage() {
  return (
    <ProtectedRoute>
      <NewEventContent />
    </ProtectedRoute>
  );
}
