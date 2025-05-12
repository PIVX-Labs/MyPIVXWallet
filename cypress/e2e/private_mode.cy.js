describe('public/private mode tests', () => {
    const before = () => {
        cy.playback('GET', /(xpub|address|getshielddata|duddino|block)/, {
            matching: { ignores: ['hostname', 'port'] },
        }).as('sync');
        cy.intercept('GET', 'https://rpc.duddino.com/mainnet/getblockcount', {
            statusCode: 200,
            body: 4895886,
        });
        cy.clearDb();
        cy.visit('/');
        cy.waitForLoading().should('be.visible');

        cy.goToTab('dashboard');
        cy.importWallet(
            'hawk crash art bottom rookie surprise grit giant fitness entire course spray'
        );
        cy.encryptWallet('123456');
        cy.waitForSync();
        cy.togglePrivateMode();
    };

    it('switches back to public mode when not available', () => {
        // It should remember private mode
        before();
        cy.visit('/');
        cy.waitForSync();

        cy.get('[data-testid="shieldModePrefix"]').should('exist');
        // We should be in private mode here
        cy.get('[data-testid="shieldModePrefix"]').should('exist');
        cy.deleteWallet();
        //	    cy.deleteWallet();
        // When importing a non shield capable wallet, we should be in public mode
        cy.importWallet('DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb');
        cy.waitForSync();
        cy.get('[data-testid="shieldModePrefix"]').should('not.exist');
    });
});
