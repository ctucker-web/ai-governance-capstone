import { test, expect } from "@playwright/test";
test("clinical documentation acceptance scenario", async ({ page }) => {
  const name = `Clinical documentation ${Date.now()}`;
  await page.goto("/login");
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
});
test("HTTP authorization and cross-origin protections", async ({ request }) => {
  expect((await request.get("/api/workspace")).status()).toBe(401);
  expect(
    (
      await request.post("/api/session", {
        headers: { Origin: "https://untrusted.example" },
        data: { id: "00000000-0000-4000-8000-000000000013" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.get("/api/workspace", {
        headers: { Cookie: "governance-session=forged" },
      })
    ).status(),
  ).toBe(401);
});
test("mobile intake navigation stays usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
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
