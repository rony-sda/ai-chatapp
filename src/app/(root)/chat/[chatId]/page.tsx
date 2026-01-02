import ActiveChatLoader from "@/module/messages/components/active-chat-loader";
import MessageMain from "@/module/messages/components/message-main";
import { SidebarTrigger } from "@/components/ui/sidebar";

const ChatPage = async({params} : {params: Promise<{chatId: string}>}) => {
    const {chatId} = await params;
  return (
    <>
    <ActiveChatLoader chatId={chatId}/>
    <div className="md:hidden fixed top-4 left-4 z-50">
      <SidebarTrigger />
    </div>
    <MessageMain chatId={chatId}/>
    </>
  )
}

export default ChatPage