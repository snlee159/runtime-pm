"use client";

import { useState } from "react";
import { contactAPI } from "@/lib/api-secure";

interface ContactFormProps {
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function ContactForm({ className = "", onSuccess, onError }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    // Client-side validation
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      setSubmitting(false);
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      setSubmitting(false);
      return;
    }

    if (message.trim().length < 10) {
      setError("Message must be at least 10 characters");
      setSubmitting(false);
      return;
    }

    try {
      await contactAPI.submit({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        company: company.trim() || undefined,
      });

      setSubmitted(true);
      setName("");
      setEmail("");
      setCompany("");
      setMessage("");
      
      if (onSuccess) {
        onSuccess();
      }

      // Reset success message after 5 seconds
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message. Please try again.";
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={className}>
      {submitted && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400">
          <p className="font-medium">✓ Message sent successfully!</p>
          <p className="text-sm mt-1">We'll get back to you as soon as possible.</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">
          <p className="font-medium">✗ Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            minLength={2}
            maxLength={100}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 text-zinc-100 placeholder-zinc-500"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            required
            maxLength={255}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 text-zinc-100 placeholder-zinc-500"
          />
        </div>

        {/* Company (Optional) */}
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-zinc-300 mb-2">
            Company <span className="text-zinc-500 text-xs">(optional)</span>
          </label>
          <input
            type="text"
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Inc."
            maxLength={100}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 text-zinc-100 placeholder-zinc-500"
          />
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-zinc-300 mb-2">
            Message <span className="text-red-400">*</span>
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us how we can help..."
            required
            minLength={10}
            maxLength={5000}
            rows={6}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-700 text-zinc-100 placeholder-zinc-500 resize-y"
          />
          <p className="text-xs text-zinc-500 mt-1">
            {message.length} / 5000 characters
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 px-6 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "Sending..." : "Send Message"}
        </button>

        <p className="text-xs text-zinc-500 text-center">
          Your information is secure and will never be shared.
        </p>
      </form>
    </div>
  );
}
