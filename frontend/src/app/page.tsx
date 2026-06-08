import Link from "next/link";
import { ArrowRight, ShieldCheck, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ContactForm } from "@/components/contact-form";
import { getCategoryIcon } from "@/lib/category-icons";
import { getCategories } from "@/lib/api";

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Verified artisans only",
    description: "Every plumber, electrician, AC technician and carpenter is NIN/BVN-checked before they reach your doorstep.",
  },
  {
    icon: MapPin,
    title: "Matched to your area",
    description: "We surface artisans operating within your neighbourhood, so help is always close by.",
  },
  {
    icon: Clock,
    title: "No more no-shows",
    description: "Bookings run on a 2-hour response SLA — if a provider goes quiet, we step in automatically.",
  },
];

const FAQS = [
  {
    question: "How does FixMate verify its artisans?",
    answer:
      "Every provider submits their NIN or BVN during onboarding. Our admin team reviews and approves each profile before it appears in search results, so you only ever see vetted professionals.",
  },
  {
    question: "Which services are available right now?",
    answer:
      "Phase 1 covers Plumbing, Electrical, AC & Cooling and Carpentry. We're expanding the category list as more verified artisans join the platform.",
  },
  {
    question: "How do I book an artisan?",
    answer:
      "Browse a service category, pick a verified provider near you, and request a booking. You'll get updates on WhatsApp as the provider confirms.",
  },
  {
    question: "What happens if a provider doesn't respond?",
    answer:
      "Our automation engine tracks every booking against a 2-hour service-level agreement. If a provider doesn't confirm in time, we cancel the request and help you find another verified artisan.",
  },
];

// Marketing landing page — hero, trust highlights, services preview, FAQ and
// contact. The categorical discovery experience itself lives at /discover.
export default async function LandingPage() {
  const categories = await getCategories();

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="industrial-texture border-border border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-6 py-20 sm:py-28">
          <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">
            Local home services, verified
          </span>
          <h1 className="font-heading text-headline-lg-mobile sm:text-display-lg max-w-3xl font-extrabold">
            Find a <span className="gradient-text">trusted artisan</span> near you, in minutes
          </h1>
          <p className="text-muted-foreground max-w-2xl text-body-lg">
            FixMate connects Nigerian homes with NIN/BVN-verified plumbers, electricians, AC technicians
            and carpenters — matched by location, backed by a 2-hour response guarantee.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              nativeButton={false}
              render={
                <Link href="/discover">
                  Browse services <ArrowRight className="h-4 w-4" />
                </Link>
              }
              size="lg"
              className="gradient-violet border-0 text-primary-foreground"
            />
            <Button nativeButton={false} render={<Link href="/sign-up">Create a free account</Link>} size="lg" variant="outline" />
          </div>
        </div>
      </section>

      {/* About / trust highlights */}
      <section id="about" className="mx-auto flex w-full max-w-6xl scroll-mt-20 flex-col gap-8 px-6 py-20">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">About FixMate</span>
          <h2 className="font-heading text-headline-lg-mobile sm:text-headline-lg max-w-2xl font-bold">
            Built so you never have to gamble on who walks through your door
          </h2>
          <p className="text-muted-foreground max-w-2xl text-body-md">
            We started FixMate because finding a reliable artisan in your area shouldn&apos;t mean asking five
            neighbours and hoping for the best. Every provider on FixMate is identity-checked, location-matched
            and held to a response-time standard — so booking help feels as safe as it should.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="border-border/60 h-full">
              <CardHeader className="flex flex-col items-start gap-3">
                <span className="gradient-violet rounded-md p-3 text-primary-foreground shadow-lg shadow-primary/20">
                  <Icon className="h-6 w-6" />
                </span>
                <CardTitle className="font-heading text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Services preview */}
      <section className="border-border bg-card/30 border-y">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-20">
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">What we cover</span>
            <h2 className="font-heading text-headline-lg-mobile sm:text-headline-lg font-bold">Services available today</h2>
            <p className="text-muted-foreground max-w-2xl text-body-md">
              Pick a category to see verified artisans operating in your area.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categories.map((category) => {
              const Icon = getCategoryIcon(category.iconName);
              return (
                <Link key={category.id} href={`/categories/${category.id}`}>
                  <Card className="group h-full border-border/60 transition-colors hover:border-primary/60 hover:bg-accent/40">
                    <CardHeader className="flex flex-col items-start gap-3">
                      <span className="gradient-violet rounded-md p-3 text-primary-foreground shadow-lg shadow-primary/20">
                        <Icon className="h-6 w-6" />
                      </span>
                      <CardTitle className="font-heading text-base">{category.name}</CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>

          <Button
            nativeButton={false}
            render={
              <Link href="/discover">
                See all categories <ArrowRight className="h-4 w-4" />
              </Link>
            }
            variant="outline"
            className="w-fit"
          />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto flex w-full max-w-3xl scroll-mt-20 flex-col gap-8 px-6 py-20">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">FAQ</span>
          <h2 className="font-heading text-headline-lg-mobile sm:text-headline-lg font-bold">Questions, answered</h2>
        </div>

        <Accordion>
          {FAQS.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className="font-heading text-left text-base">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Contact */}
      <section id="contact" className="border-border bg-card/30 scroll-mt-20 border-t">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 py-20 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <span className="text-muted-foreground font-mono text-label-sm uppercase tracking-[0.2em]">Contact</span>
            <h2 className="font-heading text-headline-lg-mobile sm:text-headline-lg font-bold">
              Have a question we haven&apos;t covered?
            </h2>
            <p className="text-muted-foreground max-w-md text-body-md">
              Send us a message and our support team will get back to you — or use the chat button in the
              corner for a faster reply on WhatsApp.
            </p>
          </div>

          <ContactForm />
        </div>
      </section>
    </main>
  );
}
