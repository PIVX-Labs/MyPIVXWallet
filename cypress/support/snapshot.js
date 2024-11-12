Cypress.Commands.add(
    'matchHtmlSnapshot',
    { prevSubject: true },
    (subject, snapshotName = 'snapshot') => {
        // Join HTML of all matching elements in the subject
        const htmlContent = Cypress.$(subject)
            .toArray()
            .map((el) => el.outerHTML)
            .join('\n');

        const snapshotPath = `cypress/snapshots/html/${snapshotName}.html`;

        cy.task('fileExists', snapshotPath).then((exists) => {
            if (exists && !process.env.CYPRESS_PLAYBACK_MODE === 'record') {
                cy.readFile(snapshotPath).then((expectedHtml) => {
                    expect(htmlContent === expectedHtml).to.equal(true);
                });
            } else {
                cy.writeFile(snapshotPath, htmlContent);
            }
        });
    }
);
