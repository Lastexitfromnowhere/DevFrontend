'use client';

import { MintNFT } from '@/components/MintNFT';

const IPFS_CID = 'QmeZqms4zJXz91uNetmEKmxeG2fBQezGKz4egon5kiiai2';

export default function MintPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <MintNFT ipfsCid={IPFS_CID} />
      </div>
    </main>
  );
} 