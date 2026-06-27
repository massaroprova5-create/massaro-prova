import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Conversation, Message, Profile } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDate, getAvatarFallback } from '@/lib/utils'
import { Send, MessageCircle, Search, ArrowLeft } from 'lucide-react'

interface ConversationWithUser extends Conversation {
  other_user: Profile
  last_message?: Message
  unread_count: number
}

export default function MessagesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [conversations, setConversations] = useState<ConversationWithUser[]>([])
  const [selectedConv, setSelectedConv] = useState<ConversationWithUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchUser, setSearchUser] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) fetchConversations()
  }, [user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!selectedConv) return
    const channel = supabase
      .channel(`conv-${selectedConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${selectedConv.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
        markAsRead(selectedConv.id)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedConv])

  const fetchConversations = async () => {
    if (!user) return
    setLoading(true)
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    if (convs) {
      const withUsers = await Promise.all(convs.map(async (conv) => {
        const otherId = conv.participant_one === user.id ? conv.participant_two : conv.participant_one
        const { data: otherUser } = await supabase.from('profiles').select('*').eq('id', otherId).single()
        const { data: lastMsg } = await supabase.from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1).single()
        const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('conversation_id', conv.id).eq('read', false).neq('sender_id', user.id)
        return { ...conv, other_user: otherUser as Profile, last_message: lastMsg || undefined, unread_count: count || 0 }
      }))
      setConversations(withUsers.filter(c => c.other_user) as ConversationWithUser[])
    }
    setLoading(false)
  }

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data as Message[])
    markAsRead(convId)
  }

  const markAsRead = async (convId: string) => {
    if (!user) return
    await supabase.rpc('mark_messages_read', { p_conversation_id: convId, p_user_id: user.id })
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c))
  }

  const handleSelectConv = (conv: ConversationWithUser) => {
    setSelectedConv(conv)
    fetchMessages(conv.id)
  }

  const handleSend = async () => {
    if (!user || !selectedConv || !newMsg.trim() || sending) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_id: user.id,
      content: newMsg.trim(),
    })
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao enviar mensagem' })
    } else {
      setNewMsg('')
    }
    setSending(false)
  }

  const handleSearchUser = async (q: string) => {
    const cleanQuery = q.trim()
    setSearchUser(q)

    if (cleanQuery.length < 2) {
      setSearchResults([])
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`)
      .neq('id', user?.id || '')
      .limit(5)

    if (!error && data) {
      setSearchResults(data as Profile[])
    } else {
      setSearchResults([])
      toast({ variant: 'destructive', title: 'Não foi possível buscar usuários', description: error?.message || 'Tente novamente.' })
    }
  }

  const handleStartConversation = async (otherUser: Profile) => {
    if (!user) return

    let conversationId: string | null = null

    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        user_a: user.id,
        user_b: otherUser.id
      })
      if (error) throw error
      conversationId = data as string | null
    } catch {
      const participantOne = user.id < otherUser.id ? user.id : otherUser.id
      const participantTwo = user.id < otherUser.id ? otherUser.id : user.id

      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_one', participantOne)
        .eq('participant_two', participantTwo)
        .maybeSingle()

      if (existing?.id) {
        conversationId = existing.id
      } else {
        const { data: created, error: insertError } = await supabase
          .from('conversations')
          .insert({ participant_one: participantOne, participant_two: participantTwo })
          .select('id')
          .single()

        if (!insertError && created?.id) {
          conversationId = created.id
        }
      }
    }

    setSearchUser('')
    setSearchResults([])

    if (!conversationId) {
      toast({ variant: 'destructive', title: 'Não foi possível abrir a conversa' })
      return
    }

    await fetchConversations()
    const newConv = conversations.find(c => c.id === conversationId) || {
      id: conversationId,
      participant_one: user.id < otherUser.id ? user.id : otherUser.id,
      participant_two: user.id < otherUser.id ? otherUser.id : user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      other_user: otherUser,
      unread_count: 0,
    } as ConversationWithUser
    handleSelectConv(newConv)
  }

  return (
    <div className="flex h-screen lg:h-auto lg:max-h-[calc(100vh-0px)]">
      {/* Conversations list */}
      <div className={`w-full lg:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col ${selectedConv ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h1 className="text-xl font-black text-slate-900 dark:text-white mb-3">Mensagens</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchUser}
              onChange={(e) => handleSearchUser(e.target.value)}
              placeholder="Buscar usuário..."
              className="pl-10 h-9"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleStartConversation(u)}
                  className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.avatar_url || ''} />
                    <AvatarFallback className="text-xs">{getAvatarFallback(u.full_name || u.username)}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{u.full_name || u.username}</p>
                    <p className="text-xs text-slate-500">@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500">Nenhuma conversa ainda</p>
              <p className="text-xs text-slate-400 mt-1">Busque um usuário para começar</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConv(conv)}
                  className={`flex items-center gap-3 w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-left ${selectedConv?.id === conv.id ? 'bg-cyan-50 dark:bg-cyan-950/20' : ''}`}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conv.other_user?.avatar_url || ''} />
                      <AvatarFallback>{getAvatarFallback(conv.other_user?.full_name || conv.other_user?.username)}</AvatarFallback>
                    </Avatar>
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-cyan-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold text-slate-900 dark:text-white truncate ${conv.unread_count > 0 ? 'font-bold' : ''}`}>
                        {conv.other_user?.full_name || conv.other_user?.username}
                      </p>
                      {conv.last_message && (
                        <span className="text-xs text-slate-400">{formatDate(conv.last_message.created_at)}</span>
                      )}
                    </div>
                    <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-500'}`}>
                      {conv.last_message?.content || 'Iniciar conversa'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat window */}
      {selectedConv ? (
        <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 ${!selectedConv ? 'hidden lg:flex' : 'flex'}`}>
          {/* Chat header */}
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setSelectedConv(null)}
              className="lg:hidden text-slate-400 hover:text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Avatar className="h-10 w-10">
              <AvatarImage src={selectedConv.other_user?.avatar_url || ''} />
              <AvatarFallback>{getAvatarFallback(selectedConv.other_user?.full_name || selectedConv.other_user?.username)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {selectedConv.other_user?.full_name || selectedConv.other_user?.username}
              </p>
              <p className="text-xs text-slate-500">@{selectedConv.other_user?.username}</p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-500">Inicie a conversa!</p>
                </div>
              )}
              {messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs lg:max-w-sm xl:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                        isOwn
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-br-md'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm rounded-bl-md'
                      }`}
                    >
                      <p className="break-words">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/70 text-right' : 'text-slate-400'}`}>
                        {formatDate(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
            <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex gap-2">
              <Input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Digite uma mensagem..."
                className="flex-1"
              />
              <Button type="submit" variant="gradient" size="icon" disabled={sending || !newMsg.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-center">
            <MessageCircle className="h-16 w-16 mx-auto mb-4 text-slate-200 dark:text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Suas mensagens</h3>
            <p className="text-sm text-slate-500">Selecione uma conversa para começar</p>
          </div>
        </div>
      )}
    </div>
  )
}
