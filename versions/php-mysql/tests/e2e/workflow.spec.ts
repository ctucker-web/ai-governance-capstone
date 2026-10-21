import { test, expect } from "@playwright/test";
test("clinical documentation acceptance scenario", async ({ page }) => {
  const name = `Clinical documentation ${Date.now()}`;
  await page.goto("/ai/");
  await page.getByRole("button", { name: /Requester/ }).click();
  await page
    .getByRole("button", { name: "New assessment", exact: true })
    .first()
    .click();
  for (const [label, value] of [
    ["Use-case name", name],
    ["Department", "Programs"],
    ["AI tool / product", "Synthetic Note Assistant"],
    ["Vendor", "Example Vendor"],
    ["Business purpose", "Help staff prepare accurate draft notes."],
    ["Description of use", "Draft documentation for human review."],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("Area of use").selectOption("CLINICAL");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Who will use the tool?").fill("Program clinicians");
  await page
    .getByLabel("Whose outcomes could be affected?")
    .fill("Program participants");
  await page.getByLabel("Client health", { exact: true }).check();
  for (const [label, value] of [
    ["What decisions or work will AI support?", "Draft documentation only"],
    ["How independently will AI act?", "No independent decisions"],
    ["Describe human oversight", "Every note is verified by a clinician"],
    [
      "Vendor & safeguard information",
      "Assurance review is pending; no data used for training",
    ],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByRole("button", { name: "Continue" }).click();
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
    await page.getByLabel(label, { exact: false }).selectOption(value);
  await page
    .getByRole("button", { name: "Submit for human review", exact: true })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expect(
    page.getByText("Mandatory escalation", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Taylor Chen", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch demo identity" }).click();
  await page.getByRole("button", { name: /Executive review/ }).click();
  await page.getByRole("button", { name: /Review queue/ }).click();
  await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("tab", { name: /Evidence/ }).click();
  await page
    .getByLabel("Evidence type", { exact: true })
    .fill("Vendor assurance");
  await page
    .getByLabel("Reference URL")
    .fill("https://example.com/synthetic-assurance");
  await page
    .getByLabel("Evidence description")
    .fill("Synthetic vendor review supports restricted use.");
  await page
    .getByLabel("Evidence notes")
    .fill("No confidential documents were uploaded.");
  await page.getByLabel("Date reviewed").fill("2026-09-24");
  await page.getByRole("button", { name: "Add evidence", exact: true }).click();
  await expect(
    page.getByRole("link", { name: /Open reference/ }),
  ).toHaveAttribute("href", "https://example.com/synthetic-assurance");
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await page
    .getByLabel("Decision rationale")
    .fill(
      "Human verification and restricted data handling make this use acceptable with conditions.",
    );
  await page
    .getByLabel("Mitigation requirement")
    .fill(
      "Human verification required before AI-generated content enters the official record.",
    );
  await page
    .getByRole("button", { name: "Record decision", exact: true })
    .click();
  await expect(
    page.getByText("Human decision recorded.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Conditionally approved", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await expect(
    page.getByText("Decision recorded", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Mitigations/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Human verification required before AI-generated content enters the official record.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "AI inventory", exact: true }).click();
  await page.getByLabel("Search records").fill(name);
  const row = page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name, exact: true }) });
  await expect(row).toContainText("Conditionally approved");
  await expect(row).toContainText("Taylor Chen");
  await expect(row.getByRole("cell").nth(5)).not.toHaveText("—");
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Switch demo identity" }).click();
  await page.getByRole("button", { name: /Requester/ }).click();
  await page.getByRole("button", { name: "AI inventory", exact: true }).click();
  await page.getByLabel("Search records").fill(name);
  await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("tab", { name: /Mitigations/ }).click();
  await page.getByLabel("Mitigation status").selectOption("COMPLETE");
  await page
    .getByLabel("Completion notes / waiver rationale")
    .fill("Every draft is reviewed under the documented procedure.");
  await page
    .getByRole("button", { name: "Update mitigation", exact: true })
    .click();
  await expect(page.locator(".mitigation-card .badge")).toHaveText("Complete");
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await expect(
    page.getByText("Mitigation completed", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Evidence added", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "History", exact: true }).focus();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("tab", { name: "Overview", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Evidence/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Home");
  await page
    .getByLabel("Reason for reassessment")
    .fill("Vendor model changed; reassess before continued use.");
  await page
    .getByRole("button", { name: "Start reassessment", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Edit draft", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Submit for human review", exact: true })
    .click();
  await expect(page.getByText(/Assessment v2 ·/)).toBeVisible();
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await expect(page.getByText(/Version 1 · High/)).toBeVisible();
  await expect(page.getByText(/Version 2 · High/)).toBeVisible();
  await expect(
    page
      .getByText("Vendor model changed; reassess before continued use.")
      .first(),
  ).toBeVisible();
});
test("administrator versions policy and records reviewer routing", async ({
  page,
}) => {
  await page.goto("/ai/");
  await page.getByRole("button", { name: /Administrator/ }).click();
  await page
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  const interval = page.getByLabel("Default reassessment interval (days)");
  const previous = await interval.inputValue();
  await interval.fill(previous === "180" ? "181" : "180");
  await page
    .getByRole("button", { name: "Save a new policy version", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Changes saved");
  await page.reload();
  await page
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await expect(
    page.getByLabel("Default reassessment interval (days)"),
  ).toHaveValue(previous === "180" ? "181" : "180");
  // Restore the interval with another auditable version, never erase policy history.
  await page.getByLabel("Default reassessment interval (days)").fill(previous);
  await page
    .getByRole("button", { name: "Save a new policy version", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Changes saved");
  await page
    .getByRole("button", { name: "Audit history", exact: true })
    .click();
  await expect(
    page.getByText(/Routing: LOW: Jordan Lee/).first(),
  ).toBeVisible();
});
test("HTTP authorization and cross-origin protections", async ({ request }) => {
  expect((await request.get("/ai/api.php?resource=workspace")).status()).toBe(401);
  expect(
    (
      await request.post("/ai/api.php?resource=session", {
        headers: { Origin: "https://untrusted.example" },
        data: { id: "00000000-0000-4000-8000-000000000013" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get("/ai/api.php?resource=workspace", {
        headers: { Cookie: "governance_php=forged" },
      })
    ).status(),
  ).toBe(401);
});
test("mobile intake navigation stays usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ai/");
  await page.getByRole("button", { name: /Requester/ }).click();
  await page
    .getByRole("button", { name: "New assessment", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Use-case name")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

