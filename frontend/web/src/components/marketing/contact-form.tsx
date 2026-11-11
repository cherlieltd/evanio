"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="border border-border bg-surface px-6 py-10">
        <p className="font-heading text-2xl font-semibold text-ink">
          Message received
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Thanks for reaching out. This demo form does not send email yet—wire it
          to the backend when you are ready.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 border border-border bg-background p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" required placeholder="Alex Morgan" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="alex@business.com"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="company">Business name</Label>
        <Input id="company" name="company" placeholder="Acme Coffee Co." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">How can we help?</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Tell us about your marketing goals..."
        />
      </div>
      <Button
        type="submit"
        className="h-10 bg-brand text-brand-foreground hover:bg-brand/90"
      >
        Send message
      </Button>
    </form>
  );
}
