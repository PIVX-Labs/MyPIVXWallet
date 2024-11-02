describe('template spec', () => {
    it('passes', () => {
        cy.clearDb();
        cy.visit('/');
        cy.createWallet('123456');
        cy.goToTab('stake');
        cy.deleteWallet();
    });
});
