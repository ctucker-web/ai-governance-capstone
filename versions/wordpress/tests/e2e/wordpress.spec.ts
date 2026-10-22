import { expect, test, type Page } from "@playwright/test";
import type { Workspace } from "../../../../src/modules/workflow/service";

const appPath = "/wp-admin/admin-post.php?action=aigwp_app";
const restPath = "/?rest_route=/ai-governance/v1/workspace";
const password = process.env.WP_TEST_PASSWORD;
if (!password || password.length < 20)
  throw new Error(
    "Set the ephemeral WP_TEST_PASSWORD used to prepare the isolated WordPress fixtures.",
  );

async function signIn(page: Page, role = "requester") {
  const baseUrl = test.info().project.use.baseURL!;
  await page.goto(
    new URL(
      `/wp-login.php?redirect_to=${encodeURIComponent(new URL(appPath, baseUrl).href)}`,
      baseUrl,
    ).href,
  );
  // WordPress focuses this field after a 200ms timer. Wait for that native
  // behavior before typing, so it cannot steal focus during password entry.
  await expect(page.locator("#user_login")).toBeFocused();
  await page.locator("#user_login").fill(`aigwp_${role}_test`);
  await page.locator("#user_pass").fill(password!);
  await page.locator("#wp-submit").click();
  if (role !== "outsider") {
    await expect(
      page.getByRole("button", { name: "Dashboard", exact: true }),
    ).toBeVisible();
  }
}

async function apiSettings(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as { aigwp: { restUrl: string; nonce: string } })
        .aigwp,
  );
}

async function workspace(page: Page): Promise<Workspace> {
  const { restUrl, nonce } = await apiSettings(page);
  const response = await page.request.get(restUrl, {
    headers: { "X-WP-Nonce": nonce },
  });
  expect(response.ok()).toBe(true);
  return response.json();
}

async function command(page: Page, body: unknown) {
  const { restUrl, nonce } = await apiSettings(page);
  return page.request.post(restUrl, {
    headers: { "X-WP-Nonce": nonce },
    data: body,
  });
}

async function intake(page: Page, title: string) {
  await page
    .getByRole("button", { name: "Start New Assessment", exact: true })
    .click();
  for (const [label, value] of [
    ["Use-case name", title],
    ["Department", "Programs"],
    ["AI tool / product", "Synthetic Note Assistant"],
    ["Vendor", "Example Vendor"],
    ["Business purpose", "Prepare fictional draft notes."],
    ["Description of use", "Staff verify every draft before use."],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page
    .getByLabel("Area of use", { exact: true })
    .selectOption("CLINICAL");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  for (const [label, value] of [
    ["Who will use the tool?", "Fictional program clinicians"],
    ["Whose outcomes could be affected?", "Fictional program participants"],
    ["What decisions or work will AI support?", "Draft documentation only"],
    ["How independently will AI act?", "No independent decisions"],
    ["Describe human oversight", "A clinician verifies every output."],
    [
      "Vendor & safeguard information",
      "Synthetic assurance review pending; no training use.",
    ],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("Client health", { exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  for (const [label, value] of [
    ["Data sensitivity", "3"],
    ["Impact on people", "3"],
    ["AI autonomy", "0"],
    ["Human oversight", "0"],
    ["Vendor assurance", "2"],
    ["Transparency", "1"],
    ["Privacy & security safeguards", "1"],
    ["Legal & regulatory exposure", "3"],
  ])
    await page.getByLabel(label, { exact: true }).selectOption(value);
}

test("native WordPress login gives a requester the existing guided assessment interface", async ({
  page,
}) => {
  await signIn(page);
  await expect(
    page.getByRole("button", { name: "Start New Assessment", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Switch demo identity", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Administration", exact: true }),
  ).toHaveCount(0);
  const data = await workspace(page);
  expect(data.actor.name).toBe("Synthetic Requester");
  expect(data.actor.roles).toEqual(["REQUESTER"]);
  expect(data.users.map((user) => user.name)).not.toContain(
    "Synthetic Subscriber",
  );
});

test("logged-out visitors and WordPress subscribers cannot open governance data", async ({
  page,
  request,
}) => {
  expect([401, 403]).toContain((await request.get(restPath)).status());
  await page.goto(appPath);
  await expect(page).toHaveURL(/wp-login\.php/);
  await signIn(page, "outsider");
  await expect(
    page.getByRole("button", { name: "Start New Assessment", exact: true }),
  ).toHaveCount(0);
  expect([401, 403]).toContain((await page.request.get(restPath)).status());
});

test("WordPress REST nonce is required even with valid login cookies", async ({
  page,
}) => {
  await signIn(page);
  const { restUrl, nonce } = await apiSettings(page);
  expect([401, 403]).toContain((await page.request.get(restUrl)).status());
  expect(
    (
      await page.request.get(restUrl, {
        headers: { "X-WP-Nonce": "not-a-valid-nonce" },
      })
    ).status(),
  ).toBe(403);
  expect([401, 403]).toContain(
    (await page.request.post(restUrl, { data: { action: "create" } })).status(),
  );
  expect(
    (
      await page.request.get(restUrl, { headers: { "X-WP-Nonce": nonce } })
    ).ok(),
  ).toBe(true);
});

test("signing out uses WordPress logout and removes access to governance data", async ({
  page,
}) => {
  await signIn(page);
  const { restUrl, nonce } = await apiSettings(page);
  await page
    .getByRole("button", { name: "Sign out of WordPress", exact: true })
    .click();
  await expect(page).toHaveURL(/wp-login\.php/);
  expect([401, 403]).toContain(
    (
      await page.request.get(restUrl, { headers: { "X-WP-Nonce": nonce } })
    ).status(),
  );
});

test("a requester cannot forge an administrator identity or configure policy", async ({
  page,
}) => {
  await signIn(page);
  const before = await workspace(page);
  const administrator = before.users.find(
    (user) => user.name === "Synthetic Administrator",
  )!;
  expect(administrator).toBeDefined();
  const result = await command(page, {
    action: "configure",
    actor: { id: administrator.id, roles: ["ADMINISTRATOR"] },
    subject: administrator.id,
    version: 1,
    settings: {},
    routing: {},
  });
  expect(result.status()).toBe(403);
  expect((await workspace(page)).actor.id).toBe(before.actor.id);
});

test("independent WordPress reviewer completes the clinical lifecycle and history remains accessible", async ({
  page,
  browser,
}) => {
  await signIn(page);
  const title = `WordPress clinical ${Date.now()}`;
  await intake(page, title);
  await page
    .getByRole("button", { name: "Submit Assessment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Assessment Submitted", exact: true }),
  ).toBeVisible();
  const submitted = (await workspace(page)).records.find(
    (r) => r.title === title,
  )!;
  expect(submitted.status).toBe("UNDER_REVIEW");
  expect(submitted.assessments[0].tier).toBe("HIGH");
  await expect(page.getByTestId("assessment-id")).toHaveText(submitted.id);
  const selfReview = await command(page, {
    action: "decision",
    id: submitted.id,
    revision: submitted.revision,
    outcome: "APPROVED",
    rationale: "Attempted self approval.",
    mitigations: [],
  });
  expect(selfReview.status()).toBe(403);
  expect(
    (await workspace(page)).records.find((r) => r.id === submitted.id)!.status,
  ).toBe("UNDER_REVIEW");

  const reviewerContext = await browser.newContext();
  const reviewer = await reviewerContext.newPage();
  await signIn(reviewer, "reviewer");
  await reviewer
    .getByRole("button", { name: "View Assigned Reviews", exact: true })
    .click();
  await reviewer.getByRole("button", { name: title, exact: true }).click();
  await reviewer.getByRole("tab", { name: /Evidence/ }).click();
  await reviewer
    .getByLabel("Evidence type", { exact: true })
    .fill("Vendor assurance");
  await reviewer
    .getByLabel("Reference URL")
    .fill("https://example.com/synthetic-assurance");
  await reviewer
    .getByLabel("Evidence description")
    .fill("Fictional assurance reviewed.");
  await reviewer.getByLabel("Evidence notes").fill("No confidential upload.");
  await reviewer
    .getByRole("button", { name: "Add evidence", exact: true })
    .click();
  await expect(
    reviewer.getByRole("link", { name: /Open reference/ }),
  ).toHaveAttribute("href", "https://example.com/synthetic-assurance");
  await reviewer.getByRole("tab", { name: "Overview", exact: true }).click();
  await reviewer
    .getByLabel("Decision rationale", { exact: true })
    .fill("Human verification supports restricted use with safeguards.");
  await reviewer
    .getByLabel("Mitigation requirement", { exact: true })
    .fill("Verify every fictional draft before use.");
  await reviewer
    .getByRole("button", { name: "Record decision", exact: true })
    .click();
  await expect(
    reviewer.getByText("Conditionally approved", { exact: true }).first(),
  ).toBeVisible();
  await reviewerContext.close();

  const auditContext = await browser.newContext();
  const auditor = await auditContext.newPage();
  await signIn(auditor, "auditor");
  await auditor
    .getByRole("button", { name: "View Governance Records", exact: true })
    .click();
  await expect(
    auditor.getByText("Decision recorded", { exact: true }).first(),
  ).toBeVisible();
  await auditor
    .getByRole("button", { name: "AI inventory", exact: true })
    .click();
  await auditor.getByLabel("Search records").fill(title);
  await auditor.getByRole("button", { name: title, exact: true }).click();
  await auditor.getByRole("tab", { name: "History", exact: true }).click();
  await expect(
    auditor.getByText("Decision recorded", { exact: true }),
  ).toBeVisible();
  await expect(
    auditor.getByRole("button", { name: "Record decision", exact: true }),
  ).toHaveCount(0);
  await auditContext.close();

  await page.reload();
  await page
    .getByRole("button", { name: "View My Assessments", exact: true })
    .click();
  await page.getByLabel("Search records").fill(title);
  await page.getByRole("button", { name: title, exact: true }).click();
  await page.getByRole("tab", { name: /Mitigations/ }).click();
  await page.getByLabel("Mitigation status").selectOption("COMPLETE");
  await page
    .getByLabel("Completion notes / waiver rationale")
    .fill("Synthetic control checked.");
  await page
    .getByRole("button", { name: "Update mitigation", exact: true })
    .click();
  await expect(page.locator(".mitigation-card .badge")).toHaveText("Complete");
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await page
    .getByLabel("Reason for reassessment")
    .fill("The fictional scope changed.");
  await page
    .getByRole("button", { name: "Start reassessment", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Submit Assessment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Assessment Submitted", exact: true }),
  ).toBeVisible();
  const reassessed = (await workspace(page)).records.find(
    (r) => r.id === submitted.id,
  )!;
  expect(reassessed.assessments).toHaveLength(2);
  expect(reassessed.assessments[1]).toEqual(submitted.assessments[0]);
});

test("WordPress administrator can update policy with a new auditable version", async ({
  page,
}) => {
  await signIn(page, "admin");
  const before = await workspace(page);
  await page
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  const interval = page.getByLabel("Default reassessment interval (days)");
  const initial = await interval.inputValue();
  await interval.fill(initial === "180" ? "181" : "180");
  await page
    .getByRole("button", { name: "Save a new policy version", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Changes saved");
  expect((await workspace(page)).configuration!.version).toBe(
    before.configuration!.version + 1,
  );
  await interval.fill(initial);
  await page
    .getByRole("button", { name: "Save a new policy version", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Changes saved");
  expect((await workspace(page)).configuration!.version).toBe(
    before.configuration!.version + 2,
  );
});

test("375px requester entry point is visible and keyboard-operable after WordPress login", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signIn(page);
  const action = page.getByRole("button", {
    name: "Start New Assessment",
    exact: true,
  });
  await expect(action).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("heading", { name: "Welcome to AI Governance", exact: true })
    .focus();
  for (
    let presses = 0;
    presses < 8 &&
    !(await action.evaluate((element) => element === document.activeElement));
    presses++
  )
    await page.keyboard.press("Tab");
  await expect(action).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Use-case name", { exact: true })).toBeVisible();
});
