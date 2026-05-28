import type { IEventBus, PrMentionEvent, ReviewRequestedEvent, AnalystQuestionAskedEvent, ReviewThreadReplyEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';

const BEDROCK_MODEL = 'us.anthropic.claude-sonnet-4-6';

async function classifyIntent(comment: string): Promise<'review' | 'question' | 'unknown'> {
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(BEDROCK_MODEL)}/converse`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      system: [{ text: `You are a dispatcher for a GitHub bot. Classify the user's intent from their PR comment.
Reply with exactly one word:
- "review" — user wants a code review of the PR
- "question" — user is asking a question about the code, the PR, or how something works
- "unknown" — anything else` }],
      messages: [{ role: 'user', content: [{ text: comment }] }],
    }),
  });

  if (!response.ok) {
    console.error(`[butler] bedrock error: ${response.status}`);
    return 'unknown';
  }

  const data = await response.json() as any;
  const text = data.output?.message?.content?.[0]?.text?.trim().toLowerCase() ?? '';
  console.log(`[butler] classified "${comment.slice(0, 80)}" → ${text}`);

  if (text.startsWith('review')) return 'review';
  if (text.startsWith('question')) return 'question';
  return 'unknown';
}

export function register(bus: IEventBus, githubApp: App): void {
  bus.subscribe<PrMentionEvent>('pr.mention', async (event) => {
    console.log(`[butler] mention in PR #${event.pr.number} by ${event.author}: ${event.comment.slice(0, 100)}`);

    // Thread reply — always route to reviewer discussion mode
    if (event.inReplyToId) {
      const octokit = await githubApp.getInstallationOctokit(event.installationId);

      let originalComment: ReviewThreadReplyEvent['originalComment'];
      try {
        const { data } = await octokit.request('GET /repos/{owner}/{repo}/pulls/comments/{comment_id}', {
          owner: event.repo.owner,
          repo: event.repo.name,
          comment_id: event.inReplyToId,
        });
        originalComment = {
          id: data.id,
          body: data.body,
          path: data.path,
          line: data.line ?? data.original_line ?? 0,
          side: data.side ?? 'RIGHT',
        };
      } catch (err) {
        console.error(`[butler] failed to fetch original comment ${event.inReplyToId}:`, err);
        return;
      }

      const threadReplyEvent: ReviewThreadReplyEvent = {
        type: 'review.thread_reply',
        repo: event.repo,
        pr: event.pr,
        originalComment,
        reply: {
          id: event.commentId,
          body: event.comment,
          author: event.author,
        },
        installationId: event.installationId,
      };
      await bus.publish(threadReplyEvent);
      return;
    }

    // PR comment mentioning @duhon — classify intent
    const intent = await classifyIntent(event.comment);

    if (intent === 'review') {
      const reviewEvent: ReviewRequestedEvent = {
        type: 'review.requested',
        repo: event.repo,
        pr: event.pr,
        requestedBy: event.author,
        installationId: event.installationId,
      };
      await bus.publish(reviewEvent);
      return;
    }

    if (intent === 'question') {
      const questionEvent: AnalystQuestionAskedEvent = {
        type: 'analyst.question_asked',
        repo: event.repo,
        pr: event.pr,
        commentId: event.commentId,
        question: event.comment,
        askedBy: event.author,
        installationId: event.installationId,
      };
      await bus.publish(questionEvent);
      return;
    }

    console.log(`[butler] unknown intent, ignoring`);
  });
}
