"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion"; // Make sure motion is imported

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

  // Initial fetch
  useEffect(() => {
    fetchUpcomingEvents();
    fetchClubs();
  }, []);

  // ------------------- ANIMATION (FRAMER MOTION) -------------------
  const FADE_UP_VARIANT = {
    initial: { opacity: 0, y: 25 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true }, // Ensures the animation only plays once
    transition: { ease: "easeOut", duration: 0.8 },
  };
  // -----------------------------------------------------------------

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
          <motion.h1
            className="hero-title text-5xl font-bold mb-6"
            {...FADE_UP_VARIANT}
          >
            Welcome to EventX
          </motion.h1>

          <motion.p
            className="hero-p text-xl mb-8 text-white/90"
            {...FADE_UP_VARIANT}
            transition={{ ...FADE_UP_VARIANT.transition, delay: 0.1 }}
          >
            Your central hub for hackathons, workshops, and tech events from
            every club on campus.
          </motion.p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <motion.div
              className="hero-button"
              {...FADE_UP_VARIANT}
              transition={{ ...FADE_UP_VARIANT.transition, delay: 0.2 }}
              // ✅ ADDED HOVER/TAP ANIMATIONS
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/events">
                <Button className="bg-white text-brand-red font-semibold hover:bg-gray-100 w-full">
                  Browse Events
                </Button>
              </Link>
            </motion.div>

            <motion.div
              className="hero-button"
              {...FADE_UP_VARIANT}
              transition={{ ...FADE_UP_VARIANT.transition, delay: 0.3 }}
              // ✅ ADDED HOVER/TAP ANIMATIONS
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/contact">
                <Button
                  variant="outline"
                  className="text-white border-white hover:bg-white hover:text-brand-red w-full"
                >
                  Contact Us
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CLUBS SECTION */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <motion.h2
            className="club-section-title text-3xl font-bold text-center mb-12"
            {...FADE_UP_VARIANT}
          >
            <GradientText>Browse by Club</GradientText>
          </motion.h2>

          {loadingClubs ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-12 w-12 rounded-full border-b-2 border-brand-red"></div>
              <p className="mt-4 text-gray-400">Loading clubs...</p>
            </div>
          ) : clubs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {clubs.map((club, index) => (
                <motion.div
                  key={club.club_name}
                  className="club-card h-full" // Added h-full
                  {...FADE_UP_VARIANT}
                  transition={{
                    ...FADE_UP_VARIANT.transition,
                    delay: index * 0.05,
                  }}
                  // ✅ ADDED HOVER/TAP ANIMATIONS
                  whileHover={{ scale: 1.03, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
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
                </motion.div>
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
          <motion.div
            className="flex justify-between items-center mb-8"
            {...FADE_UP_VARIANT}
          >
            <h2 className="event-section-title text-3xl font-bold">
              <GradientText>Upcoming Events</GradientText>
            </h2>

            <Link href="/events">
              <Button variant="outline">View All Events</Button>
            </Link>
          </motion.div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-12 w-12 inline-block rounded-full border-b-2 border-brand-red"></div>
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcomingEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  className="event-card h-full" // Added h-full
                  {...FADE_UP_VARIANT}
                  transition={{
                    ...FADE_UP_VARIANT.transition,
                    delay: index * 0.1,
                  }}
                  // ✅ ADDED HOVER/TAP ANIMATIONS
                  whileHover={{ scale: 1.03, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <EventCard event={event} />
                </motion.div>
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
          <motion.div
            className="about-section max-w-3xl mx-auto text-center"
            {...FADE_UP_VARIANT}
          >
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
          </motion.div>
        </div>
      </section>
    </div>
  );
}