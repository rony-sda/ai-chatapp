

import { currentUser } from "@/module/authentication/action";
import ChatMain from "@/module/chat/components/chat-main";




export default async function Home() {
  const user = await currentUser()

  return (
     <ChatMain user={user} />
  );
}
