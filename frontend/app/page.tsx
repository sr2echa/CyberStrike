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
import { useTheme } from "next-themes";

export default function Page(){
  return(
    <div >
      <LandingSection />
    </div>
  )
}

export function LandingSection(){

  const {theme,setTheme} = useTheme();
  return(
    <div>
      {/* <ModeToggle /> */}
      <div className="sm:hidden h-screen flex flex-col  items-center">
        <div className="flex sm:hidden w-full justify-center mb-8 mt-28">
          <Image className="hidden dark:block" src="/whiteFischerLogo.png" alt="Fischer Logo light" width={60} height={40}/>
          <Image className="dark:hidden" src="/blackFischerLogo.png" alt="Fischer Logo dark" width={60} height={40}/>  
        </div>

        <div className="mb-4 text-5xl sm:text-8xl font-semibold text-center">CyberStrike</div>
          <FlipWordsDemo />        
          <Link className="flex justify-center mt-8 sm:mt-16" href={"/upload"}>
            <RainbowButton >Start your Analysis!</RainbowButton>
          </Link>
          <div className="mt-32 flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="animate-bounce dark:fill-white" width="24" height="24" viewBox="0 0 24 24" id="chevron-force-down">
              <path d="M6.25753788,13.2424621 C5.84748737,12.8324116 5.84748737,12.1675884 6.25753788,11.7575379 C6.66758839,11.3474874 7.33241161,11.3474874 7.74246212,11.7575379 L12,16.0150758 L16.2575379,11.7575379 C16.6675884,11.3474874 17.3324116,11.3474874 17.7424621,11.7575379 C18.1525126,12.1675884 18.1525126,12.8324116 17.7424621,13.2424621 L12.7424621,18.2424621 C12.3324116,18.6525126 11.6675884,18.6525126 11.2575379,18.2424621 L6.25753788,13.2424621 Z M6.25753788,7.24246212 C5.84748737,6.83241161 5.84748737,6.16758839 6.25753788,5.75753788 C6.66758839,5.34748737 7.33241161,5.34748737 7.74246212,5.75753788 L12,10.0150758 L16.2575379,5.75753788 C16.6675884,5.34748737 17.3324116,5.34748737 17.7424621,5.75753788 C18.1525126,6.16758839 18.1525126,6.83241161 17.7424621,7.24246212 L12.7424621,12.2424621 C12.3324116,12.6525126 11.6675884,12.6525126 11.2575379,12.2424621 L6.25753788,7.24246212 Z"></path>
            </svg>  
          </div>      
        </div>
      <div className="hidden sm:flex w-full justify-center pt-16 my-16">
        <Image className="hidden dark:block" src="/whiteFischerLogo.png" alt="Fischer Logo light" width={100} height={40}/>
        <Image className="dark:hidden" src="/blackFischerLogo.png" alt="Fischer Logo dark" width={100} height={40}/>  
      </div>
      {/* <div className="sm:block hidden">
        <MacbookScrollDemo />
      </div> */}
      <GoogleGeminiEffectDemo />
      <div className="flex gap-4 mt-16 flex-col lg:items-stretch items-center lg:flex-row px-4 py-5">
        <CardGrid />
        <BigCard />
      </div>
      <div>
        <p className="text-center font-mono lowercase pb-4">Made with 💖 by <span className="font-extrabold">Team Fischer - </span> <a className="underline" href="https://github.com/sr2echa">Sreecha</a> , <a className="underline" href="https://github.com/wreckage0907">Girish</a> , <a className="underline" href="https://github.com/TobyVincentJohn">Toby</a> & <a className="underline" href="https://github.com/Akkilesh-A">Akkilesh</a></p>
      </div>
    </div>
  )
}

export function BigCard(){
  return(
    <div className="flex m-2 dark:bg-[#0a0a0a] w-full bg-white justify-center items-center flex-col gap-8 border-2 rounded-xl px-8 py-16">

      <div className="flex flex-col gap-4">
        <div className="text-5xl font-extrabold text-center">
          Ready to secure your future?
        </div>
        <div className="text-xl text-center">
          Join the ranks of forward-thinking organizations that trust CyberStrike for their security needs.
        </div>
      </div>

      <Link href={"/upload"}>
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
      className="h-[300vh] sm:block hidden w-full rounded-md relative pt-20 overflow-clip"
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
