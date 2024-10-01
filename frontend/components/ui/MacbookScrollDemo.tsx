import React from "react";
import { MacbookScroll } from "../ui/macbook-scroll";
import Link from "next/link";
import Image from "next/image";

export function MacbookScrollDemo() {
  return (
    <div className="overflow-hidden dark:bg-[#0B0B0F] bg-white w-full">
      <MacbookScroll
        title={
          <span>
            GenAI is the future! <br /> No kidding.
          </span>
        }
        badge={
          <Link href="https://peerlist.io/manuarora">
            <Badge className="h-10 w-10 transform -rotate-12 border-2 border-black" />
          </Link>
        }
        src={`/laptopImage.png`}
        showGradient={false}
      />
    </div>
  );
}

const Badge = ({ className }: { className?: string }) => {
  return (
    <Image className="" src="/geminiLogo.png" alt="peerlist" width={40} height={40}/>
  );
};
