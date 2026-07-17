import { expect, test } from '@playwright/test'

// End-to-end smoke test for the Docker Compose stack (docs/DAT-92). Runs the
// core "one-screen match entry" journey against the real API + Postgres, not
// mocks: create an opponent, create a club, log a match via the per-set score
// fields, confirm the derived result reaches the match detail page, then
// confirm the table/card view toggle works.

test('opponent -> club -> match -> derived result -> view toggle', async ({ page }) => {
  const runId = Date.now()
  const opponentLastName = `Smoke-${runId}`
  const clubName = `Smoke Club ${runId}`

  await test.step('create an opponent', async () => {
    await page.goto('/opponents/new')
    await page.getByLabel('First name').fill('Ada')
    await page.getByLabel('Last name').fill(opponentLastName)
    await page.getByRole('button', { name: 'Add opponent' }).click()
    await expect(page).toHaveURL(/\/opponents\/\d+$/)
    await expect(page.getByRole('heading', { name: `Ada ${opponentLastName}` })).toBeVisible()
  })

  await test.step('create a club', async () => {
    await page.goto('/clubs/new')
    await page.getByLabel('Name').fill(clubName)
    await page.getByRole('button', { name: 'Add club' }).click()
    await expect(page).toHaveURL(/\/clubs\/\d+$/)
    await expect(page.getByRole('heading', { name: clubName })).toBeVisible()
  })

  let matchDetailUrl = ''

  await test.step('log a match via a score string', async () => {
    await page.goto('/matches/new')

    await page.getByRole('combobox', { name: 'Opponent' }).click()
    await page.getByRole('option', { name: `Ada ${opponentLastName}` }).click()

    await page.getByRole('combobox', { name: 'Club' }).click()
    await page.getByRole('option', { name: clubName }).click()

    // Score entry is a per-set games-won/games-lost grid (DAT-123) — the default
    // "3 Sets" scoring type gives us exactly the three rows this score needs.
    await page.getByLabel('Set 1 games won').fill('6')
    await page.getByLabel('Set 1 games lost').fill('4')
    await page.getByLabel('Set 2 games won').fill('3')
    await page.getByLabel('Set 2 games lost').fill('6')
    await page.getByLabel('Set 3 games won').fill('10')
    await page.getByLabel('Set 3 games lost').fill('7')
    await page.getByRole('button', { name: 'Save match' }).click()

    await expect(page.getByRole('heading', { name: 'Match saved' })).toBeVisible()
    await expect(page.getByText('Win')).toBeVisible()
    await expect(page.getByText('6-4 3-6 10-7')).toBeVisible()

    const backToMatch = page.getByRole('link', { name: 'Back to match' })
    await expect(backToMatch).toBeVisible()
    matchDetailUrl = await backToMatch.getAttribute('href').then((href) => href ?? '')
  })

  await test.step('verify the derived result on the match detail page', async () => {
    expect(matchDetailUrl).toMatch(/^\/matches\/\d+$/)
    await page.goto(matchDetailUrl)

    await expect(page.getByText('Win', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('6-4 3-6 10-7')).toBeVisible()

    // Set-by-set breakdown, derived from the score string — not stored input.
    await expect(page.getByRole('cell', { name: '6–4', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: '3–6', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: '10–7', exact: true })).toBeVisible()
  })

  await test.step('toggle between table and card view', async () => {
    await page.goto('/matches')

    // Table view is the default — the row we just created is a table row.
    const tableRow = page.getByRole('row', { name: new RegExp(clubName) })
    await expect(tableRow).toBeVisible()

    await page.getByRole('button', { name: 'Card view' }).click()
    await expect(tableRow).not.toBeVisible()
    await expect(page.getByText(clubName)).toBeVisible()

    await page.getByRole('button', { name: 'Table view' }).click()
    await expect(page.getByRole('row', { name: new RegExp(clubName) })).toBeVisible()
  })
})
