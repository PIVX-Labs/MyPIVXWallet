## Introduction

MPW uses cypress to do e2e tests.
To open the gui, run `npm run dev` to open the dev server.
Then, run `npm run cy:open`. Click on e2e testing and select a browser. From there, you can select a test file to run.
Alternatively, you can run `npm run cy:ci` to run all the specs in headless mode.

## Commands

Commands are defined in `cypress/support/commands.js` and provide common actions, like `createWallet` and `goToTab`. To add a command, call `Cypress.Commands.add`. To call a command, `cy.[command name]`.

## Playback and snapshots

To avoid relying on the actual blockchain data, we can take a snapshot of the explorer response and play it back on subsequent runs.
To tell cypress to playback a request, use `cy.playback(METHOD, URL, OPTIONS)`.
For example:
```javascript
cy.playback('GET', /explorer/, { toBeCalledAtLeast: 4 }).as('sync');
for (let i = 0; i < 4; i++) {
    cy.wait('@sync');
}
```
Plays back 4 calls to explorer and waits for MPW to make the requests (for example, fetch pages from explorer).
To tell cypress to record the requests, open it with the environment variable `CYPRESS_PLAYBACK_MODE=record`.
Do not update other tests' playbacks unless necesarry, as you might have to update the tests.

You can take snapshots with `.matchHtmlSnapshot`, for example:
```javascript
cy.get('[data-testid="activity"]')
    .filter(':visible')
    .matchHtmlSnapshot('activity');
```
Takes the HTML of the visible activity and matches it against the old version.
If you need to update the snapshots, remove the outdated one and rerun the tests.

You can also run `npm run cy:record`, and then check the appropriate `git diff`.

## Should I write an e2e test?
E2e tests are very expensive compared to other ones. If you are writing tests for a minor bug, try to write a unit test first.
You should write e2e tests for:
- Complex flows, especially if they are often skipped during QC due to the demanding requirements like opening a masternode or creating a proposal.
- Subtle bugs that are not easily catched in unit testing

