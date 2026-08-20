import {NextResponse} from 'next/server';
import {getAllTemplates} from '@/remotion/generated/registry';

export async function GET() {
  const templates = getAllTemplates().map((tpl) => ({
    id: tpl.meta.id,
    name: tpl.meta.name,
    description: tpl.meta.description,
    componentId: tpl.meta.componentId,
    width: tpl.meta.width,
    height: tpl.meta.height,
    fps: tpl.meta.fps,
    defaultDuration: tpl.meta.defaultDuration,
    dataOptions: tpl.meta.dataOptions,
  }));

  return NextResponse.json(templates);
}
