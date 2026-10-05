import { Link } from "@tanstack/react-router";
import { Instagram, Phone, Mail, MapPin, Clock } from "lucide-react";
import skildLogo from "@/assets/skild-logo-nav.webp";
import { BUSINESS, mailHref, telHref } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-border bg-card">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-red to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-4">
        <div>
          <Link to="/" aria-label="Skild Auto — Home" className="inline-flex items-center">
            <img src={skildLogo} alt="Skild Auto" className="h-16 w-auto" />
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Built for the road. Ready for anything. Mobile auto & moto repair across Salt Lake City.
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm tracking-widest text-brand-red">Explore</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auto" className="hover:text-foreground">Auto</Link></li>
            <li><Link to="/moto" className="hover:text-foreground">Moto</Link></li>
            <li><Link to="/services" className="hover:text-foreground">Services</Link></li>
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
            <li><Link to="/reviews" className="hover:text-foreground">Reviews</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm tracking-widest text-brand-red">Get in touch</h4>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-brand-red" />
              <a href={telHref} className="hover:text-foreground">{BUSINESS.phone}</a>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-brand-red" />
              <a href={mailHref} className="hover:text-foreground">{BUSINESS.email}</a>
            </li>
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-brand-red" /> {BUSINESS.location}</li>
            <li className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 text-brand-red" /> {BUSINESS.hours}</li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm tracking-widest text-brand-red">Follow</h4>
          <a
            href={BUSINESS.instagramUrl}
            target="_blank" rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm hover:border-brand-red hover:text-brand-red"
          >
            <Instagram className="h-4 w-4" /> {BUSINESS.instagramHandle}
          </a>
          <Link
            to="/quote"
            className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-brand-red px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow"
          >
            Request Quote
          </Link>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.</p>
          <p>{BUSINESS.location} — Owned by {BUSINESS.owner}</p>
        </div>
      </div>
    </footer>
  );
}
