"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn === true) {
      router.push("/dashboard");
    } else if (isSignedIn === false) {
      router.push("/sign-in");
    }
  }, [isSignedIn, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-white">Loading...</p>
    </div>
  );
}
