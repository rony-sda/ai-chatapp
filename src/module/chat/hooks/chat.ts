import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { toast } from 'sonner';
import { createChatWithMessage, deleteChat, getAllChats, getChatById } from '../action';

export const useCreateChat = () => {
  const queryClient = useQueryClient();

  const router = useRouter();

  return useMutation({
    mutationFn: (values: { content: string; model: string }) =>
      createChatWithMessage(values),
    onSuccess: res => {
      if (res.success && res.data) {
        // add optimistic ui
        const chat = res.data;

        queryClient.invalidateQueries({ queryKey: ['chats'] });

        router.push(`/chat/${chat.id}?autoTrigger=true`);
      }
    },
    onError: error => {
      console.error('Create chat error:', error);
      toast.error('Failed to create chat');
    },
  });
};

export const useGetAllChats = () => {
  return useQuery({
    queryKey: ['chats'],
    queryFn: async () => await getAllChats()})
}

export const useDeleteChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => deleteChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: () => {
      toast.error('Failed to delete chat');
    },
  });
};

export const useGetChatById = (chatId: string) => {
  return useQuery({
    queryKey: ['chatbyid', chatId],
    queryFn: () => getChatById(chatId),
  });
};
