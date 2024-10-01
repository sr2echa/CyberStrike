"use client";

import { useRef } from "react";
import Link from "next/link";
import { 
  HoverEffect,
  RainbowButton,
  GoogleGeminiEffect,
  MacbookScrollDemo,
} from "@/components/ui";
import { Shield, Zap, Lock, Cpu, ArrowRight, } from "lucide-react";
import Image from "next/image";
import { motion, useScroll, useTransform} from "framer-motion"
import { FlipWordsDemo } from "@/components/ui/google-gemini-effect";
import { MacbookScroll } from "@/components/ui/macbook-scroll";
import { ModeToggle } from "@/components/ui";

export default function Page(){
  return(
    <div className="p-8">
      <LandingSection />
    </div>
  )
}

export function LandingSection(){
  return(
    <div>
      <ModeToggle />
      <div className="sm:hidden h-screen flex flex-col justify-center items-center">
        <motion.div className="mb-4 text-5xl sm:text-8xl font-semibold text-center">CyberStrike</motion.div>
        <FlipWordsDemo />        
        <Link className="flex justify-center mt-8 sm:mt-16" href={"/upload2"}>
          <RainbowButton>Start your Analysis!</RainbowButton>
        </Link>
        <div className="mt-32 flex justify-center">
          <Image className="animate-bounce" src="/chevron-force-down.svg" alt="down_arrow" width={50} height={50} />
        </div>      
      </div>

      <div>
        <MacbookScrollDemo />
      </div>
      <div className="flex gap-4 mt-16 flex-col md:flex-row">
        <CardGrid />
        <BigCard />
      </div>
      <GoogleGeminiEffectDemo />
    </div>
  )
}

export function BigCard(){
  return(
    <div className="flex dark:bg-gray-900 w-full bg-white justify-center items-center flex-col gap-8 border-2 rounded-xl px-8 py-16">

      <div className="flex flex-col gap-4">
        <div className="text-5xl font-extrabold text-center">
          Ready to secure your future?
        </div>
        <div className="text-xl text-center">
          Join the ranks of forward-thinking organizations that trust CyberStrike for their security needs.
        </div>
      </div>

      <Link href={"/upload2"}>
        <RainbowButton>
          <div className="flex gap-2">
            <p>Get Started Now </p>
            <ArrowRight />
          </div>
        </RainbowButton>
      </Link>     

    </div>
  )
}

export function CardGrid() {
  return (
    <div className="max-w-5xl mx-auto px-8">
      <HoverEffect items={Things} />
    </div>
  );
}

export const Things = [
  {
    icon: <Shield />,
    title: "Comprehensive Analysis",
    description:
      "Our AI examines every aspect of your security infrastructure, leaving no stone unturned.",
  },
  {
    icon: <Zap />,
    title:"Rapid Results",
    description:"Get actionable insights in minutes, not days or weeks.",
  },
  {
    icon: <Lock />,
    title: "Cutting-edge Security",
    description:"Stay ahead of threats with our constantly updated threat intelligence.",
  },
  {
    icon: <Cpu />,
    title: "Meta",
    description:
      "A technology company that focuses on building products that advance Facebook's mission of bringing the world closer together.",
  },
];

export function GoogleGeminiEffectDemo() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const pathLengthFirst = useTransform(scrollYProgress, [0, 0.8], [0.2, 1.2]);
  const pathLengthSecond = useTransform(scrollYProgress, [0, 0.8], [0.15, 1.2]);
  const pathLengthThird = useTransform(scrollYProgress, [0, 0.8], [0.1, 1.2]);
  const pathLengthFourth = useTransform(scrollYProgress, [0, 0.8], [0.05, 1.2]);
  const pathLengthFifth = useTransform(scrollYProgress, [0, 0.8], [0, 1.2]);

  return (
    <div
      className="h-[400vh] sm:block hidden  w-full dark:border dark:border-white/[0.1] rounded-md relative pt-40 overflow-clip"
      ref={ref}
    >
      <GoogleGeminiEffect
        pathLengths={[
          pathLengthFirst,
          pathLengthSecond,
          pathLengthThird,
          pathLengthFourth,
          pathLengthFifth,
        ]}
      />
      
    </div>
  );
}
