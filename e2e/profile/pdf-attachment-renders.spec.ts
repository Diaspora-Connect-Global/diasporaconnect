/**
 * A PDF attached to a post renders through PdfCarousel (pdfjs-dist + the same-origin worker in
 * /public/pdfjs). Guards the pdfjs-dist 5 -> 6 upgrade: v6 changed getDocument's signature and
 * removed PDFDocumentProxy.destroy(), and the committed worker must match the library version —
 * a mismatch fails only at runtime, in the browser.
 */
import { test, expect, type Browser } from '@playwright/test';
import { openBrowser } from '../support/browser';
import { fakeGraphql, ME_PROFILE, seedSession, SHELL_OVERRIDES, wireNetwork } from '../support/fakeSession';

let browser: Browser;
test.beforeAll(async () => {
    browser = await openBrowser();
});
test.afterAll(async () => {
    await browser?.close();
});

/** A minimal, valid 2-page PDF; each page is a filled black square, so a rendered canvas has dark pixels. */
function twoPagePdf(): Buffer {
    const content = '0 0 0 rg 20 20 160 160 re f';
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>',
        `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>',
    ];
    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    objects.forEach((body, i) => {
        offsets.push(Buffer.byteLength(pdf));
        pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(pdf, 'latin1');
}

test.describe('PDF attachment', () => {
    test.describe.configure({ timeout: 600_000 });

    test('renders its pages to canvas (pdfjs v6 + same-origin worker)', async () => {
        const context = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 1280, height: 900 } });
        await seedSession(context);
        const graphql = fakeGraphql({
            ...SHELL_OVERRIDES,
            GetMyProfile: { getProfile: { __typename: 'ProfileResponse', success: true, message: 'ok', profile: { ...ME_PROFILE } } },
            GetUserPosts: {
                userPosts: [
                    {
                        __typename: 'Post',
                        id: 'p-pdf',
                        text: 'Our annual report',
                        authorId: ME_PROFILE.userId,
                        authorType: 'USER',
                        authorProfile: {
                            __typename: 'AuthorProfile',
                            organizationProfile: null,
                            userProfile: { __typename: 'UserProfile', name: 'Ama Mensah', avatar: null, isVip: false, verificationTier: null, trustScore: null },
                        },
                        createdAt: new Date(Date.now() - 3_600_000).toISOString(),
                        attachments: [
                            {
                                __typename: 'PostAttachment',
                                id: 'a-pdf',
                                type: 'DOCUMENT',
                                objectKey: 'posts/p-pdf/annual-report.pdf',
                                mimeType: 'application/pdf',
                                url: 'https://storage.googleapis.com/diaspoplug-media/posts/p-pdf/annual-report.pdf',
                                width: null,
                                height: null,
                                blurDataUrl: null,
                            },
                        ],
                        mentions: [],
                        categories: [],
                        aiTopics: [],
                        engagementCounts: { __typename: 'EngagementCounts', likes: 0, comments: 0, shares: 0, saves: 0, happy: 0, hopeful: 0, sad: 0 },
                        userEngagement: null,
                    },
                ],
            },
        });
        await wireNetwork(context, graphql);
        // Registered after wireNetwork, so it wins for the proxy the carousel loads through.
        let proxied = 0;
        await context.route('**/api/file-proxy**', async (route) => {
            proxied += 1;
            await route.fulfill({ status: 200, contentType: 'application/pdf', body: twoPagePdf() });
        });
        const page = await context.newPage();
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));

        await page.goto('/en/profile', { waitUntil: 'load' });
        await expect(page.getByText('Our annual report').filter({ visible: true }).first()).toBeVisible({ timeout: 400_000 });

        const canvas = page.locator('canvas').filter({ visible: true }).first();
        await canvas.scrollIntoViewIfNeeded();
        await expect(canvas).toBeVisible({ timeout: 120_000 });
        // The first page has actually been drawn: some clearly dark pixels on the canvas.
        await expect
            .poll(
                () =>
                    canvas.evaluate((el) => {
                        const c = el as HTMLCanvasElement;
                        if (!c.width || !c.height) return 0;
                        const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
                        let dark = 0;
                        for (let i = 0; i < d.length; i += 4) if (d[i] < 60 && d[i + 1] < 60 && d[i + 2] < 60 && d[i + 3] > 200) dark++;
                        return dark;
                    }),
                { timeout: 120_000 },
            )
            .toBeGreaterThan(100);
        expect(proxied).toBeGreaterThan(0);
        expect(errors.filter((m) => /pdf|worker|destroy|getDocument/i.test(m))).toEqual([]);
        await context.close();
    });
});
