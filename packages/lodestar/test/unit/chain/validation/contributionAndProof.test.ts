import {initBLS} from "@chainsafe/lodestar-cli/src/util";
import {defaultChainConfig} from "@chainsafe/lodestar-config";
import {ForkChoice, IForkChoice} from "@chainsafe/lodestar-fork-choice";
import sinon from "sinon";
import {SinonStubbedInstance} from "sinon";
import {BeaconChain, IBeaconChain} from "../../../../src/chain";
import {LocalClock} from "../../../../src/chain/clock";
import {SyncCommitteeErrorCode} from "../../../../src/chain/errors/syncCommitteeError";
import {expectRejectedWithLodestarError} from "../../../utils/errors";
import {StubbedBeaconDb} from "../../../utils/stub";
import {generateSignedContributionAndProof} from "../../../utils/contributionAndProof";
import {validateSyncCommitteeGossipContributionAndProof} from "../../../../src/chain/validation/syncCommitteeContributionAndProof";
// eslint-disable-next-line no-restricted-imports
import * as syncCommitteeUtils from "@chainsafe/lodestar-beacon-state-transition/lib/util/aggregator";
import {SinonStubFn} from "../../../utils/types";
import {generateCachedStateWithPubkeys} from "../../../utils/state";
import {SLOTS_PER_EPOCH} from "@chainsafe/lodestar-params";
import {createIBeaconConfig} from "@chainsafe/lodestar-config";

// https://github.com/ethereum/eth2.0-specs/blob/v1.1.0-alpha.3/specs/altair/p2p-interface.md
describe("Sync Committee Contribution And Proof validation", function () {
  const sandbox = sinon.createSandbox();
  let chain: SinonStubbedInstance<IBeaconChain>;
  let forkChoiceStub: SinonStubbedInstance<IForkChoice>;
  let clockStub: SinonStubbedInstance<LocalClock>;
  let db: StubbedBeaconDb;
  let isSyncCommitteeAggregatorStub: SinonStubFn<typeof syncCommitteeUtils["isSyncCommitteeAggregator"]>;

  const altairForkEpoch = 2020;
  const currentSlot = SLOTS_PER_EPOCH * (altairForkEpoch + 1);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const config = createIBeaconConfig(Object.assign({}, defaultChainConfig, {ALTAIR_FORK_EPOCH: altairForkEpoch}));

  before(async function () {
    await initBLS();
  });

  beforeEach(function () {
    chain = sandbox.createStubInstance(BeaconChain);
    chain.getGenesisTime.returns(Math.floor(Date.now() / 1000));
    clockStub = sandbox.createStubInstance(LocalClock);
    chain.clock = clockStub;
    clockStub.isCurrentSlotGivenGossipDisparity.returns(true);
    forkChoiceStub = sandbox.createStubInstance(ForkChoice);
    chain.forkChoice = forkChoiceStub;
    db = new StubbedBeaconDb(sandbox, config);
    isSyncCommitteeAggregatorStub = sandbox.stub(syncCommitteeUtils, "isSyncCommitteeAggregator");
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("should throw error - the signature's slot is not the current", async function () {
    clockStub.isCurrentSlotGivenGossipDisparity.returns(false);
    sandbox.stub(clockStub, "currentSlot").get(() => 100);

    const signedContributionAndProof = generateSignedContributionAndProof({contribution: {slot: 1}});
    await expectRejectedWithLodestarError(
      validateSyncCommitteeGossipContributionAndProof(config, chain, db, {
        contributionAndProof: signedContributionAndProof,
        validSignature: false,
      }),
      SyncCommitteeErrorCode.NOT_CURRENT_SLOT
    );
  });

  it("should throw error - the block being signed over has not been seen", async function () {
    const signedContributionAndProof = generateSignedContributionAndProof({contribution: {slot: currentSlot}});
    forkChoiceStub.hasBlock.returns(false);

    await expectRejectedWithLodestarError(
      validateSyncCommitteeGossipContributionAndProof(config, chain, db, {
        contributionAndProof: signedContributionAndProof,
        validSignature: false,
      }),
      SyncCommitteeErrorCode.UNKNOWN_BEACON_BLOCK_ROOT
    );
  });

  it("should throw error - subCommitteeIndex is not in allowed range", async function () {
    const signedContributionAndProof = generateSignedContributionAndProof({
      contribution: {slot: currentSlot, subCommitteeIndex: 10000},
    });
    forkChoiceStub.hasBlock.returns(true);

    await expectRejectedWithLodestarError(
      validateSyncCommitteeGossipContributionAndProof(config, chain, db, {
        contributionAndProof: signedContributionAndProof,
        validSignature: false,
      }),
      SyncCommitteeErrorCode.INVALID_SUB_COMMITTEE_INDEX
    );
  });

  it("should throw error - there is same contribution with same aggregator and index and slot", async function () {
    const signedContributionAndProof = generateSignedContributionAndProof({contribution: {slot: currentSlot}});
    forkChoiceStub.hasBlock.returns(true);
    const headState = await generateCachedStateWithPubkeys({slot: currentSlot}, config, true);
    chain.getHeadState.returns(headState);
    db.syncCommitteeContribution.has.returns(true);
    await expectRejectedWithLodestarError(
      validateSyncCommitteeGossipContributionAndProof(config, chain, db, {
        contributionAndProof: signedContributionAndProof,
        validSignature: false,
      }),
      SyncCommitteeErrorCode.SYNC_COMMITTEE_ALREADY_KNOWN
    );
  });

  it("should throw error - invalid aggregator", async function () {
    const signedContributionAndProof = generateSignedContributionAndProof({contribution: {slot: currentSlot}});
    forkChoiceStub.hasBlock.returns(true);
    db.syncCommitteeContribution.has.returns(false);
    const headState = await generateCachedStateWithPubkeys({slot: currentSlot}, config, true);
    chain.getHeadState.returns(headState);
    isSyncCommitteeAggregatorStub.returns(false);
    await expectRejectedWithLodestarError(
      validateSyncCommitteeGossipContributionAndProof(config, chain, db, {
        contributionAndProof: signedContributionAndProof,
        validSignature: false,
      }),
      SyncCommitteeErrorCode.INVALID_AGGREGATOR
    );
  });

  /**
   * Skip this spec: [REJECT] The aggregator's validator index is within the current sync committee -- i.e. state.validators[contribution_and_proof.aggregator_index].pubkey in state.current_sync_committee.pubkeys.
   * because we check the aggregator index already and we always sync sync pubkeys with indices
   */
  it.skip("should throw error - aggregator index is not in sync committee", async function () {
    const signedContributionAndProof = generateSignedContributionAndProof({contribution: {slot: currentSlot}});
    forkChoiceStub.hasBlock.returns(true);
    db.syncCommitteeContribution.has.returns(false);
    isSyncCommitteeAggregatorStub.returns(true);
    const headState = await generateCachedStateWithPubkeys({slot: currentSlot}, config, true);
    chain.getHeadState.returns(headState);
    await expectRejectedWithLodestarError(
      validateSyncCommitteeGossipContributionAndProof(config, chain, db, {
        contributionAndProof: signedContributionAndProof,
        validSignature: false,
      }),
      SyncCommitteeErrorCode.AGGREGATOR_PUBKEY_UNKNOWN
    );
  });

  it("should throw error - invalid selection_proof signature", async function () {
    const signedContributionAndProof = generateSignedContributionAndProof({contribution: {slot: currentSlot}});
    forkChoiceStub.hasBlock.returns(true);
    db.syncCommitteeContribution.has.returns(false);
    isSyncCommitteeAggregatorStub.returns(true);
    const headState = await generateCachedStateWithPubkeys({slot: currentSlot}, config, true);
    chain.getHeadState.returns(headState);
    chain.bls = {verifySignatureSets: async () => false};
    await expectRejectedWithLodestarError(
      validateSyncCommitteeGossipContributionAndProof(config, chain, db, {
        contributionAndProof: signedContributionAndProof,
        validSignature: false,
      }),
      SyncCommitteeErrorCode.INVALID_SIGNATURE
    );
  });

  // validation of signed_contribution_and_proof.signature is same test
  // the validation of aggregated signature of aggregation_bits is the same test
});
