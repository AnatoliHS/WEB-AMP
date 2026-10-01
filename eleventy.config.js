const { DateTime } = require("luxon");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginBundle = require("@11ty/eleventy-plugin-bundle");
const pluginNavigation = require("@11ty/eleventy-navigation");
const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const sectionizePlugin = require("./src/_plugins/eleventy-plugin-sectionize");
const fs = require("fs");
const path = require("path");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    "./src/assets/": "/",
  });

  eleventyConfig.addPassthroughCopy("src/**/*.{png,jpg,jpeg,gif,svg,otf,mp4,webm,avif}");

  eleventyConfig.addPlugin(sectionizePlugin);

  eleventyConfig.addTemplateFormats("md");
  
  eleventyConfig.addLayoutAlias("default", "default.njk");

  eleventyConfig.addGlobalData("layout", "default");

  // After build, if outputting to dist, also mirror to _site (or vice versa)
  // so Cloudflare Pages succeeds whether Build Output Directory is set to 'dist' or '_site'
  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    const outDir = dir.output;
    const targetDir = outDir === "dist" ? "_site" : (outDir === "_site" ? "dist" : null);
    if (targetDir && fs.existsSync(outDir)) {
      fs.cpSync(outDir, targetDir, { recursive: true });
    }
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: process.env.ELEVENTY_OUTPUT || "dist",
    },
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "njk",
  };
};
