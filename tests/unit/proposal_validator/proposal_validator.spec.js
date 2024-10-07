import { describe, it, expect } from 'vitest';
import { ProposalValidator } from '../../../scripts/governance/status';
import proposals from './dummy_proposals.json';

describe('Proposal validator tests', () => {
    it('correctly validates proposals', () => {
        const proposalValidator = new ProposalValidator(2000);
        for (const proposal of proposals) {
            const { passing, reason } = proposalValidator.validate(proposal);
            expect(passing).toBe(proposal.valid);
            expect(reason).toBe(proposal.reason);
        }
    });
});
