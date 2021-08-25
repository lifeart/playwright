/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { test as it, expect } from './pageTest';

const embers = {
  'ember.3.28': '/reading-list/ember3.html',
};

for (const [name, url] of Object.entries(embers)) {
  it.describe(name, () => {
    it.beforeEach(async ({page, server}) => {
      await page.goto(server.PREFIX + url);
    });

    it('should work with single-root elements', async ({page}) => {
      expect(await page.$$eval(`_ember=ReadingList`, els => els.length)).toBe(1);
      expect(await page.$$eval(`_ember=ListItem`, els => els.length)).toBe(3);
      expect(await page.$$eval(`_ember=ReadingList >> _ember=ListItem`, els => els.length)).toBe(3);
      expect(await page.$$eval(`_ember=ListItem >> _ember=ReadingList`, els => els.length)).toBe(0);

    });

    it('should not crash when there is no match', async ({page}) => {
      expect(await page.$$eval(`_ember=Apps`, els => els.length)).toBe(0);
      expect(await page.$$eval(`_ember=BookLi`, els => els.length)).toBe(0);
    });

    it('should compose', async ({page}) => {
      expect(await page.$eval(`_ember=ListItem >> text=Gatsby`, el => el.textContent.trim())).toBe('The Great Gatsby');
    });

    it('should query by args combinations', async ({page}) => {
      expect(await page.$$eval(`_ember=ListItem[name="The Great Gatsby"]`, els => els.length)).toBe(1);
      expect(await page.$$eval(`_ember=ListItem[name="the great gatsby" i]`, els => els.length)).toBe(1);
      expect(await page.$$eval(`_ember=ColorButton[nested.index = 0]`, els => els.length)).toBe(1);
      expect(await page.$$eval(`_ember=ColorButton[nested.nonexisting.index = 0]`, els => els.length)).toBe(0);
      expect(await page.$$eval(`_ember=ColorButton[nested.index.nonexisting = 0]`, els => els.length)).toBe(0);
      expect(await page.$$eval(`_ember=ColorButton[nested.index.nonexisting = 1]`, els => els.length)).toBe(0);
      expect(await page.$$eval(`_ember=ColorButton[nested.value = 4.1]`, els => els.length)).toBe(1);
      expect(await page.$$eval(`_ember=ColorButton[disabled = true]`, els => els.length)).toBe(5);
      expect(await page.$$eval(`_ember=ColorButton[disabled = false] `, els => els.length)).toBe(4);
      expect(await page.$$eval(`_ember=ColorButton[disabled = true][color = "red"]`, els => els.length)).toBe(2);
      expect(await page.$$eval(`_ember=ColorButton[disabled = true][color = "red"i][nested.index =  6]`, els => els.length)).toBe(1);
    });

    it('should exact match by args', async ({page}) => {
      expect(await page.$eval(`_ember=ListItem[name = "The Great Gatsby"]`, el => el.textContent)).toBe('The Great Gatsby');
      expect(await page.$$eval(`_ember=ListItem[name = "The Great Gatsby"]`, els => els.length)).toBe(1);
      // case sensetive by default
      expect(await page.$$eval(`_ember=ListItem[name = "the great gatsby"]`, els => els.length)).toBe(0);
      expect(await page.$$eval(`_ember=ListItem[name = "the great gatsby" s]`, els => els.length)).toBe(0);
      expect(await page.$$eval(`_ember=ListItem[name = "the great gatsby" S]`, els => els.length)).toBe(0);
      // case insensetive with flag
      expect(await page.$$eval(`_ember=ListItem[name = "the great gatsby" i]`, els => els.length)).toBe(1);
      expect(await page.$$eval(`_ember=ListItem[name = "the great gatsby" I]`, els => els.length)).toBe(1);
      expect(await page.$$eval(`_ember=ListItem[name = "  The Great Gatsby  "]`, els => els.length)).toBe(0);
    });

    it('should partially match by args', async ({page}) => {
      // Check partial matching
      expect(await page.$eval(`_ember=ListItem[name *= "Gatsby"]`, el => el.textContent)).toBe('The Great Gatsby');
      expect(await page.$$eval(`_ember=ListItem[name *= "Gatsby"]`, els => els.length)).toBe(1);
      expect(await page.$$eval(`_ember=[name *= "Gatsby"]`, els => els.length)).toBe(1);

      expect(await page.$$eval(`_ember=ListItem[name = "Gatsby"]`, els => els.length)).toBe(0);
    });

    it('should support all string operators', async ({page}) => {
      expect(await page.$$eval(`_ember=ColorButton[color = "red"]`, els => els.length)).toBe(3);
      expect(await page.$$eval(`_ember=ColorButton[color |= "red"]`, els => els.length)).toBe(3);
      expect(await page.$$eval(`_ember=ColorButton[color $= "ed"]`, els => els.length)).toBe(3);
      expect(await page.$$eval(`_ember=ColorButton[color ^= "gr"]`, els => els.length)).toBe(3);
      expect(await page.$$eval(`_ember=ColorButton[color ~= "e"]`, els => els.length)).toBe(0);
      expect(await page.$$eval(`_ember=ListItem[name ~= "gatsby" i]`, els => els.length)).toBe(1);
      expect(await page.$$eval(`_ember=ListItem[name *= " gatsby" i]`, els => els.length)).toBe(1);
    });

    it('should support truthy querying', async ({page}) => {
      expect(await page.$$eval(`_ember=ColorButton[disabled]`, els => els.length)).toBe(5);
    });

    it('should work with multiroot ember', async ({page}) => {
      await it.step('mount second root', async () => {
        await expect(page.locator(`_ember=ListItem`)).toHaveCount(3);
        await page.evaluate(() => {
          (window as any).createEmberApp('#root2');
        });
        await expect(page.locator(`_ember=ListItem`)).toHaveCount(6);
      });

      await it.step('add a new book to second root', async () => {
        await page.locator('#root2 input').fill('newbook');
        await page.locator('#root2 >> text=new book').click();
        await expect(page.locator('css=#root1 >> _ember=ListItem')).toHaveCount(3);
        await expect(page.locator('css=#root2 >> _ember=ListItem')).toHaveCount(4);
      });
    });
  });
}
