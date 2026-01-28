"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { login } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = lockedUntil.getTime() - now.getTime();

      if (diff <= 0) {
        setLockedUntil(null);
        setCountdown(null);
        setError(null);
        setAttemptsRemaining(5);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  async function handleSubmit(formData: FormData) {
    if (lockedUntil && lockedUntil > new Date()) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await login(formData);

    if (result?.lockedUntil) {
      setLockedUntil(new Date(result.lockedUntil));
      setAttemptsRemaining(0);
    }

    if (result?.attemptsRemaining !== undefined) {
      setAttemptsRemaining(result.attemptsRemaining);
    }

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      window.location.href = "/costs";
    }
  }

  const isLocked = lockedUntil && lockedUntil > new Date();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Costs Management</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email@example.com"
                required
                disabled={isLocked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                disabled={isLocked}
              />
            </div>

            {/* Lockout countdown */}
            {isLocked && countdown && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                <p className="text-sm text-red-600 font-medium">Account locked</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{countdown}</p>
                <p className="text-xs text-red-500 mt-1">until you can try again</p>
              </div>
            )}

            {/* Attempts remaining warning */}
            {!isLocked && attemptsRemaining !== null && attemptsRemaining < 5 && attemptsRemaining > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                <p className="text-sm text-yellow-700">
                  <span className="font-bold">{attemptsRemaining}</span> attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
                </p>
              </div>
            )}

            {/* Error message */}
            {error && !isLocked && (
              <div className="text-sm text-red-500 text-center">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading || isLocked}>
              {loading ? "Signing in..." : isLocked ? "Account Locked" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
