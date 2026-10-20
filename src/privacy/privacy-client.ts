import type { Hex } from "viem";

type ProofResult = {
  proof: Hex;
  publicInputs: string[];
  commitment: Hex;
  encryptedOutput: Hex;
  noteIv: Hex;
  noteCiphertext: Hex;
  amount: string;
  asset: Hex;
  nullifier: Hex;
  requestId: number;
};
let sequence = 0;
const pending = new Map<number, { resolve: (value: ProofResult) => void; reject: (error: Error) => void }>();
const worker = new Worker(new URL("./privacy-worker.ts", import.meta.url), { type: "module" });
worker.onmessage = (event: MessageEvent<{ ok: boolean; requestId?: number; result?: ProofResult; error?: string }>) => {
  const id = event.data.result?.requestId ?? event.data.requestId ?? -1;
  const request = pending.get(id);
  if (!request) return;
  pending.delete(id);
  if (event.data.ok && event.data.result) request.resolve(event.data.result);
  else request.reject(new Error(event.data.error || "Proof generation failed."));
};
worker.onerror = (event: ErrorEvent) => {
  const error = new Error(event.message || "Proof worker failed.");
  for (const request of pending.values()) request.reject(error);
  pending.clear();
};
export function generateDepositProof(signature: string, pool: string, amount: string): Promise<ProofResult> {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ type: "deposit", signature, pool, amount, requestId: id });
  });
}
export function generateWithdrawProof(
  signature: string,
  pool: string,
  amount: string,
  root: string,
  path: string[],
  pathBits: boolean[],
  recipient: string,
  noteIv: string,
  noteCiphertext: string,
  leaves: Array<{ commitment: string; leafIndex: number }>,
  asset = "0x0000000000000000000000000000000000000000",
): Promise<ProofResult> {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ type: "withdraw", requestId: id, signature, pool, amount, root, path, pathBits, recipient, asset, noteIv, noteCiphertext, leaves });
  });
}