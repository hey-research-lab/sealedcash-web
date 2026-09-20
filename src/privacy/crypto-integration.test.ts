import assert from "node:assert/strict";
import test from "node:test";
import { createPublicClient, http } from "viem";
import { prove } from "./privacy-worker";
import { Barretenberg } from "@aztec/bb.js";
import { buildMerklePath, fieldBytes } from "./privacy-worker";

const pool = "0x0000000000000000000000000000000000000000" as const;
const adapter = "0x0000000000000000000000000000000000000000" as const;
const zero = `0x${"00".repeat(32)}` as const;
const adapterAbi = [{
  type: "function",
  name: "verifyProof",
  stateMutability: "view",
  inputs: [
    { name: "proof", type: "bytes" },
    { name: "inputs", type: "tuple", components: [
      { name: "chainId", type: "uint256" }, { name: "pool", type: "address" }, { name: "domain", type: "bytes32" },
      { name: "protocolVersion", type: "bytes32" }, { name: "circuitVersion", type: "bytes32" }, { name: "operation", type: "uint8" },
      { name: "root", type: "bytes32" }, { name: "asset", type: "address" }, { name: "publicAmount", type: "uint256" },
      { name: "isDeposit", type: "bool" }, { name: "recipient", type: "address" }, { name: "relayer", type: "address" },
      { name: "relayerFee", type: "uint256" }, { name: "inputCount", type: "uint8" }, { name: "outputCount", type: "uint8" },
      { name: "nullifiers", type: "bytes32[2]" }, { name: "commitments", type: "bytes32[2]" }, { name: "ciphertextHashes", type: "bytes32[2]" },
    ] },
  ],
  outputs: [{ type: "bool" }],
}] as const;

const asField = (value: string) => `0x${BigInt(value).toString(16).padStart(64, "0")}` as `0x${string}`;
const addressField = (value: string) => `0x${BigInt(value).toString(16).padStart(40, "0")}` as `0x${string}`;

test("field encoding is canonical and cursor-safe", () => {
  assert.equal(Buffer.from(fieldBytes(1n)).toString("hex"), `${"00".repeat(31)}01`);
  assert.equal(Buffer.from(fieldBytes(256n)).toString("hex"), `${"00".repeat(30)}0100`);
  assert.equal(Buffer.from(fieldBytes(-1n)).toString("hex"), "30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000000");
});

test("multi-leaf Merkle path matches the 32-level construction", { timeout: 60_000 }, async () => {
  const api = await Barretenberg.new();
  try {
    const leaves = [{ commitment: "11", leafIndex: 0 }, { commitment: "22", leafIndex: 1 }, { commitment: "33", leafIndex: 2 }];
    const first = await buildMerklePath(api, leaves, 0);
    const second = await buildMerklePath(api, leaves, 2);
    assert.equal(first.root, second.root, "target paths must resolve to one canonical root");
    assert.equal(first.path.length, 32);
    assert.equal(first.pathBits.length, 32);
    assert.equal(first.pathBits[0], false);
    assert.equal(second.pathBits[0], false);
  } finally {
    await api.destroy();
  }
});

test("browser witness can be checked against a configured verifier", { timeout: 180_000 }, async (t) => {
  const rpc = process.env.ROBINHOOD_RPC_URL;
  if (!rpc || adapter === "0x0000000000000000000000000000000000000000") {
    return t.skip("A verifier RPC and address are not configured for this standalone test");
  }
  const amount = "1000000000000";
  const result = await prove({
    type: "deposit",
    requestId: 1,
    signature: "0xsealedcash-deterministic-browser-integration-v1",
    pool,
    amount,
    testFields: ["11", "22", "33"],
  });
  assert.match(result.proof, /^0x[0-9a-f]+$/i);
  assert.notEqual(result.commitment, zero);
  const inputs = result.publicInputs;
  assert.equal(inputs.length, 21);
  const client = createPublicClient({ transport: http(rpc) });
  const valid = await client.readContract({
    address: adapter,
    abi: adapterAbi,
    functionName: "verifyProof",
    args: [result.proof as `0x${string}`, {
      chainId: 4663n,
      pool,
      domain: asField(inputs[2]),
      protocolVersion: asField(inputs[3]),
      circuitVersion: asField(inputs[4]),
      operation: 1,
      root: zero,
      asset: addressField(inputs[7]),
      publicAmount: BigInt(inputs[8]),
      isDeposit: true,
      recipient: addressField(inputs[10]),
      relayer: addressField(inputs[11]),
      relayerFee: BigInt(inputs[12]),
      inputCount: 0,
      outputCount: 1,
      nullifiers: [asField(inputs[15]), asField(inputs[16])],
      commitments: [asField(inputs[17]), asField(inputs[18])],
      ciphertextHashes: [asField(inputs[19]), asField(inputs[20])],
    }],
  });
  assert.equal(valid, true);
});