// Shared data for every case study in this folder (managed through Decap CMS at /admin/).
module.exports = {
  layout: "case-study.njk",
  eleventyComputed: {
    // Older case studies keep their original URLs; new ones live at /case-studies/<file-name>/
    permalink: data => data.custom_url || `/case-studies/${data.page.fileSlug}/`,
  },
};
