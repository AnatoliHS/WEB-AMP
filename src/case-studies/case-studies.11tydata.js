// Shared data for every case study in this folder (managed through Decap CMS at /admin/).
module.exports = {
  layout: "case-study.njk",
  // The contact form at the bottom of the layout replaces the footer CTA
  hideFooterCta: true,
  ogType: "article",
  eleventyComputed: {
    // Every case study lives at /case-studies/<file-name>/ (old /case-study-one/ style URLs 301 via _redirects)
    permalink: data => data.custom_url || `/case-studies/${data.page.fileSlug}/`,
  },
};
