"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
} from "@/components/ui"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
        <Button className="z-50" onClick={()=>{
        if(theme == "light") {
          setTheme("dark")
        } else {
          setTheme("light")
        }
      }} variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
    </DropdownMenu>
  )
}

// export function ModeToggle() {
//   const { theme,setTheme } = useTheme()

//   return (
//     <div>
//       <Button onClick={()=>{
//         if(theme == "light") {
//           setTheme("dark")
//         } else {
//           setTheme("light")
//         }
//       }} variant="outline" size="icon">
//         {theme == "light" && <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />}
//         {theme == "dark" && <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />}
//       </Button>
//     </div>
//   )
// }

