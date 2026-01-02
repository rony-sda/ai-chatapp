import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { auth } from '@/lib/auth'
import { currentUser } from '@/module/authentication/action'
import { getAllChats } from '@/module/chat/action'
import ChatSidebar from '@/module/chat/components/chat-sidebar'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import React from 'react'

const AuthLayout = async({children}: Readonly<{
  children: React.ReactNode;
}>) => {

 const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = await currentUser()

  const {data:chats} = await getAllChats();

  if (!session) {
    return redirect("/sign-in");
  }


  return (
    <>
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <ChatSidebar user={user} chats={chats}/>
        <SidebarInset className="flex-1 overflow-hidden">
          <main className="h-full w-full overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
    </>
  )
}

export default AuthLayout