describe('Create wallet tests', () => {
    beforeEach(() => {
	Cypress.session.clearAllSavedSessions()
	cy.visit('http://localhost:8080')
	indexedDB.databases().then(dbs => {
	    for (const db of dbs) {
		indexedDB.deleteDatabase(db.name)
	    }
	})
	cy.wait(1000)
	
	cy.contains('button', 'Create').click()
	cy.contains('button', 'I have written').click()
    })
    it('encrypts wallet', () => {
	const password = 'supersecret123'
	cy.get('[data-testid="newPasswordModal"]').type(password)
	cy.get('[data-testid="confirmPasswordModal"]').type(password)
	cy.get('[data-testid="submitBtn"]').click()
	cy.contains('Secure your wallet').should('not.be.visible')
	cy.get('[class*="dcWallet-balances"]').contains('Receive').click()
	cy.get('code').filter(':visible').then(e => {
	    const address = e.text();
	    // Refresh page
	    cy.visit('http://localhost:8080')
	    cy.get('[class*="dcWallet-balances"]').contains('Receive').click();
	    cy.get('code').filter(':visible').then(e => {
		expect(e.text()).to.equal(address)
	    })
	    cy.contains('Secure your wallet').should('not.be.visible')
	})
    })
    it('encrypts with secure your wallet', () => {
	const password = 'supersecret123';
	cy.get('[data-testid="closeBtn"]').click()
	cy.contains('Secure your wallet').click();
	cy.get('[data-testid="newPasswordModal"]').type(password)
	cy.get('[data-testid="confirmPasswordModal"]').type(password)
	cy.get('[data-testid="submitBtn"]').click()
    })
})
