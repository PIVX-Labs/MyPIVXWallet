describe('Wallet balance tests', () => {
    beforeEach(() => {
        const mockedNow = new Date(2025, 8, 6);
        cy.clearDb();

        cy.playback('GET', /address/, {
            toBeCalledAtLeast: 4,
            matching: { ignores: ['hostname', 'port'] },
        }).as('sync');
        cy.visit('/', {
            onBeforeLoad(win) {
                const RealDate = win.Date;

                // Stub Date constructor
                cy.stub(win, 'Date').callsFake((...args) => {
                    if (args.length) {
                        return new RealDate(...args); // if called with args, behave normally
                    }
                    return mockedNow; // no args -> return fake date
                });

                // Fix prototype so instanceof checks work
                win.Date.prototype = RealDate.prototype;

                // Stub Date.now separately
                win.Date.now = () => mockedNow.getTime();
            },
        });
        cy.waitForLoading().should('be.visible');
        cy.setExplorer(0);
        cy.goToTab('dashboard');
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
