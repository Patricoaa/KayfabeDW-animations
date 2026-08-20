import {spawn, type ChildProcess} from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {put} from '@vercel/blob';
import {RenderRequest} from '../../../../types/schema';
import {formatSSE, type RenderProgress} from './helpers';

const ENTRY = path.join(process.cwd(), 'src', 'remotion', 'index.ts');

function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  onData: (line: string) => void,
): Promise<{code: number; stderr: string}> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {cwd, stdio: ['ignore', 'pipe', 'pipe']});

    let stderr = '';

    proc.stdout.on('data', (buf: Buffer) => {
      const lines = buf.toString().split('\n').filter(Boolean);
      lines.forEach(onData);
    });

    proc.stderr.on('data', (buf: Buffer) => {
      stderr += buf.toString();
      const lines = buf.toString().split('\n').filter(Boolean);
      lines.forEach(onData);
    });

    proc.on('close', (code) => {
      resolve({code: code ?? 1, stderr});
    });
  });
}

function parseProgress(line: string): {phase: string; progress: number} | null {
  const renderMatch = line.match(/Rendered (\d+)\/(\d+)/);
  if (renderMatch) {
    const current = parseInt(renderMatch[1], 10);
    const total = parseInt(renderMatch[2], 10);
    return {phase: 'Rendering video...', progress: 0.2 + (current / total) * 0.7};
  }

  if (line.includes('Bundling')) {
    const pctMatch = line.match(/(\d+)%/);
    const pct = pctMatch ? parseInt(pctMatch[1], 10) : 50;
    return {phase: 'Bundling Remotion project...', progress: pct / 100 * 0.15};
  }

  if (line.includes('Getting composition')) {
    return {phase: 'Finding compositions...', progress: 0.15};
  }

  if (line.includes('Encoded')) {
    const pctMatch = line.match(/(\d+)\/(\d+)/);
    if (pctMatch) {
      const current = parseInt(pctMatch[1], 10);
      const total = parseInt(pctMatch[2], 10);
      return {phase: 'Encoding video...', progress: 0.9 + (current / total) * 0.05};
    }
  }

  return null;
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is not set. Create a Blob store at vercel.com → Storage.',
    );
  }

  const payload = await req.json();
  const body = RenderRequest.parse(payload);

  const send = async (message: RenderProgress) => {
    await writer.write(encoder.encode(formatSSE(message)));
  };

  const runRender = async () => {
    const tmpFile = path.join(os.tmpdir(), `render-${Date.now()}.mp4`);
    try {
      await send({type: 'phase', phase: 'Rendering video...', progress: 0.05});

      const propsJson = JSON.stringify(body.inputProps);
      const propsFile = path.join(os.tmpdir(), `props-${Date.now()}.json`);
      fs.writeFileSync(propsFile, propsJson);

      const {code} = await runCommand(
        'npx',
        [
          'remotion', 'render',
          ENTRY,
          body.compositionId,
          tmpFile,
          `--props=${propsFile}`,
        ],
        process.cwd(),
        (line) => {
          const progress = parseProgress(line);
          if (progress) {
            send({type: 'phase', phase: progress.phase, progress: progress.progress});
          }
        },
      );

      fs.unlinkSync(propsFile);

      if (code !== 0) {
        throw new Error(`Remotion render failed with exit code ${code}`);
      }

      if (!fs.existsSync(tmpFile)) {
        throw new Error('Render completed but output file not found');
      }

      await send({type: 'phase', phase: 'Uploading video...', progress: 0.95});

      const videoBuffer = fs.readFileSync(tmpFile);
      const {url} = await put(
        `renders/${body.compositionId}-${Date.now()}.mp4`,
        videoBuffer,
        {
          access: 'public',
          contentType: 'video/mp4',
        },
      );

      fs.unlinkSync(tmpFile);

      await send({type: 'done', url, size: videoBuffer.length});
    } catch (err) {
      console.error(err);
      await send({type: 'error', message: (err as Error).message});
    } finally {
      if (fs.existsSync(tmpFile)) {
        try { fs.unlinkSync(tmpFile); } catch {}
      }
      await writer.close();
    }
  };

  runRender();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
