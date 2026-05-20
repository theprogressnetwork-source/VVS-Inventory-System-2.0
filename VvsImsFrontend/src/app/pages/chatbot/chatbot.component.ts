import { Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '@services/api.service';
import { API_ROUTES, API_ROUTES_TOKEN } from '@services/app.global';
import { AuthService } from '@services/auth.service';
import { GvarService } from '@services/gvar.service';
import { ToastrService } from 'ngx-toastr';
import { interval, Subscription } from 'rxjs';

type ChatStatus = 'RESOLVED' | 'ESCALATED' | 'NOT ESCALATED';
type ChatRole = 'ai' | 'user' | 'agent' | 'system';
type DraftTag = 'UNSENT' | 'SENT';
type ThreadAttentionType = 'unread' | 'draft' | null;

interface ChatMessage {
  id?: string;
  from: string;
  text: string;
  time: string;
  role: ChatRole;
  displayName: string;
  draftTag?: DraftTag;
}

interface ChatThread {
  threadId: string;
  customer: string;
  subject: string;
  orderId?: string;
  status: ChatStatus;
  lastMessageAt: string;
  messages: ChatMessage[];
  recipientId?: string;
  customerId?: string;
  participantId?: string;
  topic?: string;
  topicValue?: string;
  to?: Array<{ id?: string; type?: string }>;
  unreadCount?: number;
  hasUnread?: boolean;
  hasNewMessage?: boolean;
  sortIndex?: number;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.scss',
})
export class ChatbotComponent {
  private readonly pollIntervalMs = 5000;
  private pollSub?: Subscription;

  statuses: ChatStatus[] = ['RESOLVED', 'ESCALATED', 'NOT ESCALATED'];
  readonly leftBadgeLabels = {
    unread: 'New Message',
    draft: 'Draft Pending',
  };
  activeStatus: ChatStatus = 'ESCALATED';
  messageDraft = '';
  searchText = '';
  isSendingMessage = false;
  readonly currentUserName: string = 'You';
  readonly assistantName = 'Assistant';
  readonly useMockData = true;

  selectedThread: ChatThread | null = null;

  @ViewChild('chatBody') chatBody?: ElementRef<HTMLDivElement>;
  @ViewChild('composerInput') composerInput?: ElementRef<HTMLTextAreaElement>;
  threads: ChatThread[] = []
  private readonly mockThreads: ChatThread[] = [
    {
      threadId: '00a2ba6c-7de9-4c76-ace7-993c9bb00004',
      customer: 'Aziz Basmaji',
      subject: '264836172-A',
      status: 'ESCALATED',
      lastMessageAt: 'Fri 03:29 PM',
      unreadCount: 2,
      hasUnread: true,
      messages: [
        {
          from: 'user',
          text: 'When is it arriving?',
          time: '03:29 PM',
          role: 'user',
          displayName: 'Aziz Basmaji',
        },
        {
          from: 'AI Agent',
          text: 'Sorry for the wait. Your order hasn’t shipped yet, so there’s no tracking available.\nThe team is checking the status and will reach out with an update.',
          time: '03:31 PM',
          role: 'ai',
          displayName: this.assistantName,
          draftTag: 'UNSENT',
        },
      ],
    },
    {
      threadId: 'THR-10095',
      customer: 'Ali Zafar',
      subject: 'Invoice update',
      status: 'ESCALATED',
      lastMessageAt: 'Yesterday 03:18 PM',
      unreadCount: 0,
      messages: [
        {
          from: 'user',
          text: 'Need invoice with correct address.',
          time: '03:15 PM',
          role: 'user',
          displayName: 'Ali Zafar',
        },
        {
          from: 'AI Agent',
          text: 'Sure, please confirm the address.',
          time: '03:18 PM',
          role: 'ai',
          displayName: this.assistantName,
          draftTag: 'SENT',
        },
      ],
    },
  ];

  // threads: ChatThread[] = [
  //   {
  //     threadId: 'THR-10091',
  //     customer: 'Ayesha Khan',
  //     subject: 'Order delay inquiry',
  //     status: 'ESCALATED',
  //     lastMessageAt: 'Today 10:24 AM',
  //     messages: [
  //       {
  //         from: 'user',
  //         text: 'My order is delayed, any update?',
  //         time: '10:22 AM',
  //       },
  //       {
  //         from: 'ai',
  //         text: 'Thanks for reaching out. Let me check this for you.',
  //         time: '10:23 AM',
  //       },
  //       {
  //         from: 'system',
  //         text: 'Ticket escalated to Logistics',
  //         time: '10:24 AM',
  //       },
  //     ],
  //   },
  //   {
  //     threadId: 'THR-10092',
  //     customer: 'Bilal Ahmed',
  //     subject: 'Warranty claim',
  //     status: 'NON ESCALATED',
  //     lastMessageAt: 'Today 09:12 AM',
  //     messages: [
  //       { from: 'user', text: 'How can I claim warranty?', time: '09:10 AM' },
  //       {
  //         from: 'ai',
  //         text: 'Please share your invoice number.',
  //         time: '09:12 AM',
  //       },
  //     ],
  //   },
  //   {
  //     threadId: 'THR-10093',
  //     customer: 'Sara Malik',
  //     subject: 'Refund processed',
  //     status: 'RESOLVED',
  //     lastMessageAt: 'Yesterday 06:41 PM',
  //     messages: [
  //       { from: 'user', text: 'Did my refund go through?', time: '06:32 PM' },
  //       {
  //         from: 'ai',
  //         text: 'Yes, refund has been processed.',
  //         time: '06:41 PM',
  //       },
  //     ],
  //   },
  //   {
  //     threadId: 'THR-10094',
  //     customer: 'Hassan Raza',
  //     subject: 'Device not powering on',
  //     status: 'ESCALATED',
  //     lastMessageAt: 'Yesterday 04:05 PM',
  //     messages: [
  //       {
  //         from: 'user',
  //         text: 'My device is not turning on.',
  //         time: '04:01 PM',
  //       },
  //       {
  //         from: 'ai',
  //         text: 'Please try charging for 20 minutes.',
  //         time: '04:03 PM',
  //       },
  //       { from: 'system', text: 'Escalated to Tech Support', time: '04:05 PM' },
  //     ],
  //   },
  //   {
  //     threadId: 'THR-10095',
  //     customer: 'Ali Zafar',
  //     subject: 'Invoice update',
  //     status: 'NON ESCALATED',
  //     lastMessageAt: 'Yesterday 03:18 PM',
  //     messages: [
  //       {
  //         from: 'user',
  //         text: 'Need invoice with correct address.',
  //         time: '03:15 PM',
  //       },
  //       {
  //         from: 'ai',
  //         text: 'Sure, please confirm the address.',
  //         time: '03:18 PM',
  //       },
  //     ],
  //   },
  // ];
  constructor(
    private fb: FormBuilder,
    @Inject(API_ROUTES_TOKEN) private config: typeof API_ROUTES,
    private GV: GvarService,
    private API: ApiService,
    private authService: AuthService,
    private modalService: NgbModal,
    private toastr: ToastrService,
  ) {
    // ── CRITICAL-009 FIX: Read userName from in-memory auth state ──
    this.currentUserName = this.authService.getUserName() || 'You';
  }

  ngOnInit(): void {
    this.getAllMessages(true);
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  getStatusCount(status: ChatStatus): number {
    return this.threads.filter((t) => t.status === status).length;
  }

  setActiveStatus(status: ChatStatus) {
    this.activeStatus = status;
    if (this.selectedThread?.status !== status) {
      this.selectedThread = null;
    }
  }

  openChat(thread: ChatThread) {
    this.selectedThread = thread;
    thread.unreadCount = 0;
    thread.hasUnread = false;
    thread.hasNewMessage = false;
    this.scrollToBottom();
  }

  markResolved(thread: ChatThread) {
    if (!thread?.threadId) return;
    if (thread.status === 'RESOLVED') return;

    const endpoint = `${this.config.THREAD_RESOLVED}${thread.threadId}`;
    this.API.postData(endpoint, {}).subscribe({
      next: () => {
        thread.status = 'RESOLVED';
        thread.messages.push({
          from: 'system',
          text: 'Marked as resolved by agent.',
          time: this.getTimeLabel(),
          role: 'system',
          displayName: 'System',
        });
        if (this.activeStatus !== 'RESOLVED') {
          this.selectedThread = null;
        }
        this.toastr.success('Thread marked as resolved', 'Success');
      },
      error: (error) => {
        if (error?.error?.message) {
          this.toastr.error(error.error.message, 'Error');
        } else {
          this.toastr.error('Failed to resolve thread', 'Error');
        }
      },
    });
  }

  sendMessage() {
    if (!this.selectedThread) return;
    const text = this.messageDraft.trim();
    if (!text) return;
    if (this.isSendingMessage) return;

    const pendingMessage: ChatMessage = {
      from: this.currentUserName,
      text,
      time: this.getTimeLabel(),
      role: 'agent',
      displayName: 'You',
    };
    const activeThread = this.selectedThread;
    activeThread.messages.push(pendingMessage);
    activeThread.lastMessageAt = `Today ${pendingMessage.time}`;
    const draft = this.messageDraft;
    this.scrollToBottom();
    this.messageDraft = '';
    this.autoResizeComposer();
    this.isSendingMessage = true;

    // ── CRITICAL-010 FIX: Route BestBuy messages through backend proxy ──
    // The frontend must NOT call BestBuy API directly with hardcoded tokens.
    // The backend /integrations/bestbuy/proxy handles auth server-side.
    const url = `${this.config.SEND_THREAD_MESSAGE}${activeThread.threadId}`;
    const payload = {
      body: text,
      to: [{ type: 'CUSTOMER' }],
      topic: {
        type: 'FREE_TEXT',
        value: (activeThread as any).topicValue || (activeThread as any).topic || activeThread.subject,
      },
    };
    this.API.postData(url, payload).subscribe({
      next: () => {
        this.isSendingMessage = false;
        this.getAllMessages(false);
      },
      error: (error) => {
        this.isSendingMessage = false;
        activeThread.messages = activeThread.messages.filter((m) => m !== pendingMessage);
        this.messageDraft = draft;
        this.autoResizeComposer();
        if (error?.error?.message) {
          this.toastr.error(error.error.message, 'Error');
        } else {
          this.toastr.error('Failed to send message', 'Error');
        }
      },
    });
  }

  get latestAiDraft(): ChatMessage | null {
    const drafts = this.unsentAiDrafts;
    return drafts.length ? drafts[drafts.length - 1] : null;
  }

  get unsentAiDrafts(): ChatMessage[] {
    if (!this.selectedThread?.messages?.length) return [];
    return this.selectedThread.messages.filter(
      (m) => m.draftTag === 'UNSENT' && m.role !== 'user' && m.role !== 'system',
    );
  }

  useAiDraftForEdit() {
    const aiDraft = this.latestAiDraft;
    if (!aiDraft || this.isSendingMessage) return;
    this.messageDraft = aiDraft.text || '';
    this.autoResizeComposer();
  }

  sendAiDraftAsIs() {
    const aiDraft = this.latestAiDraft;
    if (!aiDraft || this.isSendingMessage) return;
    this.messageDraft = aiDraft.text || '';
    this.autoResizeComposer();
    this.sendMessage();
  }

  onDraftInput(): void {
    this.autoResizeComposer();
  }

  getUnreadCount(thread: ChatThread): number {
    return Number(thread.unreadCount || 0);
  }

  hasUnreadMessages(thread: ChatThread): boolean {
    return this.getUnreadCount(thread) > 0 || !!thread.hasUnread || !!thread.hasNewMessage;
  }

  getThreadDraftTag(thread: ChatThread): DraftTag | null {
    const threadTag = (thread as any)?.draftStatus?.toString().trim().toUpperCase();
    if (threadTag === 'UNSENT' || threadTag === 'SENT') return threadTag as DraftTag;

    const aiMessages = thread.messages?.filter((m) => m.role === 'ai') || [];
    if (!aiMessages.length) return null;
    if (aiMessages.some((m) => m.draftTag === 'UNSENT')) return 'UNSENT';
    return 'SENT';
  }

  getThreadAttentionType(thread: ChatThread): ThreadAttentionType {
    if (this.hasUnreadMessages(thread)) return 'unread';
    if (this.getThreadDraftTag(thread) === 'UNSENT') return 'draft';
    return null;
  }

  getThreadAttentionLabel(thread: ChatThread): string {
    const type = this.getThreadAttentionType(thread);
    if (!type) return '';
    return this.leftBadgeLabels[type];
  }

  trackByThreadId(_: number, item: ChatThread) {
    return item.threadId;
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.chatBody?.nativeElement) {
        const el = this.chatBody.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 0);
  }

  private getTimeLabel(): string {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getAllMessages(showError = false) {
    const selectedThreadId = this.selectedThread?.threadId || null;
    this.API.getData(this.config.GET_ALL_MESSAGES).subscribe({
      next: (data: any) => {
        if (data?.data?.length) {
          this.threads = data.data.map((thread: any, index: number) => ({
            ...thread,
            subject: thread.subject || thread.orderId || '-',
            sortIndex: index,
            messages: (thread.messages || []).map((message: any) =>
              this.normalizeMessage(message, thread.customer),
            ),
          }));
        }
        // if (this.useMockData) {
        //   this.threads = this.mockThreads.map((thread, index) => ({
        //     ...thread,
        //     sortIndex: index,
        //   }));
        // } else {
        //   this.threads = [];
        // }

        if (selectedThreadId) {
          const updatedThread = this.threads.find((t) => t.threadId === selectedThreadId) || null;
          if (updatedThread) {
            this.selectedThread = updatedThread;
            this.selectedThread.unreadCount = 0;
            this.selectedThread.hasUnread = false;
            this.selectedThread.hasNewMessage = false;
          } else {
            this.selectedThread = null;
          }
        }
      },
      error: (error) => {
        if (showError && error.error != undefined) {
          this.toastr.error(error.error.message, 'Error');
        }
      },
    });
  }

  isAiMessage(message: ChatMessage): boolean {
    return message.role === 'ai';
  }

  isUserMessage(message: ChatMessage): boolean {
    return message.role === 'user';
  }

  isSystemMessage(message: ChatMessage): boolean {
    return message.role === 'system';
  }

  isAgentMessage(message: ChatMessage): boolean {
    return message.role === 'agent';
  }

  private normalizeMessage(message: any, customerName: string): ChatMessage {
    const rawFrom = (message?.from || '').toString().trim();
    const sender = rawFrom.toLowerCase();
    let role: ChatRole = 'user';

    if (sender.includes('system')) {
      role = 'system';
    } else if (
      sender === 'ai' ||
      sender.includes('ai agent') ||
      sender.includes('assistant') ||
      sender.includes('bot')
    ) {
      role = 'ai';
    } else if (
      sender === this.currentUserName.toLowerCase() ||
      sender.includes('agent') ||
      sender.includes('support') ||
      sender.includes('admin') ||
      sender === 'you'
    ) {
      role = 'agent';
    }

    let displayName = 'You';
    if (role === 'ai') {
      displayName = this.assistantName;
    } else if (role === 'agent') {
      displayName = 'You';
    } else if (role === 'system') {
      displayName = 'System';
    } else if (sender === 'user' || sender === 'customer' || !rawFrom) {
      displayName = customerName || 'Customer';
    } else {
      displayName = rawFrom;
    }

    const rawTag = (message?.tag || message?.status || '').toString().trim().toUpperCase();
    const sentBool = message?.sent;
    let draftTag: DraftTag | undefined;
    if (rawTag === 'UNSENT' || rawTag === 'SENT') {
      draftTag = rawTag as DraftTag;
    } else if (typeof sentBool === 'boolean') {
      draftTag = sentBool ? 'SENT' : 'UNSENT';
    } else if (role === 'ai') {
      draftTag = 'SENT';
    }

    return {
      id: message?.id || message?.messageId,
      from: rawFrom || 'user',
      text: this.formatIncomingText(message?.text || ''),
      time: message?.time || '',
      role,
      displayName,
      draftTag,
    };
  }

  private formatIncomingText(text: string): string {
    if (!text) return '';
    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/gi, ' ');
  }

  private autoResizeComposer(): void {
    const textarea = this.composerInput?.nativeElement;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  private startPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = interval(this.pollIntervalMs).subscribe(() => {
      this.getAllMessages(false);
    });
  }

  get filteredThreads(): ChatThread[] {
    const q = this.searchText.trim().toLowerCase();
    const filtered = this.threads.filter((t) => {
      if (t.status !== this.activeStatus) return false;
      if (!q) return true;
      const hay = `${t.threadId} ${t.customer} ${t.subject}`.toLowerCase();
      return hay.includes(q);
    });

    return [...filtered].sort((a, b) => {
      const aUnread = this.hasUnreadMessages(a) ? 1 : 0;
      const bUnread = this.hasUnreadMessages(b) ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
      return (a.sortIndex || 0) - (b.sortIndex || 0);
    });
  }
}
