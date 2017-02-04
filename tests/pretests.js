import { Selector } from 'testcafe';

/*
 * The purpose of these tests is to make sure that the sites used in the actual tests are up
 * and have the expcted behaviour.  This means any failure in the actual tests are gundogs
 * problem
 */

fixture `Pre-test fixture`
    .page `https://jonathandharris.github.io/gundog/test/page1.html`;

test('Page 1 loads', async t => {
	const testDiv1Exists = Selector('#test-p-1').exists;
	
    await t
		.expect(testDiv1Exists).ok();
});


test('Page 1 links to Page 2', async t => {
	const linkToPage2 = Selector('#link-to-page-2');
	const testDiv2Exists = Selector('#test-p-2').exists;
	
    await t
        .click(linkToPage2)
		.expect(testDiv2Exists).ok();
});
