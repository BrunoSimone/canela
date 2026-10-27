import type { Metadata } from 'next';
import { FrameResult } from '@/modules/customization/presentation/frame-result';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Tu cuadro',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function FrameResultPage({params}:{params:Promise<{publicToken:string}>}) {
 const {publicToken}=await params;return <FrameResult publicToken={publicToken}/>;
}
