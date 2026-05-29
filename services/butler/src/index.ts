import type { IEventBus, PrMentionEvent, ReviewRequestedEvent, AnalystQuestionAskedEvent, ReviewThreadReplyEvent, TestAnalysisRequestedEvent } from '@blin/event-bus';
import type { App } from '@octokit/app';
import { BedrockAgent } from '@blin/agent';

const DISPATCHER_INSTRUCTIONS = `You are a dispatcher for a GitHub bot. Classify the user's intent from their PR comment.
Reply with exactly one word:
- "review" — user wants a code review of the PR
- "question" — user is asking a question about the code, the PR, or how something works
- "tests" — user wants to know why the CI tests/checks are failing or wants the failing tests analyzed
- "unknown" — anything else`;

const dispatcher = new BedrockAgent({ logPrefix: '[butler]', maxIterations: 1 });

async function classifyIntent(comment: string): Promise<'review' | 'question' | 'tests' | 'unknown'> {
  let text = '';
  try {
    const result = await dispatcher.run({ instructions: DISPATCHER_INSTRUCTIONS, request: comment });
    text = result.text.trim().toLowerCase();
  } catch (err) {
    console.error(`[butler] classify error:`, err);
    return 'unknown';
  }
  console.log(`[butler] classified "${comment.slice(0, 80)}" → ${text}`);

  if (text.startsWith('review')) return 'review';
  if (text.startsWith('question')) return 'question';
  if (text.startsWith('tests')) return 'tests';
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

      // Only engage in a review thread when blin is actually involved:
      // (1) the reply mentions @duhon, or (2) blin started the thread (its
      // root comment carries the <!-- blin --> marker). Otherwise stay out of
      // conversations between humans.
      const mentioned = event.comment.toLowerCase().includes('@duhon');
      const ownThread = (originalComment.body ?? '').includes('<!-- blin -->');
      if (!mentioned && !ownThread) {
        console.log(`[butler] thread reply in PR #${event.pr.number} ignored — not mentioned and not blin's thread`);
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
        instructions: event.comment,
        installationId: event.installationId,
      };
      await bus.publish(reviewEvent);
      return;
    }

    if (intent === 'tests') {
      const testsEvent: TestAnalysisRequestedEvent = {
        type: 'tests.analysis_requested',
        repo: event.repo,
        pr: event.pr,
        requestedBy: event.author,
        installationId: event.installationId,
      };
      await bus.publish(testsEvent);
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
