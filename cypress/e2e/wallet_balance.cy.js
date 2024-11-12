describe('Wallet balance tests', () => {
    beforeEach(() => {
        cy.clearDb();
        const now = new Date(2024, 11, 5);
        cy.clock(now);
        cy.playback('GET', /address/, {
            toBeCalledAtLeast: 4,
            matching: { ignores: ['hostname', 'port'] },
        }).as('sync');
        cy.visit('/');
        cy.importWallet('DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb');
    });
    it('calculates balance correctly', () => {
        for (let i = 0; i < 5; i++) {
            cy.wait('@sync');
        }
        cy.get('[data-testid="primaryBalance"]').contains('0');

        for (let i = 0; i < 10; i++) {
            cy.get('[data-testid="activity"]')
                .filter(':visible')
                .scrollTo('bottom');
            cy.get('[data-testid="activityLoadMore"]')
                .filter(':visible')
                .click();
        }
        cy.get('[data-testid="activity"]')
            .filter(':visible')
            .matchHtmlSnapshot();

        cy.goToTab('stake');
    });
});
