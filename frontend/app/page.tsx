"use client";

import Link from "next/link";
import { 
  SparklesCore,
  HoverEffect,
  RainbowButton
} from "@/components/ui";
import { Shield, Zap, Lock, Cpu, ArrowRight, } from "lucide-react";
import Image from "next/image";

export default function Page(){
  return(
    <div className="p-8">
      <LandingSection />
    </div>
  )
}

export function LandingSection(){
  return(
    // <div className="flex h-screen md:h-auto w-screen justify-center flex-col">
    //   {/* <h1 className="text-5xl sm:text-8xl font-semibold text-center">CyberStrike</h1> */}
    //   {/* <h1 className="text-2xl font-semibold text-center">Developing and Safeguarding Organisations</h1> */}
        
    //     {/* <SparklesCore
    //       background="transparent"
    //       minSize={1}
    //       maxSize={3}
    //       particleDensity={300}
    //       className="absolute inset-0"
    //       particleColor=""
    //     /> */}
        // {/* <Link href={"/upload2"}>
        // <RainbowButton>Start your Analysis!</RainbowButton>
        // </Link> */}
    //   {/* <div className="lg:block hidden bg-white border rounded-2xl p-4">
    //     <Image src="/image.png" className="rounded-xl" alt="landing_Image" width={500} height={200} />
    //   </div> */}
    //   {/* <div className="flex gap-4 ">
    //     <div className="flex flex-wrap gap-8 w-1/2">
    //       <CardGrid />
    //     </div>
    //     <div className="p-2 flex w-1/2">
    //       <BigCard />
    //     </div>
    //   </div> */}
    // </div>
    <div>
      <div className=" h-screen flex flex-col justify-center items-center">
        <h1 className="mb-4 text-5xl sm:text-8xl font-semibold text-center">CyberStrike</h1>
        <h1 className="sm:text-2xl text-s font-semibold text-center">Developing and Safeguarding Organisations</h1>
        <SparklesCore
          background="transparent"
          minSize={1}
          maxSize={3}
          particleDensity={300}
          className="absolute inset-0"
          particleColor=""
        />
        <Link className="flex justify-center mt-8 sm:mt-16" href={"/upload2"}>
          <RainbowButton>Start your Analysis!</RainbowButton>
        </Link>
        <div className="mt-32 flex justify-center">
          <Image className="animate-bounce" src="/chevron-force-down.svg" alt="down_arrow" width={50} height={50} />
        </div>      
      </div>
      <div className="flex gap-4 flex-col md:flex-row">
        <CardGrid />
        <BigCard />
      </div>
    </div>
  )
}

export function BigCard(){
  return(
    <div className="flex w-full bg-white justify-center items-center flex-col gap-8 border-2 rounded-xl px-8 py-16">

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


