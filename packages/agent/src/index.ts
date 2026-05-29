/**
 * Reusable agent abstraction, shared across blin services.
 *
 * A service hands the agent a request — what to do (instructions), the concrete
 * ask (request), optional background (context), and the tools it may call to
 * pull data or take actions — and gets back the agent's final text.
 *
 * `Agent` is the interface; `BedrockAgent` is the current Bedrock-backed
 * implementation. Future agent types can implement the same interface.
 */

export interface AgentTool {
  name: string;
  description: string;
  /** JSON Schema describing the tool's input object. */
  inputSchema: Record<string, unknown>;
  /** Execute the tool. Return a string result (errors should be returned as text, not thrown). */
  run(input: any): Promise<string>;
}

export interface AgentRequest {
  /** Who the agent is and what/how to do it — becomes the system prompt. */
  instructions: string;
  /** The concrete ask / input (user text, "review PR #123", the failing tests, …). */
  request: string;
  /** Optional extra background appended to the instructions. */
  context?: string;
  /** Tools the agent may call to pull more data or take actions. */
  tools?: AgentTool[];
}

export interface AgentResult {
  /** The agent's final text output. */
  text: string;
}

export interface Agent {
  run(req: AgentRequest): Promise<AgentResult>;
}

export interface AgentOptions {
  /** Bedrock model id. Defaults to Claude Sonnet 4.6. */
  model?: string;
  /** Max tool-use iterations before giving up. Default 8. */
  maxIterations?: number;
  /** AWS region. Defaults to AWS_REGION env or us-east-1. */
  region?: string;
  /** Bedrock bearer token. Defaults to AWS_BEARER_TOKEN_BEDROCK env. */
  bearerToken?: string;
  /** Prefix for log lines. */
  logPrefix?: string;
}

interface BedrockResponse {
  content: any[];
  stopReason: string;
}

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-6';
const DEFAULT_MAX_ITERATIONS = 8;

export class BedrockAgent implements Agent {
  private readonly model: string;
  private readonly maxIterations: number;
  private readonly region: string;
  private readonly bearerToken?: string;
  private readonly logPrefix: string;

  constructor(opts: AgentOptions = {}) {
    this.model = opts.model ?? DEFAULT_MODEL;
    this.maxIterations = opts.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    this.region = opts.region ?? process.env.AWS_REGION ?? 'us-east-1';
    this.bearerToken = opts.bearerToken;
    this.logPrefix = opts.logPrefix ?? '[agent]';
  }

  private async call(systemPrompt: string, messages: any[], tools: AgentTool[]): Promise<BedrockResponse> {
    const token = this.bearerToken ?? process.env.AWS_BEARER_TOKEN_BEDROCK;
    const url = `https://bedrock-runtime.${this.region}.amazonaws.com/model/${encodeURIComponent(this.model)}/converse`;

    const toolConfig = tools.length
      ? {
          toolConfig: {
            tools: tools.map((t) => ({
              toolSpec: {
                name: t.name,
                description: t.description,
                inputSchema: { json: t.inputSchema },
              },
            })),
          },
        }
      : {};

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ system: [{ text: systemPrompt }], messages, ...toolConfig }),
    });

    if (!res.ok) {
      throw new Error(`Bedrock error: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as any;
    return { content: data.output.message.content, stopReason: data.stopReason };
  }

  /**
   * Drive the tool-use loop and return the agent's final text output.
   */
  async run(req: AgentRequest): Promise<AgentResult> {
    const systemPrompt = req.context ? `${req.instructions}\n\n## Context\n${req.context}` : req.instructions;
    const tools = req.tools ?? [];
    const byName = new Map(tools.map((t) => [t.name, t]));
    const messages: any[] = [{ role: 'user', content: [{ text: req.request }] }];
    let finalText = '';

    for (let i = 0; i < this.maxIterations; i++) {
      const response = await this.call(systemPrompt, messages, tools);
      messages.push({ role: 'assistant', content: response.content });

      const text = response.content
        .filter((b: any) => b.text)
        .map((b: any) => b.text)
        .join('\n')
        .trim();
      if (text) {
        finalText = text;
        console.log(`${this.logPrefix} text: ${text.slice(0, 200)}${text.length > 200 ? '…' : ''}`);
      }

      if (response.stopReason === 'end_turn') break;

      const toolResults: any[] = [];
      for (const block of response.content) {
        if (!block.toolUse) continue;
        const tool = byName.get(block.toolUse.name);
        console.log(`${this.logPrefix} tool: ${block.toolUse.name} ${JSON.stringify(block.toolUse.input).slice(0, 200)}`);
        let result: string;
        try {
          result = tool ? await tool.run(block.toolUse.input) : `Unknown tool: ${block.toolUse.name}`;
        } catch (err) {
          result = `Tool ${block.toolUse.name} failed: ${(err as Error).message}`;
        }
        toolResults.push({
          toolResult: { toolUseId: block.toolUse.toolUseId, content: [{ text: result }] },
        });
      }

      if (toolResults.length === 0) break;
      messages.push({ role: 'user', content: toolResults });
    }

    return { text: finalText };
  }
}
