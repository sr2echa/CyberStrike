import React, { ReactNode } from 'react'

const layout = ({children}:{children:ReactNode}) => {
  return (
    <div className='dark:bg-[#0a0a0a]'>{children}</div>
  )
}

export default layout