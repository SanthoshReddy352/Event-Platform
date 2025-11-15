"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

// ✅ NEW Anime.js API
import { createTimeline } from "animejs";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import EventCard from "@/components/EventCard";
import GradientText from "@/components/GradientText";
import { Building } from "lucide-react";
import { parseISO } from "date-fns";

export default function Home() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);

  // Prevent animation running twice
  const animationPlayed = useRef(false);

  // Initial fetch
  useEffect(() => {
    fetchUpcomingEvents();
    fetchClubs();
  }, []);

  // ------------------- ANIMATION (NEW API) -------------------
  useEffect(() => {
    if (loading || loadingClubs) return;
    if (animationPlayed.current) return;

    animationPlayed.current = true;

    // Create a new timeline
    const timeline = createTimeline({
      defaults: {
        easing: "easeOutExpo",
        duration: 800,
      },
    });

    timeline
      .add(".hero-title", {
        opacity: [0, 1],
        translateY: [25, 0],
        scale: [0.9, 1],
      })
      .add(
        ".hero-p",
        {
          opacity: [0, 1],
          translateY: [25, 0],
        },
        "-=600"
      )
      .add(
        ".hero-button",
        {
          opacity: [0, 1],
          translateY: [25, 0],
          delay: 150,
        },
        "-=600"
      )
      .add(
        ".club-section-title",
        {
          opacity: [0, 1],
          translateY: [25, 0],
        },
        "-=500"
      )
      .add(
        ".club-card",
        {
          opacity: [0, 1],
          translateY: [25, 0],
          scale: [0.95, 1],
          delay: 100,
        },
        "-=600"
      )
      .add(
        ".event-section-title",
        {
          opacity: [0, 1],
          translateY: [25, 0],
        },
        "-=500"
      )
      .add(
        ".event-card",
        {
          opacity: [0, 1],
          translateY: [25, 0],
          delay: 100,
        },
        "-=600"
      )
      .add(
        ".about-section",
        {
          opacity: [0, 1],
          translateY: [25, 0],
          duration: 1000,
        },
        "-=500"
      );
  }, [loading, loadingClubs]);
  // -------------------------------------------------------

  // ------------------- FETCH EVENTS -------------------
  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch("/api/events?active=true");
      const data = await response.json();

      if (data.success && Array.isArray(data.events)) {
        const now = new Date();

        const filtered = data.events.filter((event) => {
          const eventEnd = event.event_end_date
            ? parseISO(event.event_end_date)
            : null;

          if (eventEnd && now > eventEnd) return false;
          if (!event.registration_open) return false;

          const regStart = event.registration_start
            ? parseISO(event.registration_start)
            : null;
          const regEnd = event.registration_end
            ? parseISO(event.registration_end)
            : null;

          if (regStart && now < regStart) return false;
          if (regEnd && now > regEnd) return false;

          return true;
        });

        setUpcomingEvents(filtered.slice(0, 3));
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  // ------------------- FETCH CLUBS -------------------
  const fetchClubs = async () => {
    try {
      const response = await fetch("/api/clubs");
      const data = await response.json();

      if (data.success && Array.isArray(data.clubs)) {
        const unique = [
          ...new Map(data.clubs.map((club) => [club.club_name, club])).values(),
        ];

        setClubs(unique);
      }
    } catch (error) {
      console.error("Error fetching clubs:", error);
    } finally {
      setLoadingClubs(false);
    }
  };

  // ------------------- JSX RENDER -------------------
  return (
    <div>
      {/* HERO SECTION */}
      <section className="bg-brand-gradient text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="hero-title opacity-0 text-5xl font-bold mb-6">
            Welcome to EventX
          </h1>

          <p className="hero-p opacity-0 text-xl mb-8 text-white/90">
            Your central hub for hackathons, workshops, and tech events from
            every club on campus.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/events" className="hero-button opacity-0">
              <Button className="bg-white text-brand-red font-semibold hover:bg-gray-100 w-full">
                Browse Events
              </Button>
            </Link>

            <Link href="/contact" className="hero-button opacity-0">
              <Button
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-brand-red w-full"
              >
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CLUBS SECTION */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="club-section-title opacity-0 text-3xl font-bold text-center mb-12">
            <GradientText>Browse by Club</GradientText>
          </h2>

          {loadingClubs ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-12 w-12 rounded-full border-b-2 border-brand-red"></div>
              <p className="mt-4 text-gray-400">Loading clubs...</p>
            </div>
          ) : clubs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {clubs.map((club) => (
                <div key={club.club_name} className="club-card opacity-0">
                  <Link
                    href={`/events?club=${encodeURIComponent(club.club_name)}`}
                    className="group"
                  >
                    <Card className="h-full hover:shadow-xl bg-background hover:bg-zinc-900 transition-shadow duration-300">
                      <CardContent className="pt-6 text-center flex flex-col items-center">
                        <img
                          src={club.club_logo_url}
                          alt={club.club_name}
                          className="w-24 h-24 object-contain rounded-full mb-4 border-2 border-border group-hover:border-brand-orange transition-colors"
                        />
                        <h3 className="text-md text-gray-100 font-semibold group-hover:text-brand-orange transition-colors">
                          {club.club_name}
                        </h3>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Building size={48} className="mx-auto mb-4 text-gray-400" />
                <p>No clubs available yet. Check back soon!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* UPCOMING EVENTS */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="event-section-title opacity-0 text-3xl font-bold">
              <GradientText>Upcoming Events</GradientText>
            </h2>

            <Link href="/events">
              <Button variant="outline">View All Events</Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-12 w-12 inline-block rounded-full border-b-2 border-brand-red"></div>
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="event-card opacity-0">
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <p>No events open for registration. Check back soon!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="about-section opacity-0 max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              <GradientText>About EventX</GradientText>
            </h2>

            <p className="text-gray-400 mb-4">
              EventX is your college’s central platform for discovering and
              managing technical and non-technical events.
            </p>

            <p className="text-gray-400 mb-6">
              Our mission is to bring all student-run clubs together, helping
              students find opportunities easily and helping clubs manage their
              participants effortlessly.
            </p>

            <Link href="/events">
              <Button className="bg-brand-gradient text-white font-semibold hover:opacity-90">
                Join Our Next Event
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
