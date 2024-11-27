describe('public/private mode tests', () => {
    beforeEach(() => {
        cy.clearDb();
        cy.playback('GET', /(xpub|address|getshielddata|duddino|block)/, {
            matching: { ignores: ['hostname', 'port'] },
        }).as('sync');
        cy.visit('/');
        cy.waitForLoading().should('be.visible');

        cy.setExplorer(0);
        cy.setNode(0);
        cy.goToTab('dashboard');
        cy.importWallet(
            'hawk crash art bottom rookie surprise grit giant fitness entire course spray'
        );
        cy.encryptWallet('123456');
        cy.waitForSync();
        cy.togglePrivateMode();
    });

    it('switches back to public mode when not available', () => {
        // We should be in private mode here
        cy.get('[data-testid="shieldModePrefix"]').should('exist');
        cy.deleteWallet();
        // When importing a non shield capable wallet, we should be in public mode
        cy.importWallet('DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb');
        cy.waitForSync();
        cy.get('[data-testid="shieldModePrefix"]').should('not.exist');
    });

    it('remembers private mode', () => {
        cy.visit('/');
        cy.waitForSync();
        cy.get('[data-testid="shieldModePrefix"]').should('exist');
    });
});
