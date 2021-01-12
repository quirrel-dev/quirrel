describe("he", () => {
  it("works", async () => {
    await page.goto("https://api.quirrel.dev");
    const shadowElem = await page.$("body > h1");
    const shadowElemText = await shadowElem?.innerText();
    expect(shadowElemText).toBe("Welcome to the Quirrel API!");
  });
});
