import React from "react";
import { MacbookScroll } from "../ui/macbook-scroll";
import Link from "next/link";
import Image from "next/image";

export function MacbookScrollDemo() {
  return (
    <div className="overflow-hidden dark:bg-[#0a0a0a] rounded-xl bg-white w-full">
      <MacbookScroll
        title={
          <span>
            GenAI is the future! <br /> No kidding.
          </span>
        }
        badge={
          <Link target="_blank" href="https://github.com/sr2echa/CyberStrike">
            <Badge />
          </Link>
        }
        src={`/laptopImage.png`}
        showGradient={false}
      />
    </div>
  );
}

const Badge = () => {
  return (
    <div>
      <Image className="hidden dark:block" src="/lightGithubLogo.png" alt="peerlist" width={40} height={40}/>
      <Image className="dark:hidden" src="/githubLogo.png" alt="peerlist" width={40} height={40}/>
    </div>
  );
};
