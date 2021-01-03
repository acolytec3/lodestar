import {config} from "@chainsafe/lodestar-config/minimal";
import {List} from "@chainsafe/ssz";
import {
  Ping,
  SignedBeaconBlock,
  Status,
  ProposerSlashing,
  AttesterSlashing,
  Attestation,
  Deposit,
  SignedVoluntaryExit,
} from "@chainsafe/lodestar-types";
import {RequestOrResponseBody, RequestOrResponseType} from "../../../../../../src/network";

// This test data generated with code from 'master' at Jan 1st 2021
// commit: ea3ffab1ffb8093b61a8ebfa4b4432c604c10819

export interface ISszSnappyTestData<T extends RequestOrResponseBody> {
  id: string;
  type: RequestOrResponseType;
  body: T;
  chunks: string[];
}

export const sszSnappyPing: ISszSnappyTestData<Ping> = {
  id: "Ping type",
  type: config.types.Ping,
  body: BigInt(1),
  chunks: [
    "0x08", // length prefix
    "0xff060000734e61507059", // snappy frames header
    "0x010c00000175de410100000000000000", // snappy frames content
  ],
};

export const sszSnappyStatus: ISszSnappyTestData<Status> = {
  id: "Status type",
  type: config.types.Status,
  body: {
    forkDigest: Buffer.alloc(4, 0xda),
    finalizedRoot: Buffer.alloc(32, 0xda),
    finalizedEpoch: 9,
    headRoot: Buffer.alloc(32, 0xda),
    headSlot: 9,
  },
  chunks: [
    "0x54", // length prefix
    "0xff060000734e61507059", // snappy frames header
    "0x001b0000097802c15400da8a010004090009017e2b001c0900000000000000",
  ],
};

export const sszSnappySignedBlock: ISszSnappyTestData<SignedBeaconBlock> = {
  id: "SignedBeaconBlock type",
  type: config.types.SignedBeaconBlock,
  body: {
    message: {
      slot: 9,
      proposerIndex: 9,
      parentRoot: Buffer.alloc(32, 0xda),
      stateRoot: Buffer.alloc(32, 0xda),
      body: {
        randaoReveal: Buffer.alloc(96, 0xda),
        eth1Data: {
          depositRoot: Buffer.alloc(32, 0xda),
          blockHash: Buffer.alloc(32, 0xda),
          depositCount: 9,
        },
        graffiti: Buffer.alloc(32, 0xda),
        proposerSlashings: ([] as ProposerSlashing[]) as List<ProposerSlashing>,
        attesterSlashings: ([] as AttesterSlashing[]) as List<AttesterSlashing>,
        attestations: ([] as Attestation[]) as List<Attestation>,
        deposits: ([] as Deposit[]) as List<Deposit>,
        voluntaryExits: ([] as SignedVoluntaryExit[]) as List<SignedVoluntaryExit>,
      },
    },
    signature: Buffer.alloc(96, 0xda),
  },
  chunks: [
    "0x9403",
    "0xff060000734e61507059",
    "0x00340000fff3b3f594031064000000dafe01007a010004090009011108fe6f000054feb4008ab4007e0100fecc0011cc0cdc0000003e0400",
  ],
};
