import { test, expect, type Page } from "@playwright/test";
import type { Workspace } from "../../../../src/modules/workflow/service";

const workspaceUrl = "/ai/api.php?resource=workspace";
const sessionUrl = "/ai/api.php?resource=session";
const startLabel = "Start New Assessment";

async function signIn(page: Page, role: RegExp = /Requester/) {
  await page.goto("/ai/");
  await page.getByRole("button", { name: role }).click();
  await expect(
    page.getByRole("button", { name: "Dashboard", exact: true }),
  ).toBeVisible();
}

async function switchIdentity(page: Page, role: RegExp) {
  await page.getByRole("button", { name: "Switch demo identity" }).click();
  await page.getByRole("button", { name: role }).click();
  await expect(
    page.getByRole("button", { name: "Dashboard", exact: true }),
  ).toBeVisible();
}

async function readWorkspace(page: Page): Promise<Workspace> {
  const response = await page.request.get(workspaceUrl);
  expect(response.ok()).toBe(true);
  return response.json();
}

async function fillIdea(page: Page, title: string) {
  for (const [label, value] of [
    ["Use-case name", title],
    ["Department", "Programs"],
    ["AI tool / product", "Synthetic Planning Assistant"],
    ["Vendor", "Example Vendor"],
    ["Business purpose", "Draft a public volunteer orientation outline."],
    ["Description of use", "Staff review every fictional draft before use."],
  ]) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByLabel("Area of use").selectOption("GENERAL");
}

async function fillPeople(page: Page) {
  for (const [label, value] of [
    ["Who will use the tool?", "Volunteer coordinators"],
    ["Whose outcomes could be affected?", "Volunteers in a fictional program"],
    [
      "What decisions or work will AI support?",
      "Draft public orientation text",
    ],
    [
      "How independently will AI act?",
      "Drafts only, without independent actions",
    ],
    ["Describe human oversight", "A coordinator checks every draft before use"],
    [
      "Vendor & safeguard information",
      "Synthetic assurance review; public information only",
    ],
  ]) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByLabel("Public", { exact: true }).check();
}

async function fillRisk(page: Page) {
  for (const label of [
    "Data sensitivity",
    "Impact on people",
    "AI autonomy",
    "Human oversight",
    "Vendor assurance",
    "Transparency",
    "Privacy & security safeguards",
    "Legal & regulatory exposure",
  ]) {
    await page.getByLabel(label, { exact: true }).selectOption("0");
  }
}

async function completeIntake(page: Page, title: string) {
  await page.getByRole("button", { name: startLabel, exact: true }).click();
  await fillIdea(page, title);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await fillPeople(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await fillRisk(page);
}

async function submitAssessment(page: Page, title: string) {
  await completeIntake(page, title);
  await page
    .getByRole("button", { name: "Submit Assessment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Assessment Submitted", exact: true }),
  ).toBeVisible();
  const workspace = await readWorkspace(page);
  const record = workspace.records.find((entry) => entry.title === title);
  expect(
    record,
    "The server must retain the submitted assessment",
  ).toBeDefined();
  expect(record!.status).toBe("UNDER_REVIEW");
  await expect(page.getByTestId("assessment-id")).toHaveText(record!.id);
  await expect(page.getByTestId("persisted-status")).toHaveText(
    /Under review/i,
  );
  return record!;
}

test("UX-01: requester sees one prominent starting action above the desktop fold", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await expect(
    page.getByRole("heading", {
      name: "Welcome to AI Governance",
      exact: true,
    }),
  ).toBeVisible();
  const start = page.getByRole("button", { name: startLabel, exact: true });
  await expect(start).toHaveCount(1);
  await expect(start).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "View My Assessments", exact: true }),
  ).toBeVisible();
});

test("UX-02: starting action opens the existing intake", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: startLabel, exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "What would you like AI to help with?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Use-case name", { exact: true })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText(
    "Your AI Idea",
  );
});

test("UX-03: process guidance explains the three stages and human authority", async ({
  page,
}) => {
  await signIn(page);
  for (const stage of [
    "Describe your AI idea",
    "Answer risk questions",
    "Submit for human review",
  ]) {
    await expect(page.getByText(stage, { exact: true })).toBeVisible();
  }
  await expect(
    page.getByText(/human reviewer makes the final/).first(),
  ).toBeVisible();
});

test("UX-04: backward and forward navigation preserves entered information and progress", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("button", { name: startLabel, exact: true }).click();
  const title = `UX navigation ${Date.now()}`;
  await fillIdea(page, title);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText(
    "People & Information",
  );
  await fillPeople(page);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Use-case name", { exact: true })).toHaveValue(
    title,
  );
  await expect(
    page.getByLabel("Business purpose", { exact: true }),
  ).toHaveValue("Draft a public volunteer orientation outline.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByLabel("Who will use the tool?", { exact: true }),
  ).toHaveValue("Volunteer coordinators");
  await expect(page.getByLabel("Public", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await fillRisk(page);
  await expect(page.locator('[aria-current="step"]')).toContainText(
    "Risk Questions & Submit",
  );
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByLabel("Data sensitivity", { exact: true }),
  ).toHaveValue("0");
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await page.getByText("Review your assessment", { exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeHidden();
  await page.getByText("Review your assessment", { exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
});

test("UX-05: required fields have actionable associated errors and focused summary", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("button", { name: startLabel, exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const summary = page.getByRole("alert").filter({
    has: page.getByRole("heading", {
      name: "Please check your answers",
      exact: true,
    }),
  });
  await expect(summary).toBeFocused();
  const title = page.getByLabel("Use-case name", { exact: true });
  await expect(title).toHaveAttribute("aria-invalid", "true");
  const descriptionIds = (await title.getAttribute("aria-describedby"))!.split(
    /\s+/,
  );
  const descriptions = await Promise.all(
    descriptionIds.map((id) => page.locator(`[id="${id}"]`).innerText()),
  );
  expect(descriptions.join(" ")).toMatch(/Please.*(?:name|use.case)/i);
  await expect(page.locator('[aria-current="step"]')).toContainText(
    "Your AI Idea",
  );
  await fillIdea(page, "UX validation synthetic example");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await fillPeople(page);
  await page.getByLabel("Public", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(summary).toBeFocused();
  await expect(
    page.getByRole("group", { name: /Data categories/ }),
  ).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Public", { exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Submit Assessment", exact: true })
    .click();
  await expect(summary).toBeFocused();
  await expect(
    page.getByLabel("Legal & regulatory exposure", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByRole("heading", { name: "Assessment Submitted", exact: true }),
  ).toHaveCount(0);
});

test("UX-06: final step distinguishes Save Draft from Submit Assessment", async ({
  page,
}) => {
  await signIn(page);
  const title = `UX draft ${Date.now()}`;
  await completeIntake(page, title);
  await expect(
    page.getByRole("button", { name: "Submit Assessment", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save Draft", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Submit Proposal", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const record = (await readWorkspace(page)).records.find(
    (entry) => entry.title === title,
  )!;
  expect(record.status).toBe("DRAFT");
  expect(record.assessments).toHaveLength(0);
  await expect(
    page.getByRole("heading", { name: "Assessment Submitted", exact: true }),
  ).toHaveCount(0);
});

test("UX-07: confirmation identifies the persisted assessment, status, and next steps", async ({
  page,
}) => {
  await signIn(page);
  const title = `UX confirmation ${Date.now()}`;
  const record = await submitAssessment(page, title);
  await expect(
    page.getByRole("heading", { name: "What happens next?", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Return to Dashboard", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View Assessment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "View My Assessments", exact: true })
    .click();
  await page.getByLabel("Search records").fill(title);
  await page.getByRole("button", { name: title, exact: true }).click();
  await expect(page.getByText(record.id, { exact: true })).toBeVisible();
  expect(
    (await readWorkspace(page)).records.find((entry) => entry.id === record.id)
      ?.status,
  ).toBe("UNDER_REVIEW");
});

for (const [width, height] of [
  [375, 812],
  [768, 1024],
]) {
  test(`UX-08: starting action is visible and usable at ${width}px without horizontal scrolling`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await signIn(page);
    const start = page.getByRole("button", { name: startLabel, exact: true });
    await expect(start).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const box = await start.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await start.click();
    await expect(
      page.getByLabel("Use-case name", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

test("UX-09: a requester can reach and activate the primary action using Tab and Enter", async ({
  page,
}) => {
  await signIn(page);
  await page.reload();
  const start = page.getByRole("button", { name: startLabel, exact: true });
  await expect(start).toBeVisible();
  let reached = false;
  for (let count = 0; count < 30; count++) {
    await page.keyboard.press("Tab");
    reached = await start.evaluate(
      (element) => document.activeElement === element,
    );
    if (reached) break;
  }
  expect(reached, "The primary action must be in the natural tab order").toBe(
    true,
  );
  await expect(start).toBeFocused();
  expect(
    await start.evaluate((element) => {
      const style = getComputedStyle(element);
      return (
        style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0
      );
    }),
  ).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Use-case name", { exact: true })).toBeVisible();
});

test("UX-10: requester controls and PHP authorization prevent self approval", async ({
  page,
}) => {
  await signIn(page);
  await expect(
    page.getByRole("button", { name: "View Assigned Reviews", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Administration", exact: true }),
  ).toHaveCount(0);
  const record = await submitAssessment(
    page,
    `UX role separation ${Date.now()}`,
  );
  await page
    .getByRole("button", { name: "View Assessment", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Record decision", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Decision rationale", { exact: true }),
  ).toHaveCount(0);
  const session = await (await page.request.get(sessionUrl)).json();
  const response = await page.request.post(workspaceUrl, {
    headers: {
      "X-CSRF-Token": session.csrf,
      Origin: new URL(page.url()).origin,
    },
    data: {
      action: "decision",
      id: record.id,
      revision: record.revision,
      outcome: "APPROVED",
      rationale: "Synthetic requester attempt must be rejected.",
      mitigations: [],
    },
  });
  expect(response.status()).toBe(403);
  const unchanged = (await readWorkspace(page)).records.find(
    (entry) => entry.id === record.id,
  )!;
  expect(unchanged.status).toBe("UNDER_REVIEW");
  expect(unchanged.reviews.every((review) => review.decision === null)).toBe(
    true,
  );
});

test("UX-11 and UX-12: reviewer records a reasoned decision and auditor can inspect its history", async ({
  page,
}) => {
  await signIn(page);
  const title = `UX reviewer and history ${Date.now()}`;
  const record = await submitAssessment(page, title);
  await switchIdentity(page, /Reviewer.*Jordan Lee/);
  await page
    .getByRole("button", { name: "View Assigned Reviews", exact: true })
    .click();
  await page.getByRole("button", { name: title, exact: true }).click();
  await page
    .getByRole("combobox", { name: "Final human decision", exact: true })
    .selectOption("APPROVED");
  await page
    .getByLabel("Decision rationale", { exact: true })
    .fill(
      "Reviewed synthetic public-data scope and mandatory staff verification. Approval is a human decision.",
    );
  await page
    .getByRole("button", { name: "Record decision", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Human decision recorded",
  );
  expect(
    (await readWorkspace(page)).records.find((entry) => entry.id === record.id)
      ?.status,
  ).toBe("APPROVED");
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await expect(
    page.getByText("Decision recorded", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Version 1 · Low/)).toBeVisible();
  await switchIdentity(page, /Auditor/);
  await page
    .getByRole("button", { name: "View Governance Records", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Every action, accounted for",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "AI inventory", exact: true }).click();
  await page.getByLabel("Search records").fill(title);
  await page.getByRole("button", { name: title, exact: true }).click();
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await expect(
    page.getByText("Decision recorded", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Version 1 · Low/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Record decision", exact: true }),
  ).toHaveCount(0);
});

test("administrator retains direct inventory and configuration access", async ({
  page,
}) => {
  await signIn(page, /Administrator/);
  await page
    .getByRole("button", { name: "View AI Inventory", exact: true })
    .click();
  await expect(page.getByLabel("Search records")).toBeVisible();
  await page
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Save a new policy version",
      exact: true,
    }),
  ).toBeVisible();
});

test("a failed submission cannot show confirmation or change the persisted draft status", async ({
  page,
}) => {
  await signIn(page);
  const title = `UX failed submission ${Date.now()}`;
  await completeIntake(page, title);
  await page.route("**/api.php?resource=workspace", async (route) => {
    const request = route.request();
    if (
      request.method() === "POST" &&
      request.postDataJSON().action === "submit"
    ) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "SQLSTATE[HY000]: simulated internal server exception",
        }),
      });
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Submit Assessment", exact: true })
    .click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Assessment Submitted", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/SQLSTATE|HY000|simulated internal/)).toHaveCount(
    0,
  );
  const record = (await readWorkspace(page)).records.find(
    (entry) => entry.title === title,
  )!;
  expect(record.status).toBe("DRAFT");
  expect(record.assessments).toHaveLength(0);
});

test("unfinished work is retained when the requester cancels leaving intake", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("button", { name: startLabel, exact: true }).click();
  await page
    .getByLabel("Use-case name", { exact: true })
    .fill("Synthetic unsaved assessment");
  const dialog = page.waitForEvent("dialog");
  const click = page
    .getByRole("button", { name: "Dashboard", exact: true })
    .click();
  const prompt = await dialog;
  expect(prompt.type()).toBe("confirm");
  await prompt.dismiss();
  await click;
  await expect(page.getByLabel("Use-case name", { exact: true })).toHaveValue(
    "Synthetic unsaved assessment",
  );
});

test("a saved create survives a failed refresh without duplicate creation", async ({
  page,
}) => {
  await signIn(page);
  const title = `UX refresh recovery ${Date.now()}`;
  await completeIntake(page, title);
  let acknowledged = false;
  let failed = false;
  let creates = 0;
  await page.route("**/api.php?resource=workspace", async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.postDataJSON().action === "create") {
      creates++;
      const response = await route.fetch();
      acknowledged = response.ok();
      await route.fulfill({ response });
    } else if (req.method() === "GET" && acknowledged && !failed) {
      failed = true;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Simulated unavailable read" }),
      });
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Submit Assessment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your change was saved", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Assessment Submitted", exact: true }),
  ).toHaveCount(0);
  const saved = (await readWorkspace(page)).records.filter(
    (r) => r.title === title,
  );
  expect(saved).toHaveLength(1);
  expect(saved[0].status).toBe("DRAFT");
  await expect(page.getByTestId("recovery-id")).toHaveText(saved[0].id);
  await page
    .getByRole("button", { name: "Reload saved record", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Submit Assessment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Assessment Submitted", exact: true }),
  ).toBeVisible();
  expect(creates).toBe(1);
  expect(
    (await readWorkspace(page)).records.filter((r) => r.title === title),
  ).toHaveLength(1);
});

test("current intake navigation retains the unsaved-work guard", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("button", { name: startLabel, exact: true }).click();
  await page
    .getByLabel("Use-case name", { exact: true })
    .fill("Synthetic current-view guard");
  await page
    .getByRole("button", { name: "New assessment", exact: true })
    .click();
  const prompt = page.waitForEvent("dialog");
  const leave = page
    .getByRole("button", { name: "Dashboard", exact: true })
    .click();
  await (await prompt).dismiss();
  await leave;
  await expect(page.getByLabel("Use-case name", { exact: true })).toHaveValue(
    "Synthetic current-view guard",
  );
});

test("first-time requester empty state explains where to begin", async ({
  page,
}) => {
  await page.route("**/api.php?resource=workspace", async (route) => {
    const response = await route.fetch();
    if (route.request().method() === "GET" && response.ok()) {
      const workspace = await response.json();
      await route.fulfill({
        response,
        json: { ...workspace, records: [], events: [] },
      });
    } else await route.fulfill({ response });
  });
  await signIn(page);
  await expect(
    page.getByRole("heading", {
      name: "Your first assessment starts here.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: startLabel, exact: true }),
  ).toHaveCount(1);
});

test("an acknowledged policy save recovers its configuration after a failed refresh", async ({
  page,
}) => {
  await signIn(page, /Administrator/);
  await page
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  const before = await readWorkspace(page);
  let acknowledged = false;
  let failed = false;
  let writes = 0;
  await page.route("**/api.php?resource=workspace", async (route) => {
    const request = route.request();
    if (
      request.method() === "POST" &&
      request.postDataJSON().action === "configure"
    ) {
      writes++;
      const response = await route.fetch();
      acknowledged = response.ok();
      await route.fulfill({ response });
    } else if (request.method() === "GET" && acknowledged && !failed) {
      failed = true;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Simulated unavailable read" }),
      });
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Save a new policy version", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your change was saved", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Policy ID:", { exact: false })).toBeVisible();
  await page
    .getByRole("button", { name: "Reload saved policy", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Save a new policy version",
      exact: true,
    }),
  ).toBeVisible();
  expect((await readWorkspace(page)).configuration!.version).toBe(
    before.configuration!.version + 1,
  );
  expect(writes).toBe(1);
});
