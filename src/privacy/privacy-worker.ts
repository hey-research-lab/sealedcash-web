import { Noir } from "@noir-lang/noir_js";
import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import circuit from "./circuit/sealedcash_privacy.json";

const FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const PROTOCOL_VERSION = 2n;
const CIRCUIT_VERSION = 3n;
const CIPHERTEXT_DOMAIN = 4n;
type Bytes = Uint8Array;

function bytesToBigInt(value: Bytes): bigint {
  return BigInt(`0x${Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("") || "0"}`);
}
export function fieldBytes(value: bigint): Bytes {
  const normalized = ((value % FIELD) + FIELD) % FIELD;
  let cursor = normalized;
  const out = new Uint8Array(32);
  for (let index = 31; index >= 0; index -= 1) {
    out[index] = Number(cursor & 0xffn);
    cursor >>= 8n;
  }
  return out;
}
function hex(value: Bytes): string {
  return `0x${Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
function addressHex(value: bigint): string {
  return `0x${value.toString(16).padStart(40, "0")}`;
}
function randomField(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBigInt(bytes) % FIELD;
}
function addressField(value: string): bigint {
  return BigInt(value.toLowerCase());
}
async function hash(api: Barretenberg, left: bigint, right: bigint): Promise<bigint> {
  const result = await api.poseidon2Permutation({
    inputs: [fieldBytes(left), fieldBytes(right), fieldBytes(0n), fieldBytes(0n)],
  });
  return bytesToBigInt(result.outputs[0]);
}
async function h4(api: Barretenberg, a: bigint, b: bigint, c: bigint, d: bigint): Promise<bigint> {
  return hash(api, await hash(api, a, b), await hash(api, c, d));
}
async function h8(api: Barretenberg, values: bigint[]): Promise<bigint> {
  return hash(api, await h4(api, values[0], values[1], values[2], values[3]), await h4(api, values[4], values[5], values[6], values[7]));
}
async function ciphertextHash(api: Barretenberg, ciphertext: Bytes): Promise<bigint> {
  let state = await hash(api, CIPHERTEXT_DOMAIN, BigInt(ciphertext.length));
  for (let offset = 0; offset < ciphertext.length; offset += 31) {
    state = await hash(api, state, bytesToBigInt(ciphertext.slice(offset, offset + 31)));
  }
  return state;
}
export async function buildMerklePath(api: Barretenberg, leaves: Array<{ commitment: string; leafIndex: number }>, targetIndex: number) {
  let levelNodes = new Map<number, bigint>(leaves.map((leaf) => [leaf.leafIndex, BigInt(leaf.commitment)]));
  const path: string[] = [];
  const pathBits: boolean[] = [];
  let node = levelNodes.get(targetIndex);
  if (node === undefined) throw new Error("note_not_finalized");
  let index = targetIndex;
  let zero = 0n;
  for (let level = 0; level < 32; level += 1) {
    const bit = (index & 1) === 1;
    pathBits.push(bit);
    const sibling = levelNodes.get(index ^ 1) ?? zero;
    path.push(sibling.toString());
    node = bit ? await hash(api, sibling, node) : await hash(api, node, sibling);
    const nextNodes = new Map<number, bigint>();
    const pairStarts = new Set(Array.from(levelNodes.keys(), (key) => key & ~1));
    for (const pairStart of pairStarts) {
      const left = levelNodes.get(pairStart) ?? zero;
      const right = levelNodes.get(pairStart + 1) ?? zero;
      nextNodes.set(Math.floor(pairStart / 2), await hash(api, left, right));
    }
    levelNodes = nextNodes;
    zero = await hash(api, zero, zero);
    index = Math.floor(index / 2);
  }
  return { root: node, path, pathBits };
}
async function deriveKey(signature: string): Promise<CryptoKey> {
  const seed = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(signature));
  return crypto.subtle.importKey("raw", seed, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptNote(key: CryptoKey, note: object): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(note)),
  ));
  return { iv: hex(iv), ciphertext: hex(ciphertext) };
}
async function decryptNote(key: CryptoKey, ivHex: string, ciphertextHex: string): Promise<Record<string, string>> {
  const parse = (value: string) => Uint8Array.from(value.replace(/^0x/, "").match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: parse(ivHex) }, key, parse(ciphertextHex));
  const value: unknown = JSON.parse(new TextDecoder().decode(plaintext));
  if (!value || typeof value !== "object") throw new Error("invalid_note");
  return value as Record<string, string>;
}

type DepositRequest = {
  type: "deposit";
  requestId: number;
  signature: string;
  pool: string;
  amount: string;
  testFields?: string[];
};
type SpendRequest = {
  type: "withdraw";
  requestId: number;
  signature: string;
  pool: string;
  amount: string;
  root: string;
  path: string[];
  pathBits: boolean[];
  recipient: string;
  asset?: string;
  noteIv: string;
  noteCiphertext: string;
  leaves: Array<{ commitment: string; leafIndex: number }>;
  testFields?: string[];
};
type Request = DepositRequest | SpendRequest;

export async function prove(request: Request) {
  const api = await Barretenberg.new();
  try {
    const pool = addressField(request.pool);
    const chainId = 4663n;
    const domain = await hash(api, chainId, pool);
    const ownerDomain = await h4(api, domain, PROTOCOL_VERSION, chainId, pool);
    const noteDomain = await h4(api, domain, PROTOCOL_VERSION, CIRCUIT_VERSION, chainId);
    const seedDigest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(request.signature)));
    const spendingSecret = bytesToBigInt(seedDigest) % FIELD;
    let testFieldIndex = 0;
    const nextField = () => request.testFields?.[testFieldIndex++] !== undefined
      ? BigInt(request.testFields![testFieldIndex - 1]) % FIELD
      : randomField();
    const noteKey = await deriveKey(request.signature);
    const stored = request.type === "withdraw" ? await decryptNote(noteKey, request.noteIv, request.noteCiphertext) : undefined;
    const nonce = stored ? BigInt(stored.nonce) : nextField();
    const diversifier = stored ? BigInt(stored.diversifier) : nextField();
    const secret = stored ? BigInt(stored.secret) : nextField();
    const owner = await h4(api, ownerDomain, spendingSecret, diversifier, nonce);
    const amount = BigInt(stored?.amount ?? request.amount);
    const asset = stored?.asset ? BigInt(stored.asset) : ("asset" in request && request.asset ? addressField(request.asset) : 0n);
    const commitment = stored?.commitment ? BigInt(stored.commitment) : await h8(api, [noteDomain, pool, asset, amount, owner, diversifier, nonce, secret]);
    if (request.type === "withdraw") {
      const target = request.leaves.find((leaf) => BigInt(leaf.commitment) === commitment);
      if (!target) throw new Error("note_not_finalized");
      const merkle = await buildMerklePath(api, request.leaves, target.leafIndex);
      if (merkle.root !== BigInt(request.root)) throw new Error("merkle_root_mismatch");
      request.path = merkle.path;
      request.pathBits = merkle.pathBits;
    }
    const encrypted = request.type === "deposit"
      ? await encryptNote(noteKey, { spendingSecret: spendingSecret.toString(), amount: amount.toString(), asset: asset.toString(), diversifier: diversifier.toString(), nonce: nonce.toString(), secret: secret.toString(), commitment: hex(fieldBytes(commitment)) })
      : { iv: "0x", ciphertext: "0x" };
    const encryptedBytes = Uint8Array.from(encrypted.ciphertext.slice(2).match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
    const cipherHash = request.type === "deposit" ? await ciphertextHash(api, encryptedBytes) : 0n;
    const nullifierDomain = await h4(api, domain + 1n, PROTOCOL_VERSION, CIRCUIT_VERSION, pool);
    const leafIndex = request.type === "withdraw"
      ? request.pathBits.reduce((value, bit, index) => value + (bit ? 2 ** index : 0), 0)
      : 0;
    const nullifier = request.type === "withdraw" ? await h4(api, nullifierDomain, spendingSecret, commitment, BigInt(leafIndex)) : 0n;
    const input: Record<string, unknown> = {
      chain_id: chainId.toString(), pool: pool.toString(), domain: domain.toString(), protocol_version: PROTOCOL_VERSION.toString(), circuit_version: CIRCUIT_VERSION.toString(),
      operation: request.type === "deposit" ? 1 : 3, root: request.type === "deposit" ? "0" : BigInt(request.root).toString(), asset: asset.toString(), public_amount: amount.toString(),
      is_deposit: request.type === "deposit", recipient: request.type === "deposit" ? "0" : addressField(request.recipient).toString(), relayer: "0", relayer_fee: "0",
      input_count: request.type === "deposit" ? 0 : 1, output_count: request.type === "deposit" ? 1 : 0, public_nullifiers: [nullifier.toString(), "0"], public_commitments: request.type === "deposit" ? [commitment.toString(), "0"] : ["0", "0"], public_cipher_hashes: request.type === "deposit" ? [cipherHash.toString(), "0"] : ["0", "0"],
      spending_secret: spendingSecret.toString(), input_enabled: request.type === "deposit" ? [false, false] : [true, false], input_amount: request.type === "deposit" ? ["0", "0"] : [amount.toString(), "0"],
      input_secret: request.type === "deposit" ? ["0", "0"] : [secret.toString(), "0"], input_nonce: request.type === "deposit" ? ["0", "0"] : [nonce.toString(), "0"], input_diversifier: request.type === "deposit" ? ["0", "0"] : [diversifier.toString(), "0"],
      input_path: request.type === "deposit" ? [Array(32).fill("0"), Array(32).fill("0")] : [request.path, Array(32).fill("0")],
      input_path_bits: request.type === "deposit" ? [Array(32).fill(false), Array(32).fill(false)] : [request.pathBits, Array(32).fill(false)],
      output_enabled: request.type === "deposit" ? [true, false] : [false, false], output_amount: request.type === "deposit" ? [amount.toString(), "0"] : ["0", "0"], output_secret: request.type === "deposit" ? [secret.toString(), "0"] : ["0", "0"], output_nonce: request.type === "deposit" ? [nonce.toString(), "0"] : ["0", "0"], output_recipient_key: request.type === "deposit" ? [owner.toString(), "0"] : ["0", "0"], output_diversifier: request.type === "deposit" ? [diversifier.toString(), "0"] : ["0", "0"], output_cipher_hash: request.type === "deposit" ? [cipherHash.toString(), "0"] : ["0", "0"],
    };
    const program = (circuit as unknown as { program: { bytecode: string } }).program;
    const noir = new Noir(program as never);
    const { witness } = await noir.execute(input as never);
    const backend = new UltraHonkBackend(program.bytecode, api);
    const result = await backend.generateProof(witness, { verifierTarget: "evm" });
    return {
      requestId: request.requestId,
      proof: hex(result.proof),
      publicInputs: result.publicInputs,
      commitment: hex(fieldBytes(commitment)),
      nullifier: hex(fieldBytes(nullifier)),
      encryptedOutput: encrypted.ciphertext,
      noteIv: encrypted.iv,
      noteCiphertext: encrypted.ciphertext,
      amount: amount.toString(),
      asset: addressHex(asset),
    };
  } finally {
    await api.destroy();
  }
}

if (typeof self !== "undefined") {
  self.onmessage = (event: MessageEvent<Request>) => {
    void prove(event.data)
      .then((result) => self.postMessage({ ok: true, result }))
      .catch((error: unknown) => self.postMessage({ ok: false, error: error instanceof Error ? error.message : "proof_failed" }));
  };
}