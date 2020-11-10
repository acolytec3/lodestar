import {BeaconStateApi} from "../../../../../../src/api/impl/beacon/state/state";
import {config} from "@chainsafe/lodestar-config/lib/presets/minimal";
import {BeaconChain} from "../../../../../../src/chain";
import {StubbedBeaconDb} from "../../../../../utils/stub";
import sinon, {SinonStub} from "sinon";
import {IBeaconStateApi} from "../../../../../../src/api/impl/beacon/state/interface";
import * as stateApiUtils from "../../../../../../src/api/impl/beacon/state/utils";
import {generateState} from "../../../../../utils/state";
import {expect} from "chai";

describe("beacon api impl - states", function () {
  let api: IBeaconStateApi;
  let resolveStateIdStub: SinonStub;
  let getEpochBeaconCommitteesStub: SinonStub;

  beforeEach(function () {
    resolveStateIdStub = sinon.stub(stateApiUtils, "resolveStateId");
    getEpochBeaconCommitteesStub = sinon.stub(stateApiUtils, "getEpochBeaconCommittees");
    api = new BeaconStateApi(
      {},
      {
        config,
        chain: sinon.createStubInstance(BeaconChain),
        db: new StubbedBeaconDb(sinon, config),
      }
    );
  });

  afterEach(function () {
    resolveStateIdStub.restore();
    getEpochBeaconCommitteesStub.restore();
  });

  describe("getState", function () {
    it("should get state by id", async function () {
      resolveStateIdStub.resolves({state: generateState()});
      const state = await api.getState("something");
      expect(state).to.not.be.null;
    });

    it("state doesn't exist", async function () {
      resolveStateIdStub.resolves(null);
      const state = await api.getState("something");
      expect(state).to.be.null;
    });
  });

  describe("getStateCommittes", function () {
    it("no state context", async function () {
      resolveStateIdStub.resolves(null);
      await expect(api.getStateCommittees("blem")).to.be.eventually.rejectedWith("State not found");
    });
    it("no filters", async function () {
      resolveStateIdStub.resolves({state: generateState()});
      getEpochBeaconCommitteesStub.returns([[[1, 4, 5]], [[2, 3, 6]]]);
      const committees = await api.getStateCommittees("blem");
      expect(committees).to.have.length(2);
    });
    it("slot and committee filter", async function () {
      resolveStateIdStub.resolves({state: generateState()});
      getEpochBeaconCommitteesStub.returns([
        [[1, 4, 5]],
        [
          [2, 3, 6],
          [8, 9, 10],
        ],
      ]);
      const committees = await api.getStateCommittees("blem", {slot: 1, index: 1});
      expect(committees).to.have.length(1);
      expect(committees[0].index).to.be.equal(1);
      expect(committees[0].slot).to.be.equal(1);
      expect(committees[0].validators).to.be.deep.equal([8, 9, 10]);
    });
  });
});
