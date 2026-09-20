import { test, expect } from "@playwright/test";
import { unzipSync, strFromU8 } from "fflate";
test("workshops contain real source archives, readable code and no forced directory banner", async ({
  page,
  request,
}) => {
  await page.goto("/tools");
  await expect(page.locator(".resource-card").first()).toBeVisible();
  await expect(page.getByText("选引擎，也看你要做什么。")).toHaveCount(0);
  for (const slug of [
    "godot-ai-prototype",
    "cocos-ai-prototype",
    "web-game-ai-workflow",
  ]) {
    await page.goto("/learn/" + slug);
    await expect(page.locator(".tutorial-code pre").first()).toBeVisible();
    const a = page.getByRole("link", { name: "下载完整源码与中文说明" });
    const url = await a.getAttribute("href");
    const r = await request.get(url!);
    expect(r.ok()).toBe(true);
    const files = unzipSync(new Uint8Array(await r.body()));
    const readme = Object.entries(files).find(([k]) =>
      k.endsWith("/README.md"),
    );
    expect(readme).toBeTruthy();
    expect(strFromU8(readme![1])).toContain("09 ·");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
});
test("Phaser demo runs keyboard/touch, scoring, time limit and restart", async ({
  page,
  isMobile,
}) => {
  await page.goto("/workshop-files/phaser-catch/index.html");
  await page.waitForFunction(
    "window.workshopGame?.scene.getScene('catch')?.player",
  );
  const box = await page.locator("canvas").boundingBox();
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: box!.x + box!.width * 0.8, y: box!.y + box!.height * 0.8 },
      ],
    });
    await expect
      .poll(() =>
        page.evaluate("window.workshopGame.scene.getScene('catch').player.x"),
      )
      .toBeGreaterThan(250);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  } else {
    await page.keyboard.down("ArrowRight");
    await expect
      .poll(() =>
        page.evaluate("window.workshopGame.scene.getScene('catch').player.x"),
      )
      .toBeGreaterThan(250);
    await page.keyboard.up("ArrowRight");
  }
  await page.evaluate(
    "(()=>{const s=window.workshopGame.scene.getScene('catch');s.coins.forEach(c=>c.destroy());s.coins=[];s.score=0;s.spawnLeft=10;s.coins.push(s.add.circle(s.player.x,s.player.y,12,0xffd166));s.update(0,1);})()",
  );
  expect(
    await page.evaluate("window.workshopGame.scene.getScene('catch').score"),
  ).toBe(1);
  await page.evaluate(
    "(()=>{const s=window.workshopGame.scene.getScene('catch');s.remaining=0.001;s.update(0,16);})()",
  );
  expect(
    await page.evaluate("window.workshopGame.scene.getScene('catch').finished"),
  ).toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const endBox = await page.locator("canvas").boundingBox();
  if (isMobile)
    await page.touchscreen.tap(
      endBox!.x + endBox!.width / 2,
      endBox!.y + (endBox!.height * 300) / 640,
    );
  else
    await page.mouse.click(
      endBox!.x + endBox!.width / 2,
      endBox!.y + (endBox!.height * 300) / 640,
    );
  await expect
    .poll(() =>
      page.evaluate("window.workshopGame.scene.getScene('catch').finished"),
    )
    .toBe(false);
  expect(
    await page.evaluate("window.workshopGame.scene.getScene('catch').score"),
  ).toBe(0);
});
