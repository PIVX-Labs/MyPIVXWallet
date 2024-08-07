import { cChainParams } from '../chain_params.js';

/**
 * @enum {number}
 */
export const reasons = {
    NOT_FUNDED: 0,
    TOO_YOUNG: 1,
    OVER_BUDGET: 2,
};

export class ProposalValidator {
    /**
     * @type{number} Number of ENABLED masternodes
     */
    #nMasternodes;

    #allocatedBudget = 0;

    constructor(nMasternodes) {
        this.#nMasternodes = nMasternodes;
    }

    /**
     * Must be called in order of proposal for correct overbudget calculation
     * @returns {{passing: boolean, reason?: reasons}}
     */
    validate(proposal) {
        const { Yeas, Nays } = proposal;
        const netYes = Yeas - Nays;

        const requiredVotes = this.#nMasternodes / 10;
        if (netYes < requiredVotes) {
            return { passing: false, reason: reasons.NOT_FUNDED };
        } else if (!proposal.IsEstablished) {
            return { passing: false, reason: reasons.TOO_YOUNG };
        } else if (
            this.#allocatedBudget + proposal.MonthlyPayment >
            cChainParams.current.maxPayment
        ) {
            return { passing: false, reason: reasons.OVER_BUDGET };
        } else {
            // Proposal is passing, add monthly payment to allocated budget
            this.#allocatedBudget += proposal.MonthlyPayment;
            return { passing: true };
        }
    }
}
