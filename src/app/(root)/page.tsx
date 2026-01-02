import { currentUser } from "@/module/authentication/action";
import ChatMain from "@/module/chat/components/chat-main";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default async function Home() {
  const user = await currentUser()

  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-50">
        <SidebarTrigger />
      </div>
      <ChatMain user={user} />
    </>
  );
}
