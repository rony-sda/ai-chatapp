import ActiveChatLoader from "@/module/messages/components/active-chat-loader";
import MessageMain from "@/module/messages/components/message-main";


const ChatPage = async({params} : {params: Promise<{chatId: string}>}) => {
    const {chatId} = await params;
  return (
    <>
    <ActiveChatLoader chatId={chatId}/>
    <MessageMain chatId={chatId}/>
    </>
  )
}

export default ChatPage