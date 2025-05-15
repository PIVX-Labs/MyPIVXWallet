Cypress.Commands.add('clearDb', () => {
    new Cypress.Promise((res, rej) => {
        const tx = indexedDB.deleteDatabase('MPW-mainnet');

        tx.onsuccess = res;
        tx.onerror = rej;
    });
});

Cypress.Commands.add(
    'encryptWallet',
    (password, confirmPassword = password) => {
        if (password) {
            cy.get('[data-testid="newPasswordModal"]')
                .should('be.visible')
                .type(password);
            cy.get('[data-testid="confirmPasswordModal"]').type(
                confirmPassword
            );
            cy.get('[data-testid="submitBtn"]').click();
        } else {
            cy.get('[data-testid="closeBtn"]').click();
        }
    }
);

Cypress.Commands.add('waitForLoading', () => {
    cy.get('[data-testid="generateWallet"]');
});

Cypress.Commands.add('createWallet', (password) => {
    cy.get('[data-testid="generateWallet"]').click();
    const seedPhrase = cy.get('.seed-phrase').invoke('text');
    cy.get('[data-testid="seedphraseModal"]').click();
    cy.encryptWallet(password);
    return seedPhrase;
});
Cypress.Commands.add('createVanityWallet', (prefix, password) => {
    cy.get('[data-testid="vanityWalletButton"]').click();
    cy.get('[data-testid="prefixInput"]').should('be.visible').type(prefix);
    cy.get('[data-testid="generateBtn"]').click();
    cy.encryptWallet(password);
});
Cypress.Commands.add('importWallet', (key, password) => {
    cy.get('[data-testid="accWalletButton"]').click();
    cy.get('[data-testid="secretInp"]').should('be.visible').type(key);
    if (password)
        cy.get('[data-testid="passwordInp"]')
            .should('be.visible')
            .type(password);
    cy.get('[data-testid="importWalletButton"]').click();
});
Cypress.Commands.add('goToTab', (tab) => {
    switch (tab) {
        case 'dashboard':
            cy.get('[data-i18n="navDashboard"]').click();
            break;
        case 'stake':
            cy.get('[data-i18n="navStake"]').click();
            break;
        case 'masternode':
            cy.get('[data-i18n="navMasternode"]').click();
            break;
        case 'governance':
            cy.get('[data-i18n="navGovernance"]').click();
            break;
        case 'settings':
            cy.get('[data-i18n="navSettings"]').click();
            break;
    }
});
Cypress.Commands.add('toggleAdvancedMode', () => {
    cy.goToTab('settings');
    cy.get('#testnetToggler').click({ force: true });
});
Cypress.Commands.add('deleteWallet', () => {
    cy.goToTab('settings');
    cy.log('Deleting wallet');
    cy.get('[data-testid="deleteWalletButton"]').click();
    cy.get('[data-i18n="popupConfirm"]').click();
});
Cypress.Commands.add('setExplorer', (explorerNameOrIndex) => {
    cy.goToTab('settings');
    cy.get('#explorer').select(explorerNameOrIndex);
});
Cypress.Commands.add('setNode', (nodeNameOrIndex) => {
    cy.goToTab('settings');
    cy.get('#node').select(nodeNameOrIndex);
});

Cypress.Commands.add('togglePrivateMode', () => {
    cy.goToTab('dashboard');
    cy.get('#publicPrivateText').click();
});

Cypress.Commands.add('waitForSync', () => {
    cy.contains('[data-testid="alerts"]', 'Sync Finished!', {
        timeout: 1000 * 60 * 5,
    });
    // Close all alerts so we don't get any false positives when running the command again
    cy.get('[data-testid="alertCloseButton"]').each(($el) => {
        cy.wrap($el).click();
    });
});
