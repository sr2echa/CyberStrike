"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Lock, Cpu } from "lucide-react";

export default function Page() {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold mb-4">CyberStrike</h1>
          <p className="text-xl md:text-2xl mb-8">
            AI-powered security audit analysis for the modern age
          </p>
          <Link href="/upload">
            <Button className="text-lg px-8 py-4 bg-black text-white hover:bg-gray-800 transition-colors">
              Start Your Analysis
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Comprehensive Analysis"
            description="Our AI examines every aspect of your security infrastructure, leaving no stone unturned."
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="Rapid Results"
            description="Get actionable insights in minutes, not days or weeks."
          />
          <FeatureCard
            icon={<Lock className="w-8 h-8" />}
            title="Cutting-edge Security"
            description="Stay ahead of threats with our constantly updated threat intelligence."
          />
          <FeatureCard
            icon={<Cpu className="w-8 h-8" />}
            title="AI-Powered Insights"
            description="Leverage the power of advanced machine learning for unparalleled analysis."
          />
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to secure your future?</h2>
          <p className="text-xl mb-8">
            Join the ranks of forward-thinking organizations that trust CyberStrike for their
            security needs.
          </p>
          <Link href="/upload">
            <Button className="text-lg px-8 py-4 bg-black text-white hover:bg-gray-800 transition-colors">
              Get Started Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 transition-all hover:border-gray-400">
      <div className="flex items-center mb-4">
        {icon}
        <h3 className="text-xl font-semibold ml-2">{title}</h3>
      </div>
      <p>{description}</p>
    </div>
  );
}
